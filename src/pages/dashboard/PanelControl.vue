<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useAuth } from "@/auth/useAuth";
import { push } from "notivue";
import Footer from "@/components/Footer.vue";
import Icon from "@/components/Icon.vue";
import reportesService, { type ResumenGeneral } from "@/services/reportesService";
import pagosService from "@/services/pagosService";
import KPICard from "@/components/dashboard/KPICard.vue";
import ResumenPeriodo from "@/components/dashboard/ResumenPeriodo.vue";
import AccionesRapidas from "@/components/dashboard/AccionesRapidas.vue";

const { state } = useAuth();

// ─── Date range filter ──────────────────────────────────────────────

type Range = "week" | "month";
const activeRange = ref<Range>("week");

const getRangeDates = (range: Range) => {
  const today = new Date();
  const fin = today.toISOString().slice(0, 10);
  const start = new Date(today);
  if (range === "week") {
    start.setDate(start.getDate() - 6);
  } else {
    start.setDate(1);
  }
  return { inicio: start.toISOString().slice(0, 10), fin };
};

// ─── State ─────────────────────────────────────────────────────────

const loading = ref(true);
const resumen = ref<ResumenGeneral | null>(null);
const cobrosHoy = ref(0);
const totalCobrosHoy = ref(0);
const resumenDiario = ref<any[]>([]);

// ─── Load data ─────────────────────────────────────────────────────

const loadDashboard = async () => {
  loading.value = true;
  try {
    const { inicio, fin } = getRangeDates(activeRange.value);

    const [generalData, hoyData, diarioData] = await Promise.all([
      reportesService.getGeneral({ inicio, fin }),
      pagosService.getHoy(),
      reportesService.getResumenDiario(7),
    ]);

    resumen.value = generalData.resumen ?? generalData;
    cobrosHoy.value = hoyData.items?.length ?? 0;
    totalCobrosHoy.value = hoyData.total_cuota ?? 0;
    resumenDiario.value = diarioData.data ?? [];
  } catch (err: any) {
    push.error(err.response?.data?.detail || "Error al cargar el panel de control");
  } finally {
    loading.value = false;
  }
};

const changeRange = (range: Range) => {
  activeRange.value = range;
  loadDashboard();
};

onMounted(loadDashboard);

// ─── Helpers ───────────────────────────────────────────────────────

const formatCurrency = (val: number | null | undefined) => {
  if (val == null) return "Q0.00";
  return `Q${val.toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatCompact = (val: number) => {
  if (val >= 1_000_000) return `Q${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `Q${(val / 1_000).toFixed(1)}k`;
  return `Q${val.toFixed(0)}`;
};

const maxDiario = computed(() => {
  if (!resumenDiario.value.length) return 1;
  return Math.max(...resumenDiario.value.map((d: any) => d.total || 0), 1);
});

const totalRecaudadoPeriodo = computed(() =>
  resumenDiario.value.reduce((acc: number, d: any) => acc + (d.total || 0), 0)
);

const formatShortDate = (dateStr: string) => {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("es-GT", { day: "2-digit", month: "short" });
};

const todayLabel = computed(() => {
  return new Date().toLocaleDateString("es-GT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
});

// ─── Stat cards ────────────────────────────────────────────────────

const statCards = computed(() => {
  const r = resumen.value;
  return [
    {
      title: "Capital Activo",
      value: formatCurrency(r?.capital_colocado_nuevo),
      sub: `${r?.prestamos_activos ?? 0} préstamos activos`,
      icon: "Wallet",
      gradient: "from-blue-500 to-indigo-600",
      bgGlow: "bg-blue-500/10",
      textColor: "text-blue-600 dark:text-blue-400",
    },
    {
      title: "Capital Recuperado",
      value: formatCurrency(r?.capital_recuperado),
      sub: `${r?.total_pagos ?? 0} pagos en el período`,
      icon: "TrendingUp",
      gradient: "from-emerald-500 to-teal-600",
      bgGlow: "bg-emerald-500/10",
      textColor: "text-emerald-600 dark:text-emerald-400",
    },
    {
      title: "Mora Total",
      value: formatCurrency(r?.mora_total),
      sub: `Recuperada: ${formatCurrency(r?.mora_recolectada)}`,
      icon: "AlertTriangle",
      gradient: "from-red-500 to-rose-600",
      bgGlow: "bg-red-500/10",
      textColor: "text-red-600 dark:text-red-400",
    },
    {
      title: "Cobros Hoy",
      value: cobrosHoy.value.toString(),
      sub: formatCurrency(totalCobrosHoy.value),
      icon: "CalendarCheck",
      gradient: "from-amber-500 to-orange-600",
      bgGlow: "bg-amber-500/10",
      textColor: "text-amber-600 dark:text-amber-400",
    },
  ];
});

// ─── Quick links ────────────────────────────────────────────────────

const quickLinks = computed(() => [
  {
    to: "/clientes",
    icon: "Users",
    label: "Clientes",
    sub: "Directorio completo",
    color: "bg-blue-50 dark:bg-blue-500/10",
    iconColor: "text-blue-600 dark:text-blue-400",
    badge: null,
  },
  {
    to: "/prestamos",
    icon: "Wallet",
    label: "Préstamos",
    sub: "Gestionar créditos",
    color: "bg-amber-50 dark:bg-amber-500/10",
    iconColor: "text-amber-600 dark:text-amber-400",
    badge: null,
  },
  {
    to: "/pagos",
    icon: "CalendarCheck",
    label: "Cobros del Día",
    sub: "Fichas de hoy",
    color: "bg-emerald-50 dark:bg-emerald-500/10",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    badge: cobrosHoy.value > 0 ? cobrosHoy.value : null,
  },
  {
    to: "/empleados",
    icon: "UserCog",
    label: "Empleados",
    sub: "Administrar personal",
    color: "bg-purple-50 dark:bg-purple-500/10",
    iconColor: "text-purple-600 dark:text-purple-400",
    badge: null,
  },
]);

// ─── Resumen rows ───────────────────────────────────────────────────

const resumenRows = computed(() => {
  const r = resumen.value;
  return [
    {
      label: "Interés Recolectado",
      value: formatCurrency(r?.interes_recolectado),
      icon: "Percent",
      color: "text-emerald-600 dark:text-emerald-400",
      dot: "bg-emerald-500",
    },
    {
      label: "Flujo de Caja",
      value: formatCurrency(r?.flujo_caja_total),
      icon: "ArrowLeftRight",
      color: "text-blue-600 dark:text-blue-400",
      dot: "bg-blue-500",
    },
    {
      label: "Préstamos Otorgados",
      value: r?.prestamos_otorgados ?? 0,
      icon: "FilePlus",
      color: "text-card-foreground",
      dot: "bg-violet-500",
    },
    {
      label: "Total de Pagos",
      value: r?.total_pagos ?? 0,
      icon: "CheckSquare",
      color: "text-card-foreground",
      dot: "bg-gray-400",
    },
  ];
});
</script>

<template>
  <div class="grid grid-cols-12 mt-2 mb-6 gap-7">

    <!-- ── Welcome Banner ─────────────────────────────────────────── -->
    <div class="col-span-12">
      <div class="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary to-blue-400 p-8 text-white">
        <div class="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p class="text-white/60 text-xs font-medium uppercase tracking-widest mb-1 capitalize">
              {{ todayLabel }}
            </p>
            <h2 class="text-2xl font-bold mb-1.5">
              ¡Bienvenido, {{ state?.user?.name || "Administrador" }}!
            </h2>
            <p class="text-white/75 text-sm max-w-lg">
              Panel de control de Confía.
              <span v-if="!loading && cobrosHoy > 0" class="text-white font-semibold">
                Tienes {{ cobrosHoy }} cobro{{ cobrosHoy !== 1 ? 's' : '' }} programados para hoy.
              </span>
              <span v-else-if="!loading" class="text-white/60">
                No hay cobros registrados para hoy.
              </span>
            </p>
          </div>
          <!-- Range filter -->
          <div class="flex gap-1 bg-white/20 rounded-xl p-1 self-start sm:self-center shrink-0">
            <button
              @click="changeRange('week')"
              :class="[
                'px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200',
                activeRange === 'week'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              ]"
            >Esta semana</button>
            <button
              @click="changeRange('month')"
              :class="[
                'px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200',
                activeRange === 'month'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              ]"
            >Este mes</button>
          </div>
        </div>
        <!-- decorative circles -->
        <div class="absolute -top-6 -right-6 w-36 h-36 bg-white/10 rounded-full pointer-events-none"></div>
        <div class="absolute -bottom-10 -right-4 w-56 h-56 bg-white/5 rounded-full pointer-events-none"></div>
        <div class="absolute top-4 right-24 w-16 h-16 bg-white/10 rounded-full pointer-events-none"></div>
      </div>
    </div>

    <!-- ── Stat Cards (KPI) ──────────────────────────────────────────── -->
    <div
      v-for="(card, index) in statCards"
      :key="index"
      class="col-span-12 sm:col-span-6 lg:col-span-4"
    >
      <KPICard
        v-if="!loading"
        :title="card.title"
        :icon="card.icon"
        :value="card.value"
        :subtitle="card.sub"
        :gradient="card.gradient"
        :bgGlow="card.bgGlow"
        :textColor="card.textColor"
      />
      <!-- Skeleton loading -->
      <div v-else class="rounded-xl border border-border bg-card p-6 relative overflow-hidden h-full">
        <div class="animate-pulse space-y-3">
          <div class="h-10 bg-muted rounded-lg w-10"></div>
          <div class="h-8 bg-muted rounded-lg w-36"></div>
          <div class="h-4 bg-muted rounded w-28"></div>
          <div class="h-3 bg-muted rounded w-24 mt-2"></div>
        </div>
      </div>
    </div>

    <!-- ── Recaudación Diaria ──────────────────────────────────────── -->
    <div class="col-span-12 lg:col-span-8">
      <div class="rounded-xl border border-border bg-card p-6 h-full">
        <div class="flex items-start justify-between mb-6">
          <div>
            <h4 class="text-base font-bold text-card-foreground">Recaudación Diaria</h4>
            <p class="text-xs text-muted mt-0.5">
              Últimos 7 días
              <template v-if="!loading && resumenDiario.length > 0">
                · Total: <span class="font-semibold text-card-foreground">{{ formatCurrency(totalRecaudadoPeriodo) }}</span>
              </template>
            </p>
          </div>
          <button
            @click="loadDashboard"
            class="p-2 rounded-lg hover:bg-hover transition-colors"
            title="Actualizar datos"
          >
            <Icon name="RefreshCw" :size="15" :class="['text-muted transition-transform', loading ? 'animate-spin' : '']" />
          </button>
        </div>

        <!-- Skeleton -->
        <div v-if="loading" class="flex items-end gap-2 h-44 px-1">
          <div
            v-for="(h, i) in [55, 80, 40, 95, 65, 30, 75]"
            :key="i"
            class="flex-1 bg-muted animate-pulse rounded-t-md"
            :style="{ height: `${h}%` }"
          ></div>
        </div>

        <!-- Empty state -->
        <div v-else-if="resumenDiario.length === 0" class="flex flex-col items-center justify-center h-44 gap-3">
          <div class="w-14 h-14 rounded-2xl bg-muted/40 flex items-center justify-center">
            <Icon name="BarChart3" :size="28" class="text-muted" />
          </div>
          <div class="text-center">
            <p class="text-sm font-medium text-card-foreground">Sin recaudación registrada</p>
            <p class="text-xs text-muted mt-0.5">No hay pagos en los últimos 7 días.</p>
          </div>
        </div>

        <!-- Bar chart -->
        <div v-else class="flex items-end gap-2 h-44 px-1">
          <div
            v-for="(d, i) in resumenDiario"
            :key="i"
            class="flex-1 flex flex-col items-center gap-1.5 group/bar"
          >
            <span class="text-[10px] text-muted font-semibold leading-none opacity-0 group-hover/bar:opacity-100 transition-opacity">
              {{ formatCompact(d.total) }}
            </span>
            <div
              class="w-full rounded-t-md bg-gradient-to-t from-primary to-primary/60 transition-all duration-500 hover:from-primary hover:to-primary cursor-default relative"
              :style="{ height: `${Math.max((d.total / maxDiario) * 100, 5)}%` }"
              :title="`${formatShortDate(d.fecha)}: ${formatCurrency(d.total)}`"
            >
              <!-- tooltip on hover -->
              <div class="absolute -top-8 left-1/2 -translate-x-1/2 bg-card border border-border text-[10px] font-semibold px-2 py-1 rounded-md shadow-md whitespace-nowrap opacity-0 group-hover/bar:opacity-100 transition-opacity pointer-events-none z-10">
                {{ formatCurrency(d.total) }}
              </div>
            </div>
            <span class="text-[10px] text-muted leading-none">{{ formatShortDate(d.fecha) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Acciones Rápidas ──────────────────────────────────────────── -->
    <div class="col-span-12 lg:col-span-4">
      <AccionesRapidas :links="quickLinks" />
    </div>

    <!-- ── Resumen del Período ────────────────────────────────────── -->
    <div class="col-span-12 lg:col-span-6">
      <ResumenPeriodo :rows="resumenRows" :loading="loading" :activeRange="activeRange" />
    </div>

    <Footer />
  </div>
</template>
