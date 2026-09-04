/**
 * The only place that touches the file system (at build time). Every markdown
 * file under `src/content/reviews/` is inlined as a raw string.
 */
export const contentFiles = import.meta.glob('@/content/reviews/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>
