<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { Severity } from '@/types'
import { SEVERITIES } from '@/types'
import FindingCard from '@/components/findings/FindingCard.vue'
import MarkdownContent from '@/components/doc/MarkdownContent.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import { useCatalog } from '@/composables/useCatalog'
import { SEVERITY_LABELS } from '@/data/labels'

const route = useRoute()
const router = useRouter()
const { findings, findingsDoc, stats, scenariosForFinding } = useCatalog()

const severityFilter = computed<Severity | null>(() => {
  const value = Array.isArray(route.query.severity) ? route.query.severity[0] : route.query.severity
  return (SEVERITIES as readonly string[]).includes(value ?? '') ? (value as Severity) : null
})

const visible = computed(() =>
  severityFilter.value
    ? findings.filter((finding) => finding.severity === severityFilter.value)
    : findings,
)

function setSeverity(severity: Severity | null): void {
  void router.replace({ query: severity ? { severity } : {} })
}
</script>

<template>
  <div class="page">
    <header class="page-header">
      <p class="eyebrow">
        Hallazgos<span v-if="findingsDoc"> · {{ findingsDoc.sourcePath }}</span>
      </p>
      <h1 class="page-title">{{ findingsDoc?.title ?? 'Hallazgos' }}</h1>
      <div v-if="findingsDoc?.intro" class="intro">
        <MarkdownContent :source="findingsDoc.intro" />
      </div>
    </header>

    <EmptyState v-if="findings.length === 0" title="No hay hallazgos">
      <p>No se ha encontrado <code>findings.md</code> o no contiene secciones con identificador.</p>
    </EmptyState>

    <template v-else>
      <div class="filters" role="group" aria-label="Filtrar por severidad">
        <button
          type="button"
          class="filter"
          :class="{ active: severityFilter === null }"
          @click="setSeverity(null)"
        >
          Todas <span class="filter-count">{{ findings.length }}</span>
        </button>
        <button
          v-for="severity in SEVERITIES"
          :key="severity"
          type="button"
          class="filter"
          :class="[`sev-${severity}`, { active: severityFilter === severity }]"
          :aria-pressed="severityFilter === severity"
          @click="setSeverity(severityFilter === severity ? null : severity)"
        >
          <span class="dot" aria-hidden="true" />
          {{ SEVERITY_LABELS[severity] }}
          <span class="filter-count">{{ stats.findingsBySeverity[severity] }}</span>
        </button>
      </div>

      <div class="grid">
        <FindingCard
          v-for="finding in visible"
          :key="finding.id"
          :finding="finding"
          :scenario-count="scenariosForFinding(finding.id).length"
        />
      </div>
      <p v-if="visible.length === 0" class="muted">No hay hallazgos con esa severidad.</p>

      <section
        v-for="(section, index) in findingsDoc?.extraSections ?? []"
        :key="index"
        class="extra"
        :aria-labelledby="`extra-${index}`"
      >
        <h2 :id="`extra-${index}`" class="section-title">{{ section.title }}</h2>
        <MarkdownContent :source="section.markdown" />
      </section>
    </template>
  </div>
</template>

<style scoped>
.intro {
  max-width: var(--reading-width);
  color: var(--fg-muted);
}

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
}

.filter {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid var(--border-strong);
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--fg-muted);
  background: var(--bg-elevated);
}

.filter:hover {
  background: var(--bg-hover);
}

.filter.active {
  background: var(--badge-soft, var(--accent-soft));
  color: var(--badge-fg, var(--accent));
  border-color: var(--badge-color, var(--accent));
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--badge-color);
}

.filter-count {
  font-variant-numeric: tabular-nums;
  opacity: 0.75;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--space-3);
}

.extra {
  margin-top: var(--space-6);
  max-width: var(--reading-width);
}
</style>
