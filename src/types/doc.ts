export interface Heading {
  level: number
  text: string
  /** Slug used as element id and as anchor in the table of contents. */
  id: string
}

/** A long-form document rendered as a whole (README, strategy, coverage matrix, fallbacks). */
export interface DocPage {
  slug: string
  title: string
  /** Markdown body without the leading level-1 heading. */
  markdown: string
  headings: Heading[]
  sourcePath: string
}
