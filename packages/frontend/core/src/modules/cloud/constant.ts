import {
  OAuthProviderType,
  ServerDeploymentType,
  ServerFeature,
} from '@affine/graphql';

import type { ServerConfig, ServerMetadata } from './types';

export const AFFINITE_SELFHOST_STORAGE_KEY = 'affinite_selfhost_base_url';
export const AFFINITE_SELFHOST_DISABLED_KEY = 'affinite_selfhost_disabled';

export function getSelfhostBaseUrl(): string {
  if (typeof window !== 'undefined' && window.localStorage !== undefined) {
    const custom = window.localStorage.getItem(AFFINITE_SELFHOST_STORAGE_KEY);
    if (custom && custom.trim()) {
      return custom.trim().replace(/\/+$/, '');
    }
  }
  return BUILD_CONFIG.isNative ? 'http://localhost:5320' : location.origin;
}

export function setSelfhostBaseUrl(url: string): void {
  if (typeof window !== 'undefined' && window.localStorage !== undefined) {
    const trimmed = url.trim().replace(/\/+$/, '');
    if (trimmed) {
      window.localStorage.setItem(AFFINITE_SELFHOST_STORAGE_KEY, trimmed);
    } else {
      window.localStorage.removeItem(AFFINITE_SELFHOST_STORAGE_KEY);
    }
  }
}

export function isSelfhostDisabled(): boolean {
  if (typeof window !== 'undefined' && window.localStorage !== undefined) {
    return window.localStorage.getItem(AFFINITE_SELFHOST_DISABLED_KEY) === 'true';
  }
  return false;
}

export function setSelfhostDisabled(disabled: boolean): void {
  if (typeof window !== 'undefined' && window.localStorage !== undefined) {
    if (disabled) {
      window.localStorage.setItem(AFFINITE_SELFHOST_DISABLED_KEY, 'true');
    } else {
      window.localStorage.removeItem(AFFINITE_SELFHOST_DISABLED_KEY);
    }
  }
}

export function getBuildInServers(): (ServerMetadata & { config: ServerConfig })[] {
  if (isSelfhostDisabled()) {
    return [];
  }
  return [
    {
      id: 'affine-cloud',
      get baseUrl() {
        return getSelfhostBaseUrl();
      },
      config: {
        serverName: 'AFFiNITe Selfhost',
        features: [
          ServerFeature.Indexer,
          ServerFeature.Copilot,
          ServerFeature.CopilotEmbedding,
          ServerFeature.OAuth,
          ServerFeature.LocalWorkspace,
        ],
        oauthProviders: [
          OAuthProviderType.Google,
        ],
        type: ServerDeploymentType.Selfhosted,
        credentialsRequirement: {
          password: {
            minLength: 8,
            maxLength: 32,
          },
        },
      },
    },
  ];
}

export const BUILD_IN_SERVERS = new Proxy([] as (ServerMetadata & { config: ServerConfig })[], {
  get(_target, prop) {
    const list = getBuildInServers();
    const val = (list as any)[prop];
    if (typeof val === 'function') {
      return val.bind(list);
    }
    return val;
  },
});

export type TelemetryChannel =
  | 'stable'
  | 'beta'
  | 'internal'
  | 'canary'
  | 'local';

const OFFICIAL_TELEMETRY_ENDPOINTS: Record<TelemetryChannel, string> = {
  stable: 'http://localhost:8080',
  beta: 'http://localhost:8080',
  internal: 'http://localhost:8080',
  canary: 'http://localhost:8080',
  local: 'http://localhost:8080',
};

export function getOfficialTelemetryEndpoint(
  channel = BUILD_CONFIG.appBuildType
): string {
  if (BUILD_CONFIG.debug) {
    return BUILD_CONFIG.isNative
      ? OFFICIAL_TELEMETRY_ENDPOINTS.local
      : location.origin;
  } else if (['beta', 'internal', 'canary', 'stable'].includes(channel)) {
    return OFFICIAL_TELEMETRY_ENDPOINTS[channel];
  }

  return OFFICIAL_TELEMETRY_ENDPOINTS.stable;
}
