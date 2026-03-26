<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { clientesService, type Cliente } from "@/services/clientesService";
import Footer from "@/components/Footer.vue";
import Icon from "@/components/Icon.vue";
import { Button } from "@/components/ui/button";
import { push } from "notivue";

const route = useRoute();
const router = useRouter();
const clienteId = route.params.id as string;

const cliente = ref<Cliente | null>(null);
const loading = ref(true);

const loadCliente = async () => {
  try {
    cliente.value = await clientesService.getById(clienteId);
  } catch (error) {
    console.error("Error loading client:", error);
    push.error("No se pudo cargar la información del cliente.");
    router.push({ name: "clientes" });
  } finally {
    loading.value = false;
  }
};

onMounted(loadCliente);

const getInitials = () => {
  if (!cliente.value?.persona) return "??";
  return `${(cliente.value.persona.nombre || "?")[0]}${(cliente.value.persona.apellido || "?")[0]}`.toUpperCase();
};

const getStatusLabel = (id: number) => {
  const map: Record<number, string> = {
    1: 'Pendiente', 2: 'Examinada', 3: 'Aprobada',
    5: 'Activo', 9: 'Cancelado', 10: 'Morosa', 11: 'Rechazada'
  };
  return map[id] || 'Desconocido';
};

const getStatusBadgeClass = (id: number) => {
  const map: Record<number, string> = {
    1: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-500',
    2: 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-500',
    3: 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-500',
    5: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-500',
    9: 'bg-gray-100 text-gray-700 dark:bg-gray-500/10 dark:text-gray-500',
    10: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-500',
    11: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-500'
  };
  return `px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${map[id] || 'bg-muted text-muted-foreground'}`;
};

const getClassLabel = (id: number) => {
  const map: Record<number, string> = { 0: 'P', 1: 'A', 2: 'B', 3: 'C' };
  return map[id] || '?';
};

const getClassBadgeClass = (id: number) => {
  const map: Record<number, string> = {
    0: 'bg-emerald-500 text-white',
    1: 'bg-blue-500 text-white',
    2: 'bg-amber-500 text-white',
    3: 'bg-red-500 text-white'
  };
  return map[id] || 'bg-muted text-muted-foreground';
};
</script>

<template>
  <div class="grid grid-cols-12 mt-2 mb-6 gap-7">
    <!-- Header/Breadcrumbs -->
    <div class="col-span-12 flex items-center justify-between">
      <div class="flex items-center gap-2 text-sm text-muted">
        <router-link :to="{ name: 'clientes' }" class="hover:text-primary transition-colors">Clientes</router-link>
        <Icon name="ChevronRight" :size="14" />
        <span class="text-card-foreground font-medium">Detalle de Cliente</span>
      </div>
      <div class="flex gap-2">
        <Button variant="outline" @click="router.push({ name: 'clientes' })" size="sm" class="gap-2">
           <Icon name="ArrowLeft" :size="16" /> Volver
        </Button>
        <Button @click="router.push({ name: 'clienteEditar', params: { id: clienteId } })" size="sm" class="gap-2 bg-amber-500 hover:bg-amber-600">
           <Icon name="Pencil" :size="16" /> Editar
        </Button>
      </div>
    </div>

    <!-- Main Content -->
    <div class="col-span-12 lg:col-span-4">
      <!-- Profile Card -->
      <div class="rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
        <div v-if="loading" class="animate-pulse">
          <div class="w-24 h-24 rounded-full bg-muted mx-auto mb-4"></div>
          <div class="h-6 w-3/4 bg-muted mx-auto mb-2"></div>
          <div class="h-4 w-1/2 bg-muted mx-auto"></div>
        </div>
        <div v-else>
          <div class="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold mx-auto mb-4 border-4 border-background shadow-lg">
            {{ getInitials() }}
          </div>
          <h2 class="text-xl font-bold text-card-foreground">
            {{ cliente?.persona?.nombre }} {{ cliente?.persona?.apellido }}
          </h2>
          <p class="text-sm text-muted mt-1">{{ cliente?.empresa_trabajo || 'Sin empresa registrada' }}</p>
          
          <div class="mt-6 pt-6 border-t border-border grid grid-cols-2 gap-4 text-left">
            <div>
              <p class="text-[10px] font-bold text-muted uppercase tracking-wider">DPI / Cédula</p>
              <p class="text-sm font-medium text-card-foreground">{{ cliente?.persona?.dpi || '—' }}</p>
            </div>
            <div>
              <p class="text-[10px] font-bold text-muted uppercase tracking-wider">Teléfono</p>
              <p class="text-sm font-medium text-card-foreground">{{ cliente?.persona?.telefono || '—' }}</p>
            </div>
            <div>
              <p class="text-[10px] font-bold text-muted uppercase tracking-wider">Celular 1</p>
              <p class="text-sm font-medium text-card-foreground">{{ cliente?.persona?.celular1 || '—' }}</p>
            </div>
            <div>
              <p class="text-[10px] font-bold text-muted uppercase tracking-wider">Celular 2</p>
              <p class="text-sm font-medium text-card-foreground">{{ cliente?.persona?.celular2 || '—' }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Actions / Stats -->
      <div class="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h3 class="text-sm font-bold text-card-foreground mb-4">Información Adicional</h3>
        <div class="space-y-4">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600">
              <Icon name="Calendar" :size="16" />
            </div>
            <div>
              <p class="text-[10px] text-muted font-bold uppercase tracking-wider">Fecha de Ingreso</p>
              <p class="text-sm font-medium">{{ cliente?.fecha_ingreso || '—' }}</p>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <Icon name="DollarSign" :size="16" />
            </div>
            <div>
              <p class="text-[10px] text-muted font-bold uppercase tracking-wider">Salario estimado</p>
              <p class="text-sm font-medium">Q{{ cliente?.salario?.toLocaleString() || '0.00' }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="col-span-12 lg:col-span-8">
      <!-- Tabs / Detalle extendido -->
      <div class="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div class="border-b border-border bg-muted/20 px-6 py-4">
          <h3 class="font-bold text-card-foreground flex items-center gap-2">
            <Icon name="FileText" :size="18" class="text-primary" />
            Datos del Cliente
          </h3>
        </div>
        <div class="p-6">
          <div v-if="loading" class="space-y-4">
            <div v-for="i in 4" :key="i" class="h-12 w-full bg-muted animate-pulse rounded-lg"></div>
          </div>
          <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div class="space-y-6">
              <div>
                <label class="text-xs font-bold text-muted uppercase tracking-widest block mb-1">Estado Civil</label>
                <p class="text-card-foreground font-medium">{{ cliente?.estado_civil || '—' }}</p>
              </div>
              <div>
                <label class="text-xs font-bold text-muted uppercase tracking-widest block mb-1">Nacionalidad</label>
                <p class="text-card-foreground font-medium">{{ cliente?.nacionalidad || '—' }}</p>
              </div>
              <div>
                <label class="text-xs font-bold text-muted uppercase tracking-widest block mb-1">Actividad económica</label>
                <p class="text-card-foreground font-medium">{{ cliente?.actividad || '—' }}</p>
              </div>
              <div>
                <label class="text-xs font-bold text-muted uppercase tracking-widest block mb-1">Tipo de Casa</label>
                <p class="text-card-foreground font-medium">{{ cliente?.tipo_casa || '—' }}</p>
              </div>
              <div>
                <label class="text-xs font-bold text-muted uppercase tracking-widest block mb-1">No. de Hijos</label>
                <p class="text-card-foreground font-medium">{{ cliente?.no_hijos ?? '—' }}</p>
              </div>
            </div>
            <div class="space-y-6">
              <div>
                <label class="text-xs font-bold text-muted uppercase tracking-widest block mb-1">Domicilio</label>
                <p class="text-card-foreground font-medium">{{ cliente?.persona?.domicilio || '—' }}</p>
              </div>
              <div>
                <label class="text-xs font-bold text-muted uppercase tracking-widest block mb-1">Dirección de Cobro</label>
                <p class="text-card-foreground font-medium text-sm">{{ cliente?.direccion_cobrar || '—' }}</p>
              </div>
              <div>
                <label class="text-xs font-bold text-muted uppercase tracking-widest block mb-1">Empresa de Trabajo</label>
                <p class="text-card-foreground font-medium">{{ cliente?.empresa_trabajo || '—' }}</p>
              </div>
              <div>
                <label class="text-xs font-bold text-muted uppercase tracking-widest block mb-1">Tiempo trabajando</label>
                <p class="text-card-foreground font-medium">{{ cliente?.tiempo_trabajando || '—' }}</p>
              </div>
              <div>
                <label class="text-xs font-bold text-muted uppercase tracking-widest block mb-1">Nombre en recibo</label>
                <p class="text-card-foreground font-medium">{{ cliente?.nombre_recibo || '—' }}</p>
              </div>
            </div>
            <div class="col-span-full pt-4 border-t border-border">
              <label class="text-xs font-bold text-muted uppercase tracking-widest block mb-2">Observaciones</label>
              <div class="p-4 rounded-xl bg-muted/30 text-sm text-card-foreground min-h-[80px]">
                {{ cliente?.observaciones || 'Sin observaciones registradas.' }}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Listado de Préstamos del Cliente -->
      <div class="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm overflow-hidden">
        <div class="flex items-center justify-between mb-6">
           <h3 class="font-bold text-card-foreground">Historial de Préstamos</h3>
           <span class="text-xs font-bold px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground">
             {{ cliente?.prestamos?.length || 0 }} préstamos
           </span>
        </div>
        
        <div v-if="loading" class="space-y-3 py-4">
           <div v-for="i in 3" :key="i" class="h-16 w-full bg-muted animate-pulse rounded-xl"></div>
        </div>

        <div v-else-if="!cliente?.prestamos?.length" class="text-center py-12 flex flex-col items-center">
           <div class="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mb-4">
              <Icon name="Briefcase" :size="32" class="text-muted/50" />
           </div>
           <p class="text-sm text-muted font-medium">Aún no hay préstamos asociados a este cliente.</p>
           <Button variant="outline" size="sm" class="mt-4 gap-2">
             <Icon name="Plus" :size="16" /> Crear Primer Préstamo
           </Button>
        </div>

        <div v-else class="overflow-x-auto -mx-6">
           <table class="w-full text-sm text-left border-collapse">
             <thead>
               <tr class="bg-muted/30 text-muted uppercase text-[10px] tracking-widest font-bold">
                 <th class="px-6 py-3 border-b border-border">Código</th>
                 <th class="px-6 py-3 border-b border-border">Estado</th>
                 <th class="px-6 py-3 border-b border-border">Monto</th>
                 <th class="px-6 py-3 border-b border-border">Mora</th>
                 <th class="px-6 py-3 border-b border-border text-center">Clasif.</th>
                 <th class="px-6 py-3 border-b border-border text-right">Acciones</th>
               </tr>
             </thead>
             <tbody class="divide-y divide-border">
               <tr v-for="prestamo in cliente.prestamos" :key="prestamo.id" class="hover:bg-muted/20 transition-colors group">
                 <td class="px-6 py-4 font-bold text-card-foreground">Cre-{{ prestamo.id }}</td>
                 <td class="px-6 py-4">
                   <span :class="getStatusBadgeClass(prestamo.estado_p_id)">
                     {{ getStatusLabel(prestamo.estado_p_id) }}
                   </span>
                 </td>
                 <td class="px-6 py-4 font-semibold text-card-foreground">
                   Q{{ prestamo.monto?.toLocaleString() }}
                 </td>
                 <td class="px-6 py-4">
                   <span :class="[prestamo.mora > 0 ? 'text-red-500 font-bold' : 'text-muted']">
                     Q{{ prestamo.mora?.toLocaleString() }}
                   </span>
                 </td>
                 <td class="px-6 py-4 text-center">
                   <div :class="getClassBadgeClass(prestamo.clasificacion_id)" class="w-7 h-7 flex items-center justify-center rounded-lg mx-auto font-black text-xs">
                     {{ getClassLabel(prestamo.clasificacion_id) }}
                   </div>
                 </td>
                 <td class="px-6 py-4 text-right">
                   <Button variant="outline" size="sm" class="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity" @click="router.push({ name: 'prestamoDetalle', params: { id: prestamo.id } })">
                     <Icon name="Eye" :size="16" class="text-primary" />
                   </Button>
                 </td>
               </tr>
             </tbody>
           </table>
        </div>
      </div>
    </div>

    <Footer />
  </div>
</template>
