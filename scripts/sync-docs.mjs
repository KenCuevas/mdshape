#!/usr/bin/env node
/**
 * Copies the original QA documentation folder into `src/content/reviews/`.
 *
 * Usage:
 *   npm run sync:docs                 # copies ./reviews
 *   npm run sync:docs -- ../qa/reviews
 *   DOCS_SOURCE=/path/to/reviews npm run sync:docs
 *
 * Only `.md` files are copied. The target folder is wiped first so removed
 * documents disappear from the app as well. Source files are never modified.
 */
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs'
import { extname, join, relative, resolve } from 'node:path'

const root = process.cwd()
const sourceArg = process.env.DOCS_SOURCE ?? process.argv[2] ?? 'reviews'
const source = resolve(root, sourceArg)
const target = resolve(root, 'src', 'content', 'reviews')

if (!existsSync(source) || !statSync(source).isDirectory()) {
  console.error(`[sync:docs] Source folder not found: ${source}`)
  console.error('[sync:docs] Place the documentation in ./reviews or pass a path as argument.')
  process.exit(1)
}

if (resolve(source) === resolve(target)) {
  console.error('[sync:docs] Source and target are the same folder; nothing to do.')
  process.exit(1)
}

rmSync(target, { recursive: true, force: true })
mkdirSync(target, { recursive: true })

cpSync(source, target, {
  recursive: true,
  filter: (src) => statSync(src).isDirectory() || extname(src).toLowerCase() === '.md',
})

function countMarkdown(dir) {
  let count = 0
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) count += countMarkdown(path)
    else if (extname(entry.name).toLowerCase() === '.md') count += 1
  }
  return count
}

console.log(
  `[sync:docs] Copied ${countMarkdown(target)} markdown file(s) from ${relative(root, source) || '.'} to ${relative(root, target)}`,
)
