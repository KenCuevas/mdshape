import type {
  DetailItem,
  Epic,
  FindingRef,
  MarkdownSection,
  MetadataItem,
  ParseEpicResult,
  Scenario,
} from '@/types'
import { normalizeText, plainText, stripAccents } from '@/utils/text'
import {
  findHeadings,
  isFindingId,
  isHorizontalRule,
  isTableLine,
  joinBlock,
  normalizeSeverity,
  parseLabelledLine,
  parseScenarioId,
  scenarioTypeFromId,
  splitLines,
  walkLines,
  type HeadingLine,
} from './common'
import { parseDoc } from './doc'

const EPIC_TITLE_RE = /^epica\s*:\s*(.+)$/i

/** Separators accepted between identifier(s) and title: em dash, en dash or hyphen. */
const HEADING_SPLIT_RE = /^(.+?)\s+[—–-]\s+(.+)$/

/** `(HALLAZGO SEC-01, critico) title...` — brackets accepted too. */
const FINDING_MARKER_RE =
  /^[([]\s*HALLAZGO\s+([A-Z][A-Z0-9-]*-\d+)\s*(?:[,;:]\s*([^)\]]*))?[)\]]\s*(.*)$/i

export interface ParsedHeading {
  ids: string[]
  title: string
  finding: FindingRef | null
}

export interface ScenarioHeadingOptions {
  /**
   * Accept identifiers written without a type letter (`INFRA-01`). Off by
   * default because that shape is also a finding id; `parseEpic` turns it on
   * because a `###` heading inside an epic can only name a scenario.
   */
  allowUntypedIds?: boolean
}

/**
 * Parses the text of a `###` heading. Returns `null` when the heading does not
 * declare at least one valid scenario identifier.
 */
export function parseScenarioHeading(
  text: string,
  options: ScenarioHeadingOptions = {},
): ParsedHeading | null {
  const cleaned = text.trim()
  const split = HEADING_SPLIT_RE.exec(cleaned)
  const idPart = split?.[1] ?? cleaned
  let title = split?.[2]?.trim() ?? ''

  const ids: string[] = []
  const idOptions = { allowUntyped: options.allowUntypedIds === true }
  for (const token of idPart.split(/[\s/,&+]+/)) {
    const id = parseScenarioId(token, idOptions)
    if (id && !ids.includes(id.raw)) ids.push(id.raw)
  }
  if (ids.length === 0) return null
  if (!split) title = ''

  let finding: FindingRef | null = null
  const marker = FINDING_MARKER_RE.exec(title)
  if (marker?.[1]) {
    finding = {
      id: marker[1].toUpperCase(),
      severity: normalizeSeverity(marker[2]),
      raw: title.slice(0, title.length - (marker[3]?.length ?? 0)).trim(),
    }
    title = (marker[3] ?? '').trim()
  }

  return { ids, title, finding }
}

/**
 * Turns the body of a scenario into an ordered list of label/content pairs.
 * Labels are not a closed set: any `- **Label:** ...` bullet is accepted.
 */
export function parseDetails(bodyLines: string[]): DetailItem[] {
  const items: DetailItem[] = []
  let current: { label: string | null; lines: string[] } | null = null
  let pendingBreak = false

  const flush = (): void => {
    if (!current) return
    const markdown = dedent(current.lines).join('\n').trim()
    if (markdown || current.label) items.push({ label: current.label, markdown })
    current = null
  }

  for (const { line, inFence } of walkLines(bodyLines)) {
    const bullet = inFence ? null : /^[-*+]\s+(.*)$/.exec(line)
    if (bullet) {
      flush()
      const content = bullet[1] ?? ''
      const labelled = parseLabelledLine(content)
      current = labelled
        ? { label: labelled.label, lines: [labelled.content] }
        : { label: null, lines: [content] }
      pendingBreak = false
      continue
    }

    if (!inFence && line.trim() === '') {
      if (current) pendingBreak = true
      continue
    }

    const indented = /^\s{2,}/.test(line)
    if (current && (indented || !pendingBreak || inFence)) {
      if (pendingBreak) current.lines.push('')
      current.lines.push(line)
      pendingBreak = false
      continue
    }

    // Non-indented content after a blank line: free markdown block.
    flush()
    current = { label: null, lines: [line] }
    pendingBreak = false
  }
  flush()
  return items
}

/** Removes the common indentation of continuation lines (keeps the first line as is). */
function dedent(lines: string[]): string[] {
  const [first, ...rest] = lines
  const indents = rest
    .filter((line) => line.trim() !== '')
    .map((line) => /^\s*/.exec(line)?.[0].length ?? 0)
  const common = indents.length ? Math.min(...indents) : 0
  return [first ?? '', ...rest.map((line) => line.slice(Math.min(common, line.length)))]
}

interface ParsedHeader {
  intro: string
  metadata: MetadataItem[]
  endpointsTable: string | null
  contractSections: MarkdownSection[]
}

/** Splits lines into blocks separated by blank lines, keeping fenced code together. */
function splitBlocks(lines: string[]): string[][] {
  const blocks: string[][] = []
  let current: string[] = []
  for (const { line, inFence } of walkLines(lines)) {
    if (!inFence && line.trim() === '') {
      if (current.length) blocks.push(current)
      current = []
      continue
    }
    current.push(line)
  }
  if (current.length) blocks.push(current)
  return blocks
}

/**
 * Header = everything between `# Epica:` and the first scenario. Paragraphs
 * before any metadata or table are the introduction; bold `**Label:** value`
 * lines are metadata; a `**Endpoints**` title followed by a table is the
 * endpoints table; every other titled block (contract tables, notes) is kept
 * verbatim as a section.
 */
export function parseHeader(lines: string[]): ParsedHeader {
  const header: ParsedHeader = {
    intro: '',
    metadata: [],
    endpointsTable: null,
    contractSections: [],
  }
  const introLines: string[] = []
  let pendingTitle: string | null = null
  let seenStructure = false

  const pushSection = (markdown: string): void => {
    header.contractSections.push({ title: pendingTitle, markdown })
    pendingTitle = null
  }

  for (const block of splitBlocks(lines)) {
    const first = block[0] ?? ''
    if (block.length === 1 && isHorizontalRule(first)) continue

    const headingMatch = /^#{2,6}\s+(.+?)\s*#*\s*$/.exec(first)
    if (block.length === 1 && headingMatch?.[1]) {
      pendingTitle = plainText(headingMatch[1])
      seenStructure = true
      continue
    }

    // `**Endpoints**` or `**Contrato de la peticion**` alone on a line: title of the next block.
    const labelled = block.length === 1 ? parseLabelledLine(first) : null
    if (labelled && labelled.content === '' && !first.includes(':**')) {
      pendingTitle = labelled.label
      seenStructure = true
      continue
    }

    if (isTableLine(first)) {
      seenStructure = true
      if (pendingTitle && normalizeText(pendingTitle) === 'endpoints' && !header.endpointsTable) {
        header.endpointsTable = joinBlock(block)
        pendingTitle = null
      } else {
        pushSection(joinBlock(block))
      }
      continue
    }

    const metadataLines = block.map(parseLabelledLine)
    const metadataCount = metadataLines.filter((item) => item && item.content !== '').length
    if (metadataCount > 0) {
      seenStructure = true
      const leftovers: string[] = []
      block.forEach((line, index) => {
        const item = metadataLines[index]
        if (item && item.content !== '')
          header.metadata.push({ label: item.label, markdown: item.content })
        else leftovers.push(line)
      })
      if (leftovers.length) pushSection(joinBlock(leftovers))
      continue
    }

    if (!seenStructure && !pendingTitle) {
      introLines.push(...block, '')
      continue
    }
    pushSection(joinBlock(block))
  }

  header.intro = introLines.join('\n').trim()
  return header
}

function buildSearchText(
  id: string,
  title: string,
  details: DetailItem[],
  epicName: string,
): string {
  const parts = [
    id,
    title,
    epicName,
    ...details.map((item) => `${item.label ?? ''} ${plainText(item.markdown)}`),
  ]
  return normalizeText(stripAccents(parts.join(' ')))
}

/** Looks for a `- **Hallazgo:** SEC-01` bullet when the heading has no marker. */
function findingFromDetails(details: DetailItem[]): FindingRef | null {
  for (const item of details) {
    if (!item.label || !/hallazgo/i.test(stripAccents(item.label))) continue
    const id = /\b([A-Z][A-Z0-9-]*-\d+)\b/.exec(item.markdown)?.[1]
    if (id && isFindingId(id)) {
      const severity = normalizeSeverity(
        /\b(critic\w*|alta|high|media|medium|baja|low)\b/i.exec(item.markdown)?.[1],
      )
      return { id, severity, raw: item.markdown }
    }
  }
  return null
}

/**
 * True when the file declares itself an epic with a `# Epica: <name>` heading.
 * The catalog uses it to recognise epics wherever they sit in the folder.
 */
export function looksLikeEpic(text: string): boolean {
  const h1 = findHeadings(splitLines(text)).find((heading) => heading.level === 1)
  return h1 ? EPIC_TITLE_RE.test(stripAccents(h1.text)) : false
}

/**
 * Parses one epic file. Never throws: a file that does not look like an epic is
 * returned as a plain document with `ok: false`.
 */
export function parseEpic(text: string, sourcePath: string, slug: string): ParseEpicResult {
  const lines = splitLines(text)
  const headings = findHeadings(lines)
  const warnings: string[] = []

  const h1 = headings.find((heading) => heading.level === 1)
  const titleMatch = h1 ? EPIC_TITLE_RE.exec(stripAccents(h1.text)) : null
  if (!h1 || !titleMatch) {
    return fallback(text, sourcePath, slug, 'no `# Epica: <name>` heading found')
  }
  // Keep the original (possibly accented) name; the regex ran on a stripped copy.
  const name = plainText(h1.text.slice(h1.text.indexOf(':') + 1).trim()) || slug

  const scenarioHeadings: Array<HeadingLine & { parsed: ParsedHeading }> = []
  for (const heading of headings) {
    if (heading.level !== 3) continue
    const parsed = parseScenarioHeading(heading.text, { allowUntypedIds: true })
    if (parsed) scenarioHeadings.push({ ...heading, parsed })
  }
  if (scenarioHeadings.length === 0) {
    return fallback(text, sourcePath, slug, 'no `### <ID> — <title>` scenario headings found')
  }

  const firstSection = headings.find((heading) => heading.level === 2 && heading.index > h1.index)
  const firstScenario = scenarioHeadings[0]
  const headerEnd = Math.min(
    firstSection?.index ?? Number.POSITIVE_INFINITY,
    firstScenario?.index ?? Number.POSITIVE_INFINITY,
    lines.length,
  )
  const header = parseHeader(lines.slice(h1.index + 1, headerEnd))

  const scenarios: Scenario[] = []
  const seenIds = new Set<string>()
  for (let i = 0; i < scenarioHeadings.length; i++) {
    const current = scenarioHeadings[i]
    if (!current) continue
    const nextHeading = headings.find(
      (heading) => heading.index > current.index && heading.level <= 3,
    )
    const bodyEnd = nextHeading?.index ?? lines.length
    const details = parseDetails(lines.slice(current.index + 1, bodyEnd))
    const section = [...headings]
      .reverse()
      .find((heading) => heading.level === 2 && heading.index < current.index)
    const finding = current.parsed.finding ?? findingFromDetails(details)

    for (const id of current.parsed.ids) {
      if (seenIds.has(id)) {
        warnings.push(`duplicate scenario id ${id} in ${sourcePath}; keeping the first one`)
        continue
      }
      seenIds.add(id)
      const parsedId = parseScenarioId(id, { allowUntyped: true })
      if (!parsedId) continue
      scenarios.push({
        id,
        type: scenarioTypeFromId(parsedId),
        title: current.parsed.title,
        heading: current.text,
        epicSlug: slug,
        epicName: name,
        section: section ? plainText(section.text) : null,
        siblingIds: current.parsed.ids.filter((other) => other !== id),
        details,
        finding,
        searchText: buildSearchText(id, current.parsed.title, details, name),
      })
    }
  }

  const epic: Epic = {
    slug,
    name,
    sourcePath,
    intro: header.intro,
    metadata: header.metadata,
    endpointsTable: header.endpointsTable,
    contractSections: header.contractSections,
    scenarios,
  }
  return { ok: true, epic, warnings }
}

/** Wraps the file as a plain document. The caller (catalog) reports the reason. */
function fallback(text: string, sourcePath: string, slug: string, reason: string): ParseEpicResult {
  return { ok: false, reason, doc: parseDoc(text, sourcePath, slug) }
}
