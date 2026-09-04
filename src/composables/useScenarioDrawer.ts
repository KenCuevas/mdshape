import { nextTick, ref, shallowRef } from 'vue'
import type { Scenario } from '@/types'

/**
 * Local state for the scenario side panel: which scenario is open and which
 * element should receive focus back when it closes.
 */
export function useScenarioDrawer(onChange?: (scenario: Scenario | null) => void) {
  const current = shallowRef<Scenario | null>(null)
  const trigger = ref<HTMLElement | null>(null)

  const open = (scenario: Scenario, element?: HTMLElement | null): void => {
    trigger.value = element ?? (document.activeElement as HTMLElement | null)
    current.value = scenario
    onChange?.(scenario)
  }

  const close = (): void => {
    if (!current.value) return
    const id = current.value.id
    current.value = null
    onChange?.(null)
    void nextTick(() => {
      const target =
        trigger.value?.isConnected === true
          ? trigger.value
          : document.querySelector<HTMLElement>(`[data-scenario-id="${id}"]`)
      target?.focus()
      trigger.value = null
    })
  }

  return { current, open, close }
}
