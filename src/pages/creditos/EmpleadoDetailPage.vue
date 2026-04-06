<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { usuariosService, type Usuario } from "@/services/usuariosService";
import apiClient from "@/apiClient";
import Footer from "@/components/Footer.vue";
import Icon from "@/components/Icon.vue";
import { Button } from "@/components/ui/button";
import { push } from "notivue";

const route = useRoute();
const router = useRouter();
const empleadoId = route.params.id as string;

const empleado = ref<Usuario | null>(null);
const loading = ref(true);
const activeTab = ref("resumen");

const tabs = [
  { id: "resumen", label: "Resumen", icon: "User" },
  { id: "rutas", label: "Rutas", icon: "Map" },
  { id: "calculos", label: "Cálculos", icon: "Calculator" },
  { id: "documentos", label: "Documentos", icon: "FileText" },
  { id: "pagos", label: "Pagos", icon: "Wallet" },
];

// Tab Data States
const tabContent = ref({
  rutas: { data: [] as any[], loading: false, error: false },
  pagos: { data: [] as any[], loading: false, error: false },
  calculos: { data: null as any, loading: false, error: false },
  documentos: { data: [] as any[], loading: false, error: false },
});

const loadEmpleado = async () => {
  loading.value = true;
  try {
    empleado.value = await usuariosService.getById(empleadoId);
  } catch (error) {
    console.error("Error loading employee:", error);
    push.error("No se pudo cargar la información del empleado");
    router.push({ name: "empleados" });
  } finally {
    loading.value = false;
  }
};

const loadRutas = async () => {
  tabContent.value.rutas.loading = true;
  try {
    const res = await apiClient.get(`/usuarios/${empleadoId}/rutas`);
    tabContent.value.rutas.data = res.data;
  } catch (error) {
    tabContent.value.rutas.error = true;
  } finally {
    tabContent.value.rutas.loading = false;
  }
};

// Nueva Hoja de Ruta modal
const showNuevaRutaModal = ref(false);
const nuevaRutaNombre = ref("");
const nuevaRutaSaving = ref(false);

const openNuevaRuta = () => {
  nuevaRutaNombre.value = "";
  showNuevaRutaModal.value = true;
};

const handleCrearRuta = async () => {
  nuevaRutaSaving.value = true;
  try {
    await apiClient.post("/hojas-ruta", {
      nombre: nuevaRutaNombre.value || null,
      user_id: Number(empleadoId),
    });
    push.success("Hoja de ruta creada correctamente");
    showNuevaRutaModal.value = false;
    await loadRutas();
  } catch (error: any) {
    push.error(error.response?.data?.detail || "Error al crear hoja de ruta");
  } finally {
    nuevaRutaSaving.value = false;
  }
};

// Editar Hoja de Ruta modal
const showEditarRutaModal = ref(false);
const editarRutaTarget = ref<any>(null);
const editarRutaNombre = ref("");
const editarRutaActiva = ref(1);
const editarRutaSaving = ref(false);

const openEditarRuta = (hoja: any) => {
  editarRutaTarget.value = hoja;
  editarRutaNombre.value = hoja.nombre || "";
  editarRutaActiva.value = hoja.activa ?? 1;
  showEditarRutaModal.value = true;
};

const handleEditarRuta = async () => {
  if (!editarRutaTarget.value) return;
  editarRutaSaving.value = true;
  try {
    await apiClient.put(`/hojas-ruta/${editarRutaTarget.value.id}`, {
      nombre: editarRutaNombre.value || null,
      activa: editarRutaActiva.value,
    });
    push.success("Hoja de ruta actualizada");
    showEditarRutaModal.value = false;
    await loadRutas();
  } catch (error: any) {
    push.error(error.response?.data?.detail || "Error al editar hoja de ruta");
  } finally {
    editarRutaSaving.value = false;
  }
};

// Eliminar Hoja de Ruta
const showEliminarRutaModal = ref(false);
const eliminarRutaTarget = ref<any>(null);
const eliminarRutaSaving = ref(false);

const openEliminarRuta = (hoja: any) => {
  eliminarRutaTarget.value = hoja;
  showEliminarRutaModal.value = true;
};

const handleEliminarRuta = async () => {
  if (!eliminarRutaTarget.value) return;
  eliminarRutaSaving.value = true;
  try {
    await apiClient.delete(`/hojas-ruta/${eliminarRutaTarget.value.id}`);
    push.success("Hoja de ruta eliminada");
    showEliminarRutaModal.value = false;
    await loadRutas();
  } catch (error: any) {
    push.error(error.response?.data?.detail || "Error al eliminar hoja de ruta");
  } finally {
    eliminarRutaSaving.value = false;
  }
};

const loadPagos = async () => {
  tabContent.value.pagos.loading = true;
  try {
    const res = await apiClient.get(`/usuarios/${empleadoId}/pagos`);
    tabContent.value.pagos.data = res.data;
  } catch (error) {
    tabContent.value.pagos.error = true;
  } finally {
    tabContent.value.pagos.loading = false;
  }
};

onMounted(() => {
  loadEmpleado();
  // Load first tab data if needed
  if (activeTab.value === "rutas") loadRutas();
});

const handleTabChange = (tabId: string) => {
  activeTab.value = tabId;
  if (tabId === "rutas" && tabContent.value.rutas.data.length === 0) loadRutas();
  if (tabId === "pagos" && tabContent.value.pagos.data.length === 0) loadPagos();
};

// Payment Modal Logic
const showPaymentModal = ref(false);
const paymentSaving = ref(false);

const todayISO = () => new Date().toISOString().substring(0, 10);

const paymentForm = ref({
  sueldo_base: 0,
  comision_clientes: 0,
  comision_capital: 0,
  descuento_mora: 0,
  combustible: 0,
  otros: 0,
  fecha: todayISO(),
});

const openPaymentModal = () => {
  if (!empleado.value) return;
  paymentForm.value = {
    sueldo_base: empleado.value.sueldo_base || 0,
    comision_clientes: 0,
    comision_capital: empleado.value.comision_capital_activo || 0,
    descuento_mora: 0,
    combustible: empleado.value.combustible || 0,
    otros: empleado.value.otros || 0,
    fecha: todayISO(),
  };
  showPaymentModal.value = true;
};

const totalPayment = computed(() => {
  const f = paymentForm.value;
  return f.sueldo_base + f.comision_clientes + f.comision_capital + f.combustible + f.otros - f.descuento_mora;
});

const handleProcessPayment = async () => {
  paymentSaving.value = true;
  try {
    await apiClient.post(`/usuarios/${empleadoId}/pagos`, paymentForm.value);
    push.success("Pago registrado exitosamente");
    showPaymentModal.value = false;
    loadPagos(); // Refresh list
  } catch (error: any) {
    push.error(error.response?.data?.detail || "Error al procesar el pago");
  } finally {
    paymentSaving.value = false;
  }
};

const formatCurrency = (val: number | null | undefined) => {
  if (val == null) return "Q0.00";
  return `Q${val.toLocaleString("es-GT", { minimumFractionDigits: 2 })}`;
};

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return "—";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("es-GT", {
    day: "2-digit", month: "short", year: "numeric"
  });
};

const getInitials = (emp: Usuario) => {
  if (emp.persona) {
    return `${(emp.persona.nombre || "?")[0]}${(emp.persona.apellido || "?")[0]}`.toUpperCase();
  }
  return emp.name.substring(0, 2).toUpperCase();
};
</script>

<template>
  <div class="space-y-6 mt-2 mb-10">
    <!-- Header / Profile Box -->
    <div v-if="!loading && empleado" class="relative">
      <div class="h-32 w-full rounded-2xl bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border border-border overflow-hidden">
        <div class="absolute -right-20 -top-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl"></div>
      </div>
      
      <div class="px-8 -mt-12 flex flex-col md:flex-row md:items-end justify-between gap-6 relative">
        <div class="flex flex-col md:flex-row items-center md:items-end gap-5 text-center md:text-left">
          <div class="w-32 h-32 rounded-3xl bg-card border-4 border-background shadow-xl flex items-center justify-center text-4xl font-bold text-primary overflow-hidden relative group">
             <div v-if="!empleado.persona?.foto_perfil" class="bg-primary/10 w-full h-full flex items-center justify-center">
                {{ getInitials(empleado) }}
             </div>
             <img v-else :src="empleado.persona.foto_perfil" class="w-full h-full object-cover" />
             <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer">
                <Icon name="Camera" :size="24" class="text-white" />
             </div>
          </div>
          
          <div class="pb-2">
            <h2 class="text-3xl font-extrabold text-card-foreground">
              {{ empleado.persona ? `${empleado.persona.nombre} ${empleado.persona.apellido}` : empleado.name }}
            </h2>
            <div class="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-2">
              <span class="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
                {{ empleado.roles?.[0]?.nombre || 'Usuario' }}
              </span>
              <span v-if="empleado.agencia" class="flex items-center gap-1.5 text-sm text-muted">
                <Icon name="MapPin" :size="14" />
                {{ empleado.agencia.nombre }}
              </span>
              <span :class="[empleado.estado === 1 ? 'text-emerald-500' : 'text-red-500', 'flex items-center gap-1.5 text-sm font-medium']">
                <span class="w-2 h-2 rounded-full bg-current"></span>
                {{ empleado.estado === 1 ? 'Activo' : 'Inactivo' }}
              </span>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-3 pb-2">
          <Button variant="outline" class="gap-2" @click="router.push({ name: 'empleadoEditar', params: { id: empleadoId } })">
            <Icon name="Pencil" :size="16" />
            Editar
          </Button>
          <Button variant="default" class="gap-2 shadow-lg shadow-primary/20" @click="openPaymentModal">
            <Icon name="DollarSign" :size="16" />
            Pagar
          </Button>
        </div>
      </div>
    </div>

    <!-- MODAL PAGAR -->
    <div v-if="showPaymentModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div class="bg-card w-full max-w-2xl rounded-3xl shadow-2xl border border-border overflow-hidden animate-in zoom-in-95 duration-300">
        <div class="px-8 py-6 border-b border-border flex items-center justify-between bg-muted/30">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
               <Icon name="DollarSign" :size="20" class="text-primary" />
            </div>
            <div>
              <h3 class="text-xl font-bold text-card-foreground">Efectuar Pago</h3>
              <p class="text-xs text-muted uppercase tracking-tighter font-bold">Registro de Boleta de Pago</p>
            </div>
          </div>
          <button @click="showPaymentModal = false" class="p-2 hover:bg-muted rounded-full transition-colors text-muted">
            <Icon name="X" :size="20" />
          </button>
        </div>

        <div class="p-8 space-y-6">
          <div class="grid grid-cols-2 gap-6">
             <div class="space-y-2">
               <label class="text-xs font-bold text-muted uppercase tracking-widest ml-1">Sueldo Base</label>
               <input v-model.number="paymentForm.sueldo_base" type="number" class="w-full px-4 py-3 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none font-bold" />
             </div>
             <div class="space-y-2">
               <label class="text-xs font-bold text-muted uppercase tracking-widest ml-1">Comisión Clientes</label>
               <input v-model.number="paymentForm.comision_clientes" type="number" class="w-full px-4 py-3 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none" />
             </div>
             <div class="space-y-2">
               <label class="text-xs font-bold text-muted uppercase tracking-widest ml-1">Comisión Capital</label>
               <input v-model.number="paymentForm.comision_capital" type="number" class="w-full px-4 py-3 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none" />
             </div>
             <div class="space-y-2">
               <label class="text-xs font-bold text-muted uppercase tracking-widest ml-1">Combustible</label>
               <input v-model.number="paymentForm.combustible" type="number" class="w-full px-4 py-3 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none" />
             </div>
             <div class="space-y-2">
               <label class="text-xs font-bold text-muted uppercase tracking-widest ml-1 text-red-500">Descuento Mora</label>
               <input v-model.number="paymentForm.descuento_mora" type="number" class="w-full px-4 py-3 rounded-xl border border-red-200 bg-red-50/10 focus:ring-2 focus:ring-red-500/10 outline-none text-red-600 font-bold" />
             </div>
             <div class="space-y-2">
               <label class="text-xs font-bold text-muted uppercase tracking-widest ml-1">Otros</label>
               <input v-model.number="paymentForm.otros" type="number" class="w-full px-4 py-3 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none" />
             </div>
             <div class="space-y-2 col-span-2">
               <label class="text-xs font-bold text-muted uppercase tracking-widest ml-1">Fecha de Boleta</label>
               <input v-model="paymentForm.fecha" type="date" class="w-full px-4 py-3 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none" />
             </div>
          </div>

          <div class="bg-primary/5 rounded-2xl p-6 border border-primary/10 flex items-center justify-between">
             <div class="text-sm font-bold text-primary/80 uppercase">Total a Liquidar</div>
             <div class="text-3xl font-black text-primary">{{ formatCurrency(totalPayment) }}</div>
          </div>
        </div>

        <div class="px-8 py-6 bg-muted/30 border-t border-border flex justify-end gap-3">
          <Button variant="outline" @click="showPaymentModal = false" :disabled="paymentSaving">Cancelar</Button>
          <Button variant="default" @click="handleProcessPayment" :disabled="paymentSaving" class="px-8 shadow-lg shadow-primary/20 min-w-[140px]">
            <span v-if="!paymentSaving">Realizar Pago</span>
            <div v-else class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          </Button>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div v-if="!loading && empleado" class="grid grid-cols-12 gap-6">
      <!-- Tabs Sidebar -->
      <div class="col-span-12 lg:col-span-3">
        <div class="bg-card border border-border rounded-2xl p-3 sticky top-4">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            @click="handleTabChange(tab.id)"
            :class="[
              'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all group mb-1',
              activeTab === tab.id 
                ? 'bg-primary text-primary-foreground shadow-md' 
                : 'text-muted hover:bg-muted/50 hover:text-card-foreground'
            ]"
          >
            <Icon :name="tab.icon as any" :size="18" :class="activeTab === tab.id ? 'text-white' : 'text-muted group-hover:text-primary'" />
            {{ tab.label }}
          </button>
        </div>
      </div>

      <!-- Tab Content Area -->
      <div class="col-span-12 lg:col-span-9">
        <div class="bg-card border border-border rounded-2xl overflow-hidden min-h-[500px]">
          
          <!-- RESUMEN TAB -->
          <div v-if="activeTab === 'resumen'" class="p-8 animate-in fade-in slide-in-from-bottom-2">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-10">
              <section>
                <h3 class="text-lg font-bold text-card-foreground mb-6 flex items-center gap-2">
                  <Icon name="User" :size="18" class="text-primary" /> Información de Contacto
                </h3>
                <div class="space-y-4">
                   <div class="flex flex-col gap-1">
                      <span class="text-xs font-semibold text-muted uppercase tracking-wider">Correo Electrónico</span>
                      <span class="text-card-foreground font-medium">{{ empleado.email }}</span>
                   </div>
                   <div class="flex flex-col gap-1">
                      <span class="text-xs font-semibold text-muted uppercase tracking-wider">Teléfonos</span>
                      <span class="text-card-foreground font-medium">{{ empleado.persona?.celular1 || '—' }} / {{ empleado.persona?.telefono || '—' }}</span>
                   </div>
                   <div class="flex flex-col gap-1">
                      <span class="text-xs font-semibold text-muted uppercase tracking-wider">Dirección de Domicilio</span>
                      <span class="text-card-foreground font-medium">{{ empleado.persona?.domicilio || '—' }}</span>
                   </div>
                   <div class="flex flex-col gap-1">
                      <span class="text-xs font-semibold text-muted uppercase tracking-wider">DPI</span>
                      <span class="text-card-foreground font-mono">{{ empleado.persona?.dpi || '—' }}</span>
                   </div>
                </div>
              </section>

              <section>
                <h3 class="text-lg font-bold text-card-foreground mb-6 flex items-center gap-2">
                  <Icon name="DollarSign" :size="18" class="text-primary" /> Detalles Económicos
                </h3>
                <div class="grid grid-cols-2 gap-6 bg-muted/20 p-6 rounded-2xl border border-border">
                   <div class="flex flex-col gap-1">
                      <span class="text-xs font-semibold text-muted">Sueldo Base</span>
                      <span class="text-xl font-bold text-card-foreground">{{ formatCurrency(empleado.sueldo_base) }}</span>
                   </div>
                   <div class="flex flex-col gap-1">
                      <span class="text-xs font-semibold text-muted">Comisión Cap. Activo</span>
                      <span class="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                        {{ empleado.comision_capital_activo ? `${empleado.comision_capital_activo}%` : '0%' }}
                      </span>
                   </div>
                   <div class="flex flex-col gap-1">
                      <span class="text-xs font-semibold text-muted">Combustible</span>
                      <span class="text-lg font-semibold text-card-foreground">{{ formatCurrency(empleado.combustible) }}</span>
                   </div>
                   <div class="flex flex-col gap-1 text-right">
                      <span class="text-xs font-semibold text-muted">Otros Ingresos</span>
                      <span class="text-lg font-semibold text-card-foreground font-mono">{{ formatCurrency(empleado.otros) }}</span>
                   </div>
                </div>
              </section>
            </div>
          </div>

          <!-- RUTAS TAB -->
          <div v-if="activeTab === 'rutas'" class="p-8">
            <div class="flex items-center justify-between mb-6">
              <h3 class="text-base font-bold text-card-foreground flex items-center gap-2">
                <Icon name="Map" :size="18" class="text-primary" />
                Hojas de Ruta
              </h3>
              <Button variant="default" size="sm" class="gap-2 shadow shadow-primary/20" @click="openNuevaRuta">
                <Icon name="Plus" :size="14" />
                Nueva Ruta
              </Button>
            </div>
            <div v-if="tabContent.rutas.loading" class="flex flex-col items-center justify-center py-20">
              <div class="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
              <p class="text-sm text-muted mt-4">Cargando rutas asignadas...</p>
            </div>
            <div v-else-if="tabContent.rutas.data.length === 0" class="text-center py-16">
               <Icon name="Map" :size="48" class="text-muted/30 mx-auto mb-4" />
               <p class="text-muted font-medium">No hay rutas asignadas a este colaborador</p>
               <p class="text-xs text-muted mt-1">Usa el botón "Nueva Ruta" para crear la primera.</p>
            </div>
            <div v-else class="space-y-4">
               <div v-for="hoja in tabContent.rutas.data" :key="hoja.id" class="border border-border p-4 rounded-xl hover:bg-muted/30 transition-colors">
                  <div class="flex items-center justify-between">
                     <span class="font-bold text-card-foreground">{{ hoja.nombre || `Hoja de Ruta #${hoja.id}` }}</span>
                     <div class="flex items-center gap-2">
                        <span :class="[
                          'text-xs px-2 py-1 rounded font-bold uppercase',
                          hoja.activa ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10' : 'bg-muted text-muted-foreground'
                        ]">{{ hoja.activa ? 'Activa' : 'Inactiva' }}</span>
                        <Button size="sm" variant="outline" class="h-7 w-7 p-0" @click="openEditarRuta(hoja)">
                          <Icon name="Pencil" :size="13" />
                        </Button>
                        <Button size="sm" variant="outline" class="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:border-red-300" @click="openEliminarRuta(hoja)">
                          <Icon name="Trash2" :size="13" />
                        </Button>
                     </div>
                  </div>
                  <div class="grid grid-cols-3 gap-4 mt-3 text-xs">
                     <div class="flex flex-col">
                        <span class="text-muted italic">Capital Activo</span>
                        <span class="font-bold font-mono">{{ formatCurrency(hoja.capital_activo) }}</span>
                     </div>
                     <div class="flex flex-col">
                        <span class="text-muted italic">Mora</span>
                        <span class="font-bold text-red-500 font-mono">{{ formatCurrency(hoja.mora) }}</span>
                     </div>
                     <div class="flex flex-col">
                        <span class="text-muted italic">Total Capital</span>
                        <span class="font-bold font-mono">{{ formatCurrency(hoja.total_capital) }}</span>
                     </div>
                  </div>
               </div>
            </div>
          </div>

          <!-- PAGOS TAB -->
          <div v-if="activeTab === 'pagos'" class="p-8">
            <!-- Tab header with Nueva Boleta button -->
            <div class="flex items-center justify-between mb-6">
              <h3 class="text-base font-bold text-card-foreground flex items-center gap-2">
                <Icon name="Wallet" :size="18" class="text-primary" />
                Boletas de Pago
              </h3>
              <Button variant="default" size="sm" class="gap-2 shadow shadow-primary/20" @click="openPaymentModal">
                <Icon name="Plus" :size="14" />
                Nueva Boleta
              </Button>
            </div>

            <div v-if="tabContent.pagos.loading" class="flex flex-col items-center justify-center py-20">
               <div class="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
               <p class="text-sm text-muted mt-4">Cargando historial de pagos...</p>
            </div>
            <div v-else-if="tabContent.pagos.data.length === 0" class="text-center py-16">
               <Icon name="Wallet" :size="48" class="text-muted/30 mx-auto mb-4" />
               <p class="text-muted font-medium">No hay historial de boletas de pago registradas</p>
               <p class="text-xs text-muted mt-1">Usa el botón "Nueva Boleta" para registrar el primer pago.</p>
            </div>
            <div v-else class="overflow-x-auto">
               <table class="w-full text-sm">
                  <thead>
                     <tr class="bg-muted/30 text-muted uppercase text-[10px] tracking-widest font-bold border-b border-border">
                        <th class="px-4 py-3 text-left">Fecha</th>
                        <th class="px-4 py-3 text-right">Sueldo Base</th>
                        <th class="px-4 py-3 text-right">Comisiones</th>
                        <th class="px-4 py-3 text-right">Combustible</th>
                        <th class="px-4 py-3 text-right">Descuento</th>
                        <th class="px-4 py-3 text-right">Total</th>
                        <th class="px-4 py-3 text-center">Acción</th>
                     </tr>
                  </thead>
                  <tbody class="divide-y divide-border">
                     <tr v-for="pago in tabContent.pagos.data" :key="pago.id" class="hover:bg-muted/20 transition-colors">
                        <td class="px-4 py-4 font-medium text-card-foreground">{{ formatDate(pago.fecha) }}</td>
                        <td class="px-4 py-4 text-right font-mono">{{ formatCurrency(pago.sueldo_base) }}</td>
                        <td class="px-4 py-4 text-right text-emerald-600 font-bold font-mono">{{ formatCurrency((pago.comision_clientes || 0) + (pago.comision_capital || 0)) }}</td>
                        <td class="px-4 py-4 text-right font-mono">{{ formatCurrency(pago.combustible) }}</td>
                        <td class="px-4 py-4 text-right text-red-500 font-medium font-mono">{{ formatCurrency(pago.descuento_mora) }}</td>
                        <td class="px-4 py-4 text-right font-black text-lg text-primary font-mono">{{ formatCurrency(pago.total) }}</td>
                        <td class="px-4 py-4 text-center">
                           <Button size="sm" variant="outline" class="h-8 w-8 p-0">
                             <Icon name="Download" :size="14" />
                           </Button>
                        </td>
                     </tr>
                  </tbody>
               </table>
            </div>
          </div>

          <!-- CÁLCULOS TAB -->
          <div v-if="activeTab === 'calculos'" class="p-8 animate-in fade-in">
            <div v-if="tabContent.rutas.loading" class="flex flex-col items-center justify-center py-20">
               <div class="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
               <p class="text-sm text-muted mt-4">Calculando comisiones...</p>
            </div>
            <div v-else-if="tabContent.rutas.data.length === 0" class="text-center py-20">
               <Icon name="Calculator" :size="48" class="text-muted/30 mx-auto mb-4" />
               <p class="text-muted font-medium">No hay datos de rutas para realizar cálculos</p>
            </div>
            <div v-else class="overflow-x-auto">
               <table class="w-full text-sm">
                  <thead>
                     <tr class="bg-muted/30 text-muted uppercase text-[10px] tracking-widest font-bold border-b border-border text-left">
                        <th class="px-4 py-3 italic">Hoja de Ruta</th>
                        <th class="px-4 py-3 text-right">Cap. Activo</th>
                        <th class="px-4 py-3 text-right">Comisión</th>
                        <th class="px-4 py-3 text-right">Mora Acum.</th>
                        <th class="px-4 py-3 text-right font-black">Total</th>
                     </tr>
                  </thead>
                  <tbody class="divide-y divide-border">
                     <tr v-for="hoja in tabContent.rutas.data" :key="hoja.id" class="hover:bg-muted/10 transition-colors">
                        <td class="px-4 py-4 font-bold text-card-foreground"># {{ hoja.id }} - {{ hoja.nombre || 'Sin nombre' }}</td>
                        <td class="px-4 py-4 text-right font-mono">{{ formatCurrency(hoja.capital_activo) }}</td>
                        <td class="px-4 py-4 text-right text-emerald-600 font-bold font-mono">{{ formatCurrency(hoja.comision) }}</td>
                        <td class="px-4 py-4 text-right text-red-500 font-medium font-mono">{{ formatCurrency(hoja.mora) }}</td>
                        <td class="px-4 py-4 text-right font-black font-mono text-primary">{{ formatCurrency(hoja.total_capital) }}</td>
                     </tr>
                  </tbody>
                  <tfoot>
                     <tr class="bg-primary/5 font-black text-primary border-t-2 border-primary/20">
                        <td class="px-4 py-4">TOTALES ACUMULADOS</td>
                        <td class="px-4 py-4 text-right">{{ formatCurrency(tabContent.rutas.data.reduce((acc, h) => acc + (h.capital_activo || 0), 0)) }}</td>
                        <td class="px-4 py-4 text-right">{{ formatCurrency(tabContent.rutas.data.reduce((acc, h) => acc + (h.comision || 0), 0)) }}</td>
                        <td class="px-4 py-4 text-right">{{ formatCurrency(tabContent.rutas.data.reduce((acc, h) => acc + (h.mora || 0), 0)) }}</td>
                        <td class="px-4 py-4 text-right text-lg underline decoration-double">{{ formatCurrency(tabContent.rutas.data.reduce((acc, h) => acc + (h.total_capital || 0), 0)) }}</td>
                     </tr>
                  </tfoot>
               </table>
            </div>
          </div>

          <!-- DOCUMENTOS TAB -->
          <div v-if="activeTab === 'documentos'" class="p-8 animate-in fade-in">
             <div class="flex flex-col items-center justify-center py-10 text-center border-2 border-dashed border-border rounded-3xl bg-muted/20">
                <div class="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-5 rotate-3">
                   <Icon name="FileText" :size="32" class="text-primary" />
                </div>
                <h4 class="text-xl font-bold text-card-foreground">Documentación del Colaborador</h4>
                <p class="text-sm text-muted max-w-sm mt-2 mb-8 text-balance px-4 italic font-serif">Gestión centralizada de expedientes, contratos e identificaciones para cumplimiento legal.</p>
                
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-xl px-6">
                   <div class="flex items-center gap-3 p-4 bg-card border border-border rounded-2xl shadow-sm hover:shadow-md transition-shadow group">
                      <div class="w-10 h-10 bg-blue-500/10 text-blue-500 flex items-center justify-center rounded-xl group-hover:scale-110 transition-transform">
                         <Icon name="User" :size="20" />
                      </div>
                      <div class="flex-1 text-left">
                         <div class="text-[11px] font-black text-card-foreground uppercase tracking-wider">Identificación (DPI)</div>
                         <div class="text-[10px] text-red-400 font-bold italic">Pendiente de subir</div>
                      </div>
                      <Icon name="PlusCircle" :size="20" class="text-primary cursor-pointer hover:scale-125 transition-transform" />
                   </div>
                   <div class="flex items-center gap-3 p-4 bg-card border border-border rounded-2xl shadow-sm opacity-60 grayscale group">
                      <div class="w-10 h-10 bg-amber-500/10 text-amber-500 flex items-center justify-center rounded-xl">
                         <Icon name="FileText" :size="20" />
                      </div>
                      <div class="flex-1 text-left">
                         <div class="text-[11px] font-black text-card-foreground uppercase tracking-wider">Contrato Laboral</div>
                         <div class="text-[10px] text-muted italic">Módulo de contratos próximamente</div>
                      </div>
                      <Icon name="Lock" :size="16" class="text-muted/50" />
                   </div>
                </div>
             </div>
          </div>

        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex flex-col items-center justify-center min-h-[400px]">
       <div class="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
       <p class="text-muted mt-4 animate-pulse">Cargando perfil del colaborador...</p>
    </div>

    <!-- Modal Editar Hoja de Ruta -->
    <div v-if="showEditarRutaModal && editarRutaTarget" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div class="bg-card w-full max-w-md rounded-2xl shadow-2xl border border-border overflow-hidden animate-in zoom-in-95 duration-200">
        <div class="px-6 py-5 border-b border-border flex items-center justify-between bg-muted/30">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Icon name="Pencil" :size="20" class="text-primary" />
            </div>
            <div>
              <h3 class="text-base font-bold text-card-foreground">Editar Hoja de Ruta</h3>
              <p class="text-xs text-muted">ID #{{ editarRutaTarget.id }}</p>
            </div>
          </div>
          <button @click="showEditarRutaModal = false" class="p-2 hover:bg-muted rounded-full transition-colors text-muted">
            <Icon name="X" :size="18" />
          </button>
        </div>

        <div class="p-6 space-y-4">
          <div class="space-y-2">
            <label class="block text-sm font-medium text-card-foreground">Nombre</label>
            <input
              v-model="editarRutaNombre"
              type="text"
              placeholder="Ej: Ruta Centro, Zona 1..."
              class="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none"
            />
          </div>
          <div class="space-y-2">
            <label class="block text-sm font-medium text-card-foreground">Estado</label>
            <select
              v-model="editarRutaActiva"
              class="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none"
            >
              <option :value="1">Activa</option>
              <option :value="0">Inactiva</option>
            </select>
          </div>
        </div>

        <div class="px-6 py-4 bg-muted/30 border-t border-border flex justify-end gap-2">
          <Button variant="outline" @click="showEditarRutaModal = false" :disabled="editarRutaSaving">Cancelar</Button>
          <Button @click="handleEditarRuta" :disabled="editarRutaSaving" class="gap-2">
            <Icon v-if="editarRutaSaving" name="Loader2" :size="14" class="animate-spin" />
            Guardar Cambios
          </Button>
        </div>
      </div>
    </div>

    <!-- Modal Confirmar Eliminar Hoja de Ruta -->
    <div v-if="showEliminarRutaModal && eliminarRutaTarget" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div class="bg-card w-full max-w-sm rounded-2xl shadow-2xl border border-border overflow-hidden animate-in zoom-in-95 duration-200">
        <div class="px-6 py-5 border-b border-border flex items-center justify-between bg-muted/30">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
              <Icon name="Trash2" :size="20" class="text-red-500" />
            </div>
            <h3 class="text-base font-bold text-card-foreground">Eliminar Ruta</h3>
          </div>
          <button @click="showEliminarRutaModal = false" class="p-2 hover:bg-muted rounded-full transition-colors text-muted">
            <Icon name="X" :size="18" />
          </button>
        </div>

        <div class="p-6">
          <p class="text-sm text-card-foreground">
            ¿Eliminar <span class="font-bold">{{ eliminarRutaTarget.nombre || `Ruta #${eliminarRutaTarget.id}` }}</span>?
          </p>
          <p class="text-xs text-muted mt-2">Esta acción no se puede deshacer.</p>
        </div>

        <div class="px-6 py-4 bg-muted/30 border-t border-border flex justify-end gap-2">
          <Button variant="outline" @click="showEliminarRutaModal = false" :disabled="eliminarRutaSaving">Cancelar</Button>
          <Button variant="outline" @click="handleEliminarRuta" :disabled="eliminarRutaSaving" class="gap-2 border-destructive text-destructive hover:bg-destructive/10">
            <Icon v-if="eliminarRutaSaving" name="Loader2" :size="14" class="animate-spin" />
            Eliminar
          </Button>
        </div>
      </div>
    </div>

    <!-- Modal Nueva Hoja de Ruta -->
    <div v-if="showNuevaRutaModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div class="bg-card w-full max-w-md rounded-2xl shadow-2xl border border-border overflow-hidden animate-in zoom-in-95 duration-200">
        <div class="px-6 py-5 border-b border-border flex items-center justify-between bg-muted/30">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Icon name="Map" :size="20" class="text-primary" />
            </div>
            <div>
              <h3 class="text-base font-bold text-card-foreground">Nueva Hoja de Ruta</h3>
              <p class="text-xs text-muted">
                Promotor: {{ empleado?.persona ? `${empleado.persona.nombre} ${empleado.persona.apellido}` : empleado?.name }}
              </p>
            </div>
          </div>
          <button @click="showNuevaRutaModal = false" class="p-2 hover:bg-muted rounded-full transition-colors text-muted">
            <Icon name="X" :size="18" />
          </button>
        </div>

        <div class="p-6">
          <div class="space-y-2">
            <label class="block text-sm font-medium text-card-foreground">Nombre de la ruta <span class="text-muted">(opcional)</span></label>
            <input
              v-model="nuevaRutaNombre"
              type="text"
              placeholder="Ej: Ruta Centro, Zona 1..."
              class="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none"
              @keyup.enter="handleCrearRuta"
            />
            <p class="text-xs text-muted">Si no se ingresa nombre, se usará "Ruta #ID" automáticamente.</p>
          </div>
        </div>

        <div class="px-6 py-4 bg-muted/30 border-t border-border flex justify-end gap-2">
          <Button variant="outline" @click="showNuevaRutaModal = false" :disabled="nuevaRutaSaving">Cancelar</Button>
          <Button @click="handleCrearRuta" :disabled="nuevaRutaSaving" class="gap-2">
            <Icon v-if="nuevaRutaSaving" name="Loader2" :size="14" class="animate-spin" />
            Crear Ruta
          </Button>
        </div>
      </div>
    </div>

    <Footer />
  </div>
</template>
