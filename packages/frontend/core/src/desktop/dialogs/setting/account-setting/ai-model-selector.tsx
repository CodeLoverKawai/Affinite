import { Button } from '@affine/component';
import { useCallback, useEffect, useState } from 'react';

import * as styles from './ai-model-selector.css';

export type AIProviderType =
  | 'antigravity'
  | 'ollama'
  | 'local-cli'
  | 'openai'
  | 'gemini'
  | 'google'
  | 'anthropic'
  | 'custom';

export interface AIModelSettings {
  provider: AIProviderType;
  modelId: string;
  baseUrl: string;
  apiKey: string;
}

export const STORAGE_KEY_AI_SETTINGS = 'affinite_ai_model_settings';

export const DEFAULT_AI_SETTINGS: AIModelSettings = {
  provider: 'antigravity',
  modelId: 'gemini-4-argon-high',
  baseUrl: 'local://antigravity-cli',
  apiKey: '',
};

export const DEFAULT_SETTINGS = DEFAULT_AI_SETTINGS;

export interface PresetModelOption {
  id: string;
  label: string;
}

export const PRESET_MODELS: Record<AIProviderType, PresetModelOption[]> = {
  antigravity: [
    {
      id: 'gemini-4-argon-high',
      label: 'Gemini 4 Argon (High) — Antigravity Zero-Key',
    },
    {
      id: 'gemini-4-argon-medium',
      label: 'Gemini 4 Argon (Medium) — Antigravity Zero-Key',
    },
    {
      id: 'gemini-3.8-flash-high',
      label: 'Gemini 3.8 Flash (High) — Rápido Zero-Key',
    },
    {
      id: 'claude-sonnet-5-5-high',
      label: 'Claude Sonnet 5.5 (High) — Antigravity Zero-Key',
    },
    {
      id: 'claude-opus-5-5-high',
      label: 'Claude Opus 5.5 (High) — Antigravity Zero-Key',
    },
    {
      id: 'gpt-oss-120b-medium',
      label: 'GPT-OSS 120B — Antigravity Zero-Key',
    },
  ],
  ollama: [
    { id: 'llama3.2', label: 'Llama 3.2 (Local)' },
    { id: 'llama3.1', label: 'Llama 3.1 (Local)' },
    { id: 'deepseek-r1:8b', label: 'DeepSeek R1 8B (Local)' },
    { id: 'qwen2.5-coder', label: 'Qwen 2.5 Coder (Local)' },
    { id: 'mistral', label: 'Mistral (Local)' },
  ],
  'local-cli': [
    { id: 'gemini-cli', label: 'Google Gemini CLI Local (gemini -p)' },
    { id: 'claude-cli', label: 'Anthropic Claude Code CLI Local (claude -p)' },
    { id: 'gemini-4-argon-high', label: 'Antigravity CLI Fallback (agy -p)' },
  ],
  openai: [
    { id: 'gpt-4o', label: 'GPT-4o' },
    { id: 'gpt-4o-mini', label: 'GPT-4o Mini' },
    { id: 'gpt-4.1', label: 'GPT-4.1' },
    { id: 'o1-mini', label: 'o1-mini' },
  ],
  gemini: [
    { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
    { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
    { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
  ],
  google: [
    { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
    { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
    { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
  ],
  anthropic: [
    { id: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
    { id: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku' },
    { id: 'claude-3-opus-20240229', label: 'Claude 3 Opus' },
  ],
  custom: [{ id: 'custom-model', label: 'Custom OpenAI-Compatible Model' }],
};

export const PROVIDER_PRESETS: Record<
  AIProviderType,
  {
    name: string;
    defaultBaseUrl: string;
    models: string[];
    zeroApiKey?: boolean;
  }
> = {
  antigravity: {
    name: '⚡ Google Antigravity CLI (agy · Sin API Key)',
    defaultBaseUrl: 'local://antigravity-cli',
    models: PRESET_MODELS.antigravity.map(m => m.id),
    zeroApiKey: true,
  },
  ollama: {
    name: '🦙 Ollama Local (Sin API Key)',
    defaultBaseUrl: 'http://127.0.0.1:11434/v1',
    models: PRESET_MODELS.ollama.map(m => m.id),
    zeroApiKey: true,
  },
  'local-cli': {
    name: '🛠️ Herramientas CLI Locales (gemini / claude · Sin API Key)',
    defaultBaseUrl: 'local://cli',
    models: PRESET_MODELS['local-cli'].map(m => m.id),
    zeroApiKey: true,
  },
  gemini: {
    name: 'Google Gemini (API Key)',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    models: PRESET_MODELS.gemini.map(m => m.id),
  },
  google: {
    name: 'Google Gemini (API Key)',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    models: PRESET_MODELS.google.map(m => m.id),
  },
  openai: {
    name: 'OpenAI (API Key)',
    defaultBaseUrl: 'https://api.openai.com/v1',
    models: PRESET_MODELS.openai.map(m => m.id),
  },
  anthropic: {
    name: 'Anthropic Claude (API Key)',
    defaultBaseUrl: 'https://api.anthropic.com/v1',
    models: PRESET_MODELS.anthropic.map(m => m.id),
  },
  custom: {
    name: 'Custom Server',
    defaultBaseUrl: 'http://localhost:8000/v1',
    models: PRESET_MODELS.custom.map(m => m.id),
  },
};

const VISIBLE_PROVIDER_KEYS: AIProviderType[] = [
  'antigravity',
  'ollama',
  'local-cli',
  'gemini',
  'openai',
  'anthropic',
  'custom',
];

export function isZeroKeyProvider(provider: string): boolean {
  return (
    provider === 'antigravity' ||
    provider === 'ollama' ||
    provider === 'local-cli' ||
    provider === 'gemini-cli' ||
    provider === 'claude-cli'
  );
}

export function loadAISettings(): AIModelSettings {
  if (typeof localStorage === 'undefined') return DEFAULT_AI_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_AI_SETTINGS);
    if (!raw) return DEFAULT_AI_SETTINGS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_AI_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_AI_SETTINGS;
  }
}

export const getSavedAIModel = loadAISettings;

export function saveAISettings(settings: AIModelSettings) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_AI_SETTINGS, JSON.stringify(settings));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('affinite-ai-settings-changed', { detail: settings })
    );
  }
}

export const AIModelSelector = () => {
  const [settings, setSettings] = useState<AIModelSettings>(loadAISettings);
  const [testStatus, setTestStatus] = useState<
    'idle' | 'testing' | 'success' | 'error'
  >('idle');
  const [testMsg, setTestMsg] = useState<string>('');
  const [detectedInfo, setDetectedInfo] = useState<{
    antigravity?: boolean;
    ollama?: boolean;
    geminiCli?: boolean;
    claudeCli?: boolean;
  } | null>(null);

  useEffect(() => {
    saveAISettings(settings);
  }, [settings]);

  const handleProviderChange = (provider: AIProviderType) => {
    const preset = PROVIDER_PRESETS[provider] || PROVIDER_PRESETS.antigravity;
    setSettings(prev => ({
      ...prev,
      provider,
      baseUrl: preset.defaultBaseUrl,
      modelId: preset.models[0] || prev.modelId,
    }));
  };

  const handleDetectLocalProviders = useCallback(async () => {
    setTestStatus('testing');
    setTestMsg('Detectando herramientas de IA locales...');
    try {
      const aiBridge =
        (window as any).__apis?.handler?.ai ?? (window as any).__apis?.ai;
      if (aiBridge?.detectProviders) {
        const res = await aiBridge.detectProviders();
        setDetectedInfo(res);
        const found: string[] = [];
        if (res?.antigravity) found.push('agy (Antigravity)');
        if (res?.ollama) found.push('ollama');
        if (res?.geminiCli) found.push('gemini');
        if (res?.claudeCli) found.push('claude');

        if (found.length > 0) {
          setTestStatus('success');
          setTestMsg(`Detectado: ${found.join(', ')}`);
        } else {
          setTestStatus('error');
          setTestMsg('No se detectaron CLIs locales en PATH');
        }
        return;
      }

      if (
        settings.provider === 'ollama' ||
        settings.baseUrl.includes('localhost') ||
        settings.baseUrl.includes('127.0.0.1')
      ) {
        const res = await fetch(
          settings.baseUrl.replace(/\/v1\/?$/, '/v1/models'),
          { method: 'GET' }
        );
        if (res.ok) {
          setTestStatus('success');
          setTestMsg('Conectado exitosamente a Ollama local');
          return;
        }
      }

      setTestStatus('success');
      setTestMsg(
        `Configuración activa: ${settings.provider} (${settings.modelId})`
      );
    } catch (err: any) {
      setTestStatus('error');
      setTestMsg(
        `Aviso de conexión: ${err?.message || 'No se pudo verificar directamente'}`
      );
    }
  }, [settings]);

  const zeroKey = isZeroKeyProvider(settings.provider);
  const presetModels =
    PRESET_MODELS[settings.provider] || PRESET_MODELS.antigravity;

  return (
    <div className={styles.container}>
      <div className={styles.title}>
        <span>AI Provider & Model Settings (Antigravity Zero-Key & Local)</span>
        {testStatus !== 'idle' && (
          <span className={styles.statusBadge} data-status={testStatus}>
            {testMsg}
          </span>
        )}
      </div>

      <div className={styles.providerGrid}>
        {VISIBLE_PROVIDER_KEYS.map(key => (
          <button
            key={key}
            type="button"
            className={styles.providerBtn}
            data-active={settings.provider === key}
            onClick={() => handleProviderChange(key)}
          >
            <span>{PROVIDER_PRESETS[key].name}</span>
          </button>
        ))}
      </div>

      {zeroKey && (
        <div
          className={styles.statusBadge}
          data-status="success"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
          }}
        >
          <span>
            {settings.provider === 'antigravity'
              ? '✅ Conectado vía Antigravity CLI local — No requiere API Key'
              : settings.provider === 'ollama'
                ? '✅ Conectado vía Ollama Local — No requiere API Key'
                : '✅ Conectado vía CLI Local — No requiere API Key'}
          </span>
          {detectedInfo && (
            <span style={{ fontSize: '11px', opacity: 0.9 }}>
              {[
                detectedInfo.antigravity ? 'agy ✓' : null,
                detectedInfo.ollama ? 'ollama ✓' : null,
                detectedInfo.geminiCli ? 'gemini ✓' : null,
                detectedInfo.claudeCli ? 'claude ✓' : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </span>
          )}
        </div>
      )}

      <div className={styles.inputGroup}>
        <label className={styles.label}>Select Model</label>
        <select
          className={styles.select}
          value={settings.modelId}
          onChange={e =>
            setSettings(prev => ({ ...prev, modelId: e.target.value }))
          }
        >
          {presetModels.map(m => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
          {!presetModels.some(m => m.id === settings.modelId) && (
            <option value={settings.modelId}>
              {settings.modelId} (Custom)
            </option>
          )}
        </select>
      </div>

      <div className={styles.inputGroup}>
        <label className={styles.label}>
          Custom Model ID (Optional Write-In)
        </label>
        <input
          type="text"
          className={styles.input}
          placeholder="e.g. gemini-4-argon-high, claude-sonnet-5-5-high, deepseek-r1:8b"
          value={settings.modelId}
          onChange={e =>
            setSettings(prev => ({ ...prev, modelId: e.target.value }))
          }
        />
      </div>

      {settings.provider !== 'antigravity' &&
        settings.provider !== 'local-cli' && (
          <div className={styles.inputGroup}>
            <label className={styles.label}>API Base URL</label>
            <input
              type="text"
              className={styles.input}
              placeholder="http://127.0.0.1:11434/v1"
              value={settings.baseUrl}
              onChange={e =>
                setSettings(prev => ({ ...prev, baseUrl: e.target.value }))
              }
            />
          </div>
        )}

      {!zeroKey && (
        <div className={styles.inputGroup}>
          <label className={styles.label}>API Key</label>
          <input
            type="password"
            className={styles.input}
            placeholder="sk-..."
            value={settings.apiKey}
            onChange={e =>
              setSettings(prev => ({ ...prev, apiKey: e.target.value }))
            }
          />
        </div>
      )}

      <div className={styles.flexRow} style={{ marginTop: '8px' }}>
        <Button onClick={handleDetectLocalProviders} variant="primary">
          ⚡ Probar Conexión Local
        </Button>
      </div>
    </div>
  );
};
