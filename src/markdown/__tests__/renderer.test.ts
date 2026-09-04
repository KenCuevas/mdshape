/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest'
import { renderInline, renderMarkdown } from '@/markdown/renderer'

describe('renderMarkdown', () => {
  it('removes scripts and event handlers', () => {
    const html = renderMarkdown('<script>alert(1)</script><img src=x onerror="alert(1)">texto')
    expect(html).not.toContain('<script')
    expect(html).not.toContain('onerror')
    expect(html).toContain('texto')
  })

  it('adds ids to headings matching the parser slugs', () => {
    const html = renderMarkdown('## 1. Alcance\n\n## Alcance\n\n## Alcance')
    expect(html).toContain('<h2 id="1-alcance">')
    expect(html).toContain('<h2 id="alcance">')
    expect(html).toContain('<h2 id="alcance-2">')
  })

  it('wraps tables so they can scroll horizontally', () => {
    const html = renderMarkdown('| a | b |\n| - | - |\n| 1 | 2 |')
    expect(html).toContain('<div class="table-wrap"><table>')
  })

  it('highlights known languages and escapes unknown ones', () => {
    const json = renderMarkdown('```json\n{ "a": 1 }\n```')
    expect(json).toContain('class="hljs language-json"')
    expect(json).toContain('hljs-')
    const weird = renderMarkdown('```nope\n<b>x</b>\n```')
    expect(weird).toContain('&lt;b&gt;x&lt;/b&gt;')
    expect(weird).toContain('data-lang="nope"')
  })

  it('links scenario and finding identifiers through the resolver', () => {
    const html = renderMarkdown('Ver PUB-S03 y `OTP-S01` y SEC-01, pero no HTTP-200.', {
      resolveReference: (id) =>
        id === 'SEC-01' ? '/findings/SEC-01' : id.includes('-S0') ? `/board?s=${id}` : null,
    })
    expect(html).toContain(
      '<a href="/board?s=PUB-S03" class="ref-link" data-internal-link="">PUB-S03</a>',
    )
    expect(html).toContain(
      '<a href="/board?s=OTP-S01" class="ref-link" data-internal-link=""><code>OTP-S01</code></a>',
    )
    expect(html).toContain('href="/findings/SEC-01"')
    expect(html).not.toContain('href="/board?s=HTTP-200"')
  })

  it('does not touch identifiers that already sit inside a link', () => {
    const html = renderMarkdown('[SEC-01](#sec-01)', { resolveReference: () => '/x' })
    expect(html.match(/<a /g)).toHaveLength(1)
    expect(html).toContain('href="#sec-01"')
  })

  it('opens external links in a new tab', () => {
    const html = renderMarkdown('[web](https://example.com)')
    expect(html).toContain('target="_blank"')
    expect(html).toContain('rel="noopener noreferrer"')
  })

  it('renders inline fragments without a paragraph', () => {
    expect(renderInline('`POST /x` con *enfasis*')).toBe(
      '<code>POST /x</code> con <em>enfasis</em>',
    )
  })
})
