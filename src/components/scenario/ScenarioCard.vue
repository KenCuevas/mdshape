<script setup lang="ts">
import { ref } from 'vue'
import type { BoardEntry, Scenario } from '@/types'
import { priorityLabel } from '@/data/labels'
import AppIcon from '@/components/ui/AppIcon.vue'
import SeverityBadge from '@/components/ui/SeverityBadge.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'

const props = defineProps<{
  scenario: Scenario
  active?: boolean
  showEpic?: boolean
  entry?: BoardEntry
  showStatus?: boolean
  draggable?: boolean
}>()

const emit = defineEmits<{ open: [scenario: Scenario, element: HTMLElement | null] }>()

const element = ref<HTMLButtonElement | null>(null)

// The dragging class is local state: no parent needs to know about it.
const dragging = ref(false)

function onDragStart(event: DragEvent): void {
  event.dataTransfer?.setData('text/plain', props.scenario.id)
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
  dragging.value = true
}

function onDragEnd(): void {
  dragging.value = false
}
</script>

<template>
  <button
    ref="element"
    type="button"
    class="scenario-card"
    :class="[`type-${scenario.type}`, { active, dragging }]"
    :data-scenario-id="scenario.id"
    :draggable="draggable === true"
    aria-haspopup="dialog"
    :aria-expanded="active ? 'true' : undefined"
    @click="emit('open', scenario, element)"
    @dragstart="onDragStart"
    @dragend="onDragEnd"
  >
    <span class="card-top">
      <span
        v-if="entry?.priority"
        class="priority"
        :class="`priority-${entry.priority}`"
        :title="`Prioridad: ${priorityLabel(entry.priority)}`"
      >
        <span class="sr-only">{{ priorityLabel(entry.priority) }}</span>
        <span aria-hidden="true">{{ entry.priority === 'low' ? '▼' : '▲' }}</span>
      </span>
      <span class="mono card-id">{{ scenario.id }}</span>
      <StatusBadge v-if="showStatus && entry && entry.status !== 'todo'" :status="entry.status" />
      <SeverityBadge
        v-if="scenario.finding"
        :severity="scenario.finding.severity"
        :prefix="scenario.finding.id"
        compact
      />
    </span>
    <span class="card-title">{{ scenario.title || scenario.heading }}</span>
    <span class="card-bottom">
      <span v-if="showEpic !== false" class="chip">{{ scenario.epicName }}</span>
      <span
        v-if="scenario.siblingIds.length"
        class="siblings mono"
        :title="`Comparte contenido con ${scenario.siblingIds.join(', ')}`"
      >
        +{{ scenario.siblingIds.length }}
      </span>
      <span v-if="entry?.note" class="has-note" title="Tiene nota">
        <span class="sr-only">Tiene nota</span>
        <AppIcon name="doc" :size="12" />
      </span>
    </span>
  </button>
</template>

<style scoped>
.scenario-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
  text-align: left;
  padding: 10px 12px 10px 14px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-left: 4px solid var(--type-color);
  border-radius: var(--radius);
  box-shadow: var(--shadow-sm);
  transition:
    border-color var(--transition),
    box-shadow var(--transition),
    background var(--transition);
}

.scenario-card[draggable='true'] {
  cursor: grab;
}

.scenario-card.dragging {
  opacity: 0.5;
}

.scenario-card:hover {
  border-color: var(--border-strong);
  border-left-color: var(--type-color);
  box-shadow: var(--shadow-md);
}

.scenario-card.active {
  background: var(--type-soft);
}

.card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.card-id {
  color: var(--type-fg);
  background: var(--type-soft);
  padding: 1px 6px;
  border-radius: 4px;
  font-weight: 600;
}

.card-title {
  font-size: var(--text-sm);
  line-height: 1.4;
  color: var(--fg);
}

.card-bottom {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
}

.siblings {
  color: var(--fg-faint);
}

.priority-high {
  color: var(--sev-high, var(--type-error));
}

.priority-medium {
  color: var(--fg-muted);
}

.priority-low {
  color: var(--fg-faint);
}

.has-note {
  color: var(--fg-faint);
}
</style>
