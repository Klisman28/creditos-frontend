<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRouter } from "vue-router";
import { usuariosService, type Usuario, type Rol } from "@/services/usuariosService";
import Footer from "@/components/Footer.vue";
import Icon from "@/components/Icon.vue";
import { Button } from "@/components/ui/button";
import { push } from "notivue";

const router = useRouter();
const empleados = ref<Usuario[]>([]);
const roles = ref<Rol[]>([]);
const loading = ref(true);
const searchQuery = ref("");
const currentPage = ref(1);
const itemsPerPage = 12;
const showModal = ref(false);
const saving = ref(false);

const newEmpleado = ref({
  nombre: "",
  apellido: "",
  email: "",
  password: "",
  username: "",
  celular1: "",
  domicilio: "",
  dpi: "",
  rol_id: null as number | null,
  agencia_id: null as number | null,
  sueldo_base: null as number | null,
});

const loadEmpleados = async () => {
  try {
    empleados.value = await usuariosService.getAll();
  } catch (error) {
    console.error("Error loading employees:", error);
    push.error("No se pudo cargar la lista de empleados.");
  } finally {
    loading.value = false;
  }
};

const loadRoles = async () => {
  try {
    roles.value = await usuariosService.getRoles();
  } catch (error) {
    console.error("Error loading roles:", error);
  }
};

onMounted(() => {
  loadEmpleados();
  loadRoles();
});

const filteredEmpleados = computed(() => {
  if (!searchQuery.value) return empleados.value;
  const q = searchQuery.value.toLowerCase();
  return empleados.value.filter((e) => {
    const fullName = `${e.persona?.nombre || ""} ${e.persona?.apellido || ""}`.toLowerCase();
    const userName = e.name.toLowerCase();
    const email = e.email.toLowerCase();
    const rol = e.roles.map((r) => r.nombre).join(" ").toLowerCase();
    return fullName.includes(q) || userName.includes(q) || email.includes(q) || rol.includes(q);
  });
});

const totalPages = computed(() => Math.ceil(filteredEmpleados.value.length / itemsPerPage));

const paginatedEmpleados = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  return filteredEmpleados.value.slice(start, start + itemsPerPage);
});

const getInitials = (emp: Usuario) => {
  if (emp.persona) {
    return `${(emp.persona.nombre || "?")[0]}${(emp.persona.apellido || "?")[0]}`.toUpperCase();
  }
  return emp.name.substring(0, 2).toUpperCase();
};

const getRolBadge = (rol: string) => {
  const map: Record<string, string> = {
    "Administrador": "bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400",
    "Supervisor": "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
    "Promotor": "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
    "Secretaria": "bg-pink-50 text-pink-600 dark:bg-pink-500/10 dark:text-pink-400",
  };
  return map[rol] || "bg-gray-100 text-gray-600 dark:bg-gray-500/10 dark:text-gray-400";
};

const roleColors = [
  "bg-purple-500", "bg-blue-500", "bg-emerald-500", "bg-pink-500",
  "bg-amber-500", "bg-cyan-500", "bg-indigo-500", "bg-rose-500"
];
const getAvatarColor = (id: number) => roleColors[id % roleColors.length];

const resetForm = () => {
  newEmpleado.value = {
    nombre: "", apellido: "", email: "", password: "", username: "",
    celular1: "", domicilio: "", dpi: "", rol_id: null, agencia_id: null, sueldo_base: null,
  };
};

const handleCreateEmpleado = async () => {
  if (!newEmpleado.value.nombre || !newEmpleado.value.apellido || !newEmpleado.value.email || !newEmpleado.value.password || !newEmpleado.value.username) {
    push.warning("Por favor completa todos los campos obligatorios");
    return;
  }
  saving.value = true;
  try {
    await usuariosService.create(newEmpleado.value);
    push.success("Empleado creado exitosamente");
    showModal.value = false;
    resetForm();
    loading.value = true;
    await loadEmpleados();
  } catch (error: any) {
    push.error(error.response?.data?.detail || "Error al crear empleado");
  } finally {
    saving.value = false;
  }
};

const handleDelete = async (emp: Usuario) => {
  if (!confirm(`¿Estás seguro de dar de baja al empleado ${emp.persona?.nombre || emp.name}?`)) {
    return;
  }
  
  try {
    await usuariosService.deleteUser(emp.id);
    push.success("Empleado dado de baja exitosamente");
    await loadEmpleados();
  } catch (error: any) {
    push.error(error.response?.data?.detail || "Error al dar de baja al empleado");
  }
};
</script>

<template>
  <div class="grid grid-cols-12 mt-2 mb-6 gap-7">
    <!-- Header -->
    <div class="col-span-12">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 class="text-2xl font-bold text-card-foreground">Empleados</h2>
          <p class="text-sm text-muted mt-1">Directorio de empleados del sistema</p>
        </div>
        <Button @click="showModal = true" class="gap-2">
          <Icon name="Plus" :size="18" />
          Nuevo Empleado
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
              placeholder="Buscar por nombre, correo o rol..."
              class="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-background text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
              @input="currentPage = 1"
            />
          </div>
          <span class="text-sm text-muted">
            <strong class="text-card-foreground">{{ filteredEmpleados.length }}</strong> empleados
          </span>
        </div>
      </div>
    </div>

    <!-- Grid -->
    <div class="col-span-12">
      <div v-if="loading" class="p-12 text-center">
        <div class="w-10 h-10 border-4 rounded-full border-border animate-spin border-t-primary mx-auto mb-4"></div>
        <p class="text-sm text-muted">Cargando empleados...</p>
      </div>

      <div v-else-if="filteredEmpleados.length === 0" class="rounded-xl border border-border bg-card p-12 text-center">
        <Icon name="UserX" :size="48" class="text-muted mx-auto mb-4" />
        <h4 class="text-lg font-semibold text-card-foreground mb-2">No se encontraron empleados</h4>
        <p class="text-sm text-muted">Intenta con otro término de búsqueda</p>
      </div>

      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        <div
          v-for="emp in paginatedEmpleados"
          :key="emp.id"
          class="rounded-xl border border-border bg-card p-5 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 group"
        >
          <div class="flex flex-col items-center text-center">
            <div :class="[getAvatarColor(emp.id), 'w-14 h-14 rounded-full flex items-center justify-center text-white text-lg font-bold mb-3 ring-4 ring-white dark:ring-gray-800 shadow-md']">
              {{ getInitials(emp) }}
            </div>
            <h4 class="font-semibold text-card-foreground text-sm group-hover:text-primary transition-colors">
              {{ emp.persona ? `${emp.persona.nombre} ${emp.persona.apellido}` : emp.name }}
            </h4>
            <p class="text-xs text-muted mt-0.5">{{ emp.email }}</p>
            <div class="flex flex-wrap gap-1.5 mt-3 justify-center">
              <span
                v-for="rol in emp.roles" :key="rol.id"
                :class="[getRolBadge(rol.nombre), 'px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider']"
              >{{ rol.nombre }}</span>
            </div>
            <div class="mt-4 w-full space-y-2 text-xs">
              <div v-if="emp.persona?.celular1" class="flex items-center gap-2 text-muted">
                <Icon name="Phone" :size="12" /><span>{{ emp.persona.celular1 }}</span>
              </div>
              <div v-if="emp.agencia" class="flex items-center gap-2 text-muted">
                <Icon name="Building2" :size="12" /><span>{{ emp.agencia.nombre }}</span>
              </div>
              <div v-if="emp.sueldo_base" class="flex items-center gap-2 text-muted">
                <Icon name="DollarSign" :size="12" /><span>Q{{ emp.sueldo_base.toLocaleString() }} base</span>
              </div>
            </div>
            <div class="flex gap-2 mt-4 pt-3 border-t border-border w-full justify-center">
              <button
                class="p-2 rounded-lg transition-colors hover:bg-hover"
                title="Ver perfil"
                @click="router.push({ name: 'empleadoDetalle', params: { id: emp.id } })"
              >
                <Icon name="Eye" :size="15" class="text-muted hover:text-primary" />
              </button>
              <button
                class="p-2 rounded-lg transition-colors hover:bg-hover"
                title="Editar"
                @click="router.push({ name: 'empleadoEditar', params: { id: emp.id } })"
              >
                <Icon name="Pencil" :size="15" class="text-muted hover:text-amber-500" />
              </button>
              <button
                class="p-2 rounded-lg transition-colors hover:bg-hover"
                title="Dar de baja"
                @click="handleDelete(emp)"
              >
                <Icon name="UserMinus" :size="15" class="text-muted hover:text-red-500" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="col-span-12">
      <div class="flex items-center justify-between">
        <span class="text-xs text-muted">Página {{ currentPage }} de {{ totalPages }}</span>
        <div class="flex items-center gap-1">
          <Button variant="outline" size="sm" :disabled="currentPage <= 1" @click="currentPage--">
            <Icon name="ChevronLeft" :size="16" />
          </Button>
          <Button variant="outline" size="sm" :disabled="currentPage >= totalPages" @click="currentPage++">
            <Icon name="ChevronRight" :size="16" />
          </Button>
        </div>
      </div>
    </div>

    <Footer></Footer>
  </div>

  <!-- CREATE EMPLOYEE MODAL -->
  <Teleport to="body">
    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="fixed inset-0 bg-black/50 backdrop-blur-sm" @click="showModal = false"></div>
      <div class="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h3 class="text-lg font-bold text-card-foreground">Nuevo Empleado</h3>
            <p class="text-xs text-muted mt-0.5">Completa los datos del nuevo empleado</p>
          </div>
          <button @click="showModal = false" class="p-2 rounded-lg hover:bg-hover transition-colors">
            <Icon name="X" :size="18" class="text-muted" />
          </button>
        </div>

        <form @submit.prevent="handleCreateEmpleado" class="p-6 space-y-5">
          <!-- Personal -->
          <div>
            <h4 class="text-sm font-semibold text-card-foreground mb-3 flex items-center gap-2">
              <Icon name="User" :size="16" class="text-primary" /> Información Personal
            </h4>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-medium text-muted mb-1.5">Nombre *</label>
                <input v-model="newEmpleado.nombre" type="text" required
                  class="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" placeholder="Nombre" />
              </div>
              <div>
                <label class="block text-xs font-medium text-muted mb-1.5">Apellido *</label>
                <input v-model="newEmpleado.apellido" type="text" required
                  class="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" placeholder="Apellido" />
              </div>
              <div>
                <label class="block text-xs font-medium text-muted mb-1.5">DPI</label>
                <input v-model="newEmpleado.dpi" type="text"
                  class="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" placeholder="Número de DPI" />
              </div>
              <div>
                <label class="block text-xs font-medium text-muted mb-1.5">Celular</label>
                <input v-model="newEmpleado.celular1" type="text"
                  class="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" placeholder="Número de celular" />
              </div>
              <div class="sm:col-span-2">
                <label class="block text-xs font-medium text-muted mb-1.5">Domicilio</label>
                <input v-model="newEmpleado.domicilio" type="text"
                  class="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" placeholder="Dirección de domicilio" />
              </div>
            </div>
          </div>

          <!-- Account -->
          <div>
            <h4 class="text-sm font-semibold text-card-foreground mb-3 flex items-center gap-2">
              <Icon name="Shield" :size="16" class="text-primary" /> Cuenta de Acceso
            </h4>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-medium text-muted mb-1.5">Usuario *</label>
                <input v-model="newEmpleado.username" type="text" required
                  class="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" placeholder="Nombre de usuario" />
              </div>
              <div>
                <label class="block text-xs font-medium text-muted mb-1.5">Correo Electrónico *</label>
                <input v-model="newEmpleado.email" type="email" required
                  class="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" placeholder="correo@ejemplo.com" />
              </div>
              <div>
                <label class="block text-xs font-medium text-muted mb-1.5">Contraseña *</label>
                <input v-model="newEmpleado.password" type="password" required
                  class="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" placeholder="Contraseña" />
              </div>
              <div>
                <label class="block text-xs font-medium text-muted mb-1.5">Rol</label>
                <select v-model="newEmpleado.rol_id"
                  class="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none">
                  <option :value="null">Seleccionar rol</option>
                  <option v-for="rol in roles" :key="rol.id" :value="rol.id">{{ rol.nombre }}</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Salary -->
          <div>
            <h4 class="text-sm font-semibold text-card-foreground mb-3 flex items-center gap-2">
              <Icon name="DollarSign" :size="16" class="text-primary" /> Información Salarial
            </h4>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-medium text-muted mb-1.5">Sueldo Base</label>
                <input v-model.number="newEmpleado.sueldo_base" type="number" step="0.01"
                  class="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" placeholder="0.00" />
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
              {{ saving ? "Guardando..." : "Crear Empleado" }}
            </Button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>
