/** Column of the personal board. Unlike `ScenarioType`, this is user state. */
export type BoardStatus = 'todo' | 'doing' | 'fail' | 'pass'

export const BOARD_STATUSES: readonly BoardStatus[] = ['todo', 'doing', 'fail', 'pass']

export type Priority = 'high' | 'medium' | 'low'

export const PRIORITIES: readonly Priority[] = ['high', 'medium', 'low']

/** What the user tracks for one scenario. */
export interface BoardEntry {
  status: BoardStatus
  priority: Priority | null
  note: string
  /** ISO 8601. Used to resolve conflicts when importing. */
  updatedAt: string
}

/** Keyed by scenario id (`LOGIN-P01`). */
export type BoardEntries = Record<string, BoardEntry>

/** Shape of the exported/imported file. */
export interface BoardStateFile {
  version: 1
  updatedAt: string
  entries: BoardEntries
}

export type BoardImportResult = { ok: true; merged: number } | { ok: false; error: string }
