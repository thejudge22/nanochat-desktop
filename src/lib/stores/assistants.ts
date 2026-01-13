import { writable } from 'svelte/store';
import { listAssistants } from '../api/assistants';
import type { Assistant } from '../api/types';

export const assistants = writable<Assistant[]>([]);
export const selectedAssistantId = writable<string | null>(null);

export async function loadAssistants() {
  try {
    const data = await listAssistants();
    assistants.set(data);
    
    // Automatically select the default assistant if one exists
    const defaultAssistant = data.find(assistant => assistant.isDefault);
    if (defaultAssistant) {
      selectedAssistantId.set(defaultAssistant.id);
    } else {
      selectedAssistantId.set(null);
    }
  } catch (error) {
    console.error('Failed to load assistants:', error);
  }
}