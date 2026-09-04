import { describe, expect, it } from 'vitest'
import type { BoardEntries } from '@/types'
import {
  applyChange,
  getEntry,
  isDefaultEntry,
  mergeEntries,
  parseStateFile,
  toStateFile,
} from '../boardState'

const T1 = '2026-09-01T10:00:00.000Z'
const T2 = '2026-09-02T10:00:00.000Z'

describe('getEntry', () => {
  it('treats a scenario with no entry as "por probar"', () => {
    expect(getEntry({}, 'LOGIN-P01')).toEqual({
      status: 'todo',
      priority: null,
      note: '',
      updatedAt: '',
    })
  })

  it('returns the stored entry when there is one', () => {
    const entries: BoardEntries = {
      'LOGIN-P01': { status: 'pass', priority: 'high', note: 'ok', updatedAt: T1 },
    }
    expect(getEntry(entries, 'LOGIN-P01').status).toBe('pass')
  })
})

describe('applyChange', () => {
  it('creates an entry with the given timestamp', () => {
    const next = applyChange({}, 'LOGIN-P01', { status: 'doing' }, T1)
    expect(next['LOGIN-P01']).toEqual({
      status: 'doing',
      priority: null,
      note: '',
      updatedAt: T1,
    })
  })

  it('does not mutate the entries it receives', () => {
    const entries: BoardEntries = {}
    applyChange(entries, 'LOGIN-P01', { status: 'doing' }, T1)
    expect(entries).toEqual({})
  })

  it('keeps the fields it is not changing', () => {
    const first = applyChange({}, 'LOGIN-P01', { note: 'devuelve 500' }, T1)
    const second = applyChange(first, 'LOGIN-P01', { status: 'fail' }, T2)
    expect(second['LOGIN-P01']).toEqual({
      status: 'fail',
      priority: null,
      note: 'devuelve 500',
      updatedAt: T2,
    })
  })

  it('drops an entry that goes back to every default value', () => {
    const first = applyChange({}, 'LOGIN-P01', { status: 'pass' }, T1)
    const second = applyChange(first, 'LOGIN-P01', { status: 'todo' }, T2)
    expect(second['LOGIN-P01']).toBeUndefined()
  })

  it('keeps an entry that is back to "todo" but still has a note', () => {
    const first = applyChange({}, 'LOGIN-P01', { status: 'pass', note: 'revisar' }, T1)
    const second = applyChange(first, 'LOGIN-P01', { status: 'todo' }, T2)
    expect(second['LOGIN-P01']?.note).toBe('revisar')
  })
})

describe('isDefaultEntry', () => {
  it('is true only when status, priority and note are all default', () => {
    expect(isDefaultEntry({ status: 'todo', priority: null, note: '', updatedAt: T1 })).toBe(true)
    expect(isDefaultEntry({ status: 'todo', priority: 'low', note: '', updatedAt: T1 })).toBe(false)
  })
})

describe('mergeEntries', () => {
  it('keeps the most recent entry of each scenario', () => {
    const base: BoardEntries = {
      'LOGIN-P01': { status: 'todo', priority: null, note: 'viejo', updatedAt: T1 },
    }
    const incoming: BoardEntries = {
      'LOGIN-P01': { status: 'pass', priority: null, note: 'nuevo', updatedAt: T2 },
    }
    expect(mergeEntries(base, incoming).entries['LOGIN-P01']?.note).toBe('nuevo')
  })

  it('keeps the local entry when it is the newer one', () => {
    const base: BoardEntries = {
      'LOGIN-P01': { status: 'pass', priority: null, note: 'nuevo', updatedAt: T2 },
    }
    const incoming: BoardEntries = {
      'LOGIN-P01': { status: 'todo', priority: null, note: 'viejo', updatedAt: T1 },
    }
    expect(mergeEntries(base, incoming).entries['LOGIN-P01']?.note).toBe('nuevo')
  })

  it('keeps entries that only exist on one side, orphans included', () => {
    const base: BoardEntries = {
      'GONE-P01': { status: 'fail', priority: null, note: 'huerfano', updatedAt: T1 },
    }
    const incoming: BoardEntries = {
      'NEW-P01': { status: 'pass', priority: null, note: '', updatedAt: T2 },
    }
    const merged = mergeEntries(base, incoming).entries
    expect(Object.keys(merged).sort()).toEqual(['GONE-P01', 'NEW-P01'])
  })

  it('counts how many entries came in from the import', () => {
    const incoming: BoardEntries = {
      'A-P01': { status: 'pass', priority: null, note: '', updatedAt: T2 },
      'B-P01': { status: 'fail', priority: null, note: '', updatedAt: T2 },
    }
    expect(mergeEntries({}, incoming).merged).toBe(2)
  })
})

describe('parseStateFile', () => {
  it('accepts a file written by toStateFile', () => {
    const file = toStateFile({ 'LOGIN-P01': getEntry({}, 'LOGIN-P01') }, T1)
    const parsed = parseStateFile(JSON.parse(JSON.stringify(file)))
    expect(parsed.ok).toBe(true)
  })

  it('rejects an unknown version', () => {
    const result = parseStateFile({ version: 99, updatedAt: T1, entries: {} })
    expect(result).toEqual({ ok: false, error: expect.stringContaining('Version') })
  })

  it('rejects something that is not an object', () => {
    expect(parseStateFile('hola').ok).toBe(false)
    expect(parseStateFile(null).ok).toBe(false)
  })

  it('rejects an entry with an unknown status', () => {
    const result = parseStateFile({
      version: 1,
      updatedAt: T1,
      entries: { 'LOGIN-P01': { status: 'wat', priority: null, note: '', updatedAt: T1 } },
    })
    expect(result.ok).toBe(false)
  })

  it('rejects an entry that is missing fields', () => {
    const result = parseStateFile({
      version: 1,
      updatedAt: T1,
      entries: { 'LOGIN-P01': { status: 'pass' } },
    })
    expect(result.ok).toBe(false)
  })
})
