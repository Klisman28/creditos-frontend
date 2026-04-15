<script setup lang="ts">
import Icon from '@/components/Icon.vue'

interface Row {
  label: string
  value: string | number
  icon: string
  color: string
  dot: string
}

interface Props {
  rows: Row[]
  loading: boolean
  activeRange: 'week' | 'month'
}

defineProps<Props>()

const rangeLabel = (range: 'week' | 'month') => {
  return range === 'week' ? 'Esta semana' : 'Este mes'
}

const getBgColor = (dotClass: string): string => {
  const colorMap: Record<string, string> = {
    'bg-emerald-500': 'bg-emerald-50 dark:bg-emerald-500/10',
    'bg-blue-500': 'bg-blue-50 dark:bg-blue-500/10',
    'bg-violet-500': 'bg-violet-50 dark:bg-violet-500/10',
    'bg-gray-400': 'bg-gray-50 dark:bg-gray-500/10',
  }
  return colorMap[dotClass] || 'bg-gray-50 dark:bg-gray-500/10'
}
</script>

<template>
  <div class="rounded-xl border border-border bg-card p-6 h-full flex flex-col">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h4 class="text-base font-bold text-card-foreground">Resumen del Período</h4>
        <p class="text-xs text-muted mt-1">Métricas principales</p>
      </div>
      <span class="text-[10px] font-bold text-muted bg-hover px-2.5 py-1 rounded-full uppercase tracking-wider">
        {{ rangeLabel(activeRange) }}
      </span>
    </div>

    <!-- skeleton -->
    <div v-if="loading" class="space-y-3 flex-1">
      <div v-for="i in 4" :key="i" class="flex items-center justify-between p-3 bg-muted/30 rounded-lg animate-pulse">
        <div class="h-4 bg-muted rounded w-32"></div>
        <div class="h-4 bg-muted rounded w-24"></div>
      </div>
    </div>

    <!-- content -->
    <div v-else class="space-y-2 flex-1">
      <div
        v-for="(row, i) in rows"
        :key="i"
        :class="['flex items-center justify-between p-4 rounded-lg transition-all duration-200 hover:bg-hover border border-transparent hover:border-border group', getBgColor(row.dot)]"
      >
        <div class="flex items-center gap-3 min-w-0">
          <div :class="[row.dot, 'w-8 h-8 rounded-lg flex items-center justify-center shrink-0']">
            <Icon :name="row.icon" :size="16" class="text-white" />
          </div>
          <div class="min-w-0">
            <p class="text-xs font-semibold text-muted uppercase tracking-wider">{{ row.label }}</p>
          </div>
        </div>
        <span :class="['text-sm font-bold shrink-0 ml-2', row.color]">{{ row.value }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
:deep(.icon) {
  transition: all 0.2s ease;
}
</style>
