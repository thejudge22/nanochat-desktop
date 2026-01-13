<script lang="ts">
  import { onMount } from 'svelte';
  import { assistants, selectedAssistantId, loadAssistants } from '../stores/assistants';

  onMount(loadAssistants);
</script>

<select bind:value={$selectedAssistantId}>
  <option value={null}>Default Assistant</option>
  {#each $assistants as assistant}
    <option value={assistant.id}>{assistant.name}</option>
  {/each}
</select>