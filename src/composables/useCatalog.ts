import type { Catalog, DocPage, Epic, Finding, Scenario } from '@/types'
import { buildCatalog } from '@/parsers'
import { contentFiles } from '@/data/content'

interface CatalogIndex {
  catalog: Catalog
  epicsBySlug: Map<string, Epic>
  scenariosById: Map<string, Scenario>
  findingsById: Map<string, Finding>
  docsBySlug: Map<string, DocPage>
}

let index: CatalogIndex | null = null

/** Parses the content once (lazily, on first use) and keeps it for the app lifetime. */
function getIndex(): CatalogIndex {
  if (index) return index
  const catalog = buildCatalog(contentFiles)
  if (Object.keys(contentFiles).length === 0) {
    console.warn(
      '[catalog] No markdown files found under src/content/reviews/. Run `npm run sync:docs` after placing the documentation in ./reviews.',
    )
  }
  // Files that do not fit the expected format are reported once, here.
  for (const warning of catalog.warnings) {
    console.warn(`[catalog] ${warning.sourcePath}: ${warning.message}`)
  }
  index = {
    catalog,
    epicsBySlug: new Map(catalog.epics.map((epic) => [epic.slug, epic])),
    scenariosById: new Map(catalog.scenarios.map((scenario) => [scenario.id, scenario])),
    findingsById: new Map(catalog.findings.map((finding) => [finding.id, finding])),
    docsBySlug: new Map([...catalog.docs, ...catalog.fallbackDocs].map((doc) => [doc.slug, doc])),
  }
  return index
}

export function useCatalog() {
  const { catalog, epicsBySlug, scenariosById, findingsById, docsBySlug } = getIndex()

  const getEpic = (slug: string): Epic | undefined => epicsBySlug.get(slug)
  const getScenario = (id: string): Scenario | undefined => scenariosById.get(id.toUpperCase())
  const getFinding = (id: string): Finding | undefined => findingsById.get(id.toUpperCase())
  const getDoc = (slug: string): DocPage | undefined => docsBySlug.get(slug.toLowerCase())

  /** Scenarios that evidence a finding: referenced from its body or marked with its id. */
  const scenariosForFinding = (id: string): Scenario[] => {
    const finding = getFinding(id)
    const ids = new Set<string>(finding?.scenarioIds ?? [])
    for (const scenario of catalog.scenarios) {
      if (scenario.finding?.id === id.toUpperCase()) ids.add(scenario.id)
    }
    return [...ids]
      .map((scenarioId) => scenariosById.get(scenarioId))
      .filter((scenario): scenario is Scenario => scenario !== undefined)
  }

  return {
    catalog,
    epics: catalog.epics,
    scenarios: catalog.scenarios,
    findings: catalog.findings,
    findingsDoc: catalog.findingsDoc,
    docs: catalog.docs,
    fallbackDocs: catalog.fallbackDocs,
    stats: catalog.stats,
    isEmpty: catalog.epics.length === 0 && catalog.docs.length === 0 && !catalog.findingsDoc,
    getEpic,
    getScenario,
    getFinding,
    getDoc,
    scenariosForFinding,
  }
}
