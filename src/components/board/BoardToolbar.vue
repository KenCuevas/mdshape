<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Epic, ScenarioType } from '@/types'
import AppIcon from '@/components/ui/AppIcon.vue'
import EpicMultiSelect from './EpicMultiSelect.vue'
import { TYPE_LABELS } from '@/data/labels'

const props = defineProps<{
  epics: Epic[]
  query: string
  selectedEpics: string[]
  onlyFindings: boolean
  type: ScenarioType | null
  resultCount: number
  totalCount: number
  hasActiveFilters: boolean
  message?: { kind: 'ok' | 'error'; text: string } | null
}>()

const emit = defineEmits<{
  'update:query': [value: string]
  'update:selectedEpics': [value: string[]]
  'update:onlyFindings': [value: boolean]
  'update:type': [value: ScenarioType | null]
  clear: []
  export: []
  import: [file: File]
}>()

const fileInput = ref<HTMLInputElement | null>(null)

function onFileChange(event: Event): void {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) emit('import', file)
  // Reset so choosing the same file twice fires the event again.
  input.value = ''
}

const localQuery = ref(props.query)
let timer: number | undefined

watch(
  () => props.query,
  (value) => {
    if (value !== localQuery.value) localQuery.value = value
  },
)

function onInput(event: Event): void {
  localQuery.value = (event.target as HTMLInputElement).value
  window.clearTimeout(timer)
  timer = window.setTimeout(() => emit('update:query', localQuery.value.trim()), 120)
}

function clearAll(): void {
  localQuery.value = ''
  emit('clear')
}
</script>

<template>
  <div class="toolbar" role="search" aria-label="Filtros del tablero">
    <label class="search">
      <span class="sr-only">Buscar escenarios por identificador, título o contenido</span>
      <AppIcon name="search" :size="16" class="search-icon" />
      <input
        class="input"
        type="search"
        :value="localQuery"
        placeholder="Buscar por identificador, título o contenido…"
        autocomplete="off"
        spellcheck="false"
        @input="onInput"
      />
    </label>

    <EpicMultiSelect
      :epics="epics"
      :model-value="selectedEpics"
      @update:model-value="(value) => emit('update:selectedEpics', value)"
    />

    <label class="switch">
      <input
        type="checkbox"
        role="switch"
        :checked="onlyFindings"
        @change="emit('update:onlyFindings', ($event.target as HTMLInputElement).checked)"
      />
      <span class="switch-track" aria-hidden="true"><span class="switch-thumb" /></span>
      <span class="switch-label">Solo hallazgos</span>
    </label>

    <span v-if="type" class="badge type-badge type-chip" :class="`type-${type}`">
      {{ TYPE_LABELS[type] }}
      <button
        type="button"
        class="chip-remove"
        aria-label="Quitar filtro de tipo"
        @click="emit('update:type', null)"
      >
        <AppIcon name="close" :size="12" />
      </button>
    </span>

    <div class="toolbar-end">
      <span class="count" aria-live="polite">
        <strong>{{ resultCount }}</strong>
        <span class="muted"> de {{ totalCount }}</span>
      </span>
      <button type="button" class="btn btn-ghost" :disabled="!hasActiveFilters" @click="clearAll">
        Limpiar filtros
      </button>
    </div>

    <div class="io">
      <button type="button" class="btn" @click="emit('export')">Exportar progreso</button>
      <button type="button" class="btn" @click="fileInput?.click()">Importar</button>
      <input
        ref="fileInput"
        type="file"
        accept="application/json,.json"
        class="sr-only"
        tabindex="-1"
        aria-label="Importar fichero de progreso"
        @change="onFileChange"
      />
      <p v-if="message" class="io-message" :class="message.kind" role="status">
        {{ message.text }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.search {
  position: relative;
  flex: 1 1 260px;
  min-width: 200px;
  max-width: 480px;
}

.search-icon {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--fg-faint);
  pointer-events: none;
}

.search .input {
  padding-left: 32px;
}

.switch {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: var(--text-sm);
  user-select: none;
}

.switch input {
  position: absolute;
  opacity: 0;
  width: 1px;
  height: 1px;
}

.switch-track {
  width: 34px;
  height: 20px;
  border-radius: 999px;
  background: var(--border-strong);
  position: relative;
  transition: background var(--transition);
}

.switch-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--bg-elevated);
  box-shadow: var(--shadow-sm);
  transition: transform var(--transition);
}

.switch input:checked + .switch-track {
  background: var(--accent);
}

.switch input:checked + .switch-track .switch-thumb {
  transform: translateX(14px);
}

.switch input:focus-visible + .switch-track {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}

.type-chip {
  gap: 4px;
}

.chip-remove {
  display: inline-grid;
  place-items: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  color: inherit;
}

.chip-remove:hover {
  background: color-mix(in srgb, var(--badge-color) 25%, transparent);
}

.toolbar-end {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.count {
  font-size: var(--text-sm);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.io {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.io-message {
  font-size: var(--text-sm);
  margin: 0;
  min-width: 0;
  max-width: 320px;
  white-space: normal;
}

.io-message.error {
  color: var(--sev-critical, var(--type-error));
}

.io-message.ok {
  color: var(--type-positive);
}

@media (max-width: 599px) {
  .toolbar-end {
    margin-left: 0;
    width: 100%;
    justify-content: space-between;
  }
}
</style>
