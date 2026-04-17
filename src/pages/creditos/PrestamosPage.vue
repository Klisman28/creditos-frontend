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
  cuotas_default?: number;
  // Legacy fields para backward compatibility
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
  plan_id: null as number | null,
  fecha_inicio: new Date().toISOString().split("T")[0],
  fecha_desembolso: new Date().toISOString().split("T")[0],
  fecha_fin: null as string | null,
  observaciones: "",
  tipo: 1 as 1 | 2 | 3,
});

// Calcular fecha de finalización automáticamente: fecha_inicio + (cuotas * frecuencia_dias)
const fechaFinCalculada = computed(() => {
  if (!newPrestamo.value.fecha_inicio || !selectedPlan.value) return null;

  const inicio = new Date(newPrestamo.value.fecha_inicio + "T00:00:00");
  const cuotas = selectedPlan.value.cuotas_default ?? 12;
  const frecuencia = selectedPlan.value.frecuencia_dias ?? 30;

  // fecha_fin = fecha_inicio + (cuotas * frecuencia_dias)
  const diasTotales = cuotas * frecuencia;
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

// Cuotas default del plan o 12 si no existe
const cuotasDefault = computed(() => {
  return selectedPlan.value?.cuotas_default ?? 12;
});

// Cuota estimada = total / cuotas
const cuotaEstimada = computed(() => {
  if (!selectedPlan.value || !newPrestamo.value.monto) return null;
  if (cuotasDefault.value <= 0) return null;
  return totalPagar.value / cuotasDefault.value;
});

// Auto-update fecha_fin when plan or fecha_inicio changes
watch([() => newPrestamo.value.fecha_inicio, () => newPrestamo.value.plan_id], () => {
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
  if (!cliente?.persona) return "??";
  return `${(cliente.persona.nombre || "?")[0]}${(cliente.persona.apellido || "?")[0]}`.toUpperCase();
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
    cliente_id: null, cliente_nombre: "", monto: null, plan_id: null,
    fecha_inicio: new Date().toISOString().split("T")[0],
    fecha_desembolso: new Date().toISOString().split("T")[0],
    fecha_fin: null,
    observaciones: "", tipo: 1,
  };
  clienteSearch.value = "";
  clienteOptions.value = [];
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

  if (!selectedPlan.value) {
    push.error("El plan seleccionado no existe");
    return;
  }

  saving.value = true;
  try {
    // Construir payload con snapshot del plan
    const payload: CreatePrestamoPayload = {
      cliente_id: newPrestamo.value.cliente_id,
      plan_id: newPrestamo.value.plan_id,
      monto: newPrestamo.value.monto,
      fecha_inicio: newPrestamo.value.fecha_inicio || undefined,
      fecha_desembolso: newPrestamo.value.fecha_desembolso || undefined,
      tipo: newPrestamo.value.tipo,
      observaciones: newPrestamo.value.observaciones || undefined,
      // SNAPSHOT del plan (para auditoría e inmutabilidad)
      plan_snapshot: {
        interes_porcentaje: selectedPlan.value.interes_porcentaje,
        mora_porcentaje: selectedPlan.value.mora_porcentaje,
        frecuencia_dias: selectedPlan.value.frecuencia_dias,
        nombre: selectedPlan.value.nombre,
      },
      // Valores calculados (referencia)
      interes_monto_calculado: interesMonto.value,
      total_pagar_calculado: totalPagar.value,
    } as any; // Allow fecha_fin to be set below

    // Agregar fecha_fin si existe
    if (newPrestamo.value.fecha_fin) {
      (payload as any).fecha_fin = newPrestamo.value.fecha_fin;
    }

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
        <div v-else-if="filteredPrestamos.length === 0" class="p-12 text-center">
          <Icon name="FileX" :size="48" class="text-muted mx-auto mb-4" />
          <h4 class="text-lg font-semibold text-card-foreground mb-2">No se encontraron préstamos</h4>
          <p class="text-sm text-muted">Intenta con otro filtro o término de búsqueda</p>
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
              <tr v-for="prestamo in paginatedPrestamos" :key="prestamo.id"
                class="border-b border-border last:border-0 transition-colors hover:bg-hover/50">
                <td class="px-5 py-4">
                  <span class="text-xs font-mono font-bold text-primary">#{{ prestamo.id }}</span>
                </td>
                <td class="px-5 py-4">
                  <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                      {{ getInitials(prestamo.cliente) }}
                    </div>
                    <div>
                      <p class="font-semibold text-card-foreground text-sm">
                        {{ prestamo.cliente?.nombre || prestamo.cliente?.persona?.nombre || "—" }}
                      </p>
                      <p class="text-xs text-muted">{{ prestamo.cliente?.dpi || prestamo.cliente?.persona?.dpi || "Sin DPI" }}</p>
                    </div>
                  </div>
                </td>
                <td class="px-5 py-4 text-right font-semibold text-card-foreground">{{ formatMoney(prestamo.monto) }}</td>
                <td class="px-5 py-4 text-right text-muted">{{ formatMoney(prestamo.capital_activo) }}</td>
                <td class="px-5 py-4 text-right text-muted">{{ formatMoney(prestamo.saldo) }}</td>
                <td class="px-5 py-4 text-right">
                  <span :class="(prestamo.mora || 0) > 0 ? 'text-red-600 font-semibold' : 'text-muted'">
                    {{ formatMoney(prestamo.mora) }}
                  </span>
                </td>
                <td class="px-5 py-4 text-center">
                  <span :class="[getStatusBadge(prestamo).class, 'px-2.5 py-1 rounded-full text-xs font-semibold']">
                    {{ getStatusBadge(prestamo).label }}
                  </span>
                </td>
                <td class="px-5 py-4 text-muted text-xs">{{ prestamo.fecha_inicio || "—" }}</td>
                <td class="px-5 py-4">
                  <div class="flex items-center justify-center gap-1">
                    <button
                      class="p-1.5 rounded-lg transition-colors hover:bg-hover"
                      title="Ver detalle"
                      @click="router.push({ name: 'prestamoDetalle', params: { id: prestamo.id } })"
                    >
                      <Icon name="Eye" :size="16" class="text-muted hover:text-primary" />
                    </button>
                    <button
                      class="p-1.5 rounded-lg transition-colors hover:bg-hover"
                      title="Pagos"
                      @click="router.push({ name: 'prestamoDetalle', params: { id: prestamo.id }, query: { tab: 'pagos' } })"
                    >
                      <Icon name="Receipt" :size="16" class="text-muted hover:text-emerald-500" />
                    </button>
                    <button
                      class="p-1.5 rounded-lg transition-colors hover:bg-hover"
                      title="Ficha"
                      @click="router.push({ name: 'prestamoDetalle', params: { id: prestamo.id }, query: { tab: 'ficha' } })"
                    >
                      <Icon name="Printer" :size="16" class="text-muted hover:text-amber-500" />
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
              <!-- Plan summary when selected -->
              <div v-if="selectedPlan" class="sm:col-span-2 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-xl p-4">
                <p class="text-xs font-bold text-blue-900 dark:text-blue-100 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <Icon name="FileText" :size="13" /> Plan Seleccionado
                </p>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
                  <div class="bg-white dark:bg-gray-900 rounded-lg p-2.5">
                    <p class="text-[10px] text-muted uppercase font-semibold mb-0.5">Cuotas Def.</p>
                    <p class="font-bold text-blue-600">{{ cuotasDefault }}</p>
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
                  <span v-if="selectedPlan" class="text-[10px] text-muted ml-1">
                    ({{ selectedPlan.cuotas_default ?? 12 }} cuotas × {{ selectedPlan.frecuencia_dias ?? 30 }} días)
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
          <div v-if="newPrestamo.monto && selectedPlan" class="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-500/10 dark:to-blue-500/5 border border-blue-200 dark:border-blue-500/30 rounded-xl p-4">
            <h4 class="text-xs font-semibold text-blue-900 dark:text-blue-100 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <Icon name="DollarSign" :size="14" /> Resumen Simulado
            </h4>
            <div class="space-y-2">
              <div class="flex justify-between text-sm">
                <span class="text-muted">Capital solicitado</span>
                <span class="font-semibold">{{ formatMoney(newPrestamo.monto) }}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-muted">Interés ({{ selectedPlan.interes_porcentaje }}% del plan)</span>
                <span class="font-semibold text-green-600">+ {{ formatMoney(interesMonto) }}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-muted">Cuota estimada</span>
                <span class="font-semibold">{{ cuotaEstimada ? formatMoney(cuotaEstimada) : '—' }}</span>
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
