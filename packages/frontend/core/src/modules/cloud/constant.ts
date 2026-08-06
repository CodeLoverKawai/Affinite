import {
  OAuthProviderType,
  ServerDeploymentType,
  ServerFeature,
} from '@affine/graphql';

import type { ServerConfig, ServerMetadata } from './types';

export const BUILD_IN_SERVERS: (ServerMetadata & { config: ServerConfig })[] = [
  {
    id: 'affine-cloud',
    baseUrl: BUILD_CONFIG.isNative
      ? 'http://localhost:5320'
      : location.origin,
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
