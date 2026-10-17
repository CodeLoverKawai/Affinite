import 'fake-indexeddb/auto';

import { afterEach, describe, expect, test, vi } from 'vitest';

import { AutoReconnectConnection } from '../connection';
import {
  IndexedDBBlobStorage,
  IndexedDBBlobSyncStorage,
} from '../impls/idb';
import { SpaceStorage } from '../storage';
import { Sync } from '../sync';

class MockFailingConnection extends AutoReconnectConnection<string> {
  connectCalls = 0;
  shouldSucceed = false;

  constructor() {
    super();
    this.retryDelay = 100;
  }

  protected override async doConnect(): Promise<string> {
    this.connectCalls++;
    if (this.shouldSucceed) {
      return 'ok';
    }
    throw new Error('Network unreachable');
  }

  protected override doDisconnect(): void {}
}

describe('AutoReconnectConnection circuit-breaker', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  test('stops retrying after maxRetries (3 attempts) instead of looping forever', async () => {
    vi.useFakeTimers();
    const conn = new MockFailingConnection();

    conn.connect();
    await vi.advanceTimersByTimeAsync(10);
    expect(conn.connectCalls).toBe(1);

    // Retry 1 (after 100ms)
    await vi.advanceTimersByTimeAsync(100);
    expect(conn.connectCalls).toBe(2);

    // Retry 2 (exponential backoff: 200ms)
    await vi.advanceTimersByTimeAsync(200);
    expect(conn.connectCalls).toBe(3);

    // Retry 3 (exponential backoff: 400ms) -> hits maxRetries (3 retries after initial attempt, or 3 total attempts)
    await vi.advanceTimersByTimeAsync(400);
    const callsAfterMax = conn.connectCalls;
    expect(callsAfterMax).toBeLessThanOrEqual(4);

    // Advance 60 seconds — should NOT retry anymore!
    await vi.advanceTimersByTimeAsync(60_000);
    expect(conn.connectCalls).toBe(callsAfterMax);
    expect(conn.status).toBe('error');

    conn.disconnect(true);
  });

  test('resets circuit-breaker and reconnects when connect() is called or online event fires', async () => {
    vi.useFakeTimers();
    const conn = new MockFailingConnection();

    conn.connect();
    await vi.advanceTimersByTimeAsync(10_000);
    const callsAtTrip = conn.connectCalls;
    expect(conn.status).toBe('error');

    // Server comes back online
    conn.shouldSucceed = true;
    conn.connect();
    await vi.advanceTimersByTimeAsync(50);

    expect(conn.connectCalls).toBe(callsAtTrip + 1);
    expect(conn.status).toBe('connected');

    conn.disconnect(true);
  });

  test('trips circuit-breaker immediately without retrying when navigator.onLine is false', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('navigator', { onLine: false });

    const conn = new MockFailingConnection();
    conn.connect();
    await vi.advanceTimersByTimeAsync(10);
    expect(conn.connectCalls).toBe(1);

    // Advance 30 seconds while offline — should not schedule any retry timers
    await vi.advanceTimersByTimeAsync(30_000);
    expect(conn.connectCalls).toBe(1);
    expect(conn.status).toBe('error');

    conn.disconnect(true);
  });
});

describe('BlobSync eager full local mirror', () => {
  test('starting Sync eagerly downloads remote blobs into local storage', async () => {
    const localBlob = new IndexedDBBlobStorage({
      id: 'ws-mirror-test',
      flavour: 'local',
      type: 'workspace',
    });
    const remoteBlob = new IndexedDBBlobStorage({
      id: 'ws-mirror-test',
      flavour: 'remote',
      type: 'workspace',
    });
    const blobSync = new IndexedDBBlobSyncStorage({
      id: 'ws-mirror-test',
      flavour: 'local',
      type: 'workspace',
    });

    const localPeer = new SpaceStorage({
      blob: localBlob,
      blobSync,
    });
    const remotePeer = new SpaceStorage({
      blob: remoteBlob,
    });

    localPeer.connect();
    remotePeer.connect();
    await localPeer.waitForConnected();
    await remotePeer.waitForConnected();

    await remoteBlob.set({
      key: 'remote-only-blob',
      data: new Uint8Array([9, 8, 7, 6]),
      mime: 'application/octet-stream',
      createdAt: new Date(200),
    });

    const sync = new Sync({
      local: localPeer,
      remotes: {
        cloud: remotePeer,
      },
    });
    sync.start();

    await new Promise(resolve => setTimeout(resolve, 300));

    const mirrored = await localBlob.get('remote-only-blob');
    expect(mirrored).not.toBeNull();
    expect(mirrored?.data).toEqual(new Uint8Array([9, 8, 7, 6]));

    sync.stop();
  });
});
