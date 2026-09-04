import { describe, expect, it } from 'vitest'
import { parseDetails, parseEpic, parseScenarioHeading } from '@/parsers'
import authLogin from '../__fixtures__/auth-login.md?raw'
import infra from '../__fixtures__/infra.md?raw'
import endpointsTable from '../__fixtures__/endpoints-table.md?raw'
import notAnEpic from '../__fixtures__/not-an-epic.md?raw'
import infraUntyped from '../__fixtures__/infra-untyped.md?raw'

function parseOk(text: string, slug = 'fixture') {
  const result = parseEpic(text, `epics/${slug}.md`, slug)
  if (!result.ok) throw new Error(`expected ok, got: ${result.reason}`)
  return result.epic
}

describe('parseScenarioHeading', () => {
  it('splits identifier and title on an em dash', () => {
    expect(parseScenarioHeading('LOGIN-P01 — Credenciales validas')).toEqual({
      ids: ['LOGIN-P01'],
      title: 'Credenciales validas',
      finding: null,
    })
  })

  it('accepts two identifiers separated by a slash', () => {
    const parsed = parseScenarioHeading('RESEND-P01 / OTP-N05 — Reenvio dentro de la ventana')
    expect(parsed?.ids).toEqual(['RESEND-P01', 'OTP-N05'])
    expect(parsed?.title).toBe('Reenvio dentro de la ventana')
  })

  it('accepts two identifiers joined with "y"', () => {
    const parsed = parseScenarioHeading('OTP-N01 y OTP-N02 — El limite de intentos se aplica')
    expect(parsed?.ids).toEqual(['OTP-N01', 'OTP-N02'])
  })

  it('extracts the finding marker with severity', () => {
    const parsed = parseScenarioHeading(
      'OTP-S01 — (HALLAZGO SEC-01, critico) verify-otp entrega tokens sin validar',
    )
    expect(parsed?.finding).toEqual({
      id: 'SEC-01',
      severity: 'critical',
      raw: '(HALLAZGO SEC-01, critico)',
    })
    expect(parsed?.title).toBe('verify-otp entrega tokens sin validar')
  })

  it('extracts the finding marker without severity', () => {
    const parsed = parseScenarioHeading('LOGIN-S02 — (HALLAZGO BUG-06) Marcador sin severidad')
    expect(parsed?.finding).toEqual({ id: 'BUG-06', severity: null, raw: '(HALLAZGO BUG-06)' })
    expect(parsed?.title).toBe('Marcador sin severidad')
  })

  it('supports hyphenated prefixes such as LOGOUT-ALL', () => {
    expect(parseScenarioHeading('LOGOUT-ALL-P01 — Cierra todo')?.ids).toEqual(['LOGOUT-ALL-P01'])
  })

  it('returns null for headings without a scenario identifier', () => {
    expect(parseScenarioHeading('Notas del contrato')).toBeNull()
    expect(parseScenarioHeading('SEC-01 — un hallazgo, no un escenario')).toBeNull()
  })

  it('accepts an identifier without a type letter only when the caller opts in', () => {
    expect(parseScenarioHeading('INFRA-01 — Flyway aplica la cadena')).toBeNull()
    expect(
      parseScenarioHeading('INFRA-01 — Flyway aplica la cadena', { allowUntypedIds: true }),
    ).toEqual({
      ids: ['INFRA-01'],
      title: 'Flyway aplica la cadena',
      finding: null,
    })
  })

  it('still reads the finding marker on an untyped identifier', () => {
    const parsed = parseScenarioHeading('INFRA-02 — (HALLAZGO BUG-06, alta) Arranque fragil', {
      allowUntypedIds: true,
    })
    expect(parsed?.finding).toEqual({
      id: 'BUG-06',
      severity: 'high',
      raw: '(HALLAZGO BUG-06, alta)',
    })
    expect(parsed?.title).toBe('Arranque fragil')
  })
})

describe('parseEpic with identifiers that have no type letter', () => {
  const epic = parseOk(infraUntyped, 'infra-untyped')

  it('keeps every untyped scenario of the file', () => {
    expect(epic.scenarios.map((scenario) => scenario.id)).toEqual([
      'INFRA-01',
      'INFRA-02',
      'INFRA-03',
    ])
  })

  it('files untyped scenarios in the positive column', () => {
    expect(epic.scenarios.every((scenario) => scenario.type === 'positive')).toBe(true)
  })

  it('parses their titles and bullets like any other scenario', () => {
    const first = epic.scenarios[0]
    expect(first?.title).toBe('Flyway aplica la cadena completa sobre una base vacia')
    expect(first?.details.map((item) => item.label)).toEqual(['Descripcion', 'Resultado esperado'])
  })
})

describe('parseDetails', () => {
  it('keeps non-standard labels as ordered label/content pairs', () => {
    const details = parseDetails([
      '- **Descripcion:** a',
      '- **Resultado esperado (hoy):** b',
      '- **Resultado correcto:** c',
      '- **Nota:** d',
      '- **Impacto:** e',
      '- **Por que importa:** f',
    ])
    expect(details.map((item) => item.label)).toEqual([
      'Descripcion',
      'Resultado esperado (hoy)',
      'Resultado correcto',
      'Nota',
      'Impacto',
      'Por que importa',
    ])
    expect(details.map((item) => item.markdown)).toEqual(['a', 'b', 'c', 'd', 'e', 'f'])
  })

  it('accepts the colon outside the bold marker', () => {
    expect(parseDetails(['- **Nota**: contenido'])).toEqual([
      { label: 'Nota', markdown: 'contenido' },
    ])
  })

  it('keeps continuation lines, nested lists and code blocks inside their bullet', () => {
    const epic = parseOk(authLogin)
    const scenario = epic.scenarios.find((item) => item.id === 'LOGIN-N02')
    expect(scenario?.details.map((item) => item.label)).toEqual([
      'Descripcion',
      'Precondiciones',
      'Request',
      'Resultado esperado',
      null,
    ])
    expect(scenario?.details[0]?.markdown).toBe('primera linea\ncon continuacion indentada.')
    expect(scenario?.details[1]?.markdown).toBe('- usuario activo\n- sin sesiones abiertas')
    expect(scenario?.details[2]?.markdown).toContain('```json')
    expect(scenario?.details[4]?.markdown).toBe('Parrafo libre despues de las vinetas.')
  })
})

describe('parseEpic', () => {
  it('parses name, intro, metadata and contract tables', () => {
    const epic = parseOk(authLogin, 'auth-login')
    expect(epic.name).toBe('auth-login')
    expect(epic.slug).toBe('auth-login')
    expect(epic.intro).toMatch(/^Cubre el inicio de sesion/)
    expect(epic.intro).not.toContain('**Endpoint')
    expect(epic.metadata).toEqual([
      { label: 'Endpoint', markdown: '`POST /api/auth/login`' },
      { label: 'Implementacion', markdown: '`src/modules/auth/login.controller.ts`' },
      { label: 'Tests', markdown: '`tests/auth/login.spec.ts`' },
    ])
    expect(epic.endpointsTable).toBeNull()
    expect(epic.contractSections.map((section) => section.title)).toEqual([
      'Contrato de la peticion',
      'Reglas clave',
    ])
    expect(epic.contractSections[0]?.markdown).toContain('| email | string | si |')
  })

  it('creates one scenario per identifier, sharing content', () => {
    const epic = parseOk(authLogin)
    const resend = epic.scenarios.find((item) => item.id === 'RESEND-P01')
    const otp = epic.scenarios.find((item) => item.id === 'OTP-N05')
    expect(resend?.type).toBe('positive')
    expect(otp?.type).toBe('negative')
    expect(resend?.siblingIds).toEqual(['OTP-N05'])
    expect(otp?.siblingIds).toEqual(['RESEND-P01'])
    expect(otp?.details).toEqual(resend?.details)
    expect(epic.scenarios.map((item) => item.id)).toContain('OTP-N01')
    expect(epic.scenarios.map((item) => item.id)).toContain('OTP-N02')
  })

  it('derives the type from the identifier letter, not from the section', () => {
    const epic = parseOk(authLogin)
    // OTP-N05 sits under "Pruebas positivas" but is negative by its letter.
    const otp = epic.scenarios.find((item) => item.id === 'OTP-N05')
    expect(otp?.section).toBe('Pruebas positivas')
    expect(otp?.type).toBe('negative')
    const error = epic.scenarios.find((item) => item.id === 'LOGIN-E01')
    expect(error?.type).toBe('error')
  })

  it('attaches the finding marker to the scenario', () => {
    const epic = parseOk(authLogin)
    const scenario = epic.scenarios.find((item) => item.id === 'OTP-S01')
    expect(scenario?.finding).toEqual({
      id: 'SEC-01',
      severity: 'critical',
      raw: '(HALLAZGO SEC-01, critico)',
    })
    expect(scenario?.title).toBe('verify-otp entrega tokens sin validar')
    expect(scenario?.heading).toContain('(HALLAZGO SEC-01, critico)')
  })

  it('parses a file without "## Pruebas" sections', () => {
    const epic = parseOk(infra, 'infra')
    expect(epic.scenarios.map((item) => [item.id, item.type, item.section])).toEqual([
      ['INFRA-P01', 'positive', null],
      ['INFRA-N01', 'negative', null],
      ['INFRA-S01', 'security', null],
      ['INFRA-E01', 'error', null],
    ])
    expect(epic.metadata).toEqual([{ label: 'Implementacion', markdown: '`docker-compose.yml`' }])
  })

  it('parses the "**Endpoints**" table variant and other titled tables', () => {
    const epic = parseOk(endpointsTable, 'sessions')
    expect(epic.endpointsTable).toContain('| GET | /api/sessions |')
    expect(epic.contractSections).toEqual([
      {
        title: 'Notas del contrato',
        markdown: '| Nota | Detalle |\n| --- | --- |\n| Paginacion | no soportada |',
      },
    ])
    expect(epic.scenarios.map((item) => item.id)).toEqual(['SESSIONS-P01', 'LOGOUT-ALL-P01'])
  })

  it('builds a searchable text from id, title and details', () => {
    const epic = parseOk(authLogin)
    const scenario = epic.scenarios.find((item) => item.id === 'LOGIN-N01')
    expect(scenario?.searchText).toContain('login-n01')
    expect(scenario?.searchText).toContain('enumeracion de usuarios')
  })

  it('does not throw on a file that is not an epic: returns it as a plain document', () => {
    let result: ReturnType<typeof parseEpic> | undefined
    expect(() => {
      result = parseEpic(notAnEpic, 'epics/not-an-epic.md', 'not-an-epic')
    }).not.toThrow()
    expect(result?.ok).toBe(false)
    if (!result || result.ok) return
    expect(result.reason).toContain('# Epica')
    expect(result.doc.title).toBe('Notas sueltas')
    expect(result.doc.markdown).toContain('## Una seccion')
    // The scenario heading inside the code fence must not be mistaken for structure.
    expect(result.doc.headings.map((heading) => heading.text)).toEqual(['Una seccion'])
  })

  it('falls back when the heading exists but there are no scenarios', () => {
    const result = parseEpic('# Epica: vacia\n\nSolo prosa.\n', 'epics/vacia.md', 'vacia')
    expect(result.ok).toBe(false)
    expect(result.ok ? '' : result.reason).toContain('scenario headings')
  })

  it('does not throw on empty input', () => {
    expect(() => parseEpic('', 'epics/empty.md', 'empty')).not.toThrow()
  })
})
