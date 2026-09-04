import type { DocPage } from './doc'
import type { Scenario } from './scenario'

/** `**Endpoint:** ...`, `**Implementacion:** ...`, `**Tests:** ...` */
export interface MetadataItem {
  label: string
  markdown: string
}

/** A block of the epic header that is rendered verbatim (contract tables, notes...). */
export interface MarkdownSection {
  title: string | null
  markdown: string
}

export interface Epic {
  /** File name without extension, used in routes. */
  slug: string
  /** Name declared in `# Epica: <name>`. */
  name: string
  sourcePath: string
  /** Introduction paragraph(s) in markdown. Empty string when absent. */
  intro: string
  metadata: MetadataItem[]
  /** Markdown table that follows the `**Endpoints**` header, if present. */
  endpointsTable: string | null
  contractSections: MarkdownSection[]
  scenarios: Scenario[]
}

export type ParseEpicResult =
  { ok: true; epic: Epic; warnings: string[] } | { ok: false; reason: string; doc: DocPage }
