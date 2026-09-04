<script setup lang="ts">
import type { BoardEntries, Scenario, ScenarioType } from '@/types'
import { TYPE_PLURAL_LABELS } from '@/data/labels'
import { getEntry } from '@/board/boardState'
import ScenarioCard from './ScenarioCard.vue'

defineProps<{
  type: ScenarioType
  scenarios: Scenario[]
  entries: BoardEntries
  activeId?: string | null
}>()
const emit = defineEmits<{ open: [scenario: Scenario, element: HTMLElement | null] }>()
</script>

<template>
  <section class="group" :class="`type-${type}`" :aria-labelledby="`group-${type}`">
    <h2 :id="`group-${type}`" class="group-title">
      <span class="dot" aria-hidden="true" />
      {{ TYPE_PLURAL_LABELS[type] }}
      <span class="group-count muted">{{ scenarios.length }}</span>
    </h2>
    <div class="group-grid">
      <ScenarioCard
        v-for="scenario in scenarios"
        :key="scenario.id"
        :scenario="scenario"
        :active="scenario.id === activeId"
        :show-epic="false"
        :entry="getEntry(entries, scenario.id)"
        :show-status="true"
        @open="(item, element) => emit('open', item, element)"
      />
    </div>
  </section>
</template>

<style scoped>
.group {
  margin-bottom: var(--space-5);
}

.group-title {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-md);
  margin-bottom: var(--space-3);
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--type-color);
}

.group-count {
  font-weight: 500;
  font-size: var(--text-sm);
}

.group-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: var(--space-3);
}
</style>
