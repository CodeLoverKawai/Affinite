/**
 * @vitest-environment happy-dom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { registerAffineCreationCommands } from '../affine-creation';
import { registerAffineNavigationCommands } from '../affine-navigation';
import { AffineCommandRegistry } from '../registry';

(globalThis as any).BUILD_CONFIG = {
  isElectron: false,
};

describe('Hub CMDK Navigation and Creation Commands', () => {
  let mockWorkbenchOpen: ReturnType<typeof vi.fn>;
  let mockWorkbenchService: any;
  let mockJumpToPage: ReturnType<typeof vi.fn>;
  let mockNavigationHelper: any;
  let mockDocCollection: any;
  let mockWorkspaceDialogService: any;
  let mockGlobalDialogService: any;
  let mockPageHelper: any;
  const mockT: any = new Proxy({}, { get: () => () => 'mock-label' });

  beforeEach(() => {
    mockWorkbenchOpen = vi.fn();
    mockWorkbenchService = {
      workbench: {
        open: mockWorkbenchOpen,
      },
    };
    mockJumpToPage = vi.fn();
    mockNavigationHelper = {
      jumpToPage: mockJumpToPage,
      jumpToCollections: vi.fn(),
      jumpToTags: vi.fn(),
    };
    mockDocCollection = { id: 'workspace-test-id' };
    mockWorkspaceDialogService = { open: vi.fn() };
    mockGlobalDialogService = { open: vi.fn() };
    mockPageHelper = {
      createPage: vi.fn(),
      createEdgeless: vi.fn(),
    };
  });

  afterEach(() => {
    AffineCommandRegistry.getAll().forEach(cmd => {
      AffineCommandRegistry.commands.delete(cmd.id);
    });
    vi.restoreAllMocks();
  });

  describe('registerAffineNavigationCommands', () => {
    it('should register all 5 hub navigation commands', () => {
      const unsub = registerAffineNavigationCommands({
        t: mockT,
        navigationHelper: mockNavigationHelper,
        docCollection: mockDocCollection,
        workspaceDialogService: mockWorkspaceDialogService,
        workbenchService: mockWorkbenchService,
      });

      const expectedCommandIds = [
        'affine:goto-boards',
        'affine:goto-calendar',
        'affine:goto-habits',
        'affine:goto-streaks',
        'affine:goto-weekly-reports',
      ];

      expectedCommandIds.forEach(id => {
        const cmd = AffineCommandRegistry.get(id);
        expect(cmd).toBeDefined();
        expect(cmd?.category).toBe('affine:navigation');
      });

      unsub();
    });

    it('should navigate to the corresponding route when commands are run with workbenchService', () => {
      const unsub = registerAffineNavigationCommands({
        t: mockT,
        navigationHelper: mockNavigationHelper,
        docCollection: mockDocCollection,
        workspaceDialogService: mockWorkspaceDialogService,
        workbenchService: mockWorkbenchService,
      });

      const testCases = [
        { id: 'affine:goto-boards', expectedRoute: '/boards' },
        { id: 'affine:goto-calendar', expectedRoute: '/calendar' },
        { id: 'affine:goto-habits', expectedRoute: '/habits' },
        { id: 'affine:goto-streaks', expectedRoute: '/streaks' },
        { id: 'affine:goto-weekly-reports', expectedRoute: '/weekly-reports' },
      ];

      testCases.forEach(({ id, expectedRoute }) => {
        const cmd = AffineCommandRegistry.get(id);
        expect(cmd).toBeDefined();
        cmd?.run();
        expect(mockWorkbenchOpen).toHaveBeenCalledWith(expectedRoute);
      });

      unsub();
    });

    it('should fallback to navigationHelper.jumpToPage when workbenchService is not provided', () => {
      const unsub = registerAffineNavigationCommands({
        t: mockT,
        navigationHelper: mockNavigationHelper,
        docCollection: mockDocCollection,
        workspaceDialogService: mockWorkspaceDialogService,
      });

      const testCases = [
        { id: 'affine:goto-boards', expectedPath: 'boards' },
        { id: 'affine:goto-calendar', expectedPath: 'calendar' },
        { id: 'affine:goto-habits', expectedPath: 'habits' },
        { id: 'affine:goto-streaks', expectedPath: 'streaks' },
        { id: 'affine:goto-weekly-reports', expectedPath: 'weekly-reports' },
      ];

      testCases.forEach(({ id, expectedPath }) => {
        const cmd = AffineCommandRegistry.get(id);
        expect(cmd).toBeDefined();
        cmd?.run();
        expect(mockJumpToPage).toHaveBeenCalledWith('workspace-test-id', expectedPath);
      });

      unsub();
    });

    it('should unregister all hub navigation commands when unregister is called', () => {
      const unsub = registerAffineNavigationCommands({
        t: mockT,
        navigationHelper: mockNavigationHelper,
        docCollection: mockDocCollection,
        workspaceDialogService: mockWorkspaceDialogService,
        workbenchService: mockWorkbenchService,
      });

      const expectedCommandIds = [
        'affine:goto-boards',
        'affine:goto-calendar',
        'affine:goto-habits',
        'affine:goto-streaks',
        'affine:goto-weekly-reports',
      ];

      unsub();

      expectedCommandIds.forEach(id => {
        expect(AffineCommandRegistry.get(id)).toBeUndefined();
      });
    });
  });

  describe('registerAffineCreationCommands', () => {
    it('should register quick habit and calendar today commands', () => {
      const unsub = registerAffineCreationCommands({
        t: mockT,
        pageHelper: mockPageHelper,
        globalDialogService: mockGlobalDialogService,
        workbenchService: mockWorkbenchService,
      });

      const habitCmd = AffineCommandRegistry.get('affine:quick-habit');
      expect(habitCmd).toBeDefined();
      expect(habitCmd?.category).toBe('affine:creation');

      const calCmd = AffineCommandRegistry.get('affine:goto-calendar-today');
      expect(calCmd).toBeDefined();
      expect(calCmd?.category).toBe('affine:navigation');

      unsub();
    });

    it('should navigate via workbenchService when quick habit and calendar today are run', () => {
      const unsub = registerAffineCreationCommands({
        t: mockT,
        pageHelper: mockPageHelper,
        globalDialogService: mockGlobalDialogService,
        workbenchService: mockWorkbenchService,
      });

      const habitCmd = AffineCommandRegistry.get('affine:quick-habit');
      habitCmd?.run();
      expect(mockWorkbenchOpen).toHaveBeenCalledWith('/habits');

      const calCmd = AffineCommandRegistry.get('affine:goto-calendar-today');
      calCmd?.run();
      expect(mockWorkbenchOpen).toHaveBeenCalledWith('/calendar');

      unsub();
    });

    it('should fallback to window.location.hash when workbenchService is not provided', () => {
      const unsub = registerAffineCreationCommands({
        t: mockT,
        pageHelper: mockPageHelper,
        globalDialogService: mockGlobalDialogService,
      });

      const habitCmd = AffineCommandRegistry.get('affine:quick-habit');
      habitCmd?.run();
      expect(window.location.hash).toBe('#/habits');

      const calCmd = AffineCommandRegistry.get('affine:goto-calendar-today');
      calCmd?.run();
      expect(window.location.hash).toBe('#/calendar');

      unsub();
    });

    it('should unregister creation commands when unsub is called', () => {
      const unsub = registerAffineCreationCommands({
        t: mockT,
        pageHelper: mockPageHelper,
        globalDialogService: mockGlobalDialogService,
        workbenchService: mockWorkbenchService,
      });

      unsub();

      expect(AffineCommandRegistry.get('affine:quick-habit')).toBeUndefined();
      expect(AffineCommandRegistry.get('affine:goto-calendar-today')).toBeUndefined();
    });
  });
});
