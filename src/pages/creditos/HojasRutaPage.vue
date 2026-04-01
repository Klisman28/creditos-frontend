<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import apiClient from "@/apiClient";
import Footer from "@/components/Footer.vue";
import Icon from "@/components/Icon.vue";
import { Button } from "@/components/ui/button";
import { push } from "notivue";
import { useAuthStore } from "@/stores/auth";

const authStore = useAuthStore();
const esAdministrador = computed(() => authStore.role === "administrador");

interface HojaRutaItem {
  id: number;
  nombre: string;
  activa: number;
  promotor: string;
  user_id: number;
  total_capital: number;
  capital_activo: number;
  comision: number;
  mora: number;
  capital_vencido: number;
  total_clientes: number;
}

interface HojasRutaResponse {
  total: number;
  activas: number;
  total_capital: number;
  total_mora: number;
  items: HojaRutaItem[];
}

const loading = ref(true);
const data = ref<HojasRutaResponse | null>(null);
const searchQuery = ref("");

// Promotores cache (shared across modals)
const promotores = ref<{ id: number; nombre: string }[]>([]);
const loadingPromotores = ref(false);

const fetchPromotores = async () => {
  if (promotores.value.length > 0) return;
  loadingPromotores.value = true;
  try {
    const res = await apiClient.get("/usuarios");
    promotores.value = res.data
      .filter((u: any) => u.roles?.some((r: any) => r.nombre === "Promotor"))
      .map((u: any) => ({
        id: u.id,
        nombre: u.persona
          ? `${u.persona.nombre} ${u.persona.apellido}`.trim()
          : u.name,
      }));
  } catch {
    push.error("Error al cargar lista de promotores");
  } finally {
    loadingPromotores.value = false;
  }
};

const loadData = async () => {
  loading.value = true;
  try {
    const res = await apiClient.get("/hojas-ruta");
    data.value = res.data;
  } catch (error: any) {
    push.error(error.response?.data?.detail || "Error al cargar hojas de ruta");
  } finally {
    loading.value = false;
  }
};

onMounted(loadData);

const filteredItems = computed(() => {
  if (!data.value) return [];
  const q = searchQuery.value.toLowerCase().trim();
  if (!q) return data.value.items;
  return data.value.items.filter(
    (i) =>
      (i.nombre || "").toLowerCase().includes(q) ||
      (i.promotor || "").toLowerCase().includes(q)
  );
});

// ── Crear Ruta ─────────────────────────────────────────────────────────
const showCrearModal = ref(false);
const crearNombre = ref("");
const crearPromotorId = ref<number | null>(null);
const crearLoading = ref(false);

const openCrear = async () => {
  crearNombre.value = "";
  crearPromotorId.value = null;
  showCrearModal.value = true;
  await fetchPromotores();
};

const confirmarCrear = async () => {
  if (!crearNombre.value.trim() || !crearPromotorId.value) return;
  crearLoading.value = true;
  try {
    await apiClient.post("/hojas-ruta/", {
      nombre: crearNombre.value.trim(),
      user_id: crearPromotorId.value,
    });
    push.success("Ruta creada correctamente");
    showCrearModal.value = false;
    await loadData();
  } catch (error: any) {
    push.error(error.response?.data?.detail || "Error al crear la ruta");
  } finally {
    crearLoading.value = false;
  }
};

// ── Editar Ruta ────────────────────────────────────────────────────────
const showEditarModal = ref(false);
const editandoHoja = ref<HojaRutaItem | null>(null);
const editarNombre = ref("");
const editarLoading = ref(false);

const openEditar = (hoja: HojaRutaItem) => {
  editandoHoja.value = hoja;
  editarNombre.value = hoja.nombre || "";
  showEditarModal.value = true;
};

const confirmarEditar = async () => {
  if (!editandoHoja.value || !editarNombre.value.trim()) return;
  editarLoading.value = true;
  try {
    await apiClient.put(`/hojas-ruta/${editandoHoja.value.id}`, {
      nombre: editarNombre.value.trim(),
    });
    push.success("Ruta actualizada correctamente");
    showEditarModal.value = false;
    await loadData();
  } catch (error: any) {
    push.error(error.response?.data?.detail || "Error al actualizar la ruta");
  } finally {
    editarLoading.value = false;
  }
};

// ── Eliminar Ruta ──────────────────────────────────────────────────────
const showEliminarModal = ref(false);
const eliminandoHoja = ref<HojaRutaItem | null>(null);
const eliminarLoading = ref(false);

const openEliminar = (hoja: HojaRutaItem) => {
  eliminandoHoja.value = hoja;
  showEliminarModal.value = true;
};

const confirmarEliminar = async () => {
  if (!eliminandoHoja.value) return;
  eliminarLoading.value = true;
  try {
    await apiClient.delete(`/hojas-ruta/${eliminandoHoja.value.id}`);
    push.success("Ruta eliminada correctamente");
    showEliminarModal.value = false;
    await loadData();
  } catch (error: any) {
    push.error(error.response?.data?.detail || "Error al eliminar la ruta");
  } finally {
    eliminarLoading.value = false;
  }
};

// ── Cierre ─────────────────────────────────────────────────────────────
const showCierreModal = ref(false);
const selectedHoja = ref<HojaRutaItem | null>(null);
const cierreData = ref<any>(null);
const cierreLoading = ref(false);

const openCierre = async (hoja: HojaRutaItem) => {
  selectedHoja.value = hoja;
  cierreData.value = null;
  showCierreModal.value = true;
  cierreLoading.value = true;
  try {
    const res = await apiClient.get(`/finanzas/cierre-ruta/${hoja.id}`);
    cierreData.value = res.data;
  } catch (error: any) {
    push.error(error.response?.data?.detail || "Error al cargar cierre de ruta");
    showCierreModal.value = false;
  } finally {
    cierreLoading.value = false;
  }
};

// ── Asignar Promotor ───────────────────────────────────────────────────
const showAsignarModal = ref(false);
const selectedHojaAsignar = ref<HojaRutaItem | null>(null);
const selectedPromotorId = ref<number | null>(null);
const asignarLoading = ref(false);

const openAsignar = async (hoja: HojaRutaItem) => {
  selectedHojaAsignar.value = hoja;
  selectedPromotorId.value = null;
  showAsignarModal.value = true;
  await fetchPromotores();
};

const confirmarAsignacion = async () => {
  if (!selectedHojaAsignar.value || !selectedPromotorId.value) return;
  asignarLoading.value = true;
  try {
    await apiClient.patch(
      `/hojas-ruta/${selectedHojaAsignar.value.id}/asignar-promotor`,
      { user_id: selectedPromotorId.value }
    );
    push.success("Promotor asignado correctamente");
    showAsignarModal.value = false;
    await loadData();
  } catch (error: any) {
    push.error(error.response?.data?.detail || "Error al asignar promotor");
  } finally {
    asignarLoading.value = false;
  }
};

const formatMoney = (val: number | null | undefined) =>
  `Q${(val || 0).toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ── Sincronizar préstamos existentes ──────────────────────────────────
const sincronizandoId = ref<number | null>(null);

const sincronizarPrestamos = async (hoja: HojaRutaItem) => {
  sincronizandoId.value = hoja.id;
  try {
    const res = await apiClient.post(`/hojas-ruta/${hoja.id}/sincronizar-prestamos`);
    const vinculados = res.data.prestamos_vinculados ?? 0;
    if (vinculados > 0) {
      push.success(`${vinculados} préstamo(s) vinculado(s) correctamente`);
      await loadData();
    } else {
      push.info("No hay préstamos pendientes de vincular");
    }
  } catch (error: any) {
    push.error(error.response?.data?.detail || "Error al sincronizar préstamos");
  } finally {
    sincronizandoId.value = null;
  }
};
</script>

<template>
  <div class="grid grid-cols-12 mt-2 mb-6 gap-7">
    <!-- Header -->
    <div class="col-span-12">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 class="text-2xl font-bold text-card-foreground">Hojas de Ruta</h2>
          <p class="text-sm text-muted mt-1">Administración de rutas de cobro asignadas a promotores</p>
        </div>
        <div class="flex items-center gap-2 self-start sm:self-auto">
          <Button variant="outline" size="sm" class="gap-2" @click="loadData" :disabled="loading">
            <Icon name="RefreshCw" :size="14" :class="loading ? 'animate-spin' : ''" />
            Actualizar
          </Button>
          <Button v-if="esAdministrador" size="sm" class="gap-2" @click="openCrear">
            <Icon name="Plus" :size="14" />
            Nueva Ruta
          </Button>
        </div>
      </div>
    </div>

    <!-- Stat Cards -->
    <div class="col-span-12 sm:col-span-4">
      <div class="rounded-xl border border-border bg-card p-5 transition-all hover:shadow-md">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-medium text-muted uppercase tracking-wide">Rutas Activas</p>
            <h3 class="text-2xl font-bold text-emerald-600 mt-1">
              <span v-if="loading">—</span>
              <span v-else>{{ data?.activas ?? 0 }}</span>
            </h3>
          </div>
          <div class="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
            <Icon name="Route" :size="20" class="text-emerald-600 dark:text-emerald-400" />
          </div>
        </div>
      </div>
    </div>

    <div class="col-span-12 sm:col-span-4">
      <div class="rounded-xl border border-border bg-card p-5 transition-all hover:shadow-md">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-medium text-muted uppercase tracking-wide">Capital en Rutas</p>
            <h3 class="text-2xl font-bold text-blue-600 mt-1">
              <span v-if="loading">—</span>
              <span v-else>{{ formatMoney(data?.total_capital) }}</span>
            </h3>
          </div>
          <div class="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
            <Icon name="DollarSign" :size="20" class="text-blue-600 dark:text-blue-400" />
          </div>
        </div>
      </div>
    </div>

    <div class="col-span-12 sm:col-span-4">
      <div class="rounded-xl border border-border bg-card p-5 transition-all hover:shadow-md">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-medium text-muted uppercase tracking-wide">Mora Total</p>
            <h3 class="text-2xl font-bold text-red-600 mt-1">
              <span v-if="loading">—</span>
              <span v-else>{{ formatMoney(data?.total_mora) }}</span>
            </h3>
          </div>
          <div class="w-11 h-11 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
            <Icon name="AlertTriangle" :size="20" class="text-red-600 dark:text-red-400" />
          </div>
        </div>
      </div>
    </div>

    <!-- Table Card -->
    <div class="col-span-12">
      <div class="rounded-xl border border-border bg-card overflow-hidden">
        <!-- Toolbar -->
        <div class="flex items-center gap-3 px-6 py-4 border-b border-border">
          <div class="relative flex-1 max-w-sm">
            <Icon name="Search" :size="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Buscar por nombre o promotor..."
              class="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none"
            />
          </div>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="p-12 text-center">
          <div class="w-10 h-10 border-4 rounded-full border-border animate-spin border-t-primary mx-auto mb-4"></div>
          <p class="text-sm text-muted">Cargando hojas de ruta...</p>
        </div>

        <!-- Empty State -->
        <div v-else-if="filteredItems.length === 0" class="p-12 text-center">
          <div class="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Icon name="Route" :size="32" class="text-primary" />
          </div>
          <h4 class="text-lg font-semibold text-card-foreground mb-2">
            {{ data?.items.length === 0 ? (esAdministrador ? 'No hay hojas de ruta registradas' : 'No tienes rutas asignadas') : 'No se encontraron resultados' }}
          </h4>
          <p class="text-sm text-muted mb-4">
            {{ data?.items.length === 0
              ? (esAdministrador ? 'Crea una nueva ruta usando el botón "Nueva Ruta".' : 'Comunícate con el administrador para que te asigne una ruta de cobro.')
              : 'Intente con otro término de búsqueda.' }}
          </p>
          <Button v-if="data?.items.length === 0 && esAdministrador" size="sm" class="gap-2" @click="openCrear">
            <Icon name="Plus" :size="14" />
            Nueva Ruta
          </Button>
        </div>

        <!-- Table -->
        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-muted/30 text-muted uppercase text-[10px] tracking-widest font-bold border-b border-border">
                <th class="px-4 py-3 text-left">Nombre</th>
                <th class="px-4 py-3 text-left">Promotor</th>
                <th class="px-4 py-3 text-right">Clientes</th>
                <th class="px-4 py-3 text-right">Capital Activo</th>
                <th class="px-4 py-3 text-right">Mora</th>
                <th class="px-4 py-3 text-center">Estado</th>
                <th class="px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <tr
                v-for="hoja in filteredItems"
                :key="hoja.id"
                class="hover:bg-muted/20 transition-colors"
              >
                <td class="px-4 py-3">
                  <span class="font-semibold text-card-foreground">{{ hoja.nombre || `Ruta #${hoja.id}` }}</span>
                </td>
                <td class="px-4 py-3 text-muted">{{ hoja.promotor || '—' }}</td>
                <td class="px-4 py-3 text-right font-mono text-card-foreground">{{ hoja.total_clientes ?? 0 }}</td>
                <td class="px-4 py-3 text-right font-mono font-bold text-card-foreground">{{ formatMoney(hoja.capital_activo) }}</td>
                <td class="px-4 py-3 text-right font-mono" :class="hoja.mora > 0 ? 'text-red-500 font-bold' : 'text-muted'">
                  {{ formatMoney(hoja.mora) }}
                </td>
                <td class="px-4 py-3 text-center">
                  <span
                    :class="[
                      'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide',
                      hoja.activa
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                        : 'bg-muted text-muted-foreground'
                    ]"
                  >
                    <span class="w-1.5 h-1.5 rounded-full bg-current"></span>
                    {{ hoja.activa ? 'Activa' : 'Inactiva' }}
                  </span>
                </td>
                <td class="px-4 py-3 text-center">
                  <div class="flex items-center justify-center gap-1">
                    <Button size="sm" variant="outline" class="h-8 gap-1 text-xs" @click="openCierre(hoja)">
                      <Icon name="ClipboardList" :size="13" />
                      Cierre
                    </Button>
                    <Button v-if="esAdministrador" size="sm" variant="outline" class="h-8 gap-1 text-xs" @click="openAsignar(hoja)">
                      <Icon name="UserCheck" :size="13" />
                      Asignar
                    </Button>
                    <Button
                      v-if="esAdministrador"
                      size="sm"
                      variant="outline"
                      class="h-8 gap-1 text-xs text-blue-600 hover:text-blue-700 hover:border-blue-300"
                      @click="sincronizarPrestamos(hoja)"
                      :disabled="sincronizandoId === hoja.id"
                      title="Vincular préstamos aprobados del promotor a esta ruta"
                    >
                      <Icon :name="sincronizandoId === hoja.id ? 'Loader2' : 'RefreshCw'" :size="13" :class="sincronizandoId === hoja.id ? 'animate-spin' : ''" />
                      Sincronizar
                    </Button>
                    <Button size="sm" variant="outline" class="h-8 w-8 p-0" @click="openEditar(hoja)" title="Editar">
                      <Icon name="Pencil" :size="13" />
                    </Button>
                    <Button v-if="esAdministrador" size="sm" variant="outline" class="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:border-red-300" @click="openEliminar(hoja)" title="Eliminar">
                      <Icon name="Trash2" :size="13" />
                    </Button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Modal: Nueva Ruta -->
    <div v-if="showCrearModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div class="bg-card w-full max-w-md rounded-2xl shadow-2xl border border-border overflow-hidden animate-in zoom-in-95 duration-200">
        <div class="px-6 py-5 border-b border-border flex items-center justify-between bg-muted/30">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Icon name="Route" :size="20" class="text-primary" />
            </div>
            <div>
              <h3 class="text-base font-bold text-card-foreground">Nueva Ruta</h3>
              <p class="text-xs text-muted">Crea y asigna una nueva hoja de ruta</p>
            </div>
          </div>
          <button @click="showCrearModal = false" class="p-2 hover:bg-muted rounded-full transition-colors text-muted">
            <Icon name="X" :size="18" />
          </button>
        </div>

        <div class="p-6 space-y-4">
          <div>
            <label class="block text-sm font-medium text-card-foreground mb-1">Nombre de la ruta <span class="text-red-500">*</span></label>
            <input
              v-model="crearNombre"
              type="text"
              placeholder="Ej: Zona 1 Norte"
              class="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-card-foreground mb-1">Promotor asignado <span class="text-red-500">*</span></label>
            <select
              v-model="crearPromotorId"
              class="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none"
              :disabled="loadingPromotores"
            >
              <option :value="null" disabled>{{ loadingPromotores ? 'Cargando...' : 'Seleccionar promotor...' }}</option>
              <option v-for="p in promotores" :key="p.id" :value="p.id">{{ p.nombre }}</option>
            </select>
          </div>
        </div>

        <div class="px-6 py-4 bg-muted/30 border-t border-border flex justify-end gap-2">
          <Button variant="outline" @click="showCrearModal = false">Cancelar</Button>
          <Button :disabled="!crearNombre.trim() || !crearPromotorId || crearLoading" @click="confirmarCrear" class="gap-2">
            <Icon v-if="crearLoading" name="Loader2" :size="14" class="animate-spin" />
            Crear Ruta
          </Button>
        </div>
      </div>
    </div>

    <!-- Modal: Editar Ruta -->
    <div v-if="showEditarModal && editandoHoja" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div class="bg-card w-full max-w-md rounded-2xl shadow-2xl border border-border overflow-hidden animate-in zoom-in-95 duration-200">
        <div class="px-6 py-5 border-b border-border flex items-center justify-between bg-muted/30">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Icon name="Pencil" :size="20" class="text-primary" />
            </div>
            <div>
              <h3 class="text-base font-bold text-card-foreground">Editar Ruta</h3>
              <p class="text-xs text-muted">{{ editandoHoja.nombre || `Ruta #${editandoHoja.id}` }}</p>
            </div>
          </div>
          <button @click="showEditarModal = false" class="p-2 hover:bg-muted rounded-full transition-colors text-muted">
            <Icon name="X" :size="18" />
          </button>
        </div>

        <div class="p-6">
          <label class="block text-sm font-medium text-card-foreground mb-1">Nombre de la ruta <span class="text-red-500">*</span></label>
          <input
            v-model="editarNombre"
            type="text"
            class="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none"
          />
        </div>

        <div class="px-6 py-4 bg-muted/30 border-t border-border flex justify-end gap-2">
          <Button variant="outline" @click="showEditarModal = false">Cancelar</Button>
          <Button :disabled="!editarNombre.trim() || editarLoading" @click="confirmarEditar" class="gap-2">
            <Icon v-if="editarLoading" name="Loader2" :size="14" class="animate-spin" />
            Guardar
          </Button>
        </div>
      </div>
    </div>

    <!-- Modal: Confirmar Eliminar -->
    <div v-if="showEliminarModal && eliminandoHoja" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div class="bg-card w-full max-w-sm rounded-2xl shadow-2xl border border-border overflow-hidden animate-in zoom-in-95 duration-200">
        <div class="p-6 text-center">
          <div class="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <Icon name="Trash2" :size="26" class="text-red-500" />
          </div>
          <h3 class="text-base font-bold text-card-foreground mb-1">Eliminar Ruta</h3>
          <p class="text-sm text-muted">
            ¿Estás seguro que deseas eliminar <span class="font-semibold text-card-foreground">{{ eliminandoHoja.nombre || `Ruta #${eliminandoHoja.id}` }}</span>? Esta acción no se puede deshacer.
          </p>
        </div>
        <div class="px-6 py-4 bg-muted/30 border-t border-border flex justify-end gap-2">
          <Button variant="outline" @click="showEliminarModal = false">Cancelar</Button>
          <Button class="gap-2 bg-red-500 hover:bg-red-600 text-white border-0" :disabled="eliminarLoading" @click="confirmarEliminar">
            <Icon v-if="eliminarLoading" name="Loader2" :size="14" class="animate-spin" />
            Eliminar
          </Button>
        </div>
      </div>
    </div>

    <!-- Modal: Cierre -->
    <div v-if="showCierreModal && selectedHoja" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div class="bg-card w-full max-w-lg rounded-2xl shadow-2xl border border-border overflow-hidden animate-in zoom-in-95 duration-200">
        <div class="px-6 py-5 border-b border-border flex items-center justify-between bg-muted/30">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Icon name="ClipboardList" :size="20" class="text-primary" />
            </div>
            <div>
              <h3 class="text-base font-bold text-card-foreground">Cierre de Ruta</h3>
              <p class="text-xs text-muted">{{ selectedHoja.nombre || `Ruta #${selectedHoja.id}` }}</p>
            </div>
          </div>
          <button @click="showCierreModal = false" class="p-2 hover:bg-muted rounded-full transition-colors text-muted">
            <Icon name="X" :size="18" />
          </button>
        </div>

        <div class="p-6">
          <div v-if="cierreLoading" class="flex flex-col items-center justify-center py-12">
            <div class="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-3"></div>
            <p class="text-sm text-muted">Calculando cierre del día...</p>
          </div>

          <div v-else-if="cierreData" class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div class="bg-emerald-50 dark:bg-emerald-500/10 rounded-xl p-4 border border-emerald-100 dark:border-emerald-500/20">
                <p class="text-xs font-bold text-emerald-600 uppercase mb-1">Total Recaudado</p>
                <p class="text-2xl font-black text-emerald-700 dark:text-emerald-400">
                  {{ formatMoney(cierreData.total_recaudado ?? cierreData.total ?? 0) }}
                </p>
              </div>
              <div class="bg-muted/30 rounded-xl p-4 border border-border">
                <p class="text-xs font-bold text-muted uppercase mb-1">Cobros Realizados</p>
                <p class="text-2xl font-black text-card-foreground">
                  {{ cierreData.cobros_realizados ?? cierreData.count ?? '—' }}
                </p>
              </div>
            </div>
            <div v-if="cierreData.mora_recaudada != null" class="bg-red-50 dark:bg-red-500/10 rounded-xl p-4 border border-red-100 dark:border-red-500/20">
              <p class="text-xs font-bold text-red-600 uppercase mb-1">Mora Recaudada</p>
              <p class="text-xl font-black text-red-600">{{ formatMoney(cierreData.mora_recaudada) }}</p>
            </div>
            <div v-if="cierreData.pendientes != null" class="bg-amber-50 dark:bg-amber-500/10 rounded-xl p-4 border border-amber-100 dark:border-amber-500/20">
              <p class="text-xs font-bold text-amber-600 uppercase mb-1">Pendientes por Cobrar</p>
              <p class="text-xl font-black text-amber-600">{{ cierreData.pendientes }}</p>
            </div>
          </div>
        </div>

        <div class="px-6 py-4 bg-muted/30 border-t border-border flex justify-end">
          <Button variant="outline" @click="showCierreModal = false">Cerrar</Button>
        </div>
      </div>
    </div>

    <!-- Modal: Asignar Promotor -->
    <div v-if="showAsignarModal && selectedHojaAsignar" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div class="bg-card w-full max-w-md rounded-2xl shadow-2xl border border-border overflow-hidden animate-in zoom-in-95 duration-200">
        <div class="px-6 py-5 border-b border-border flex items-center justify-between bg-muted/30">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Icon name="UserCheck" :size="20" class="text-primary" />
            </div>
            <div>
              <h3 class="text-base font-bold text-card-foreground">Asignar Promotor</h3>
              <p class="text-xs text-muted">{{ selectedHojaAsignar.nombre || `Ruta #${selectedHojaAsignar.id}` }}</p>
            </div>
          </div>
          <button @click="showAsignarModal = false" class="p-2 hover:bg-muted rounded-full transition-colors text-muted">
            <Icon name="X" :size="18" />
          </button>
        </div>

        <div class="p-6 space-y-4">
          <p class="text-sm text-muted">
            Promotor actual:
            <span class="font-semibold text-card-foreground">{{ selectedHojaAsignar.promotor || '—' }}</span>
          </p>
          <div>
            <label class="block text-sm font-medium text-card-foreground mb-1">Nuevo promotor</label>
            <select
              v-model="selectedPromotorId"
              class="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none"
              :disabled="loadingPromotores"
            >
              <option :value="null" disabled>{{ loadingPromotores ? 'Cargando...' : 'Seleccionar promotor...' }}</option>
              <option v-for="p in promotores" :key="p.id" :value="p.id">{{ p.nombre }}</option>
            </select>
          </div>
        </div>

        <div class="px-6 py-4 bg-muted/30 border-t border-border flex justify-end gap-2">
          <Button variant="outline" @click="showAsignarModal = false">Cancelar</Button>
          <Button :disabled="!selectedPromotorId || asignarLoading" @click="confirmarAsignacion" class="gap-2">
            <Icon v-if="asignarLoading" name="Loader2" :size="14" class="animate-spin" />
            Confirmar
          </Button>
        </div>
      </div>
    </div>

    <Footer />
  </div>
</template>
