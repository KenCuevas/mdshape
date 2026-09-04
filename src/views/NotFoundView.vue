<script setup lang="ts">
import { RouterLink } from 'vue-router'
import EmptyState from '@/components/ui/EmptyState.vue'
</script>

<template>
  <div class="page">
    <EmptyState title="Página no encontrada">
      <p>La ruta no existe. <RouterLink :to="{ name: 'home' }">Volver al inicio</RouterLink>.</p>
    </EmptyState>
  </div>
</template>
