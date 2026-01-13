<script lang="ts">
  import { getConfig, saveConfig, validateConnection, type Config } from "../stores/config";
  import { onMount } from "svelte";
  import { assistants, loadAssistants } from "../stores/assistants";

  let serverUrl = "";
  let apiKey = "";
  let showApiKey = false;
  let isSaving = false;
  let isTesting = false;
  let testResult: { success: boolean; message: string } | null = null;

  export let onClose: (() => void) | null = null;
  export let isFirstRun = false;

  onMount(async () => {
    try {
      const config = await getConfig();
      serverUrl = config.server_url;
      apiKey = config.api_key;
    } catch (err) {
      console.error("Failed to load config:", err);
    }
    await loadAssistants();
  });

  async function handleSave() {
    isSaving = true;
    testResult = null;

    try {
      const config: Config = {
        server_url: serverUrl,
        api_key: apiKey,
      };
      await saveConfig(config);
      testResult = { success: true, message: "Settings saved successfully!" };
      
      if (onClose) {
        setTimeout(() => onClose?.(), 1000);
      }
    } catch (err) {
      testResult = { success: false, message: `Failed to save: ${err}` };
    } finally {
      isSaving = false;
    }
  }

  async function handleTestConnection() {
    isTesting = true;
    testResult = null;

    try {
      const isValid = await validateConnection(serverUrl, apiKey);
      if (isValid) {
        testResult = { success: true, message: "Connection successful!" };
      }
    } catch (err) {
      testResult = { success: false, message: `Connection failed: ${err}` };
    } finally {
      isTesting = false;
    }
  }

  function toggleShowApiKey() {
    showApiKey = !showApiKey;
  }
</script>

<div class="settings-overlay">
  <div class="settings-modal">
    <h2>Settings</h2>
    
    {#if isFirstRun}
      <p class="first-run-message">
        Welcome! Please configure your NanoChat server connection.
      </p>
    {/if}

    <form on:submit|preventDefault={handleSave}>
      <div class="form-group">
        <label for="server-url">Server URL</label>
        <input
          id="server-url"
          type="url"
          bind:value={serverUrl}
          placeholder="https://api.example.com"
          required
        />
      </div>

      <div class="form-group">
        <label for="api-key">API Key</label>
        <div class="api-key-input">
          <input
            id="api-key"
            type={showApiKey ? "text" : "password"}
            bind:value={apiKey}
            placeholder="Your API key"
            required
          />
          <button
            type="button"
            class="toggle-visibility"
            on:click={toggleShowApiKey}
            title={showApiKey ? "Hide" : "Show"}
          >
            {showApiKey ? "👁️" : "👁️‍🗨️"}
          </button>
        </div>
      </div>

      {#if testResult}
        <div class="test-result" class:success={testResult.success} class:error={!testResult.success}>
          {testResult.message}
        </div>
      {/if}

      <div class="button-group">
        <button
          type="button"
          class="btn-secondary"
          on:click={handleTestConnection}
          disabled={isTesting || !serverUrl || !apiKey}
        >
          {isTesting ? "Testing..." : "Test Connection"}
        </button>
        
        <button
          type="submit"
          class="btn-primary"
          disabled={isSaving || !serverUrl || !apiKey}
        >
          {isSaving ? "Saving..." : "Save"}
        </button>
      </div>

      {#if isFirstRun}
        <p class="first-run-note">
          You must save valid settings before using the app.
        </p>
      {/if}
    </form>

    <h2>Assistants</h2>
    <div class="assistants-section">
      <p class="server-managed-note">Server-managed assistants</p>
      {#each $assistants as assistant}
        <div class="assistant-item">
          <div class="assistant-info">
            <div class="assistant-name">
              {assistant.name}
              {#if assistant.isDefault}
                <span class="default-badge">(Default)</span>
              {/if}
            </div>
            <div class="assistant-description">{assistant.description || 'No description'}</div>
          </div>
        </div>
      {/each}
    </div>

    {#if !isFirstRun && onClose}
      <button class="close-button" on:click={onClose}>×</button>
    {/if}
  </div>
</div>

<style>
  .settings-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .settings-modal {
    background: var(--color-bg-secondary);
    border-radius: 12px;
    padding: 2rem;
    width: 90%;
    max-width: 500px;
    position: relative;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    animation: slideIn 0.3s ease-out;
  }

  @keyframes slideIn {
    from { transform: translateY(20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }

  h2 {
    margin: 0 0 1.5rem 0;
    color: var(--color-text);
    font-size: 1.5rem;
  }

  .first-run-message {
    background: var(--color-accent);
    padding: 1rem;
    border-radius: 8px;
    margin-bottom: 1.5rem;
    color: #a8d5ff;
  }

  .first-run-note {
    margin-top: 1rem;
    font-size: 0.9rem;
    color: var(--color-text-secondary);
    text-align: center;
  }

  .form-group {
    margin-bottom: 1.5rem;
  }

  label {
    display: block;
    margin-bottom: 0.5rem;
    color: var(--color-text-secondary);
    font-weight: 500;
  }

  input {
    width: 100%;
    padding: 0.75rem;
    background: var(--color-bg-hover);
    border: 1px solid var(--color-border);
    border-radius: 6px;
    color: var(--color-text);
    font-size: 1rem;
    box-sizing: border-box;
  }

  input:focus {
    outline: none;
    border-color: var(--color-accent);
    box-shadow: 0 0 0 2px rgba(100, 108, 255, 0.2);
  }

  .api-key-input {
    position: relative;
    display: flex;
    gap: 0.5rem;
  }

  .api-key-input input {
    flex: 1;
  }

  .toggle-visibility {
    padding: 0.75rem 1rem;
    background: var(--color-bg-hover);
    border: 1px solid var(--color-border);
    border-radius: 6px;
    cursor: pointer;
    font-size: 1.2rem;
    transition: background var(--transition-fast);
    color: var(--color-text);
  }

  .toggle-visibility:hover {
    background: var(--color-bg-selected);
  }

  .test-result {
    padding: 1rem;
    border-radius: 6px;
    margin-bottom: 1rem;
    font-weight: 500;
  }

  .test-result.success {
    background: rgba(34, 197, 94, 0.2);
    color: var(--color-success);
  }

  .test-result.error {
    background: var(--color-danger-bg);
    color: var(--color-danger);
  }

  .button-group {
    display: flex;
    gap: 1rem;
  }

  button[type="submit"],
  button[type="button"] {
    flex: 1;
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 6px;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .btn-primary {
    background: var(--color-accent);
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background: var(--color-accent-hover);
  }

  .btn-secondary {
    background: var(--color-bg-hover);
    color: var(--color-text);
    border: 1px solid var(--color-border);
  }

  .btn-secondary:hover:not(:disabled) {
    background: var(--color-bg-selected);
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .close-button {
    position: absolute;
    top: 1rem;
    right: 1rem;
    background: transparent;
    border: none;
    font-size: 2rem;
    color: var(--color-text-secondary);
    cursor: pointer;
    padding: 0;
    width: 2rem;
    height: 2rem;
    line-height: 1;
  }

  .close-button:hover {
    color: var(--color-text);
  }

  .assistants-section {
    margin-top: 1.5rem;
    padding-top: 1.5rem;
    border-top: 1px solid var(--color-border);
  }

  .assistant-item {
    padding: 1rem;
    background: var(--color-bg-hover);
    border: 1px solid var(--color-border);
    border-radius: 6px;
    margin-bottom: 0.75rem;
  }

  .assistant-info {
    flex: 1;
    min-width: 0;
  }

  .assistant-name {
    font-weight: 600;
    color: var(--color-text);
    margin-bottom: 0.25rem;
  }

  .assistant-description {
    font-size: 0.875rem;
    color: var(--color-text-secondary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .default-badge {
    font-size: 0.75rem;
    color: var(--color-accent);
    font-weight: 500;
    margin-left: 0.5rem;
  }

  .server-managed-note {
    font-size: 0.875rem;
    color: var(--color-text-secondary);
    margin-bottom: 1rem;
    font-style: italic;
  }

  @media (max-width: 480px) {
    .settings-modal {
      padding: 1.5rem;
    }

    .button-group {
      flex-direction: column;
    }

    h2 {
      font-size: 1.25rem;
    }
  }
</style>
