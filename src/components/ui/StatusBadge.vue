<script setup lang="ts">
import type { BoardStatus } from '@/types'
import { STATUS_LABELS } from '@/data/labels'

defineProps<{ status: BoardStatus }>()
</script>

<template>
  <span class="badge status-badge" :class="`status-${status}`">{{ STATUS_LABELS[status] }}</span>
</template>

<style scoped>
/* Mirrors .type-badge in base.css: maps the status-* variables (already set
   by the shared .status-todo/.status-doing/.status-fail/.status-pass
   classes) onto the .badge component's --badge-* variables. */
.status-badge {
  --badge-color: var(--status-color);
  --badge-soft: var(--status-soft);
  --badge-fg: var(--status-fg);
}
</style>
