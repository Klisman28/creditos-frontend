<script setup lang="ts">
import { computed } from 'vue'
import Icon from '@/components/Icon.vue'
import SparklineChart from './SparklineChart.vue'

interface Props {
  title: string
  icon: string
  value: string | number
  variation?: number  // porcentaje de cambio
  variationLabel?: string
  subtitle: string
  chartData?: number[]
  gradient: string  // Tailwind gradient
  bgGlow: string
  textColor: string
}

const props = withDefaults(defineProps<Props>(), {
  variation: 0,
  variationLabel: 'vs. semana anterior',
  chartData: () => [],
})

const isPositive = computed(() => props.variation >= 0)
const variationIcon = computed(() => isPositive.value ? 'TrendingUp' : 'TrendingDown')
</script>

<template>
  <div class="rounded-xl border border-border bg-card p-6 relative overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 group cursor-default h-full">
    <!-- Background glow effect -->
    <div :class="[bgGlow, 'absolute -top-8 -right-8 w-32 h-32 rounded-full blur-2xl pointer-events-none']"></div>

    <div class="relative flex flex-col h-full gap-4">

      <!-- Header with icon -->
      <div class="flex items-start justify-between">
        <div :class="['bg-gradient-to-br', gradient, 'w-10 h-10 rounded-xl flex items-center justify-center shadow-md shrink-0']">
          <Icon :name="icon" :size="18" class="text-white" />
        </div>
        <!-- Variation badge -->
        <div v-if="variation !== 0" :class="['flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full', isPositive ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400']">
          <Icon :name="variationIcon" :size="14" />
          <span>{{ Math.abs(variation) }}%</span>
        </div>
      </div>

      <!-- Title -->
      <div>
        <p class="text-[11px] font-bold text-muted uppercase tracking-widest mb-1">{{ title }}</p>
        <h3 class="text-2xl font-extrabold text-card-foreground leading-tight">{{ value }}</h3>
      </div>

      <!-- Variation info -->
      <div v-if="variation !== 0" class="text-xs text-muted">
        {{ variationLabel }}
      </div>

      <!-- Sparkline chart -->
      <div v-if="chartData && chartData.length > 0" class="h-10 -mx-2">
        <SparklineChart :data="chartData" :color="gradient" />
      </div>

      <!-- Subtitle -->
      <p class="text-xs text-muted mt-auto">{{ subtitle }}</p>
    </div>
  </div>
</template>

<style scoped>
/* Smooth transitions */
:deep(.sparkline-line) {
  transition: all 0.3s ease;
}
</style>
