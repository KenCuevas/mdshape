<script setup lang="ts">
import type { DetailItem } from '@/types'
import MarkdownContent from '@/components/doc/MarkdownContent.vue'

defineProps<{ details: DetailItem[] }>()
</script>

<template>
  <dl class="details">
    <template v-for="(item, index) in details" :key="index">
      <dt v-if="item.label" class="detail-label">{{ item.label }}</dt>
      <dd class="detail-body" :class="{ free: !item.label }">
        <MarkdownContent :source="item.markdown" compact />
      </dd>
    </template>
  </dl>
  <p v-if="details.length === 0" class="muted text-sm">Este escenario no tiene detalles.</p>
</template>

<style scoped>
.details {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.detail-label {
  font-size: var(--text-xs);
  font-weight: 650;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--fg-muted);
  margin-bottom: 3px;
}

.detail-body {
  margin: 0;
  padding: 10px 12px;
  background: var(--bg-subtle);
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
}

.detail-body.free {
  background: none;
  padding: 0;
}
</style>
