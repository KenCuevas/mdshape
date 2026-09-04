import type { BoardEntries, BoardEntry, BoardStateFile, BoardStatus, Priority } from '@/types'
import { BOARD_STATUSES, PRIORITIES } from '@/types'

export const BOARD_STATE_VERSION = 1

/** A scenario nobody has touched is, by definition, "por probar". */
export function getEntry(entries: BoardEntries, id: string): BoardEntry {
  return entries[id] ?? { status: 'todo', priority: null, note: '', updatedAt: '' }
}

export function isDefaultEntry(entry: BoardEntry): boolean {
  return entry.status === 'todo' && entry.priority === null && entry.note === ''
}

export type BoardPatch = Partial<Pick<BoardEntry, 'status' | 'priority' | 'note'>>

/**
 * Returns a new map with the change applied. An entry that goes back to every
 * default value is removed, so storage and exports only carry real work.
 * `now` is a parameter so the function stays pure and testable.
 */
export function applyChange(
  entries: BoardEntries,
  id: string,
  patch: BoardPatch,
  now: string,
): BoardEntries {
  const next: BoardEntry = { ...getEntry(entries, id), ...patch, updatedAt: now }
  const result = { ...entries }
  if (isDefaultEntry(next)) delete result[id]
  else result[id] = next
  return result
}

/** Newest `updatedAt` wins per scenario; nothing is ever dropped. */
export function mergeEntries(
  base: BoardEntries,
  incoming: BoardEntries,
): { entries: BoardEntries; merged: number } {
  const entries: BoardEntries = { ...base }
  let merged = 0
  for (const [id, entry] of Object.entries(incoming)) {
    merged += 1
    const current = entries[id]
    if (!current || entry.updatedAt > current.updatedAt) entries[id] = entry
  }
  return { entries, merged }
}

export function toStateFile(entries: BoardEntries, now: string): BoardStateFile {
  return { version: BOARD_STATE_VERSION, updatedAt: now, entries }
}

function isEntry(value: unknown): value is BoardEntry {
  if (typeof value !== 'object' || value === null) return false
  const entry = value as Record<string, unknown>
  const priorityOk = entry.priority === null || PRIORITIES.includes(entry.priority as Priority)
  return (
    BOARD_STATUSES.includes(entry.status as BoardStatus) &&
    priorityOk &&
    typeof entry.note === 'string' &&
    typeof entry.updatedAt === 'string'
  )
}

/** Validates anything coming from a file the app did not write. */
export function parseStateFile(
  raw: unknown,
): { ok: true; file: BoardStateFile } | { ok: false; error: string } {
  if (typeof raw !== 'object' || raw === null) {
    return { ok: false, error: 'El fichero no contiene un objeto JSON.' }
  }
  const file = raw as Record<string, unknown>
  if (file.version !== BOARD_STATE_VERSION) {
    return { ok: false, error: `Version de fichero no soportada: ${String(file.version)}.` }
  }
  if (typeof file.entries !== 'object' || file.entries === null) {
    return { ok: false, error: 'El fichero no tiene entradas.' }
  }
  const entries: BoardEntries = {}
  for (const [id, entry] of Object.entries(file.entries as Record<string, unknown>)) {
    if (!isEntry(entry))
      return { ok: false, error: `La entrada ${id} no tiene el formato esperado.` }
    entries[id] = entry
  }
  return {
    ok: true,
    file: {
      version: BOARD_STATE_VERSION,
      updatedAt: typeof file.updatedAt === 'string' ? file.updatedAt : '',
      entries,
    },
  }
}
