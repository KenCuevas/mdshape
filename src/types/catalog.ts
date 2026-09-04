import type { DocPage } from './doc'
import type { Epic } from './epic'
import type { Finding, FindingsDoc, Severity } from './finding'
import type { Scenario, ScenarioType } from './scenario'

export interface ParseWarning {
  sourcePath: string
  message: string
}

export interface CatalogStats {
  epics: number
  scenarios: number
  scenariosByType: Record<ScenarioType, number>
  findings: number
  findingsBySeverity: Record<Severity, number>
  scenariosWithFinding: number
}

/** Everything the app knows, parsed once at startup. */
export interface Catalog {
  epics: Epic[]
  scenarios: Scenario[]
  findings: Finding[]
  findingsDoc: FindingsDoc | null
  /** Long-form documents (README, test-strategy, coverage-matrix, ...). */
  docs: DocPage[]
  /** Files under `epics/` that could not be parsed as epics; shown as plain documents. */
  fallbackDocs: DocPage[]
  warnings: ParseWarning[]
  stats: CatalogStats
}
