<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { usuariosService, type Rol, type Agencia } from "@/services/usuariosService";
import Footer from "@/components/Footer.vue";
import Icon from "@/components/Icon.vue";
import { Button } from "@/components/ui/button";
import { push } from "notivue";

const route = useRoute();
const router = useRouter();
const empleadoId = route.params.id as string;

const loading = ref(true);
const saving = ref(false);
const roles = ref<Rol[]>([]);
const agencias = ref<Agencia[]>([]);

const form = ref({
  nombre: "",
  apellido: "",
  email: "",
  username: "",
  dni: "", // Changed to dpi if that's what backend uses
  celular1: "",
  domicilio: "",
  rol_id: null as number | null,
  agencia_id: null as number | null,
  sueldo_base: 0,
  comision_capital_activo: 0,
  comision_cliente_nuevo: 0,
  combustible: 0,
  descuento_mora: 0,
  otros: 0,
  estado: 1,
});

const loadData = async () => {
  loading.value = true;
  try {
    const [emp, rls, ags] = await Promise.all([
      usuariosService.getById(empleadoId),
      usuariosService.getRoles(),
      usuariosService.getAgencias(),
    ]);
    
    roles.value = rls;
    agencias.value = ags;
    
    // Map data to form
    form.value = {
      nombre: emp.persona?.nombre || "",
      apellido: emp.persona?.apellido || "",
      email: emp.email,
      username: emp.name,
      dni: emp.persona?.dpi || "",
      celular1: emp.persona?.celular1 || "",
      domicilio: emp.persona?.domicilio || "",
      rol_id: emp.roles?.[0]?.id || null,
      agencia_id: emp.agencia_id,
      sueldo_base: emp.sueldo_base || 0,
      comision_capital_activo: emp.comision_capital_activo || 0,
      comision_cliente_nuevo: emp.comision_cliente_nuevo || 0,
      combustible: emp.combustible || 0,
      descuento_mora: emp.descuento_mora || 0,
      otros: emp.otros || 0,
      estado: emp.estado,
    };
  } catch (error) {
    console.error("Error loading employee data:", error);
    push.error("No se pudo cargar la información para editar");
    router.push({ name: "empleados" });
  } finally {
    loading.value = false;
  }
};

onMounted(loadData);

const handleUpdate = async () => {
  saving.value = true;
  try {
    // API expects dpi instead of dni
    const payload = { ...form.value, dpi: form.value.dni };
    await usuariosService.update(empleadoId, payload);
    push.success("Empleado actualizado exitosamente");
    router.push({ name: "empleadoDetalle", params: { id: empleadoId } });
  } catch (error: any) {
    push.error(error.response?.data?.detail || "Error al actualizar empleado");
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <div class="space-y-6 mt-2 mb-10 pb-10">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-extrabold text-card-foreground">Editar Empleado</h2>
        <p class="text-sm text-muted mt-1">Actualiza la información del colaborador en el sistema</p>
      </div>
      <Button variant="outline" class="gap-2" @click="router.back()">
        <Icon name="ArrowLeft" :size="16" />
        Volver
      </Button>
    </div>

    <div v-if="loading" class="flex flex-col items-center justify-center py-20 bg-card border border-border rounded-2xl">
       <div class="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
       <p class="text-muted mt-4">Cargando datos del empleado...</p>
    </div>

    <form v-else @submit.prevent="handleUpdate" class="grid grid-cols-12 gap-6">
      <!-- MAIN DATA -->
      <div class="col-span-12 lg:col-span-8 space-y-6">
        <div class="bg-card border border-border rounded-2xl p-7 shadow-sm">
           <h3 class="text-lg font-bold text-card-foreground mb-6 flex items-center gap-2 border-b border-border pb-4">
              <Icon name="User" :size="20" class="text-primary" /> Datos Personales
           </h3>
           
           <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div class="space-y-2">
                 <label class="text-xs font-bold text-muted uppercase tracking-wider ml-1">Nombre</label>
                 <input v-model="form.nombre" type="text" required class="w-full px-4 py-3 rounded-xl border border-border bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm" />
              </div>
              <div class="space-y-2">
                 <label class="text-xs font-bold text-muted uppercase tracking-wider ml-1">Apellido</label>
                 <input v-model="form.apellido" type="text" required class="w-full px-4 py-3 rounded-xl border border-border bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm" />
              </div>
              <div class="space-y-2">
                 <label class="text-xs font-bold text-muted uppercase tracking-wider ml-1">DPI</label>
                 <input v-model="form.dni" type="text" class="w-full px-4 py-3 rounded-xl border border-border bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm font-mono" />
              </div>
              <div class="space-y-2">
                 <label class="text-xs font-bold text-muted uppercase tracking-wider ml-1">Teléfono / Celular</label>
                 <input v-model="form.celular1" type="text" class="w-full px-4 py-3 rounded-xl border border-border bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm" />
              </div>
              <div class="col-span-1 md:col-span-2 space-y-2">
                 <label class="text-xs font-bold text-muted uppercase tracking-wider ml-1">Dirección Completa</label>
                 <input v-model="form.domicilio" type="text" class="w-full px-4 py-3 rounded-xl border border-border bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm" />
              </div>
           </div>
        </div>

        <div class="bg-card border border-border rounded-2xl p-7 shadow-sm">
           <h3 class="text-lg font-bold text-card-foreground mb-6 flex items-center gap-2 border-b border-border pb-4">
              <Icon name="Shield" :size="20" class="text-primary" /> Cuenta y Roles
           </h3>
           
           <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div class="space-y-2">
                 <label class="text-xs font-bold text-muted uppercase tracking-wider ml-1">Nombre de Usuario</label>
                 <input v-model="form.username" type="text" required class="w-full px-4 py-3 rounded-xl border border-border bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm" />
              </div>
              <div class="space-y-2">
                 <label class="text-xs font-bold text-muted uppercase tracking-wider ml-1">Correo Electrónico</label>
                 <input v-model="form.email" type="email" required class="w-full px-4 py-3 rounded-xl border border-border bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm" />
              </div>
              <div class="space-y-2">
                 <label class="text-xs font-bold text-muted uppercase tracking-wider ml-1">Rol en el Sistema</label>
                 <select v-model="form.rol_id" class="w-full px-4 py-3 rounded-xl border border-border bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm appearance-none">
                    <option :value="null">Sin Rol</option>
                    <option v-for="rol in roles" :key="rol.id" :value="rol.id">{{ rol.nombre }}</option>
                 </select>
              </div>
              <div class="space-y-2">
                 <label class="text-xs font-bold text-muted uppercase tracking-wider ml-1">Agencia / Sucursal</label>
                 <select v-model="form.agencia_id" class="w-full px-4 py-3 rounded-xl border border-border bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm appearance-none">
                    <option :value="null">Sin Agencia</option>
                    <option v-for="age in agencias" :key="age.id" :value="age.id">{{ age.nombre }}</option>
                 </select>
              </div>
           </div>
        </div>
      </div>

      <!-- SIDEBAR DATA (FINANCES) -->
      <div class="col-span-12 lg:col-span-4 space-y-6">
         <div class="bg-card border border-border rounded-2xl p-7 shadow-sm bg-gradient-to-br from-card to-muted/10">
            <h3 class="text-lg font-bold text-card-foreground mb-6 flex items-center gap-2 border-b border-border pb-4">
              <Icon name="DollarSign" :size="20" class="text-emerald-500" /> Remuneraciones
           </h3>
           <div class="space-y-4">
              <div class="space-y-2">
                 <label class="text-xs font-bold text-muted uppercase tracking-wider ml-1">Sueldo Base (Q)</label>
                 <input v-model.number="form.sueldo_base" type="number" step="0.01" class="w-full px-4 py-3 rounded-xl border border-border bg-background focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all shadow-sm font-bold text-lg" />
              </div>
              <div class="space-y-2">
                 <label class="text-xs font-bold text-muted uppercase tracking-wider ml-1">Comisión % Cap. Activo</label>
                 <input v-model.number="form.comision_capital_activo" type="number" step="0.1" class="w-full px-4 py-3 rounded-xl border border-border bg-background focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all shadow-sm" />
              </div>
              <div class="space-y-2">
                 <label class="text-xs font-bold text-muted uppercase tracking-wider ml-1">Combustible (Q)</label>
                 <input v-model.number="form.combustible" type="number" step="0.01" class="w-full px-4 py-3 rounded-xl border border-border bg-background focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all shadow-sm" />
              </div>
              <div class="space-y-2 pt-2 border-t border-border mt-6">
                 <label class="text-xs font-bold text-muted uppercase tracking-wider ml-1">Estado Empleado</label>
                 <select v-model="form.estado" class="w-full px-4 py-3 rounded-xl border border-border bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm appearance-none">
                    <option :value="1">ACTIVO</option>
                    <option :value="0">INACTIVO / BAJA</option>
                 </select>
              </div>
           </div>
         </div>

         <div class="flex flex-col gap-3">
            <Button type="submit" variant="default" :disabled="saving" class="h-14 text-lg font-bold shadow-xl shadow-primary/20 gap-3">
               <Icon name="Save" :size="22" v-if="!saving" />
               <div v-else class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
               {{ saving ? 'Guardando Cambios...' : 'Guardar Información' }}
            </Button>
            <Button type="button" variant="outline" class="h-14 font-semibold" @click="router.back()">
               Cancelar
            </Button>
         </div>
      </div>
    </form>

    <Footer />
  </div>
</template>
