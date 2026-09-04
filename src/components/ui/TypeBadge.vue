<script setup lang="ts">
import type { ScenarioType } from '@/types'
import { TYPE_LABELS } from '@/data/labels'

defineProps<{ type: ScenarioType }>()
</script>

<template>
  <span class="badge type-badge" :class="`type-${type}`">{{ TYPE_LABELS[type] }}</span>
</template>
