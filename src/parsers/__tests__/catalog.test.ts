import { describe, expect, it } from 'vitest'
import { buildCatalog, relativeDocPath, slugFromPath } from '@/parsers'
import authLogin from '../__fixtures__/auth-login.md?raw'
import infra from '../__fixtures__/infra.md?raw'
import notAnEpic from '../__fixtures__/not-an-epic.md?raw'
import findings from '../__fixtures__/findings.md?raw'
import doc from '../__fixtures__/doc.md?raw'

const files = {
  '/src/content/reviews/epics/auth-login.md': authLogin,
  '/src/content/reviews/epics/infra.md': infra,
  '/src/content/reviews/epics/not-an-epic.md': notAnEpic,
  '/src/content/reviews/findings.md': findings,
  '/src/content/reviews/test-strategy.md': doc,
  '/src/content/reviews/README.md': '# Readme\n\nhola',
  '/src/content/reviews/coverage-matrix.md': '# Matriz\n\n| a | b |\n| - | - |\n| 1 | 2 |',
}

describe('buildCatalog', () => {
  const catalog = buildCatalog(files)

  it('classifies files by path', () => {
    expect(catalog.epics.map((epic) => epic.slug)).toEqual(['auth-login', 'infra'])
    expect(catalog.fallbackDocs.map((page) => page.slug)).toEqual(['not-an-epic'])
    expect(catalog.findingsDoc?.title).toBe('Hallazgos de la revision')
    expect(catalog.docs.map((page) => page.slug)).toEqual([
      'readme',
      'test-strategy',
      'coverage-matrix',
    ])
  })

  it('flattens scenarios and computes stats from the parsed data', () => {
    expect(catalog.scenarios).toHaveLength(14)
    expect(catalog.stats).toEqual({
      epics: 2,
      scenarios: 14,
      scenariosByType: { positive: 3, negative: 6, security: 3, error: 2 },
      findings: 3,
      findingsBySeverity: { critical: 1, high: 1, medium: 1, low: 0 },
      scenariosWithFinding: 2,
    })
    const total = Object.values(catalog.stats.scenariosByType).reduce((a, b) => a + b, 0)
    expect(total).toBe(catalog.stats.scenarios)
  })

  it('sorts findings by severity', () => {
    expect(catalog.findings.map((finding) => finding.id)).toEqual(['SEC-01', 'SEC-02', 'BUG-06'])
  })

  it('records a warning for files that fell back to plain documents', () => {
    expect(catalog.warnings.some((warning) => warning.sourcePath === 'epics/not-an-epic.md')).toBe(
      true,
    )
  })

  it('handles an empty content folder', () => {
    const empty = buildCatalog({})
    expect(empty.stats.scenarios).toBe(0)
    expect(empty.findingsDoc).toBeNull()
  })
})

const readmeDoc = ['# Readme', '', 'hola'].join(String.fromCharCode(10))
const epicWithoutScenarios = ['# Epica: rota', '', 'Sin escenarios.'].join(String.fromCharCode(10))

describe('buildCatalog with the epics at the root of the folder', () => {
  const flat = buildCatalog({
    '/src/content/reviews/auth-login.md': authLogin,
    '/src/content/reviews/infra.md': infra,
    '/src/content/reviews/findings.md': findings,
    '/src/content/reviews/test-strategy.md': doc,
    '/src/content/reviews/README.md': readmeDoc,
  })

  it('recognises epics by their `# Epica:` heading, not by the folder', () => {
    expect(flat.epics.map((epic) => epic.slug)).toEqual(['auth-login', 'infra'])
    expect(flat.stats.scenarios).toBe(14)
  })

  it('still treats the other files as documents', () => {
    expect(flat.findingsDoc?.title).toBe('Hallazgos de la revision')
    expect(flat.docs.map((page) => page.slug)).toEqual(['readme', 'test-strategy'])
  })

  it('does not warn about documents that never claimed to be epics', () => {
    expect(flat.warnings).toEqual([])
  })
})

describe('buildCatalog with a broken epic outside the epics folder', () => {
  const broken = buildCatalog({
    '/src/content/reviews/half-epic.md': epicWithoutScenarios,
  })

  it('falls back to a plain document and warns', () => {
    expect(broken.epics).toEqual([])
    expect(broken.fallbackDocs.map((page) => page.slug)).toEqual(['half-epic'])
    expect(broken.warnings[0]?.sourcePath).toBe('half-epic.md')
  })
})

describe('path helpers', () => {
  it('computes relative paths and slugs', () => {
    expect(relativeDocPath('/abs/src/content/reviews/epics/auth-login.md')).toBe(
      'epics/auth-login.md',
    )
    expect(slugFromPath('epics/Auth-Login.md')).toBe('auth-login')
    expect(slugFromPath('README.md')).toBe('readme')
  })
})
