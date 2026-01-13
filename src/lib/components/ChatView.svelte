<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte';
  import { derived } from 'svelte/store';
  import { chatStore } from '../stores/chat';
  import { conversationsStore, selectedConversation } from '../stores/conversations';
  import { modelsStore } from '../stores/models';
  import { assistants, selectedAssistantId } from '../stores/assistants';
  import * as conversationsApi from '../api/conversations';
  import ChatMessage from './ChatMessage.svelte';
  import ChatInput from './ChatInput.svelte';
  import ModelSelector from './ModelSelector.svelte';

  const selectedAssistant = derived(
    [assistants, selectedAssistantId],
    ([$assistants, $selectedAssistantId]) => {
      if (!$selectedAssistantId) return null;
      return $assistants.find(a => a.id === $selectedAssistantId) ?? null;
    }
  );

  let messagesContainer: HTMLElement;
  let shouldAutoScroll = true;

  // Watch for changes in selected conversation
  $: if ($selectedConversation?.id !== $chatStore.conversationId) {
    if ($selectedConversation?.id) {
      chatStore.setConversation($selectedConversation.id);
    } else if (!$conversationsStore.isNewChatMode) {
      // Only clear the conversation if we're not in new chat mode
      chatStore.setConversation(null);
    }
  }

  // Auto-scroll to bottom when new messages arrive
  $: if ($chatStore.messages.length > 0) {
    scrollToBottom();
  }

  function scrollToBottom() {
    if (shouldAutoScroll && messagesContainer) {
      const scrollTimeout = setTimeout(async () => {
        await tick();
        if (messagesContainer) {
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
      }, 100);
      return () => clearTimeout(scrollTimeout);
    }
  }

  function handleScroll() {
    if (!messagesContainer) return;

    const { scrollTop, scrollHeight, clientHeight } = messagesContainer;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;

    shouldAutoScroll = isAtBottom;
  }

  onMount(() => {
    // Load available models
    modelsStore.loadModels().catch(err => {
      console.error('Failed to load models:', err);
    });

    // Initialize with the selected conversation
    if ($selectedConversation?.id) {
      chatStore.setConversation($selectedConversation.id);
    }

    // Register callback for new conversations
    chatStore.setNewConversationCallback((conversationId: string) => {
      console.log('[ChatView] New conversation created:', conversationId);

      // Immediately add a placeholder conversation with "New Chat" title
      // This ensures the sidebar shows the conversation right away
      // The polling will update this with the real title and metadata from the server
      const placeholderConversation = {
        id: conversationId,
        title: 'New Chat',
        userId: '',
        projectId: null,
        pinned: false,
        generating: true,
        costUsd: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      conversationsStore.addAndSelectConversation(placeholderConversation);
    });
  });

  onDestroy(() => {
    chatStore.stopPolling();
  });

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
    });
  }

  function isNewDay(currentIndex: number): boolean {
    if (currentIndex === 0) return true;

    const current = new Date($chatStore.messages[currentIndex].createdAt);
    const previous = new Date($chatStore.messages[currentIndex - 1].createdAt);

    return current.toDateString() !== previous.toDateString();
  }
</script>

<div class="chat-view">
  <div class="chat-header">
    <div class="chat-title">
      {#if $selectedConversation}
        <h2>{$selectedConversation.title || 'Untitled Conversation'}</h2>
      {:else}
        <h2>New Chat</h2>
      {/if}
      {#if $selectedAssistant}
        <span class="assistant-name">Assistant: {$selectedAssistant.name}</span>
      {/if}
    </div>
    <ModelSelector />
  </div>

  {#if $chatStore.loading}
    <div class="messages-container loading-skeleton">
      <div class="skeleton-header"></div>
      {#each Array(5) as _}
        <div class="skeleton-message">
          <div class="skeleton-avatar"></div>
          <div class="skeleton-text-container">
            <div class="skeleton-line short"></div>
            <div class="skeleton-line"></div>
            <div class="skeleton-line medium"></div>
          </div>
        </div>
      {/each}
    </div>
  {:else if $chatStore.error}
    <div class="error-state">
      <p class="error-message">{$chatStore.error}</p>
      <button on:click={() => chatStore.loadMessages($chatStore.conversationId!)}>
        Retry
      </button>
    </div>
  {:else if $chatStore.messages.length === 0}
    <div class="empty-state">
      <div class="empty-content">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <h3>{$selectedConversation ? 'No messages yet' : 'New conversation'}</h3>
        <p>Start a conversation by typing a message below</p>
      </div>
    </div>
  {:else}
    <div
      class="messages-container"
      bind:this={messagesContainer}
      on:scroll={handleScroll}
    >
      {#each $chatStore.messages as message, index (message.id)}
        {#if isNewDay(index)}
          <div class="day-divider">
            <span class="day-label">{formatDate(message.createdAt)}</span>
          </div>
        {/if}
        <ChatMessage {message} />
      {/each}

      {#if $chatStore.generating}
        <div class="generating-indicator">
          <div class="generating-avatar">
            <span>🤖</span>
          </div>
          <div class="generating-content">
            <div class="generating-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
      {/if}
    </div>
  {/if}

  <div class="chat-footer">
    <ChatInput placeholder="Type a message..." />
  </div>
</div>

<style>
  .chat-view {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
  }

  .chat-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.875rem 1.5rem 0.875rem 3.5rem; /* Space for sidebar toggle */
    border-bottom: 1px solid var(--color-border);
    background: var(--color-bg-secondary);
    flex-shrink: 0;
  }

  .chat-title h2 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .assistant-name {
    display: block;
    margin-top: 0.25rem;
    font-size: 0.75rem;
    font-weight: 400;
    color: var(--color-text-secondary);
  }

  .chat-footer {
    flex-shrink: 0;
  }

  .error-state,
  .empty-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
  }

  .error-message {
    color: var(--color-danger);
    margin-bottom: 1rem;
  }

  .error-state button {
    padding: 0.5rem 1rem;
    background: var(--color-accent);
    color: white;
    border: none;
    border-radius: 0.5rem;
    cursor: pointer;
  }

  .empty-content {
    text-align: center;
    max-width: 300px;
  }

  .empty-content svg {
    color: var(--color-text-tertiary);
    margin-bottom: 1rem;
  }

  .empty-content h3 {
    color: var(--color-text);
    margin: 0 0 0.5rem;
    font-size: 1.125rem;
    font-weight: 600;
  }

  .empty-content p {
    color: var(--color-text-secondary);
    margin: 0;
    font-size: 0.875rem;
  }

  .messages-container {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .day-divider {
    display: flex;
    align-items: center;
    margin: 1rem 0;
  }

  .day-divider::before,
  .day-divider::after {
    content: '';
      flex: 1;
      height: 1px;
      background: var(--color-border);
  }

  .day-label {
    padding: 0 1rem;
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--color-text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    white-space: nowrap;
  }

  .generating-indicator {
    display: flex;
    gap: 0.75rem;
    padding: 1rem;
    animation: fadeIn 0.2s ease;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .generating-avatar {
    flex-shrink: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-success);
    border-radius: 50%;
    font-size: 1rem;
  }

  .generating-content {
    flex: 1;
    display: flex;
    align-items: center;
  }

  .generating-dots {
    display: flex;
    gap: 0.375rem;
  }

  .generating-dots span {
    width: 8px;
    height: 8px;
    background: var(--color-accent);
    border-radius: 50%;
    animation: bounce 1.4s infinite ease-in-out both;
  }

  .generating-dots span:nth-child(1) {
    animation-delay: -0.32s;
  }

  .generating-dots span:nth-child(2) {
    animation-delay: -0.16s;
  }

  @keyframes bounce {
    0%, 80%, 100% {
      transform: scale(0);
    }
    40% {
      transform: scale(1);
    }
  }

  /* Skeleton Loading Styles */
  .loading-skeleton {
    overflow: hidden;
    pointer-events: none;
  }

  .skeleton-header {
    height: 24px;
    width: 150px;
    background: var(--color-bg-hover);
    border-radius: 4px;
    margin-bottom: 2rem;
    animation: pulse 1.5s infinite ease-in-out;
  }

  .skeleton-message {
    display: flex;
    gap: 0.75rem;
    margin-bottom: 1.5rem;
    padding: 0 0.5rem;
  }

  .skeleton-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--color-bg-hover);
    flex-shrink: 0;
    animation: pulse 1.5s infinite ease-in-out;
  }

  .skeleton-text-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .skeleton-line {
    height: 12px;
    background: var(--color-bg-hover);
    border-radius: 2px;
    width: 100%;
    animation: pulse 1.5s infinite ease-in-out;
  }

  .skeleton-line.short { width: 30%; }
  .skeleton-line.medium { width: 70%; }

  @keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.4; }
    100% { opacity: 1; }
  }

  /* Responsive Adjustments */
  @media (max-width: 768px) {
    .chat-header {
      padding: 0.75rem 1rem 0.75rem 3rem;
    }
    
    .chat-title h2 {
      font-size: 0.9375rem;
    }
  }
</style>
