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

            // Get current message counts before sending
            const currentMessages = state.messages;
            const initialMessageCount = currentMessages.length;
            const initialAssistantCount = currentMessages.filter(m => m.role === 'assistant').length;

            console.log('[Chat] Before send - Total messages:', initialMessageCount, 'Assistant:', initialAssistantCount);

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
                // Generate AI response (this creates the user message on the server)
                await messagesApi.generateMessage({
                    message: content,
                    model_id: modelId,
                    conversation_id: conversationId,
                });

                // Start polling with initial counts
                this.startPolling(conversationId, initialMessageCount, initialAssistantCount);
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

        startPolling(conversationId: string, initialMessageCount: number, initialAssistantCount: number) {
            // Clear any existing interval
            if (pollInterval) {
                clearInterval(pollInterval);
            }

            console.log('[Chat] Starting polling for conversation:', conversationId, 'Initial counts:', { total: initialMessageCount, assistant: initialAssistantCount });

            let pollCount = 0;
            const maxPolls = 120; // Maximum 60 seconds of polling (120 * 500ms)

            // Poll every 500ms
            pollInterval = setInterval(async () => {
                pollCount++;

                try {
                    // Reload messages to get the latest
                    const messages = await messagesApi.getMessages(conversationId);

                    const assistantMessages = messages.filter(m => m.role === 'assistant');
                    const currentAssistantCount = assistantMessages.length;

                    console.log(`[Chat] Poll #${pollCount}: Total ${messages.length}, Assistant ${currentAssistantCount} (initial: ${initialAssistantCount})`);

                    // Update state with latest messages
                    update(state => ({
                        ...state,
                        messages,
                    }));

                    // Stop polling if we have NEW assistant messages with actual content
                    // Messages are created before content is generated, so we need to check
                    // that the latest assistant message has non-empty content
                    const hasNewAssistantMessages = currentAssistantCount > initialAssistantCount;
                    const latestAssistantMessage = assistantMessages[assistantMessages.length - 1];
                    const hasContent = latestAssistantMessage &&
                        (latestAssistantMessage.content?.trim() || latestAssistantMessage.contentHtml?.trim());

                    if (hasNewAssistantMessages && hasContent) {
                        console.log('[Chat] New assistant message with content detected! Stopping polling.');
                        update(state => ({ ...state, generating: false }));
                        if (pollInterval) {
                            clearInterval(pollInterval);
                            pollInterval = null;
                        }
                        return;
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
