<script setup lang="ts">
import { ref, onMounted, computed, watch } from "vue";
import reportesService from "@/services/reportesService";
import Footer from "@/components/Footer.vue";
import Icon from "@/components/Icon.vue";
import { Button } from "@/components/ui/button";
import { push } from "notivue";

// ─── Types ─────────────────────────────────────────────────────────

interface Resumen {
  periodo_inicio: string;
  periodo_fin: string;
  capital_colocado_nuevo: number;
  capital_recuperado: number;
  interes_recolectado: number;
  mora_recolectada: number;
  mora_total: number;
  flujo_caja_total: number;
  total_pagos: number;
  prestamos_otorgados: number;
  prestamos_activos: number;
}

interface ClienteRow {
  prestamo_id: number;
  cliente: string;
  dpi: string;
  plan: string;
  monto: number;
  capital_activo: number;
  capital_recuperado: number;
  interes: number;
  mora: number;
  mora_recuperada: number;
  saldo: number;
  pagado: boolean;
  fecha_inicio: string | null;
  fecha_fin: string | null;
}

interface DiarioRow {
  fecha: string;
  capital: number;
  interes: number;
  mora: number;
  total: number;
  cantidad: number;
}

// ─── State ─────────────────────────────────────────────────────────

const activeTab = ref<"general" | "clientes">("general");
const loading = ref(true);
const searchQuery = ref("");
const currentPage = ref(1);
const itemsPerPage = 15;

// Dates — default last 30 days
const today = new Date();
const thirtyDaysAgo = new Date(today);
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

const fechaInicio = ref(formatDateInput(thirtyDaysAgo));
const fechaFin = ref(formatDateInput(today));

// Data
const resumen = ref<Resumen | null>(null);
const clienteRows = ref<ClienteRow[]>([]);
const clienteTotals = ref({ monto: 0, capital_recuperado: 0, mora: 0, saldo: 0 });
const diarioData = ref<DiarioRow[]>([]);

// ─── Helpers ───────────────────────────────────────────────────────

function formatDateInput(d: Date): string {
  return d.toISOString().slice(0, 10);
}

const formatCurrency = (val: number | null) => {
  if (val == null) return "Q0.00";
  return `Q${val.toLocaleString("es-GT", { minimumFractionDigits: 2 })}`;
};

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("es-GT", { day: "2-digit", month: "short", year: "numeric" });
};

const formatShortDate = (dateStr: string) => {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("es-GT", { day: "2-digit", month: "short" });
};

// ─── Load data ─────────────────────────────────────────────────────

const loadGeneral = async () => {
  try {
    const res = await reportesService.getGeneral({ inicio: fechaInicio.value, fin: fechaFin.value });
    resumen.value = res.resumen ?? res;
  } catch (error) {
    push.error("Error al cargar el reporte general");
  }
};

const loadClientes = async () => {
  try {
    const res = await reportesService.getClientes({ inicio: fechaInicio.value, fin: fechaFin.value });
    clienteRows.value = res.items ?? [];
    clienteTotals.value = res.totales ?? { monto: 0, capital_recuperado: 0, mora: 0, saldo: 0 };
  } catch (error) {
    push.error("Error al cargar el reporte de clientes");
  }
};

const loadDiario = async () => {
  try {
    const res = await reportesService.getResumenDiario(14);
    diarioData.value = res.data ?? [];
  } catch (error) {
    console.error("Error loading daily summary:", error);
  }
};

const loadAll = async () => {
  loading.value = true;
  await Promise.all([loadGeneral(), loadClientes(), loadDiario()]);
  loading.value = false;
};

const handleBuscar = () => {
  loadAll();
};

onMounted(loadAll);

// ─── Computed ──────────────────────────────────────────────────────

const filteredClientes = computed(() => {
  if (!searchQuery.value) return clienteRows.value;
  const q = searchQuery.value.toLowerCase();
  return clienteRows.value.filter((c) =>
    `${c.cliente} ${c.dpi} ${c.prestamo_id} ${c.plan}`.toLowerCase().includes(q)
  );
});

const totalPages = computed(() => Math.ceil(filteredClientes.value.length / itemsPerPage));
const paginatedClientes = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  return filteredClientes.value.slice(start, start + itemsPerPage);
});

watch([activeTab, searchQuery], () => { currentPage.value = 1; });

// ─── Chart helpers ─────────────────────────────────────────────────

const maxDiario = computed(() => {
  if (!diarioData.value.length) return 1;
  return Math.max(...diarioData.value.map((d) => d.total), 1);
});

// ─── Summary cards ─────────────────────────────────────────────────

const summaryCards = computed(() => {
  if (!resumen.value) return [];
  const r = resumen.value;
  return [
    {
      label: "Capital Colocado",
      value: formatCurrency(r.capital_colocado_nuevo),
      sub: `${r.prestamos_otorgados} préstamos`,
      icon: "Banknote",
      gradient: "from-blue-500 to-indigo-600",
      bgGlow: "bg-blue-500/10",
    },
    {
      label: "Capital Recuperado",
      value: formatCurrency(r.capital_recuperado),
      sub: `${r.total_pagos} pagos`,
      icon: "TrendingUp",
      gradient: "from-emerald-500 to-teal-600",
      bgGlow: "bg-emerald-500/10",
    },
    {
      label: "Interés Recolectado",
      value: formatCurrency(r.interes_recolectado),
      sub: "En el periodo",
      icon: "Percent",
      gradient: "from-violet-500 to-purple-600",
      bgGlow: "bg-violet-500/10",
    },
    {
      label: "Mora Recolectada",
      value: formatCurrency(r.mora_recolectada),
      sub: `Mora total: ${formatCurrency(r.mora_total)}`,
      icon: "AlertTriangle",
      gradient: "from-amber-500 to-orange-600",
      bgGlow: "bg-amber-500/10",
    },
  ];
});

// ─── Export ─────────────────────────────────────────────────────────

const exportCSV = () => {
  const data = activeTab.value === "general" && resumen.value
    ? [
        ["Concepto", "Valor"],
        ["Capital Colocado", resumen.value.capital_colocado_nuevo],
        ["Capital Recuperado", resumen.value.capital_recuperado],
        ["Interés Recolectado", resumen.value.interes_recolectado],
        ["Mora Recolectada", resumen.value.mora_recolectada],
        ["Mora Total", resumen.value.mora_total],
        ["Flujo de Caja Total", resumen.value.flujo_caja_total],
      ]
    : [
        ["Cod.", "Cliente", "DPI", "Plan", "Monto", "Capital Recuperado", "Mora", "Saldo"],
        ...filteredClientes.value.map((c) => [
          c.prestamo_id, c.cliente, c.dpi, c.plan, c.monto, c.capital_recuperado, c.mora, c.saldo,
        ]),
      ];

  const csvContent = data.map((row) => row.join(",")).join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `reporte_${activeTab.value}_${fechaInicio.value}_${fechaFin.value}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  push.success("CSV exportado exitosamente");
};

const printReport = () => {
  window.print();
};
</script>

<template>
  <div class="grid grid-cols-12 mt-2 mb-6 gap-7">
    <!-- Header -->
    <div class="col-span-12">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 class="text-2xl font-bold text-card-foreground">Reportes</h2>
          <p class="text-sm text-muted mt-1">Reporte general de Confía</p>
        </div>
        <div class="flex items-center gap-2">
          <button @click="exportCSV" class="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-card text-sm font-medium text-card-foreground hover:bg-hover transition-colors" title="Exportar CSV">
            <Icon name="Download" :size="15" />
            CSV
          </button>
          <button @click="printReport" class="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-card text-sm font-medium text-card-foreground hover:bg-hover transition-colors" title="Imprimir">
            <Icon name="Printer" :size="15" />
            Imprimir
          </button>
        </div>
      </div>
    </div>

    <!-- Date Filters -->
    <div class="col-span-12">
      <div class="rounded-xl border border-border bg-card p-5">
        <div class="flex flex-col sm:flex-row gap-4 items-end">
          <div class="flex-1">
            <label class="block text-xs font-medium text-muted mb-1.5">Desde:</label>
            <input
              v-model="fechaInicio"
              type="date"
              class="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
            />
          </div>
          <div class="flex-1">
            <label class="block text-xs font-medium text-muted mb-1.5">Hasta:</label>
            <input
              v-model="fechaFin"
              type="date"
              class="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
            />
          </div>
          <Button @click="handleBuscar" class="gap-2 shrink-0">
            <Icon name="Search" :size="16" />
            Buscar
          </Button>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="col-span-12">
      <div class="flex gap-1 bg-muted/30 rounded-lg p-1 w-fit">
        <button
          @click="activeTab = 'general'"
          :class="[
            'flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-medium transition-all duration-200',
            activeTab === 'general'
              ? 'bg-card text-primary shadow-sm'
              : 'text-muted hover:text-card-foreground'
          ]"
        >
          <Icon name="BarChart3" :size="16" />
          General
        </button>
        <button
          @click="activeTab = 'clientes'"
          :class="[
            'flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-medium transition-all duration-200',
            activeTab === 'clientes'
              ? 'bg-card text-primary shadow-sm'
              : 'text-muted hover:text-card-foreground'
          ]"
        >
          <Icon name="Users" :size="16" />
          Clientes
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="col-span-12 p-12 text-center">
      <div class="w-10 h-10 border-4 rounded-full border-border animate-spin border-t-primary mx-auto mb-4"></div>
      <p class="text-sm text-muted">Cargando reporte...</p>
    </div>

    <!-- ═══════════ GENERAL TAB ═══════════ -->
    <template v-else-if="activeTab === 'general'">
      <!-- Summary Cards -->
      <div class="col-span-12 grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          v-for="(card, i) in summaryCards"
          :key="i"
          class="rounded-xl border border-border bg-card p-5 relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
        >
          <div :class="[card.bgGlow, 'absolute -top-6 -right-6 w-24 h-24 rounded-full blur-2xl']"></div>
          <div class="relative flex items-start justify-between">
            <div>
              <p class="text-xs font-medium text-muted uppercase tracking-wider mb-1">{{ card.label }}</p>
              <p class="text-xl font-bold text-card-foreground">{{ card.value }}</p>
              <p class="text-xs text-muted mt-1">{{ card.sub }}</p>
            </div>
            <div :class="['bg-gradient-to-br', card.gradient, 'w-10 h-10 rounded-lg flex items-center justify-center shadow-lg']">
              <Icon :name="card.icon" :size="20" class="text-white" />
            </div>
          </div>
        </div>
      </div>

      <!-- General Data Table (like legacy) -->
      <div class="col-span-12">
        <div class="rounded-xl border border-border bg-card overflow-hidden">
          <div class="px-5 py-4 border-b border-border">
            <h3 class="text-sm font-semibold text-card-foreground">Resumen del Periodo</h3>
            <p class="text-xs text-muted mt-0.5">{{ formatDate(resumen?.periodo_inicio || null) }} — {{ formatDate(resumen?.periodo_fin || null) }}</p>
          </div>
          <div class="overflow-x-auto" v-if="resumen">
            <table class="w-full text-sm">
              <thead>
                <tr class="bg-muted/30 border-b border-border">
                  <th class="text-left px-5 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider">Capital</th>
                  <th class="text-left px-5 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider">Capital Recolectado</th>
                  <th class="text-left px-5 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider">Interés Recolectado</th>
                  <th class="text-left px-5 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider">Mora Recolectada</th>
                  <th class="text-left px-5 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider">Mora Total</th>
                </tr>
              </thead>
              <tbody>
                <tr class="hover:bg-hover transition-colors">
                  <td class="px-5 py-4 font-semibold text-card-foreground">{{ formatCurrency(resumen.capital_colocado_nuevo) }}</td>
                  <td class="px-5 py-4 font-semibold text-emerald-600 dark:text-emerald-400">{{ formatCurrency(resumen.capital_recuperado) }}</td>
                  <td class="px-5 py-4 font-semibold text-violet-600 dark:text-violet-400">{{ formatCurrency(resumen.interes_recolectado) }}</td>
                  <td class="px-5 py-4 font-semibold text-amber-600 dark:text-amber-400">{{ formatCurrency(resumen.mora_recolectada) }}</td>
                  <td class="px-5 py-4 font-semibold text-red-600 dark:text-red-400">{{ formatCurrency(resumen.mora_total) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Extra Stats Row -->
      <div class="col-span-12 grid grid-cols-1 sm:grid-cols-3 gap-4" v-if="resumen">
        <div class="rounded-xl border border-border bg-card p-5">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
              <Icon name="FileText" :size="20" class="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p class="text-xs text-muted uppercase tracking-wider">Préstamos Activos</p>
              <p class="text-xl font-bold text-card-foreground">{{ resumen.prestamos_activos }}</p>
            </div>
          </div>
        </div>
        <div class="rounded-xl border border-border bg-card p-5">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
              <Icon name="CheckCircle" :size="20" class="text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p class="text-xs text-muted uppercase tracking-wider">Total Pagos</p>
              <p class="text-xl font-bold text-card-foreground">{{ resumen.total_pagos }}</p>
            </div>
          </div>
        </div>
        <div class="rounded-xl border border-border bg-card p-5">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center">
              <Icon name="Wallet" :size="20" class="text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <p class="text-xs text-muted uppercase tracking-wider">Flujo de Caja</p>
              <p class="text-xl font-bold text-card-foreground">{{ formatCurrency(resumen.flujo_caja_total) }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Mini Chart -->
      <div class="col-span-12" v-if="diarioData.length > 0">
        <div class="rounded-xl border border-border bg-card p-5">
          <div class="flex items-center justify-between mb-5">
            <div>
              <h3 class="text-sm font-semibold text-card-foreground">Recaudación Diaria</h3>
              <p class="text-xs text-muted mt-0.5">Últimos {{ diarioData.length }} días con actividad</p>
            </div>
          </div>
          <div class="flex items-end gap-1.5 h-40">
            <div
              v-for="(d, i) in diarioData"
              :key="i"
              class="flex-1 flex flex-col items-center gap-1"
            >
              <span class="text-[10px] text-muted font-medium">{{ formatCurrency(d.total) }}</span>
              <div
                class="w-full rounded-t-md bg-gradient-to-t from-primary/80 to-primary transition-all duration-500 hover:from-primary hover:to-primary/90"
                :style="{ height: `${Math.max((d.total / maxDiario) * 100, 4)}%` }"
                :title="`${formatShortDate(d.fecha)}: ${formatCurrency(d.total)}`"
              ></div>
              <span class="text-[10px] text-muted">{{ formatShortDate(d.fecha) }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- ═══════════ CLIENTES TAB ═══════════ -->
    <template v-else-if="activeTab === 'clientes' && !loading">
      <!-- Search -->
      <div class="col-span-12">
        <div class="rounded-xl border border-border bg-card p-5">
          <div class="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div class="relative w-full sm:w-80">
              <Icon name="Search" :size="18" class="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Buscar por cliente, DPI, plan..."
                class="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-background text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                @input="currentPage = 1"
              />
            </div>
            <span class="text-sm text-muted">
              <strong class="text-card-foreground">{{ filteredClientes.length }}</strong> préstamos
            </span>
          </div>
        </div>
      </div>

      <!-- Totals Row -->
      <div class="col-span-12 grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="rounded-xl border border-border bg-card p-4">
          <p class="text-xs text-muted uppercase tracking-wider">Total Desembolsado</p>
          <p class="text-lg font-bold text-card-foreground mt-1">{{ formatCurrency(clienteTotals.monto) }}</p>
        </div>
        <div class="rounded-xl border border-border bg-card p-4">
          <p class="text-xs text-muted uppercase tracking-wider">Capital Recuperado</p>
          <p class="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-1">{{ formatCurrency(clienteTotals.capital_recuperado) }}</p>
        </div>
        <div class="rounded-xl border border-border bg-card p-4">
          <p class="text-xs text-muted uppercase tracking-wider">Mora Total</p>
          <p class="text-lg font-bold text-red-600 dark:text-red-400 mt-1">{{ formatCurrency(clienteTotals.mora) }}</p>
        </div>
        <div class="rounded-xl border border-border bg-card p-4">
          <p class="text-xs text-muted uppercase tracking-wider">Saldo Pendiente</p>
          <p class="text-lg font-bold text-amber-600 dark:text-amber-400 mt-1">{{ formatCurrency(clienteTotals.saldo) }}</p>
        </div>
      </div>

      <!-- Table -->
      <div class="col-span-12">
        <div v-if="filteredClientes.length === 0" class="rounded-xl border border-border bg-card p-12 text-center">
          <Icon name="FileX" :size="48" class="text-muted mx-auto mb-4" />
          <h4 class="text-lg font-semibold text-card-foreground mb-2">Sin resultados</h4>
          <p class="text-sm text-muted">No se encontraron préstamos con ese criterio</p>
        </div>

        <div v-else class="rounded-xl border border-border bg-card overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="bg-muted/30 border-b border-border">
                  <th class="text-center px-4 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider">Cod.</th>
                  <th class="text-left px-4 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider">Cliente</th>
                  <th class="text-left px-4 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider">DPI</th>
                  <th class="text-left px-4 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider">Plan</th>
                  <th class="text-right px-4 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider">Monto</th>
                  <th class="text-right px-4 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider">Cap. Recuperado</th>
                  <th class="text-right px-4 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider">Mora</th>
                  <th class="text-right px-4 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider">Saldo</th>
                  <th class="text-center px-4 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider">Estado</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border">
                <tr
                  v-for="c in paginatedClientes"
                  :key="c.prestamo_id"
                  class="transition-colors hover:bg-hover group"
                >
                  <td class="px-4 py-3.5 text-center">
                    <span class="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700 text-xs font-mono font-semibold text-card-foreground">
                      #{{ c.prestamo_id }}
                    </span>
                  </td>
                  <td class="px-4 py-3.5">
                    <p class="font-medium text-card-foreground group-hover:text-primary transition-colors">{{ c.cliente }}</p>
                  </td>
                  <td class="px-4 py-3.5 text-xs text-muted font-mono">{{ c.dpi }}</td>
                  <td class="px-4 py-3.5">
                    <span class="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                      {{ c.plan }}
                    </span>
                  </td>
                  <td class="px-4 py-3.5 text-right font-medium text-card-foreground">{{ formatCurrency(c.monto) }}</td>
                  <td class="px-4 py-3.5 text-right">
                    <span class="text-emerald-600 dark:text-emerald-400 font-semibold">{{ formatCurrency(c.capital_recuperado) }}</span>
                  </td>
                  <td class="px-4 py-3.5 text-right">
                    <span :class="c.mora > 0 ? 'text-red-500 font-bold' : 'text-muted'" class="text-xs">
                      {{ formatCurrency(c.mora) }}
                    </span>
                  </td>
                  <td class="px-4 py-3.5 text-right font-medium text-card-foreground">{{ formatCurrency(c.saldo) }}</td>
                  <td class="px-4 py-3.5 text-center">
                    <span
                      :class="[
                        'px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider',
                        c.pagado
                          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                          : 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400'
                      ]"
                    >
                      {{ c.pagado ? "Pagado" : "Activo" }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="col-span-12">
        <div class="flex items-center justify-between">
          <span class="text-xs text-muted">Página {{ currentPage }} de {{ totalPages }}</span>
          <div class="flex items-center gap-1">
            <Button variant="outline" size="sm" :disabled="currentPage <= 1" @click="currentPage--">
              <Icon name="ChevronLeft" :size="16" />
            </Button>
            <Button variant="outline" size="sm" :disabled="currentPage >= totalPages" @click="currentPage++">
              <Icon name="ChevronRight" :size="16" />
            </Button>
          </div>
        </div>
      </div>
    </template>

    <Footer></Footer>
  </div>
</template>
