<script setup lang="ts">
import type { BoardStatus } from '@/types'
import { BOARD_STATUSES } from '@/types'
import { STATUS_LABELS } from '@/data/labels'

defineProps<{ modelValue: BoardStatus; counts: Record<BoardStatus, number> }>()
defineEmits<{ 'update:modelValue': [value: BoardStatus] }>()
</script>

<template>
  <div class="picker" role="tablist" aria-label="Columna visible">
    <button
      v-for="status in BOARD_STATUSES"
      :key="status"
      type="button"
      role="tab"
      class="picker-tab"
      :class="[`status-${status}`, { active: status === modelValue }]"
      :aria-selected="status === modelValue"
      @click="$emit('update:modelValue', status)"
    >
      <span class="dot" aria-hidden="true" />
      {{ STATUS_LABELS[status] }}
      <span class="picker-count">{{ counts[status] }}</span>
    </button>
  </div>
</template>

<style scoped>
.picker {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 4px;
  padding: 4px;
  background: var(--bg-subtle);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.picker-tab {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 6px 4px;
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--fg-muted);
  white-space: nowrap;
}

.picker-tab.active {
  background: var(--bg-elevated);
  color: var(--status-fg);
  box-shadow: var(--shadow-sm);
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--status-color);
}

.picker-count {
  font-variant-numeric: tabular-nums;
  color: var(--fg-faint);
}

.picker-tab.active .picker-count {
  color: inherit;
}

@media (max-width: 420px) {
  .picker-tab {
    flex-direction: column;
    gap: 2px;
  }
}
</style>
