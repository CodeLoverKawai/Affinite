import { LiveData, Service } from '@toeverything/infra';

import type { DesktopApiService, TabViewsMetaSchema } from '../../desktop-api';
import type { PeekViewService } from '../../peek-view';
import type { WorkbenchService } from '../../workbench';

/**
 * Synchronize workbench state with state stored in main process
 */
export class DesktopStateSynchronizer extends Service {
  constructor(
    private readonly workbenchService: WorkbenchService,
    private readonly electronApi: DesktopApiService,
    private readonly peekViewService: PeekViewService
  ) {
    super();
    this.startSync();
  }

  startSync = () => {
    if (!BUILD_CONFIG.isElectron) {
      return;
    }

    const workbench = this.workbenchService.workbench;
    const appInfo = this.electronApi.appInfo;

    const initialMeta =
      this.electronApi.sharedStorage.globalState.get<TabViewsMetaSchema>(
        'tabViewsMetaSchema'
      );
    let currentActiveTabId =
      workbench.activeTabId$.value ??
      initialMeta?.activeWorkbenchId ??
      appInfo?.viewId;
    let isSwitchingTab = false;
    let knownTabIds = new Set<string>(
      initialMeta?.workbenches?.map(w => w.id) ?? []
    );

    if (currentActiveTabId && !workbench.activeTabId$.value) {
      const initialTab = initialMeta?.workbenches?.find(
        w => w.id === currentActiveTabId
      );
      if (initialTab) {
        isSwitchingTab = true;
        try {
          workbench.switchTab(currentActiveTabId, initialTab);
        } finally {
          isSwitchingTab = false;
        }
      }
    }

    const isTargetTab = (tabId?: string) =>
      !tabId || tabId === currentActiveTabId || tabId === appInfo?.viewId;

    const handleTabViewsMeta = (meta: TabViewsMetaSchema | undefined) => {
      if (!meta?.workbenches?.length) {
        return;
      }

      const nextIds = new Set(meta.workbenches.map(w => w.id));
      for (const oldId of knownTabIds) {
        if (!nextIds.has(oldId)) {
          workbench.removeTab(oldId);
        }
      }
      knownTabIds = nextIds;

      const nextActiveTabId =
        meta.activeWorkbenchId ?? meta.workbenches[0]?.id;
      if (!nextActiveTabId || nextActiveTabId === currentActiveTabId) {
        return;
      }

      const targetWorkbench = meta.workbenches.find(
        w => w.id === nextActiveTabId
      );
      if (!targetWorkbench) {
        return;
      }

      const prevBasename = workbench.basename$.value;
      currentActiveTabId = nextActiveTabId;
      isSwitchingTab = true;
      try {
        workbench.switchTab(nextActiveTabId, targetWorkbench);
        if (
          targetWorkbench.basename &&
          targetWorkbench.basename !== prevBasename &&
          typeof window !== 'undefined'
        ) {
          const activeViewMeta =
            targetWorkbench.views[targetWorkbench.activeViewIndex] ??
            targetWorkbench.views[0];
          const nextPath =
            targetWorkbench.basename +
            (activeViewMeta?.path?.pathname ?? '/all') +
            (activeViewMeta?.path?.search ?? '') +
            (activeViewMeta?.path?.hash ?? '');
          if (window.location.pathname !== nextPath) {
            window.history.replaceState(null, '', nextPath);
            window.dispatchEvent(new PopStateEvent('popstate'));
          }
        }
      } finally {
        isSwitchingTab = false;
      }
    };

    this.disposables.push(
      this.electronApi.sharedStorage.globalState.watch<TabViewsMetaSchema>(
        'tabViewsMetaSchema',
        handleTabViewsMeta
      ),
      this.electronApi.events.ui.onTabViewsMetaChanged(handleTabViewsMeta)
    );

    this.disposables.push(
      this.electronApi.events.ui.onTabAction(event => {
        if (
          event.type === 'open-in-split-view' &&
          isTargetTab(event.payload.tabId)
        ) {
          if (event.payload.view?.path) {
            workbench.open(event.payload.view.path, {
              at: 'beside',
              show: false,
            });
          } else {
            workbench.openAll({
              at: 'beside',
              show: false,
            });
          }
        }

        if (
          event.type === 'separate-view' &&
          isTargetTab(event.payload.tabId)
        ) {
          const view = workbench.viewAt(event.payload.viewIndex);
          if (view) {
            workbench.close(view);
          }
        }

        if (
          event.type === 'activate-view' &&
          isTargetTab(event.payload.tabId)
        ) {
          workbench.active(event.payload.viewIndex);
        }

        if (event.type === 'close-tab' && event.payload) {
          workbench.removeTab(event.payload);
        }
      })
    );

    this.disposables.push(
      this.electronApi.events.ui.onCloseView(() => {
        (async () => {
          if (await this.electronApi.handler.ui.isActiveTab()) {
            // close current view. stop if any one is successful
            // 1. peek view
            // 2. split view
            // 3. tab
            // 4. otherwise, hide the window
            if (this.peekViewService.peekView.show$.value?.value) {
              this.peekViewService.peekView.close();
            } else if (workbench.views$.value.length > 1) {
              workbench.close(workbench.activeView$.value);
            } else {
              const tabs = await this.electronApi.handler.ui.getTabsStatus();
              if (tabs.length > 1) {
                await this.electronApi.handler.ui.closeTab();
              } else {
                await this.electronApi.handler.ui.handleHideApp();
              }
            }
          }
        })().catch(console.error);
      })
    );

    this.disposables.push(
      this.electronApi.events.ui.onToggleRightSidebar(tabId => {
        if (isTargetTab(tabId)) {
          workbench.setSidebarOpen(!workbench.sidebarOpen$.value);
        }
      })
    );

    this.disposables.push(
      this.electronApi.events.ui.onTabGoToRequest(opts => {
        if (isTargetTab(opts.tabId)) {
          this.workbenchService.workbench.open(opts.to);
        }
      })
    );

    const getTargetTabId = () =>
      workbench.activeTabId$.value ?? currentActiveTabId ?? appInfo?.viewId;

    // sync workbench state with main process
    // also fill tab view meta with title & moduleName
    const viewsSub = LiveData.computed(get => {
      return get(workbench.views$).map(view => {
        const location = get(view.location$);
        return {
          id: view.id,
          title: get(view.title$),
          iconName: get(view.icon$),
          path: {
            pathname: location.pathname,
            search: location.search,
            hash: location.hash,
          },
        };
      });
    }).subscribe(views => {
      const targetTabId = getTargetTabId();
      if (isSwitchingTab || !targetTabId) {
        return;
      }

      this.electronApi.handler.ui
        .updateWorkbenchMeta(targetTabId, {
          views,
        })
        .catch(console.error);
    });

    const activeViewIndexSub = workbench.activeViewIndex$.subscribe(
      activeViewIndex => {
        const targetTabId = getTargetTabId();
        if (isSwitchingTab || !targetTabId) {
          return;
        }

        this.electronApi.handler.ui
          .updateWorkbenchMeta(targetTabId, {
            activeViewIndex: activeViewIndex,
          })
          .catch(console.error);
      }
    );

    const basenameSub = workbench.basename$.subscribe(basename => {
      const targetTabId = getTargetTabId();
      if (isSwitchingTab || !targetTabId) {
        return;
      }

      this.electronApi.handler.ui
        .updateWorkbenchMeta(targetTabId, {
          basename: basename,
        })
        .catch(console.error);
    });

    this.disposables.push(
      () => viewsSub.unsubscribe(),
      () => activeViewIndexSub.unsubscribe(),
      () => basenameSub.unsubscribe()
    );
  };
}
