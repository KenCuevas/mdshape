<script setup lang="ts">
import { RouterLink } from 'vue-router'
import AppIcon from '@/components/ui/AppIcon.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import StatCard from '@/components/ui/StatCard.vue'
import { useCatalog } from '@/composables/useCatalog'
import { SCENARIO_TYPES, SEVERITIES } from '@/types'
import { SEVERITY_LABELS, TYPE_LABELS } from '@/data/labels'

const { stats, docs, findingsDoc, isEmpty, catalog } = useCatalog()

const quickLinks = [
  {
    name: 'board',
    label: 'Tablero de escenarios',
    text: 'Los escenarios en cuatro columnas por tipo, con búsqueda y filtros.',
    icon: 'board',
  },
  {
    name: 'epics',
    label: 'Épicas',
    text: 'Cada épica con su contrato, sus endpoints y sus escenarios.',
    icon: 'epic',
  },
  {
    name: 'findings',
    label: 'Hallazgos',
    text: 'Problemas encontrados, ordenados por severidad.',
    icon: 'finding',
  },
] as const
</script>

<template>
  <div class="page">
    <header class="page-header">
      <p class="eyebrow">Documentación de QA</p>
      <h1 class="page-title">Resumen</h1>
      <p class="page-lead">
        Cifras calculadas a partir de los ficheros markdown sincronizados. Cada una enlaza con su
        vista.
      </p>
    </header>

    <EmptyState v-if="isEmpty" title="No hay documentación sincronizada">
      <p>
        Copia la carpeta <code>reviews/</code> en la raíz del proyecto y ejecuta
        <code>npm run sync:docs</code>. Después reinicia <code>npm run dev</code>.
      </p>
    </EmptyState>

    <template v-else>
      <section class="stats" aria-label="Cifras generales">
        <StatCard label="Épicas" :value="stats.epics" :to="{ name: 'epics' }" />
        <StatCard label="Escenarios" :value="stats.scenarios" :to="{ name: 'board' }" />
        <StatCard label="Hallazgos" :value="stats.findings" :to="{ name: 'findings' }" />
        <StatCard
          label="Escenarios que documentan un hallazgo"
          :value="stats.scenariosWithFinding"
          :to="{ name: 'board', query: { findings: '1' } }"
        />
      </section>

      <div class="stat-groups">
        <section aria-labelledby="by-type">
          <h2 id="by-type" class="section-title">Escenarios por tipo</h2>
          <div class="stats small">
            <StatCard
              v-for="type in SCENARIO_TYPES"
              :key="type"
              :label="TYPE_LABELS[type]"
              :value="stats.scenariosByType[type]"
              :to="{ name: 'board', query: { type } }"
              :color-class="`type-${type}`"
              small
            />
          </div>
        </section>

        <section aria-labelledby="by-severity">
          <h2 id="by-severity" class="section-title">Hallazgos por severidad</h2>
          <div class="stats small">
            <StatCard
              v-for="severity in SEVERITIES"
              :key="severity"
              :label="SEVERITY_LABELS[severity]"
              :value="stats.findingsBySeverity[severity]"
              :to="{ name: 'findings', query: { severity } }"
              :color-class="`sev-${severity}`"
              small
            />
          </div>
        </section>
      </div>

      <section class="quick" aria-label="Accesos directos">
        <RouterLink
          v-for="link in quickLinks"
          :key="link.name"
          class="quick-link card"
          :to="{ name: link.name }"
        >
          <AppIcon :name="link.icon" :size="22" class="quick-icon" />
          <span class="quick-body">
            <span class="quick-title">{{ link.label }}</span>
            <span class="muted text-sm">{{ link.text }}</span>
          </span>
          <AppIcon name="arrow-right" :size="18" class="quick-arrow" />
        </RouterLink>
      </section>

      <section v-if="docs.length" class="docs" aria-labelledby="docs-title">
        <h2 id="docs-title" class="section-title">Documentos</h2>
        <ul class="doc-list">
          <li v-for="doc in docs" :key="doc.slug">
            <RouterLink :to="{ name: 'doc', params: { slug: doc.slug } }">{{
              doc.title
            }}</RouterLink>
            <span class="muted text-sm"> · {{ doc.sourcePath }}</span>
          </li>
          <li v-if="findingsDoc">
            <RouterLink :to="{ name: 'findings' }">{{ findingsDoc.title }}</RouterLink>
            <span class="muted text-sm"> · {{ findingsDoc.sourcePath }}</span>
          </li>
        </ul>
      </section>

      <section v-if="catalog.warnings.length" class="warnings" aria-labelledby="warnings-title">
        <h2 id="warnings-title" class="section-title">Avisos del parser</h2>
        <ul class="warning-list text-sm">
          <li v-for="(warning, index) in catalog.warnings" :key="index">
            <span class="mono">{{ warning.sourcePath }}</span
            >: {{ warning.message }}
          </li>
        </ul>
      </section>
    </template>
  </div>
</template>

<style scoped>
.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--space-3);
  margin-bottom: var(--space-5);
}

.stats.small {
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
}

.stat-groups {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--space-5);
}

.quick {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: var(--space-3);
  margin-bottom: var(--space-6);
}

.quick-link {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4);
  color: var(--fg);
  transition: box-shadow var(--transition);
}

.quick-link:hover {
  text-decoration: none;
  box-shadow: var(--shadow-md);
}

.quick-icon {
  color: var(--accent);
}

.quick-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}

.quick-title {
  font-weight: 600;
}

.quick-arrow {
  color: var(--fg-faint);
}

.doc-list,
.warning-list {
  margin: 0;
  padding-left: 1.2em;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.warnings {
  margin-top: var(--space-6);
  padding: var(--space-4);
  border-radius: var(--radius);
  background: var(--sev-medium-soft);
  color: var(--sev-medium-fg);
}
</style>
