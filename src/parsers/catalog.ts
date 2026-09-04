import type {
  Catalog,
  CatalogStats,
  DocPage,
  Epic,
  Finding,
  FindingsDoc,
  ParseWarning,
  Scenario,
  Severity,
  ScenarioType,
} from '@/types'
import { SCENARIO_TYPES, SEVERITIES } from '@/types'
import { parseDoc } from './doc'
import { looksLikeEpic, parseEpic } from './epic'
import { parseFindings } from './findings'

/** Preferred order of the long-form documents in the navigation. */
const DOC_ORDER = ['readme', 'test-strategy', 'coverage-matrix']

const SEVERITY_RANK: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3 }

export function severityRank(severity: Severity | null): number {
  return severity ? SEVERITY_RANK[severity] : SEVERITIES.length
}

/** `.../content/reviews/epics/auth-login.md` -> `epics/auth-login.md` */
export function relativeDocPath(fullPath: string): string {
  const marker = '/reviews/'
  const index = fullPath.lastIndexOf(marker)
  return index >= 0 ? fullPath.slice(index + marker.length) : fullPath.replace(/^.*\//, '')
}

export function slugFromPath(relativePath: string): string {
  const base = relativePath.split('/').pop() ?? relativePath
  return base.replace(/\.md$/i, '').toLowerCase()
}

/**
 * Builds the whole catalog from a `{ path: markdown }` map, which is exactly
 * what `import.meta.glob(..., { query: '?raw', eager: true })` returns.
 */
export function buildCatalog(files: Record<string, string>): Catalog {
  const epics: Epic[] = []
  const docs: DocPage[] = []
  const fallbackDocs: DocPage[] = []
  const warnings: ParseWarning[] = []
  let findingsDoc: FindingsDoc | null = null

  const entries = Object.entries(files).sort(([a], [b]) => a.localeCompare(b))
  for (const [path, text] of entries) {
    const relative = relativeDocPath(path)
    const slug = slugFromPath(relative)
    try {
      // Epics are recognised by their `# Epica:` heading as well as by the
      // folder, so a flat `reviews/` folder works exactly like `reviews/epics/`.
      if (/^epics\//i.test(relative) || looksLikeEpic(text)) {
        const result = parseEpic(text, relative, slug)
        if (result.ok) {
          epics.push(result.epic)
          warnings.push(...result.warnings.map((message) => ({ sourcePath: relative, message })))
        } else {
          fallbackDocs.push(result.doc)
          warnings.push({
            sourcePath: relative,
            message: `could not be parsed as an epic (${result.reason}); shown as a plain document`,
          })
        }
      } else if (slug === 'findings') {
        findingsDoc = parseFindings(text, relative)
      } else {
        docs.push(parseDoc(text, relative, slug))
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      warnings.push({
        sourcePath: relative,
        message: `failed to parse (${message}); shown as a plain document`,
      })
      fallbackDocs.push(parseDoc(text, relative, slug))
    }
  }

  epics.sort((a, b) => a.name.localeCompare(b.name, 'es'))
  docs.sort((a, b) => {
    const ia = DOC_ORDER.indexOf(a.slug)
    const ib = DOC_ORDER.indexOf(b.slug)
    if (ia !== ib) return (ia === -1 ? DOC_ORDER.length : ia) - (ib === -1 ? DOC_ORDER.length : ib)
    return a.slug.localeCompare(b.slug)
  })

  const scenarios: Scenario[] = []
  const seen = new Set<string>()
  for (const epic of epics) {
    for (const scenario of epic.scenarios) {
      if (seen.has(scenario.id)) {
        warnings.push({
          sourcePath: epic.sourcePath,
          message: `scenario ${scenario.id} is declared in more than one epic; keeping the first`,
        })
        continue
      }
      seen.add(scenario.id)
      scenarios.push(scenario)
    }
  }

  const findings: Finding[] = findingsDoc ? [...(findingsDoc as FindingsDoc).findings] : []
  findings.sort(
    (a, b) => severityRank(a.severity) - severityRank(b.severity) || a.id.localeCompare(b.id),
  )

  return {
    epics,
    scenarios,
    findings,
    findingsDoc,
    docs,
    fallbackDocs,
    warnings,
    stats: computeStats(epics, scenarios, findings),
  }
}

export function computeStats(
  epics: Epic[],
  scenarios: Scenario[],
  findings: Finding[],
): CatalogStats {
  const scenariosByType = Object.fromEntries(SCENARIO_TYPES.map((type) => [type, 0])) as Record<
    ScenarioType,
    number
  >
  const findingsBySeverity = Object.fromEntries(
    SEVERITIES.map((severity) => [severity, 0]),
  ) as Record<Severity, number>
  let scenariosWithFinding = 0
  for (const scenario of scenarios) {
    scenariosByType[scenario.type] += 1
    if (scenario.finding) scenariosWithFinding += 1
  }
  for (const finding of findings) {
    if (finding.severity) findingsBySeverity[finding.severity] += 1
  }
  return {
    epics: epics.length,
    scenarios: scenarios.length,
    scenariosByType,
    findings: findings.length,
    findingsBySeverity,
    scenariosWithFinding,
  }
}
