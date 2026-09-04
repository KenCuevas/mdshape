import type { DocPage } from '@/types'
import { extractHeadings, findHeadings, splitLines } from './common'
import { plainText } from '@/utils/text'

/**
 * Wraps any markdown file as a document page. The first level-1 heading
 * becomes the title and is removed from the body so the view can render it
 * as a page header.
 */
export function parseDoc(text: string, sourcePath: string, slug: string): DocPage {
  const lines = splitLines(text)
  const h1 = findHeadings(lines).find((heading) => heading.level === 1)
  let title = slug
  let bodyLines = lines
  if (h1) {
    title = plainText(h1.text)
    bodyLines = [...lines.slice(0, h1.index), ...lines.slice(h1.index + 1)]
  }
  const markdown = bodyLines
    .join('\n')
    .replace(/^\s*\n/, '')
    .trimEnd()
  return {
    slug,
    title,
    markdown,
    headings: extractHeadings(markdown),
    sourcePath,
  }
}
