import type { ScenarioId, ScenarioLetter, ScenarioType, Severity } from '@/types'
import { SCENARIO_TYPE_BY_LETTER, UNTYPED_SCENARIO_TYPE } from '@/types'
import { createSlugger, normalizeText } from '@/utils/text'
import type { Heading } from '@/types'

/**
 * `<PREFIX>-<LETTER><NUMBER>` where the prefix is one or more upper-case
 * segments joined by hyphens (`LOGIN`, `LOGOUT-ALL`). Any prefix is accepted.
 */
export const SCENARIO_ID_RE = /^([A-Z][A-Z0-9]*(?:-[A-Z][A-Z0-9]*)*)-([PNSE])(\d+)$/

/** Same pattern, for scanning free text. Matches finding ids (`SEC-01`) as well. */
export const REFERENCE_RE = /\b([A-Z][A-Z0-9]*(?:-[A-Z][A-Z0-9]*)*-(?:[PNSE]\d+|\d+))\b/g

/**
 * `SEC-01`, `BUG-06`, ... (no type letter). A scenario id written without its
 * letter (`INFRA-01`) has exactly this shape, which is why such ids are only
 * read as scenarios where the context proves it — see `parseScenarioId`.
 */
export const FINDING_ID_RE = /^([A-Z][A-Z0-9]*(?:-[A-Z][A-Z0-9]*)*)-(\d+)$/

/**
 * `allowUntyped` accepts identifiers with no type letter. Keep it off unless the
 * surrounding markdown already proves the id names a scenario (the `###`
 * heading of an epic), because `SEC-01` is a finding, not a scenario.
 */
export function parseScenarioId(
  raw: string,
  options: { allowUntyped?: boolean } = {},
): ScenarioId | null {
  const trimmed = raw.trim()
  const match = SCENARIO_ID_RE.exec(trimmed)
  if (match) {
    const [, prefix, letter, number] = match
    if (!prefix || !letter || !number) return null
    return { raw: trimmed, prefix, letter: letter as ScenarioLetter, number: Number(number) }
  }
  if (!options.allowUntyped) return null
  const untyped = FINDING_ID_RE.exec(trimmed)
  const [, prefix, number] = untyped ?? []
  if (!prefix || !number) return null
  return { raw: trimmed, prefix, letter: null, number: Number(number) }
}

export function isScenarioId(raw: string): boolean {
  return SCENARIO_ID_RE.test(raw.trim())
}

export function isFindingId(raw: string): boolean {
  return FINDING_ID_RE.test(raw.trim())
}

export function scenarioTypeFromId(id: ScenarioId): ScenarioType {
  return id.letter ? SCENARIO_TYPE_BY_LETTER[id.letter] : UNTYPED_SCENARIO_TYPE
}

/** Accepts Spanish and English spellings, with or without accents. */
export function normalizeSeverity(text: string | null | undefined): Severity | null {
  if (!text) return null
  const value = normalizeText(text)
  if (/^crit/.test(value)) return 'critical'
  if (/^(alt|high)/.test(value)) return 'high'
  if (/^(med)/.test(value)) return 'medium'
  if (/^(baj|low)/.test(value)) return 'low'
  return null
}

/** Finds unique scenario identifiers mentioned in a piece of text, in order. */
export function findScenarioIds(text: string): string[] {
  const ids = new Set<string>()
  for (const match of text.matchAll(REFERENCE_RE)) {
    const candidate = match[1]
    if (candidate && isScenarioId(candidate)) ids.add(candidate)
  }
  return [...ids]
}

export function splitLines(text: string): string[] {
  return text.replace(/\r\n?/g, '\n').split('\n')
}

const FENCE_RE = /^\s{0,3}(`{3,}|~{3,})/

/**
 * Iterates lines while tracking whether we are inside a fenced code block, so
 * headings and bullets inside code samples are never mistaken for structure.
 */
export function* walkLines(
  lines: string[],
): Generator<{ line: string; index: number; inFence: boolean }> {
  let fence: string | null = null
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index] ?? ''
    const fenceMatch = FENCE_RE.exec(line)
    if (fenceMatch?.[1]) {
      const marker = fenceMatch[1]
      if (!fence) {
        fence = marker
        yield { line, index, inFence: true }
        continue
      }
      if (marker[0] === fence[0] && marker.length >= fence.length) {
        fence = null
        yield { line, index, inFence: true }
        continue
      }
    }
    yield { line, index, inFence: fence !== null }
  }
}

export interface HeadingLine {
  index: number
  level: number
  text: string
}

const HEADING_RE = /^(#{1,6})\s+(.+?)\s*#*\s*$/

/** All ATX headings outside code fences. */
export function findHeadings(lines: string[]): HeadingLine[] {
  const headings: HeadingLine[] = []
  for (const { line, index, inFence } of walkLines(lines)) {
    if (inFence) continue
    const match = HEADING_RE.exec(line)
    if (match?.[1] && match[2]) {
      headings.push({ index, level: match[1].length, text: match[2].trim() })
    }
  }
  return headings
}

/** Level 2..3 headings with ids identical to the ones the renderer emits. */
export function extractHeadings(markdown: string, levels: readonly number[] = [2, 3]): Heading[] {
  const slug = createSlugger()
  const result: Heading[] = []
  for (const heading of findHeadings(splitLines(markdown))) {
    // Every heading consumes a slug so numbering matches the renderer.
    const id = slug(heading.text)
    if (levels.includes(heading.level)) {
      result.push({ level: heading.level, text: heading.text, id })
    }
  }
  return result
}

export function isTableLine(line: string): boolean {
  return /^\s*\|/.test(line)
}

export function isHorizontalRule(line: string): boolean {
  return /^\s{0,3}(-{3,}|\*{3,}|_{3,})\s*$/.test(line)
}

/**
 * A `**Label:** content` or `**Label**: content` line. Returns `null` when the
 * line does not start with a bold label.
 */
export function parseLabelledLine(line: string): { label: string; content: string } | null {
  const match = /^\s*\*\*([^*]+?)\*\*\s*:?\s*(.*)$/.exec(line)
  if (!match?.[1]) return null
  const label = match[1].replace(/\s*:\s*$/, '').trim()
  if (!label) return null
  return { label, content: (match[2] ?? '').trim() }
}

/** Splits a markdown table row into trimmed cells. */
export function parseTableRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '')
  return trimmed.split(/(?<!\\)\|/).map((cell) => cell.replace(/\\\|/g, '|').trim())
}

export function isTableSeparator(line: string): boolean {
  return /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line)
}

/** Parses the first markdown table found in `lines` into header + rows. */
export function parseTable(lines: string[]): { header: string[]; rows: string[][] } | null {
  const tableLines = lines.filter(isTableLine)
  if (tableLines.length < 2) return null
  const [headerLine, ...rest] = tableLines
  if (!headerLine) return null
  const header = parseTableRow(headerLine)
  const rows = rest.filter((line) => !isTableSeparator(line)).map(parseTableRow)
  return { header, rows }
}

/** Joins lines and trims surrounding blank lines. */
export function joinBlock(lines: string[]): string {
  return lines
    .join('\n')
    .replace(/^\s*\n/, '')
    .replace(/\s+$/, '')
}
