/**
 * @vitest-environment happy-dom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_AI_SETTINGS,
  loadAISettings,
  PRESET_MODELS,
  saveAISettings,
  STORAGE_KEY_AI_SETTINGS,
} from '../../../../desktop/dialogs/setting/account-setting/ai-model-selector';
import {
  CopilotClient,
  isLocalAIProvider,
  loadLocalSessions,
  LOCAL_AI_SESSIONS_STORAGE_KEY,
} from '../copilot-client';
import { toTextStream } from '../event-source';
import { textToText } from '../request';

describe('Zero-API-Key Antigravity (agy) & Local AI CopilotClient', () => {
  beforeEach(() => {
    localStorage.clear();
    delete (window as any).__apis;
  });

  afterEach(() => {
    localStorage.clear();
    delete (window as any).__apis;
    vi.restoreAllMocks();
  });

  it('defaults to zero-API-key antigravity provider with gemini-4-argon-high', () => {
    const settings = loadAISettings();
    expect(DEFAULT_AI_SETTINGS.provider).toBe('antigravity');
    expect(DEFAULT_AI_SETTINGS.modelId).toBe('gemini-4-argon-high');
    expect(settings.provider).toBe('antigravity');
    expect(settings.modelId).toBe('gemini-4-argon-high');
    expect(isLocalAIProvider()).toBe(true);
    expect(PRESET_MODELS.antigravity.map(m => m.id)).toContain(
      'claude-sonnet-5-5-high'
    );
    expect(PRESET_MODELS.antigravity.map(m => m.id)).toContain(
      'gemini-3.8-flash-high'
    );
  });

  it('creates and persists sessions and messages in localStorage without calling GraphQL', async () => {
    const gqlMock = vi.fn().mockRejectedValue(new Error('Offline GraphQL'));
    const fetcherMock = vi.fn();
    const eventSourceMock = vi.fn();

    const client = new CopilotClient(gqlMock, fetcherMock, eventSourceMock);

    const sessionId = await client.createSession({
      workspaceId: 'ws-offline-1',
      promptName: 'Chat With AFFiNE AI',
      pinned: true,
    });

    expect(sessionId).toMatch(/^session-/);
    expect(gqlMock).not.toHaveBeenCalled();

    const messageId = await client.createMessage({
      sessionId,
      content: 'Hola desde Antigravity local',
    });

    expect(messageId).toMatch(/^msg-/);

    const rawStore = localStorage.getItem(LOCAL_AI_SESSIONS_STORAGE_KEY);
    expect(rawStore).toBeTruthy();

    const storedSessions = loadLocalSessions();
    expect(storedSessions[sessionId]).toBeDefined();
    expect(storedSessions[sessionId].messages).toHaveLength(1);
    expect(storedSessions[sessionId].messages[0].content).toBe(
      'Hola desde Antigravity local'
    );

    const sessionFragment = await client.getSession('ws-offline-1', sessionId);
    expect(sessionFragment?.sessionId).toBe(sessionId);
    expect(sessionFragment?.pinned).toBe(true);
    expect(sessionFragment?.messages).toHaveLength(1);
  });

  it('streams AI response via synthetic EventSource using Electron Antigravity bridge and saves assistant reply', async () => {
    const chatBridgeMock = vi.fn().mockResolvedValue({
      content: 'Respuesta generada por Antigravity CLI (gemini-4-argon-high)',
      provider: 'antigravity',
      modelId: 'gemini-4-argon-high',
    });

    (window as any).__apis = {
      handler: {
        ai: {
          chat: chatBridgeMock,
        },
      },
    };

    const gqlMock = vi.fn().mockRejectedValue(new Error('Offline GraphQL'));
    const fetcherMock = vi.fn();
    const eventSourceMock = vi.fn();

    const client = new CopilotClient(gqlMock, fetcherMock, eventSourceMock);

    const sessionId = await client.createSession({
      workspaceId: 'ws-offline-2',
      promptName: 'Chat With AFFiNE AI',
    });

    const stream = textToText({
      client,
      sessionId,
      content: 'Explica qué es un grafo DAG',
      stream: true,
    });

    const chunks: string[] = [];
    for await (const chunk of stream as AsyncIterable<string>) {
      chunks.push(chunk);
    }

    expect(chunks.join('')).toBe(
      'Respuesta generada por Antigravity CLI (gemini-4-argon-high)'
    );
    expect(chatBridgeMock).toHaveBeenCalledTimes(1);
    expect(chatBridgeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'antigravity',
        modelId: 'gemini-4-argon-high',
        prompt: 'Explica qué es un grafo DAG',
      })
    );

    // Verify assistant reply is persisted in local session history
    const histories = await client.getHistories('ws-offline-2', {}, undefined, {
      sessionId,
      withMessages: true,
    });
    expect(histories).toHaveLength(1);
    expect(histories?.[0].messages).toHaveLength(2);
    expect(histories?.[0].messages[0].role).toBe('user');
    expect(histories?.[0].messages[1].role).toBe('assistant');
    expect(histories?.[0].messages[1].content).toBe(
      'Respuesta generada por Antigravity CLI (gemini-4-argon-high)'
    );
  });

  it('supports Ollama HTTP fallback via chatTextStream and toTextStream when Electron bridge is unavailable', async () => {
    saveAISettings({
      provider: 'ollama',
      modelId: 'llama3.2',
      baseUrl: 'http://127.0.0.1:11434/v1',
      apiKey: '',
    });

    const gqlMock = vi.fn();
    const fetcherMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: 'Respuesta desde Ollama local',
              },
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );
    const eventSourceMock = vi.fn();

    const client = new CopilotClient(gqlMock, fetcherMock, eventSourceMock);
    const sessionId = await client.createSession({
      workspaceId: 'ws-ollama',
      promptName: 'Summary',
    });
    await client.createMessage({
      sessionId,
      content: 'Texto para resumir con Ollama',
    });

    const es = client.chatTextStream({ sessionId });
    const events: string[] = [];
    for await (const ev of toTextStream(es)) {
      if (ev.type === 'message') {
        events.push(ev.data);
      }
    }

    expect(events.join('')).toBe('Respuesta desde Ollama local');
    expect(fetcherMock).toHaveBeenCalledWith(
      'http://127.0.0.1:11434/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
      })
    );
    expect(localStorage.getItem(STORAGE_KEY_AI_SETTINGS)).toContain('ollama');
  });
});
