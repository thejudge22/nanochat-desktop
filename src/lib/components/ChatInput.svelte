<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { chatStore, canSendMessage } from '../stores/chat';
  import { modelsStore, selectedModel } from '../stores/models';

  export let disabled = false;
  export let placeholder = 'Type a message...';

  const dispatch = createEventDispatcher();

  let messageInput = '';
  let textareaElement: HTMLTextAreaElement;

  async function handleSend() {
    const content = messageInput.trim();

    if (!content || disabled || !$canSendMessage) {
      return;
    }

    // Get the store state to access conversationId
    const state = $chatStore;

    if (!state.conversationId) {
      console.error('No active conversation');
      return;
    }

    // Get the selected model from the models store
    const model = $selectedModel;

    if (!model || !model.modelId) {
      chatStore.setError('No model selected. Please configure your models in Settings.');
      return;
    }

    const modelId = model.modelId;

    messageInput = '';
    resizeTextarea();

    try {
      await chatStore.sendMessage(content, modelId);
    } catch (error) {
      console.error('Failed to send message:', error);
      // The store handles error state, so we don't need to do much here
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    // Ctrl+Enter to send
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      handleSend();
    }
  }

  function resizeTextarea() {
    if (textareaElement) {
      textareaElement.style.height = 'auto';
      textareaElement.style.height = Math.min(textareaElement.scrollHeight, 200) + 'px';
    }
  }

  $: if (textareaElement) {
    resizeTextarea();
  }
</script>

<div class="chat-input-container" class:disabled={disabled || !$canSendMessage}>
  <div class="input-wrapper">
    <textarea
      bind:this={textareaElement}
      bind:value={messageInput}
      on:input={resizeTextarea}
      on:keydown={handleKeydown}
      {placeholder}
      disabled={disabled || $chatStore.generating}
      rows="1"
    ></textarea>
    <button
      class="send-button"
      on:click={handleSend}
      disabled={disabled || !$canSendMessage || !messageInput.trim()}
      title="Send message (Ctrl+Enter)"
    >
      {#if $chatStore.generating}
        <span class="spinner"></span>
      {:else}
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="22" y1="2" x2="11" y2="13"/>
          <polygon points="22 2 15 22 11 13 2 9 22 2"/>
        </svg>
      {/if}
    </button>
  </div>
  <div class="input-footer">
    <span class="hint">Press Ctrl+Enter to send</span>
    {#if $chatStore.generating}
      <span class="generating-status">
        <span class="spinner-small"></span>
        Generating response...
      </span>
    {/if}
  </div>
</div>

<style>
  .chat-input-container {
    border-top: 1px solid var(--color-border);
    background: var(--color-bg-secondary);
    padding: 1rem;
  }

  .chat-input-container.disabled {
    opacity: 0.6;
    pointer-events: none;
  }

  .input-wrapper {
    display: flex;
    gap: 0.75rem;
    align-items: flex-end;
  }

  textarea {
    flex: 1;
    min-height: 44px;
    max-height: 200px;
    padding: 0.625rem 0.875rem;
    background: var(--color-bg-hover);
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    color: var(--color-text);
    font-size: 0.9375rem;
    line-height: 1.5;
    resize: none;
    font-family: inherit;
    box-sizing: border-box;
    transition: border-color var(--transition-fast);
  }

  textarea:focus {
    outline: none;
    border-color: var(--color-accent);
  }

  textarea::placeholder {
    color: var(--color-text-tertiary);
  }

  textarea:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .send-button {
    width: 44px;
    height: 44px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-accent);
    border: none;
    border-radius: 0.75rem;
    color: white;
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .send-button:hover:not(:disabled) {
    background: var(--color-accent-hover);
    transform: scale(1.05);
  }

  .send-button:active:not(:disabled) {
    transform: scale(0.95);
  }

  .send-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  .send-button svg {
    flex-shrink: 0;
  }

  .spinner {
    width: 20px;
    height: 20px;
    border: 2px solid transparent;
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .input-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 0.5rem;
  }

  .hint {
    font-size: 0.75rem;
    color: var(--color-text-tertiary);
  }

  .generating-status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: var(--color-accent);
  }

  .spinner-small {
    width: 14px;
    height: 14px;
    border: 2px solid var(--color-border);
    border-top-color: var(--color-accent);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
</style>
