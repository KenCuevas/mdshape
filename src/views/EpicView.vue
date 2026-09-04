<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import type { Scenario, ScenarioType } from '@/types'
import { SCENARIO_TYPES } from '@/types'
import MarkdownContent from '@/components/doc/MarkdownContent.vue'
import ScenarioDrawer from '@/components/scenario/ScenarioDrawer.vue'
import ScenarioGroup from '@/components/scenario/ScenarioGroup.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import { useBoardState } from '@/composables/useBoardState'
import { useCatalog } from '@/composables/useCatalog'
import { useScenarioDrawer } from '@/composables/useScenarioDrawer'

const props = defineProps<{ slug: string }>()
const { getEpic } = useCatalog()
const epic = computed(() => getEpic(props.slug))
const drawer = useScenarioDrawer()
// Destructured so the template auto-unwraps it: a ref nested inside a plain
// object is NOT unwrapped in templates, `board.entries` alone would not work.
const { entries } = useBoardState()

const groups = computed(() => {
  const current = epic.value
  if (!current) return []
  return SCENARIO_TYPES.map((type) => ({
    type,
    scenarios: current.scenarios.filter((scenario) => scenario.type === type),
  })).filter(
    (group): group is { type: ScenarioType; scenarios: Scenario[] } => group.scenarios.length > 0,
  )
})
</script>

<template>
  <div class="page">
    <EmptyState v-if="!epic" title="Épica no encontrada">
      <p>
        No existe ninguna épica con el identificador <code>{{ slug }}</code
        >. <RouterLink :to="{ name: 'epics' }">Ver todas las épicas</RouterLink>.
      </p>
    </EmptyState>

    <template v-else>
      <header class="page-header">
        <RouterLink class="back text-sm" :to="{ name: 'epics' }">
          <AppIcon name="arrow-left" :size="14" /> Épicas
        </RouterLink>
        <p class="eyebrow">Épica · {{ epic.sourcePath }}</p>
        <h1 class="page-title mono-title">{{ epic.name }}</h1>
        <div v-if="epic.intro" class="intro">
          <MarkdownContent :source="epic.intro" />
        </div>
      </header>

      <section v-if="epic.metadata.length" class="meta card" aria-label="Metadatos">
        <dl class="meta-list">
          <template v-for="item in epic.metadata" :key="item.label">
            <dt>{{ item.label }}</dt>
            <dd><MarkdownContent :source="item.markdown" inline /></dd>
          </template>
        </dl>
      </section>

      <section v-if="epic.endpointsTable" class="block" aria-labelledby="endpoints-title">
        <h2 id="endpoints-title" class="section-title">Endpoints</h2>
        <MarkdownContent :source="epic.endpointsTable" />
      </section>

      <section
        v-for="(section, index) in epic.contractSections"
        :key="index"
        class="block"
        :aria-labelledby="section.title ? `contract-${index}` : undefined"
      >
        <h2 v-if="section.title" :id="`contract-${index}`" class="section-title">
          {{ section.title }}
        </h2>
        <MarkdownContent :source="section.markdown" />
      </section>

      <hr class="divider" />

      <div class="scenarios-head">
        <h2 class="section-title">Escenarios</h2>
        <RouterLink class="text-sm" :to="{ name: 'board', query: { epic: epic.slug } }">
          Ver en el tablero <AppIcon name="arrow-right" :size="14" />
        </RouterLink>
      </div>

      <ScenarioGroup
        v-for="group in groups"
        :key="group.type"
        :type="group.type"
        :scenarios="group.scenarios"
        :entries="entries"
        :active-id="drawer.current.value?.id ?? null"
        @open="drawer.open"
      />

      <ScenarioDrawer :scenario="drawer.current.value" @close="drawer.close" />
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

.mono-title {
  font-family: var(--font-mono);
  letter-spacing: 0;
}

.intro {
  max-width: var(--reading-width);
  color: var(--fg-muted);
}

.meta {
  padding: var(--space-3) var(--space-4);
  margin-bottom: var(--space-5);
}

.meta-list {
  margin: 0;
  display: grid;
  grid-template-columns: max-content minmax(0, 1fr);
  gap: 6px var(--space-4);
  font-size: var(--text-sm);
}

.meta-list dt {
  font-weight: 600;
  color: var(--fg-muted);
}

.meta-list dd {
  margin: 0;
  min-width: 0;
  overflow-wrap: anywhere;
}

.block {
  margin-bottom: var(--space-5);
  max-width: 100%;
}

.divider {
  border: 0;
  border-top: 1px solid var(--border);
  margin: var(--space-5) 0;
}

.scenarios-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.scenarios-head .section-title {
  margin-bottom: 0;
  font-size: var(--text-lg);
}

.scenarios-head a {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

@media (max-width: 599px) {
  .meta-list {
    grid-template-columns: minmax(0, 1fr);
    gap: 2px;
  }

  .meta-list dd {
    margin-bottom: 8px;
  }
}
</style>
