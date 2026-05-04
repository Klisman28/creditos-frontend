<script setup lang="ts">
import { ref, onMounted, computed, watch } from "vue";
import Footer from "@/components/Footer.vue";
import Icon from "@/components/Icon.vue";
import { Button } from "@/components/ui/button";
import { push } from "notivue";
import pagosService, { type FichaItem, type VencidoItem, type HistorialItem } from "@/services/pagosService";
import RegistrarPagoModal from "@/components/pagos/RegistrarPagoModal.vue";
import apiClient from "@/apiClient";

// ─── State ─────────────────────────────────────────────────────────

const activeTab = ref<"hoy" | "pendientes" | "vencidos" | "historial">("hoy");
const loading = ref({
  hoy: false,
  pendientes: false,
  vencidos: false,
  historial: false,
});
const error = ref({
  hoy: false,
  pendientes: false,
  vencidos: false,
  historial: false,
});
const searchQuery = ref("");
const currentPage = ref(1);
const itemsPerPage = 15;

// Historial server-side pagination
const historialPage = ref(1);
const historialPerPage = 20;
const historialTotalPages = ref(1);

// Data
const fichasHoy = ref<FichaItem[]>([]);
const fichasPendientes = ref<FichaItem[]>([]);
const vencidos = ref<VencidoItem[]>([]);
const historial = ref<HistorialItem[]>([]);

// Summary
const totalCuotaHoy = ref(0);
const totalCuotaPendientes = ref(0);
const totalMoraVencidos = ref(0);
const fechaHoy = ref("");

// Modal V2 — Registrar Pago
const showRegistrarModal = ref(false);
const registrarPrestamoId = ref(0);
const registrarFichaId = ref<number | null>(null);
const registrarClienteNombre = ref("");

// Header prompt — buscar préstamo
const showLoanPrompt = ref(false);
const loanSearchQuery = ref("");
const loanSearchResults = ref<{ id: number; cliente_nombre: string; dpi: string | null; monto: number; saldo: number; estado_p_id: number }[]>([]);
const loanSearchLoading = ref(false);
let loanSearchTimer: ReturnType<typeof setTimeout> | null = null;

// Debounce timer
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

// ─── Load data ─────────────────────────────────────────────────────

const loadPagosHoy = async () => {
  loading.value.hoy = true;
  error.value.hoy = false;
  try {
    const data = await pagosService.getHoy(searchQuery.value || undefined);
    fichasHoy.value = data.items;
    totalCuotaHoy.value = data.total_cuota;
    fechaHoy.value = data.fecha;
  } catch (err) {
    error.value.hoy = true;
    push.error("Error al cargar los cobros de hoy");
  } finally {
    loading.value.hoy = false;
  }
};

const loadPagosPendientes = async () => {
  loading.value.pendientes = true;
  error.value.pendientes = false;
  try {
    const data = await pagosService.getPendientes(searchQuery.value || undefined);
    fichasPendientes.value = data.items;
    totalCuotaPendientes.value = data.total_cuota;
  } catch (err) {
    error.value.pendientes = true;
    push.error("Error al cargar los pagos pendientes");
  } finally {
    loading.value.pendientes = false;
  }
};

const loadVencidos = async () => {
  loading.value.vencidos = true;
  error.value.vencidos = false;
  try {
    const data = await pagosService.getVencidos(searchQuery.value || undefined);
    vencidos.value = data.items;
    totalMoraVencidos.value = data.total_mora;
  } catch (err) {
    error.value.vencidos = true;
    push.error("Error al cargar préstamos con mora");
  } finally {
    loading.value.vencidos = false;
  }
};

const loadHistorial = async () => {
  loading.value.historial = true;
  error.value.historial = false;
  try {
    const data = await pagosService.getHistorial({
      page: historialPage.value,
      per_page: historialPerPage,
      search: searchQuery.value || undefined,
    });
    historial.value = data.items;
    historialTotalPages.value = data.total_pages ?? 1;
  } catch (err) {
    error.value.historial = true;
    push.error("Error al cargar el historial de pagos");
  } finally {
    loading.value.historial = false;
  }
};

const loadCurrentTab = () => {
  currentPage.value = 1;
  switch (activeTab.value) {
    case "hoy": return loadPagosHoy();
    case "pendientes": return loadPagosPendientes();
    case "vencidos": return loadVencidos();
    case "historial":
      historialPage.value = 1;
      return loadHistorial();
  }
};

const loadAll = async () => {
  await Promise.all([
    loadPagosHoy(),
    loadPagosPendientes(),
    loadVencidos(),
    loadHistorial(),
  ]);
};

onMounted(loadAll);

// ─── Debounced search ───────────────────────────────────────────────

watch(searchQuery, () => {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    loadCurrentTab();
  }, 400);
});

// ─── Computed (client-side filter for non-historial tabs) ───────────

const filteredFichasHoy = computed(() => {
  if (!searchQuery.value) return fichasHoy.value;
  const q = searchQuery.value.toLowerCase();
  return fichasHoy.value.filter((f) =>
    `${f.dpi} ${f.cliente} ${f.ruta} ${f.prestamo_id}`.toLowerCase().includes(q)
  );
});

const filteredFichasPendientes = computed(() => {
  if (!searchQuery.value) return fichasPendientes.value;
  const q = searchQuery.value.toLowerCase();
  return fichasPendientes.value.filter((f) =>
    `${f.dpi} ${f.cliente} ${f.ruta} ${f.prestamo_id}`.toLowerCase().includes(q)
  );
});

const filteredVencidos = computed(() => {
  if (!searchQuery.value) return vencidos.value;
  const q = searchQuery.value.toLowerCase();
  return vencidos.value.filter((v) =>
    `${v.dpi} ${v.cliente} ${v.ruta} ${v.prestamo_id}`.toLowerCase().includes(q)
  );
});

// Active list for non-historial pagination
const activeList = computed(() => {
  switch (activeTab.value) {
    case "hoy": return filteredFichasHoy.value;
    case "pendientes": return filteredFichasPendientes.value;
    case "vencidos": return filteredVencidos.value;
    case "historial": return historial.value;
  }
});

const totalPages = computed(() => {
  if (activeTab.value === "historial") return historialTotalPages.value;
  return Math.ceil(activeList.value.length / itemsPerPage);
});

const paginatedList = computed(() => {
  if (activeTab.value === "historial") return historial.value;
  const start = (currentPage.value - 1) * itemsPerPage;
  return activeList.value.slice(start, start + itemsPerPage);
});

// Reset page on tab change
watch(activeTab, () => {
  currentPage.value = 1;
  searchQuery.value = "";
});

// ─── Actions ───────────────────────────────────────────────────────

const openRegistrarFromRow = (ficha: FichaItem) => {
  registrarPrestamoId.value = ficha.prestamo_id ?? 0;
  registrarFichaId.value = ficha.ficha_id;
  registrarClienteNombre.value = ficha.cliente;
  showRegistrarModal.value = true;
};

const doLoanSearch = async () => {
  loanSearchLoading.value = true;
  try {
    const { data } = await apiClient.get("/prestamos/buscar", { params: { q: loanSearchQuery.value, limit: 8 } });
    loanSearchResults.value = data;
  } catch {
    loanSearchResults.value = [];
  } finally {
    loanSearchLoading.value = false;
  }
};

const scheduleLoanSearch = () => {
  if (loanSearchTimer) clearTimeout(loanSearchTimer);
  loanSearchTimer = setTimeout(doLoanSearch, 350);
};

const selectLoanResult = (loan: { id: number; cliente_nombre: string }) => {
  registrarPrestamoId.value = loan.id;
  registrarFichaId.value = null;
  registrarClienteNombre.value = loan.cliente_nombre;
  showLoanPrompt.value = false;
  loanSearchQuery.value = "";
  loanSearchResults.value = [];
  showRegistrarModal.value = true;
};

const openLoanPrompt = () => {
  loanSearchQuery.value = "";
  loanSearchResults.value = [];
  showLoanPrompt.value = true;
  // Load recent loans on open
  doLoanSearch();
};

const historialPrevPage = () => {
  if (historialPage.value > 1) {
    historialPage.value--;
    loadHistorial();
  }
};

const historialNextPage = () => {
  if (historialPage.value < historialTotalPages.value) {
    historialPage.value++;
    loadHistorial();
  }
};

const formatCurrency = (val: number | null) => {
  if (val == null) return "Q0.00";
  return `Q${val.toLocaleString("es-GT", { minimumFractionDigits: 2 })}`;
};

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("es-GT", { day: "2-digit", month: "short", year: "numeric" });
};

// ─── Tab config ────────────────────────────────────────────────────

const tabs = [
  { key: "hoy", label: "Cobros de Hoy", icon: "CalendarCheck" },
  { key: "pendientes", label: "Pendientes", icon: "Clock" },
  { key: "vencidos", label: "Con Mora", icon: "AlertTriangle" },
  { key: "historial", label: "Historial", icon: "History" },
] as const;

const summaryCards = computed(() => [
  {
    label: "Cobros de Hoy",
    value: fichasHoy.value.length,
    sub: formatCurrency(totalCuotaHoy.value),
    icon: "CalendarCheck",
    gradient: "from-blue-500 to-indigo-600",
    bgGlow: "bg-blue-500/10",
  },
  {
    label: "Pendientes",
    value: fichasPendientes.value.length,
    sub: formatCurrency(totalCuotaPendientes.value),
    icon: "Clock",
    gradient: "from-amber-500 to-orange-600",
    bgGlow: "bg-amber-500/10",
  },
  {
    label: "Con Mora",
    value: vencidos.value.length,
    sub: formatCurrency(totalMoraVencidos.value),
    icon: "AlertTriangle",
    gradient: "from-red-500 to-rose-600",
    bgGlow: "bg-red-500/10",
  },
  {
    label: "Historial",
    value: historial.value.length,
    sub: "Pagos registrados",
    icon: "History",
    gradient: "from-emerald-500 to-teal-600",
    bgGlow: "bg-emerald-500/10",
  },
]);
</script>

<template>
  <div class="grid grid-cols-12 mt-2 mb-6 gap-7">
    <!-- Header -->
    <div class="col-span-12">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 class="text-2xl font-bold text-card-foreground">Pagos</h2>
          <p class="text-sm text-muted mt-1">
            Cobros para el día
            <span class="font-medium text-card-foreground">{{ fechaHoy ? formatDate(fechaHoy) : "—" }}</span>
          </p>
        </div>
        <div class="flex items-center gap-2">
          <Button @click="openLoanPrompt" class="gap-2 bg-emerald-500 hover:bg-emerald-600 text-white">
            <Icon name="Plus" :size="16" />
            Registrar Pago
          </Button>
          <Button @click="loadAll" class="gap-2" variant="outline">
            <Icon name="RefreshCw" :size="16" />
            Actualizar
          </Button>
        </div>
      </div>
    </div>

    <!-- Summary Cards -->
    <div class="col-span-12 grid grid-cols-2 lg:grid-cols-4 gap-4">
      <button
        v-for="(card, i) in summaryCards"
        :key="i"
        @click="activeTab = tabs[i].key"
        :class="[
          'rounded-xl border bg-card p-5 relative overflow-hidden text-left transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5',
          activeTab === tabs[i].key
            ? 'border-primary ring-1 ring-primary shadow-md'
            : 'border-border'
        ]"
      >
        <div :class="[card.bgGlow, 'absolute -top-6 -right-6 w-24 h-24 rounded-full blur-2xl']"></div>
        <div class="relative flex items-start justify-between">
          <div>
            <p class="text-xs font-medium text-muted uppercase tracking-wider mb-1">{{ card.label }}</p>
            <p class="text-2xl font-bold text-card-foreground">{{ card.value }}</p>
            <p class="text-xs text-muted mt-1">{{ card.sub }}</p>
          </div>
          <div :class="['bg-gradient-to-br', card.gradient, 'w-10 h-10 rounded-lg flex items-center justify-center shadow-lg']">
            <Icon :name="card.icon" :size="20" class="text-white" />
          </div>
        </div>
      </button>
    </div>

    <!-- Tabs + Search -->
    <div class="col-span-12">
      <div class="rounded-xl border border-border bg-card p-5">
        <div class="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <!-- Tabs -->
          <div class="flex gap-1 bg-muted/30 rounded-lg p-1">
            <button
              v-for="tab in tabs"
              :key="tab.key"
              @click="activeTab = tab.key"
              :class="[
                'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200',
                activeTab === tab.key
                  ? 'bg-card text-primary shadow-sm'
                  : 'text-muted hover:text-card-foreground'
              ]"
            >
              <Icon :name="tab.icon" :size="15" />
              <span class="hidden sm:inline">{{ tab.label }}</span>
            </button>
          </div>

          <!-- Search -->
          <div class="flex items-center gap-3 w-full lg:w-auto">
            <div class="relative flex-1 lg:w-80">
              <Icon name="Search" :size="18" class="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Buscar: Nombre, DPI, Cod. Préstamo, Ruta..."
                class="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-background text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
              />
            </div>
            <span class="text-sm text-muted whitespace-nowrap">
              <strong class="text-card-foreground">{{ activeList.length }}</strong> registros
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="col-span-12">
      <!-- Loading -->
      <div v-if="loading[activeTab]" class="p-12 text-center">
        <div class="w-10 h-10 border-4 rounded-full border-border animate-spin border-t-primary mx-auto mb-4"></div>
        <p class="text-sm text-muted">Cargando datos...</p>
      </div>

      <!-- Error -->
      <div v-else-if="error[activeTab]" class="rounded-xl border border-red-200 bg-red-50 dark:bg-red-500/10 p-12 text-center">
        <Icon name="AlertCircle" :size="48" class="text-red-500 mx-auto mb-4" />
        <h4 class="text-lg font-semibold text-red-900 dark:text-red-400 mb-2">Error al cargar datos</h4>
        <p class="text-sm text-red-600 dark:text-red-300 mb-6">Hubo un problema al conectar con el servidor.</p>
        <Button @click="loadCurrentTab" variant="outline" class="border-red-200 hover:bg-red-100">Reintentar</Button>
      </div>

      <!-- Empty -->
      <div v-else-if="activeList.length === 0" class="rounded-xl border border-border bg-card p-12 text-center">
        <Icon name="Inbox" :size="48" class="text-muted mx-auto mb-4" />
        <h4 class="text-lg font-semibold text-card-foreground mb-2">No hay registros</h4>
        <p class="text-sm text-muted">
          <template v-if="activeTab === 'hoy'">No hay fichas de pago programadas para hoy</template>
          <template v-else-if="activeTab === 'pendientes'">No hay pagos pendientes atrasados</template>
          <template v-else-if="activeTab === 'vencidos'">No hay préstamos con mora</template>
          <template v-else>No hay pagos registrados en el historial</template>
        </p>
      </div>

      <!-- Table: Pagos Hoy / Pendientes -->
      <div v-else-if="activeTab === 'hoy' || activeTab === 'pendientes'" class="rounded-xl border border-border bg-card overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-muted/30 border-b border-border">
                <th class="text-left px-3 py-3 sm:px-5 sm:py-3.5 text-xs font-semibold text-muted uppercase tracking-wider hidden sm:table-cell">DPI</th>
                <th class="text-left px-3 py-3 sm:px-5 sm:py-3.5 text-xs font-semibold text-muted uppercase tracking-wider">Cliente</th>
                <th class="text-left px-3 py-3 sm:px-5 sm:py-3.5 text-xs font-semibold text-muted uppercase tracking-wider hidden md:table-cell">Ruta</th>
                <th class="text-left px-3 py-3 sm:px-5 sm:py-3.5 text-xs font-semibold text-muted uppercase tracking-wider hidden lg:table-cell">Hora</th>
                <th class="text-center px-3 py-3 sm:px-5 sm:py-3.5 text-xs font-semibold text-muted uppercase tracking-wider hidden sm:table-cell">Préstamo</th>
                <th class="text-center px-3 py-3 sm:px-5 sm:py-3.5 text-xs font-semibold text-muted uppercase tracking-wider hidden md:table-cell">No. Cuota</th>
                <th class="text-right px-3 py-3 sm:px-5 sm:py-3.5 text-xs font-semibold text-muted uppercase tracking-wider">Cuota</th>
                <th class="text-center px-3 py-3 sm:px-5 sm:py-3.5 text-xs font-semibold text-muted uppercase tracking-wider hidden sm:table-cell">Estado</th>
                <th class="text-center px-3 py-3 sm:px-5 sm:py-3.5 text-xs font-semibold text-muted uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <tr
                v-for="ficha in (paginatedList as FichaItem[])"
                :key="ficha.ficha_id"
                class="transition-colors hover:bg-hover group"
              >
                <td class="px-3 py-3 sm:px-5 sm:py-3.5 text-xs text-muted font-mono hidden sm:table-cell">{{ ficha.dpi }}</td>
                <td class="px-3 py-3 sm:px-5 sm:py-3.5">
                  <p class="font-medium text-card-foreground group-hover:text-primary transition-colors text-sm truncate max-w-[130px] sm:max-w-none">{{ ficha.cliente }}</p>
                </td>
                <td class="px-3 py-3 sm:px-5 sm:py-3.5 hidden md:table-cell">
                  <span class="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                    {{ ficha.ruta }}
                  </span>
                </td>
                <td class="px-3 py-3 sm:px-5 sm:py-3.5 text-xs text-muted hidden lg:table-cell">{{ ficha.hora }}</td>
                <td class="px-3 py-3 sm:px-5 sm:py-3.5 text-center hidden sm:table-cell">
                  <span class="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700 text-xs font-mono font-semibold text-card-foreground">
                    #{{ ficha.prestamo_id }}
                  </span>
                </td>
                <td class="px-3 py-3 sm:px-5 sm:py-3.5 text-center font-semibold text-card-foreground hidden md:table-cell">{{ ficha.no_dia ?? "—" }}</td>
                <td class="px-3 py-3 sm:px-5 sm:py-3.5 text-right font-semibold text-card-foreground">{{ formatCurrency(ficha.cuota) }}</td>
                <td class="px-3 py-3 sm:px-5 sm:py-3.5 text-center hidden sm:table-cell">
                  <span
                    :class="[
                      'px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider',
                      ficha.estado === 1
                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                        : 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400'
                    ]"
                  >
                    {{ ficha.estado_label }}
                  </span>
                </td>
                <td class="px-3 py-3 sm:px-5 sm:py-3.5">
                  <div class="flex gap-1 justify-center">
                    <button
                      v-if="ficha.estado === 0"
                      @click="openRegistrarFromRow(ficha)"
                      class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-medium transition-colors"
                      title="Registrar Pago"
                    >
                      <Icon name="CheckCircle" :size="13" />
                      <span class="hidden xs:inline">Cobrar</span>
                    </button>
                    <span v-else class="text-xs text-emerald-500 flex items-center gap-1">
                      <Icon name="CheckCircle" :size="13" /> <span class="hidden sm:inline">Cobrado</span>
                    </span>
                  </div>
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="bg-muted/20 border-t-2 border-border">
                <td colspan="3" class="px-3 py-3 sm:px-5 text-right text-xs font-semibold text-muted uppercase sm:hidden">Total:</td>
                <td colspan="6" class="px-5 py-3 text-right text-xs font-semibold text-muted uppercase hidden sm:table-cell">Total:</td>
                <td class="px-3 py-3 sm:px-5 text-right font-bold text-card-foreground">
                  {{ formatCurrency(activeTab === "hoy" ? totalCuotaHoy : totalCuotaPendientes) }}
                </td>
                <td colspan="2" class="hidden sm:table-cell"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <!-- Table: Vencidos / Mora -->
      <div v-else-if="activeTab === 'vencidos'" class="rounded-xl border border-border bg-card overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-muted/30 border-b border-border">
                <th class="text-left px-5 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider">DPI</th>
                <th class="text-left px-5 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider">Cliente</th>
                <th class="text-left px-5 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider">Ruta</th>
                <th class="text-center px-5 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider">Cod. Préstamo</th>
                <th class="text-right px-5 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider">Monto</th>
                <th class="text-right px-5 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider">Mora</th>
                <th class="text-right px-5 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider">Saldo</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <tr
                v-for="v in (paginatedList as VencidoItem[])"
                :key="v.prestamo_id"
                class="transition-colors hover:bg-hover group"
              >
                <td class="px-5 py-3.5 text-xs text-muted font-mono">{{ v.dpi }}</td>
                <td class="px-5 py-3.5">
                  <p class="font-medium text-card-foreground group-hover:text-primary transition-colors">{{ v.cliente }}</p>
                </td>
                <td class="px-5 py-3.5">
                  <span class="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                    {{ v.ruta }}
                  </span>
                </td>
                <td class="px-5 py-3.5 text-center">
                  <span class="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700 text-xs font-mono font-semibold text-card-foreground">
                    #{{ v.prestamo_id }}
                  </span>
                </td>
                <td class="px-5 py-3.5 text-right font-medium text-card-foreground">{{ formatCurrency(v.monto) }}</td>
                <td class="px-5 py-3.5 text-right">
                  <span class="px-2 py-0.5 rounded-md bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 text-xs font-bold">
                    {{ formatCurrency(v.mora) }}
                  </span>
                </td>
                <td class="px-5 py-3.5 text-right font-medium text-card-foreground">{{ formatCurrency(v.saldo) }}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="bg-muted/20 border-t-2 border-border">
                <td colspan="5" class="px-5 py-3 text-right text-xs font-semibold text-muted uppercase">Total Mora:</td>
                <td class="px-5 py-3 text-right font-bold text-red-600">{{ formatCurrency(totalMoraVencidos) }}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <!-- Table: Historial -->
      <div v-else-if="activeTab === 'historial'" class="rounded-xl border border-border bg-card overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-muted/30 border-b border-border">
                <th class="text-left px-5 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider">Fecha</th>
                <th class="text-left px-5 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider">Cliente</th>
                <th class="text-left px-5 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider">DPI</th>
                <th class="text-center px-5 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider">Cod. Préstamo</th>
                <th class="text-right px-5 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider">Capital</th>
                <th class="text-right px-5 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider">Interés</th>
                <th class="text-right px-5 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider">Mora</th>
                <th class="text-right px-5 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider">Total</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <tr
                v-for="h in (paginatedList as HistorialItem[])"
                :key="h.id"
                class="transition-colors hover:bg-hover group"
              >
                <td class="px-5 py-3.5 text-xs text-muted">{{ formatDate(h.fecha) }}</td>
                <td class="px-5 py-3.5">
                  <p class="font-medium text-card-foreground group-hover:text-primary transition-colors">{{ h.cliente }}</p>
                </td>
                <td class="px-5 py-3.5 text-xs text-muted font-mono">{{ h.dpi }}</td>
                <td class="px-5 py-3.5 text-center">
                  <span class="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700 text-xs font-mono font-semibold text-card-foreground">
                    #{{ h.prestamo_id }}
                  </span>
                </td>
                <td class="px-5 py-3.5 text-right text-card-foreground">{{ formatCurrency(h.capital) }}</td>
                <td class="px-5 py-3.5 text-right">
                  <span class="text-emerald-600 dark:text-emerald-400 font-medium text-xs">{{ formatCurrency(h.interes) }}</span>
                </td>
                <td class="px-5 py-3.5 text-right">
                  <span :class="h.mora > 0 ? 'text-red-500 font-semibold' : 'text-muted'" class="text-xs">{{ formatCurrency(h.mora) }}</span>
                </td>
                <td class="px-5 py-3.5 text-right font-bold text-card-foreground">{{ formatCurrency(h.total) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="col-span-12">
      <div class="flex items-center justify-between">
        <span class="text-xs text-muted">
          Página
          <template v-if="activeTab === 'historial'">{{ historialPage }}</template>
          <template v-else>{{ currentPage }}</template>
          de {{ totalPages }}
        </span>
        <div class="flex items-center gap-1">
          <Button
            variant="outline" size="sm"
            :disabled="activeTab === 'historial' ? historialPage <= 1 : currentPage <= 1"
            @click="activeTab === 'historial' ? historialPrevPage() : currentPage--"
          >
            <Icon name="ChevronLeft" :size="16" />
          </Button>
          <Button
            variant="outline" size="sm"
            :disabled="activeTab === 'historial' ? historialPage >= historialTotalPages : currentPage >= totalPages"
            @click="activeTab === 'historial' ? historialNextPage() : currentPage++"
          >
            <Icon name="ChevronRight" :size="16" />
          </Button>
        </div>
      </div>
    </div>

    <Footer></Footer>
  </div>

  <!-- LOAN SEARCH PROMPT -->
  <Teleport to="body">
    <div v-if="showLoanPrompt" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="fixed inset-0 bg-black/50 backdrop-blur-sm" @click="showLoanPrompt = false"></div>
      <div class="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <!-- Header -->
        <div class="flex items-center justify-between px-5 py-4 border-b border-border">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Icon name="Receipt" :size="16" class="text-emerald-600" />
            </div>
            <h3 class="text-base font-bold text-card-foreground">Registrar Pago</h3>
          </div>
          <button @click="showLoanPrompt = false" class="p-1.5 rounded-lg hover:bg-hover transition-colors">
            <Icon name="X" :size="16" class="text-muted" />
          </button>
        </div>

        <!-- Search input -->
        <div class="px-5 pt-4 pb-2">
          <div class="relative">
            <Icon name="Search" :size="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              v-model="loanSearchQuery"
              type="text"
              placeholder="Buscar por nombre, DPI o código..."
              class="w-full pl-9 pr-4 py-2.5 rounded-lg border border-border bg-background text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              @input="scheduleLoanSearch"
              autofocus
            />
            <div v-if="loanSearchLoading" class="absolute right-3 top-1/2 -translate-y-1/2">
              <div class="w-4 h-4 border-2 border-border border-t-primary rounded-full animate-spin"></div>
            </div>
          </div>
        </div>

        <!-- Results -->
        <div class="px-5 pb-4">
          <!-- Empty state -->
          <div v-if="!loanSearchLoading && loanSearchResults.length === 0 && loanSearchQuery" class="py-8 text-center">
            <Icon name="SearchX" :size="28" class="text-muted mx-auto mb-2" />
            <p class="text-sm text-muted">Sin resultados para "{{ loanSearchQuery }}"</p>
          </div>

          <!-- List -->
          <div v-else class="mt-2 rounded-xl border border-border overflow-hidden divide-y divide-border max-h-72 overflow-y-auto">
            <button
              v-for="loan in loanSearchResults"
              :key="loan.id"
              @click="selectLoanResult(loan)"
              class="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-hover transition-colors group"
            >
              <!-- ID badge -->
              <div class="w-10 h-10 rounded-lg bg-primary/5 flex items-center justify-center flex-shrink-0">
                <span class="text-xs font-bold text-primary font-mono">#{{ loan.id }}</span>
              </div>
              <!-- Info -->
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-card-foreground truncate group-hover:text-primary transition-colors">
                  {{ loan.cliente_nombre }}
                </p>
                <p class="text-[11px] text-muted font-mono">{{ loan.dpi ?? '—' }}</p>
              </div>
              <!-- Amounts -->
              <div class="text-right flex-shrink-0">
                <p class="text-xs font-bold text-card-foreground">Q{{ loan.saldo.toLocaleString('es-GT', { minimumFractionDigits: 2 }) }}</p>
                <p class="text-[10px] text-muted">saldo</p>
              </div>
              <Icon name="ChevronRight" :size="14" class="text-muted group-hover:text-primary transition-colors flex-shrink-0" />
            </button>
          </div>

          <p v-if="!loanSearchQuery" class="text-[11px] text-muted text-center mt-3">
            Mostrando préstamos recientes — escribe para filtrar
          </p>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- REGISTRAR PAGO MODAL (V2) -->
  <Teleport to="body">
    <div v-if="showRegistrarModal && registrarPrestamoId" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="fixed inset-0 bg-black/50 backdrop-blur-sm" @click="showRegistrarModal = false"></div>
      <div class="relative w-full max-w-2xl">
        <RegistrarPagoModal
          :prestamo-id="registrarPrestamoId"
          :ficha-id="registrarFichaId"
          :cliente-nombre="registrarClienteNombre"
          @close="showRegistrarModal = false"
          @registered="showRegistrarModal = false; loadAll()"
        />
      </div>
    </div>
  </Teleport>

</template>
