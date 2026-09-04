import { describe, expect, it } from 'vitest'
import { BOARD_STATUSES, PRIORITIES } from '@/types'
import { PRIORITY_LABELS, STATUS_LABELS, priorityLabel } from '@/data/labels'

describe('board labels', () => {
  it('has a label for every board status', () => {
    for (const status of BOARD_STATUSES) {
      expect(STATUS_LABELS[status]).toBeTruthy()
    }
  })

  it('has a label for every priority', () => {
    for (const priority of PRIORITIES) {
      expect(PRIORITY_LABELS[priority]).toBeTruthy()
    }
  })

  it('names the absence of priority', () => {
    expect(priorityLabel(null)).toBe('Sin prioridad')
    expect(priorityLabel('high')).toBe('Alta')
  })
})
