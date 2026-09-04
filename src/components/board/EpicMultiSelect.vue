<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { Epic } from '@/types'
import AppIcon from '@/components/ui/AppIcon.vue'

const props = defineProps<{ epics: Epic[]; modelValue: string[] }>()
const emit = defineEmits<{ 'update:modelValue': [value: string[]] }>()

const open = ref(false)
const root = ref<HTMLElement | null>(null)
const trigger = ref<HTMLButtonElement | null>(null)

const label = computed(() => {
  const count = props.modelValue.length
  if (count === 0) return 'Todas las épicas'
  if (count === 1) {
    const epic = props.epics.find((item) => item.slug === props.modelValue[0])
    return epic?.name ?? '1 épica'
  }
  return `${count} épicas`
})

function toggle(slug: string): void {
  const next = props.modelValue.includes(slug)
    ? props.modelValue.filter((item) => item !== slug)
    : [...props.modelValue, slug]
  emit('update:modelValue', next)
}

function clear(): void {
  emit('update:modelValue', [])
}

function onDocumentClick(event: MouseEvent): void {
  if (open.value && root.value && !root.value.contains(event.target as Node)) open.value = false
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && open.value) {
    event.preventDefault()
    open.value = false
    trigger.value?.focus()
  }
}

onMounted(() => document.addEventListener('click', onDocumentClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocumentClick))
</script>

<template>
  <div ref="root" class="multiselect" @keydown="onKeydown">
    <button
      ref="trigger"
      type="button"
      class="btn"
      :class="{ 'has-value': modelValue.length > 0 }"
      :aria-expanded="open"
      aria-haspopup="true"
      aria-controls="epic-multiselect-list"
      @click="open = !open"
    >
      <AppIcon name="filter" :size="16" />
      <span class="label">{{ label }}</span>
      <AppIcon name="chevron-down" :size="14" />
    </button>
    <div v-show="open" id="epic-multiselect-list" class="popover card">
      <div class="popover-head">
        <span class="text-sm muted">Filtrar por épica</span>
        <button
          type="button"
          class="btn btn-ghost small"
          :disabled="modelValue.length === 0"
          @click="clear"
        >
          Ninguna
        </button>
      </div>
      <ul class="options" role="group" aria-label="Épicas">
        <li v-for="epic in epics" :key="epic.slug">
          <label class="option">
            <input
              type="checkbox"
              :checked="modelValue.includes(epic.slug)"
              @change="toggle(epic.slug)"
            />
            <span class="option-name">{{ epic.name }}</span>
            <span class="option-count muted">{{ epic.scenarios.length }}</span>
          </label>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.multiselect {
  position: relative;
}

.btn.has-value {
  border-color: var(--accent);
  color: var(--accent);
}

.label {
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.popover {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 25;
  width: 280px;
  max-height: 360px;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-md);
}

.popover-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px 6px 12px;
  border-bottom: 1px solid var(--border);
}

.small {
  padding: 2px 8px;
  font-size: var(--text-xs);
}

.options {
  list-style: none;
  margin: 0;
  padding: 6px;
  overflow-y: auto;
}

.option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 6px;
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  cursor: pointer;
}

.option:hover {
  background: var(--bg-hover);
}

.option input {
  accent-color: var(--accent);
  margin: 0;
}

.option-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.option-count {
  font-size: var(--text-xs);
  font-variant-numeric: tabular-nums;
}

@media (max-width: 599px) {
  .popover {
    width: min(320px, calc(100vw - 32px));
  }
}
</style>
