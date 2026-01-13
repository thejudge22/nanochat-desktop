<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import Settings from "./lib/components/Settings.svelte";
  import ConversationList from "./lib/components/ConversationList.svelte";
  import ChatView from "./lib/components/ChatView.svelte";
  import { getConfig } from "./lib/stores/config";
  import { conversationsStore, selectedConversation } from "./lib/stores/conversations";
  import { chatStore } from "./lib/stores/chat";
  import { loadAssistants } from "./lib/stores/assistants";

  let configLoaded = false;
  let showSettings = false;
  let isFirstRun = false;
  let sidebarCollapsed = false;
  let windowWidth: number = typeof window !== 'undefined' ? window.innerWidth : 1024;
  let isMobile = false;

  // Update responsive state on window resize
  function handleResize() {
    windowWidth = window.innerWidth;
    isMobile = windowWidth < 768;
    // Auto-collapse sidebar on mobile
    if (isMobile && !sidebarCollapsed) {
      sidebarCollapsed = true;
    }
  }

  onMount(() => {
    console.log('[App] Component mounted');
    handleResize();
    window.addEventListener('resize', handleResize);
    loadAppConfig();
  });

  onDestroy(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', handleResize);
    }
  });

  async function loadAppConfig() {
    try {
      console.log('[App] Loading config...');
      const config = await getConfig();
      console.log('[App] Config loaded:', config);
      
      // Check if config is valid (has both server_url and api_key)
      if (!config.server_url || !config.api_key) {
        console.log('[App] Config invalid or first run');
        isFirstRun = true;
        showSettings = true;
      } else {
        console.log('[App] Config valid, showing main app');
        isFirstRun = false;
        
        // Load assistants after config is validated
        await loadAssistants();
      }
      
      configLoaded = true;
    } catch (err) {
      console.error("[App] Failed to load config:", err);
      isFirstRun = true;
      showSettings = true;
      configLoaded = true;
    }
  }

  async function handleSettingsClose() {
    showSettings = false;
    // Reload config after settings are saved
    await loadAppConfig();
  }

  function openSettings() {
    showSettings = true;
  }

  function toggleSidebar() {
    sidebarCollapsed = !sidebarCollapsed;
  }
</script>

<svelte:window bind:innerWidth={windowWidth} />

{#if !configLoaded}
  <div class="loading-screen">
    <div class="spinner"></div>
    <p>Loading...</p>
  </div>
{:else if showSettings}
  <Settings
    isFirstRun={isFirstRun}
    onClose={handleSettingsClose}
  />
{:else}
  <div class="app-container">
    <aside class="sidebar" class:collapsed={sidebarCollapsed}>
      <ConversationList />
    </aside>
    
    <main class="main-content">
      <button
        class="sidebar-toggle"
        class:sidebar-visible={!sidebarCollapsed}
        on:click={toggleSidebar}
        aria-label={sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
        title={sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          {#if sidebarCollapsed}
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <line x1="9" y1="3" x2="9" y2="21"/>
            <path d="M13 15l3-3-3-3"/>
          {:else}
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <line x1="9" y1="3" x2="9" y2="21"/>
            <path d="M11 9l-3 3 3 3"/>
          {/if}
        </svg>
      </button>
      
      {#if !sidebarCollapsed && isMobile}
        <div
          class="sidebar-overlay"
          on:click={toggleSidebar}
          on:keydown={(e) => e.key === 'Escape' && toggleSidebar()}
          role="button"
          tabindex="-1"
        ></div>
      {/if}

      {#if $selectedConversation || $conversationsStore.isNewChatMode || $chatStore.generating || $chatStore.conversationId}
        <ChatView />
      {:else}
        <div class="empty-placeholder">
          <div class="empty-content">
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <h2>Welcome to NanoChat Desktop</h2>
            <p>Select a conversation from the sidebar to get started</p>
            <button class="settings-btn" on:click={openSettings}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M12 1v6m0 6v6m-9-9h6m6 0h6"/>
              </svg>
              Settings
            </button>
          </div>
        </div>
      {/if}
    </main>
  </div>
{/if}

<style>
  .loading-screen {
    width: 100vw;
    height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: var(--color-bg);
    color: var(--color-text-secondary);
  }

  .spinner {
    width: 48px;
    height: 48px;
    border: 4px solid var(--color-border);
    border-top-color: var(--color-accent);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin-bottom: 1rem;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .loading-screen p {
    margin: 0;
    font-size: 0.875rem;
  }

  .app-container {
    display: flex;
    width: 100%;
    height: 100%;
    overflow: hidden;
    position: relative;
  }

  .sidebar {
    width: var(--sidebar-width);
    height: 100%;
    flex-shrink: 0;
    transition: transform var(--transition-normal), width var(--transition-normal);
    position: relative;
    z-index: 100;
  }

  .sidebar.collapsed {
    width: 0;
    transform: translateX(-100%);
  }

  .sidebar-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(2px);
    z-index: 99;
    animation: fadeIn 0.2s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .sidebar-toggle {
    position: absolute;
    top: 1rem;
    left: 1rem;
    z-index: 50;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border);
    border-radius: 0.375rem;
    color: var(--color-text-secondary);
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .sidebar-toggle:hover {
    background: var(--color-bg-hover);
    color: var(--color-text);
    border-color: var(--color-accent);
  }

  .sidebar-toggle.sidebar-visible {
    /* Optional: move button when sidebar is visible if it overlaps */
  }

  .main-content {
    flex: 1;
    height: 100%;
    overflow: hidden;
    background: var(--color-bg);
    position: relative;
    display: flex;
    flex-direction: column;
  }

  .empty-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
  }

  .empty-content {
    text-align: center;
    max-width: 400px;
    padding: 2rem;
  }

  .empty-content svg {
    color: var(--color-text-tertiary);
    margin-bottom: 1.5rem;
  }

  .empty-content h2 {
    color: var(--color-text);
    margin: 0 0 0.75rem;
    font-size: 1.5rem;
    font-weight: 600;
  }

  .empty-content p {
    color: var(--color-text-secondary);
    margin: 0 0 2rem;
    font-size: 0.875rem;
    line-height: 1.6;
  }

  .settings-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.625rem 1.25rem;
    background: var(--color-accent);
    color: white;
    border: none;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background var(--transition-fast);
  }

  .settings-btn:hover {
    background: var(--color-accent-hover);
  }

  .settings-btn:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }

  .settings-btn svg {
    width: 16px;
    height: 16px;
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .sidebar {
      position: absolute;
      top: 0;
      left: 0;
      height: 100%;
      width: var(--sidebar-width);
      max-width: 80vw;
      box-shadow: 10px 0 15px -3px rgba(0, 0, 0, 0.1);
    }

    .sidebar.collapsed {
      width: var(--sidebar-width); /* Keep width for animation */
      transform: translateX(-100%);
    }
    
    .sidebar-toggle {
      top: 0.75rem;
      left: 0.75rem;
    }
  }

  /* Accessibility */
  @media (prefers-reduced-motion: reduce) {
    .sidebar, .sidebar-toggle, .settings-btn {
      transition: none !important;
    }
  }
</style>

