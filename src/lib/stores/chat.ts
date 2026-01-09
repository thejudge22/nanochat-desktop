import { writable, derived } from 'svelte/store';
import type { Message, Role } from '../api/types';
import * as messagesApi from '../api/messages';
import * as conversationsApi from '../api/conversations';
import { get } from 'svelte/store';

interface ChatState {
    conversationId: string | null;
    messages: Message[];
    loading: boolean;
    generating: boolean;
    error: string | null;
}

const initialState: ChatState = {
    conversationId: null,
    messages: [],
    loading: false,
    generating: false,
    error: null,
};

function createChatStore() {
    const { subscribe, set, update } = writable<ChatState>(initialState);

    // Polling interval reference
    let pollInterval: ReturnType<typeof setInterval> | null = null;

    return {
        subscribe,

        setConversation(conversationId: string | null) {
            // Clear any existing polling
            if (pollInterval) {
                clearInterval(pollInterval);
                pollInterval = null;
            }

            update(state => ({
                ...state,
                conversationId,
                messages: [],
                loading: false,
                generating: false,
                error: null,
            }));

            // Load messages if we have a conversation
            if (conversationId) {
                this.loadMessages(conversationId);
            }
        },

        async loadMessages(conversationId: string) {
            update(state => ({ ...state, loading: true, error: null }));

            try {
                const messages = await messagesApi.getMessages(conversationId);
                update(state => ({
                    ...state,
                    conversationId,
                    messages,
                    loading: false,
                }));
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Failed to load messages';
                update(state => ({
                    ...state,
                    loading: false,
                    error: errorMessage
                }));
                throw error;
            }
        },

        async sendMessage(content: string, modelId: string) {
            const state = get({ subscribe });
            const conversationId = state.conversationId;

            if (!conversationId) {
                throw new Error('No active conversation');
            }

            // Clear any existing polling
            if (pollInterval) {
                clearInterval(pollInterval);
                pollInterval = null;
            }

            update(state => ({
                ...state,
                generating: true,
                error: null,
            }));

            try {
                // Create the user message first
                const userMessage = await messagesApi.createMessage(
                    conversationId,
                    'user',
                    content,
                    `<p>${content}</p>`
                );

                // Add user message to store immediately
                update(state => ({
                    ...state,
                    messages: [...state.messages, userMessage],
                }));

                // Generate AI response
                await messagesApi.generateMessage({
                    message: content,
                    model_id: modelId,
                    conversation_id: conversationId,
                });

                // Start polling for the assistant's response
                this.startPolling(conversationId);
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
                update(state => ({
                    ...state,
                    generating: false,
                    error: errorMessage
                }));
                throw error;
            }
        },

        startPolling(conversationId: string) {
            // Clear any existing interval
            if (pollInterval) {
                clearInterval(pollInterval);
            }

            console.log('[Chat] Starting polling for conversation:', conversationId);

            // Track message count to detect new messages
            let previousMessageCount = 0;
            let pollCount = 0;
            const maxPolls = 120; // Maximum 60 seconds of polling (120 * 500ms)

            // Poll every 500ms
            pollInterval = setInterval(async () => {
                pollCount++;

                try {
                    // Reload messages to get the latest
                    const messages = await messagesApi.getMessages(conversationId);

                    console.log(`[Chat] Poll #${pollCount}: Fetched ${messages.length} messages (previous: ${previousMessageCount})`);

                    // Check if new messages have arrived
                    const hasNewMessages = messages.length > previousMessageCount;

                    if (hasNewMessages) {
                        console.log('[Chat] New messages detected!');
                    }

                    // Check for assistant messages
                    const assistantMessages = messages.filter(m => m.role === 'assistant');
                    console.log(`[Chat] Assistant messages: ${assistantMessages.length}`);

                    // Update message count for next poll
                    previousMessageCount = messages.length;

                    // Get conversation to check generating status
                    const conversation = await conversationsApi.getConversation(conversationId);
                    console.log(`[Chat] Conversation generating flag: ${conversation.generating}`);

                    // Stop polling if we have an assistant response or generation is complete
                    const generationComplete = !conversation.generating || assistantMessages.length > 0;

                    update(state => ({
                        ...state,
                        messages,
                        generating: !generationComplete,
                    }));

                    console.log(`[Chat] Generation complete: ${generationComplete}`);

                    // Stop polling when generation is complete
                    if (generationComplete) {
                        console.log('[Chat] Stopping polling - generation complete');
                        if (pollInterval) {
                            clearInterval(pollInterval);
                            pollInterval = null;
                        }
                    }

                    // Safety: stop polling after max attempts
                    if (pollCount >= maxPolls) {
                        console.log('[Chat] Stopping polling - max attempts reached');
                        if (pollInterval) {
                            clearInterval(pollInterval);
                            pollInterval = null;
                        }
                        update(state => ({ ...state, generating: false }));
                    }
                } catch (error) {
                    console.error('[Chat] Polling error:', error);
                    // Don't stop polling on transient errors
                }
            }, 500);
        },

        stopPolling() {
            if (pollInterval) {
                clearInterval(pollInterval);
                pollInterval = null;
            }
            update(state => ({ ...state, generating: false }));
        },

        clearError() {
            update(state => ({ ...state, error: null }));
        },

        setError(message: string) {
            update(state => ({ ...state, error: message }));
        },

        reset() {
            if (pollInterval) {
                clearInterval(pollInterval);
                pollInterval = null;
            }
            set(initialState);
        }
    };
}

export const chatStore = createChatStore();

// Derived store for checking if we can send messages
export const canSendMessage = derived(
    chatStore,
    $store => $store.conversationId !== null && !$store.generating
);
