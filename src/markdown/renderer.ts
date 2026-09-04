import MarkdownIt, { type Env, type RendererRule, type StateCore, type Token } from 'markdown-it'
import DOMPurify from 'dompurify'
import { createSlugger } from '@/utils/text'
import { REFERENCE_RE } from '@/parsers/common'
import { highlightCode } from './highlight'

export interface RenderOptions {
  /** Returns an app-internal href for a scenario/finding identifier, or `null` to leave it as text. */
  resolveReference?: (id: string) => string | null
}

interface RenderEnv {
  slug: (text: string) => string
  resolveReference?: (id: string) => string | null
}

/** markdown-it's `Env` is an open record; our typed env is passed through it. */
function toEnv(env: RenderEnv): Env {
  return env as unknown as Env
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function renderFence(code: string, language: string): string {
  const highlighted = highlightCode(code, language)
  const lang = escapeHtml(language.trim().toLowerCase() || 'text')
  const body = highlighted ?? escapeHtml(code)
  return `<pre class="code-block" data-lang="${lang}"><code class="hljs language-${lang}">${body}</code></pre>`
}

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: false,
  breaks: false,
  highlight: renderFence,
})

// Heading ids identical to the ones computed by parsers/common#extractHeadings.
md.core.ruler.push('heading_ids', (state: StateCore) => {
  const env = state.env as unknown as RenderEnv
  for (let i = 0; i < state.tokens.length; i++) {
    const token = state.tokens[i]
    const inline = state.tokens[i + 1]
    if (token?.type === 'heading_open' && inline?.type === 'inline') {
      token.attrSet('id', env.slug(inline.content))
    }
  }
})

// Turn scenario / finding identifiers into internal links.
md.core.ruler.push('reference_links', (state: StateCore) => {
  const env = state.env as unknown as RenderEnv
  const resolve = env.resolveReference
  if (!resolve) return
  for (const block of state.tokens) {
    if (block.type !== 'inline' || !block.children) continue
    const output: Token[] = []
    let linkDepth = 0
    for (const child of block.children) {
      if (child.type === 'link_open') linkDepth += 1
      if (child.type === 'link_close') linkDepth -= 1
      if (linkDepth > 0 || (child.type !== 'text' && child.type !== 'code_inline')) {
        output.push(child)
        continue
      }
      if (child.type === 'code_inline') {
        const href = REFERENCE_RE.test(child.content) ? resolve(child.content.trim()) : null
        REFERENCE_RE.lastIndex = 0
        if (href && child.content.trim().match(/^[A-Z0-9-]+$/)) {
          output.push(makeLinkOpen(state, href), child, makeLinkClose(state))
        } else {
          output.push(child)
        }
        continue
      }
      output.push(...splitTextToken(state, child, resolve))
    }
    block.children = output
  }
})

function makeLinkOpen(state: StateCore, href: string): Token {
  const token = new state.Token('link_open', 'a', 1)
  token.attrSet('href', href)
  token.attrSet('class', 'ref-link')
  token.attrSet('data-internal-link', '')
  return token
}

function makeLinkClose(state: StateCore): Token {
  return new state.Token('link_close', 'a', -1)
}

function splitTextToken(
  state: StateCore,
  token: Token,
  resolve: (id: string) => string | null,
): Token[] {
  const text = token.content
  const result: Token[] = []
  let last = 0
  for (const match of text.matchAll(REFERENCE_RE)) {
    const id = match[1]
    const start = match.index
    if (!id || start === undefined) continue
    const href = resolve(id)
    if (!href) continue
    if (start > last) result.push(makeText(state, text.slice(last, start)))
    const inner = makeText(state, id)
    result.push(makeLinkOpen(state, href), inner, makeLinkClose(state))
    last = start + id.length
  }
  if (result.length === 0) return [token]
  if (last < text.length) result.push(makeText(state, text.slice(last)))
  return result
}

function makeText(state: StateCore, content: string): Token {
  const token = new state.Token('text', '', 0)
  token.content = content
  return token
}

// Tables scroll horizontally inside their own wrapper.
md.renderer.rules.table_open = () => '<div class="table-wrap"><table>'
md.renderer.rules.table_close = () => '</table></div>'

// External links open in a new tab; everything else stays in the app.
const renderTokenRule: RendererRule = (tokens, idx, options, _env, self) =>
  self.renderToken(tokens, idx, options)
const defaultLinkOpen: RendererRule = md.renderer.rules.link_open ?? renderTokenRule
md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  const token = tokens[idx]
  const href = String(token?.attrGet('href') ?? '')
  if (token && /^(https?:)?\/\//i.test(href)) {
    token.attrSet('target', '_blank')
    token.attrSet('rel', 'noopener noreferrer')
  }
  return defaultLinkOpen(tokens, idx, options, env, self)
}

const SANITIZE_CONFIG = {
  USE_PROFILES: { html: true },
  ADD_ATTR: ['target', 'data-internal-link', 'data-lang'],
  FORBID_TAGS: ['style', 'script', 'iframe', 'object', 'embed', 'form', 'input'],
}

/** Renders markdown to sanitized HTML. Safe to bind with `v-html`. */
export function renderMarkdown(source: string, options: RenderOptions = {}): string {
  const env: RenderEnv = { slug: createSlugger(), resolveReference: options.resolveReference }
  const html = md.render(source, toEnv(env))
  return DOMPurify.sanitize(html, SANITIZE_CONFIG)
}

/** Renders a single inline fragment (no wrapping paragraph). */
export function renderInline(source: string, options: RenderOptions = {}): string {
  const env: RenderEnv = { slug: createSlugger(), resolveReference: options.resolveReference }
  const html = md.renderInline(source, toEnv(env))
  return DOMPurify.sanitize(html, SANITIZE_CONFIG)
}
