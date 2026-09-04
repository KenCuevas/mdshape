<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import AppTopbar from '@/components/layout/AppTopbar.vue'
import { useTheme } from '@/composables/useTheme'

useTheme()

const route = useRoute()
const sidebarOpen = ref(false)

watch(
  () => route.fullPath,
  () => {
    sidebarOpen.value = false
  },
)
</script>

<template>
  <div class="app-shell" :class="{ 'sidebar-open': sidebarOpen }">
    <a class="skip-link" href="#main">Saltar al contenido</a>
    <AppTopbar :menu-open="sidebarOpen" @toggle-menu="sidebarOpen = !sidebarOpen" />
    <AppSidebar :open="sidebarOpen" @close="sidebarOpen = false" />
    <div
      v-if="sidebarOpen"
      class="sidebar-backdrop"
      aria-hidden="true"
      @click="sidebarOpen = false"
    />
    <main id="main" class="app-main" tabindex="-1">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100dvh;
  display: grid;
  grid-template-columns: var(--sidebar-width) minmax(0, 1fr);
  grid-template-rows: auto minmax(0, 1fr);
  grid-template-areas:
    'sidebar topbar'
    'sidebar main';
}

.app-main {
  grid-area: main;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.app-main:focus {
  outline: none;
}

.skip-link {
  position: absolute;
  left: 8px;
  top: -40px;
  z-index: 100;
  padding: 8px 12px;
  background: var(--accent);
  color: var(--accent-fg);
  border-radius: var(--radius-sm);
}

.skip-link:focus {
  top: 8px;
}

.sidebar-backdrop {
  display: none;
}

@media (max-width: 899px) {
  .app-shell {
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas:
      'topbar'
      'main';
  }

  .sidebar-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    background: var(--overlay);
    z-index: 30;
  }
}
</style>
