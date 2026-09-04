# Tablero de estados tipo Jira — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convertir el tablero de solo lectura en un gestor de trabajo personal, con cuatro columnas de estado (Por probar / En curso / Falla / Pasa), arrastre entre columnas, nota y prioridad por escenario, y persistencia local con exportar/importar.

**Architecture:** El catálogo sigue inmutable y generado en tiempo de compilación. El estado del usuario vive aparte, en un módulo autocontenido de funciones puras (`src/board/`) con una capa fina de Vue encima (`useBoardState()`) que aporta reactividad y acceso a `localStorage`. Catálogo y estado se unen al pintar, nunca mutando el escenario.

**Tech Stack:** Vue 3 (`<script setup>`, TypeScript estricto), Vite, Vitest, ESLint, Prettier. **Sin dependencias nuevas.**

**Spec:** `docs/superpowers/specs/2026-09-04-tablero-jira-personal-design.md`

## Global Constraints

- **Sin dependencias nuevas.** El arrastre usa la API nativa de HTML5. No instalar sortablejs, vuedraggable ni similares.
- **Sin Pinia.** El estado es un singleton a nivel de módulo, igual que `useCatalog()` y `useTheme()`.
- **TypeScript estricto, sin `any`.** El proyecto compila con `vue-tsc --build`.
- **`npm run lint` con `--max-warnings 0`** debe pasar. Cero avisos.
- **Prettier cubre también `docs/` y `*.md`.** Ejecutar `npx prettier --write` sobre cada fichero tocado antes de commitear.
- **Nunca modificar `reviews/` ni `src/content/reviews/`.** Son datos de entrada.
- **Toda escritura a `localStorage` va envuelta en `try/catch`**, siguiendo `src/composables/useTheme.ts`.
- **Clave de almacenamiento:** `mdshape.board` (coherente con `mdshape.theme`).
- **Etiquetas de interfaz en español**, en `src/data/labels.ts`. Nada de texto suelto en los componentes.
- **Las funciones puras no leen el reloj.** La marca de tiempo se pasa como parámetro (`now: string`) para que las pruebas sean deterministas.

---

### Task 1: Tipos y estado puro

**Files:**

- Create: `src/types/board.ts`
- Modify: `src/types/index.ts`
- Create: `src/board/boardState.ts`
- Test: `src/board/__tests__/boardState.test.ts`

**Interfaces:**

- Consumes: nada (primera tarea).
- Produces:
  - `BoardStatus = 'todo' | 'doing' | 'fail' | 'pass'`, `BOARD_STATUSES: readonly BoardStatus[]`
  - `Priority = 'high' | 'medium' | 'low'`, `PRIORITIES: readonly Priority[]`
  - `BoardEntry { status; priority: Priority | null; note: string; updatedAt: string }`
  - `BoardEntries = Record<string, BoardEntry>`
  - `BoardStateFile { version: 1; updatedAt: string; entries: BoardEntries }`
  - `BoardImportResult = { ok: true; merged: number } | { ok: false; error: string }`
  - `getEntry(entries, id): BoardEntry`
  - `isDefaultEntry(entry): boolean`
  - `applyChange(entries, id, patch, now): BoardEntries`
  - `mergeEntries(base, incoming): { entries: BoardEntries; merged: number }`
  - `parseStateFile(raw): { ok: true; file: BoardStateFile } | { ok: false; error: string }`
  - `toStateFile(entries, now): BoardStateFile`

- [ ] **Step 1: Crear los tipos**

Crear `src/types/board.ts`:

```ts
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
```

Añadir a `src/types/index.ts`:

```ts
export type {
  BoardStatus,
  Priority,
  BoardEntry,
  BoardEntries,
  BoardStateFile,
  BoardImportResult,
} from './board'
export { BOARD_STATUSES, PRIORITIES } from './board'
```

- [ ] **Step 2: Escribir las pruebas que fallan**

Crear `src/board/__tests__/boardState.test.ts`:

```ts
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
```

- [ ] **Step 3: Ejecutar las pruebas y ver que fallan**

Run: `npx vitest run src/board`
Expected: FAIL — `Failed to resolve import "../boardState"`.

- [ ] **Step 4: Implementar `boardState.ts`**

Crear `src/board/boardState.ts`:

```ts
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
```

- [ ] **Step 5: Ejecutar las pruebas y ver que pasan**

Run: `npx vitest run src/board`
Expected: PASS, todas.

- [ ] **Step 6: Comprobar tipos, lint y formato**

```bash
npx prettier --write src/types/board.ts src/types/index.ts src/board/
npm run type-check && npm run lint
```

Expected: sin errores ni avisos.

- [ ] **Step 7: Commit**

```bash
git add src/types/board.ts src/types/index.ts src/board/
git commit -m "feat(board): tipos y estado puro del tablero personal"
```

---

### Task 2: Agrupación por columna y orden por prioridad

**Files:**

- Create: `src/board/boardGrouping.ts`
- Test: `src/board/__tests__/boardGrouping.test.ts`

**Interfaces:**

- Consumes: `BoardEntries`, `BoardStatus`, `Priority`, `BOARD_STATUSES` (Task 1); `getEntry` de `boardState.ts` (Task 1); `Scenario` del catálogo existente.
- Produces:
  - `priorityRank(priority: Priority | null): number`
  - `groupByStatus(scenarios: readonly Scenario[], entries: BoardEntries): Record<BoardStatus, Scenario[]>`

- [ ] **Step 1: Escribir las pruebas que fallan**

Crear `src/board/__tests__/boardGrouping.test.ts`:

```ts
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
```

- [ ] **Step 2: Ejecutar y ver que falla**

Run: `npx vitest run src/board/__tests__/boardGrouping.test.ts`
Expected: FAIL — `Failed to resolve import "../boardGrouping"`.

- [ ] **Step 3: Implementar `boardGrouping.ts`**

Crear `src/board/boardGrouping.ts`:

```ts
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
```

- [ ] **Step 4: Ejecutar y ver que pasa**

Run: `npx vitest run src/board`
Expected: PASS.

- [ ] **Step 5: Formato, tipos y lint**

```bash
npx prettier --write src/board/
npm run type-check && npm run lint
```

- [ ] **Step 6: Commit**

```bash
git add src/board/
git commit -m "feat(board): agrupacion por columna y orden por prioridad"
```

---

### Task 3: Composable `useBoardState()`

**Files:**

- Create: `src/composables/useBoardState.ts`
- Test: `src/composables/__tests__/useBoardState.test.ts`

**Interfaces:**

- Consumes: todo lo de Task 1.
- Produces: `useBoardState()` devuelve
  - `entries: Ref<BoardEntries>`
  - `getEntry(id: string): BoardEntry`
  - `setStatus(id: string, status: BoardStatus): void`
  - `setPriority(id: string, priority: Priority | null): void`
  - `setNote(id: string, note: string): void`
  - `exportState(): BoardStateFile`
  - `importState(raw: unknown): BoardImportResult`

- [ ] **Step 1: Escribir las pruebas que fallan**

Crear `src/composables/__tests__/useBoardState.test.ts`. El composable es un singleton a nivel de módulo, así que cada prueba lo reimporta con `vi.resetModules()` para partir de cero:

```ts
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
})
```

- [ ] **Step 2: Ejecutar y ver que falla**

Run: `npx vitest run src/composables`
Expected: FAIL — no se resuelve `@/composables/useBoardState`.

- [ ] **Step 3: Implementar el composable**

Crear `src/composables/useBoardState.ts`:

```ts
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

function readStored(): BoardEntries {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = parseStateFile(JSON.parse(raw))
    return parsed.ok ? parsed.file.entries : {}
  } catch {
    // Unreadable or unavailable storage: start empty rather than fail.
    return {}
  }
}

const entries: Ref<BoardEntries> = ref(readStored())

function persist(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toStateFile(entries.value, now())))
  } catch {
    /* storage unavailable: keep in memory only */
  }
}

function now(): string {
  return new Date().toISOString()
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
```

- [ ] **Step 4: Ejecutar y ver que pasa**

Run: `npx vitest run src/composables`
Expected: PASS.

- [ ] **Step 5: Ejecutar toda la suite (no debe romperse nada)**

Run: `npm run test`
Expected: las 54 pruebas anteriores más las nuevas, todas en verde.

- [ ] **Step 6: Formato, tipos y lint**

```bash
npx prettier --write src/composables/
npm run type-check && npm run lint
```

- [ ] **Step 7: Commit**

```bash
git add src/composables/
git commit -m "feat(board): composable useBoardState con persistencia local"
```

---

### Task 4: Etiquetas y colores de estado y prioridad

**Files:**

- Modify: `src/data/labels.ts`
- Modify: `src/styles/tokens.css` (los colores en crudo)
- Modify: `src/styles/base.css` (las clases que los mapean)
- Test: `src/data/__tests__/labels.test.ts`

**Interfaces:**

- Consumes: `BoardStatus`, `Priority`, `BOARD_STATUSES`, `PRIORITIES` (Task 1).
- Produces:
  - `STATUS_LABELS: Record<BoardStatus, string>`
  - `PRIORITY_LABELS: Record<Priority, string>`
  - `priorityLabel(priority: Priority | null): string`
  - Variables CSS `--status-<estado>`, `--status-<estado>-soft`, `--status-<estado>-fg` y las clases `.status-<estado>`.

- [ ] **Step 1: Escribir la prueba que falla**

Crear `src/data/__tests__/labels.test.ts`:

```ts
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
```

- [ ] **Step 2: Ejecutar y ver que falla**

Run: `npx vitest run src/data`
Expected: FAIL — `STATUS_LABELS` no existe.

- [ ] **Step 3: Añadir las etiquetas**

Añadir al final de `src/data/labels.ts` (y ampliar el `import type` de la primera línea con `BoardStatus` y `Priority`):

```ts
export const STATUS_LABELS: Record<BoardStatus, string> = {
  todo: 'Por probar',
  doing: 'En curso',
  fail: 'Falla',
  pass: 'Pasa',
}

export const PRIORITY_LABELS: Record<Priority, string> = {
  high: 'Alta',
  medium: 'Media',
  low: 'Baja',
}

export function priorityLabel(priority: Priority | null): string {
  return priority ? PRIORITY_LABELS[priority] : 'Sin prioridad'
}
```

- [ ] **Step 4: Añadir los colores**

En `src/styles/tokens.css`, junto al bloque claro de `--type-*` (alrededor de la línea 59):

```css
--status-todo: #64748b;
--status-todo-soft: #eef2f6;
--status-todo-fg: #47536b;
--status-doing: #1d6ff2;
--status-doing-soft: #e2edff;
--status-doing-fg: #1552b8;
--status-fail: #c11f4a;
--status-fail-soft: #ffe1e8;
--status-fail-fg: #8c1535;
--status-pass: #167a3c;
--status-pass-soft: #dcf5e4;
--status-pass-fg: #0f5a2b;
```

Y junto al bloque oscuro (alrededor de la línea 119):

```css
--status-todo: #94a3b8;
--status-todo-soft: #232a35;
--status-todo-fg: #cbd5e1;
--status-doing: #60a5fa;
--status-doing-soft: #12233f;
--status-doing-fg: #bfdbfe;
--status-fail: #fb7195;
--status-fail-soft: #3f1322;
--status-fail-fg: #fecdd3;
--status-pass: #4ade80;
--status-pass-soft: #10301c;
--status-pass-fg: #bbf7d0;
```

- [ ] **Step 4b: Mapear los colores a variables genéricas**

Las clases que mapean color a variable genérica **no viven en `tokens.css` sino en `src/styles/base.css`**, justo debajo del bloque `.type-*` (alrededor de la línea 261, tras el comentario `/* Type / severity variable mapping used by badges, columns and stripes. */`). Añadir ahí, con el mismo formato exacto:

```css
.status-todo {
  --status-color: var(--status-todo);
  --status-soft: var(--status-todo-soft);
  --status-fg: var(--status-todo-fg);
}
.status-doing {
  --status-color: var(--status-doing);
  --status-soft: var(--status-doing-soft);
  --status-fg: var(--status-doing-fg);
}
.status-fail {
  --status-color: var(--status-fail);
  --status-soft: var(--status-fail-soft);
  --status-fg: var(--status-fail-fg);
}
.status-pass {
  --status-color: var(--status-pass);
  --status-soft: var(--status-pass-soft);
  --status-fg: var(--status-pass-fg);
}
```

- [ ] **Step 5: Ejecutar y ver que pasa**

Run: `npx vitest run src/data`
Expected: PASS.

- [ ] **Step 6: Formato, tipos y lint**

```bash
npx prettier --write src/data/ src/styles/tokens.css src/styles/base.css
npm run type-check && npm run lint
```

- [ ] **Step 7: Commit**

```bash
git add src/data/ src/styles/tokens.css src/styles/base.css
git commit -m "feat(board): etiquetas y colores de estado y prioridad"
```

---

### Task 5: Columnas por estado y arrastre

**Files:**

- Modify: `src/views/BoardView.vue`
- Modify: `src/components/board/BoardColumn.vue`
- Modify: `src/components/board/ColumnPicker.vue`
- Modify: `src/components/scenario/ScenarioCard.vue`

**Interfaces:**

- Consumes: `groupByStatus` (Task 2), `useBoardState()` (Task 3), `STATUS_LABELS` y las clases `.status-*` (Task 4).
- Produces: `ScenarioCard` acepta dos props **opcionales** nuevas, `entry?: BoardEntry` y `draggable?: boolean`; sus emits no cambian. `BoardColumn` recibe `status: BoardStatus` en vez de `type` y emite `drop: [id: string]`.

**Aviso para quien implemente:** `ScenarioCard` la reutiliza `ScenarioGroup` desde `EpicView`. Las props nuevas **tienen que ser opcionales** y, si no se pasan, el componente debe comportarse exactamente como hoy. Es lo que mantiene esa vista intacta.

- [ ] **Step 1: Hacer `ScenarioCard` arrastrable y capaz de mostrar prioridad y nota**

En `src/components/scenario/ScenarioCard.vue`, ampliar props y emits:

```ts
import type { BoardEntry, Scenario } from '@/types'
import { priorityLabel } from '@/data/labels'

const props = defineProps<{
  scenario: Scenario
  active?: boolean
  showEpic?: boolean
  entry?: BoardEntry
  draggable?: boolean
}>()

const emit = defineEmits<{ open: [scenario: Scenario, element: HTMLElement | null] }>()

// The dragging class is local state: no parent needs to know about it.
const dragging = ref(false)

function onDragStart(event: DragEvent): void {
  event.dataTransfer?.setData('text/plain', props.scenario.id)
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
  dragging.value = true
}

function onDragEnd(): void {
  dragging.value = false
}
```

En el `<button>`, añadir `:draggable="draggable === true"`, `@dragstart="onDragStart"`, `@dragend="onDragEnd"` y `dragging` a su `:class`. Dentro de `.card-top`, antes del identificador, el indicador de prioridad; y en `.card-bottom`, el icono de nota:

```html
<span
  v-if="entry?.priority"
  class="priority"
  :class="`priority-${entry.priority}`"
  :title="`Prioridad: ${priorityLabel(entry.priority)}`"
>
  <span class="sr-only">{{ priorityLabel(entry.priority) }}</span>
  <span aria-hidden="true">{{ entry.priority === 'low' ? '▼' : '▲' }}</span>
</span>
```

```html
<span v-if="entry?.note" class="has-note" title="Tiene nota">
  <span class="sr-only">Tiene nota</span>
  <span aria-hidden="true">🗒</span>
</span>
```

Estilos: `.priority-high { color: var(--sev-high, var(--type-error)); }`, `.priority-medium`/`.priority-low` más apagados, y `.scenario-card[draggable='true'] { cursor: grab; }` más `.scenario-card.dragging { opacity: 0.5; }`.

- [ ] **Step 2: Convertir `BoardColumn` en columna de estado y zona de destino**

Reescribir el `<script setup>` de `src/components/board/BoardColumn.vue`:

```ts
import { ref } from 'vue'
import type { BoardEntries, BoardStatus, Scenario } from '@/types'
import { STATUS_LABELS } from '@/data/labels'
import { getEntry } from '@/board/boardState'
import ScenarioCard from '@/components/scenario/ScenarioCard.vue'

defineProps<{
  status: BoardStatus
  scenarios: Scenario[]
  entries: BoardEntries
  activeId: string | null
}>()

const emit = defineEmits<{
  open: [scenario: Scenario, element: HTMLElement | null]
  drop: [id: string]
}>()

// dragenter/dragleave also fire for child elements, so the highlight is kept
// with a depth counter instead of a boolean.
const depth = ref(0)
const isOver = ref(false)

function onEnter(): void {
  depth.value += 1
  isOver.value = true
}

function onLeave(): void {
  depth.value = Math.max(0, depth.value - 1)
  if (depth.value === 0) isOver.value = false
}

function onDrop(event: DragEvent): void {
  depth.value = 0
  isOver.value = false
  const id = event.dataTransfer?.getData('text/plain')
  if (id) emit('drop', id)
}
```

En el `<template>`, la `<section>` pasa a `:class="['status-' + status, { 'is-over': isOver }]"`, con `@dragover.prevent`, `@dragenter.prevent="onEnter"`, `@dragleave="onLeave"` y `@drop.prevent="onDrop"`. El título usa `STATUS_LABELS[status]`. Cada `ScenarioCard` recibe `:entry="getEntry(entries, scenario.id)"` y `:draggable="true"`.

En los estilos, sustituir `var(--type-color)`, `var(--type-soft)` y `var(--type-fg)` por `var(--status-color)`, `var(--status-soft)` y `var(--status-fg)`, y añadir:

```css
.column.is-over {
  outline: 2px dashed var(--status-color);
  outline-offset: -2px;
}
```

- [ ] **Step 3: Adaptar `ColumnPicker` a los estados**

Mismo componente, cambiando `ScenarioType`/`SCENARIO_TYPES`/`TYPE_LABELS` por `BoardStatus`/`BOARD_STATUSES`/`STATUS_LABELS`, la clase `type-${type}` por `status-${status}`, y en los estilos las variables `--type-*` por `--status-*`.

- [ ] **Step 4: Conectar `BoardView`**

En `src/views/BoardView.vue`, sustituir el bloque `byType`/`counts` por el agrupado por estado, dejando intacto el `filtered` que ya existe:

```ts
import { BOARD_STATUSES, type BoardStatus } from '@/types'
import { groupByStatus } from '@/board/boardGrouping'
import { useBoardState } from '@/composables/useBoardState'

const board = useBoardState()
// Destructured so the template auto-unwraps it: a ref nested inside a plain
// object is NOT unwrapped in templates, `board.entries` alone would not work.
const { entries } = board
const visibleColumn = ref<BoardStatus>('todo')

const byStatus = computed(() => groupByStatus(filtered.value, entries.value))

const counts = computed(
  () =>
    Object.fromEntries(
      BOARD_STATUSES.map((status) => [status, byStatus.value[status].length]),
    ) as Record<BoardStatus, number>,
)

function onDrop(status: BoardStatus, id: string): void {
  board.setStatus(id, status)
}
```

En el `<template>`, iterar `BOARD_STATUSES` en vez de `SCENARIO_TYPES` y pasar a cada `BoardColumn` el `:status`, `:scenarios="byStatus[status]"`, `:entries="entries"` y `@drop="(id) => onDrop(status, id)"`.

**Importante:** el `watch` que hoy sincroniza `filters.type` con `visibleColumn` hay que **eliminarlo**, porque el filtro por tipo ya no selecciona columna. El resto de `useBoardFilters` no se toca.

- [ ] **Step 5: Comprobar que no se ha roto nada**

```bash
npm run test && npm run type-check && npm run lint
```

Expected: todo en verde. Si falla algo de `EpicView` o `ScenarioGroup`, es que las props nuevas de `ScenarioCard` no quedaron opcionales.

- [ ] **Step 6: Verificación manual (esta tarea no tiene prueba automática)**

```bash
npm run dev
```

En el navegador, comprobar una por una:

1. El tablero muestra cuatro columnas: Por probar, En curso, Falla, Pasa.
2. Al principio los 189 escenarios están en "Por probar".
3. Arrastrar una tarjeta a "Pasa" la mueve y el contador de ambas columnas cambia.
4. La columna bajo el cursor se resalta al arrastrar por encima, y el resaltado **no parpadea** al pasar sobre las tarjetas de dentro.
5. Recargar la página conserva las tarjetas donde estaban.
6. El filtro por tipo de la barra filtra las cuatro columnas a la vez.
7. La vista de una épica (`/epics/auth-login`) sigue exactamente igual que antes.

- [ ] **Step 7: Formato y commit**

```bash
npx prettier --write src/views/BoardView.vue src/components/board/ src/components/scenario/ScenarioCard.vue
git add src/views/BoardView.vue src/components/board/ src/components/scenario/ScenarioCard.vue
git commit -m "feat(board): columnas por estado con arrastre entre columnas"
```

---

### Task 6: Panel lateral con estado, prioridad y nota

**Files:**

- Create: `src/components/scenario/ScenarioTracker.vue`
- Modify: `src/components/scenario/ScenarioDrawer.vue`

**Interfaces:**

- Consumes: `useBoardState()` (Task 3), `STATUS_LABELS`, `PRIORITY_LABELS`, `priorityLabel` (Task 4).
- Produces: componente `ScenarioTracker` con una prop `scenarioId: string`.

- [ ] **Step 1: Crear el componente**

Crear `src/components/scenario/ScenarioTracker.vue`:

```vue
<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { Priority } from '@/types'
import { BOARD_STATUSES, PRIORITIES } from '@/types'
import { PRIORITY_LABELS, STATUS_LABELS } from '@/data/labels'
import { useBoardState } from '@/composables/useBoardState'

const props = defineProps<{ scenarioId: string }>()

const board = useBoardState()
const entry = computed(() => board.getEntry(props.scenarioId))
const note = ref(entry.value.note)
let timer: number | undefined

// Reset the textarea when the panel switches to another scenario.
watch(
  () => props.scenarioId,
  () => {
    flush()
    note.value = entry.value.note
  },
)

function flush(): void {
  window.clearTimeout(timer)
}

/**
 * The panel closes with Escape, so the note is saved while typing (debounced)
 * and again on blur. Escape can never lose what was written.
 */
function onNoteInput(): void {
  window.clearTimeout(timer)
  timer = window.setTimeout(() => board.setNote(props.scenarioId, note.value), 400)
}

function onNoteBlur(): void {
  flush()
  board.setNote(props.scenarioId, note.value)
}

function onPriority(event: Event): void {
  const value = (event.target as HTMLSelectElement).value
  board.setPriority(props.scenarioId, value === '' ? null : (value as Priority))
}

onBeforeUnmount(() => {
  flush()
  if (note.value !== entry.value.note) board.setNote(props.scenarioId, note.value)
})
</script>

<template>
  <section class="tracker" aria-label="Mi seguimiento">
    <h3 class="tracker-title">Mi seguimiento</h3>

    <div class="statuses" role="group" aria-label="Estado">
      <button
        v-for="status in BOARD_STATUSES"
        :key="status"
        type="button"
        class="status-button"
        :class="[`status-${status}`, { active: entry.status === status }]"
        :aria-pressed="entry.status === status"
        @click="board.setStatus(props.scenarioId, status)"
      >
        {{ STATUS_LABELS[status] }}
      </button>
    </div>

    <label class="field">
      <span class="field-label">Prioridad</span>
      <select class="input" :value="entry.priority ?? ''" @change="onPriority">
        <option value="">Sin prioridad</option>
        <option v-for="priority in PRIORITIES" :key="priority" :value="priority">
          {{ PRIORITY_LABELS[priority] }}
        </option>
      </select>
    </label>

    <label class="field">
      <span class="field-label">Mi nota</span>
      <textarea
        v-model="note"
        class="input note"
        rows="3"
        placeholder="Qué viste, cómo reproducirlo…"
        @input="onNoteInput"
        @blur="onNoteBlur"
      />
    </label>
  </section>
</template>

<style scoped>
.tracker {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-3);
  margin-bottom: var(--space-4);
  background: var(--bg-subtle);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.tracker-title {
  font-size: var(--text-sm);
  font-weight: 650;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--fg-muted);
}

.statuses {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 4px;
}

.status-button {
  padding: 6px 8px;
  font-size: var(--text-xs);
  font-weight: 650;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-elevated);
  color: var(--fg-muted);
}

.status-button.active {
  background: var(--status-soft);
  border-color: var(--status-color);
  color: var(--status-fg);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field-label {
  font-size: var(--text-xs);
  color: var(--fg-muted);
}

.note {
  resize: vertical;
  font: inherit;
}
</style>
```

- [ ] **Step 2: Insertarlo en el panel**

En `src/components/scenario/ScenarioDrawer.vue`, importar el componente y colocarlo al principio del cuerpo del panel, antes de `<ScenarioDetails>`:

```html
<ScenarioTracker v-if="scenario" :key="scenario.id" :scenario-id="scenario.id" />
```

El `:key` fuerza el remontaje al cambiar de escenario, que es lo que garantiza que la nota mostrada sea la del escenario abierto.

No hay que tocar la trampa de foco: `FOCUSABLE` ya incluye `button`, `select` y `textarea`.

- [ ] **Step 3: Comprobar que no se ha roto nada**

```bash
npm run test && npm run type-check && npm run lint
```

- [ ] **Step 4: Verificación manual**

```bash
npm run dev
```

1. Abrir una tarjeta: aparece "Mi seguimiento" arriba con los cuatro estados, la prioridad y la nota.
2. Pulsar "Falla": la tarjeta se mueve a esa columna con el panel abierto.
3. Escribir una nota, cerrar con `Escape`, volver a abrir la tarjeta: **la nota sigue ahí**.
4. Poner prioridad Alta a dos tarjetas de la misma columna: suben al principio.
5. Recorrer el panel entero con Tab: el foco no se escapa y llega a los tres controles.
6. Abrir otra tarjeta distinta: la nota mostrada es la suya, no la anterior.

- [ ] **Step 5: Formato y commit**

```bash
npx prettier --write src/components/scenario/
git add src/components/scenario/
git commit -m "feat(board): seguimiento por escenario en el panel lateral"
```

---

### Task 7: Exportar e importar el progreso

**Files:**

- Modify: `src/components/board/BoardToolbar.vue`
- Modify: `src/views/BoardView.vue`

**Interfaces:**

- Consumes: `exportState()` e `importState()` (Task 3).
- Produces: `BoardToolbar` emite `export: []` e `import: [file: File]`, y recibe una prop `message?: { kind: 'ok' | 'error'; text: string } | null`.

- [ ] **Step 1: Añadir los botones a la barra**

En `src/components/board/BoardToolbar.vue`, añadir a las props `message?: { kind: 'ok' | 'error'; text: string } | null`, y a los emits:

```ts
  export: []
  import: [file: File]
```

Y la lógica del selector de fichero:

```ts
const fileInput = ref<HTMLInputElement | null>(null)

function onFileChange(event: Event): void {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) emit('import', file)
  // Reset so choosing the same file twice fires the event again.
  input.value = ''
}
```

En el `<template>`, junto a los filtros:

```html
<div class="io">
  <button type="button" class="button" @click="emit('export')">Exportar progreso</button>
  <button type="button" class="button" @click="fileInput?.click()">Importar</button>
  <input
    ref="fileInput"
    type="file"
    accept="application/json,.json"
    class="sr-only"
    @change="onFileChange"
  />
  <p v-if="message" class="io-message" :class="message.kind" role="status">{{ message.text }}</p>
</div>
```

Estilos: `.io-message.error { color: var(--sev-critical, var(--type-error)); }` y `.io-message.ok { color: var(--type-positive); }`.

- [ ] **Step 2: Conectar en `BoardView`**

En `src/views/BoardView.vue`:

```ts
const message = ref<{ kind: 'ok' | 'error'; text: string } | null>(null)

function onExport(): void {
  const file = board.exportState()
  const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `mdshape-progreso-${new Date().toISOString().slice(0, 10)}.json`
  link.click()
  URL.revokeObjectURL(url)
  const count = Object.keys(file.entries).length
  message.value = { kind: 'ok', text: `Exportadas ${count} tarjetas con seguimiento.` }
}

async function onImport(file: File): Promise<void> {
  try {
    const result = board.importState(JSON.parse(await file.text()))
    message.value = result.ok
      ? { kind: 'ok', text: `Importadas ${result.merged} tarjetas.` }
      : { kind: 'error', text: result.error }
  } catch {
    message.value = { kind: 'error', text: 'El fichero no es JSON válido.' }
  }
}
```

Pasar a `<BoardToolbar>` el `:message="message"`, `@export="onExport"` y `@import="onImport"`.

- [ ] **Step 3: Comprobar que no se ha roto nada**

```bash
npm run test && npm run type-check && npm run lint
```

- [ ] **Step 4: Verificación manual del ciclo completo**

```bash
npm run dev
```

1. Mover tres tarjetas y escribir una nota.
2. "Exportar progreso" descarga `mdshape-progreso-AAAA-MM-DD.json`; abrirlo y comprobar que contiene esas tarjetas.
3. Borrar `mdshape.board` desde las herramientas del navegador y recargar: todo vuelve a "Por probar".
4. "Importar" ese fichero: las tres tarjetas y la nota vuelven a su sitio, con el mensaje "Importadas 3 tarjetas".
5. Importar un `.json` cualquiera que no sea del tablero: aparece un mensaje de error y **el tablero no cambia**.

- [ ] **Step 5: Formato y commit**

```bash
npx prettier --write src/components/board/BoardToolbar.vue src/views/BoardView.vue
git add src/components/board/BoardToolbar.vue src/views/BoardView.vue
git commit -m "feat(board): exportar e importar el progreso en JSON"
```

---

### Task 8: Documentación y verificación final

**Files:**

- Modify: `README.md`

**Interfaces:**

- Consumes: todo lo anterior.
- Produces: nada de código.

- [ ] **Step 1: Documentar el tablero en el README**

En la sección **Views**, sustituir la descripción de **Board** para que refleje que las columnas son de estado, y añadir después de la lista de vistas:

```markdown
### Personal tracking (board state)

The board doubles as a personal task tracker. Each scenario carries a status
(Por probar / En curso / Falla / Pasa), an optional priority and a free-text
note. Cards are dragged between columns with the mouse; on touch screens and
with the keyboard the same change is made from the side panel.

This state is **yours, not the documentation's**: it lives in `localStorage`
under `mdshape.board` and is never written back to the Markdown. Use _Exportar
progreso_ / _Importar_ in the board toolbar to back it up or move it to another
machine; importing merges by `updatedAt`, keeping the most recent entry of each
scenario, so it never destroys work.

Entries whose scenario no longer exists in the Markdown are kept, not deleted:
a renamed or temporarily unparsable file never loses your notes.
```

Añadir a la tabla **Where to change things if the Markdown format changes** —o en una nota junto a ella— la fila:

```markdown
| Board statuses, priorities or their colours | `src/types/board.ts`, `src/data/labels.ts`, `src/styles/tokens.css` |
```

Y en **Project structure**, dentro del árbol, junto a `parsers/`:

```text
├── board/                   pure board-state logic (status, priority, notes)
```

- [ ] **Step 2: Ejecutar la verificación completa**

```bash
npm run test
npm run lint
npm run build
npx prettier --check .
```

Expected: los cuatro sin errores. **No declarar la tarea terminada sin ver la salida de los cuatro.**

- [ ] **Step 3: Repaso manual de no regresión**

```bash
npm run dev
```

1. Inicio: los contadores siguen mostrando 16 épicas y 189 escenarios.
2. Épicas, Hallazgos y Documentos funcionan igual que antes.
3. Tablero: buscar, filtrar por épica, "solo hallazgos" y limpiar filtros siguen funcionando junto a las columnas de estado.
4. Compartir una URL con `?s=LOGIN-P01` sigue abriendo esa tarjeta.
5. En una ventana estrecha (menos de 900 px) el selector de columna elige entre los cuatro estados.

- [ ] **Step 4: Commit**

```bash
npx prettier --write README.md
git add README.md
git commit -m "docs: documentar el seguimiento personal del tablero"
```

---

## Notas para quien implemente

- **Lo que no está cubierto por pruebas automáticas** son los manejadores de arrastre y el paso de fichero a `importState`. Simular `dragstart`/`drop` en jsdom solo demuestra que llamas a tu propia función. Por eso las tareas 5, 6 y 7 llevan una lista de verificación manual explícita: no las des por hechas sin recorrerla.
- **Si `EpicView` se rompe**, la causa casi seguro es que alguna prop nueva de `ScenarioCard` quedó obligatoria.
- **No añadas dependencias.** Si el arrastre se resiste, revisa que la columna llame a `preventDefault()` en `dragover`: sin eso el navegador no dispara `drop`, y es el error más común con esta API.
