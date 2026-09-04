<script setup lang="ts">
import { computed, ref } from 'vue'
import MarkdownContent from '@/components/doc/MarkdownContent.vue'
import TableOfContents from '@/components/doc/TableOfContents.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import { useActiveHeading } from '@/composables/useActiveHeading'
import { useCatalog } from '@/composables/useCatalog'

const props = defineProps<{ slug: string }>()
const { getDoc, fallbackDocs } = useCatalog()

const doc = computed(() => getDoc(props.slug))
const isFallback = computed(() => fallbackDocs.some((page) => page.slug === props.slug))
const article = ref<HTMLElement | null>(null)
const headingIds = computed(() => doc.value?.headings.map((heading) => heading.id) ?? [])
const { activeId, pin } = useActiveHeading(article, headingIds)
</script>

<template>
  <div class="doc-page">
    <EmptyState v-if="!doc" title="Documento no encontrado">
      <p>
        No existe ningún documento con el identificador <code>{{ slug }}</code
        >.
      </p>
    </EmptyState>

    <template v-else>
      <article ref="article" :key="doc.slug" class="doc">
        <header class="doc-header">
          <p class="eyebrow">Documento · {{ doc.sourcePath }}</p>
          <h1 class="page-title">{{ doc.title }}</h1>
          <p v-if="isFallback" class="fallback-note text-sm">
            Este fichero está en <code>epics/</code> pero no encaja con el formato de épica, así que
            se muestra como documento plano.
          </p>
        </header>
        <MarkdownContent :source="doc.markdown" />
      </article>
      <aside v-if="doc.headings.length" class="doc-toc">
        <TableOfContents :headings="doc.headings" :active-id="activeId" @select="pin" />
      </aside>
    </template>
  </div>
</template>

<style scoped>
.doc-page {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 260px;
  gap: var(--space-6);
  width: 100%;
  max-width: calc(var(--reading-width) + 260px + var(--space-6) * 3);
  margin: 0 auto;
  padding: var(--space-5) var(--space-6) var(--space-7);
}

.doc {
  min-width: 0;
  max-width: var(--reading-width);
  font-size: var(--text-base);
}

.doc-header {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-bottom: var(--space-5);
  padding-bottom: var(--space-4);
  border-bottom: 1px solid var(--border);
}

.fallback-note {
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  background: var(--sev-medium-soft);
  color: var(--sev-medium-fg);
}

.fallback-note code {
  background: none;
  padding: 0;
}

.doc-toc {
  position: sticky;
  top: var(--space-5);
  align-self: start;
  max-height: calc(100dvh - var(--space-6));
  overflow-y: auto;
  padding-right: var(--space-2);
}

@media (max-width: 1023px) {
  .doc-page {
    grid-template-columns: minmax(0, 1fr);
    padding: var(--space-4);
  }

  .doc-toc {
    display: none;
  }
}
</style>
