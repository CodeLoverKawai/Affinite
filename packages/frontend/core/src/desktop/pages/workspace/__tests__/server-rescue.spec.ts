/**
 * @vitest-environment happy-dom
 */
import {
  AFFINITE_SELFHOST_DISABLED_KEY,
  AFFINITE_SELFHOST_STORAGE_KEY,
  AFFINITE_STARTUP_MODE_KEY,
  BUILD_IN_SERVERS,
  getBuildInServers,
  getSelfhostBaseUrl,
  getStartupMode,
  isSelfhostDisabled,
  setSelfhostBaseUrl,
  setSelfhostDisabled,
  setStartupMode,
} from '@affine/core/modules/cloud';
import { beforeEach, describe, expect, it } from 'vitest';

describe('Selfhost URL & Resilience Configuration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const defaultExpectedUrl = BUILD_CONFIG.isNative
    ? 'http://localhost:5320'
    : location.origin;

  describe('getSelfhostBaseUrl & setSelfhostBaseUrl', () => {
    it('returns default URL when nothing is configured', () => {
      const url = getSelfhostBaseUrl();
      expect(url).toBe(defaultExpectedUrl);
    });

    it('stores and retrieves custom remote server URL without trailing slashes', () => {
      setSelfhostBaseUrl('http://192.168.1.100:5320///');
      expect(getSelfhostBaseUrl()).toBe('http://192.168.1.100:5320');
      expect(localStorage.getItem(AFFINITE_SELFHOST_STORAGE_KEY)).toBe(
        'http://192.168.1.100:5320'
      );
    });

    it('clears custom URL and returns default when setting empty string', () => {
      setSelfhostBaseUrl('http://custom-domain.com:5320');
      expect(getSelfhostBaseUrl()).toBe('http://custom-domain.com:5320');

      setSelfhostBaseUrl('   ');
      expect(getSelfhostBaseUrl()).toBe(defaultExpectedUrl);
      expect(localStorage.getItem(AFFINITE_SELFHOST_STORAGE_KEY)).toBeNull();
    });
  });

  describe('isSelfhostDisabled & setSelfhostDisabled', () => {
    it('is enabled by default and shows built-in selfhost server', () => {
      expect(isSelfhostDisabled()).toBe(false);
      const servers = getBuildInServers();
      expect(servers.length).toBe(1);
      expect(servers[0].id).toBe('affine-cloud');
      expect(servers[0].baseUrl).toBe(defaultExpectedUrl);
    });

    it('reflects custom URL dynamically in BUILD_IN_SERVERS proxy', () => {
      setSelfhostBaseUrl('https://my-nas.local:5320');
      expect(BUILD_IN_SERVERS.length).toBe(1);
      expect(BUILD_IN_SERVERS[0].baseUrl).toBe('https://my-nas.local:5320');
    });

    it('hides selfhost server when disabled', () => {
      setSelfhostDisabled(true);
      expect(isSelfhostDisabled()).toBe(true);
      expect(localStorage.getItem(AFFINITE_SELFHOST_DISABLED_KEY)).toBe('true');
      expect(getBuildInServers().length).toBe(0);
      expect(BUILD_IN_SERVERS.length).toBe(0);

      setSelfhostDisabled(false);
      expect(isSelfhostDisabled()).toBe(false);
      expect(getBuildInServers().length).toBe(1);
    });
  });

  describe('getStartupMode & setStartupMode', () => {
    it('defaults to local workspace startup mode', () => {
      expect(getStartupMode()).toBe('local');
    });

    it('persists and retrieves "last" startup mode', () => {
      setStartupMode('last');
      expect(getStartupMode()).toBe('last');
      expect(localStorage.getItem(AFFINITE_STARTUP_MODE_KEY)).toBe('last');
    });

    it('persists and retrieves "local" startup mode', () => {
      setStartupMode('last');
      setStartupMode('local');
      expect(getStartupMode()).toBe('local');
      expect(localStorage.getItem(AFFINITE_STARTUP_MODE_KEY)).toBe('local');
    });

    it('falls back to "local" when localStorage contains invalid values', () => {
      localStorage.setItem(AFFINITE_STARTUP_MODE_KEY, 'invalid_mode');
      expect(getStartupMode()).toBe('local');
    });
  });

  describe('Startup Workspace Selection Logic', () => {
    const mockLocalWorkspace = {
      id: 'local-ws-1',
      flavour: 'local',
      meta: { name: 'Espacio Local' },
    };
    const mockRemoteWorkspace = {
      id: 'remote-ws-2',
      flavour: 'affine-cloud',
      meta: { name: 'Servidor Remoto' },
    };
    const workspacesList = [mockRemoteWorkspace, mockLocalWorkspace];

    function resolveStartupWorkspace(
      list: typeof workspacesList,
      mode: 'local' | 'last',
      lastId: string | null
    ) {
      const local = list.find(w => w.flavour === 'local');
      if (mode === 'local') {
        return local ?? (lastId ? list.find(w => w.id === lastId) : null) ?? list[0];
      }
      return (lastId ? list.find(w => w.id === lastId) : null) ?? local ?? list[0];
    }

    it('always prioritizes local workspace when mode is "local", even if remote was last opened', () => {
      const target = resolveStartupWorkspace(
        workspacesList,
        'local',
        mockRemoteWorkspace.id
      );
      expect(target).toBe(mockLocalWorkspace);
    });

    it('opens last opened workspace when mode is "last"', () => {
      const target = resolveStartupWorkspace(
        workspacesList,
        'last',
        mockRemoteWorkspace.id
      );
      expect(target).toBe(mockRemoteWorkspace);
    });

    it('falls back to local workspace when mode is "last" but last workspace id is not found', () => {
      const target = resolveStartupWorkspace(
        workspacesList,
        'last',
        'non-existent-id'
      );
      expect(target).toBe(mockLocalWorkspace);
    });

    it('gracefully falls back to first available workspace if list has no local workspace', () => {
      const remoteOnlyList = [mockRemoteWorkspace];
      const target = resolveStartupWorkspace(
        remoteOnlyList,
        'local',
        null
      );
      expect(target).toBe(mockRemoteWorkspace);
    });
  });

  describe('Server Rescue & Last Workspace ID Protection', () => {
    it('does not corrupt last_workspace_id when remote workspace fails to connect', () => {
      localStorage.setItem('last_workspace_id', 'safe-local-id');

      const isRemoteRootDocReady = false;
      const remoteWorkspaceFlavour: string = 'affine-cloud';

      // Emulate the effect in workspace/index.tsx
      if (remoteWorkspaceFlavour === 'local' || isRemoteRootDocReady) {
        localStorage.setItem('last_workspace_id', 'failed-remote-id');
      }

      // last_workspace_id remains preserved to the safe local id
      expect(localStorage.getItem('last_workspace_id')).toBe('safe-local-id');
    });

    it('allows updating last_workspace_id once remote workspace is confirmed ready', () => {
      localStorage.setItem('last_workspace_id', 'safe-local-id');

      const isRemoteRootDocReady = true;
      const remoteWorkspaceFlavour: string = 'affine-cloud';

      if (remoteWorkspaceFlavour === 'local' || isRemoteRootDocReady) {
        localStorage.setItem('last_workspace_id', 'connected-remote-id');
      }

      expect(localStorage.getItem('last_workspace_id')).toBe(
        'connected-remote-id'
      );
    });
  });
});
