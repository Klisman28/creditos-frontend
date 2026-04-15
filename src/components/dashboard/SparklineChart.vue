<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  data: number[]
  color?: string // Tailwind gradient class
}

const props = withDefaults(defineProps<Props>(), {
  color: 'from-blue-500 to-indigo-600',
})

// Calculate sparkline path
const sparklineData = computed(() => {
  if (!props.data || props.data.length === 0) return { path: '', min: 0, max: 1 }

  const min = Math.min(...props.data)
  const max = Math.max(...props.data)
  const range = max - min || 1
  const width = 100
  const height = 40
  const padding = 2

  const points = props.data.map((value, index) => {
    const x = (index / (props.data.length - 1)) * (width - padding * 2) + padding
    const y = height - ((value - min) / range) * (height - padding * 2) - padding
    return `${x},${y}`
  })

  return {
    path: `M${points.join(' L')}`,
    min,
    max,
  }
})

// Extract gradient colors from Tailwind class
const getGradientUrl = computed(() => {
  // Map common Tailwind gradients to SVG colors
  const gradientMap: Record<string, { from: string; to: string }> = {
    'from-blue-500 to-indigo-600': { from: '#3b82f6', to: '#4f46e5' },
    'from-emerald-500 to-teal-600': { from: '#10b981', to: '#0d9488' },
    'from-red-500 to-rose-600': { from: '#ef4444', to: '#e11d48' },
    'from-amber-500 to-orange-600': { from: '#f59e0b', to: '#ea580c' },
    'from-primary to-primary/60': { from: 'currentColor', to: 'currentColor' },
  }

  return gradientMap[props.color] || { from: '#3b82f6', to: '#4f46e5' }
})
</script>

<template>
  <svg viewBox="0 0 100 40" class="w-full h-full" preserveAspectRatio="none">
    <defs>
      <linearGradient id="sparkline-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" :stop-color="getGradientUrl.from" stop-opacity="0.4" />
        <stop offset="100%" :stop-color="getGradientUrl.to" stop-opacity="0" />
      </linearGradient>
    </defs>

    <!-- Fill area under line -->
    <path
      v-if="sparklineData.path"
      :d="`${sparklineData.path} L100,40 L0,40 Z`"
      fill="url(#sparkline-gradient)"
      class="sparkline-fill"
    />

    <!-- Line chart -->
    <path
      v-if="sparklineData.path"
      :d="sparklineData.path"
      fill="none"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      :stroke="getGradientUrl.from"
      class="sparkline-line"
      vector-effect="non-scaling-stroke"
    />

    <!-- Data points -->
    <circle
      v-for="(value, index) in data"
      :key="index"
      :cx="`${(index / (data.length - 1)) * 100}`"
      :cy="`${40 - ((value - sparklineData.min) / (sparklineData.max - sparklineData.min || 1)) * 36}`"
      r="1"
      :fill="getGradientUrl.from"
      opacity="0.5"
    />
  </svg>
</template>

<style scoped>
svg {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
