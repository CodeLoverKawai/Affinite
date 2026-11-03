import type { useI18n } from '@affine/i18n';
import { track } from '@affine/track';
import type { Workspace } from '@blocksuite/affine/store';
import {
  ArrowRightBigIcon,
  CheckBoxCheckSolidIcon,
  DateTimeIcon,
  FirePanelIcon,
  PresentationIcon,
  ViewLayersIcon,
} from '@blocksuite/icons/rc';

import type { useNavigateHelper } from '../components/hooks/use-navigate-helper';
import type { WorkspaceDialogService } from '../modules/dialogs';
import type { WorkbenchService } from '../modules/workbench';
import { registerAffineCommand } from './registry';

export function registerAffineNavigationCommands({
  t,
  docCollection,
  navigationHelper,
  workspaceDialogService,
  workbenchService,
}: {
  t: ReturnType<typeof useI18n>;
  navigationHelper: ReturnType<typeof useNavigateHelper>;
  docCollection: Workspace;
  workspaceDialogService: WorkspaceDialogService;
  workbenchService?: WorkbenchService;
}) {
  const unsubs: Array<() => void> = [];
  unsubs.push(
    registerAffineCommand({
      id: 'affine:goto-all-pages',
      category: 'affine:navigation',
      icon: <ArrowRightBigIcon />,
      label: t['com.affine.cmdk.affine.navigation.goto-all-pages'](),
      run() {
        track.$.cmdk.navigation.navigate({
          to: 'allDocs',
        });

        navigationHelper.jumpToPage(docCollection.id, 'all');
      },
    })
  );

  unsubs.push(
    registerAffineCommand({
      id: 'affine:goto-collection-list',
      category: 'affine:navigation',
      icon: <ArrowRightBigIcon />,
      label: 'Go to Collection List',
      run() {
        track.$.cmdk.navigation.navigate({
          to: 'collectionList',
        });

        navigationHelper.jumpToCollections(docCollection.id);
      },
    })
  );

  unsubs.push(
    registerAffineCommand({
      id: 'affine:goto-tag-list',
      category: 'affine:navigation',
      icon: <ArrowRightBigIcon />,
      label: 'Go to Tag List',
      run() {
        track.$.cmdk.navigation.navigate({
          to: 'tagList',
        });

        navigationHelper.jumpToTags(docCollection.id);
      },
    })
  );

  unsubs.push(
    registerAffineCommand({
      id: 'affine:goto-workspace',
      category: 'affine:navigation',
      icon: <ArrowRightBigIcon />,
      label: t['com.affine.cmdk.affine.navigation.goto-workspace'](),
      run() {
        track.$.cmdk.navigation.navigate({
          to: 'workspace',
        });

        workbenchService?.workbench.openWorkspaceSelector();
      },
    })
  );

  unsubs.push(
    registerAffineCommand({
      id: 'affine:open-settings',
      category: 'affine:navigation',
      icon: <ArrowRightBigIcon />,
      label: t['com.affine.cmdk.affine.navigation.open-settings'](),
      keyBinding: '$mod+,',
      run() {
        track.$.cmdk.settings.openSettings();
        workspaceDialogService.open('setting', {
          activeTab: 'appearance',
        });
      },
    })
  );

  unsubs.push(
    registerAffineCommand({
      id: 'affine:open-account',
      category: 'affine:navigation',
      icon: <ArrowRightBigIcon />,
      label: t['com.affine.cmdk.affine.navigation.open-account-settings'](),
      run() {
        track.$.cmdk.settings.openSettings({ to: 'account' });
        workspaceDialogService.open('setting', {
          activeTab: 'account',
        });
      },
    })
  );

  unsubs.push(
    registerAffineCommand({
      id: 'affine:goto-trash',
      category: 'affine:navigation',
      icon: <ArrowRightBigIcon />,
      label: t['com.affine.cmdk.affine.navigation.goto-trash'](),
      run() {
        track.$.cmdk.navigation.navigate({
          to: 'trash',
        });

        navigationHelper.jumpToPage(docCollection.id, 'trash');
      },
    })
  );

  unsubs.push(
    registerAffineCommand({
      id: 'affine:goto-boards',
      category: 'affine:navigation',
      icon: <ViewLayersIcon />,
      label: 'Go to Boards / Tableros',
      run() {
        track.$.cmdk.navigation.navigate({ to: 'boards' as any });
        if (workbenchService) {
          workbenchService.workbench.open('/boards');
        } else {
          navigationHelper.jumpToPage(docCollection.id, 'boards');
        }
      },
    })
  );

  unsubs.push(
    registerAffineCommand({
      id: 'affine:goto-calendar',
      category: 'affine:navigation',
      icon: <DateTimeIcon />,
      label: 'Go to Calendar / Calendario',
      run() {
        track.$.cmdk.navigation.navigate({ to: 'calendar' as any });
        if (workbenchService) {
          workbenchService.workbench.open('/calendar');
        } else {
          navigationHelper.jumpToPage(docCollection.id, 'calendar');
        }
      },
    })
  );

  unsubs.push(
    registerAffineCommand({
      id: 'affine:goto-habits',
      category: 'affine:navigation',
      icon: <CheckBoxCheckSolidIcon />,
      label: 'Go to Habits / Hábitos',
      run() {
        track.$.cmdk.navigation.navigate({ to: 'habits' as any });
        if (workbenchService) {
          workbenchService.workbench.open('/habits');
        } else {
          navigationHelper.jumpToPage(docCollection.id, 'habits');
        }
      },
    })
  );

  unsubs.push(
    registerAffineCommand({
      id: 'affine:goto-streaks',
      category: 'affine:navigation',
      icon: <FirePanelIcon />,
      label: 'Go to Streaks / Streaks',
      run() {
        track.$.cmdk.navigation.navigate({ to: 'streaks' as any });
        if (workbenchService) {
          workbenchService.workbench.open('/streaks');
        } else {
          navigationHelper.jumpToPage(docCollection.id, 'streaks');
        }
      },
    })
  );

  unsubs.push(
    registerAffineCommand({
      id: 'affine:goto-weekly-reports',
      category: 'affine:navigation',
      icon: <PresentationIcon />,
      label: 'Go to Weekly Reports / Reportes Semanales',
      run() {
        track.$.cmdk.navigation.navigate({ to: 'weeklyReports' as any });
        if (workbenchService) {
          workbenchService.workbench.open('/weekly-reports');
        } else {
          navigationHelper.jumpToPage(docCollection.id, 'weekly-reports');
        }
      },
    })
  );

  return () => {
    unsubs.forEach(unsub => unsub());
  };
}
