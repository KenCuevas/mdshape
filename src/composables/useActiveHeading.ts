import { onBeforeUnmount, ref, watch, type Ref } from 'vue'

/**
 * Tracks which heading is currently visible inside `container`, for the
 * table of contents highlight. Re-observes whenever `ids` changes.
 */
export function useActiveHeading(container: Ref<HTMLElement | null>, ids: Ref<string[]>) {
  const activeId = ref<string | null>(null)
  let observer: IntersectionObserver | null = null
  let pinnedUntil = 0

  /**
   * Marks a heading as active right away (used when the user clicks the table
   * of contents) and ignores observer updates while the smooth scroll settles,
   * so short documents that cannot scroll far enough still highlight the choice.
   */
  const pin = (id: string): void => {
    activeId.value = id
    pinnedUntil = Date.now() + 1000
  }

  const disconnect = (): void => {
    observer?.disconnect()
    observer = null
  }

  const observe = (): void => {
    disconnect()
    const root = container.value
    if (!root || typeof IntersectionObserver === 'undefined') return
    const elements = ids.value
      .map((id) => root.querySelector<HTMLElement>(`#${CSS.escape(id)}`))
      .filter((element): element is HTMLElement => element !== null)
    if (elements.length === 0) return

    const visible = new Map<string, number>()
    observer = new IntersectionObserver(
      (entries) => {
        if (Date.now() < pinnedUntil) return
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).id
          if (entry.isIntersecting) visible.set(id, entry.boundingClientRect.top)
          else visible.delete(id)
        }
        if (visible.size > 0) {
          const [topMost] = [...visible.entries()].sort((a, b) => a[1] - b[1])
          if (topMost) activeId.value = topMost[0]
          return
        }
        // Nothing intersecting: pick the last heading above the viewport.
        const above = elements.filter((element) => element.getBoundingClientRect().top < 120)
        const last = above[above.length - 1]
        if (last) activeId.value = last.id
      },
      { rootMargin: '-64px 0px -70% 0px', threshold: [0, 1] },
    )
    for (const element of elements) observer.observe(element)
    activeId.value = elements[0]?.id ?? null
  }

  watch([container, ids], observe, { flush: 'post', immediate: true })
  onBeforeUnmount(disconnect)

  return { activeId, pin, refresh: observe }
}
