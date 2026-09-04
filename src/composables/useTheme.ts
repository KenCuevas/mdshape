import { computed, ref, watchEffect } from 'vue'

export type ThemePreference = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

const STORAGE_KEY = 'mdshape.theme'

function readStored(): ThemePreference {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value === 'light' || value === 'dark' ? value : 'system'
  } catch {
    return 'system'
  }
}

const media =
  typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : null
const preference = ref<ThemePreference>(readStored())
const systemDark = ref(media?.matches ?? false)
media?.addEventListener('change', (event) => {
  systemDark.value = event.matches
})

const resolved = computed<ResolvedTheme>(() =>
  preference.value === 'system' ? (systemDark.value ? 'dark' : 'light') : preference.value,
)

let initialized = false

export function useTheme() {
  if (!initialized && typeof document !== 'undefined') {
    initialized = true
    watchEffect(() => {
      document.documentElement.setAttribute('data-theme', resolved.value)
    })
  }

  const setPreference = (value: ThemePreference): void => {
    preference.value = value
    try {
      if (value === 'system') localStorage.removeItem(STORAGE_KEY)
      else localStorage.setItem(STORAGE_KEY, value)
    } catch {
      /* storage unavailable: keep in memory only */
    }
  }

  const toggle = (): void => {
    setPreference(resolved.value === 'dark' ? 'light' : 'dark')
  }

  return { preference, resolved, setPreference, toggle }
}
