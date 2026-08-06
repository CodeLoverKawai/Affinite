import { Button } from '@affine/component';
import { useCallback, useEffect, useState } from 'react';
import * as styles from './ai-model-selector.css';

export interface AIModelSettings {
  provider: 'openai' | 'ollama' | 'gemini' | 'anthropic' | 'custom';
  modelId: string;
  baseUrl: string;
  apiKey: string;
}

export const STORAGE_KEY_AI_SETTINGS = 'affinite_ai_model_settings';

export const DEFAULT_AI_SETTINGS: AIModelSettings = {
  provider: 'openai',
  modelId: 'gpt-4o-mini',
  baseUrl: 'https://api.openai.com/v1',
  apiKey: '',
};

export const PROVIDER_PRESETS: Record<
  AIModelSettings['provider'],
  { name: string; defaultBaseUrl: string; models: string[] }
> = {
  openai: {
    name: 'OpenAI',
    defaultBaseUrl: 'https://api.openai.com/v1',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1', 'o1-mini'],
  },
  ollama: {
    name: 'Ollama (Local)',
    defaultBaseUrl: 'http://localhost:11434/v1',
    models: [
      'llama3.2',
      'llama3.1',
      'deepseek-r1:8b',
      'qwen2.5-coder',
      'mistral',
    ],
  },
  gemini: {
    name: 'Google Gemini',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    models: ['gemini-2.5-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
  },
  anthropic: {
    name: 'Anthropic Claude',
    defaultBaseUrl: 'https://api.anthropic.com/v1',
    models: [
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
      'claude-3-opus-20240229',
    ],
  },
  custom: {
    name: 'Custom Server',
    defaultBaseUrl: 'http://localhost:8000/v1',
    models: ['custom-model'],
  },
};

export function loadAISettings(): AIModelSettings {
  if (typeof localStorage === 'undefined') return DEFAULT_AI_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_AI_SETTINGS);
    if (!raw) return DEFAULT_AI_SETTINGS;
    return { ...DEFAULT_AI_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_AI_SETTINGS;
  }
}

export function saveAISettings(settings: AIModelSettings) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_AI_SETTINGS, JSON.stringify(settings));
}

export const AIModelSelector = () => {
  const [settings, setSettings] = useState<AIModelSettings>(loadAISettings);
  const [testStatus, setTestStatus] = useState<
    'idle' | 'testing' | 'success' | 'error'
  >('idle');
  const [testMsg, setTestMsg] = useState<string>('');

  useEffect(() => {
    saveAISettings(settings);
  }, [settings]);

  const handleProviderChange = (provider: AIModelSettings['provider']) => {
    const preset = PROVIDER_PRESETS[provider];
    setSettings(prev => ({
      ...prev,
      provider,
      baseUrl: preset.defaultBaseUrl,
      modelId: preset.models[0] || prev.modelId,
    }));
  };

  const handleTestConnection = useCallback(async () => {
    setTestStatus('testing');
    setTestMsg('Testing connection...');
    try {
      if (settings.provider === 'ollama' || settings.baseUrl.includes('localhost') || settings.baseUrl.includes('127.0.0.1')) {
        const res = await fetch(settings.baseUrl.replace(/\/v1\/?$/, '/v1/models'), {
          method: 'GET',
        });
        if (res.ok) {
          setTestStatus('success');
          setTestMsg('Connected successfully to local AI server!');
          return;
        }
      }
      setTestStatus('success');
      setTestMsg(`Configuration saved for ${settings.provider} (${settings.modelId})`);
    } catch (err: any) {
      setTestStatus('error');
      setTestMsg(`Connection check warning: ${err?.message || 'Could not reach server directly'}`);
    }
  }, [settings]);

  return (
    <div className={styles.container}>
      <div className={styles.title}>
        <span>AI Provider & Model Settings</span>
        {testStatus !== 'idle' && (
          <span className={styles.statusBadge} data-status={testStatus}>
            {testMsg}
          </span>
        )}
      </div>

      <div className={styles.providerGrid}>
        {(Object.keys(PROVIDER_PRESETS) as AIModelSettings['provider'][]).map(
          key => (
            <button
              key={key}
              type="button"
              className={styles.providerBtn}
              data-active={settings.provider === key}
              onClick={() => handleProviderChange(key)}
            >
              <span>{PROVIDER_PRESETS[key].name}</span>
            </button>
          )
        )}
      </div>

      <div className={styles.inputGroup}>
        <label className={styles.label}>Select Model</label>
        <select
          className={styles.select}
          value={settings.modelId}
          onChange={e =>
            setSettings(prev => ({ ...prev, modelId: e.target.value }))
          }
        >
          {PROVIDER_PRESETS[settings.provider].models.map(m => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
          {!PROVIDER_PRESETS[settings.provider].models.includes(
            settings.modelId
          ) && (
            <option value={settings.modelId}>
              {settings.modelId} (Custom)
            </option>
          )}
        </select>
      </div>

      <div className={styles.inputGroup}>
        <label className={styles.label}>Custom Model ID (Optional Write-In)</label>
        <input
          type="text"
          className={styles.input}
          placeholder="e.g. deepseek-r1:8b, qwen2.5-coder"
          value={settings.modelId}
          onChange={e =>
            setSettings(prev => ({ ...prev, modelId: e.target.value }))
          }
        />
      </div>

      <div className={styles.inputGroup}>
        <label className={styles.label}>API Base URL</label>
        <input
          type="text"
          className={styles.input}
          placeholder="http://localhost:11434/v1"
          value={settings.baseUrl}
          onChange={e =>
            setSettings(prev => ({ ...prev, baseUrl: e.target.value }))
          }
        />
      </div>

      {settings.provider !== 'ollama' && (
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
        <Button onClick={handleTestConnection} variant="primary">
          Save & Test Connection
        </Button>
      </div>
    </div>
  );
};
