import { writable, derived } from 'svelte/store';
import type { Message, Role } from '../api/types';
import * as messagesApi from '../api/messages';
import * as conversationsApi from '../api/conversations';
import { conversationsStore } from './conversations';
import { get } from 'svelte/store';
import { selectedAssistantId } from './assistants';

// Callback type for when a new conversation is created
export type NewConversationCallback = (conversationId: string) => void;

interface ChatState {
    conversationId: string | null;
    messages: Message[];
    loading: boolean;
    generating: boolean;
    error: string | null;
    onNewConversation?: NewConversationCallback;
    initializing: boolean;  // Flag to prevent reactive reload during new conversation creation
}

const initialState: ChatState = {
    conversationId: null,
    messages: [],
    loading: false,
    generating: false,
    error: null,
    initializing: false,
};

function createChatStore() {
    const { subscribe, set, update } = writable<ChatState>(initialState);

    // Polling reference
    let pollTimeout: ReturnType<typeof setTimeout> | null = null;

    return {
        subscribe,

        setNewConversationCallback(callback: NewConversationCallback) {
            update(state => ({ ...state, onNewConversation: callback }));
        },

        setConversation(conversationId: string | null) {
            const currentState = get({ subscribe });

            // Skip reload if we're initializing a new conversation (callback is handling it)
            if (currentState.initializing && conversationId === currentState.conversationId) {
                return;
            }

            // Clear any existing polling
            if (pollTimeout) {
                clearTimeout(pollTimeout);
                pollTimeout = null;
            }

            update(state => ({
                ...state,
                conversationId,
                messages: [],
                loading: false,
                generating: false,
                error: null,
                initializing: false,  // Clear initializing flag when conversation is set
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
            let conversationId = state.conversationId;
            const assistantId = get(selectedAssistantId) ?? undefined;

            // Clear any existing polling
            if (pollTimeout) {
                clearTimeout(pollTimeout);
                pollTimeout = null;
            }

            update(state => ({
                ...state,
                generating: true,
                error: null,
            }));

            try {
                // If no conversation exists, use generateMessage to create everything in one call
                // The generate-message endpoint handles: conversation creation, user message, AI response, and title generation
                if (!conversationId) {
                    // generateMessage with no conversation_id will create a new conversation
                    const result = await messagesApi.generateMessage({
                        message: content,
                        model_id: modelId,
                        assistant_id: assistantId,
                    });

                    conversationId = result.conversation_id;

                    // Set initializing flag BEFORE setting conversationId to prevent reactive reload
                    update(state => ({
                        ...state,
                        initializing: true,
                        conversationId,
                    }));

                    // Notify callback that a new conversation was created
                    const currentState = get({ subscribe });
                    if (currentState.onNewConversation) {
                        currentState.onNewConversation(conversationId);
                    }

                    // Get initial messages after creating conversation and update state
                    const messages = await messagesApi.getMessages(conversationId);

                    // Update state with initial messages so user can see their message
                    update(state => ({
                        ...state,
                        messages,
                    }));

                    // Start polling for AI response (server already started generation)
                    this.startPolling(conversationId);
                } else {
                    // Generate AI response (this creates the user message on the server)
                    const result = await messagesApi.generateMessage({
                        message: content,
                        model_id: modelId,
                        conversation_id: conversationId,
                        assistant_id: assistantId,
                    });

                    // Start polling for AI response
                    this.startPolling(conversationId);
                }
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
            // Clear any existing polling
            if (pollTimeout) {
                clearTimeout(pollTimeout);
            }

            let pollCount = 0;
            const maxPolls = 180; // Maximum 90 seconds of polling (180 * 500ms)

            const poll = async () => {
                pollCount++;

                try {
                    // Fetch both messages and conversation state in parallel
                    const [messages, conversation] = await Promise.all([
                        messagesApi.getMessages(conversationId),
                        conversationsApi.getConversation(conversationId)
                    ]);

                    const assistantMessages = messages.filter(m => m.role === 'assistant');
                    const lastAssistantMessage = assistantMessages[assistantMessages.length - 1];
                    const hasContent = lastAssistantMessage && (lastAssistantMessage.content || lastAssistantMessage.contentHtml);

                    // Update chat state with latest messages
                    update(state => ({
                        ...state,
                        messages,
                    }));

                    // Update the sidebar with the latest conversation metadata (title, generating status)
                    conversationsStore.updateConversation(conversation);

                    // Stop polling when server says generation is complete AND we have message content
                    const serverFinished = !conversation.generating && hasContent;

                    // Stop polling conditions:
                    // 1. Server says generation is complete AND we have message content
                    // 2. Max polls reached (safety timeout)
                    const shouldStop = serverFinished || pollCount >= maxPolls;

                    if (shouldStop) {
                        if (pollCount >= maxPolls) {
                            console.warn('[Chat] Stopping polling - max attempts reached');
                        }

                        update(state => ({ ...state, generating: false, initializing: false }));
                        pollTimeout = null;

                        // Ensure conversation list is updated with the final state
                        await conversationsStore.loadConversations();
                        
                        // Update with the latest conversation data
                        conversationsStore.updateConversation(conversation);
                        
                        return;
                    }
                } catch (error) {
                    console.error('[Chat] Polling error:', error);
                    // Don't stop polling on transient errors, but log them
                }

                // Schedule the next poll only after the current request has completed
                if (pollTimeout !== null) {
                    pollTimeout = setTimeout(poll, 500);
                }
            };

            // Start the first poll
            pollTimeout = setTimeout(poll, 500);
        },

        stopPolling() {
            if (pollTimeout) {
                clearTimeout(pollTimeout);
                pollTimeout = null;
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
            if (pollTimeout) {
                clearTimeout(pollTimeout);
                pollTimeout = null;
            }
            set(initialState);
        },

        // Method to manually clear the initializing flag (e.g., if callback fails)
        clearInitializing() {
            update(state => ({ ...state, initializing: false }));
        }
    };
}

export const chatStore = createChatStore();

// Derived store for checking if we can send messages
export const canSendMessage = derived(
    chatStore,
    $store => $store.conversationId !== null && !$store.generating
);
