<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRouter } from "vue-router";
import { clientesService, type Cliente, type Persona } from "@/services/clientesService";
import Footer from "@/components/Footer.vue";
import Icon from "@/components/Icon.vue";
import { Button } from "@/components/ui/button";
import { push } from "notivue";

const router = useRouter();

const clientes = ref<Cliente[]>([]);
const loading = ref(true);
const searchQuery = ref("");
const currentPage = ref(1);
const itemsPerPage = 10;
const showModal = ref(false);
const saving = ref(false);

const newCliente = ref({
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

const loadClientes = async () => {
  try {
    clientes.value = await clientesService.getAll({ limit: 500 });
  } catch (error) {
    console.error("Error loading clients:", error);
    push.error("No se pudo cargar la lista de clientes.");
  } finally {
    loading.value = false;
  }
};

onMounted(loadClientes);

const filteredClientes = computed(() => {
  if (!searchQuery.value) return clientes.value;
  const q = searchQuery.value.toLowerCase();
  return clientes.value.filter((c) => {
    const fullName = `${c.persona?.nombre || ""} ${c.persona?.apellido || ""}`.toLowerCase();
    const cedula = (c.persona?.dpi || "").toLowerCase();
    const telefono = (c.persona?.telefono || "").toLowerCase();
    return fullName.includes(q) || cedula.includes(q) || telefono.includes(q);
  });
});

const totalPages = computed(() => Math.ceil(filteredClientes.value.length / itemsPerPage));

const paginatedClientes = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  return filteredClientes.value.slice(start, start + itemsPerPage);
});

const getInitials = (persona: Persona | null) => {
  if (!persona) return "??";
  return `${(persona.nombre || "?")[0]}${(persona.apellido || "?")[0]}`.toUpperCase();
};

const getRandomColor = (id: number) => {
  const colors = [
    "bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-purple-500",
    "bg-pink-500", "bg-cyan-500", "bg-indigo-500", "bg-rose-500"
  ];
  return colors[id % colors.length];
};

const resetForm = () => {
  newCliente.value = {
    nombre: "", apellido: "", cedula: "", telefono: "", direccion: "",
    empresa_trabajo: "", actividad: "", direccion_cobrar: "", estado_civil: "",
    salario: null, nacionalidad: "Guatemalteca", observaciones: "",
  };
};

const handleCreateCliente = async () => {
  if (!newCliente.value.nombre || !newCliente.value.apellido) {
    push.warning("Por favor ingresa nombre y apellido");
    return;
  }
  saving.value = true;
  try {
    await clientesService.create(newCliente.value);
    push.success("Cliente creado exitosamente");
    showModal.value = false;
    resetForm();
    loading.value = true;
    await loadClientes();
  } catch (error: any) {
    push.error(error.response?.data?.detail || "Error al crear cliente");
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
          <h2 class="text-2xl font-bold text-card-foreground">Clientes</h2>
          <p class="text-sm text-muted mt-1">Directorio completo de clientes del sistema</p>
        </div>
        <Button @click="showModal = true" class="gap-2">
          <Icon name="Plus" :size="18" />
          Nuevo Cliente
        </Button>
      </div>
    </div>

    <!-- Search -->
    <div class="col-span-12">
      <div class="rounded-xl border border-border bg-card p-5">
        <div class="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div class="relative w-full sm:w-80">
            <Icon name="Search" :size="18" class="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Buscar por nombre, cédula o teléfono..."
              class="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-background text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
              @input="currentPage = 1"
            />
          </div>
          <span class="text-sm text-muted">
            <strong class="text-card-foreground">{{ filteredClientes.length }}</strong> clientes
          </span>
        </div>
      </div>
    </div>

    <!-- Table -->
    <div class="col-span-12">
      <div class="rounded-xl border border-border bg-card overflow-hidden">
        <div v-if="loading" class="p-12 text-center">
          <div class="w-10 h-10 border-4 rounded-full border-border animate-spin border-t-primary mx-auto mb-4"></div>
          <p class="text-sm text-muted">Cargando clientes...</p>
        </div>

        <div v-else-if="filteredClientes.length === 0" class="p-12 text-center">
          <Icon name="UserX" :size="48" class="text-muted mx-auto mb-4" />
          <h4 class="text-lg font-semibold text-card-foreground mb-2">No se encontraron clientes</h4>
          <p class="text-sm text-muted">Intenta con otro término de búsqueda</p>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-border bg-hover/50">
                <th class="text-left px-5 py-3.5 font-semibold text-muted text-xs uppercase tracking-wider">Cliente</th>
                <th class="text-left px-5 py-3.5 font-semibold text-muted text-xs uppercase tracking-wider">Cédula</th>
                <th class="text-left px-5 py-3.5 font-semibold text-muted text-xs uppercase tracking-wider">Teléfono</th>
                <th class="text-left px-5 py-3.5 font-semibold text-muted text-xs uppercase tracking-wider">Actividad</th>
                <th class="text-left px-5 py-3.5 font-semibold text-muted text-xs uppercase tracking-wider">Dirección Cobro</th>
                <th class="text-left px-5 py-3.5 font-semibold text-muted text-xs uppercase tracking-wider">Ingreso</th>
                <th class="text-center px-5 py-3.5 font-semibold text-muted text-xs uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="cliente in paginatedClientes"
                :key="cliente.id"
                class="border-b border-border last:border-0 transition-colors hover:bg-hover/50"
              >
                <td class="px-5 py-4">
                  <div class="flex items-center gap-3">
                    <div :class="[getRandomColor(cliente.id), 'w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0']">
                      {{ getInitials(cliente.persona) }}
                    </div>
                    <div>
                      <p class="font-semibold text-card-foreground">
                        {{ cliente.persona?.nombre || "—" }} {{ cliente.persona?.apellido || "" }}
                      </p>
                      <p class="text-xs text-muted">{{ cliente.empresa_trabajo || "Sin empresa" }}</p>
                    </div>
                  </div>
                </td>
                <td class="px-5 py-4 text-muted">{{ cliente.persona?.dpi || "—" }}</td>
                <td class="px-5 py-4 text-muted">{{ cliente.persona?.telefono || "—" }}</td>
                <td class="px-5 py-4 text-muted">{{ cliente.actividad || "—" }}</td>
                <td class="px-5 py-4 text-muted max-w-[200px] truncate">{{ cliente.direccion_cobrar || "—" }}</td>
                <td class="px-5 py-4 text-muted text-xs">{{ cliente.fecha_ingreso || "—" }}</td>
                <td class="px-5 py-4">
                  <div class="flex items-center justify-center gap-1">
                    <button
                      class="p-1.5 rounded-lg transition-colors hover:bg-hover"
                      title="Ver detalle"
                      @click="router.push({ name: 'clienteDetalle', params: { id: cliente.id } })"
                    >
                      <Icon name="Eye" :size="16" class="text-muted hover:text-primary" />
                    </button>
                    <button
                      class="p-1.5 rounded-lg transition-colors hover:bg-hover"
                      title="Editar"
                      @click="router.push({ name: 'clienteEditar', params: { id: cliente.id } })"
                    >
                      <Icon name="Pencil" :size="16" class="text-muted hover:text-amber-500" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="totalPages > 1" class="flex items-center justify-between px-5 py-3.5 border-t border-border">
          <span class="text-xs text-muted">Página {{ currentPage }} de {{ totalPages }}</span>
          <div class="flex items-center gap-1">
            <Button variant="outline" size="sm" :disabled="currentPage <= 1" @click="currentPage--">
              <Icon name="ChevronLeft" :size="16" />
            </Button>
            <template v-for="page in totalPages" :key="page">
              <Button
                v-if="page <= 5 || page === totalPages || Math.abs(page - currentPage) <= 1"
                :variant="page === currentPage ? 'default' : 'outline'"
                size="sm"
                @click="currentPage = page"
              >{{ page }}</Button>
              <span v-else-if="page === 6 || page === totalPages - 1" class="px-1 text-muted">...</span>
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

  <!-- CREATE CLIENT MODAL -->
  <Teleport to="body">
    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="fixed inset-0 bg-black/50 backdrop-blur-sm" @click="showModal = false"></div>
      <div class="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <!-- Header -->
        <div class="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h3 class="text-lg font-bold text-card-foreground">Nuevo Cliente</h3>
            <p class="text-xs text-muted mt-0.5">Completa los datos del nuevo cliente</p>
          </div>
          <button @click="showModal = false" class="p-2 rounded-lg hover:bg-hover transition-colors">
            <Icon name="X" :size="18" class="text-muted" />
          </button>
        </div>

        <!-- Form -->
        <form @submit.prevent="handleCreateCliente" class="p-6 space-y-5">
          <!-- Personal Info -->
          <div>
            <h4 class="text-sm font-semibold text-card-foreground mb-3 flex items-center gap-2">
              <Icon name="User" :size="16" class="text-primary" /> Información Personal
            </h4>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-medium text-muted mb-1.5">Nombre *</label>
                <input v-model="newCliente.nombre" type="text" required
                  class="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" placeholder="Nombre" />
              </div>
              <div>
                <label class="block text-xs font-medium text-muted mb-1.5">Apellido *</label>
                <input v-model="newCliente.apellido" type="text" required
                  class="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" placeholder="Apellido" />
              </div>
              <div>
                <label class="block text-xs font-medium text-muted mb-1.5">Cédula / DPI</label>
                <input v-model="newCliente.cedula" type="text"
                  class="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" placeholder="Número de DPI" />
              </div>
              <div>
                <label class="block text-xs font-medium text-muted mb-1.5">Teléfono</label>
                <input v-model="newCliente.telefono" type="text"
                  class="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" placeholder="Número de teléfono" />
              </div>
              <div>
                <label class="block text-xs font-medium text-muted mb-1.5">Estado Civil</label>
                <select v-model="newCliente.estado_civil"
                  class="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none">
                  <option value="">Seleccionar</option>
                  <option value="Soltero/a">Soltero/a</option>
                  <option value="Casado/a">Casado/a</option>
                  <option value="Unión Libre">Unión Libre</option>
                  <option value="Divorciado/a">Divorciado/a</option>
                  <option value="Viudo/a">Viudo/a</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-medium text-muted mb-1.5">Nacionalidad</label>
                <input v-model="newCliente.nacionalidad" type="text"
                  class="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" placeholder="Nacionalidad" />
              </div>
            </div>
          </div>

          <!-- Work Info -->
          <div>
            <h4 class="text-sm font-semibold text-card-foreground mb-3 flex items-center gap-2">
              <Icon name="Briefcase" :size="16" class="text-primary" /> Información Laboral
            </h4>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-medium text-muted mb-1.5">Empresa / Trabajo</label>
                <input v-model="newCliente.empresa_trabajo" type="text"
                  class="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" placeholder="Empresa donde trabaja" />
              </div>
              <div>
                <label class="block text-xs font-medium text-muted mb-1.5">Actividad</label>
                <input v-model="newCliente.actividad" type="text"
                  class="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" placeholder="Actividad o profesión" />
              </div>
              <div>
                <label class="block text-xs font-medium text-muted mb-1.5">Salario</label>
                <input v-model.number="newCliente.salario" type="number" step="0.01"
                  class="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" placeholder="0.00" />
              </div>
            </div>
          </div>

          <!-- Address -->
          <div>
            <h4 class="text-sm font-semibold text-card-foreground mb-3 flex items-center gap-2">
              <Icon name="MapPin" :size="16" class="text-primary" /> Direcciones
            </h4>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-medium text-muted mb-1.5">Dirección de domicilio</label>
                <input v-model="newCliente.direccion" type="text"
                  class="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" placeholder="Dirección de domicilio" />
              </div>
              <div>
                <label class="block text-xs font-medium text-muted mb-1.5">Dirección de cobro</label>
                <input v-model="newCliente.direccion_cobrar" type="text"
                  class="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" placeholder="Dirección para cobros" />
              </div>
            </div>
          </div>

          <!-- Notes -->
          <div>
            <label class="block text-xs font-medium text-muted mb-1.5">Observaciones</label>
            <textarea v-model="newCliente.observaciones" rows="3"
              class="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none" placeholder="Notas adicionales..."></textarea>
          </div>

          <!-- Actions -->
          <div class="flex justify-end gap-3 pt-2">
            <Button variant="outline" type="button" @click="showModal = false">Cancelar</Button>
            <Button type="submit" :disabled="saving" class="gap-2">
              <svg v-if="saving" class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {{ saving ? "Guardando..." : "Crear Cliente" }}
            </Button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>
