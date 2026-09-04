<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import MarkdownContent from '@/components/doc/MarkdownContent.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import SeverityBadge from '@/components/ui/SeverityBadge.vue'
import TypeBadge from '@/components/ui/TypeBadge.vue'
import { useCatalog } from '@/composables/useCatalog'
import { severityClass } from '@/data/labels'

const props = defineProps<{ id: string }>()
const { getFinding, scenariosForFinding } = useCatalog()

const finding = computed(() => getFinding(props.id))
const evidence = computed(() => scenariosForFinding(props.id))
</script>

<template>
  <div class="page">
    <EmptyState v-if="!finding" title="Hallazgo no encontrado">
      <p>
        <code>{{ id }}</code> no aparece en <code>findings.md</code>.
        <RouterLink :to="{ name: 'findings' }">Ver todos los hallazgos</RouterLink>.
      </p>
    </EmptyState>

    <template v-else>
      <header class="page-header" :class="severityClass(finding.severity)">
        <RouterLink class="back text-sm" :to="{ name: 'findings' }">
          <AppIcon name="arrow-left" :size="14" /> Hallazgos
        </RouterLink>
        <div class="badges">
          <span class="mono finding-id">{{ finding.id }}</span>
          <SeverityBadge :severity="finding.severity" />
          <span v-if="finding.area" class="chip">{{ finding.area }}</span>
        </div>
        <h1 class="page-title">{{ finding.title }}</h1>
      </header>

      <div class="layout">
        <article class="body">
          <MarkdownContent :source="finding.body" />
        </article>

        <aside class="evidence card" aria-labelledby="evidence-title">
          <h2 id="evidence-title" class="section-title">Escenarios que lo evidencian</h2>
          <p v-if="evidence.length === 0" class="muted text-sm">
            Ningún escenario del catálogo menciona este hallazgo.
          </p>
          <ul v-else class="evidence-list">
            <li v-for="scenario in evidence" :key="scenario.id">
              <RouterLink
                class="evidence-link"
                :class="`type-${scenario.type}`"
                :to="{ name: 'board', query: { s: scenario.id } }"
              >
                <span class="mono evidence-id">{{ scenario.id }}</span>
                <span class="evidence-title">{{ scenario.title || scenario.heading }}</span>
                <span class="evidence-meta">
                  <TypeBadge :type="scenario.type" />
                  <span class="chip">{{ scenario.epicName }}</span>
                </span>
              </RouterLink>
            </li>
          </ul>
        </aside>
      </div>
    </template>
  </div>
</template>

<style scoped>
.back {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--fg-muted);
  margin-bottom: var(--space-2);
}

.badges {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.finding-id {
  font-size: var(--text-sm);
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--badge-soft);
  color: var(--badge-fg);
}

.layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: var(--space-5);
  align-items: start;
}

.body {
  max-width: var(--reading-width);
  min-width: 0;
}

.evidence {
  padding: var(--space-4);
  position: sticky;
  top: var(--space-4);
}

.evidence-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.evidence-link {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 10px 8px 12px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  border-left: 3px solid var(--type-color);
  color: var(--fg);
  background: var(--bg-elevated);
}

.evidence-link:hover {
  text-decoration: none;
  background: var(--bg-hover);
}

.evidence-id {
  font-weight: 650;
  color: var(--type-fg);
}

.evidence-title {
  font-size: var(--text-sm);
}

.evidence-meta {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

@media (max-width: 1023px) {
  .layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .evidence {
    position: static;
  }
}
</style>
