/**
 * @vitest-environment happy-dom
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import * as Y from 'yjs';

import {
  CopilotClient,
  executeLocalAIChat,
  type LocalAISession,
  resolveActiveWorkspaceIntelligence,
  saveLocalSessions,
} from '@affine/core/blocksuite/ai/provider/copilot-client';
import {
  AFFINITE_YMAP_BOARD,
  AFFINITE_YMAP_CALENDAR,
  AFFINITE_YMAP_HABITS,
} from '@affine/core/modules/affinite-hub';

describe('Hub AI Context Integration', () => {
  const originalWindowCurrentWorkspace = (window as any).currentWorkspace;
  const originalWindowRootYDoc = (window as any).rootYDoc;
  const originalApis = (window as any).__apis;

  beforeEach(() => {
    delete (window as any).currentWorkspace;
    delete (window as any).rootYDoc;
    delete (window as any).__apis;
    localStorage.clear();
  });

  afterEach(() => {
    (window as any).currentWorkspace = originalWindowCurrentWorkspace;
    (window as any).rootYDoc = originalWindowRootYDoc;
    (window as any).__apis = originalApis;
    vi.restoreAllMocks();
  });

  function createTestYDocWithData(): Y.Doc {
    const doc = new Y.Doc();
    const today = new Date().toISOString().slice(0, 10);

    const habitsMap = doc.getMap(AFFINITE_YMAP_HABITS);
    const habitsData = [
      {
        id: 'habit-1',
        title: 'Meditación Matutina',
        icon: '🧘',
        category: 'health',
        entries: {
          [today]: false,
        },
      },
    ];
    habitsMap.set('habits', JSON.stringify(habitsData));

    const calendarMap = doc.getMap(AFFINITE_YMAP_CALENDAR);
    const tasksData = [
      {
        id: 'event-1',
        title: 'Planificación Semanal',
        date: today,
        completed: false,
      },
    ];
    calendarMap.set('tasks', JSON.stringify(tasksData));

    return doc;
  }

  describe('resolveActiveWorkspaceIntelligence', () => {
    test('returns undefined when no root doc or workspace is available', () => {
      const context = resolveActiveWorkspaceIntelligence();
      expect(context).toBeUndefined();
    });

    test('resolves context when customRootDoc is passed explicitly', () => {
      const doc = createTestYDocWithData();
      const context = resolveActiveWorkspaceIntelligence(doc);

      expect(context).toBeDefined();
      expect(context).toContain('[AFFINITE_WORKSPACE_INTELLIGENCE]');
      expect(context).toContain('Meditación Matutina');
      expect(context).toContain('Planificación Semanal');
    });

    test('resolves context from window.currentWorkspace.rootYDoc with board subdocs', () => {
      const doc = createTestYDocWithData();
      const today = new Date().toISOString().slice(0, 10);
      const boardDoc = new Y.Doc();
      const boardMap = boardDoc.getMap(AFFINITE_YMAP_BOARD);
      boardMap.set(
        'cards',
        JSON.stringify([
          {
            id: 'card-1',
            title: 'Lanzar MVP',
            dueDate: today,
          },
        ])
      );

      const docsMap = new Map();
      docsMap.set('board-page-1', {
        id: 'board-page-1',
        meta: { isBoard: true },
        spaceDoc: boardDoc,
      });

      (window as any).currentWorkspace = {
        rootYDoc: doc,
        docCollection: {
          docs: docsMap,
        },
      };

      const context = resolveActiveWorkspaceIntelligence();
      expect(context).toBeDefined();
      expect(context).toContain('[AFFINITE_WORKSPACE_INTELLIGENCE]');
      expect(context).toContain('Meditación Matutina');
      expect(context).toContain('Lanzar MVP');
    });

    test('resolves context from (window as any).rootYDoc fallback', () => {
      const doc = createTestYDocWithData();
      (window as any).rootYDoc = doc;

      const context = resolveActiveWorkspaceIntelligence();
      expect(context).toBeDefined();
      expect(context).toContain('[AFFINITE_WORKSPACE_INTELLIGENCE]');
      expect(context).toContain('Meditación Matutina');
    });

    test('returns undefined gracefully on malformed or throwing root doc', () => {
      const corruptWorkspace = {
        get rootYDoc() {
          throw new Error('Corrupt state');
        },
      };
      (window as any).currentWorkspace = corruptWorkspace;
      const context = resolveActiveWorkspaceIntelligence();
      expect(context).toBeUndefined();
    });
  });

  describe('executeLocalAIChat integration', () => {
    test('injects workspace intelligence into systemPrompt via session.params.rootYDoc with fetcher fallback', async () => {
      const doc = createTestYDocWithData();
      let sentSystemPrompt = '';

      const mockFetcher = vi.fn().mockImplementation(async (_url: string, init?: RequestInit) => {
        const body = JSON.parse(init?.body as string);
        const systemMsg = body.messages.find((m: any) => m.role === 'system');
        sentSystemPrompt = systemMsg?.content ?? '';

        return new Response(
          JSON.stringify({
            choices: [{ message: { content: '¡Hola! Veo tus hábitos y eventos.' } }],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      });

      const session: LocalAISession = {
        id: 'session-test-1',
        sessionId: 'session-test-1',
        workspaceId: 'workspace-1',
        promptName: 'Chat With AFFiNE AI',
        messages: [
          {
            id: 'msg-1',
            role: 'user',
            content: '¿Cuáles son mis prioridades de hoy?',
            createdAt: new Date().toISOString(),
          },
        ],
        params: {
          rootYDoc: doc,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const reply = await executeLocalAIChat(session, 'test-model', mockFetcher);

      expect(reply).toBe('¡Hola! Veo tus hábitos y eventos.');
      expect(sentSystemPrompt).toContain('[AFFINITE_WORKSPACE_INTELLIGENCE]');
      expect(sentSystemPrompt).toContain('Meditación Matutina');
    });

    test('injects workspace intelligence into systemPrompt via latestUserMsg.params.rootYDoc', async () => {
      const doc = createTestYDocWithData();
      let sentSystemPrompt = '';

      const mockFetcher = vi.fn().mockImplementation(async (_url: string, init?: RequestInit) => {
        const body = JSON.parse(init?.body as string);
        const systemMsg = body.messages.find((m: any) => m.role === 'system');
        sentSystemPrompt = systemMsg?.content ?? '';

        return new Response(
          JSON.stringify({
            choices: [{ message: { content: 'Respuesta' } }],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      });

      const session: LocalAISession = {
        id: 'session-test-user-msg',
        sessionId: 'session-test-user-msg',
        workspaceId: 'workspace-1',
        promptName: 'Chat With AFFiNE AI',
        messages: [
          {
            id: 'msg-1',
            role: 'user',
            content: '¿Qué tengo planeado?',
            params: { rootYDoc: doc },
            createdAt: new Date().toISOString(),
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await executeLocalAIChat(session, 'test-model', mockFetcher);

      expect(sentSystemPrompt).toContain('[AFFINITE_WORKSPACE_INTELLIGENCE]');
      expect(sentSystemPrompt).toContain('Planificación Semanal');
    });

    test('injects workspace intelligence into Electron AI bridge when bridge is active', async () => {
      const doc = createTestYDocWithData();
      let bridgeSystemPrompt = '';

      (window as any).__apis = {
        ai: {
          chat: vi.fn().mockImplementation(async (params: any) => {
            bridgeSystemPrompt = params.systemPrompt ?? '';
            return {
              content: 'Bridge reply',
              provider: 'antigravity',
              modelId: 'test-model',
            };
          }),
        },
      };

      (window as any).currentWorkspace = {
        rootYDoc: doc,
      };

      const session: LocalAISession = {
        id: 'session-test-bridge',
        sessionId: 'session-test-bridge',
        workspaceId: 'workspace-1',
        promptName: 'Chat With AFFiNE AI',
        messages: [
          {
            id: 'msg-1',
            role: 'user',
            content: 'Hola AI',
            createdAt: new Date().toISOString(),
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const reply = await executeLocalAIChat(session);

      expect(reply).toBe('Bridge reply');
      expect(bridgeSystemPrompt).toContain('[AFFINITE_WORKSPACE_INTELLIGENCE]');
      expect(bridgeSystemPrompt).toContain('Meditación Matutina');
    });

    test('proceeds cleanly without throwing when no workspace or root doc exists', async () => {
      let sentSystemPrompt = '';

      const mockFetcher = vi.fn().mockImplementation(async (_url: string, init?: RequestInit) => {
        const body = JSON.parse(init?.body as string);
        const systemMsg = body.messages.find((m: any) => m.role === 'system');
        sentSystemPrompt = systemMsg?.content ?? '';

        return new Response(
          JSON.stringify({
            choices: [{ message: { content: 'No workspace context needed' } }],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      });

      const session: LocalAISession = {
        id: 'session-no-ws',
        sessionId: 'session-no-ws',
        workspaceId: 'workspace-1',
        promptName: 'Chat With AFFiNE AI',
        messages: [
          {
            id: 'msg-1',
            role: 'user',
            content: 'Solo texto sin workspace',
            createdAt: new Date().toISOString(),
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const reply = await executeLocalAIChat(session, 'test-model', mockFetcher);

      expect(reply).toBe('No workspace context needed');
      expect(sentSystemPrompt).not.toContain('[AFFINITE_WORKSPACE_INTELLIGENCE]');
    });
  });

  describe('CopilotClient integration', () => {
    test('chatText sends workspace intelligence when window.currentWorkspace is present', async () => {
      const doc = createTestYDocWithData();
      (window as any).currentWorkspace = { rootYDoc: doc };

      let sentSystemPrompt = '';
      const mockFetcher = vi.fn().mockImplementation(async (_url: string, init?: RequestInit) => {
        const body = JSON.parse(init?.body as string);
        const systemMsg = body.messages.find((m: any) => m.role === 'system');
        sentSystemPrompt = systemMsg?.content ?? '';

        return new Response(
          JSON.stringify({
            choices: [{ message: { content: 'Cliente respondió con éxito' } }],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      });

      const client = new CopilotClient(
        vi.fn() as any,
        mockFetcher,
        vi.fn() as any
      );

      const sessionId = 'session-copilot-client-test';
      saveLocalSessions({
        [sessionId]: {
          id: sessionId,
          sessionId,
          workspaceId: 'local-workspace',
          promptName: 'Chat With AFFiNE AI',
          messages: [
            {
              id: 'msg-client-1',
              role: 'user',
              content: 'Hola desde CopilotClient',
              createdAt: new Date().toISOString(),
            },
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      });

      const reply = await client.chatText({ sessionId });

      expect(reply).toBe('Cliente respondió con éxito');
      expect(sentSystemPrompt).toContain('[AFFINITE_WORKSPACE_INTELLIGENCE]');
      expect(sentSystemPrompt).toContain('Meditación Matutina');
    });
  });
});
