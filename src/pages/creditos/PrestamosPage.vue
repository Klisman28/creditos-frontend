<script setup lang="ts">
import { ref, onMounted, computed, watch } from "vue";
import { useRouter } from "vue-router";
import { prestamosService, type Prestamo } from "@/services/prestamosService";
import { type Cliente } from "@/services/clientesService";
import apiClient from "@/apiClient";
import Footer from "@/components/Footer.vue";
import Icon from "@/components/Icon.vue";
import { Button } from "@/components/ui/button";
import { push } from "notivue";

const router = useRouter();

interface ClienteOption {
  id: number;
  nombre: string;
  cedula: string | null;
}

interface PlanOption {
  id: number;
  nombre: string;
  interes: number | null;
  cuota: number | null;
  total: number | null;
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
  interes: 0,
  fecha_inicio: new Date().toISOString().split("T")[0],
  fecha_desembolso: new Date().toISOString().split("T")[0],
  observaciones: "",
  tipo: 1,
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

onMounted(() => {
  loadPrestamos();
  loadPlanes();
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
      const cedula = (p.cliente?.persona?.cedula || "").toLowerCase();
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

const filterTabs = [
  { key: "activos", label: "Activos", icon: "CircleCheck" },
  { key: "vencidos", label: "Vencidos", icon: "CheckCheck" },
  { key: "mora", label: "En Mora", icon: "AlertTriangle" },
  { key: "pendientes", label: "Pendientes", icon: "Clock" },
  { key: "aprobados_hoy", label: "Aprobados Hoy", icon: "CalendarCheck" },
] as const;

const resetForm = () => {
  newPrestamo.value = {
    cliente_id: null, cliente_nombre: "", monto: null, plan_id: null, interes: 0,
    fecha_inicio: new Date().toISOString().split("T")[0],
    fecha_desembolso: new Date().toISOString().split("T")[0],
    observaciones: "", tipo: 1,
  };
  clienteSearch.value = "";
  clienteOptions.value = [];
};

const handleCreatePrestamo = async () => {
  if (!newPrestamo.value.cliente_id) {
    push.warning("Selecciona un cliente");
    return;
  }
  if (!newPrestamo.value.monto || newPrestamo.value.monto <= 0) {
    push.warning("Ingresa un monto válido");
    return;
  }
  saving.value = true;
  try {
    await prestamosService.create(newPrestamo.value);
    push.success("Préstamo creado exitosamente");
    showModal.value = false;
    resetForm();
    loading.value = true;
    await loadPrestamos();
  } catch (error: any) {
    push.error(error.response?.data?.detail || "Error al crear préstamo");
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
                        {{ prestamo.cliente?.persona?.nombre || "—" }} {{ prestamo.cliente?.persona?.apellido || "" }}
                      </p>
                      <p class="text-xs text-muted">{{ prestamo.cliente?.persona?.cedula || "Sin cédula" }}</p>
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
              <div>
                <label class="block text-xs font-medium text-muted mb-1.5">Monto (Q) *</label>
                <input v-model.number="newPrestamo.monto" type="number" step="0.01" min="1" required
                  class="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" placeholder="0.00" />
              </div>
              <div>
                <label class="block text-xs font-medium text-muted mb-1.5">Interés (Q)</label>
                <input v-model.number="newPrestamo.interes" type="number" step="0.01"
                  class="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" placeholder="0.00" />
              </div>
              <div>
                <label class="block text-xs font-medium text-muted mb-1.5">Plan de Pago</label>
                <select v-model="newPrestamo.plan_id"
                  class="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none">
                  <option :value="null">Sin plan</option>
                  <option v-for="plan in planes" :key="plan.id" :value="plan.id">
                    {{ plan.nombre }} {{ plan.total ? `(${plan.total} cuotas)` : '' }}
                  </option>
                </select>
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
            </div>
          </div>

          <!-- Notes -->
          <div>
            <label class="block text-xs font-medium text-muted mb-1.5">Observaciones</label>
            <textarea v-model="newPrestamo.observaciones" rows="3"
              class="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none" placeholder="Notas adicionales..."></textarea>
          </div>

          <!-- Summary -->
          <div v-if="newPrestamo.monto" class="bg-hover rounded-xl p-4">
            <h4 class="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Resumen</h4>
            <div class="space-y-2">
              <div class="flex justify-between text-sm">
                <span class="text-muted">Capital</span>
                <span class="font-semibold">{{ formatMoney(newPrestamo.monto) }}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-muted">Interés</span>
                <span class="font-semibold">{{ formatMoney(newPrestamo.interes) }}</span>
              </div>
              <hr class="border-border" />
              <div class="flex justify-between text-sm">
                <span class="font-semibold text-card-foreground">Total a Pagar</span>
                <span class="font-bold text-primary">{{ formatMoney((newPrestamo.monto || 0) + (newPrestamo.interes || 0)) }}</span>
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
