<script lang="ts">
  let count = 0;
  
  function increment() {
    count += 1;
  }
</script>

<main>
  <h1>NanoChat Desktop</h1>
  <div class="card">
    <button on:click={increment}>
      count is {count}
    </button>
  </div>
  <p>Click the button to test the app is working!</p>
</main>

<style>
  main {
    text-align: center;
    padding: 2rem;
  }

  h1 {
    color: #333;
    margin-bottom: 2rem;
  }

  .card {
    padding: 2em;
  }

  button {
    font-size: 1.2rem;
    padding: 0.6rem 1.2rem;
    cursor: pointer;
  }
</style>
