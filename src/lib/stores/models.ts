import { writable, derived } from 'svelte/store';
import type { UserModel } from '../api/types';
import * as modelsApi from '../api/models';

interface ModelsState {
    models: UserModel[];
    selectedModelId: string | null;
    loading: boolean;
    error: string | null;
}

const initialState: ModelsState = {
    models: [],
    selectedModelId: null,
    loading: false,
    error: null,
};

function createModelsStore() {
    const { subscribe, set, update } = writable<ModelsState>(initialState);

    return {
        subscribe,

        async loadModels() {
            update(state => ({ ...state, loading: true, error: null }));

            try {
                const models = await modelsApi.getUserModels();

                // Filter to only enabled models
                const enabledModels = models.filter(m => m.enabled);

                // Get the first enabled model, preferring pinned models
                const pinnedModel = enabledModels.find(m => m.pinned);
                const defaultModel = pinnedModel || enabledModels[0];

                update(state => ({
                    ...state,
                    models: enabledModels,
                    selectedModelId: defaultModel?.modelId || null,
                    loading: false,
                }));
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Failed to load models';
                update(state => ({
                    ...state,
                    loading: false,
                    error: errorMessage
                }));
                throw error;
            }
        },

        selectModel(modelId: string) {
            update(state => ({ ...state, selectedModelId: modelId }));
        },

        clearError() {
            update(state => ({ ...state, error: null }));
        },

        reset() {
            set(initialState);
        }
    };
}

export const modelsStore = createModelsStore();

// Derived store for the currently selected model
export const selectedModel = derived(
    modelsStore,
    $store => $store.models.find(m => m.modelId === $store.selectedModelId) || null
);
