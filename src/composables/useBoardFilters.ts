import { computed } from 'vue'
import { useRoute, useRouter, type LocationQueryRaw, type LocationQueryValue } from 'vue-router'
import type { ScenarioType } from '@/types'
import { SCENARIO_TYPES } from '@/types'

export interface BoardFilters {
  query: string
  epics: string[]
  onlyFindings: boolean
  type: ScenarioType | null
  selected: string | null
}

function first(value: LocationQueryValue | LocationQueryValue[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? ''
  return value ?? ''
}

function all(value: LocationQueryValue | LocationQueryValue[] | undefined): string[] {
  const values = Array.isArray(value) ? value : [value]
  return values
    .flatMap((item) => (item ?? '').split(','))
    .map((item) => item.trim())
    .filter(Boolean)
}

/**
 * Board filter state, stored entirely in the URL query so a filtered board
 * can be shared as a link. Keys: `q`, `epic` (repeatable), `findings=1`,
 * `type`, `s` (scenario open in the side panel).
 */
export function useBoardFilters() {
  const route = useRoute()
  const router = useRouter()

  const filters = computed<BoardFilters>(() => {
    const typeValue = first(route.query.type)
    return {
      query: first(route.query.q),
      epics: all(route.query.epic),
      onlyFindings: first(route.query.findings) === '1',
      type: (SCENARIO_TYPES as readonly string[]).includes(typeValue)
        ? (typeValue as ScenarioType)
        : null,
      selected: first(route.query.s) || null,
    }
  })

  const update = (patch: Partial<BoardFilters>): void => {
    const next: BoardFilters = { ...filters.value, ...patch }
    const query: LocationQueryRaw = {}
    if (next.query) query.q = next.query
    if (next.epics.length) query.epic = next.epics
    if (next.onlyFindings) query.findings = '1'
    if (next.type) query.type = next.type
    if (next.selected) query.s = next.selected
    void router.replace({ query })
  }

  const clear = (): void => {
    update({ query: '', epics: [], onlyFindings: false, type: null })
  }

  const hasActiveFilters = computed(
    () =>
      filters.value.query !== '' ||
      filters.value.epics.length > 0 ||
      filters.value.onlyFindings ||
      filters.value.type !== null,
  )

  return { filters, update, clear, hasActiveFilters }
}
