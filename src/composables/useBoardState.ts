import { ref, type Ref } from 'vue'
import type {
  BoardEntries,
  BoardEntry,
  BoardImportResult,
  BoardStateFile,
  BoardStatus,
  Priority,
} from '@/types'
import {
  applyChange,
  getEntry as readEntry,
  mergeEntries,
  parseStateFile,
  toStateFile,
  type BoardPatch,
} from '@/board/boardState'

const STORAGE_KEY = 'mdshape.board'

// Whether localStorage can actually be read from/written to. Starts true and
// flips to false the moment either side proves otherwise, so the UI can warn
// the user instead of silently degrading to memory-only tracking.
const storageAvailable: Ref<boolean> = ref(true)

function readStored(): BoardEntries {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = parseStateFile(JSON.parse(raw))
    return parsed.ok ? parsed.file.entries : {}
  } catch {
    // Unreadable or unavailable storage: start empty rather than fail.
    storageAvailable.value = false
    return {}
  }
}

const entries: Ref<BoardEntries> = ref(readStored())

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY) return
    // Another tab wrote: adopt its state instead of overwriting it on our
    // next save. `storage` never fires in the tab that did the writing.
    entries.value = readStored()
  })
}

function now(): string {
  return new Date().toISOString()
}

function persist(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toStateFile(entries.value, now())))
  } catch {
    // Storage unavailable: keep in memory only, but surface it to the UI.
    storageAvailable.value = false
  }
}

function change(id: string, patch: BoardPatch): void {
  entries.value = applyChange(entries.value, id, patch, now())
  persist()
}

/**
 * The user's own board state. Module-level singleton, same pattern as
 * `useCatalog()` and `useTheme()`; all the logic lives in `@/board/boardState`.
 */
export function useBoardState() {
  return {
    entries,
    storageAvailable,
    getEntry: (id: string): BoardEntry => readEntry(entries.value, id),
    setStatus: (id: string, status: BoardStatus): void => change(id, { status }),
    setPriority: (id: string, priority: Priority | null): void => change(id, { priority }),
    setNote: (id: string, note: string): void => change(id, { note }),
    exportState: (): BoardStateFile => toStateFile(entries.value, now()),
    importState: (raw: unknown): BoardImportResult => {
      const parsed = parseStateFile(raw)
      if (!parsed.ok) return { ok: false, error: parsed.error }
      const { entries: next, merged } = mergeEntries(entries.value, parsed.file.entries)
      entries.value = next
      persist()
      return { ok: true, merged }
    },
  }
}
