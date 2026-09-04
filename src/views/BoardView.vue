<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Scenario } from '@/types'
import { BOARD_STATUSES, type BoardStatus } from '@/types'
import { groupByStatus } from '@/board/boardGrouping'
import BoardColumn from '@/components/board/BoardColumn.vue'
import BoardToolbar from '@/components/board/BoardToolbar.vue'
import ColumnPicker from '@/components/board/ColumnPicker.vue'
import ScenarioDrawer from '@/components/scenario/ScenarioDrawer.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import { useBoardFilters } from '@/composables/useBoardFilters'
import { useBoardState } from '@/composables/useBoardState'
import { useCatalog } from '@/composables/useCatalog'
import { useMediaQuery } from '@/composables/useMediaQuery'
import { useScenarioDrawer } from '@/composables/useScenarioDrawer'
import { normalizeText } from '@/utils/text'

const { scenarios, epics, getScenario } = useCatalog()
const { filters, update, clear, hasActiveFilters } = useBoardFilters()
const isNarrow = useMediaQuery('(max-width: 899px)')
const board = useBoardState()
// Destructured so the template auto-unwraps them: a ref nested inside a plain
// object is NOT unwrapped in templates, `board.entries` alone would not work.
const { entries, storageAvailable } = board
const visibleColumn = ref<BoardStatus>('todo')

const filtered = computed<Scenario[]>(() => {
  const { query, epics: selectedEpics, onlyFindings, type } = filters.value
  const needle = normalizeText(query)
  return scenarios.filter(
    (scenario) =>
      (needle === '' || scenario.searchText.includes(needle)) &&
      (selectedEpics.length === 0 || selectedEpics.includes(scenario.epicSlug)) &&
      (!onlyFindings || scenario.finding !== null) &&
      (type === null || scenario.type === type),
  )
})

const byStatus = computed(() => groupByStatus(filtered.value, entries.value))

const counts = computed(
  () =>
    Object.fromEntries(
      BOARD_STATUSES.map((status) => [status, byStatus.value[status].length]),
    ) as Record<BoardStatus, number>,
)

function onDrop(status: BoardStatus, id: string): void {
  // The drop payload is untrusted and its casing is not guaranteed. Resolve it
  // to a real scenario and store that scenario's canonical id, never the raw
  // string: an entry keyed by anything else would be invisible and permanent.
  const scenario = getScenario(id)
  if (!scenario) return
  board.setStatus(scenario.id, status)
}

const message = ref<{ kind: 'ok' | 'error'; text: string } | null>(null)

// Spanish card counts need singular/plural agreement ("1 tarjeta" vs. "2 tarjetas").
function cardWord(count: number): string {
  return count === 1 ? 'tarjeta' : 'tarjetas'
}

function onExport(): void {
  const file = board.exportState()
  const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `mdshape-progreso-${new Date().toISOString().slice(0, 10)}.json`
  link.click()
  URL.revokeObjectURL(url)
  const count = Object.keys(file.entries).length
  message.value = { kind: 'ok', text: `Exportadas ${count} ${cardWord(count)} con seguimiento.` }
}

async function onImport(file: File): Promise<void> {
  try {
    const result = board.importState(JSON.parse(await file.text()))
    message.value = result.ok
      ? { kind: 'ok', text: `Importadas ${result.merged} ${cardWord(result.merged)}.` }
      : { kind: 'error', text: result.error }
  } catch {
    message.value = { kind: 'error', text: 'El fichero no es JSON válido.' }
  }
}

const drawer = useScenarioDrawer((scenario) => update({ selected: scenario?.id ?? null }))

// Open the panel when the URL carries `?s=<id>` (shared links, back/forward).
watch(
  () => filters.value.selected,
  (id) => {
    if (!id) {
      drawer.current.value = null
      return
    }
    if (drawer.current.value?.id === id) return
    drawer.current.value = getScenario(id) ?? null
  },
  { immediate: true },
)
</script>

<template>
  <div class="board-page">
    <header class="board-header">
      <div class="board-heading">
        <h1 class="page-title">Tablero de escenarios</h1>
        <p class="muted text-sm">
          La columna la determina tu progreso: arrastra una tarjeta para cambiarla de estado.
        </p>
      </div>
      <p v-if="!storageAvailable" class="storage-warning" role="status">
        El navegador no está guardando tu progreso: los cambios se perderán al recargar la página.
        Exporta el progreso para conservarlo.
      </p>
      <BoardToolbar
        :epics="epics"
        :query="filters.query"
        :selected-epics="filters.epics"
        :only-findings="filters.onlyFindings"
        :type="filters.type"
        :result-count="filtered.length"
        :total-count="scenarios.length"
        :has-active-filters="hasActiveFilters"
        :message="message"
        @update:query="(value) => update({ query: value })"
        @update:selected-epics="(value) => update({ epics: value })"
        @update:only-findings="(value) => update({ onlyFindings: value })"
        @update:type="(value) => update({ type: value })"
        @clear="clear"
        @export="onExport"
        @import="onImport"
      />
      <ColumnPicker v-if="isNarrow" v-model="visibleColumn" :counts="counts" />
    </header>

    <EmptyState v-if="scenarios.length === 0" title="No hay escenarios">
      <p>Sincroniza la documentación con <code>npm run sync:docs</code> para llenar el tablero.</p>
    </EmptyState>

    <div v-else class="board" :class="{ narrow: isNarrow }">
      <BoardColumn
        v-for="status in BOARD_STATUSES"
        v-show="!isNarrow || visibleColumn === status"
        :key="status"
        :status="status"
        :scenarios="byStatus[status]"
        :entries="entries"
        :active-id="drawer.current.value?.id ?? null"
        @open="drawer.open"
        @drop="(id) => onDrop(status, id)"
      />
    </div>

    <ScenarioDrawer :scenario="drawer.current.value" @close="drawer.close" />
  </div>
</template>

<style scoped>
.board-page {
  display: flex;
  flex-direction: column;
  height: calc(100dvh - var(--topbar-height) * 0);
  min-height: 0;
  padding: var(--space-4) var(--space-5) var(--space-4);
  gap: var(--space-3);
}

.board-header {
  flex: none;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.board-heading {
  display: flex;
  align-items: baseline;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.storage-warning {
  margin: 0;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-sm);
  background: var(--sev-high-soft);
  color: var(--sev-high-fg);
  font-size: var(--text-sm);
}

.board {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-3);
}

.board.narrow {
  grid-template-columns: minmax(0, 1fr);
}

@media (max-width: 899px) {
  .board-page {
    height: calc(100dvh - var(--topbar-height));
    padding: var(--space-3);
  }

  .board-heading .muted {
    display: none;
  }
}
</style>
