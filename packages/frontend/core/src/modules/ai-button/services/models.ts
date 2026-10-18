import { getPromptModelsQuery, SubscriptionStatus } from '@affine/graphql';
import {
  createSignalFromObservable,
  type Signal,
} from '@blocksuite/affine/shared/utils';
import { signal } from '@preact/signals-core';
import { LiveData, Service } from '@toeverything/infra';

import { isLocalAIProvider } from '../../../blocksuite/ai/provider/copilot-client';
import {
  loadAISettings,
  PRESET_MODELS,
  saveAISettings,
} from '../../../desktop/dialogs/setting/account-setting/ai-model-selector';
import type { GraphQLService, SubscriptionService } from '../../cloud';
import type { GlobalStateService } from '../../storage';

const AI_MODEL_ID_KEY = 'AIModelId';

export interface AIModel {
  name: string;
  id: string;
  version: string;
  category: string;
  isPro: boolean;
  isDefault: boolean;
}

function getLocalFallbackModels(): AIModel[] {
  const settings = loadAISettings();
  const presets =
    PRESET_MODELS[settings.provider] || PRESET_MODELS.antigravity;
  return presets.map((m, idx) => ({
    name: m.label,
    id: m.id,
    version: m.label,
    category: settings.provider === 'ollama' ? 'Ollama' : 'Antigravity',
    isPro: false,
    isDefault: idx === 0 || m.id === settings.modelId,
  }));
}

export class AIModelService extends Service {
  modelId: Signal<string | undefined>;

  models: Signal<AIModel[]> = signal(getLocalFallbackModels());

  private readonly modelId$ = LiveData.from(
    this.globalStateService.globalState.watch<string>(AI_MODEL_ID_KEY),
    loadAISettings().modelId
  );

  constructor(
    private readonly globalStateService: GlobalStateService,
    private readonly gqlService: GraphQLService,
    private readonly subscriptionService: SubscriptionService
  ) {
    super();

    const { signal: modelId, cleanup } = createSignalFromObservable<
      string | undefined
    >(this.modelId$, loadAISettings().modelId);
    this.modelId = modelId;
    this.disposables.push(cleanup);

    if (typeof window !== 'undefined') {
      const onSettingsChange = (e: Event) => {
        const detail = (e as CustomEvent).detail;
        if (detail?.modelId) {
          this.models.value = getLocalFallbackModels();
          this.globalStateService.globalState.set(
            AI_MODEL_ID_KEY,
            detail.modelId
          );
        }
      };
      window.addEventListener('affinite-ai-settings-changed', onSettingsChange);
      this.disposables.push(() =>
        window.removeEventListener(
          'affinite-ai-settings-changed',
          onSettingsChange
        )
      );
    }

    this.init().catch(err => {
      console.error(err);
    });
  }

  resetModel = () => {
    this.globalStateService.globalState.set(
      AI_MODEL_ID_KEY,
      loadAISettings().modelId
    );
  };

  setModel = (modelId: string) => {
    if (isLocalAIProvider()) {
      const current = loadAISettings();
      saveAISettings({ ...current, modelId });
      this.globalStateService.globalState.set(AI_MODEL_ID_KEY, modelId);
      return;
    }
    const isSubscribed =
      this.subscriptionService.subscription.ai$.value?.status ===
      SubscriptionStatus.Active;
    const model = this.models.value.find(model => model.id === modelId);
    if (!isSubscribed && model?.isPro) {
      return;
    }
    this.globalStateService.globalState.set(AI_MODEL_ID_KEY, modelId);
  };

  private readonly init = async () => {
    await this.initModels();

    // subscribe to ai purchase status
    const sub = this.subscriptionService.subscription.ai$.subscribe(
      subscription => {
        if (isLocalAIProvider()) return;
        const isSubscribed = subscription?.status === SubscriptionStatus.Active;
        const model = this.models.value.find(
          model => model.id === this.modelId.value
        );
        if (!isSubscribed && model?.isPro) {
          this.resetModel();
        }
      }
    );
    this.disposables.push(() => sub.unsubscribe());
  };

  private readonly initModels = async (prompt?: string) => {
    if (isLocalAIProvider()) {
      this.models.value = getLocalFallbackModels();
      return;
    }
    try {
      const promptName = prompt || 'Chat With AFFiNE AI';
      const models = await this.getModelsByPrompt(promptName);
      if (models) {
        const { defaultModel, optionalModels, proModels } = models;
        this.models.value = optionalModels.map(model => {
          const [category] = model.name.split(' ');
          const version = model.name.slice(category.length + 1);
          return {
            name: model.name,
            id: model.id,
            version,
            category,
            isPro: proModels.some(proModel => proModel.id === model.id),
            isDefault: model.id === defaultModel,
          };
        });
      }
    } catch {
      this.models.value = getLocalFallbackModels();
    }
  };

  private readonly getModelsByPrompt = async (promptName: string) => {
    return this.gqlService
      .gql({
        query: getPromptModelsQuery,
        variables: { promptName },
      })
      .then(res => res.currentUser?.copilot?.models);
  };
}
