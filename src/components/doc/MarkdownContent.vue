<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { renderInline, renderMarkdown } from '@/markdown/renderer'
import { useReferenceResolver } from '@/composables/useReferenceResolver'

const props = defineProps<{
  source: string
  /** Tighter spacing for cards and panels. */
  compact?: boolean
  /** Render as an inline fragment (no paragraph). */
  inline?: boolean
  /** Turn scenario / finding identifiers into links (default: true). */
  linkReferences?: boolean
}>()

const router = useRouter()
const resolveReference = useReferenceResolver()
const root = ref<HTMLElement | null>(null)

const html = computed(() => {
  const options = {
    resolveReference: props.linkReferences === false ? undefined : resolveReference,
  }
  return props.inline ? renderInline(props.source, options) : renderMarkdown(props.source, options)
})

const COPY_ICON =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 9h10v11H9zM5 15V4h10"/></svg>'
const CHECK_ICON =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l4 4L19 6"/></svg>'

/** Adds a copy button to every code block (done after the HTML is injected). */
function enhance(): void {
  const container = root.value
  if (!container) return
  for (const pre of container.querySelectorAll<HTMLPreElement>('pre.code-block')) {
    if (pre.querySelector('.copy-button')) continue
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'copy-button'
    button.setAttribute('aria-label', 'Copiar código')
    button.title = 'Copiar código'
    button.innerHTML = COPY_ICON
    pre.appendChild(button)
  }
}

async function copyCode(button: HTMLButtonElement): Promise<void> {
  const code = button.closest('pre')?.querySelector('code')?.textContent ?? ''
  try {
    await navigator.clipboard.writeText(code)
    button.dataset.copied = 'true'
    button.innerHTML = CHECK_ICON
    button.setAttribute('aria-label', 'Copiado')
    window.setTimeout(() => {
      delete button.dataset.copied
      button.innerHTML = COPY_ICON
      button.setAttribute('aria-label', 'Copiar código')
    }, 1500)
  } catch {
    button.setAttribute('aria-label', 'No se pudo copiar')
  }
}

function onClick(event: MouseEvent): void {
  const target = event.target as HTMLElement | null
  if (!target) return
  const copyButton = target.closest<HTMLButtonElement>('.copy-button')
  if (copyButton) {
    event.preventDefault()
    void copyCode(copyButton)
    return
  }
  const link = target.closest<HTMLAnchorElement>('a[data-internal-link]')
  if (link && !event.metaKey && !event.ctrlKey && !event.shiftKey && event.button === 0) {
    event.preventDefault()
    void router.push(link.getAttribute('href') ?? '/')
  }
}

onMounted(enhance)
watch(html, enhance, { flush: 'post' })
</script>

<template>
  <span v-if="inline" ref="root" class="md-inline" @click="onClick" v-html="html" />
  <div
    v-else
    ref="root"
    class="md"
    :class="{ 'md-compact': compact }"
    @click="onClick"
    v-html="html"
  />
</template>
