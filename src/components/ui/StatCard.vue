<script setup lang="ts">
import { RouterLink, type RouteLocationRaw } from 'vue-router'

defineProps<{
  label: string
  value: number
  to: RouteLocationRaw
  /** Class that sets `--badge-color` or `--type-color` (e.g. `type-positive`, `sev-high`). */
  colorClass?: string
  small?: boolean
}>()
</script>

<template>
  <RouterLink class="stat card" :class="[colorClass, { small }]" :to="to">
    <span class="stat-value">{{ value }}</span>
    <span class="stat-label">{{ label }}</span>
  </RouterLink>
</template>

<style scoped>
.stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--space-4);
  color: var(--fg);
  border-left: 4px solid var(--type-color, var(--badge-color, var(--accent)));
  transition:
    transform var(--transition),
    box-shadow var(--transition);
}

.stat:hover {
  text-decoration: none;
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}

.stat-value {
  font-size: 1.75rem;
  font-weight: 700;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
}

.stat.small .stat-value {
  font-size: 1.25rem;
}

.stat-label {
  font-size: var(--text-sm);
  color: var(--fg-muted);
}
</style>
