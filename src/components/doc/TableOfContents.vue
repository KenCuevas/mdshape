<script setup lang="ts">
import type { Heading } from '@/types'

defineProps<{ headings: Heading[]; activeId: string | null }>()
defineEmits<{ select: [id: string] }>()
</script>

<template>
  <nav class="toc" aria-label="Índice del documento">
    <p class="eyebrow toc-title">En esta página</p>
    <ul class="toc-list">
      <li v-for="heading in headings" :key="heading.id" :class="`level-${heading.level}`">
        <RouterLink
          class="toc-link"
          :class="{ active: heading.id === activeId }"
          :aria-current="heading.id === activeId ? 'location' : undefined"
          :to="{ hash: `#${heading.id}` }"
          @click="$emit('select', heading.id)"
        >
          {{ heading.text }}
        </RouterLink>
      </li>
    </ul>
  </nav>
</template>

<style scoped>
.toc-title {
  margin-bottom: var(--space-2);
}

.toc-list {
  list-style: none;
  margin: 0;
  padding: 0;
  border-left: 1px solid var(--border);
}

.toc-link {
  display: block;
  padding: 3px 10px;
  margin-left: -1px;
  border-left: 2px solid transparent;
  color: var(--fg-muted);
  font-size: var(--text-sm);
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.level-3 .toc-link {
  padding-left: 22px;
  font-size: var(--text-xs);
}

.toc-link:hover {
  color: var(--fg);
  text-decoration: none;
}

.toc-link.active {
  color: var(--accent);
  border-left-color: var(--accent);
  font-weight: 600;
}
</style>
