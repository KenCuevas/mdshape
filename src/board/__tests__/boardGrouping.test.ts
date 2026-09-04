import { describe, expect, it } from 'vitest'
import type { BoardEntries, Scenario } from '@/types'
import { groupByStatus, priorityRank } from '../boardGrouping'

function scenario(id: string): Scenario {
  return {
    id,
    type: 'positive',
    title: id,
    heading: id,
    epicSlug: 'demo',
    epicName: 'Demo',
    section: null,
    siblingIds: [],
    details: [],
    finding: null,
    searchText: id.toLowerCase(),
  }
}

const T = '2026-09-01T10:00:00.000Z'

describe('priorityRank', () => {
  it('orders high before medium before low before none', () => {
    expect(priorityRank('high')).toBeLessThan(priorityRank('medium'))
    expect(priorityRank('medium')).toBeLessThan(priorityRank('low'))
    expect(priorityRank('low')).toBeLessThan(priorityRank(null))
  })
})

describe('groupByStatus', () => {
  it('puts scenarios with no entry in "por probar"', () => {
    const groups = groupByStatus([scenario('A-P01'), scenario('B-P01')], {})
    expect(groups.todo.map((item) => item.id)).toEqual(['A-P01', 'B-P01'])
    expect(groups.doing).toEqual([])
    expect(groups.fail).toEqual([])
    expect(groups.pass).toEqual([])
  })

  it('sends each scenario to the column of its stored status', () => {
    const entries: BoardEntries = {
      'A-P01': { status: 'pass', priority: null, note: '', updatedAt: T },
      'B-P01': { status: 'fail', priority: null, note: '', updatedAt: T },
    }
    const groups = groupByStatus([scenario('A-P01'), scenario('B-P01')], entries)
    expect(groups.pass.map((item) => item.id)).toEqual(['A-P01'])
    expect(groups.fail.map((item) => item.id)).toEqual(['B-P01'])
  })

  it('sorts a column by priority, high first', () => {
    const entries: BoardEntries = {
      'A-P01': { status: 'todo', priority: 'low', note: '', updatedAt: T },
      'B-P01': { status: 'todo', priority: 'high', note: '', updatedAt: T },
      'C-P01': { status: 'todo', priority: 'medium', note: '', updatedAt: T },
    }
    const groups = groupByStatus([scenario('A-P01'), scenario('B-P01'), scenario('C-P01')], entries)
    expect(groups.todo.map((item) => item.id)).toEqual(['B-P01', 'C-P01', 'A-P01'])
  })

  it('keeps the catalog order between scenarios of the same priority', () => {
    const entries: BoardEntries = {
      'B-P01': { status: 'todo', priority: 'high', note: '', updatedAt: T },
      'A-P01': { status: 'todo', priority: 'high', note: '', updatedAt: T },
    }
    const groups = groupByStatus([scenario('B-P01'), scenario('A-P01')], entries)
    expect(groups.todo.map((item) => item.id)).toEqual(['B-P01', 'A-P01'])
  })

  it('ignores entries whose scenario is not in the catalog', () => {
    const entries: BoardEntries = {
      'GONE-P01': { status: 'pass', priority: null, note: '', updatedAt: T },
    }
    const groups = groupByStatus([scenario('A-P01')], entries)
    expect(groups.pass).toEqual([])
    expect(groups.todo.map((item) => item.id)).toEqual(['A-P01'])
  })
})
