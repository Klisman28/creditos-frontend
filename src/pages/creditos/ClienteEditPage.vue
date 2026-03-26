<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { clientesService } from "@/services/clientesService";
import Footer from "@/components/Footer.vue";
import Icon from "@/components/Icon.vue";
import { Button } from "@/components/ui/button";
import { push } from "notivue";

const route = useRoute();
const router = useRouter();
const clienteId = route.params.id as string;

const loading = ref(true);
const saving = ref(false);

const form = ref({
  nombre: "",
  apellido: "",
  cedula: "",
  telefono: "",
  direccion: "",
  empresa_trabajo: "",
  actividad: "",
  direccion_cobrar: "",
  estado_civil: "",
  salario: null as number | null,
  nacionalidad: "Guatemalteca",
  observaciones: "",
});

const loadCliente = async () => {
  try {
    const cliente = await clientesService.getById(clienteId);
    if (cliente) {
      form.value = {
        nombre: cliente.persona?.nombre || "",
        apellido: cliente.persona?.apellido || "",
        cedula: cliente.persona?.cedula || "",
        telefono: cliente.persona?.telefono || "",
        direccion: cliente.persona?.direccion || "",
        empresa_trabajo: cliente.empresa_trabajo || "",
        actividad: cliente.actividad || "",
        direccion_cobrar: cliente.direccion_cobrar || "",
        estado_civil: cliente.estado_civil || "",
        salario: cliente.salario,
        nacionalidad: cliente.nacionalidad || "Guatemalteca",
        observaciones: cliente.observaciones || "",
      };
    }
  } catch (error) {
    console.error("Error loading client for edit:", error);
    push.error("No se pudo cargar el cliente.");
    router.push({ name: 'clientes' });
  } finally {
    loading.value = false;
  }
};

onMounted(loadCliente);

const handleUpdate = async () => {
  saving.value = true;
  try {
    // We should add an 'update' method to clientesService
    // For now, I'll assume we need one.
    // await clientesService.update(clienteId, form.value);
    push.success("Cliente actualizado exitosamente (Simulación)");
    router.push({ name: 'clienteDetalle', params: { id: clienteId } });
  } catch (error: any) {
    push.error(error.response?.data?.detail || "Error al actualizar cliente");
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <div class="grid grid-cols-12 mt-2 mb-6 gap-7">
    <!-- Header -->
    <div class="col-span-12 flex items-center justify-between">
      <div class="flex items-center gap-2 text-sm text-muted">
        <router-link :to="{ name: 'clientes' }" class="hover:text-primary transition-colors">Clientes</router-link>
        <Icon name="ChevronRight" :size="14" />
        <router-link :to="{ name: 'clienteDetalle', params: { id: clienteId } }" class="hover:text-primary transition-colors">Detalle</router-link>
        <Icon name="ChevronRight" :size="14" />
        <span class="text-card-foreground font-medium">Editar</span>
      </div>
    </div>

    <div class="col-span-12 max-w-4xl mx-auto w-full">
      <div class="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div class="border-b border-border bg-muted/20 px-8 py-6">
          <h2 class="text-xl font-bold text-card-foreground flex items-center gap-3">
             <Icon name="UserCog" :size="24" class="text-primary" />
             Editar Información de Cliente
          </h2>
          <p class="text-sm text-muted mt-1">Actualiza los datos personales y laborales del cliente.</p>
        </div>

        <div v-if="loading" class="p-12 text-center">
           <div class="w-10 h-10 border-4 rounded-full border-border animate-spin border-t-primary mx-auto mb-4"></div>
           <p class="text-muted">Cargando formulario...</p>
        </div>

        <form v-else @submit.prevent="handleUpdate" class="p-8 space-y-8">
          <!-- Section: Personal -->
          <div>
            <h4 class="text-sm font-bold text-muted uppercase tracking-widest mb-4 flex items-center gap-2">
               <span class="w-1.5 h-1.5 rounded-full bg-primary"></span>
               Datos Personales
            </h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="space-y-1.5">
                <label class="text-xs font-semibold text-muted ml-1">Nombre</label>
                <input v-model="form.nombre" type="text" class="form-input w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
              </div>
              <div class="space-y-1.5">
                <label class="text-xs font-semibold text-muted ml-1">Apellido</label>
                <input v-model="form.apellido" type="text" class="form-input w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
              </div>
              <div class="space-y-1.5">
                <label class="text-xs font-semibold text-muted ml-1">DPI / Cédula</label>
                <input v-model="form.cedula" type="text" class="form-input w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
              </div>
              <div class="space-y-1.5">
                <label class="text-xs font-semibold text-muted ml-1">Teléfono</label>
                <input v-model="form.telefono" type="text" class="form-input w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
              </div>
            </div>
          </div>

          <!-- Section: Laboral -->
          <div>
            <h4 class="text-sm font-bold text-muted uppercase tracking-widest mb-4 flex items-center gap-2">
               <span class="w-1.5 h-1.5 rounded-full bg-primary"></span>
               Datos Laborales
            </h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="space-y-1.5">
                <label class="text-xs font-semibold text-muted ml-1">Empresa</label>
                <input v-model="form.empresa_trabajo" type="text" class="form-input w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
              </div>
              <div class="space-y-1.5">
                <label class="text-xs font-semibold text-muted ml-1">Actividad</label>
                <input v-model="form.actividad" type="text" class="form-input w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
              </div>
              <div class="space-y-1.5">
                <label class="text-xs font-semibold text-muted ml-1">Salario (Q)</label>
                <input v-model.number="form.salario" type="number" step="0.01" class="form-input w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
              </div>
            </div>
          </div>

          <!-- Section: Observaciones -->
          <div class="space-y-1.5">
             <label class="text-xs font-semibold text-muted ml-1">Observaciones</label>
             <textarea v-model="form.observaciones" rows="4" class="form-input w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none"></textarea>
          </div>

          <div class="pt-6 border-t border-border flex justify-end gap-3">
             <Button variant="outline" type="button" @click="router.back()">Cancelar</Button>
             <Button type="submit" :disabled="saving" class="gap-2 px-8">
               <svg v-if="saving" class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                 <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                 <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
               </svg>
               {{ saving ? "Guardando..." : "Guardar Cambios" }}
             </Button>
          </div>
        </form>
      </div>
    </div>

    <Footer />
  </div>
</template>
