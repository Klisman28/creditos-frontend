<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { prestamosService } from "@/services/prestamosService";
import Footer from "@/components/Footer.vue";
import Icon from "@/components/Icon.vue";
import { Button } from "@/components/ui/button";
import { push } from "notivue";

interface FechaDescanso {
  id: number;
  fecha: string;
  descripcion: string | null;
}

const fechas = ref<FechaDescanso[]>([]);
const loading = ref(true);
const saving = ref(false);
const showDeleteModal = ref(false);
const deletingFecha = ref<FechaDescanso | null>(null);

// Form
const newFecha = ref({
  fecha: new Date().toISOString().slice(0, 10),
  descripcion: "",
});

const loadFechas = async () => {
  loading.value = true;
  try {
    fechas.value = await prestamosService.getFechasDescanso();
  } catch (error) {
    push.error("Error al cargar fechas de descanso");
  } finally {
    loading.value = false;
  }
};

onMounted(loadFechas);

const handleCreate = async () => {
  if (!newFecha.value.fecha) {
    push.warning("Selecciona una fecha");
    return;
  }
  saving.value = true;
  try {
    await prestamosService.createFechaDescanso(newFecha.value);
    push.success("Fecha de descanso creada exitosamente");
    newFecha.value = {
      fecha: new Date().toISOString().slice(0, 10),
      descripcion: "",
    };
    await loadFechas();
  } catch (error: any) {
    push.error(error.response?.data?.detail || "Error al crear fecha de descanso");
  } finally {
    saving.value = false;
  }
};

const openDeleteModal = (fecha: FechaDescanso) => {
  deletingFecha.value = fecha;
  showDeleteModal.value = true;
};

const handleDelete = async () => {
  if (!deletingFecha.value) return;
  try {
    await prestamosService.deleteFechaDescanso(deletingFecha.value.id);
    push.success("Fecha eliminada exitosamente");
    showDeleteModal.value = false;
    deletingFecha.value = null;
    await loadFechas();
  } catch (error: any) {
    push.error(error.response?.data?.detail || "Error al eliminar fecha");
  }
};

const formatDate = (d: string) => {
  return new Date(d + "T00:00:00").toLocaleDateString("es-GT", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
  });
};

const formatDateShort = (d: string) => {
  return new Date(d + "T00:00:00").toLocaleDateString("es-GT", {
    day: "2-digit", month: "short", year: "numeric",
  });
};

// Upcoming vs past
const upcoming = computed(() =>
  fechas.value.filter((f) => new Date(f.fecha) >= new Date(new Date().toISOString().slice(0, 10)))
);
const past = computed(() =>
  fechas.value.filter((f) => new Date(f.fecha) < new Date(new Date().toISOString().slice(0, 10)))
);
</script>

<template>
  <div class="grid grid-cols-12 mt-2 mb-6 gap-7">
    <!-- Header -->
    <div class="col-span-12">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 class="text-2xl font-bold text-card-foreground">Fechas de Descanso</h2>
          <p class="text-sm text-muted mt-1">Gestión de días feriados y fechas especiales sin cobro</p>
        </div>
      </div>
    </div>

    <!-- Summary Stats -->
    <div class="col-span-12 sm:col-span-6 lg:col-span-4">
      <div class="rounded-xl border border-border bg-card p-6 relative overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
        <div class="bg-blue-500/10 absolute -top-8 -right-8 w-32 h-32 rounded-full blur-2xl pointer-events-none"></div>
        <div class="relative flex flex-col h-full gap-3">
          <div class="flex items-center justify-between">
            <div class="bg-gradient-to-br from-blue-500 to-indigo-600 w-10 h-10 rounded-xl flex items-center justify-center shadow-md shrink-0">
              <Icon name="Calendar" :size="18" class="text-white" />
            </div>
          </div>
          <div>
            <p class="text-[11px] font-bold text-muted uppercase tracking-widest mb-1">Total Fechas</p>
            <h3 class="text-2xl font-extrabold text-card-foreground leading-tight">{{ fechas.length }}</h3>
            <p class="text-xs text-muted mt-auto pt-1">Fechas registradas en el sistema</p>
          </div>
        </div>
      </div>
    </div>

    <div class="col-span-12 sm:col-span-6 lg:col-span-4">
      <div class="rounded-xl border border-border bg-card p-6 relative overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
        <div class="bg-emerald-500/10 absolute -top-8 -right-8 w-32 h-32 rounded-full blur-2xl pointer-events-none"></div>
        <div class="relative flex flex-col h-full gap-3">
          <div class="flex items-center justify-between">
            <div class="bg-gradient-to-br from-emerald-500 to-teal-600 w-10 h-10 rounded-xl flex items-center justify-center shadow-md shrink-0">
              <Icon name="CalendarCheck" :size="18" class="text-white" />
            </div>
          </div>
          <div>
            <p class="text-[11px] font-bold text-muted uppercase tracking-widest mb-1">Próximas</p>
            <h3 class="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 leading-tight">{{ upcoming.length }}</h3>
            <p class="text-xs text-muted mt-auto pt-1">Fechas por venir</p>
          </div>
        </div>
      </div>
    </div>

    <div class="col-span-12 sm:col-span-6 lg:col-span-4">
      <div class="rounded-xl border border-border bg-card p-6 relative overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
        <div class="bg-gray-500/10 absolute -top-8 -right-8 w-32 h-32 rounded-full blur-2xl pointer-events-none"></div>
        <div class="relative flex flex-col h-full gap-3">
          <div class="flex items-center justify-between">
            <div class="bg-gradient-to-br from-gray-400 to-gray-600 w-10 h-10 rounded-xl flex items-center justify-center shadow-md shrink-0">
              <Icon name="CalendarX" :size="18" class="text-white" />
            </div>
          </div>
          <div>
            <p class="text-[11px] font-bold text-muted uppercase tracking-widest mb-1">Pasadas</p>
            <h3 class="text-2xl font-extrabold text-card-foreground leading-tight">{{ past.length }}</h3>
            <p class="text-xs text-muted mt-auto pt-1">Fechas vencidas</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Add Form -->
    <div class="col-span-12">
      <div class="rounded-xl border border-border bg-card p-6">
        <h3 class="text-sm font-semibold text-card-foreground mb-5 flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon name="Plus" :size="16" class="text-primary" />
          </div>
          Agregar Fecha de Descanso
        </h3>
        <form @submit.prevent="handleCreate" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          <div>
            <label class="block text-xs font-medium text-muted mb-1.5">Fecha *</label>
            <input v-model="newFecha.fecha" type="date" required
              class="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors" />
          </div>
          <div class="sm:col-span-1 lg:col-span-3">
            <label class="block text-xs font-medium text-muted mb-1.5">Descripción (opcional)</label>
            <input v-model="newFecha.descripcion" type="text" placeholder="Ej: Día de la Independencia, Semana Santa..."
              class="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors" />
          </div>
          <Button type="submit" :disabled="saving" class="gap-2 shrink-0">
            <svg v-if="saving" class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <Icon v-else name="Plus" :size="16" />
            {{ saving ? "Creando..." : "Crear" }}
          </Button>
        </form>
      </div>
    </div>

    <!-- List -->
    <div class="col-span-12">
      <div class="rounded-xl border border-border bg-card overflow-hidden">
        <div class="px-6 py-5 border-b border-border bg-muted/30">
          <h3 class="text-sm font-bold text-card-foreground flex items-center gap-2">
            <Icon name="List" :size="16" class="text-primary" />
            Fechas Registradas
          </h3>
        </div>

        <div v-if="loading" class="p-12 text-center">
          <div class="w-10 h-10 border-4 rounded-full border-border animate-spin border-t-primary mx-auto mb-4"></div>
          <p class="text-sm text-muted">Cargando fechas...</p>
        </div>

        <div v-else-if="fechas.length === 0" class="p-12 text-center">
          <Icon name="CalendarOff" :size="48" class="text-muted mx-auto mb-4" />
          <h4 class="text-lg font-semibold text-card-foreground mb-2">Sin fechas registradas</h4>
          <p class="text-sm text-muted">Agrega fechas de descanso para que no se generen cobros esos días</p>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-muted/30 border-b border-border">
                <th class="text-left px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider">Fecha</th>
                <th class="text-left px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider">Descripción</th>
                <th class="text-center px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider">Estado</th>
                <th class="text-center px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider w-16">Acción</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <tr v-for="fecha in fechas" :key="fecha.id" class="transition-colors hover:bg-hover/50 group">
                <td class="px-6 py-4">
                  <div class="flex items-center gap-3">
                    <div :class="[
                      'w-10 h-10 rounded-lg flex items-center justify-center shadow-sm transition-transform group-hover:scale-105',
                      new Date(fecha.fecha) >= new Date(new Date().toISOString().slice(0, 10))
                        ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
                        : 'bg-gradient-to-br from-gray-400 to-gray-500'
                    ]">
                      <Icon name="Calendar" :size="18" class="text-white" />
                    </div>
                    <div>
                      <p class="font-semibold text-card-foreground">{{ formatDateShort(fecha.fecha) }}</p>
                      <p class="text-[11px] text-muted capitalize mt-0.5">{{ formatDate(fecha.fecha) }}</p>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4 text-card-foreground">
                  <span v-if="fecha.descripcion" class="text-sm">{{ fecha.descripcion }}</span>
                  <span v-else class="text-xs text-muted italic">Sin descripción</span>
                </td>
                <td class="px-6 py-4 text-center">
                  <span :class="[
                    'inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-wider',
                    new Date(fecha.fecha) >= new Date(new Date().toISOString().slice(0, 10))
                      ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-500/10 dark:text-gray-400'
                  ]">
                    <Icon :name="new Date(fecha.fecha) >= new Date(new Date().toISOString().slice(0, 10)) ? 'CheckCircle' : 'XCircle'" :size="12" />
                    {{ new Date(fecha.fecha) >= new Date(new Date().toISOString().slice(0, 10)) ? "Próxima" : "Pasada" }}
                  </span>
                </td>
                <td class="px-6 py-4 text-center">
                  <button
                    @click="openDeleteModal(fecha)"
                    class="p-2 rounded-lg transition-all duration-200 hover:bg-red-50 dark:hover:bg-red-500/10 group/btn"
                    title="Eliminar fecha"
                  >
                    <Icon name="Trash2" :size="16" class="text-muted group-hover/btn:text-red-500 transition-colors" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <Footer></Footer>
  </div>

  <!-- DELETE CONFIRMATION -->
  <Teleport to="body">
    <div v-if="showDeleteModal && deletingFecha" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="fixed inset-0 bg-black/50 backdrop-blur-sm" @click="showDeleteModal = false"></div>
      <div class="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md">
        <div class="p-6 text-center">
          <div class="w-14 h-14 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <Icon name="AlertTriangle" :size="28" class="text-red-500" />
          </div>
          <h3 class="text-lg font-bold text-card-foreground mb-2">¿Eliminar fecha?</h3>
          <p class="text-sm text-muted mb-1">Estás a punto de eliminar la fecha de descanso:</p>
          <p class="text-sm font-semibold text-card-foreground mb-1">{{ formatDateShort(deletingFecha.fecha) }}</p>
          <p class="text-sm text-muted mb-6">{{ deletingFecha.descripcion || "Sin descripción" }}</p>
          <div class="flex gap-3 justify-center">
            <Button variant="outline" @click="showDeleteModal = false">Cancelar</Button>
            <button @click="handleDelete"
              class="px-4 py-2.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors">
              Sí, eliminar
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
