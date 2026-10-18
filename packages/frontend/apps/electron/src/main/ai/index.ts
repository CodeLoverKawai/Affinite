import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import type { IpcMainInvokeEvent } from 'electron';

import { logger } from '../logger';
import type { NamespaceHandlers } from '../type';

export const ANTIGRAVITY_PRESET_MODELS = [
  'gemini-4-argon-high',
  'gemini-4-argon-medium',
  'gemini-3.8-flash-high',
  'claude-sonnet-5-5-high',
  'claude-opus-5-5-high',
  'gpt-oss-120b-medium',
];

function isRunningInFlatpak(): boolean {
  return Boolean(process.env.FLATPAK_ID) || fs.existsSync('/.flatpak-info');
}

function getAugmentedPath(): string {
  const home = os.homedir();
  const extraPaths = [
    path.join(home, '.local', 'bin'),
    '/usr/local/bin',
    '/usr/bin',
    '/bin',
  ];
  const currentPath = process.env.PATH || '';
  return [...extraPaths, currentPath].filter(Boolean).join(':');
}

function runHostCli(
  cmd: string,
  args: string[],
  timeoutMs = 120_000
): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const augmentedPath = getAugmentedPath();
    const inFlatpak = isRunningInFlatpak();

    let spawnCmd = cmd;
    let spawnArgs = args;

    if (inFlatpak) {
      spawnCmd = 'flatpak-spawn';
      spawnArgs = ['--host', `--env=PATH=${augmentedPath}`, cmd, ...args];
    } else if (cmd === 'agy') {
      const localAgy = path.join(os.homedir(), '.local', 'bin', 'agy');
      if (fs.existsSync(localAgy)) {
        spawnCmd = localAgy;
      }
    }

    const child = spawn(spawnCmd, spawnArgs, {
      env: {
        ...process.env,
        PATH: augmentedPath,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let settled = false;

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        child.kill('SIGTERM');
        reject(new Error(`Command ${cmd} timed out after ${timeoutMs}ms`));
      }
    }, timeoutMs);

    child.stdout?.on('data', chunk => {
      stdout += chunk.toString();
    });

    child.stderr?.on('data', chunk => {
      stderr += chunk.toString();
    });

    child.on('error', err => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        reject(err);
      }
    });

    child.on('close', code => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve({
          code: code ?? 1,
          stdout,
          stderr,
        });
      }
    });
  });
}

async function checkCliAvailable(cmd: string): Promise<boolean> {
  try {
    const res = await runHostCli(cmd, ['--version'], 8000);
    return res.code === 0 || res.stdout.trim().length > 0;
  } catch {
    if (!isRunningInFlatpak() && cmd === 'agy') {
      const localAgy = path.join(os.homedir(), '.local', 'bin', 'agy');
      return fs.existsSync(localAgy);
    }
    return false;
  }
}

async function checkOllamaAvailable(): Promise<{
  available: boolean;
  models: string[];
}> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const res = await fetch('http://127.0.0.1:11434/api/tags', {
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (res.ok) {
      const data = (await res.json()) as {
        models?: Array<{ name?: string }>;
      };
      const models = (data.models ?? [])
        .map(m => m.name)
        .filter((n): n is string => Boolean(n));
      return { available: true, models };
    }
  } catch {
    // fallback to CLI check
  }
  const cliOk = await checkCliAvailable('ollama');
  return { available: cliOk, models: [] };
}

function buildFullPrompt(params: {
  prompt: string;
  systemPrompt?: string;
  messages?: Array<{ role: string; content: string }>;
}): string {
  const parts: string[] = [];
  if (params.systemPrompt?.trim()) {
    parts.push(`System: ${params.systemPrompt.trim()}`);
  }
  if (Array.isArray(params.messages) && params.messages.length > 0) {
    const history = params.messages.filter(m => m.content?.trim());
    const lastMsg = history.at(-1);
    const messagesToInclude =
      lastMsg &&
      lastMsg.role === 'user' &&
      lastMsg.content.trim() === params.prompt?.trim()
        ? history.slice(0, -1)
        : history;

    if (messagesToInclude.length > 0) {
      const formattedHistory = messagesToInclude
        .map(
          m =>
            `${m.role === 'assistant' ? 'Assistant' : 'User'}: ${m.content.trim()}`
        )
        .join('\n\n');
      parts.push(formattedHistory);
    }
  }
  if (params.prompt?.trim()) {
    parts.push(
      parts.length > 0
        ? `User: ${params.prompt.trim()}`
        : params.prompt.trim()
    );
  }
  return parts.join('\n\n');
}

export const aiHandlers = {
  detectProviders: async () => {
    const [antigravity, ollamaInfo, geminiCli, claudeCli] = await Promise.all([
      checkCliAvailable('agy'),
      checkOllamaAvailable(),
      checkCliAvailable('gemini'),
      checkCliAvailable('claude'),
    ]);

    const models = [
      ...(antigravity ? ANTIGRAVITY_PRESET_MODELS : []),
      ...ollamaInfo.models,
    ];

    return {
      antigravity,
      ollama: ollamaInfo.available,
      geminiCli,
      claudeCli,
      models: Array.from(new Set(models)),
    };
  },

  chat: async (
    _e: IpcMainInvokeEvent,
    params: {
      provider: string;
      modelId: string;
      prompt: string;
      systemPrompt?: string;
      baseUrl?: string;
      apiKey?: string;
      messages?: Array<{ role: string; content: string }>;
    }
  ) => {
    const provider = params.provider || 'antigravity';
    const modelId = params.modelId || 'gemini-4-argon-high';
    const fullPrompt = buildFullPrompt(params);

    logger.info(`[ai-bridge] chat request provider=${provider} model=${modelId}`);

    if (provider === 'antigravity') {
      const res = await runHostCli('agy', [
        '-p',
        fullPrompt,
        '--model',
        modelId,
        '--output-format',
        'text',
      ]);
      if (res.code !== 0 && !res.stdout.trim()) {
        throw new Error(
          res.stderr.trim() || `Antigravity CLI exited with code ${res.code}`
        );
      }
      return {
        content: res.stdout.trim(),
        provider: 'antigravity',
        modelId,
      };
    }

    if (
      provider === 'gemini-cli' ||
      (provider === 'local-cli' && modelId.toLowerCase().includes('gemini'))
    ) {
      const res = await runHostCli('gemini', ['-p', fullPrompt]);
      if (res.code !== 0 && !res.stdout.trim()) {
        throw new Error(
          res.stderr.trim() || `gemini CLI exited with code ${res.code}`
        );
      }
      return {
        content: res.stdout.trim(),
        provider: 'gemini-cli',
        modelId,
      };
    }

    if (
      provider === 'claude-cli' ||
      (provider === 'local-cli' && modelId.toLowerCase().includes('claude'))
    ) {
      const res = await runHostCli('claude', ['-p', fullPrompt]);
      if (res.code !== 0 && !res.stdout.trim()) {
        throw new Error(
          res.stderr.trim() || `claude CLI exited with code ${res.code}`
        );
      }
      return {
        content: res.stdout.trim(),
        provider: 'claude-cli',
        modelId,
      };
    }

    if (provider === 'local-cli') {
      // Try gemini CLI first, then claude CLI, then agy
      for (const candidate of ['gemini', 'claude', 'agy'] as const) {
        try {
          const args =
            candidate === 'agy'
              ? ['-p', fullPrompt, '--output-format', 'text']
              : ['-p', fullPrompt];
          const res = await runHostCli(candidate, args);
          if (res.code === 0 && res.stdout.trim()) {
            return {
              content: res.stdout.trim(),
              provider: `${candidate}-cli`,
              modelId: candidate,
            };
          }
        } catch {
          // try next
        }
      }
      throw new Error(
        'No local CLI tool (gemini, claude, agy) responded successfully.'
      );
    }

    // HTTP OpenAI-compatible / Ollama endpoint from main process (bypasses CORS)
    const baseUrl = (params.baseUrl || 'http://127.0.0.1:11434/v1').replace(
      /\/+$/,
      ''
    );
    const apiMessages: Array<{ role: string; content: string }> = [];
    if (params.systemPrompt?.trim()) {
      apiMessages.push({ role: 'system', content: params.systemPrompt.trim() });
    }
    if (Array.isArray(params.messages) && params.messages.length > 0) {
      for (const m of params.messages) {
        if (m.content?.trim()) {
          apiMessages.push({ role: m.role, content: m.content });
        }
      }
    }
    if (
      params.prompt?.trim() &&
      apiMessages.at(-1)?.content?.trim() !== params.prompt.trim()
    ) {
      apiMessages.push({ role: 'user', content: params.prompt.trim() });
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (params.apiKey?.trim()) {
      headers['Authorization'] = `Bearer ${params.apiKey.trim()}`;
    }

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: modelId,
        messages: apiMessages,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(
        `AI HTTP Error (${response.status}): ${errText || response.statusText}`
      );
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      message?: { content?: string };
    };
    const content =
      data.choices?.[0]?.message?.content ?? data.message?.content ?? '';

    return {
      content: content.trim(),
      provider,
      modelId,
    };
  },
} satisfies NamespaceHandlers;
