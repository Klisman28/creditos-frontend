<script setup lang="ts">
import { useRouter } from "vue-router";

const router = useRouter();
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
    <div class="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
      <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
    </div>
    <h1 class="text-2xl font-bold text-card-foreground mb-2">Acceso Denegado</h1>
    <p class="text-muted-foreground mb-8 max-w-md">
      No tienes permiso para acceder a esta sección. Contacta a un administrador si crees que esto es un error.
    </p>
    <button
      class="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
      @click="router.push('/panel')"
    >
      Volver al Panel
    </button>
  </div>
</template>
