// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'

const KEY = 'mdshape.board'

async function freshStore() {
  vi.resetModules()
  const module = await import('@/composables/useBoardState')
  return module.useBoardState()
}

beforeEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

describe('useBoardState', () => {
  it('starts every scenario as "por probar"', async () => {
    const store = await freshStore()
    expect(store.getEntry('LOGIN-P01').status).toBe('todo')
  })

  it('persists a status change to localStorage', async () => {
    const store = await freshStore()
    store.setStatus('LOGIN-P01', 'pass')
    const stored = JSON.parse(localStorage.getItem(KEY) ?? '{}')
    expect(stored.entries['LOGIN-P01'].status).toBe('pass')
  })

  it('reads back what a previous session stored', async () => {
    const first = await freshStore()
    first.setNote('LOGIN-P01', 'devuelve 500')
    const second = await freshStore()
    expect(second.getEntry('LOGIN-P01').note).toBe('devuelve 500')
  })

  it('keeps working in memory when localStorage throws', async () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('denied')
      },
      setItem: () => {
        throw new Error('denied')
      },
      removeItem: () => {
        throw new Error('denied')
      },
    })
    const store = await freshStore()
    expect(() => store.setStatus('LOGIN-P01', 'fail')).not.toThrow()
    expect(store.getEntry('LOGIN-P01').status).toBe('fail')
  })

  it('reports storage as unavailable when localStorage throws', async () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('denied')
      },
      setItem: () => {
        throw new Error('denied')
      },
      removeItem: () => {
        throw new Error('denied')
      },
    })
    const store = await freshStore()
    expect(store.storageAvailable.value).toBe(false)
  })

  it('reports storage as unavailable when only writing fails', async () => {
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota exceeded')
      },
      removeItem: () => null,
    })
    const store = await freshStore()
    expect(store.storageAvailable.value).toBe(true)
    store.setStatus('LOGIN-P01', 'pass')
    expect(store.storageAvailable.value).toBe(false)
    expect(store.getEntry('LOGIN-P01').status).toBe('pass')
  })

  it('reports storage as available when localStorage works normally', async () => {
    const store = await freshStore()
    expect(store.storageAvailable.value).toBe(true)
  })

  it('ignores a corrupted value in storage instead of crashing', async () => {
    localStorage.setItem(KEY, 'no soy json')
    const store = await freshStore()
    expect(store.getEntry('LOGIN-P01').status).toBe('todo')
  })

  it('exports what has been tracked', async () => {
    const store = await freshStore()
    store.setStatus('LOGIN-P01', 'pass')
    const file = store.exportState()
    expect(file.version).toBe(1)
    expect(file.entries['LOGIN-P01']?.status).toBe('pass')
  })

  it('imports by merging and reports how many entries came in', async () => {
    const store = await freshStore()
    const result = store.importState({
      version: 1,
      updatedAt: '2026-09-02T10:00:00.000Z',
      entries: {
        'OTP-S01': {
          status: 'fail',
          priority: 'high',
          note: 'roto',
          updatedAt: '2026-09-02T10:00:00.000Z',
        },
      },
    })
    expect(result).toEqual({ ok: true, merged: 1 })
    expect(store.getEntry('OTP-S01').note).toBe('roto')
  })

  it('refuses an invalid file and leaves the state untouched', async () => {
    const store = await freshStore()
    store.setStatus('LOGIN-P01', 'pass')
    const result = store.importState({ version: 99, entries: {} })
    expect(result.ok).toBe(false)
    expect(store.getEntry('LOGIN-P01').status).toBe('pass')
  })

  it("adopts another tab's write on a storage event for our key", async () => {
    const store = await freshStore()
    localStorage.setItem(
      KEY,
      JSON.stringify({
        version: 1,
        updatedAt: '2026-09-02T10:00:00.000Z',
        entries: {
          'OTP-S01': {
            status: 'fail',
            priority: 'high',
            note: 'roto en otra pestaña',
            updatedAt: '2026-09-02T10:00:00.000Z',
          },
        },
      }),
    )
    window.dispatchEvent(
      new StorageEvent('storage', { key: KEY, newValue: localStorage.getItem(KEY) }),
    )
    expect(store.getEntry('OTP-S01').status).toBe('fail')
    expect(store.getEntry('OTP-S01').note).toBe('roto en otra pestaña')
  })

  it('ignores a storage event for an unrelated key', async () => {
    const store = await freshStore()
    store.setStatus('LOGIN-P01', 'pass')
    // Simulate the stored value changing under our key without a matching
    // event, as could happen if another key's write shares the same storage.
    // If the handler ignored `event.key`, it would adopt this and flip back to "todo".
    localStorage.setItem(
      KEY,
      JSON.stringify({
        version: 1,
        updatedAt: '2026-09-02T10:00:00.000Z',
        entries: {
          'LOGIN-P01': {
            status: 'todo',
            priority: null,
            note: '',
            updatedAt: '2026-09-02T10:00:00.000Z',
          },
        },
      }),
    )
    window.dispatchEvent(new StorageEvent('storage', { key: 'mdshape.theme', newValue: 'dark' }))
    expect(store.getEntry('LOGIN-P01').status).toBe('pass')
  })
})
