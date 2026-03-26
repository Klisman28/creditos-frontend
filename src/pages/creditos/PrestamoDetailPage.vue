<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import apiClient from "@/apiClient";
import Footer from "@/components/Footer.vue";
import Icon from "@/components/Icon.vue";
import { Button } from "@/components/ui/button";
import { push } from "notivue";

const route = useRoute();
const router = useRouter();
const prestamoId = route.params.id as string;

const activeTab = ref("ficha");
const loading = ref(true);
const prestamo = ref<any>(null);

const tabs = [
  { id: "ficha", label: "Ficha", icon: "FileText" },
  { id: "informacion", label: "Información", icon: "Info" },
  { id: "pagos", label: "Pagos", icon: "History" },
  { id: "documento", label: "Documento", icon: "File" },
  { id: "compromiso", label: "Compromiso", icon: "CheckSquare" },
  { id: "imagenes", label: "Imágenes", icon: "Image" },
];

const loadPrestamo = async () => {
  loading.value = true;
  try {
    const response = await apiClient.get(`/prestamos/${prestamoId}`);
    prestamo.value = response.data;
  } catch (error) {
    console.error("Error loading loan detail:", error);
    push.error("No se pudo cargar el detalle del préstamo.");
    // router.push({ name: 'prestamos' });
  } finally {
    loading.value = false;
  }
};

onMounted(loadPrestamo);

const formatMoney = (val: number | null | undefined) => {
  return `Q${(val || 0).toLocaleString("es-GT", { minimumFractionDigits: 2 })}`;
};

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return "—";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("es-GT", { day: "2-digit", month: "short", year: "numeric" });
};

const getFichaStatusLabel = (id: number) => {
  const map: Record<number, string> = {
    0: 'Pendiente', 1: 'Pagado', 2: 'No Pagado',
    3: 'Pago parcial', 4: 'Adelantado', 5: 'Parcial Adelantado'
  };
  return map[id] || 'Pendiente';
};

const getFichaStatusBadgeClass = (id: number) => {
  const map: Record<number, string> = {
    0: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-500',
    1: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-500',
    2: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-500',
    3: 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-500',
    4: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-500',
    5: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-500'
  };
  return `px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${map[id] || 'bg-muted text-muted-foreground'}`;
};
</script>

<template>
  <div class="grid grid-cols-12 mt-2 mb-6 gap-7">
    <!-- Header -->
    <div class="col-span-12 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div class="flex items-center gap-2 text-sm text-muted">
        <router-link :to="{ name: 'prestamos' }" class="hover:text-primary transition-colors">Préstamos</router-link>
        <Icon name="ChevronRight" :size="14" />
        <span class="text-card-foreground font-medium">Crédito #{{ prestamoId }}</span>
      </div>
      <div class="flex gap-2">
        <Button variant="outline" size="sm" @click="router.back()">
          <Icon name="ArrowLeft" :size="16" class="mr-2" /> Volver
        </Button>
        <Button size="sm" class="bg-emerald-500 hover:bg-emerald-600">
           <Icon name="Receipt" :size="16" class="mr-2" /> Pagar Cuota
        </Button>
      </div>
    </div>

    <!-- Loan Summary Banner -->
    <div class="col-span-12">
      <div class="rounded-2xl border border-border bg-card p-6 shadow-sm overflow-hidden relative">
        <div class="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        <div class="relative flex flex-col md:flex-row md:items-center gap-6">
          <div class="flex items-center gap-4">
            <div class="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <Icon name="Wallet" :size="32" />
            </div>
            <div>
              <h1 class="text-2xl font-bold text-card-foreground">Préstamo #{{ prestamoId }}</h1>
              <p class="text-sm text-muted" v-if="prestamo">
                Cliente: <router-link :to="{ name: 'clienteDetalle', params: { id: prestamo.cliente?.id } }" class="font-bold text-primary hover:underline">
                  {{ prestamo.cliente?.persona?.nombre }} {{ prestamo.cliente?.persona?.apellido }}
                </router-link>
              </p>
            </div>
          </div>
          
          <div class="flex flex-wrap gap-8 md:ml-auto" v-if="prestamo">
            <div class="text-center md:text-left">
              <p class="text-[10px] font-bold text-muted uppercase tracking-widest">Monto Original</p>
              <p class="text-lg font-bold text-card-foreground">{{ formatMoney(prestamo.monto) }}</p>
            </div>
            <div class="text-center md:text-left">
              <p class="text-[10px] font-bold text-muted uppercase tracking-widest">Saldo Actual</p>
              <p class="text-lg font-bold text-primary">{{ formatMoney(prestamo.saldo) }}</p>
            </div>
            <div class="text-center md:text-left">
              <p class="text-[10px] font-bold text-muted uppercase tracking-widest">Cuotas</p>
              <p class="text-lg font-bold text-emerald-600">
                {{ prestamo.pagos?.length || 0 }} / {{ prestamo.fichas_pago?.length || 0 }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tabs Navigation -->
    <div class="col-span-12">
      <div class="flex gap-1 bg-muted/30 p-1 rounded-xl w-full max-w-4xl mx-auto overflow-x-auto no-scrollbar border border-border">
        <button
          v-for="tab in tabs" :key="tab.id"
          @click="activeTab = tab.id"
          :class="['flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap',
            activeTab === tab.id ? 'bg-card text-primary shadow-sm border border-border' : 'text-muted hover:text-card-foreground']"
        >
          <Icon :name="tab.icon" :size="16" />
          {{ tab.label }}
        </button>
      </div>
    </div>

    <!-- Tab Content -->
    <div class="col-span-12">
      <div class="min-h-[400px]">
        <div v-if="loading" class="flex flex-col items-center justify-center py-20">
          <div class="w-12 h-12 border-4 rounded-full border-border animate-spin border-t-primary mb-4"></div>
          <p class="text-sm text-muted font-medium">Cargando información detallada...</p>
        </div>
        
        <div v-else class="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300 pb-10">
          
          <!-- Tab: Ficha -->
          <div v-if="activeTab === 'ficha'" class="space-y-6">
            <div class="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
              <div class="p-6 border-b border-border flex items-center justify-between bg-muted/5">
                <h3 class="font-bold text-card-foreground">Ficha de Pago / Calendario de Cuotas</h3>
                <Button variant="outline" size="sm" class="gap-2">
                   <Icon name="Printer" :size="14" /> Imprimir Ficha
                </Button>
              </div>
              <div class="overflow-x-auto">
                <table class="w-full text-sm border-collapse">
                  <thead>
                    <tr class="bg-muted/30 border-b border-border text-[10px] uppercase text-muted font-bold tracking-widest">
                      <th class="px-6 py-4 text-left border-b border-border">No. Día</th>
                      <th class="px-6 py-4 text-left border-b border-border">Fecha Programada</th>
                      <th class="px-6 py-4 text-right border-b border-border">Cuota</th>
                      <th class="px-6 py-4 text-right border-b border-border">Mora</th>
                      <th class="px-6 py-4 text-center border-b border-border">Estado</th>
                      <th class="px-6 py-4 text-right border-b border-border">Total</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-border">
                    <tr v-if="!prestamo.fichas_pago?.length">
                      <td colspan="6" class="px-6 py-12 text-center text-muted italic">
                         No hay fichas de pago generadas para este crédito.
                      </td>
                    </tr>
                    <tr v-for="ficha in prestamo.fichas_pago" :key="ficha.id" class="hover:bg-muted/10 transition-colors">
                       <td class="px-6 py-4 font-bold text-card-foreground border-b border-border/50">{{ ficha.no_dia }}</td>
                       <td class="px-6 py-4 font-medium border-b border-border/50">{{ formatDate(ficha.fecha) }}</td>
                       <td class="px-6 py-4 text-right border-b border-border/50">{{ formatMoney(ficha.cuota) }}</td>
                       <td class="px-6 py-4 text-right border-b border-border/50">
                         <span :class="[ficha.mora > 0 ? 'text-red-500 font-bold' : 'text-muted']">
                           {{ formatMoney(ficha.mora) }}
                         </span>
                       </td>
                       <td class="px-6 py-4 text-center border-b border-border/50">
                         <span :class="getFichaStatusBadgeClass(ficha.estado || 0)">
                           {{ getFichaStatusLabel(ficha.estado || 0) }}
                         </span>
                       </td>
                       <td class="px-6 py-4 text-right font-bold text-primary border-b border-border/50">
                         {{ formatMoney(ficha.total || ficha.cuota) }}
                       </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- Tab: Información -->
          <div v-if="activeTab === 'informacion'" class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h3 class="font-bold text-card-foreground mb-6 flex items-center gap-2 border-b border-border pb-4">
                <Icon name="User" :size="18" class="text-primary" /> Datos del Cliente
              </h3>
              <div class="space-y-4 text-left">
                <div v-for="item in [
                  { label: 'Nombre Completo', value: `${prestamo.cliente?.persona?.nombre} ${prestamo.cliente?.persona?.apellido}` },
                  { label: 'DPI / Cédula', value: prestamo.cliente?.persona?.cedula },
                  { label: 'Teléfono', value: prestamo.cliente?.persona?.telefono },
                  { label: 'Dirección Comercial', value: prestamo.cliente?.direccion_cobrar },
                  { label: 'Dirección Personal', value: prestamo.cliente?.persona?.domicilio || prestamo.cliente?.persona?.direccion },
                ]" :key="item.label">
                  <p class="text-[10px] font-bold text-muted uppercase tracking-widest">{{ item.label }}</p>
                  <p class="text-sm font-medium text-card-foreground">{{ item.value || '—' }}</p>
                </div>
              </div>
            </div>
            <div class="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h3 class="font-bold text-card-foreground mb-6 flex items-center gap-2 border-b border-border pb-4">
                <Icon name="Briefcase" :size="18" class="text-primary" /> Detalles del Crédito
              </h3>
              <div class="space-y-4 text-left">
                <div v-for="item in [
                  { label: 'Tipo de Préstamo', value: prestamo.tipo === 1 ? 'Normal' : 'Especial' },
                  { label: 'Clasificación', value: prestamo.clasificacion_id === 0 ? 'Normal (P)' : String.fromCharCode(64 + prestamo.clasificacion_id) },
                  { label: 'Plan de Pago', value: prestamo.plan?.nombre || '—' },
                  { label: 'Interés Total', value: formatMoney(prestamo.interes) },
                  { label: 'Mora Acumulada', value: formatMoney(prestamo.mora) },
                  { label: 'Fecha Inicio', value: formatDate(prestamo.fecha_inicio) },
                  { label: 'Fecha Fin', value: formatDate(prestamo.fecha_fin) },
                  { label: 'Fecha de Desembolso', value: formatDate(prestamo.fecha_desembolso) },
                ]" :key="item.label">
                  <p class="text-[10px] font-bold text-muted uppercase tracking-widest">{{ item.label }}</p>
                  <p class="text-sm font-medium text-card-foreground">{{ item.value || '—' }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Tab: Pagos -->
          <div v-if="activeTab === 'pagos'" class="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
             <div class="p-6 border-b border-border flex items-center justify-between bg-muted/5">
                <h3 class="font-bold text-card-foreground">Historial de Pagos Realizados</h3>
             </div>
             <div class="overflow-x-auto">
                <table class="w-full text-sm border-collapse">
                  <thead>
                     <tr class="bg-muted/30 border-b border-border text-[10px] uppercase text-muted font-bold tracking-widest">
                        <th class="px-6 py-4 text-left border-b border-border">Fecha Pago</th>
                        <th class="px-6 py-4 text-left border-b border-border">Descripción</th>
                        <th class="px-6 py-4 text-right border-b border-border">Capital</th>
                        <th class="px-6 py-4 text-right border-b border-border">Interés</th>
                        <th class="px-6 py-4 text-right border-b border-border">Mora</th>
                        <th class="px-6 py-4 text-right border-b border-border font-bold">Total</th>
                     </tr>
                  </thead>
                  <tbody class="divide-y divide-border">
                     <tr v-if="!prestamo.pagos?.length">
                        <td colspan="6" class="px-6 py-12 text-center text-muted italic">
                           No se han registrado pagos para este crédito aún.
                        </td>
                     </tr>
                     <tr v-for="pago in prestamo.pagos" :key="pago.id" class="hover:bg-muted/10 transition-colors">
                        <td class="px-6 py-4 font-medium border-b border-border/50">{{ formatDate(pago.created_at || pago.fecha) }}</td>
                        <td class="px-6 py-4 text-xs text-muted border-b border-border/50">{{ pago.descripcion || 'Pago regular' }}</td>
                        <td class="px-6 py-4 text-right font-medium border-b border-border/50">{{ formatMoney(pago.capital) }}</td>
                        <td class="px-6 py-4 text-right font-medium border-b border-border/50">{{ formatMoney(pago.interes) }}</td>
                        <td class="px-6 py-4 text-right text-red-500 font-medium border-b border-border/50">{{ formatMoney(pago.mora) }}</td>
                        <td class="px-6 py-4 text-right font-bold text-primary border-b border-border/50">{{ formatMoney(pago.monto) }}</td>
                     </tr>
                  </tbody>
                </table>
             </div>
          </div>

          <!-- Tab: Documento & Compromiso (Files) -->
          <div v-if="activeTab === 'documento' || activeTab === 'compromiso'" class="grid grid-cols-1 md:grid-cols-3 gap-6">
             <div class="rounded-2xl border border-border bg-card p-8 text-center flex flex-col items-center justify-center">
                <Icon name="FileText" :size="48" class="text-muted mb-4" />
                <h4 class="font-bold text-card-foreground">Documento de Solicitud</h4>
                <p class="text-xs text-muted mt-2 mb-6">Visualiza o descarga el documento original firmado.</p>
                <Button variant="outline" class="w-full gap-2">
                   <Icon name="Download" :size="16" /> Descargar PDF
                </Button>
             </div>
             <div class="rounded-2xl border border-border bg-card p-8 text-center flex flex-col items-center justify-center">
                <Icon name="Printer" :size="48" class="text-muted mb-4" />
                <h4 class="font-bold text-card-foreground">Ficha de Pago</h4>
                <p class="text-xs text-muted mt-2 mb-6">Genera la ficha impresa para el cliente.</p>
                <Button variant="outline" class="w-full gap-2">
                   <Icon name="Printer" :size="16" /> Imprimir
                </Button>
             </div>
          </div>

           <!-- Tab: Imágenes -->
          <div v-if="activeTab === 'imagenes'" class="grid grid-cols-2 md:grid-cols-4 gap-4">
             <div v-for="img in [
               { label: 'Foto DPI', src: 'https://via.placeholder.com/300x200?text=DPI' },
               { label: 'Foto Casa', src: 'https://via.placeholder.com/300x200?text=Casa' },
               { label: 'Foto Negocio', src: 'https://via.placeholder.com/300x200?text=Negocio' },
             ]" :key="img.label" class="rounded-2xl border border-border bg-card p-2 shadow-sm overflow-hidden group">
                <div class="aspect-video relative rounded-xl overflow-hidden mb-2">
                   <img :src="img.src" class="w-full h-full object-cover transition-transform group-hover:scale-110" />
                   <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <Button size="sm" variant="outline" class="h-8 w-8 p-0 rounded-full text-white border-white hover:bg-white/20">
                         <Icon name="Maximize" :size="14" />
                      </Button>
                   </div>
                </div>
                <p class="text-[10px] font-bold text-muted uppercase text-center py-1">{{ img.label }}</p>
             </div>
          </div>

        </div>
      </div>
    </div>

    <Footer />
  </div>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
</style>
