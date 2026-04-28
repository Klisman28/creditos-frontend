<script setup lang="ts">
import { ref, onMounted, computed, watch } from "vue";
import { useRouter } from "vue-router";
import { prestamosService, type Prestamo, type CreatePrestamoPayload } from "@/services/prestamosService";
import { type Cliente } from "@/services/clientesService";
import apiClient from "@/apiClient";
import Footer from "@/components/Footer.vue";
import Icon from "@/components/Icon.vue";
import { Button } from "@/components/ui/button";
import { push } from "notivue";
import { useAuthStore } from "@/stores/auth";

const authStore = useAuthStore();
const esAdmin = computed(() => ["administrador", "supervisor", "validador"].includes(authStore.role ?? ""));

const router = useRouter();

interface ClienteOption {
  id: number;
  nombre: string;
  cedula: string | null;
}

interface PlanOption {
  id: number;
  nombre: string;
  interes_porcentaje: number;
  mora_porcentaje: number;
  frecuencia_dias: number;
  descripcion?: string;
  activa: boolean;
  // Legacy fields
  interes?: number | null;
  cuota?: number | null;
  total?: number | null;
}

const prestamos = ref<Prestamo[]>([]);
const loading = ref(true);
const searchQuery = ref("");
const currentPage = ref(1);
const itemsPerPage = 10;
const activeFilter = ref<"todos" | "activos" | "vencidos" | "mora" | "pendientes" | "aprobados_hoy">("todos");

// Modal state
const showModal = ref(false);
const saving = ref(false);
const clienteSearch = ref("");
const clienteOptions = ref<ClienteOption[]>([]);
const searchingClientes = ref(false);
const planes = ref<PlanOption[]>([]);
const showClienteDropdown = ref(false);

const newPrestamo = ref({
  cliente_id: null as number | null,
  cliente_nombre: "",
  monto: null as number | null,
  cuotas: null as number | null,
  plan_id: null as number | null,
  fecha_inicio: new Date().toISOString().split("T")[0],
  fecha_desembolso: new Date().toISOString().split("T")[0],
  fecha_fin: null as string | null,
  observaciones: "",
  tipo: 1 as 1 | 2 | 3,
});

// fecha_fin = fecha_inicio + (cuotas ingresadas * frecuencia_dias del plan)
const fechaFinCalculada = computed(() => {
  if (!newPrestamo.value.fecha_inicio || !selectedPlan.value || !newPrestamo.value.cuotas) return null;
  const inicio = new Date(newPrestamo.value.fecha_inicio + "T00:00:00");
  const diasTotales = newPrestamo.value.cuotas * (selectedPlan.value.frecuencia_dias ?? 30);
  const fin = new Date(inicio);
  fin.setDate(fin.getDate() + diasTotales);
  return fin.toISOString().split("T")[0];
});

const loadPrestamos = async () => {
  try {
    prestamos.value = await prestamosService.getAll({ limit: 500 });
  } catch (error) {
    console.error("Error loading loans:", error);
    push.error("No se pudo cargar la lista de préstamos.");
  } finally {
    loading.value = false;
  }
};

const loadPlanes = async () => {
  try {
    planes.value = await prestamosService.getPlanes() as unknown as PlanOption[];
  } catch (error) {
    console.error("Error loading plans:", error);
  }
};

const selectedPlan = computed(() =>
  planes.value.find(p => p.id === newPrestamo.value.plan_id) ?? null
);

// Calcular interés monetario basado en plan % + monto
const interesMonto = computed(() => {
  if (!selectedPlan.value || !newPrestamo.value.monto) return 0;
  return newPrestamo.value.monto * (selectedPlan.value.interes_porcentaje / 100);
});

// Total a pagar = monto + interés calculado
const totalPagar = computed(() => {
  if (!newPrestamo.value.monto) return 0;
  return newPrestamo.value.monto + interesMonto.value;
});

// Cuota estimada = total / cuotas ingresadas por el usuario
const cuotaEstimada = computed(() => {
  if (!selectedPlan.value || !newPrestamo.value.monto) return null;
  if (!newPrestamo.value.cuotas || newPrestamo.value.cuotas <= 0) return null;
  return totalPagar.value / newPrestamo.value.cuotas;
});

// Recalcular fecha_fin cuando cambia fecha_inicio, plan o cuotas
watch([() => newPrestamo.value.fecha_inicio, () => newPrestamo.value.plan_id, () => newPrestamo.value.cuotas], () => {
  if (fechaFinCalculada.value) {
    newPrestamo.value.fecha_fin = fechaFinCalculada.value;
  }
});

onMounted(() => {
  loadPrestamos();
  loadPlanes();
  // Set initial fecha_fin
  if (fechaFinCalculada.value) {
    newPrestamo.value.fecha_fin = fechaFinCalculada.value;
  }
});

// Client search with debounce
let searchTimeout: ReturnType<typeof setTimeout>;
watch(clienteSearch, (val) => {
  clearTimeout(searchTimeout);
  if (val.length < 1) {
    clienteOptions.value = [];
    return;
  }
  searchingClientes.value = true;
  searchTimeout = setTimeout(async () => {
    try {
      const response = await apiClient.get(`/prestamos/search-clientes?q=${encodeURIComponent(val)}`);
      clienteOptions.value = response.data;
      showClienteDropdown.value = true;
    } catch (error) {
      console.error("Error searching clients:", error);
    } finally {
      searchingClientes.value = false;
    }
  }, 300);
});

const selectCliente = (cliente: ClienteOption) => {
  newPrestamo.value.cliente_id = cliente.id;
  newPrestamo.value.cliente_nombre = cliente.nombre;
  clienteSearch.value = cliente.nombre;
  showClienteDropdown.value = false;
};

const todayStr = new Date().toISOString().split("T")[0];

const filteredPrestamos = computed(() => {
  let result = prestamos.value;
  if (activeFilter.value === "activos") result = result.filter((p) => p.activo === 1 && p.pagado === 0);
  else if (activeFilter.value === "vencidos") result = result.filter((p) => p.pagado === 1);
  else if (activeFilter.value === "mora") result = result.filter((p) => (p.mora || 0) > 0 && p.activo === 1);
  else if (activeFilter.value === "pendientes") result = result.filter((p) => p.estado_p_id === 0 || p.activo === 0);
  else if (activeFilter.value === "aprobados_hoy") result = result.filter((p) => p.fecha_desembolso === todayStr && p.activo === 1);

  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    result = result.filter((p) => {
      const nombre = `${p.cliente?.persona?.nombre || ""} ${p.cliente?.persona?.apellido || ""}`.toLowerCase();
      const cedula = (p.cliente?.persona?.dpi || "").toLowerCase();
      const cod = `Cre-${p.id}`;
      return nombre.includes(q) || cedula.includes(q) || cod.toLowerCase().includes(q) || p.id.toString().includes(q);
    });
  }
  return result;
});

const totalPages = computed(() => Math.ceil(filteredPrestamos.value.length / itemsPerPage));
const paginatedPrestamos = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  return filteredPrestamos.value.slice(start, start + itemsPerPage);
});

const totalActivos = computed(() => prestamos.value.filter((p) => p.activo === 1 && p.pagado === 0).length);
const totalConMora = computed(() => prestamos.value.filter((p) => (p.mora || 0) > 0 && p.activo === 1).length);
const totalVencidos = computed(() => prestamos.value.filter((p) => p.pagado === 1).length);
const capitalTotal = computed(() => prestamos.value.reduce((sum, p) => sum + (p.capital_activo || 0), 0));

const formatMoney = (val: number | null | undefined) => {
  return `Q${(val || 0).toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const getStatusBadge = (p: Prestamo) => {
  if (p.pagado === 1) return { label: "Cancelado", class: "bg-teal-50 text-teal-600 dark:bg-teal-500/10 dark:text-teal-400" };
  if ((p.mora || 0) > 0) return { label: "En Mora", class: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400" };
  if (p.activo === 1) return { label: "Activo", class: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400" };
  return { label: "Pendiente", class: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400" };
};

const getInitials = (cliente: Cliente | null) => {
  const nombre = cliente?.nombre || cliente?.persona?.nombre || "";
  const apellido = (cliente?.persona as any)?.apellido || "";
  if (!nombre) return "??";
  return `${nombre[0]}${apellido ? apellido[0] : (nombre[1] || "")}`.toUpperCase();
};

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
  "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300",
  "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300",
  "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300",
  "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300",
];
const getAvatarColor = (id: number | undefined) => AVATAR_COLORS[(id || 0) % AVATAR_COLORS.length];

const getMoraSeverity = (mora: number | null | undefined) => {
  const m = mora || 0;
  if (m <= 0) return null;
  if (m < 50) return { label: "Leve", dotClass: "bg-amber-400", rowClass: "" };
  if (m < 150) return { label: "Moderada", dotClass: "bg-orange-500", rowClass: "border-l-2 border-l-orange-400" };
  return { label: "Alta", dotClass: "bg-red-500", rowClass: "border-l-2 border-l-red-500 bg-red-500/[0.02]" };
};

const formatRelativeDate = (dateStr: string | null) => {
  if (!dateStr) return "—";
  const date = new Date(dateStr + "T00:00:00");
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Hoy";
  if (diffDays === 1) return "Ayer";
  if (diffDays < 30) return `hace ${diffDays}d`;
  if (diffDays < 365) return `hace ${Math.floor(diffDays / 30)}m`;
  return `hace ${Math.floor(diffDays / 365)}a`;
};

const getCapitalProgress = (p: Prestamo) => {
  const total = p.monto || 0;
  if (total === 0) return 0;
  const recuperado = p.capital_recuperado || 0;
  return Math.min(100, Math.max(0, (recuperado / total) * 100));
};

const ALL_FILTER_TABS = [
  { key: "activos",       label: "Activos",        icon: "CircleCheck"  },
  { key: "vencidos",      label: "Vencidos",       icon: "CheckCheck"   },
  { key: "mora",          label: "En Mora",        icon: "AlertTriangle"},
  { key: "pendientes",    label: "Pendientes",     icon: "Clock",  adminOnly: true },
  { key: "aprobados_hoy", label: "Aprobados Hoy",  icon: "CalendarCheck"},
] as const;

const filterTabs = computed(() =>
  ALL_FILTER_TABS.filter(t => !("adminOnly" in t && t.adminOnly) || esAdmin.value)
);

const resetForm = () => {
  newPrestamo.value = {
    cliente_id: null, cliente_nombre: "", monto: null, cuotas: null, plan_id: null,
    fecha_inicio: new Date().toISOString().split("T")[0],
    fecha_desembolso: new Date().toISOString().split("T")[0],
    fecha_fin: null,
    observaciones: "", tipo: 1,
  };
  clienteSearch.value = "";
  clienteOptions.value = [];
};

// ── Eliminar crédito ──────────────────────────────────────────────────────
const showDeleteModal = ref(false);
const deletingPrestamo = ref<Prestamo | null>(null);
const deleteLoading = ref(false);

const openDeleteModal = (p: Prestamo) => {
  deletingPrestamo.value = p;
  showDeleteModal.value = true;
};

const confirmarEliminar = async () => {
  if (!deletingPrestamo.value) return;
  deleteLoading.value = true;
  try {
    await prestamosService.deleteById(deletingPrestamo.value.id);
    push.success(`Crédito #${deletingPrestamo.value.id} eliminado`);
    showDeleteModal.value = false;
    deletingPrestamo.value = null;
    loading.value = true;
    await loadPrestamos();
  } catch (err: any) {
    push.error(err.response?.data?.detail || "No se pudo eliminar el crédito");
  } finally {
    deleteLoading.value = false;
  }
};

const handleCreatePrestamo = async () => {
  // Validaciones
  if (!newPrestamo.value.cliente_id) {
    push.error("Debes seleccionar un cliente");
    return;
  }

  if (!newPrestamo.value.plan_id) {
    push.error("Debes seleccionar un plan de préstamo");
    return;
  }

  if (!newPrestamo.value.monto || newPrestamo.value.monto <= 0) {
    push.error("Ingresa un monto válido (mayor a Q0.00)");
    return;
  }

  if (!newPrestamo.value.cuotas || newPrestamo.value.cuotas < 1) {
    push.error("Ingresa el número de cuotas (mínimo 1)");
    return;
  }

  if (!selectedPlan.value) {
    push.error("El plan seleccionado no existe");
    return;
  }

  saving.value = true;
  try {
    const payload: CreatePrestamoPayload = {
      cliente_id: newPrestamo.value.cliente_id,
      plan_id: newPrestamo.value.plan_id,
      monto: newPrestamo.value.monto,
      cuotas: newPrestamo.value.cuotas,
      fecha_inicio: newPrestamo.value.fecha_inicio || undefined,
      fecha_desembolso: newPrestamo.value.fecha_desembolso || undefined,
      fecha_fin: newPrestamo.value.fecha_fin || undefined,
      tipo: newPrestamo.value.tipo,
      observaciones: newPrestamo.value.observaciones || undefined,
      plan_snapshot: {
        interes_porcentaje_aplicado: selectedPlan.value.interes_porcentaje,
        mora_porcentaje_aplicado: selectedPlan.value.mora_porcentaje,
        frecuencia_dias_aplicada: selectedPlan.value.frecuencia_dias,
        cuotas_aplicadas: newPrestamo.value.cuotas,
        nombre_plan: selectedPlan.value.nombre,
      },
      interes_monto_calculado: interesMonto.value,
      total_pagar_calculado: totalPagar.value,
    };
    await prestamosService.create(payload);
    push.success(`Préstamo creado a nombre de ${newPrestamo.value.cliente_nombre}`);
    showModal.value = false;
    resetForm();
    loading.value = true;
    await loadPrestamos();
  } catch (error: any) {
    const detail = error.response?.data?.detail || error.message || "Error desconocido";
    const msg = typeof detail === 'string' ? detail : JSON.stringify(detail);
    push.error(msg);
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <div class="grid grid-cols-12 mt-2 mb-6 gap-7">
    <!-- Header -->
    <div class="col-span-12">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 class="text-2xl font-bold text-card-foreground">Préstamos</h2>
          <p class="text-sm text-muted mt-1">Gestión completa de préstamos del sistema</p>
        </div>
        <Button @click="showModal = true" class="gap-2">
          <Icon name="Plus" :size="18" />
          Nuevo Préstamo
        </Button>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="col-span-12 sm:col-span-6 lg:col-span-3">
      <div class="rounded-xl border border-border bg-card p-5 transition-all hover:shadow-md">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-medium text-muted uppercase tracking-wide">Vencidos</p>
            <h3 class="text-2xl font-bold text-teal-600 mt-1" v-if="!loading">{{ totalVencidos }}</h3>
            <div v-else class="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mt-1"></div>
          </div>
          <div class="w-11 h-11 rounded-xl bg-teal-50 dark:bg-teal-500/10 flex items-center justify-center">
            <Icon name="CheckCheck" :size="20" class="text-teal-600 dark:text-teal-400" />
          </div>
        </div>
      </div>
    </div>
    <div class="col-span-12 sm:col-span-6 lg:col-span-3">
      <div class="rounded-xl border border-border bg-card p-5 transition-all hover:shadow-md">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-medium text-muted uppercase tracking-wide">Activos</p>
            <h3 class="text-2xl font-bold text-emerald-600 mt-1" v-if="!loading">{{ totalActivos }}</h3>
            <div v-else class="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mt-1"></div>
          </div>
          <div class="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
            <Icon name="CircleCheck" :size="20" class="text-emerald-600 dark:text-emerald-400" />
          </div>
        </div>
      </div>
    </div>
    <div class="col-span-12 sm:col-span-6 lg:col-span-3">
      <div class="rounded-xl border border-border bg-card p-5 transition-all hover:shadow-md">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-medium text-muted uppercase tracking-wide">En Mora</p>
            <h3 class="text-2xl font-bold text-red-600 mt-1" v-if="!loading">{{ totalConMora }}</h3>
            <div v-else class="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mt-1"></div>
          </div>
          <div class="w-11 h-11 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
            <Icon name="AlertTriangle" :size="20" class="text-red-600 dark:text-red-400" />
          </div>
        </div>
      </div>
    </div>
    <div class="col-span-12 sm:col-span-6 lg:col-span-3">
      <div class="rounded-xl border border-border bg-card p-5 transition-all hover:shadow-md">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-medium text-muted uppercase tracking-wide">Capital Activo</p>
            <h3 class="text-2xl font-bold text-purple-600 mt-1" v-if="!loading">{{ formatMoney(capitalTotal) }}</h3>
            <div v-else class="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mt-1"></div>
          </div>
          <div class="w-11 h-11 rounded-xl bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center">
            <Icon name="DollarSign" :size="20" class="text-purple-600 dark:text-purple-400" />
          </div>
        </div>
      </div>
    </div>

    <!-- Filters + Search -->
    <div class="col-span-12">
      <div class="rounded-xl border border-border bg-card p-5">
        <div class="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div class="flex items-center gap-1 bg-hover rounded-lg p-1">
            <button
              v-for="tab in filterTabs" :key="tab.key"
              @click="activeFilter = tab.key; currentPage = 1"
              :class="['flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-all',
                activeFilter === tab.key ? 'bg-card text-primary shadow-sm' : 'text-muted hover:text-card-foreground']"
            >
              <Icon :name="tab.icon" :size="14" />
              {{ tab.label }}
            </button>
          </div>
          <div class="relative w-full lg:w-80">
            <Icon name="Search" :size="18" class="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input v-model="searchQuery" type="text" placeholder="Buscar por cliente, cédula o ID..."
              class="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-background text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
              @input="currentPage = 1" />
          </div>
        </div>
      </div>
    </div>

    <!-- Table -->
    <div class="col-span-12">
      <div class="rounded-xl border border-border bg-card overflow-hidden">
        <div v-if="loading" class="p-12 text-center">
          <div class="w-10 h-10 border-4 rounded-full border-border animate-spin border-t-primary mx-auto mb-4"></div>
          <p class="text-sm text-muted">Cargando préstamos...</p>
        </div>
        <div v-else-if="filteredPrestamos.length === 0" class="py-16 px-8 flex flex-col items-center justify-center gap-4">
          <!-- Icono contextual -->
          <div :class="[
            'w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm',
            searchQuery ? 'bg-amber-50 dark:bg-amber-500/10' :
            activeFilter === 'mora' ? 'bg-red-50 dark:bg-red-500/10' :
            activeFilter === 'vencidos' ? 'bg-gray-100 dark:bg-gray-500/10' :
            activeFilter === 'aprobados_hoy' ? 'bg-emerald-50 dark:bg-emerald-500/10' :
            'bg-primary/5'
          ]">
            <Icon
              :name="searchQuery ? 'SearchX' : activeFilter === 'mora' ? 'AlertCircle' : activeFilter === 'vencidos' ? 'CheckCircle2' : activeFilter === 'aprobados_hoy' ? 'CalendarCheck' : activeFilter === 'pendientes' ? 'Clock' : 'FileText'"
              :size="28"
              :class="searchQuery ? 'text-amber-500' : activeFilter === 'mora' ? 'text-red-400' : activeFilter === 'vencidos' ? 'text-gray-400' : activeFilter === 'aprobados_hoy' ? 'text-emerald-500' : 'text-primary/40'"
            />
          </div>

          <!-- Texto contextual -->
          <div class="text-center max-w-xs">
            <h4 class="text-base font-semibold text-card-foreground mb-1">
              {{ searchQuery
                ? `Sin resultados para "${searchQuery}"`
                : activeFilter === 'mora' ? 'Sin préstamos en mora'
                : activeFilter === 'vencidos' ? 'Sin préstamos vencidos'
                : activeFilter === 'aprobados_hoy' ? 'Sin desembolsos hoy'
                : activeFilter === 'pendientes' ? 'Sin préstamos pendientes'
                : activeFilter === 'activos' ? 'Sin préstamos activos'
                : 'Sin préstamos registrados'
              }}
            </h4>
            <p class="text-sm text-muted">
              {{ searchQuery
                ? 'Prueba con otro nombre, cédula o ID'
                : activeFilter !== 'todos' ? 'No hay préstamos que coincidan con este filtro'
                : 'Crea el primer préstamo usando el botón de arriba'
              }}
            </p>
          </div>

          <!-- CTA -->
          <div class="flex gap-2 mt-1">
            <button
              v-if="searchQuery || activeFilter !== 'todos'"
              @click="searchQuery = ''; activeFilter = 'todos'; currentPage = 1"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border text-muted hover:text-card-foreground hover:bg-hover transition-all"
            >
              <Icon name="X" :size="12" />
              Limpiar filtros
            </button>
            <button
              v-if="!searchQuery && activeFilter === 'todos' && esAdmin"
              @click="showModal = true"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
            >
              <Icon name="Plus" :size="12" />
              Nuevo préstamo
            </button>
          </div>
        </div>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-border bg-hover/50">
                <th class="text-left px-5 py-3.5 font-semibold text-muted text-xs uppercase tracking-wider">ID</th>
                <th class="text-left px-5 py-3.5 font-semibold text-muted text-xs uppercase tracking-wider">Cliente</th>
                <th class="text-right px-5 py-3.5 font-semibold text-muted text-xs uppercase tracking-wider">Monto</th>
                <th class="text-right px-5 py-3.5 font-semibold text-muted text-xs uppercase tracking-wider">Capital</th>
                <th class="text-right px-5 py-3.5 font-semibold text-muted text-xs uppercase tracking-wider">Saldo</th>
                <th class="text-right px-5 py-3.5 font-semibold text-muted text-xs uppercase tracking-wider">Mora</th>
                <th class="text-center px-5 py-3.5 font-semibold text-muted text-xs uppercase tracking-wider">Estado</th>
                <th class="text-left px-5 py-3.5 font-semibold text-muted text-xs uppercase tracking-wider">Inicio</th>
                <th class="text-center px-5 py-3.5 font-semibold text-muted text-xs uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="prestamo in paginatedPrestamos" :key="prestamo.id"
                :class="[
                  'border-b border-border last:border-0 transition-all group',
                  getMoraSeverity(prestamo.mora)?.rowClass || 'hover:bg-hover/40'
                ]"
              >
                <!-- ID -->
                <td class="px-5 py-3.5">
                  <span class="text-xs font-mono font-bold text-primary">#{{ prestamo.id }}</span>
                </td>

                <!-- Cliente -->
                <td class="px-5 py-3.5">
                  <div class="flex items-center gap-3">
                    <div :class="['w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-transform group-hover:scale-105', getAvatarColor(prestamo.cliente_id)]">
                      {{ getInitials(prestamo.cliente) }}
                    </div>
                    <div>
                      <p class="font-semibold text-card-foreground text-sm leading-tight">
                        {{ prestamo.cliente?.nombre || prestamo.cliente?.persona?.nombre || "—" }}
                      </p>
                      <p class="text-[11px] text-muted mt-0.5">{{ prestamo.cliente?.dpi || prestamo.cliente?.persona?.dpi || "Sin DPI" }}</p>
                    </div>
                  </div>
                </td>

                <!-- Monto -->
                <td class="px-5 py-3.5 text-right font-semibold text-card-foreground">
                  {{ formatMoney(prestamo.monto) }}
                </td>

                <!-- Capital con barra de progreso -->
                <td class="px-5 py-3.5 text-right">
                  <p class="text-sm text-muted font-medium">{{ formatMoney(prestamo.capital_activo) }}</p>
                  <div class="w-16 h-1 bg-border rounded-full mt-1 ml-auto overflow-hidden">
                    <div
                      class="h-full rounded-full transition-all"
                      :class="getCapitalProgress(prestamo) >= 80 ? 'bg-emerald-500' : getCapitalProgress(prestamo) >= 40 ? 'bg-blue-500' : 'bg-primary/40'"
                      :style="{ width: getCapitalProgress(prestamo) + '%' }"
                    ></div>
                  </div>
                </td>

                <!-- Saldo -->
                <td class="px-5 py-3.5 text-right">
                  <span
                    :class="(prestamo.saldo || 0) < 0
                      ? 'text-emerald-600 font-medium text-xs'
                      : (prestamo.saldo || 0) === 0 ? 'text-muted text-sm' : 'text-muted text-sm'"
                    :title="(prestamo.saldo || 0) < 0 ? 'Exceso de pagos' : ''"
                  >
                    {{ (prestamo.saldo || 0) < 0 ? 'Pagado+' : formatMoney(prestamo.saldo) }}
                  </span>
                </td>

                <!-- Mora con severidad -->
                <td class="px-5 py-3.5 text-right">
                  <div v-if="(prestamo.mora || 0) > 0" class="inline-flex items-center gap-1.5 justify-end">
                    <span :class="['w-1.5 h-1.5 rounded-full flex-shrink-0', getMoraSeverity(prestamo.mora)?.dotClass]"></span>
                    <span class="text-red-600 font-semibold text-sm">{{ formatMoney(prestamo.mora) }}</span>
                  </div>
                  <span v-else class="text-muted text-sm">—</span>
                </td>

                <!-- Estado -->
                <td class="px-5 py-3.5 text-center">
                  <span :class="[getStatusBadge(prestamo).class, 'inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold']">
                    {{ getStatusBadge(prestamo).label }}
                  </span>
                </td>

                <!-- Fecha relativa -->
                <td class="px-5 py-3.5">
                  <span
                    class="text-xs text-muted cursor-default"
                    :title="prestamo.fecha_inicio || ''"
                  >
                    {{ formatRelativeDate(prestamo.fecha_inicio) }}
                  </span>
                </td>

                <!-- Acciones (visibles solo en hover) -->
                <td class="px-5 py-3.5">
                  <div class="flex items-center justify-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      class="p-1.5 rounded-lg transition-colors hover:bg-primary/10"
                      title="Ver detalle"
                      @click="router.push({ name: 'prestamoDetalle', params: { id: prestamo.id } })"
                    >
                      <Icon name="Eye" :size="15" class="text-muted hover:text-primary transition-colors" />
                    </button>
                    <button
                      class="p-1.5 rounded-lg transition-colors hover:bg-emerald-500/10"
                      title="Pagos"
                      @click="router.push({ name: 'prestamoDetalle', params: { id: prestamo.id }, query: { tab: 'pagos' } })"
                    >
                      <Icon name="Receipt" :size="15" class="text-muted hover:text-emerald-500 transition-colors" />
                    </button>
                    <button
                      class="p-1.5 rounded-lg transition-colors hover:bg-amber-500/10"
                      title="Ficha"
                      @click="router.push({ name: 'prestamoDetalle', params: { id: prestamo.id }, query: { tab: 'ficha' } })"
                    >
                      <Icon name="Printer" :size="15" class="text-muted hover:text-amber-500 transition-colors" />
                    </button>
                    <button
                      v-if="esAdmin"
                      class="p-1.5 rounded-lg transition-colors hover:bg-red-500/10"
                      title="Eliminar crédito"
                      @click.stop="openDeleteModal(prestamo)"
                    >
                      <Icon name="Trash2" :size="15" class="text-muted hover:text-red-500 transition-colors" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="totalPages > 1" class="flex items-center justify-between px-5 py-3.5 border-t border-border">
          <span class="text-xs text-muted">
            Mostrando {{ (currentPage - 1) * itemsPerPage + 1 }}–{{ Math.min(currentPage * itemsPerPage, filteredPrestamos.length) }} de {{ filteredPrestamos.length }}
          </span>
          <div class="flex items-center gap-1">
            <Button variant="outline" size="sm" :disabled="currentPage <= 1" @click="currentPage--">
              <Icon name="ChevronLeft" :size="16" />
            </Button>
            <template v-for="page in totalPages" :key="page">
              <Button v-if="page <= 3 || page === totalPages || Math.abs(page - currentPage) <= 1"
                :variant="page === currentPage ? 'default' : 'outline'" size="sm" @click="currentPage = page">
                {{ page }}
              </Button>
              <span v-else-if="page === 4 || page === totalPages - 1" class="px-1 text-muted">...</span>
            </template>
            <Button variant="outline" size="sm" :disabled="currentPage >= totalPages" @click="currentPage++">
              <Icon name="ChevronRight" :size="16" />
            </Button>
          </div>
        </div>
      </div>
    </div>

    <Footer></Footer>
  </div>

  <!-- DELETE LOAN MODAL -->
  <Teleport to="body">
    <div v-if="showDeleteModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div class="bg-card w-full max-w-md rounded-2xl shadow-2xl border border-border overflow-hidden">
        <div class="flex items-center justify-between p-5 border-b border-border">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center">
              <Icon name="Trash2" :size="18" class="text-red-500" />
            </div>
            <h3 class="text-base font-bold text-card-foreground">Eliminar Crédito</h3>
          </div>
          <button @click="showDeleteModal = false; deletingPrestamo = null" class="p-1.5 rounded-lg hover:bg-hover transition-colors">
            <Icon name="X" :size="16" class="text-muted" />
          </button>
        </div>
        <div class="p-5 space-y-4">
          <div class="flex items-start gap-3 p-3.5 rounded-xl bg-red-500/5 border border-red-500/20">
            <Icon name="AlertTriangle" :size="18" class="text-red-500 mt-0.5 flex-shrink-0" />
            <div class="text-sm">
              <p class="font-semibold text-card-foreground mb-1">Esta acción es irreversible</p>
              <p class="text-muted text-xs leading-relaxed">Se eliminarán permanentemente el crédito, todas sus fichas de pago y sus registros de pagos.</p>
            </div>
          </div>
          <div v-if="deletingPrestamo" class="space-y-1.5">
            <div class="flex justify-between text-sm py-1.5 border-b border-border">
              <span class="text-muted">Crédito</span>
              <span class="font-semibold text-card-foreground">#{{ deletingPrestamo.id }}</span>
            </div>
            <div class="flex justify-between text-sm py-1.5 border-b border-border">
              <span class="text-muted">Cliente</span>
              <span class="font-semibold text-card-foreground">
                {{ deletingPrestamo.cliente?.persona
                  ? `${deletingPrestamo.cliente.persona.nombre} ${deletingPrestamo.cliente.persona.apellido}`
                  : `ID ${deletingPrestamo.cliente_id}` }}
              </span>
            </div>
            <div class="flex justify-between text-sm py-1.5">
              <span class="text-muted">Monto</span>
              <span class="font-semibold text-card-foreground">{{ formatMoney(deletingPrestamo.monto) }}</span>
            </div>
          </div>
        </div>
        <div class="flex items-center justify-end gap-3 px-5 py-4 border-t border-border">
          <button
            class="px-4 py-2 rounded-lg text-sm font-medium border border-border hover:bg-hover transition-colors"
            :disabled="deleteLoading"
            @click="showDeleteModal = false; deletingPrestamo = null"
          >
            Cancelar
          </button>
          <button
            class="px-4 py-2 rounded-lg text-sm font-semibold bg-red-500 hover:bg-red-600 text-white transition-colors disabled:opacity-50"
            :disabled="deleteLoading"
            @click="confirmarEliminar"
          >
            <span v-if="deleteLoading" class="flex items-center gap-2">
              <Icon name="Loader2" :size="14" class="animate-spin" /> Eliminando…
            </span>
            <span v-else>Eliminar crédito</span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- CREATE LOAN MODAL -->
  <Teleport to="body">
    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="fixed inset-0 bg-black/50 backdrop-blur-sm" @click="showModal = false"></div>
      <div class="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h3 class="text-lg font-bold text-card-foreground">Nuevo Préstamo</h3>
            <p class="text-xs text-muted mt-0.5">Ingresa los datos del nuevo préstamo</p>
          </div>
          <button @click="showModal = false" class="p-2 rounded-lg hover:bg-hover transition-colors">
            <Icon name="X" :size="18" class="text-muted" />
          </button>
        </div>

        <form @submit.prevent="handleCreatePrestamo" class="p-6 space-y-5">
          <!-- Client Search -->
          <div>
            <h4 class="text-sm font-semibold text-card-foreground mb-3 flex items-center gap-2">
              <Icon name="User" :size="16" class="text-primary" /> Cliente
            </h4>
            <div class="relative">
              <label class="block text-xs font-medium text-muted mb-1.5">Buscar cliente *</label>
              <div class="relative">
                <Icon name="Search" :size="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  v-model="clienteSearch"
                  type="text"
                  placeholder="Escribe nombre o cédula del cliente..."
                  class="w-full pl-9 pr-4 py-2.5 rounded-lg border border-border bg-background text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  @focus="showClienteDropdown = clienteOptions.length > 0"
                />
              </div>
              <!-- Dropdown -->
              <div v-if="showClienteDropdown && clienteOptions.length > 0"
                class="absolute z-10 mt-1 w-full bg-card border border-border rounded-lg shadow-xl max-h-48 overflow-y-auto">
                <button
                  v-for="c in clienteOptions" :key="c.id"
                  type="button"
                  @click="selectCliente(c)"
                  class="w-full text-left px-4 py-3 hover:bg-hover transition-colors flex items-center justify-between border-b border-border last:border-0"
                >
                  <span class="text-sm font-medium">{{ c.nombre }}</span>
                  <span class="text-xs text-muted">{{ c.cedula || "Sin DPI" }}</span>
                </button>
              </div>
              <div v-if="searchingClientes" class="absolute z-10 mt-1 w-full bg-card border border-border rounded-lg shadow-xl p-4 text-center">
                <p class="text-xs text-muted">Buscando...</p>
              </div>
              <!-- Selected -->
              <div v-if="newPrestamo.cliente_id" class="mt-2 flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 rounded-lg">
                <Icon name="CheckCircle" :size="14" />
                <span class="font-medium">{{ newPrestamo.cliente_nombre }}</span>
                <button type="button" @click="newPrestamo.cliente_id = null; newPrestamo.cliente_nombre = ''; clienteSearch = ''" class="ml-auto">
                  <Icon name="X" :size="12" />
                </button>
              </div>
            </div>
          </div>

          <!-- Loan Details -->
          <div>
            <h4 class="text-sm font-semibold text-card-foreground mb-3 flex items-center gap-2">
              <Icon name="Wallet" :size="16" class="text-primary" /> Detalles del Préstamo
            </h4>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <!-- Plan de Pago (REQUERIDO - primero) -->
              <div>
                <label class="block text-xs font-medium text-muted mb-1.5">Plan de Préstamo *</label>
                <select v-model.number="newPrestamo.plan_id" required
                  class="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none">
                  <option :value="null">Selecciona un plan...</option>
                  <option v-for="plan in planes" :key="plan.id" :value="plan.id">
                    {{ plan.nombre }} ({{ plan.interes_porcentaje }}% interés)
                  </option>
                </select>
                <p v-if="!newPrestamo.plan_id && newPrestamo.monto" class="text-xs text-amber-600 bg-amber-50 dark:bg-amber-500/10 rounded px-2 py-1.5 mt-1.5 flex items-center gap-1">
                  <Icon name="AlertTriangle" :size="13" />
                  El plan es obligatorio para calcular automáticamente
                </p>
              </div>

              <!-- Monto (REQUERIDO - dependiente de plan) -->
              <div>
                <label class="block text-xs font-medium text-muted mb-1.5">Monto (Q) *</label>
                <input v-model.number="newPrestamo.monto" type="number" step="0.01" min="1" required
                  :disabled="!newPrestamo.plan_id"
                  class="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="0.00" />
                <p v-if="!newPrestamo.plan_id" class="text-xs text-muted mt-1.5">Selecciona un plan primero</p>
              </div>

              <!-- Cuotas (REQUERIDO) -->
              <div>
                <label class="block text-xs font-medium text-muted mb-1.5">Cuotas *</label>
                <input v-model.number="newPrestamo.cuotas" type="number" step="1" min="1" max="240" required
                  :disabled="!newPrestamo.plan_id"
                  class="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="Ej: 4" />
                <p v-if="newPrestamo.plan_id && newPrestamo.cuotas && selectedPlan" class="text-xs text-muted mt-1.5">
                  {{ newPrestamo.cuotas }} pagos cada {{ selectedPlan.frecuencia_dias }} días
                </p>
                <p v-else-if="!newPrestamo.plan_id" class="text-xs text-muted mt-1.5">Selecciona un plan primero</p>
              </div>
              <!-- Plan summary when selected -->
              <div v-if="selectedPlan" class="sm:col-span-2 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-xl p-4">
                <p class="text-xs font-bold text-blue-900 dark:text-blue-100 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <Icon name="FileText" :size="13" /> Plan Seleccionado
                </p>
                <div class="grid grid-cols-3 gap-3">
                  <div class="bg-white dark:bg-gray-900 rounded-lg p-2.5">
                    <p class="text-[10px] text-muted uppercase font-semibold mb-0.5">Tasa Interés</p>
                    <p class="font-bold text-emerald-600">{{ selectedPlan.interes_porcentaje }}%</p>
                  </div>
                  <div class="bg-white dark:bg-gray-900 rounded-lg p-2.5">
                    <p class="text-[10px] text-muted uppercase font-semibold mb-0.5">Mora Atraso</p>
                    <p class="font-bold text-orange-600">{{ selectedPlan.mora_porcentaje }}%</p>
                  </div>
                  <div class="bg-white dark:bg-gray-900 rounded-lg p-2.5">
                    <p class="text-[10px] text-muted uppercase font-semibold mb-0.5">Frecuencia</p>
                    <p class="font-bold text-purple-600">c/{{ selectedPlan.frecuencia_dias }}d</p>
                  </div>
                </div>
              </div>
              <div>
                <label class="block text-xs font-medium text-muted mb-1.5">Tipo</label>
                <select v-model.number="newPrestamo.tipo"
                  class="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none">
                  <option :value="1">Normal</option>
                  <option :value="2">Renovación</option>
                  <option :value="3">Paralelo</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Dates -->
          <div>
            <h4 class="text-sm font-semibold text-card-foreground mb-3 flex items-center gap-2">
              <Icon name="Calendar" :size="16" class="text-primary" /> Fechas
            </h4>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-medium text-muted mb-1.5">Fecha de Inicio</label>
                <input v-model="newPrestamo.fecha_inicio" type="date"
                  class="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
              </div>
              <div>
                <label class="block text-xs font-medium text-muted mb-1.5">Fecha de Desembolso</label>
                <input v-model="newPrestamo.fecha_desembolso" type="date"
                  class="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
              </div>
              <div>
                <label class="block text-xs font-medium text-muted mb-1.5">
                  Fecha de Finalización
                  <span v-if="selectedPlan && newPrestamo.cuotas" class="text-[10px] text-muted ml-1">
                    ({{ newPrestamo.cuotas }} cuotas × {{ selectedPlan.frecuencia_dias ?? 30 }} días)
                  </span>
                </label>
                <input v-model="newPrestamo.fecha_fin" type="date"
                  class="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  :placeholder="fechaFinCalculada || 'Selecciona un plan'" />
              </div>
            </div>
            <p v-if="fechaFinCalculada && newPrestamo.fecha_fin !== fechaFinCalculada" class="text-[11px] text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1">
              <Icon name="AlertCircle" :size="12" /> Fecha calculada: {{ fechaFinCalculada }}
            </p>
          </div>

          <!-- Notes -->
          <div>
            <label class="block text-xs font-medium text-muted mb-1.5">Observaciones</label>
            <textarea v-model="newPrestamo.observaciones" rows="3"
              class="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none" placeholder="Notas adicionales..."></textarea>
          </div>

          <!-- Summary -->
          <div v-if="newPrestamo.monto && selectedPlan && newPrestamo.cuotas" class="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-500/10 dark:to-blue-500/5 border border-blue-200 dark:border-blue-500/30 rounded-xl p-4">
            <h4 class="text-xs font-semibold text-blue-900 dark:text-blue-100 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <Icon name="DollarSign" :size="14" /> Resumen del Préstamo
            </h4>
            <div class="space-y-2">
              <div class="flex justify-between text-sm">
                <span class="text-muted">Capital solicitado</span>
                <span class="font-semibold">{{ formatMoney(newPrestamo.monto) }}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-muted">Interés ({{ selectedPlan.interes_porcentaje }}%)</span>
                <span class="font-semibold text-green-600">+ {{ formatMoney(interesMonto) }}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-muted">Cuotas</span>
                <span class="font-semibold">{{ newPrestamo.cuotas }} × {{ formatMoney(cuotaEstimada) }}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-muted">Frecuencia de pago</span>
                <span class="font-semibold">Cada {{ selectedPlan.frecuencia_dias }} días</span>
              </div>
              <hr class="border-blue-200 dark:border-blue-500/20" />
              <div class="flex justify-between text-sm">
                <span class="font-semibold text-blue-900 dark:text-blue-100">Total a Pagar</span>
                <span class="font-bold text-blue-600 text-lg">{{ formatMoney(totalPagar) }}</span>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex justify-end gap-3 pt-2">
            <Button variant="outline" type="button" @click="showModal = false">Cancelar</Button>
            <Button type="submit" :disabled="saving" class="gap-2">
              <svg v-if="saving" class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {{ saving ? "Guardando..." : "Crear Préstamo" }}
            </Button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>
