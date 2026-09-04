<script setup lang="ts">
import { ref } from 'vue'
import type { BoardEntries, BoardStatus, Scenario } from '@/types'
import { STATUS_LABELS } from '@/data/labels'
import { getEntry } from '@/board/boardState'
import ScenarioCard from '@/components/scenario/ScenarioCard.vue'

defineProps<{
  status: BoardStatus
  scenarios: Scenario[]
  entries: BoardEntries
  activeId: string | null
}>()

const emit = defineEmits<{
  open: [scenario: Scenario, element: HTMLElement | null]
  drop: [id: string]
}>()

// dragenter/dragleave also fire for child elements, so the highlight is kept
// with a depth counter instead of a boolean.
const depth = ref(0)
const isOver = ref(false)

function onEnter(): void {
  depth.value += 1
  isOver.value = true
}

function onLeave(): void {
  depth.value = Math.max(0, depth.value - 1)
  if (depth.value === 0) isOver.value = false
}

function onDrop(event: DragEvent): void {
  depth.value = 0
  isOver.value = false
  const id = event.dataTransfer?.getData('text/plain')
  if (id) emit('drop', id)
}
</script>

<template>
  <section
    class="column"
    :class="['status-' + status, { 'is-over': isOver }]"
    :aria-labelledby="`column-${status}`"
    @dragover.prevent
    @dragenter.prevent="onEnter"
    @dragleave="onLeave"
    @drop.prevent="onDrop"
  >
    <header class="column-head">
      <h2 :id="`column-${status}`" class="column-title">
        <span class="dot" aria-hidden="true" />
        {{ STATUS_LABELS[status] }}
      </h2>
      <span class="column-count" :aria-label="`${scenarios.length} escenarios`">
        {{ scenarios.length }}
      </span>
    </header>
    <div class="column-body">
      <ScenarioCard
        v-for="scenario in scenarios"
        :key="scenario.id"
        :scenario="scenario"
        :active="scenario.id === activeId"
        :entry="getEntry(entries, scenario.id)"
        :draggable="true"
        @open="(item, element) => emit('open', item, element)"
      />
      <p v-if="scenarios.length === 0" class="column-empty muted">Sin escenarios</p>
    </div>
  </section>
</template>

<style scoped>
.column {
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
  background: var(--bg-subtle);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.column.is-over {
  outline: 2px dashed var(--status-color);
  outline-offset: -2px;
}

.column-head {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  padding: 10px 14px;
  border-bottom: 1px solid var(--border);
  border-top: 3px solid var(--status-color);
  background: var(--bg-elevated);
}

.column-title {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
  font-weight: 650;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--status-fg);
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--status-color);
}

.column-count {
  min-width: 26px;
  text-align: center;
  padding: 1px 8px;
  border-radius: 999px;
  background: var(--status-soft);
  color: var(--status-fg);
  font-size: var(--text-xs);
  font-weight: 650;
  font-variant-numeric: tabular-nums;
}

.column-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: var(--space-3);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.column-empty {
  padding: var(--space-3);
  text-align: center;
  font-size: var(--text-sm);
}
</style>
