export const GOOGLE_SECRET_FIELDS = [
  'accessToken',
  'refreshToken',
  'clientSecret',
] as const;

export const GOOGLE_SECRETS_STORAGE_PREFIX = 'affinite_calendar_secrets_v1:';

export type SecretsStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function splitGoogleConfig(cfg: Record<string, unknown>): {
  publicConfig: Record<string, unknown>;
  secrets: Record<string, string>;
} {
  const publicConfig: Record<string, unknown> = {};
  const secrets: Record<string, string> = {};
  if (!cfg || typeof cfg !== 'object') {
    return { publicConfig, secrets };
  }
  for (const [k, v] of Object.entries(cfg)) {
    if ((GOOGLE_SECRET_FIELDS as readonly string[]).includes(k)) {
      if (typeof v === 'string' && v) secrets[k] = v;
    } else {
      publicConfig[k] = v;
    }
  }
  return { publicConfig, secrets };
}

export function stripSecretsFromYjsConfig(raw: string | undefined): {
  cleaned: string | undefined;
  leaked: Record<string, string>;
} {
  if (!raw) return { cleaned: raw, leaked: {} as Record<string, string> };
  try {
    const { publicConfig, secrets } = splitGoogleConfig(JSON.parse(raw));
    return { cleaned: JSON.stringify(publicConfig), leaked: secrets };
  } catch {
    return { cleaned: raw, leaked: {} as Record<string, string> };
  }
}

export function loadGoogleSecrets(
  storage: SecretsStorage,
  workspaceId: string
): Record<string, string> {
  try {
    if (!storage || !workspaceId) return {};
    const raw = storage.getItem(GOOGLE_SECRETS_STORAGE_PREFIX + workspaceId);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const result: Record<string, string> = {};
      for (const [k, v] of Object.entries(parsed)) {
        if (typeof v === 'string') {
          result[k] = v;
        }
      }
      return result;
    }
    return {};
  } catch {
    return {};
  }
}

export function saveGoogleSecrets(
  storage: SecretsStorage,
  workspaceId: string,
  secrets: Record<string, string>
): void {
  try {
    if (!storage || !workspaceId || !secrets || typeof secrets !== 'object') {
      return;
    }
    const current = loadGoogleSecrets(storage, workspaceId);
    for (const [k, v] of Object.entries(secrets)) {
      if (!(GOOGLE_SECRET_FIELDS as readonly string[]).includes(k)) {
        continue;
      }
      if (v === '') {
        delete current[k];
      } else if (typeof v === 'string') {
        current[k] = v;
      }
    }
    const key = GOOGLE_SECRETS_STORAGE_PREFIX + workspaceId;
    if (Object.keys(current).length === 0) {
      storage.removeItem(key);
    } else {
      storage.setItem(key, JSON.stringify(current));
    }
  } catch {
    // swallow storage exceptions like quota/private-mode
  }
}

export function persistGoogleCredentials(
  storage: SecretsStorage,
  workspaceId: string,
  config: Record<string, unknown>
): Record<string, unknown> {
  const { publicConfig, secrets } = splitGoogleConfig(config);
  const secretsToSave: Record<string, string> = {};
  for (const field of GOOGLE_SECRET_FIELDS) {
    secretsToSave[field] = secrets[field] ?? '';
  }
  saveGoogleSecrets(storage, workspaceId, secretsToSave);
  return publicConfig;
}
