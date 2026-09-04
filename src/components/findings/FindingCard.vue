<script setup lang="ts">
import { RouterLink } from 'vue-router'
import type { Finding } from '@/types'
import SeverityBadge from '@/components/ui/SeverityBadge.vue'
import { severityClass } from '@/data/labels'

defineProps<{ finding: Finding; scenarioCount: number }>()
</script>

<template>
  <RouterLink
    class="finding card"
    :class="severityClass(finding.severity)"
    :to="{ name: 'finding', params: { id: finding.id } }"
  >
    <span class="finding-top">
      <span class="mono finding-id">{{ finding.id }}</span>
      <SeverityBadge :severity="finding.severity" />
    </span>
    <span class="finding-title">{{ finding.title }}</span>
    <span class="finding-bottom">
      <span v-if="finding.area" class="chip">{{ finding.area }}</span>
      <span v-if="scenarioCount > 0" class="muted text-sm">
        {{ scenarioCount }} {{ scenarioCount === 1 ? 'escenario' : 'escenarios' }}
      </span>
    </span>
  </RouterLink>
</template>

<style scoped>
.finding {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: var(--space-4);
  color: var(--fg);
  border-left: 4px solid var(--badge-color);
  transition:
    box-shadow var(--transition),
    transform var(--transition);
}

.finding:hover {
  text-decoration: none;
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}

.finding-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.finding-id {
  font-weight: 650;
  font-size: var(--text-sm);
}

.finding-title {
  font-weight: 550;
  line-height: 1.4;
}

.finding-bottom {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}
</style>
