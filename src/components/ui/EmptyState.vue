<script setup lang="ts">
defineProps<{ title: string }>()
</script>

<template>
  <div class="empty card" role="status">
    <h2 class="empty-title">{{ title }}</h2>
    <div class="empty-body muted"><slot /></div>
  </div>
</template>

<style scoped>
.empty {
  padding: var(--space-5);
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  align-items: center;
}

.empty-title {
  font-size: var(--text-md);
}

.empty-body {
  max-width: 56ch;
  font-size: var(--text-sm);
}

.empty-body :deep(code) {
  background: var(--code-bg);
  padding: 0.1em 0.4em;
  border-radius: 4px;
}
</style>
