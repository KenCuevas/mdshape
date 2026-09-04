<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import type { Priority } from '@/types'
import { BOARD_STATUSES, PRIORITIES } from '@/types'
import { PRIORITY_LABELS, STATUS_LABELS } from '@/data/labels'
import { useBoardState } from '@/composables/useBoardState'

const props = defineProps<{ scenarioId: string }>()

const board = useBoardState()
const entry = computed(() => board.getEntry(props.scenarioId))
// Switching scenarios remounts this component via the `:key="scenario.id"` in
// ScenarioDrawer.vue, so `note` always starts from the entry above — there is
// no need to (and must not) watch `props.scenarioId` to reset it here.
const note = ref(entry.value.note)
let timer: number | undefined

function flush(): void {
  window.clearTimeout(timer)
}

/**
 * The panel closes with Escape, so the note is saved while typing (debounced)
 * and again on blur. Escape can never lose what was written.
 */
function onNoteInput(): void {
  window.clearTimeout(timer)
  timer = window.setTimeout(() => board.setNote(props.scenarioId, note.value), 400)
}

function onNoteBlur(): void {
  flush()
  board.setNote(props.scenarioId, note.value)
}

function onPriority(event: Event): void {
  const value = (event.target as HTMLSelectElement).value
  board.setPriority(props.scenarioId, value === '' ? null : (value as Priority))
}

onBeforeUnmount(() => {
  flush()
  if (note.value !== entry.value.note) board.setNote(props.scenarioId, note.value)
})
</script>

<template>
  <section class="tracker" aria-label="Mi seguimiento">
    <h3 class="tracker-title">Mi seguimiento</h3>

    <div class="statuses" role="group" aria-label="Estado">
      <button
        v-for="status in BOARD_STATUSES"
        :key="status"
        type="button"
        class="status-button"
        :class="[`status-${status}`, { active: entry.status === status }]"
        :aria-pressed="entry.status === status"
        @click="board.setStatus(props.scenarioId, status)"
      >
        {{ STATUS_LABELS[status] }}
      </button>
    </div>

    <label class="field">
      <span class="field-label">Prioridad</span>
      <select class="input" :value="entry.priority ?? ''" @change="onPriority">
        <option value="">Sin prioridad</option>
        <option v-for="priority in PRIORITIES" :key="priority" :value="priority">
          {{ PRIORITY_LABELS[priority] }}
        </option>
      </select>
    </label>

    <label class="field">
      <span class="field-label">Mi nota</span>
      <textarea
        v-model="note"
        class="input note"
        rows="3"
        placeholder="Qué viste, cómo reproducirlo…"
        @input="onNoteInput"
        @blur="onNoteBlur"
      />
    </label>
  </section>
</template>

<style scoped>
.tracker {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-3);
  margin-bottom: var(--space-4);
  background: var(--bg-subtle);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.tracker-title {
  font-size: var(--text-sm);
  font-weight: 650;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--fg-muted);
}

.statuses {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 4px;
}

.status-button {
  padding: 6px 8px;
  font-size: var(--text-xs);
  font-weight: 650;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-elevated);
  color: var(--fg-muted);
}

.status-button.active {
  background: var(--status-soft);
  border-color: var(--status-color);
  color: var(--status-fg);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field-label {
  font-size: var(--text-xs);
  color: var(--fg-muted);
}

.note {
  resize: vertical;
  font: inherit;
}
</style>
