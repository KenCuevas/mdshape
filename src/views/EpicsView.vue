<script setup lang="ts">
import { RouterLink } from 'vue-router'
import EmptyState from '@/components/ui/EmptyState.vue'
import MarkdownContent from '@/components/doc/MarkdownContent.vue'
import { useCatalog } from '@/composables/useCatalog'
import { SCENARIO_TYPES } from '@/types'
import type { Epic, ScenarioType } from '@/types'
import { TYPE_LABELS } from '@/data/labels'

const { epics } = useCatalog()

function countByType(epic: Epic, type: ScenarioType): number {
  return epic.scenarios.filter((scenario) => scenario.type === type).length
}

function findingCount(epic: Epic): number {
  return epic.scenarios.filter((scenario) => scenario.finding).length
}
</script>

<template>
  <div class="page">
    <header class="page-header">
      <p class="eyebrow">Épicas</p>
      <h1 class="page-title">Todas las épicas</h1>
      <p class="page-lead">{{ epics.length }} épicas con sus escenarios repartidos por tipo.</p>
    </header>

    <EmptyState v-if="epics.length === 0" title="No hay épicas">
      <p>No se ha encontrado ningún fichero en <code>epics/</code> con formato de épica.</p>
    </EmptyState>

    <div v-else class="grid">
      <RouterLink
        v-for="epic in epics"
        :key="epic.slug"
        class="epic card"
        :to="{ name: 'epic', params: { slug: epic.slug } }"
      >
        <span class="epic-name">{{ epic.name }}</span>
        <span v-if="epic.intro" class="epic-intro muted text-sm">
          <MarkdownContent
            :source="epic.intro.split('\n\n')[0] ?? ''"
            inline
            :link-references="false"
          />
        </span>
        <span class="epic-counts">
          <span
            v-for="type in SCENARIO_TYPES"
            :key="type"
            class="count"
            :class="`type-${type}`"
            :title="TYPE_LABELS[type]"
          >
            <span class="dot" aria-hidden="true" />
            {{ countByType(epic, type) }}
            <span class="sr-only">{{ TYPE_LABELS[type] }}</span>
          </span>
          <span v-if="findingCount(epic)" class="muted text-sm"
            >· {{ findingCount(epic) }} con hallazgo</span
          >
        </span>
      </RouterLink>
    </div>
  </div>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-3);
}

.epic {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: var(--space-4);
  color: var(--fg);
  transition: box-shadow var(--transition);
}

.epic:hover {
  text-decoration: none;
  box-shadow: var(--shadow-md);
}

.epic-name {
  font-weight: 650;
  font-family: var(--font-mono);
  font-size: var(--text-sm);
}

.epic-intro {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.epic-counts {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
  margin-top: auto;
}

.count {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: var(--text-sm);
  font-variant-numeric: tabular-nums;
  color: var(--type-fg);
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--type-color);
}
</style>
