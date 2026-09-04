<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import type { Scenario } from '@/types'
import AppIcon from '@/components/ui/AppIcon.vue'
import SeverityBadge from '@/components/ui/SeverityBadge.vue'
import TypeBadge from '@/components/ui/TypeBadge.vue'
import ScenarioDetails from './ScenarioDetails.vue'
import ScenarioTracker from './ScenarioTracker.vue'
import { useCatalog } from '@/composables/useCatalog'
import { severityClass, severityLabel } from '@/data/labels'

const props = defineProps<{ scenario: Scenario | null }>()
const emit = defineEmits<{ close: [] }>()

const { getFinding } = useCatalog()
const panel = ref<HTMLElement | null>(null)
const closeButton = ref<HTMLButtonElement | null>(null)

const finding = computed(() =>
  props.scenario?.finding ? getFinding(props.scenario.finding.id) : undefined,
)
const findingSeverity = computed(
  () => props.scenario?.finding?.severity ?? finding.value?.severity ?? null,
)

const FOCUSABLE =
  'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.preventDefault()
    emit('close')
    return
  }
  if (event.key !== 'Tab' || !panel.value) return
  const focusable = [...panel.value.querySelectorAll<HTMLElement>(FOCUSABLE)]
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (!first || !last) return
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

watch(
  () => props.scenario,
  (scenario) => {
    document.body.style.overflow = scenario ? 'hidden' : ''
    if (scenario) {
      void nextTick(() => {
        panel.value?.scrollTo({ top: 0 })
        closeButton.value?.focus()
      })
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <Transition name="drawer">
      <div v-if="scenario" class="drawer-root" @keydown="onKeydown">
        <div class="drawer-overlay" aria-hidden="true" @click="emit('close')" />
        <aside
          ref="panel"
          class="drawer"
          :class="`type-${scenario.type}`"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="`drawer-title-${scenario.id}`"
        >
          <header class="drawer-head">
            <div class="drawer-meta">
              <TypeBadge :type="scenario.type" />
              <span class="mono drawer-id">{{ scenario.id }}</span>
            </div>
            <button
              ref="closeButton"
              type="button"
              class="btn btn-ghost btn-icon"
              aria-label="Cerrar panel"
              @click="emit('close')"
            >
              <AppIcon name="close" :size="20" />
            </button>
          </header>

          <div class="drawer-body">
            <h2 :id="`drawer-title-${scenario.id}`" class="drawer-title">
              {{ scenario.title || scenario.heading }}
            </h2>

            <p class="drawer-epic text-sm">
              <span class="muted">Épica</span>
              <RouterLink class="chip" :to="{ name: 'epic', params: { slug: scenario.epicSlug } }">
                {{ scenario.epicName }}
              </RouterLink>
              <span v-if="scenario.section" class="muted">· {{ scenario.section }}</span>
            </p>

            <p v-if="scenario.siblingIds.length" class="muted text-sm">
              Comparte contenido con
              <span v-for="(id, index) in scenario.siblingIds" :key="id">
                <span class="mono">{{ id }}</span
                ><span v-if="index < scenario.siblingIds.length - 1">, </span>
              </span>
              (mismo encabezado en el documento).
            </p>

            <ScenarioTracker v-if="scenario" :key="scenario.id" :scenario-id="scenario.id" />

            <div
              v-if="scenario.finding"
              class="finding-alert"
              :class="severityClass(findingSeverity)"
            >
              <AppIcon name="alert" />
              <div class="finding-alert-body">
                <p>
                  Documenta el hallazgo
                  <RouterLink
                    v-if="finding"
                    class="mono finding-link"
                    :to="{ name: 'finding', params: { id: finding.id } }"
                  >
                    {{ finding.id }}
                  </RouterLink>
                  <span v-else class="mono">{{ scenario.finding.id }}</span>
                  <SeverityBadge v-if="findingSeverity" :severity="findingSeverity" />
                  <span v-else class="muted">({{ severityLabel(null).toLowerCase() }})</span>
                </p>
                <p v-if="finding" class="text-sm finding-title">{{ finding.title }}</p>
                <p v-else class="text-sm muted">No aparece en findings.md.</p>
                <RouterLink
                  v-if="finding"
                  class="text-sm finding-open"
                  :to="{ name: 'finding', params: { id: finding.id } }"
                >
                  Abrir hallazgo <AppIcon name="arrow-right" :size="14" />
                </RouterLink>
              </div>
            </div>

            <ScenarioDetails :details="scenario.details" />
          </div>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.drawer-root {
  position: fixed;
  inset: 0;
  z-index: 50;
}

.drawer-overlay {
  position: absolute;
  inset: 0;
  background: var(--overlay);
}

.drawer {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: min(560px, 100vw);
  background: var(--bg-elevated);
  border-left: 1px solid var(--border);
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.drawer-head {
  position: sticky;
  top: 0;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  background: var(--bg-elevated);
  border-bottom: 1px solid var(--border);
  border-top: 3px solid var(--type-color);
}

.drawer-meta {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.drawer-id {
  font-weight: 650;
  color: var(--type-fg);
  background: var(--type-soft);
  padding: 2px 8px;
  border-radius: 4px;
}

.drawer-body {
  padding: var(--space-4) var(--space-4) var(--space-6);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.drawer-title {
  font-size: var(--text-lg);
}

.drawer-epic {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.finding-alert {
  display: flex;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius);
  background: var(--badge-soft);
  color: var(--badge-fg);
  border: 1px solid color-mix(in srgb, var(--badge-color) 40%, transparent);
}

.finding-alert .icon {
  color: var(--badge-color);
  margin-top: 2px;
}

.finding-alert-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.finding-alert-body p {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.finding-link {
  font-weight: 650;
  color: inherit;
  text-decoration: underline;
}

.finding-title {
  color: inherit;
}

.finding-open {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-weight: 600;
  color: inherit;
}

.drawer-enter-active,
.drawer-leave-active {
  transition: opacity 160ms ease;
}

.drawer-enter-active .drawer,
.drawer-leave-active .drawer {
  transition: transform 180ms ease;
}

.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;
}

.drawer-enter-from .drawer,
.drawer-leave-to .drawer {
  transform: translateX(24px);
}
</style>
