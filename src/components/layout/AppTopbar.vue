<script setup lang="ts">
import AppIcon from '@/components/ui/AppIcon.vue'

defineProps<{ menuOpen: boolean }>()
defineEmits<{ toggleMenu: [] }>()
</script>

<template>
  <header class="topbar">
    <button
      type="button"
      class="btn btn-ghost btn-icon"
      :aria-expanded="menuOpen"
      aria-controls="app-sidebar"
      aria-label="Abrir navegación"
      @click="$emit('toggleMenu')"
    >
      <AppIcon :name="menuOpen ? 'close' : 'menu'" :size="20" />
    </button>
    <RouterLink class="brand" :to="{ name: 'home' }">QA Docs Explorer</RouterLink>
  </header>
</template>

<style scoped>
.topbar {
  grid-area: topbar;
  display: none;
  align-items: center;
  gap: var(--space-2);
  height: var(--topbar-height);
  padding: 0 var(--space-3);
  background: var(--bg-elevated);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 20;
}

.brand {
  font-weight: 650;
  color: var(--fg);
}

@media (max-width: 899px) {
  .topbar {
    display: flex;
  }
}
</style>
