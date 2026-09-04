import type { Finding, FindingsDoc, MarkdownSection, Severity } from '@/types'
import { normalizeText, plainText } from '@/utils/text'
import {
  FINDING_ID_RE,
  findHeadings,
  findScenarioIds,
  isTableLine,
  joinBlock,
  normalizeSeverity,
  parseTable,
  splitLines,
} from './common'

interface SummaryRow {
  id: string
  severity: Severity | null
  area: string | null
  title: string | null
}

const COLUMN_ALIASES: Record<keyof SummaryRow, string[]> = {
  id: ['id', 'identificador', 'codigo'],
  severity: ['severidad', 'severity', 'criticidad'],
  area: ['area', 'ambito', 'modulo', 'zona'],
  title: ['titulo', 'title', 'descripcion', 'hallazgo'],
}

function columnIndex(header: string[], key: keyof SummaryRow): number {
  const normalized = header.map((cell) => normalizeText(plainText(cell)))
  return normalized.findIndex((cell) => COLUMN_ALIASES[key].some((alias) => cell.startsWith(alias)))
}

/** Extracts `SEC-01` from `[SEC-01](#sec-01)`, `**SEC-01**` or plain text. */
function extractFindingId(cell: string): string | null {
  const text = plainText(cell)
  const match = /([A-Z][A-Z0-9]*(?:-[A-Z][A-Z0-9]*)*-\d+)/.exec(text)
  return match?.[1] ?? null
}

/** Parses the summary table (Id / Severidad / Area / Titulo) into a lookup. */
export function parseSummaryTable(lines: string[]): Map<string, SummaryRow> {
  const result = new Map<string, SummaryRow>()
  const table = parseTable(lines)
  if (!table) return result
  const idCol = columnIndex(table.header, 'id')
  const sevCol = columnIndex(table.header, 'severity')
  const areaCol = columnIndex(table.header, 'area')
  const titleCol = columnIndex(table.header, 'title')
  for (const row of table.rows) {
    const id = idCol >= 0 ? extractFindingId(row[idCol] ?? '') : null
    if (!id) continue
    result.set(id, {
      id,
      severity: sevCol >= 0 ? normalizeSeverity(plainText(row[sevCol] ?? '')) : null,
      area: areaCol >= 0 ? plainText(row[areaCol] ?? '') || null : null,
      title: titleCol >= 0 ? plainText(row[titleCol] ?? '') || null : null,
    })
  }
  return result
}

/** `**Severidad:** alta` / `Severidad: alta` inside a finding body. */
function scanLabel(body: string, labels: string[]): string | null {
  for (const line of splitLines(body)) {
    const match = /^\s*(?:[-*]\s+)?\*{0,2}([^*:|]+?)\*{0,2}\s*:\s*\*{0,2}(.+?)\*{0,2}\s*$/.exec(
      line,
    )
    if (!match?.[1] || !match[2]) continue
    if (labels.includes(normalizeText(match[1]))) return plainText(match[2])
  }
  return null
}

/**
 * Parses `findings.md`: intro prose, one `## <ID>` section per finding and any
 * trailing sections (e.g. `## Observaciones menores`).
 */
export function parseFindings(text: string, sourcePath: string): FindingsDoc {
  const lines = splitLines(text)
  const headings = findHeadings(lines)
  const h1 = headings.find((heading) => heading.level === 1)
  const title = h1 ? plainText(h1.text) : 'Hallazgos'

  const sections = headings.filter((heading) => heading.level === 2)
  const preambleStart = h1 ? h1.index + 1 : 0
  const preambleEnd = sections[0]?.index ?? lines.length
  const preamble = lines.slice(preambleStart, preambleEnd)
  const summary = parseSummaryTable(preamble)
  // The app renders its own list, so the summary table is dropped from the intro.
  const intro = joinBlock(preamble.filter((line) => !isTableLine(line))).replace(/\n{3,}/g, '\n\n')

  const findings: Finding[] = []
  const extraSections: MarkdownSection[] = []

  sections.forEach((section, index) => {
    const end = sections[index + 1]?.index ?? lines.length
    const body = joinBlock(lines.slice(section.index + 1, end))
    const idMatch = /^([A-Z][A-Z0-9]*(?:-[A-Z][A-Z0-9]*)*-\d+)\b\s*(?:[—–:-]\s*(.*))?$/.exec(
      plainText(section.text),
    )
    const id = idMatch?.[1]
    if (!id || !FINDING_ID_RE.test(id)) {
      extraSections.push({ title: plainText(section.text), markdown: body })
      return
    }
    const row = summary.get(id)
    const headingTitle = idMatch?.[2]?.trim() || null
    findings.push({
      id,
      severity:
        row?.severity ??
        normalizeSeverity(scanLabel(body, ['severidad', 'severity', 'criticidad'])),
      area: row?.area ?? scanLabel(body, ['area', 'ambito', 'modulo']),
      title: row?.title ?? headingTitle ?? scanLabel(body, ['titulo', 'title']) ?? id,
      body,
      scenarioIds: findScenarioIds(body),
      sourcePath,
    })
  })

  return { title, intro, findings, extraSections, sourcePath }
}
