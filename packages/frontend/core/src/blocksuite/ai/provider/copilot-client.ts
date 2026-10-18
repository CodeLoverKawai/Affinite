import { showAILoginRequiredAtom } from '@affine/core/components/affine/auth/ai-login-required';
import type { AIToolsConfig } from '@affine/core/modules/ai-button';
import { UserFriendlyError } from '@affine/error';
import {
  type addContextBlobMutation,
  type addContextCategoryMutation,
  type addContextDocMutation,
  type addContextFileMutation,
  applyDocUpdatesMutation,
  cleanupCopilotSessionMutation,
  ContextEmbedStatus,
  type CopilotChatHistoryFragment,
  createCopilotContextMutation,
  createCopilotMessageMutation,
  createCopilotSessionMutation,
  forkCopilotSessionMutation,
  getCopilotHistoriesQuery,
  getCopilotHistoryIdsQuery,
  getCopilotRecentSessionsQuery,
  getCopilotSessionQuery,
  getCopilotSessionsQuery,
  getWorkspaceEmbeddingStatusQuery,
  type GraphQLQuery,
  listContextObjectQuery,
  listContextQuery,
  matchContextQuery,
  type PaginationInput,
  type QueryOptions,
  type QueryResponse,
  type removeContextBlobMutation,
  type removeContextCategoryMutation,
  type removeContextDocMutation,
  type removeContextFileMutation,
  type RequestOptions,
  updateCopilotSessionMutation,
} from '@affine/graphql';
import { getCurrentStore } from '@toeverything/infra';

import {
  getSavedAIModel,
  isZeroKeyProvider,
  loadAISettings,
  PRESET_MODELS,
} from '../../../desktop/dialogs/setting/account-setting/ai-model-selector';
import {
  GeneralNetworkError,
  PaymentRequiredError,
  UnauthorizedError,
} from './error';

export enum Endpoint {
  Stream = 'stream',
  StreamObject = 'stream-object',
  Workflow = 'workflow',
  Images = 'images',
}

export const LOCAL_AI_SESSIONS_STORAGE_KEY = 'affinite_local_ai_sessions_v1';

export interface LocalAIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  attachments?: string[];
  params?: Record<string, any>;
  createdAt: string;
}

export interface LocalAISession {
  id: string;
  sessionId: string;
  workspaceId: string;
  docId?: string;
  promptName: string;
  parentSessionId?: string;
  pinned?: boolean;
  title?: string;
  messages: LocalAIMessage[];
  contextId?: string;
  contextDocs?: Array<{
    id: string;
    status: ContextEmbedStatus;
    createdAt: number;
  }>;
  contextFiles?: Array<{
    id: string;
    name: string;
    blobId: string;
    status: ContextEmbedStatus;
    createdAt: number;
  }>;
  createdAt: string;
  updatedAt: string;
}

type OptionsField<T extends GraphQLQuery> =
  RequestOptions<T>['variables'] extends { options: infer U } ? U : never;

function getElectronAIBridge():
  | {
      chat?: (params: {
        provider: string;
        modelId: string;
        prompt: string;
        systemPrompt?: string;
        baseUrl?: string;
        apiKey?: string;
        messages?: Array<{ role: string; content: string }>;
      }) => Promise<{ content: string; provider: string; modelId: string }>;
      detectProviders?: () => Promise<{
        antigravity: boolean;
        ollama: boolean;
        geminiCli: boolean;
        claudeCli: boolean;
        models: string[];
      }>;
    }
  | undefined {
  if (typeof window === 'undefined') return undefined;
  const win = window as any;
  return win.__apis?.handler?.ai ?? win.__apis?.ai;
}

export function isLocalAIProvider(): boolean {
  const settings = getSavedAIModel();
  if (isZeroKeyProvider(settings.provider)) {
    return true;
  }
  if (
    settings.provider === 'custom' ||
    settings.baseUrl?.includes('localhost') ||
    settings.baseUrl?.includes('127.0.0.1') ||
    settings.baseUrl?.startsWith('local://')
  ) {
    return true;
  }
  if (settings.apiKey?.trim()) {
    return true;
  }
  const bridge = getElectronAIBridge();
  if (bridge?.chat) {
    return true;
  }
  return false;
}

export function loadLocalSessions(): Record<string, LocalAISession> {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(LOCAL_AI_SESSIONS_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) || {};
  } catch {
    return {};
  }
}

export function saveLocalSessions(sessions: Record<string, LocalAISession>) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(
      LOCAL_AI_SESSIONS_STORAGE_KEY,
      JSON.stringify(sessions)
    );
  } catch {
    // ignore quota errors
  }
}

function generateLocalId(prefix = 'local'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function toCopilotHistoryFragment(
  session: LocalAISession
): CopilotChatHistoryFragment {
  const settings = loadAISettings();
  const presetList =
    PRESET_MODELS[settings.provider] || PRESET_MODELS.antigravity;
  return {
    sessionId: session.sessionId || session.id,
    workspaceId: session.workspaceId,
    docId: session.docId,
    parentSessionId: session.parentSessionId,
    promptName: session.promptName || 'Chat With AFFiNE AI',
    model: settings.modelId || 'gemini-4-argon-high',
    optionalModels: presetList.map(m => m.id),
    action: session.promptName !== 'Chat With AFFiNE AI' ? session.promptName : null,
    pinned: Boolean(session.pinned),
    title:
      session.title ||
      session.messages.find(m => m.role === 'user')?.content.slice(0, 60) ||
      'Conversación Local',
    tokens: 0,
    messages: session.messages.map(m => ({
      id: m.id,
      role: m.role,
      content: m.content,
      attachments: m.attachments ?? [],
      streamObjects: [],
      createdAt: m.createdAt,
    })),
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  };
}

function buildSystemInstructionForPromptName(
  promptName?: string,
  params?: Record<string, any>
): string {
  if (!promptName || promptName === 'Chat With AFFiNE AI') {
    return 'You are an intelligent AI assistant integrated into Affinite. Respond clearly and concisely using Markdown.';
  }
  switch (promptName) {
    case 'Summary':
      return 'Summarize the provided text clearly and concisely.';
    case 'Translate to':
      return `Translate the provided text to ${params?.language || 'Spanish'}. Return only the translation.`;
    case 'Change tone to':
      return `Rewrite the provided text in a ${params?.tone || 'professional'} tone.`;
    case 'Improve writing for it':
      return 'Improve the writing quality, clarity, and flow of the provided text.';
    case 'Improve grammar for it':
    case 'Fix spelling for it':
      return 'Fix any grammar and spelling errors in the provided text.';
    case 'Create headings':
      return 'Organize the provided text with clear Markdown headings.';
    case 'Make it longer':
      return 'Expand upon the provided text with additional relevant detail.';
    case 'Make it shorter':
      return 'Condense the provided text to be shorter while keeping key points.';
    case 'Continue writing':
      return 'Continue writing seamlessly from the provided text.';
    case 'Explain this':
    case 'Explain this code':
      return 'Explain the provided content or code clearly.';
    case 'Check code error':
      return 'Find any bugs or issues in the provided code and suggest fixes.';
    case 'Find action items from it':
      return 'Extract a Markdown checklist of action items from the provided text.';
    default:
      return `Task: ${promptName}. Respond clearly in Markdown.`;
  }
}

async function executeLocalAIChat(
  session: LocalAISession,
  overrideModelId?: string,
  fetcher?: (input: string, init?: RequestInit) => Promise<Response>,
  signal?: AbortSignal
): Promise<string> {
  const settings = loadAISettings();
  const provider = settings.provider || 'antigravity';
  const modelId = overrideModelId || settings.modelId || 'gemini-4-argon-high';
  const userMessages = session.messages.filter(m => m.content?.trim());
  const latestUserMsg =
    [...userMessages].reverse().find(m => m.role === 'user') ??
    userMessages.at(-1);

  let prompt = latestUserMsg?.content ?? '';
  const msgParams = latestUserMsg?.params;
  if (msgParams?.docs && Array.isArray(msgParams.docs) && msgParams.docs.length > 0) {
    const docsContext = msgParams.docs
      .map(
        (d: any) =>
          `--- Document: ${d.docTitle || d.docId} ---\n${d.docContent || ''}`
      )
      .join('\n\n');
    prompt = `${docsContext}\n\n${prompt}`;
  } else if (msgParams?.selectedMarkdown) {
    prompt = `Selected context:\n${msgParams.selectedMarkdown}\n\n${prompt}`;
  }

  const systemPrompt = buildSystemInstructionForPromptName(
    session.promptName,
    msgParams
  );

  const historyMessages = userMessages.map(m => ({
    role: m.role,
    content: m.content,
  }));

  const bridge = getElectronAIBridge();
  if (bridge?.chat) {
    const result = await bridge.chat({
      provider,
      modelId,
      prompt,
      systemPrompt,
      baseUrl: settings.baseUrl,
      apiKey: settings.apiKey,
      messages: historyMessages,
    });
    return result?.content ?? '';
  }

  // Fallback for browser / unit tests without Electron IPC bridge
  const baseUrl = (
    settings.baseUrl && !settings.baseUrl.startsWith('local://')
      ? settings.baseUrl
      : 'http://127.0.0.1:11434/v1'
  ).replace(/\/+$/, '');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (settings.apiKey?.trim()) {
    headers['Authorization'] = `Bearer ${settings.apiKey.trim()}`;
  }

  const doFetch = fetcher || fetch;
  const response = await doFetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: modelId,
      messages: [
        { role: 'system', content: systemPrompt },
        ...historyMessages,
      ],
      stream: false,
    }),
    signal,
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(
      `Local AI request failed (${response.status}): ${errText || response.statusText}`
    );
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    message?: { content?: string };
    content?: string;
  };

  return (
    data.choices?.[0]?.message?.content ??
    data.message?.content ??
    data.content ??
    ''
  ).trim();
}

export function createLocalEventSource(
  runChat: () => Promise<string>
): EventSource {
  type Listener = (event: any) => void;
  const listeners = new Map<string, Set<Listener>>();

  const emit = (type: string, event: any) => {
    const set = listeners.get(type);
    if (set) {
      for (const fn of Array.from(set)) {
        try {
          fn(event);
        } catch (err) {
          console.error('[local-ai-eventsource] listener error', err);
        }
      }
    }
    if (type === 'message' && typeof syntheticSource.onmessage === 'function') {
      syntheticSource.onmessage(event);
    }
    if (type === 'error' && typeof syntheticSource.onerror === 'function') {
      syntheticSource.onerror(event);
    }
    if (type === 'open' && typeof syntheticSource.onopen === 'function') {
      syntheticSource.onopen(event);
    }
  };

  const syntheticSource = {
    CONNECTING: 0 as const,
    OPEN: 1 as const,
    CLOSED: 2 as const,
    readyState: 1 as number,
    url: 'local://ai-stream',
    withCredentials: false,
    onopen: null as ((this: EventSource, ev: Event) => any) | null,
    onmessage: null as ((this: EventSource, ev: MessageEvent) => any) | null,
    onerror: null as ((this: EventSource, ev: Event) => any) | null,
    addEventListener(type: string, listener: any) {
      if (typeof listener !== 'function') return;
      if (!listeners.has(type)) {
        listeners.set(type, new Set());
      }
      listeners.get(type)!.add(listener);
    },
    removeEventListener(type: string, listener: any) {
      listeners.get(type)?.delete(listener);
    },
    dispatchEvent(event: Event): boolean {
      emit(event.type, event);
      return true;
    },
    close() {
      syntheticSource.readyState = 2;
    },
  };

  // Start async execution on next tick so callers can attach listeners first
  Promise.resolve()
    .then(async () => {
      if (syntheticSource.readyState === 2) return;
      const replyText = await runChat();
      if (syntheticSource.readyState === 2) return;

      const msgEvent =
        typeof MessageEvent !== 'undefined'
          ? new MessageEvent('message', { data: replyText })
          : ({ type: 'message', data: replyText } as MessageEvent);
      emit('message', msgEvent);

      // Allow consumer async iterator microtasks to shift messageQueue before closing
      await new Promise(resolve => setTimeout(resolve, 10));

      const doneEvent =
        typeof MessageEvent !== 'undefined'
          ? new MessageEvent('done', { data: '' })
          : ({ type: 'done', data: '' } as MessageEvent);
      emit('done', doneEvent);

      syntheticSource.readyState = 2;
      const closeEvent =
        typeof Event !== 'undefined'
          ? new Event('error')
          : ({ type: 'error' } as Event);
      emit('error', closeEvent);
    })
    .catch(err => {
      if (syntheticSource.readyState === 2) return;
      syntheticSource.readyState = 2;
      const errorPayload = JSON.stringify({
        status: 500,
        message: err?.message || String(err),
      });
      const errEvent = {
        type: 'error',
        data: errorPayload,
      };
      emit('error', errEvent);
    });

  return syntheticSource as unknown as EventSource;
}

function toUserFriendlyError(err: any): UserFriendlyError {
  return err instanceof UserFriendlyError
    ? err
    : UserFriendlyError.fromAny(err);
}

function isAbortError(error: UserFriendlyError) {
  return (
    error.name === 'REQUEST_ABORTED' ||
    error.code === 'REQUEST_ABORTED' ||
    error.message?.toLowerCase().includes('aborted') === true
  );
}

function codeToError(error: UserFriendlyError) {
  switch (error.status) {
    case 401:
      return new UnauthorizedError();
    case 402:
      return new PaymentRequiredError();
    default:
      return new GeneralNetworkError(
        error.code
          ? `${error.code}: ${error.message}\nIdentify: ${error.name}`
          : error.message
      );
  }
}

export function resolveError(err: any) {
  return codeToError(toUserFriendlyError(err));
}

export function handleError(src: any) {
  const err = resolveError(src);
  if (err instanceof UnauthorizedError && !isLocalAIProvider()) {
    getCurrentStore().set(showAILoginRequiredAtom, true);
  }
  return err;
}

export class CopilotClient {
  constructor(
    readonly gql: <Query extends GraphQLQuery>(
      options: QueryOptions<Query>
    ) => Promise<QueryResponse<Query>>,
    readonly fetcher: (input: string, init?: RequestInit) => Promise<Response>,
    readonly eventSource: (
      url: string,
      eventSourceInitDict?: EventSourceInit
    ) => EventSource
  ) {}

  private createLocalSessionInternal(
    options: OptionsField<typeof createCopilotSessionMutation>
  ): string {
    const sessions = loadLocalSessions();
    if (options.reuseLatestChat) {
      const existing = Object.values(sessions)
        .filter(
          s =>
            s.workspaceId === options.workspaceId &&
            (options.docId ? s.docId === options.docId : true) &&
            (options.pinned ? Boolean(s.pinned) : true)
        )
        .sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        )[0];
      if (existing) {
        return existing.sessionId;
      }
    }

    const sessionId = generateLocalId('session');
    const now = new Date().toISOString();
    sessions[sessionId] = {
      id: sessionId,
      sessionId,
      workspaceId: options.workspaceId,
      docId: options.docId ?? undefined,
      promptName: options.promptName,
      pinned: Boolean(options.pinned),
      messages: [],
      contextId: `ctx-${sessionId}`,
      contextDocs: [],
      contextFiles: [],
      createdAt: now,
      updatedAt: now,
    };
    saveLocalSessions(sessions);
    return sessionId;
  }

  async createSession(
    options: OptionsField<typeof createCopilotSessionMutation>
  ) {
    if (isLocalAIProvider()) {
      return this.createLocalSessionInternal(options);
    }
    try {
      const res = await this.gql({
        query: createCopilotSessionMutation,
        variables: {
          options,
        },
      });
      return res.createCopilotSession;
    } catch (err) {
      if (isLocalAIProvider()) {
        return this.createLocalSessionInternal(options);
      }
      throw resolveError(err);
    }
  }

  async updateSession(
    options: OptionsField<typeof updateCopilotSessionMutation>
  ) {
    const sessions = loadLocalSessions();
    if (isLocalAIProvider() || sessions[options.sessionId]) {
      const existing = sessions[options.sessionId];
      if (existing) {
        if (typeof options.pinned === 'boolean') {
          existing.pinned = options.pinned;
        }
        existing.updatedAt = new Date().toISOString();
        saveLocalSessions(sessions);
      }
      return options.sessionId;
    }
    try {
      const res = await this.gql({
        query: updateCopilotSessionMutation,
        variables: {
          options,
        },
      });
      return res.updateCopilotSession;
    } catch (err) {
      throw resolveError(err);
    }
  }

  async forkSession(options: OptionsField<typeof forkCopilotSessionMutation>) {
    const sessions = loadLocalSessions();
    if (isLocalAIProvider() || sessions[options.sessionId]) {
      const parent = sessions[options.sessionId];
      const newSessionId = generateLocalId('session');
      const now = new Date().toISOString();
      let messages = parent ? [...parent.messages] : [];
      if (options.latestMessageId) {
        const idx = messages.findIndex(m => m.id === options.latestMessageId);
        if (idx !== -1) {
          messages = messages.slice(0, idx + 1);
        }
      }
      sessions[newSessionId] = {
        id: newSessionId,
        sessionId: newSessionId,
        workspaceId: options.workspaceId,
        docId: options.docId ?? parent?.docId,
        promptName: parent?.promptName || 'Chat With AFFiNE AI',
        parentSessionId: options.sessionId,
        pinned: false,
        messages,
        contextId: `ctx-${newSessionId}`,
        contextDocs: parent?.contextDocs ? [...parent.contextDocs] : [],
        contextFiles: parent?.contextFiles ? [...parent.contextFiles] : [],
        createdAt: now,
        updatedAt: now,
      };
      saveLocalSessions(sessions);
      return newSessionId;
    }
    try {
      const res = await this.gql({
        query: forkCopilotSessionMutation,
        variables: {
          options,
        },
      });
      return res.forkCopilotSession;
    } catch (err) {
      throw resolveError(err);
    }
  }

  async createMessage(
    options: OptionsField<typeof createCopilotMessageMutation>
  ) {
    const sessions = loadLocalSessions();
    if (isLocalAIProvider() || sessions[options.sessionId]) {
      const now = new Date().toISOString();
      const messageId = options.messageId || generateLocalId('msg');
      if (!sessions[options.sessionId]) {
        sessions[options.sessionId] = {
          id: options.sessionId,
          sessionId: options.sessionId,
          workspaceId: 'local-workspace',
          promptName: 'Chat With AFFiNE AI',
          messages: [],
          contextId: `ctx-${options.sessionId}`,
          createdAt: now,
          updatedAt: now,
        };
      }
      const session = sessions[options.sessionId];
      session.messages.push({
        id: messageId,
        role: 'user',
        content: options.content || '',
        attachments: options.attachments ?? [],
        params: (options.params as Record<string, any>) ?? undefined,
        createdAt: now,
      });
      if (!session.title && options.content?.trim()) {
        session.title = options.content.trim().slice(0, 60);
      }
      session.updatedAt = now;
      saveLocalSessions(sessions);
      return messageId;
    }
    try {
      const res = await this.gql({
        query: createCopilotMessageMutation,
        variables: {
          options,
        },
      });
      return res.createCopilotMessage;
    } catch (err) {
      throw resolveError(err);
    }
  }

  async getMessages(sessionId: string): Promise<LocalAIMessage[]> {
    const sessions = loadLocalSessions();
    return sessions[sessionId]?.messages ?? [];
  }

  async getSession(workspaceId: string, sessionId: string) {
    const sessions = loadLocalSessions();
    if (sessions[sessionId]) {
      return toCopilotHistoryFragment(sessions[sessionId]);
    }
    if (isLocalAIProvider()) {
      return undefined;
    }
    try {
      const res = await this.gql({
        query: getCopilotSessionQuery,
        variables: { sessionId, workspaceId },
      });
      return res.currentUser?.copilot?.chats?.edges?.[0]?.node;
    } catch (err) {
      throw resolveError(err);
    }
  }

  async getSessions(
    workspaceId: string,
    pagination: PaginationInput,
    docId?: string,
    options?: RequestOptions<
      typeof getCopilotSessionsQuery
    >['variables']['options'],
    signal?: AbortSignal
  ) {
    if (isLocalAIProvider()) {
      const sessions = Object.values(loadLocalSessions())
        .filter(s => {
          if (workspaceId && s.workspaceId !== workspaceId) return false;
          if (docId && s.docId !== docId) return false;
          if (typeof options?.pinned === 'boolean' && Boolean(s.pinned) !== options.pinned) {
            return false;
          }
          if (typeof options?.action === 'boolean') {
            const isAction = s.promptName !== 'Chat With AFFiNE AI';
            if (isAction !== options.action) return false;
          }
          return true;
        })
        .sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
      const limit = options?.limit ?? pagination?.first ?? sessions.length;
      return sessions.slice(0, limit).map(toCopilotHistoryFragment);
    }
    try {
      const res = await this.gql({
        query: getCopilotSessionsQuery,
        variables: {
          workspaceId,
          pagination,
          docId,
          options,
        },
        signal,
      });
      return res.currentUser?.copilot?.chats.edges.map(e => e.node);
    } catch (err) {
      const parsed = toUserFriendlyError(err);
      if (isAbortError(parsed)) {
        return [];
      }
      throw resolveError(parsed);
    }
  }

  async getRecentSessions(
    workspaceId: string,
    limit = 10,
    offset = 0
  ) {
    if (isLocalAIProvider()) {
      const sessions = Object.values(loadLocalSessions())
        .filter(
          s =>
            (!workspaceId || s.workspaceId === workspaceId) &&
            s.promptName === 'Chat With AFFiNE AI'
        )
        .sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
      return sessions
        .slice(offset, offset + limit)
        .map(toCopilotHistoryFragment);
    }
    try {
      const res = await this.gql({
        query: getCopilotRecentSessionsQuery,
        variables: {
          workspaceId,
          limit,
          offset,
        },
      });
      return res.currentUser?.copilot?.chats.edges.map(e => e.node);
    } catch (err) {
      const parsed = toUserFriendlyError(err);
      if (isAbortError(parsed)) {
        return [];
      }
      throw resolveError(parsed);
    }
  }

  async getHistory(workspaceId: string, sessionId: string) {
    return this.getSession(workspaceId, sessionId);
  }

  async getHistories(
    workspaceId: string,
    pagination: PaginationInput,
    docId?: string,
    options?: RequestOptions<
      typeof getCopilotHistoriesQuery
    >['variables']['options']
  ) {
    if (isLocalAIProvider()) {
      const sessions = Object.values(loadLocalSessions())
        .filter(s => {
          if (options?.sessionId) {
            return s.sessionId === options.sessionId;
          }
          if (workspaceId && s.workspaceId !== workspaceId) return false;
          if (docId && s.docId !== docId) return false;
          if (typeof (options as any)?.action === 'boolean') {
            const isAction = s.promptName !== 'Chat With AFFiNE AI';
            if (isAction !== (options as any).action) return false;
          }
          return true;
        })
        .sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
      return sessions.map(toCopilotHistoryFragment);
    }
    try {
      const res = await this.gql({
        query: getCopilotHistoriesQuery,
        variables: {
          workspaceId,
          pagination,
          docId,
          options,
        },
      });

      return res.currentUser?.copilot?.chats.edges.map(e => e.node);
    } catch (err) {
      const parsed = toUserFriendlyError(err);
      if (isAbortError(parsed)) {
        return [];
      }
      throw resolveError(parsed);
    }
  }

  async getHistoryIds(
    workspaceId: string,
    pagination: PaginationInput,
    docId?: string,
    options?: RequestOptions<
      typeof getCopilotHistoryIdsQuery
    >['variables']['options']
  ) {
    if (isLocalAIProvider()) {
      const histories = await this.getHistories(
        workspaceId,
        pagination,
        docId,
        options
      );
      return (histories ?? []).map(h => ({
        sessionId: h.sessionId,
        messages: h.messages.map(m => ({
          id: m.id,
          role: m.role,
          createdAt: m.createdAt,
        })),
      }));
    }
    try {
      const res = await this.gql({
        query: getCopilotHistoryIdsQuery,
        variables: {
          workspaceId,
          pagination,
          docId,
          options,
        },
      });

      return res.currentUser?.copilot?.chats.edges.map(e => e.node);
    } catch (err) {
      const parsed = toUserFriendlyError(err);
      if (isAbortError(parsed)) {
        return [];
      }
      throw resolveError(parsed);
    }
  }

  async cleanupSessions(input: {
    workspaceId: string;
    docId: string | undefined;
    sessionIds: string[];
  }) {
    if (isLocalAIProvider()) {
      const sessions = loadLocalSessions();
      for (const id of input.sessionIds) {
        delete sessions[id];
      }
      saveLocalSessions(sessions);
      return input.sessionIds;
    }
    try {
      const res = await this.gql({
        query: cleanupCopilotSessionMutation,
        variables: {
          input,
        },
      });
      return res.cleanupCopilotSession;
    } catch (err) {
      throw resolveError(err);
    }
  }

  async createContext(workspaceId: string, sessionId: string) {
    if (isLocalAIProvider()) {
      const sessions = loadLocalSessions();
      const contextId = `ctx-${sessionId}`;
      if (sessions[sessionId]) {
        sessions[sessionId].contextId = contextId;
        saveLocalSessions(sessions);
      }
      return contextId;
    }
    const res = await this.gql({
      query: createCopilotContextMutation,
      variables: {
        workspaceId,
        sessionId,
      },
    });
    return res.createCopilotContext;
  }

  async getContextId(workspaceId: string, sessionId: string) {
    if (isLocalAIProvider()) {
      const sessions = loadLocalSessions();
      return sessions[sessionId]?.contextId ?? `ctx-${sessionId}`;
    }
    const res = await this.gql({
      query: listContextQuery,
      variables: {
        workspaceId,
        sessionId,
      },
    });
    return res.currentUser?.copilot?.contexts?.[0]?.id || undefined;
  }

  async addContextDoc(options: OptionsField<typeof addContextDocMutation>) {
    if (isLocalAIProvider()) {
      const sessions = loadLocalSessions();
      const session = Object.values(sessions).find(
        s => s.contextId === options.contextId
      );
      const entry = {
        id: options.docId,
        status: ContextEmbedStatus.Finished,
        createdAt: Date.now(),
      };
      if (session) {
        session.contextDocs = [
          ...(session.contextDocs ?? []).filter(d => d.id !== options.docId),
          entry,
        ];
        saveLocalSessions(sessions);
      }
      return entry;
    }
    const res = await this.gql({
      query: addContextDocMutation,
      variables: {
        options,
      },
    });
    return res.addContextDoc;
  }

  async removeContextDoc(
    options: OptionsField<typeof removeContextDocMutation>
  ) {
    if (isLocalAIProvider()) {
      const sessions = loadLocalSessions();
      const session = Object.values(sessions).find(
        s => s.contextId === options.contextId
      );
      if (session && session.contextDocs) {
        session.contextDocs = session.contextDocs.filter(
          d => d.id !== options.docId
        );
        saveLocalSessions(sessions);
      }
      return true;
    }
    const res = await this.gql({
      query: removeContextDocMutation,
      variables: {
        options,
      },
    });
    return res.removeContextDoc;
  }

  async addContextFile(
    content: File,
    options: OptionsField<typeof addContextFileMutation>
  ) {
    if (isLocalAIProvider()) {
      const entry = {
        id: generateLocalId('file'),
        name: content.name,
        blobId: options.blobId,
        status: ContextEmbedStatus.Finished,
        createdAt: Date.now(),
      };
      const sessions = loadLocalSessions();
      const session = Object.values(sessions).find(
        s => s.contextId === options.contextId
      );
      if (session) {
        session.contextFiles = [...(session.contextFiles ?? []), entry];
        saveLocalSessions(sessions);
      }
      return entry;
    }
    const res = await this.gql({
      query: addContextFileMutation,
      variables: {
        content,
        options,
      },
      timeout: 60000,
    });
    return res.addContextFile;
  }

  async removeContextFile(
    options: OptionsField<typeof removeContextFileMutation>
  ) {
    if (isLocalAIProvider()) {
      const sessions = loadLocalSessions();
      const session = Object.values(sessions).find(
        s => s.contextId === options.contextId
      );
      if (session && session.contextFiles) {
        session.contextFiles = session.contextFiles.filter(
          f => f.id !== options.fileId
        );
        saveLocalSessions(sessions);
      }
      return true;
    }
    const res = await this.gql({
      query: removeContextFileMutation,
      variables: {
        options,
      },
    });
    return res.removeContextFile;
  }

  async addContextCategory(
    options: OptionsField<typeof addContextCategoryMutation>
  ) {
    if (isLocalAIProvider()) {
      return {
        id: options.categoryId,
        type: options.type,
        docs: options.docs ?? [],
        createdAt: Date.now(),
      };
    }
    const res = await this.gql({
      query: addContextCategoryMutation,
      variables: {
        options,
      },
    });
    return res.addContextCategory;
  }

  async removeContextCategory(
    options: OptionsField<typeof removeContextCategoryMutation>
  ) {
    if (isLocalAIProvider()) {
      return true;
    }
    const res = await this.gql({
      query: removeContextCategoryMutation,
      variables: {
        options,
      },
    });
    return res.removeContextCategory;
  }

  async getContextDocsAndFiles(
    workspaceId: string,
    sessionId: string,
    contextId: string
  ) {
    if (isLocalAIProvider()) {
      const sessions = loadLocalSessions();
      const session = sessions[sessionId];
      return {
        id: contextId,
        workspaceId,
        docs: session?.contextDocs ?? [],
        files: session?.contextFiles ?? [],
        blobs: [],
        tags: [],
        collections: [],
      };
    }
    const res = await this.gql({
      query: listContextObjectQuery,
      variables: {
        workspaceId,
        sessionId,
        contextId,
      },
    });
    return res.currentUser?.copilot?.contexts?.[0];
  }

  async matchContext(
    content: string,
    contextId?: string,
    workspaceId?: string,
    limit?: number,
    scopedThreshold?: number,
    threshold?: number
  ) {
    if (isLocalAIProvider()) {
      return { files: [], docs: [] };
    }
    const res = await this.gql({
      query: matchContextQuery,
      variables: {
        content,
        contextId,
        workspaceId,
        limit,
        scopedThreshold,
        threshold,
      },
    });
    const { matchFiles: files, matchWorkspaceDocs: docs } =
      res.currentUser?.copilot?.contexts?.[0] || {};
    return { files, docs };
  }

  private async runLocalChatAndPersist(
    sessionId: string,
    modelId?: string,
    signal?: AbortSignal
  ): Promise<string> {
    const sessions = loadLocalSessions();
    const now = new Date().toISOString();
    if (!sessions[sessionId]) {
      sessions[sessionId] = {
        id: sessionId,
        sessionId,
        workspaceId: 'local-workspace',
        promptName: 'Chat With AFFiNE AI',
        messages: [],
        contextId: `ctx-${sessionId}`,
        createdAt: now,
        updatedAt: now,
      };
    }
    const session = sessions[sessionId];
    const replyText = await executeLocalAIChat(
      session,
      modelId,
      this.fetcher,
      signal
    );

    const updatedSessions = loadLocalSessions();
    const targetSession = updatedSessions[sessionId] || session;
    targetSession.messages.push({
      id: generateLocalId('msg-ai'),
      role: 'assistant',
      content: replyText,
      createdAt: new Date().toISOString(),
    });
    targetSession.updatedAt = new Date().toISOString();
    updatedSessions[sessionId] = targetSession;
    saveLocalSessions(updatedSessions);

    return replyText;
  }

  async chatText({
    sessionId,
    messageId,
    reasoning,
    modelId,
    toolsConfig,
    signal,
  }: {
    sessionId: string;
    messageId?: string;
    reasoning?: boolean;
    modelId?: string;
    toolsConfig?: AIToolsConfig;
    signal?: AbortSignal;
  }) {
    const aiSettings = loadAISettings();
    const effectiveModelId = modelId || aiSettings.modelId;

    if (isLocalAIProvider() || loadLocalSessions()[sessionId]) {
      return this.runLocalChatAndPersist(sessionId, effectiveModelId, signal);
    }

    let url = `/api/copilot/chat/${sessionId}`;
    const queryString = this.paramsToQueryString({
      messageId,
      reasoning,
      modelId: effectiveModelId,
      toolsConfig,
    });
    if (queryString) {
      url += `?${queryString}`;
    }
    const response = await this.fetcher(url.toString(), { signal });
    return response.text();
  }

  // Text or image to text
  chatTextStream(
    {
      sessionId,
      messageId,
      reasoning,
      modelId,
      toolsConfig,
    }: {
      sessionId: string;
      messageId?: string;
      reasoning?: boolean;
      modelId?: string;
      toolsConfig?: AIToolsConfig;
    },
    endpoint = Endpoint.Stream
  ) {
    const aiSettings = loadAISettings();
    const effectiveModelId = modelId || aiSettings.modelId;

    if (isLocalAIProvider() || loadLocalSessions()[sessionId]) {
      return createLocalEventSource(() =>
        this.runLocalChatAndPersist(sessionId, effectiveModelId)
      );
    }

    let url = `/api/copilot/chat/${sessionId}/${endpoint}`;
    const queryString = this.paramsToQueryString({
      messageId,
      reasoning,
      modelId: effectiveModelId,
      toolsConfig,
    });
    if (queryString) {
      url += `?${queryString}`;
    }
    return this.eventSource(url);
  }

  textToTextStream(
    params: {
      sessionId: string;
      messageId?: string;
      reasoning?: boolean;
      modelId?: string;
      toolsConfig?: AIToolsConfig;
    },
    endpoint = Endpoint.Stream
  ) {
    return this.chatTextStream(params, endpoint);
  }

  chatStream(
    params: {
      sessionId: string;
      messageId?: string;
      reasoning?: boolean;
      modelId?: string;
      toolsConfig?: AIToolsConfig;
    },
    endpoint = Endpoint.StreamObject
  ) {
    return this.chatTextStream(params, endpoint);
  }

  // Text or image to images
  imagesStream(
    sessionId: string,
    messageId?: string,
    seed?: string,
    endpoint = Endpoint.Images
  ) {
    let url = `/api/copilot/chat/${sessionId}/${endpoint}`;
    const queryString = this.paramsToQueryString({
      messageId,
      seed,
    });
    if (queryString) {
      url += `?${queryString}`;
    }
    return this.eventSource(url);
  }

  paramsToQueryString(
    params: Record<string, string | boolean | undefined | Record<string, any>>
  ) {
    const queryString = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (typeof value === 'boolean') {
        if (value) {
          queryString.append(key, 'true');
        }
      } else if (typeof value === 'string') {
        queryString.append(key, value);
      } else if (typeof value === 'object' && value !== null) {
        queryString.append(key, JSON.stringify(value));
      }
    });
    return queryString.toString();
  }

  getEmbeddingStatus(workspaceId: string) {
    if (isLocalAIProvider()) {
      return Promise.resolve({
        total: 0,
        embedded: 0,
      });
    }
    return this.gql({
      query: getWorkspaceEmbeddingStatusQuery,
      variables: { workspaceId },
    }).then(res => res.queryWorkspaceEmbeddingStatus);
  }

  applyDocUpdates(
    workspaceId: string,
    docId: string,
    op: string,
    updates: string
  ) {
    if (isLocalAIProvider()) {
      return Promise.resolve(updates);
    }
    return this.gql({
      query: applyDocUpdatesMutation,
      variables: {
        workspaceId,
        docId,
        op,
        updates,
      },
    }).then(res => res.applyDocUpdates);
  }

  addContextBlob(options: OptionsField<typeof addContextBlobMutation>) {
    if (isLocalAIProvider()) {
      return Promise.resolve({
        id: options.blobId,
        status: ContextEmbedStatus.Finished,
        createdAt: Date.now(),
      });
    }
    return this.gql({
      query: addContextBlobMutation,
      variables: {
        options,
      },
    }).then(res => res.addContextBlob);
  }

  removeContextBlob(options: OptionsField<typeof removeContextBlobMutation>) {
    if (isLocalAIProvider()) {
      return Promise.resolve(true);
    }
    return this.gql({
      query: removeContextBlobMutation,
      variables: {
        options,
      },
    }).then(res => res.removeContextBlob);
  }
}
