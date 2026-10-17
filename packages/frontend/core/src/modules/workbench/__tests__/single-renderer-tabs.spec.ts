/**
 * @vitest-environment happy-dom
 */
import { Framework, MemoryMemento } from '@toeverything/infra';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { GlobalState } from '../../storage';
import { SidebarTab } from '../entities/sidebar-tab';
import { View } from '../entities/view';
import { Workbench } from '../entities/workbench';
import { ViewScope } from '../scopes/view';
import { ViewService } from '../services/view';
import { WorkbenchNewTabHandler } from '../services/workbench-new-tab-handler';
import { WorkbenchDefaultState } from '../services/workbench-view-state';

describe('Workbench single-renderer lightweight tabs', () => {
  let framework: Framework;
  let workbench: Workbench;

  beforeEach(() => {
    framework = new Framework();
    framework
      .impl(GlobalState, () => new MemoryMemento())
      .impl(WorkbenchNewTabHandler, () => ({
        handle: vi.fn(),
      }))
      .impl(WorkbenchDefaultState, () => ({
        basename: '/workspace/ws-1',
        activeViewIndex: 0,
        views: [
          {
            id: 'view-a1',
            path: { pathname: '/doc-a1' },
            title: 'Doc A1',
          },
        ],
      }))
      .entity(Workbench, [
        WorkbenchDefaultState,
        WorkbenchNewTabHandler,
        GlobalState,
      ])
      .entity(View)
      .scope(ViewScope)
      .service(ViewService, [ViewScope])
      .entity(SidebarTab);

    const provider = framework.provider();
    workbench = provider.createEntity(Workbench);
  });

  test('switches between tabs in-memory while preserving per-tab View instances and history', () => {
    // Bind initial state to tab-a
    workbench.switchTab('tab-a', {
      basename: '/workspace/ws-1',
      activeViewIndex: 0,
      views: [
        {
          id: 'view-a1',
          path: { pathname: '/doc-a1' },
          title: 'Doc A1',
        },
      ],
    });

    expect(workbench.activeTabId$.value).toBe('tab-a');
    expect(workbench.basename$.value).toBe('/workspace/ws-1');
    expect(workbench.location$.value.pathname).toBe('/doc-a1');

    const tabAViewInstance = workbench.activeView$.value;
    // Navigate inside tab-a so its history stack grows
    workbench.open('/doc-a2');
    expect(workbench.location$.value.pathname).toBe('/doc-a2');
    expect(tabAViewInstance.history.entries.length).toBe(2);

    // Switch to tab-b (different document / split views)
    workbench.switchTab('tab-b', {
      basename: '/workspace/ws-1',
      activeViewIndex: 1,
      views: [
        {
          id: 'view-b1',
          path: { pathname: '/all' },
          title: 'All Docs',
        },
        {
          id: 'view-b2',
          path: { pathname: '/doc-b2' },
          title: 'Doc B2',
        },
      ],
    });

    expect(workbench.activeTabId$.value).toBe('tab-b');
    expect(workbench.views$.value).toHaveLength(2);
    expect(workbench.activeViewIndex$.value).toBe(1);
    expect(workbench.location$.value.pathname).toBe('/doc-b2');

    // Switch back to tab-a -> should restore exact View instance and history in <1ms
    workbench.switchTab('tab-a', {
      basename: '/workspace/ws-1',
      activeViewIndex: 0,
      views: [
        {
          id: 'view-a1',
          path: { pathname: '/doc-a2' },
          title: 'Doc A1',
        },
      ],
    });

    expect(workbench.activeTabId$.value).toBe('tab-a');
    expect(workbench.views$.value).toHaveLength(1);
    expect(workbench.activeView$.value).toBe(tabAViewInstance);
    expect(workbench.location$.value.pathname).toBe('/doc-a2');
    expect(workbench.activeView$.value.history.entries.length).toBe(2);
  });

  test('removeTab evicts cached views for closed tab', () => {
    workbench.switchTab('tab-a', {
      basename: '/workspace/ws-1',
      activeViewIndex: 0,
      views: [{ id: 'view-a1', path: { pathname: '/doc-a1' } }],
    });
    const originalViewA = workbench.activeView$.value;
    workbench.open('/doc-a2');

    workbench.switchTab('tab-b', {
      basename: '/workspace/ws-1',
      activeViewIndex: 0,
      views: [{ id: 'view-b1', path: { pathname: '/doc-b1' } }],
    });

    workbench.removeTab('tab-a');

    // Switching back to tab-a after removal creates a fresh View instance
    workbench.switchTab('tab-a', {
      basename: '/workspace/ws-1',
      activeViewIndex: 0,
      views: [{ id: 'view-a1', path: { pathname: '/doc-a1' } }],
    });

    expect(workbench.activeView$.value).not.toBe(originalViewA);
    expect(workbench.activeView$.value.history.entries.length).toBe(1);
    expect(workbench.location$.value.pathname).toBe('/doc-a1');
  });
});
