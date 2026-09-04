<script setup lang="ts">
export type IconName =
  | 'menu'
  | 'close'
  | 'sun'
  | 'moon'
  | 'search'
  | 'copy'
  | 'check'
  | 'chevron-down'
  | 'chevron-right'
  | 'arrow-left'
  | 'arrow-right'
  | 'alert'
  | 'home'
  | 'board'
  | 'epic'
  | 'finding'
  | 'doc'
  | 'filter'

const PATHS: Record<IconName, string> = {
  menu: 'M4 6h16M4 12h16M4 18h16',
  close: 'M6 6l12 12M18 6L6 18',
  sun: 'M12 4v2m0 12v2m8-8h-2M6 12H4m12.95-4.95-1.41 1.41M8.46 15.54l-1.41 1.41m0-9.9 1.41 1.41m7.07 7.07 1.41 1.41M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm9 16-4-4',
  copy: 'M9 9h10v11H9zM5 15V4h10',
  check: 'M5 12l4 4L19 6',
  'chevron-down': 'M6 9l6 6 6-6',
  'chevron-right': 'M9 6l6 6-6 6',
  'arrow-left': 'M19 12H5m6-6-6 6 6 6',
  'arrow-right': 'M5 12h14m-6-6 6 6-6 6',
  alert:
    'M12 9v4m0 4h.01M10.3 3.9 2.5 18a2 2 0 0 0 1.7 3h15.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z',
  home: 'M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1z',
  board: 'M4 4h4v16H4zm6 0h4v10h-4zm6 0h4v7h-4z',
  epic: 'M4 6h16M4 12h10M4 18h7',
  finding: 'M12 3l9 16H3zM12 10v4m0 3h.01',
  doc: 'M6 3h8l4 4v14H6zM14 3v4h4M9 12h6M9 16h6',
  filter: 'M3 5h18l-7 8v6l-4-2v-4z',
}

defineProps<{ name: IconName; size?: number }>()
</script>

<template>
  <svg
    class="icon"
    :width="size ?? 18"
    :height="size ?? 18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path :d="PATHS[name]" />
  </svg>
</template>

<style scoped>
.icon {
  flex: none;
  display: inline-block;
  vertical-align: -0.2em;
}
</style>
