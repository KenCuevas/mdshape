<script setup lang="ts">
import type { Severity } from '@/types'
import { severityClass, severityLabel } from '@/data/labels'

defineProps<{
  severity: Severity | null
  /** Optional text shown before the severity, e.g. the finding id. */
  prefix?: string
  /** Hide the severity word and show only the prefix (colored). */
  compact?: boolean
}>()
</script>

<template>
  <span class="badge" :class="severityClass(severity)">
    <span v-if="prefix" class="mono">{{ prefix }}</span>
    <span v-if="!compact || !prefix">{{ severityLabel(severity) }}</span>
    <span v-else class="sr-only">{{ severityLabel(severity) }}</span>
  </span>
</template>
