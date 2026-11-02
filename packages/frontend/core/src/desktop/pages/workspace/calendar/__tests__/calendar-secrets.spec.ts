import { describe, expect, test } from 'vitest';
import {
  GOOGLE_SECRET_FIELDS,
  GOOGLE_SECRETS_STORAGE_PREFIX,
  loadGoogleSecrets,
  persistGoogleCredentials,
  saveGoogleSecrets,
  type SecretsStorage,
  splitGoogleConfig,
  stripSecretsFromYjsConfig,
} from '../calendar-secrets';

function createMemoryStorage(initialData?: Record<string, string>): SecretsStorage {
  const store = new Map<string, string>(Object.entries(initialData ?? {}));
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  };
}

describe('calendar-secrets', () => {
  describe('splitGoogleConfig & stripSecretsFromYjsConfig (Brief Spec)', () => {
    test('split separa tokens de la config pública', () => {
      const { publicConfig, secrets } = splitGoogleConfig({
        calendarId: 'primary',
        accessToken: 'a',
        refreshToken: 'r',
        clientSecret: 's',
      });
      expect(publicConfig).toEqual({ calendarId: 'primary' });
      expect(secrets).toEqual({
        accessToken: 'a',
        refreshToken: 'r',
        clientSecret: 's',
      });
    });

    test('strip limpia un google_config heredado y devuelve lo filtrado', () => {
      const raw = JSON.stringify({ calendarId: 'primary', accessToken: 'a' });
      const { cleaned, leaked } = stripSecretsFromYjsConfig(raw);
      expect(JSON.parse(cleaned!)).toEqual({ calendarId: 'primary' });
      expect(leaked).toEqual({ accessToken: 'a' });
    });

    test('strip es idempotente', () => {
      const raw = JSON.stringify({ calendarId: 'primary' });
      expect(stripSecretsFromYjsConfig(raw).leaked).toEqual({});
    });

    test('strip maneja raw undefined o JSON inválido sin fallar', () => {
      expect(stripSecretsFromYjsConfig(undefined)).toEqual({
        cleaned: undefined,
        leaked: {},
      });
      expect(stripSecretsFromYjsConfig('not-valid-json')).toEqual({
        cleaned: 'not-valid-json',
        leaked: {},
      });
    });
  });

  describe('Storage helpers (loadGoogleSecrets & saveGoogleSecrets)', () => {
    test('usa el prefijo affinite_calendar_secrets_v1:', () => {
      expect(GOOGLE_SECRETS_STORAGE_PREFIX).toBe('affinite_calendar_secrets_v1:');
    });

    test('loadGoogleSecrets retorna {} cuando no hay secretos o el JSON es inválido', () => {
      const storage = createMemoryStorage();
      expect(loadGoogleSecrets(storage, 'ws-1')).toEqual({});

      storage.setItem(`${GOOGLE_SECRETS_STORAGE_PREFIX}ws-1`, 'corrupt-json{{{');
      expect(loadGoogleSecrets(storage, 'ws-1')).toEqual({});

      storage.setItem(`${GOOGLE_SECRETS_STORAGE_PREFIX}ws-1`, '12345');
      expect(loadGoogleSecrets(storage, 'ws-1')).toEqual({});
    });

    test('loadGoogleSecrets nunca lanza si storage.getItem falla', () => {
      const brokenStorage: SecretsStorage = {
        getItem: () => {
          throw new Error('SecurityError: localStorage is disabled');
        },
        setItem: () => {},
        removeItem: () => {},
      };
      expect(loadGoogleSecrets(brokenStorage, 'ws-1')).toEqual({});
    });

    test('saveGoogleSecrets fusiona secretos existentes', () => {
      const storage = createMemoryStorage();
      saveGoogleSecrets(storage, 'ws-1', { accessToken: 'token-1' });
      expect(loadGoogleSecrets(storage, 'ws-1')).toEqual({ accessToken: 'token-1' });

      saveGoogleSecrets(storage, 'ws-1', { refreshToken: 'refresh-1' });
      expect(loadGoogleSecrets(storage, 'ws-1')).toEqual({
        accessToken: 'token-1',
        refreshToken: 'refresh-1',
      });
    });

    test('saveGoogleSecrets borra una clave cuando el valor es string vacío', () => {
      const storage = createMemoryStorage();
      saveGoogleSecrets(storage, 'ws-1', {
        accessToken: 'token-1',
        refreshToken: 'refresh-1',
      });

      saveGoogleSecrets(storage, 'ws-1', { accessToken: '' });
      expect(loadGoogleSecrets(storage, 'ws-1')).toEqual({
        refreshToken: 'refresh-1',
      });
    });

    test('saveGoogleSecrets elimina la entrada de almacenamiento cuando no quedan secretos', () => {
      const storage = createMemoryStorage();
      saveGoogleSecrets(storage, 'ws-1', { accessToken: 'token-1' });
      const storageKey = `${GOOGLE_SECRETS_STORAGE_PREFIX}ws-1`;
      expect(storage.getItem(storageKey)).not.toBeNull();

      saveGoogleSecrets(storage, 'ws-1', { accessToken: '' });
      expect(storage.getItem(storageKey)).toBeNull();
      expect(loadGoogleSecrets(storage, 'ws-1')).toEqual({});
    });

    test('saveGoogleSecrets traga excepciones de almacenamiento como quota/private-mode', () => {
      const throwingStorage: SecretsStorage = {
        getItem: () => null,
        setItem: () => {
          throw new Error('QuotaExceededError');
        },
        removeItem: () => {
          throw new Error('QuotaExceededError');
        },
      };

      expect(() => {
        saveGoogleSecrets(throwingStorage, 'ws-1', { accessToken: 'token-1' });
      }).not.toThrow();
    });

    test('saveGoogleSecrets solo persiste claves incluidas en GOOGLE_SECRET_FIELDS', () => {
      const storage = createMemoryStorage();
      saveGoogleSecrets(storage, 'ws-1', {
        accessToken: 'token-1',
        notASecretField: 'should-be-ignored',
      });
      const stored = loadGoogleSecrets(storage, 'ws-1');
      expect(stored).toEqual({ accessToken: 'token-1' });
      expect((stored as Record<string, string>).notASecretField).toBeUndefined();
    });
  });

  describe('persistGoogleCredentials', () => {
    test('guarda token y al llamar con accessToken vacío lo borra y remueve la entrada de storage', () => {
      const storage = createMemoryStorage();
      const storageKey = `${GOOGLE_SECRETS_STORAGE_PREFIX}ws-test`;

      // 1. Guardar token
      const pub1 = persistGoogleCredentials(storage, 'ws-test', {
        calendarId: 'primary',
        accessToken: 'token-abc',
      });
      expect(pub1).toEqual({ calendarId: 'primary' });
      expect(loadGoogleSecrets(storage, 'ws-test')).toEqual({
        accessToken: 'token-abc',
      });
      expect(storage.getItem(storageKey)).not.toBeNull();

      // 2. Llamar de nuevo con accessToken ''
      const pub2 = persistGoogleCredentials(storage, 'ws-test', {
        calendarId: 'primary',
        accessToken: '',
      });
      expect(pub2).toEqual({ calendarId: 'primary' });
      expect(loadGoogleSecrets(storage, 'ws-test')).toEqual({});
      expect(storage.getItem(storageKey)).toBeNull();
    });

    test('al llamar con accessToken ausente borra secretos previos de storage y la config pública no tiene secretos', () => {
      const storage = createMemoryStorage();
      const storageKey = `${GOOGLE_SECRETS_STORAGE_PREFIX}ws-test`;

      // Guardar con múltiples secretos
      persistGoogleCredentials(storage, 'ws-test', {
        calendarId: 'primary',
        accessToken: 'token-1',
        refreshToken: 'refresh-1',
        clientSecret: 'secret-1',
      });
      expect(loadGoogleSecrets(storage, 'ws-test')).toEqual({
        accessToken: 'token-1',
        refreshToken: 'refresh-1',
        clientSecret: 'secret-1',
      });

      // Llamar con secretos ausentes de la config
      const pub = persistGoogleCredentials(storage, 'ws-test', {
        calendarId: 'primary',
        autoSync: true,
      });

      // Storage limpio completamente
      expect(loadGoogleSecrets(storage, 'ws-test')).toEqual({});
      expect(storage.getItem(storageKey)).toBeNull();

      // Config pública devuelta no contiene ninguna clave de secretos
      expect(pub).toEqual({ calendarId: 'primary', autoSync: true });
      for (const field of GOOGLE_SECRET_FIELDS) {
        expect(field in pub).toBe(false);
      }
    });
  });

  describe('Round-trip security & isolation (Decision 4)', () => {
    test('splitGoogleConfig + saveGoogleSecrets + loadGoogleSecrets round trip recupera secretos y aísla la config pública', () => {
      const storage = createMemoryStorage();
      const combinedConfig = {
        calendarId: 'primary',
        autoSync: true,
        lastSyncedAt: '2026-11-02T12:00:00Z',
        accessToken: 'secret-access-token-xyz',
        refreshToken: 'secret-refresh-token-abc',
        clientSecret: 'secret-client-secret-123',
      };

      // 1. Split
      const { publicConfig, secrets } = splitGoogleConfig(combinedConfig);

      // 2. Persist secrets in storage
      saveGoogleSecrets(storage, 'workspace-roundtrip', secrets);

      // 3. Load secrets back
      const loadedSecrets = loadGoogleSecrets(storage, 'workspace-roundtrip');

      // 4. Verify secrets round-trip match
      expect(loadedSecrets).toEqual({
        accessToken: 'secret-access-token-xyz',
        refreshToken: 'secret-refresh-token-abc',
        clientSecret: 'secret-client-secret-123',
      });

      // 5. Recombined config matches original
      expect({ ...publicConfig, ...loadedSecrets }).toEqual(combinedConfig);

      // 6. Verify serialized public config contains NONE of the secret field names or secret values
      const serializedPublic = JSON.stringify(publicConfig);
      for (const field of GOOGLE_SECRET_FIELDS) {
        expect(serializedPublic).not.toContain(field);
      }
      expect(serializedPublic).not.toContain('secret-access-token-xyz');
      expect(serializedPublic).not.toContain('secret-refresh-token-abc');
      expect(serializedPublic).not.toContain('secret-client-secret-123');

      // 7. Verify serialized public config parsed matches public fields only
      expect(JSON.parse(serializedPublic)).toEqual({
        calendarId: 'primary',
        autoSync: true,
        lastSyncedAt: '2026-11-02T12:00:00Z',
      });
    });
  });
});
