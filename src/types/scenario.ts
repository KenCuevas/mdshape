import type { Severity } from './finding'

/** Column of the board. Derived from the letter of the identifier. */
export type ScenarioType = 'positive' | 'negative' | 'security' | 'error'

export type ScenarioLetter = 'P' | 'N' | 'S' | 'E'

export const SCENARIO_TYPES: readonly ScenarioType[] = ['positive', 'negative', 'security', 'error']

export const SCENARIO_TYPE_BY_LETTER: Readonly<Record<ScenarioLetter, ScenarioType>> = {
  P: 'positive',
  N: 'negative',
  S: 'security',
  E: 'error',
}

/**
 * Column used by identifiers that carry no type letter (`INFRA-01`). They are
 * plain checks that assert the system works, so they belong with the positive
 * ones; the board has no fifth column to put them in.
 */
export const UNTYPED_SCENARIO_TYPE: ScenarioType = 'positive'

/** Structured view of an identifier such as `LOGOUT-ALL-P01`. */
export interface ScenarioId {
  raw: string
  prefix: string
  /** `null` for identifiers written without a type letter (`INFRA-01`). */
  letter: ScenarioLetter | null
  number: number
}

/**
 * One bullet of the scenario body. `label` is the bold prefix (`Descripcion`,
 * `Resultado esperado (hoy)`, ...). Content that is not a labelled bullet keeps
 * `label` as `null` and is rendered as plain markdown.
 */
export interface DetailItem {
  label: string | null
  markdown: string
}

/** Finding referenced by a scenario, e.g. `(HALLAZGO SEC-01, critico)`. */
export interface FindingRef {
  id: string
  severity: Severity | null
  /** Text of the marker exactly as it appears in the source. */
  raw: string
}

export interface Scenario {
  /** Identifier, e.g. `LOGIN-P01`. Unique across the catalog. */
  id: string
  type: ScenarioType
  /** Title without the identifier and without the finding marker. */
  title: string
  /** Full heading text, without the leading `###`. */
  heading: string
  epicSlug: string
  epicName: string
  /** `## Pruebas ...` section the scenario was found in, if any. */
  section: string | null
  /** Other identifiers declared in the same heading (they share the content). */
  siblingIds: string[]
  details: DetailItem[]
  finding: FindingRef | null
  /** Lower-cased, accent-stripped text used by the board search. */
  searchText: string
}
