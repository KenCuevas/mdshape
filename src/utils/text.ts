/** Removes diacritics so `Descripción` and `Descripcion` compare equal. */
export function stripAccents(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

/** Lower-case, accent-free, whitespace-collapsed text for comparisons and search. */
export function normalizeText(text: string): string {
  return stripAccents(text).toLowerCase().replace(/\s+/g, ' ').trim()
}

/** GitHub-like slug for heading anchors. */
export function slugify(text: string): string {
  return (
    stripAccents(text)
      .toLowerCase()
      // drop inline markdown markers
      .replace(/[`*_~]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-') || 'section'
  )
}

/** Produces unique slugs in document order, mirroring how the renderer assigns ids. */
export function createSlugger(): (text: string) => string {
  const seen = new Map<string, number>()
  return (text: string) => {
    const base = slugify(text)
    const count = seen.get(base) ?? 0
    seen.set(base, count + 1)
    return count === 0 ? base : `${base}-${count + 1}`
  }
}

/** Strips inline markdown (links, code, emphasis) to get plain text. */
export function plainText(markdown: string): string {
  return markdown
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/[*_~]+/g, '')
    .trim()
}
