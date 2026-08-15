import type { IDBPDatabase } from 'idb';
import { openDB } from 'idb';

/**
 * the below code includes the custom fetch and xmlhttprequest implementation for ios webview.
 * should be included in the entry file of the app or webworker.
 */
const tokenMemoryCache = new Map<string, string | null>();
let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB('affine-token', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('tokens')) {
          db.createObjectStore('tokens', { keyPath: 'endpoint' });
        }
      },
    });
  }
  return dbPromise;
}

const rawFetch = globalThis.fetch;
globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const request = new Request(input, init);

  const origin = new URL(request.url, globalThis.location.origin).origin;

  const token = await readEndpointToken(origin);
  if (token) {
    request.headers.set('Authorization', `Bearer ${token}`);
  }

  return rawFetch(request);
};

const rawXMLHttpRequest = globalThis.XMLHttpRequest;
globalThis.XMLHttpRequest = class extends rawXMLHttpRequest {
  override send(body?: Document | XMLHttpRequestBodyInit | null): void {
    const origin = new URL(this.responseURL, globalThis.location.origin).origin;

    readEndpointToken(origin).then(
      token => {
        if (token) {
          this.setRequestHeader('Authorization', `Bearer ${token}`);
        }
        return super.send(body);
      },
      () => {
        throw new Error('Failed to read token');
      }
    );
  }
};

export async function readEndpointToken(
  endpoint: string
): Promise<string | null> {
  if (tokenMemoryCache.has(endpoint)) {
    return tokenMemoryCache.get(endpoint) ?? null;
  }

  try {
    const idb = await getDB();
    const token = await idb.get('tokens', endpoint);
    const result = token ? token.token : null;
    tokenMemoryCache.set(endpoint, result);
    return result;
  } catch {
    return null;
  }
}

export async function writeEndpointToken(endpoint: string, token: string) {
  tokenMemoryCache.set(endpoint, token);
  const db = await getDB();
  await db.put('tokens', { endpoint, token });
}
