import type { BoardEntries, BoardStatus, Priority, Scenario } from '@/types'
import { BOARD_STATUSES, PRIORITIES } from '@/types'
import { getEntry } from './boardState'

/** High first, "sin prioridad" last. */
export function priorityRank(priority: Priority | null): number {
  return priority ? PRIORITIES.indexOf(priority) : PRIORITIES.length
}

/**
 * Splits the scenarios into the four board columns and orders each one by
 * priority. `Array.prototype.sort` is stable, so scenarios of the same
 * priority keep the catalog order.
 */
export function groupByStatus(
  scenarios: readonly Scenario[],
  entries: BoardEntries,
): Record<BoardStatus, Scenario[]> {
  const groups = Object.fromEntries(
    BOARD_STATUSES.map((status) => [status, [] as Scenario[]]),
  ) as Record<BoardStatus, Scenario[]>
  for (const scenario of scenarios) {
    groups[getEntry(entries, scenario.id).status].push(scenario)
  }
  for (const status of BOARD_STATUSES) {
    groups[status].sort(
      (a, b) =>
        priorityRank(getEntry(entries, a.id).priority) -
        priorityRank(getEntry(entries, b.id).priority),
    )
  }
  return groups
}
