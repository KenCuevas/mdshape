import { onBeforeUnmount, ref } from 'vue'

export function useMediaQuery(query: string) {
  const media = typeof window !== 'undefined' ? window.matchMedia(query) : null
  const matches = ref(media?.matches ?? false)
  const listener = (event: MediaQueryListEvent): void => {
    matches.value = event.matches
  }
  media?.addEventListener('change', listener)
  onBeforeUnmount(() => media?.removeEventListener('change', listener))
  return matches
}
