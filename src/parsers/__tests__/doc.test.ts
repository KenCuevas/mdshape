import { describe, expect, it } from 'vitest'
import { parseDoc } from '@/parsers'
import docFixture from '../__fixtures__/doc.md?raw'

describe('parseDoc', () => {
  const doc = parseDoc(docFixture, 'test-strategy.md', 'test-strategy')

  it('uses the first level-1 heading as title and removes it from the body', () => {
    expect(doc.title).toBe('Estrategia de pruebas')
    expect(doc.markdown.startsWith('Introduccion.')).toBe(true)
  })

  it('extracts level 2 and 3 headings with unique ids, ignoring code fences', () => {
    expect(doc.headings).toEqual([
      { level: 2, text: '1. Alcance', id: '1-alcance' },
      { level: 3, text: '1.1 Incluido', id: '11-incluido' },
      { level: 2, text: '2. Alcance', id: '2-alcance' },
      { level: 2, text: 'Errores', id: 'errores' },
    ])
  })

  it('numbers duplicated slugs', () => {
    const dup = parseDoc('# T\n\n## Alcance\n\n## Alcance\n', 'x.md', 'x')
    expect(dup.headings.map((heading) => heading.id)).toEqual(['alcance', 'alcance-2'])
  })

  it('falls back to the slug when there is no heading', () => {
    expect(parseDoc('texto', 'x.md', 'my-doc').title).toBe('my-doc')
  })
})
