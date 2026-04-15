<script setup lang="ts">
import Icon from '@/components/Icon.vue'

interface Link {
  to: string
  icon: string
  label: string
  sub: string
  color: string
  iconColor: string
  badge: number | null
}

interface Props {
  links: Link[]
}

defineProps<Props>()
</script>

<template>
  <div class="rounded-xl border border-border bg-card p-6 h-full flex flex-col">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h4 class="text-base font-bold text-card-foreground">Acciones Rápidas</h4>
        <p class="text-xs text-muted mt-1">Gestión rápida del sistema</p>
      </div>
    </div>

    <div class="space-y-2 flex-1">
      <RouterLink
        v-for="link in links"
        :key="link.to"
        :to="link.to"
        class="flex items-center gap-3 rounded-xl p-4 transition-all duration-200 hover:bg-hover group border border-transparent hover:border-border"
      >
        <div :class="[link.color, 'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 duration-200']">
          <Icon :name="link.icon" :size="18" :class="link.iconColor" />
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold text-card-foreground group-hover:text-primary transition-colors leading-tight">
            {{ link.label }}
          </p>
          <p class="text-xs text-muted truncate">{{ link.sub }}</p>
        </div>
        <div v-if="link.badge" class="flex items-center gap-2 shrink-0">
          <span class="text-[10px] font-bold bg-emerald-500 text-white px-2 py-1 rounded-full leading-tight">
            {{ link.badge }}
          </span>
        </div>
        <Icon name="ChevronRight" :size="14" class="text-muted group-hover:translate-x-1 transition-transform shrink-0" />
      </RouterLink>
    </div>
  </div>
</template>

<style scoped>
:deep(.icon) {
  transition: all 0.2s ease;
}
</style>
