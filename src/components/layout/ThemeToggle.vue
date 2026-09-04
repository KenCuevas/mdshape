<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { useTheme } from '@/composables/useTheme'

const { resolved, preference, toggle, setPreference } = useTheme()
const label = computed(() =>
  resolved.value === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro',
)
</script>

<template>
  <div class="theme-toggle">
    <button type="button" class="btn btn-ghost" :aria-label="label" :title="label" @click="toggle">
      <AppIcon :name="resolved === 'dark' ? 'sun' : 'moon'" />
      <span class="theme-label">{{ resolved === 'dark' ? 'Oscuro' : 'Claro' }}</span>
    </button>
    <button
      v-if="preference !== 'system'"
      type="button"
      class="btn btn-ghost reset"
      title="Volver a seguir el tema del sistema"
      @click="setPreference('system')"
    >
      Sistema
    </button>
  </div>
</template>

<style scoped>
.theme-toggle {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.theme-label {
  font-size: var(--text-sm);
}

.reset {
  font-size: var(--text-xs);
}
</style>
