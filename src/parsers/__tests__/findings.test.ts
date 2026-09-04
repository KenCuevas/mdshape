import { describe, expect, it } from 'vitest'
import { parseFindings } from '@/parsers'
import findingsFixture from '../__fixtures__/findings.md?raw'

describe('parseFindings', () => {
  const doc = parseFindings(findingsFixture, 'findings.md')

  it('reads the title and the intro without the summary table', () => {
    expect(doc.title).toBe('Hallazgos de la revision')
    expect(doc.intro).toContain('Resumen de los problemas')
    expect(doc.intro).not.toContain('| Id |')
  })

  it('extracts id, severity, area and title from the summary table', () => {
    expect(doc.findings.map((finding) => [finding.id, finding.severity, finding.area])).toEqual([
      ['SEC-01', 'critical', 'auth'],
      ['BUG-06', 'medium', 'publicaciones'],
      ['SEC-02', 'high', 'auth'],
    ])
    expect(doc.findings[0]?.title).toBe('verify-otp entrega tokens sin validar el codigo')
  })

  it('keeps the whole body in markdown', () => {
    const sec01 = doc.findings.find((finding) => finding.id === 'SEC-01')
    expect(sec01?.body).toContain('```http')
    expect(sec01?.body).toContain('| Paso | Resultado |')
    expect(sec01?.body).not.toContain('## BUG-06')
  })

  it('collects the scenario identifiers mentioned in the body', () => {
    expect(doc.findings.find((f) => f.id === 'SEC-01')?.scenarioIds).toEqual(['OTP-S01', 'OTP-S02'])
    expect(doc.findings.find((f) => f.id === 'BUG-06')?.scenarioIds).toEqual(['PUB-S03'])
  })

  it('keeps trailing sections such as "Observaciones menores"', () => {
    expect(doc.extraSections).toHaveLength(1)
    expect(doc.extraSections[0]?.title).toBe('Observaciones menores')
    expect(doc.extraSections[0]?.markdown).toContain('- Mensajes de error inconsistentes.')
  })

  it('falls back to labels inside the body when the summary table is missing', () => {
    const minimal = parseFindings(
      '# H\n\n## BUG-01\n\n**Severidad:** baja\n**Area:** api\n\nTexto.',
      'f.md',
    )
    expect(minimal.findings).toEqual([
      expect.objectContaining({ id: 'BUG-01', severity: 'low', area: 'api', title: 'BUG-01' }),
    ])
  })

  it('does not throw on empty input', () => {
    expect(parseFindings('', 'findings.md').findings).toEqual([])
  })
})
