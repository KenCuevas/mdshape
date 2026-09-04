import type { MarkdownSection } from './epic'

export type Severity = 'critical' | 'high' | 'medium' | 'low'

/** Ordered from most to least severe. */
export const SEVERITIES: readonly Severity[] = ['critical', 'high', 'medium', 'low']

export interface Finding {
  /** e.g. `SEC-01`, `BUG-06` */
  id: string
  severity: Severity | null
  area: string | null
  title: string
  /** Full body of the `## <id>` section, in markdown. */
  body: string
  /** Scenario identifiers mentioned anywhere in the body. */
  scenarioIds: string[]
  sourcePath: string
}

export interface FindingsDoc {
  title: string
  /** Introduction prose (the summary table is removed; the app renders its own list). */
  intro: string
  findings: Finding[]
  /** Sections without a finding id, e.g. `## Observaciones menores`. */
  extraSections: MarkdownSection[]
  sourcePath: string
}
