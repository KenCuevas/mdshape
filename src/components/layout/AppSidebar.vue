<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import AppIcon from '@/components/ui/AppIcon.vue'
import ThemeToggle from './ThemeToggle.vue'
import { useCatalog } from '@/composables/useCatalog'

defineProps<{ open: boolean }>()
defineEmits<{ close: [] }>()

const route = useRoute()
const { epics, docs, fallbackDocs, findings, stats } = useCatalog()

const onEpicRoute = computed(() => route.name === 'epic' || route.name === 'epics')
const epicsExpanded = ref(onEpicRoute.value)
watch(onEpicRoute, (value) => {
  if (value) epicsExpanded.value = true
})

const isActive = (name: string, param?: Record<string, string>): boolean => {
  if (route.name !== name) return false
  if (!param) return true
  return Object.entries(param).every(([key, value]) => route.params[key] === value)
}
</script>

<template>
  <aside id="app-sidebar" class="sidebar" :class="{ open }" aria-label="Barra lateral">
    <div class="sidebar-head">
      <RouterLink class="brand" :to="{ name: 'home' }">
        <span class="brand-mark" aria-hidden="true">QA</span>
        <span>Docs Explorer</span>
      </RouterLink>
      <button
        type="button"
        class="btn btn-ghost btn-icon close"
        aria-label="Cerrar navegación"
        @click="$emit('close')"
      >
        <AppIcon name="close" />
      </button>
    </div>

    <nav class="nav" aria-label="Principal">
      <RouterLink class="nav-link" :class="{ active: isActive('home') }" :to="{ name: 'home' }">
        <AppIcon name="home" /> Inicio
      </RouterLink>
      <RouterLink class="nav-link" :class="{ active: isActive('board') }" :to="{ name: 'board' }">
        <AppIcon name="board" /> Tablero
        <span class="count">{{ stats.scenarios }}</span>
      </RouterLink>

      <div class="nav-group">
        <div class="nav-group-head" :class="{ active: isActive('epics') }">
          <RouterLink class="nav-link grow" :to="{ name: 'epics' }">
            <AppIcon name="epic" /> Épicas
            <span class="count">{{ epics.length }}</span>
          </RouterLink>
          <button
            type="button"
            class="btn btn-ghost btn-icon"
            :aria-expanded="epicsExpanded"
            aria-controls="sidebar-epics"
            :aria-label="epicsExpanded ? 'Contraer épicas' : 'Desplegar épicas'"
            @click="epicsExpanded = !epicsExpanded"
          >
            <AppIcon :name="epicsExpanded ? 'chevron-down' : 'chevron-right'" :size="16" />
          </button>
        </div>
        <ul v-show="epicsExpanded" id="sidebar-epics" class="nav-sub">
          <li v-for="epic in epics" :key="epic.slug">
            <RouterLink
              class="nav-link sub"
              :class="{ active: isActive('epic', { slug: epic.slug }) }"
              :to="{ name: 'epic', params: { slug: epic.slug } }"
            >
              <span class="truncate">{{ epic.name }}</span>
              <span class="count">{{ epic.scenarios.length }}</span>
            </RouterLink>
          </li>
          <li v-if="epics.length === 0" class="nav-empty muted">Sin épicas</li>
        </ul>
      </div>

      <RouterLink
        class="nav-link"
        :class="{ active: isActive('findings') || isActive('finding') }"
        :to="{ name: 'findings' }"
      >
        <AppIcon name="finding" /> Hallazgos
        <span class="count">{{ findings.length }}</span>
      </RouterLink>

      <div class="nav-section-label eyebrow">Documentos</div>
      <RouterLink
        v-for="doc in docs"
        :key="doc.slug"
        class="nav-link"
        :class="{ active: isActive('doc', { slug: doc.slug }) }"
        :to="{ name: 'doc', params: { slug: doc.slug } }"
      >
        <AppIcon name="doc" />
        <span class="truncate">{{ doc.title }}</span>
      </RouterLink>
      <p v-if="docs.length === 0" class="nav-empty muted">Sin documentos</p>

      <template v-if="fallbackDocs.length">
        <div class="nav-section-label eyebrow">Sin formato de épica</div>
        <RouterLink
          v-for="doc in fallbackDocs"
          :key="doc.slug"
          class="nav-link"
          :class="{ active: isActive('doc', { slug: doc.slug }) }"
          :to="{ name: 'doc', params: { slug: doc.slug } }"
        >
          <AppIcon name="doc" />
          <span class="truncate">{{ doc.title }}</span>
        </RouterLink>
      </template>
    </nav>

    <div class="sidebar-foot">
      <ThemeToggle />
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  grid-area: sidebar;
  position: sticky;
  top: 0;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  background: var(--bg-elevated);
  border-right: 1px solid var(--border);
  overflow: hidden;
}

.sidebar-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4) var(--space-4) var(--space-3);
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  font-weight: 650;
  color: var(--fg);
}

.brand:hover {
  text-decoration: none;
}

.brand-mark {
  display: inline-grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 7px;
  background: var(--accent);
  color: var(--accent-fg);
  font-size: var(--text-xs);
  font-weight: 700;
}

.close {
  display: none;
}

.nav {
  flex: 1;
  overflow-y: auto;
  padding: 0 var(--space-2) var(--space-3);
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 6px 10px;
  border-radius: var(--radius-sm);
  color: var(--fg-muted);
  font-size: var(--text-sm);
  font-weight: 500;
  min-width: 0;
}

.nav-link:hover {
  text-decoration: none;
  background: var(--bg-hover);
  color: var(--fg);
}

.nav-link.active {
  background: var(--accent-soft);
  color: var(--accent);
}

.nav-link.sub {
  padding-left: 34px;
  font-weight: 450;
}

.nav-link.grow {
  flex: 1;
}

.count {
  margin-left: auto;
  font-size: var(--text-xs);
  font-variant-numeric: tabular-nums;
  color: var(--fg-faint);
}

.nav-link.active .count {
  color: inherit;
}

.nav-group-head {
  display: flex;
  align-items: center;
}

.nav-sub {
  list-style: none;
  margin: 0;
  padding: 0;
}

.nav-section-label {
  padding: var(--space-4) 10px var(--space-1);
}

.nav-empty {
  padding: 4px 10px;
  font-size: var(--text-sm);
}

.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sidebar-foot {
  padding: var(--space-3) var(--space-3);
  border-top: 1px solid var(--border);
}

@media (max-width: 899px) {
  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    width: min(var(--sidebar-width), 86vw);
    z-index: 40;
    transform: translateX(-100%);
    transition: transform 160ms ease;
    box-shadow: var(--shadow-lg);
  }

  .sidebar.open {
    transform: translateX(0);
  }

  .close {
    display: inline-flex;
  }
}
</style>
