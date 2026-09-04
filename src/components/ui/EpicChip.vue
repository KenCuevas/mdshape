<script setup lang="ts">
import { RouterLink } from 'vue-router'

defineProps<{ slug: string; name: string; link?: boolean }>()
</script>

<template>
  <RouterLink
    v-if="link"
    class="chip"
    :to="{ name: 'epic', params: { slug } }"
    :title="`Ver épica ${name}`"
  >
    {{ name }}
  </RouterLink>
  <span v-else class="chip" :title="`Épica ${name}`">{{ name }}</span>
</template>
