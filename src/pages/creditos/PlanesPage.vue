<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import planesService, { Plantilla, SimulacionPlan, CreatePlantillaRequest } from "@/services/planesService";
import Footer from "@/components/Footer.vue";
import Icon from "@/components/Icon.vue";
import { Button } from "@/components/ui/button";
import { push } from "notivue";

// ── State ─────────────────────────────────────────────────────────
const plantillas = ref<Plantilla[]>([]);
const loading = ref(true);
const searchQuery = ref("");
const currentPage = ref(1);
const itemsPerPage = 10;

// Modal state
const showModal = ref(false);
const showDeleteModal = ref(false);
const saving = ref(false);
const isEditing = ref(false);
const editingId = ref<number | null>(null);
const deletingPlantilla = ref<Plantilla | null>(null);
const formErrors = ref<Record<string, string>>({});

// Form data
const formData = ref({
  nombre: "",
  tasa_interes: null as number | null,
  tasa_mora_diaria: null as number | null,
  frecuencia_dias: 30 as number,
  descripcion: "",
  activa: true,
});

// Simulación state
const simulacion = ref({
  monto: 5000 as number | null,
  cuotas: 12 as number | null,
  activa: false,
  resultado: null as SimulacionPlan | null,
});

const simulando = ref(false);

// ── Computed ──────────────────────────────────────────────────────

const filteredPlantillas = computed(() => {
  if (!searchQuery.value) return plantillas.value;
  const q = searchQuery.value.toLowerCase();
  return plantillas.value.filter((p) => {
    const nombre = (p.nombre || "").toLowerCase();
    const descripcion = (p.descripcion || "").toLowerCase();
    return nombre.includes(q) || descripcion.includes(q);
  });
});

const totalPages = computed(() => Math.ceil(filteredPlantillas.value.length / itemsPerPage));

const paginatedPlantillas = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  return filteredPlantillas.value.slice(start, start + itemsPerPage);
});

const summaryCards = computed(() => {
  const total = plantillas.value.length;
  const activasCount = plantillas.value.filter(p => p.activa).length;
  const avgTasaInteres = total > 0
    ? plantillas.value.reduce((sum, p) => sum + (p.tasa_interes || 0), 0) / total
    : 0;
  const avgTasaMora = total > 0
    ? plantillas.value.reduce((sum, p) => sum + (p.tasa_mora_diaria || 0), 0) / total
    : 0;

  return [
    { label: "Total Plantillas", value: total, icon: "FileText", gradient: "from-blue-500 to-indigo-600", bgGlow: "bg-blue-500/10" },
    { label: "Plantillas Activas", value: activasCount, icon: "CheckCircle2", gradient: "from-green-500 to-emerald-600", bgGlow: "bg-green-500/10" },
    { label: "Interés Promedio", value: `${avgTasaInteres.toFixed(2)}%`, icon: "TrendingUp", gradient: "from-purple-500 to-pink-600", bgGlow: "bg-purple-500/10" },
    { label: "Mora Promedio", value: `${avgTasaMora.toFixed(2)}%`, icon: "AlertTriangle", gradient: "from-amber-500 to-orange-600", bgGlow: "bg-amber-500/10" },
  ];
});

// ── Validation ────────────────────────────────────────────────────
const validateForm = (): boolean => {
  const errs: Record<string, string> = {};

  if (!formData.value.nombre?.trim())
    errs.nombre = "El nombre de la plantilla es obligatorio";
  if (formData.value.nombre && formData.value.nombre.length > 100)
    errs.nombre = "El nombre no puede exceder 100 caracteres";

  if (formData.value.tasa_interes === null)
    errs.tasa_interes = "La tasa de interés es obligatoria";
  else if (formData.value.tasa_interes < 0 || formData.value.tasa_interes > 100)
    errs.tasa_interes = "Debe estar entre 0% y 100%";

  if (formData.value.tasa_mora_diaria === null)
    errs.tasa_mora_diaria = "La cuota por mora es obligatoria";
  else if (formData.value.tasa_mora_diaria < 0 || formData.value.tasa_mora_diaria > 100)
    errs.tasa_mora_diaria = "Debe estar entre 0% y 100%";

  if (!formData.value.frecuencia_dias || formData.value.frecuencia_dias < 1)
    errs.frecuencia_dias = "La frecuencia debe ser al menos 1 día";

  formErrors.value = errs;
  return Object.keys(errs).length === 0;
};

// ── Data loading ──────────────────────────────────────────────────
const loadPlantillas = async () => {
  try {
    plantillas.value = await planesService.getAll();
  } catch (error) {
    push.error("Error al cargar las plantillas");
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadPlantillas();
});

// ── Form helpers ──────────────────────────────────────────────────
const resetForm = () => {
  formData.value = {
    nombre: "",
    tasa_interes: null,
    tasa_mora_diaria: null,
    frecuencia_dias: 30,
    descripcion: "",
    activa: true,
  };
  simulacion.value = {
    monto: 5000,
    cuotas: 12,
    activa: false,
    resultado: null,
  };
  formErrors.value = {};
  isEditing.value = false;
  editingId.value = null;
};

const openCreateModal = () => {
  resetForm();
  showModal.value = true;
};

const openEditModal = (plantilla: Plantilla) => {
  isEditing.value = true;
  editingId.value = plantilla.id;
  formData.value = {
    nombre: plantilla.nombre,
    tasa_interes: plantilla.tasa_interes,
    tasa_mora_diaria: plantilla.tasa_mora_diaria,
    frecuencia_dias: plantilla.frecuencia_dias,
    descripcion: plantilla.descripcion || "",
    activa: plantilla.activa,
  };
  formErrors.value = {};
  showModal.value = true;
};

const openDeleteModal = (plantilla: Plantilla) => {
  deletingPlantilla.value = plantilla;
  showDeleteModal.value = true;
};

// ── Simulation ────────────────────────────────────────────────────
const generarSimulacion = async () => {
  if (!simulacion.value.monto || !simulacion.value.cuotas) {
    push.error("Ingresa monto y cuotas para simular");
    return;
  }

  if (!formData.value.tasa_interes || formData.value.tasa_interes === null) {
    push.error("Define la tasa de interés primero");
    return;
  }

  simulando.value = true;
  try {
    simulacion.value.resultado = await planesService.simular({
      monto: simulacion.value.monto,
      cuotas: simulacion.value.cuotas,
      tasa_interes: formData.value.tasa_interes,
      tasa_mora_diaria: formData.value.tasa_mora_diaria || 0,
    });
    simulacion.value.activa = true;
  } catch (error: any) {
    push.error(error.response?.data?.detail || "Error al simular");
  } finally {
    simulando.value = false;
  }
};

// ── Submit ────────────────────────────────────────────────────────
const handleSubmit = async () => {
  if (!validateForm()) return;
  saving.value = true;

  try {
    const payload: CreatePlantillaRequest = {
      nombre: formData.value.nombre,
      tasa_interes: formData.value.tasa_interes!,
      tasa_mora_diaria: formData.value.tasa_mora_diaria!,
      frecuencia_dias: formData.value.frecuencia_dias,
      descripcion: formData.value.descripcion || undefined,
      activa: formData.value.activa,
    };

    if (isEditing.value && editingId.value) {
      await planesService.update(editingId.value, payload);
      push.success("Plantilla actualizada exitosamente");
    } else {
      await planesService.create(payload);
      push.success("Plantilla creada exitosamente");
    }
    showModal.value = false;
    resetForm();
    loading.value = true;
    await loadPlantillas();
  } catch (error: any) {
    push.error(error.response?.data?.detail || "Error al guardar la plantilla");
  } finally {
    saving.value = false;
  }
};

// ── Delete ────────────────────────────────────────────────────────
const handleDelete = async () => {
  if (!deletingPlantilla.value) return;
  try {
    await planesService.remove(deletingPlantilla.value.id);
    push.success("Plantilla eliminada exitosamente");
    showDeleteModal.value = false;
    deletingPlantilla.value = null;
    loading.value = true;
    await loadPlantillas();
  } catch (error: any) {
    push.error(error.response?.data?.detail || "Error al eliminar la plantilla");
  }
};

// ── Formatting ────────────────────────────────────────────────────
const formatCurrency = (val: number | null) => {
  if (val == null) return "—";
  return `Q${val.toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatPercent = (val: number | null) => {
  if (val == null) return "—";
  return `${val.toFixed(2)}%`;
};

const getStatusBadgeClass = (activa: boolean) => {
  return activa
    ? "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400"
    : "bg-gray-50 text-gray-700 dark:bg-gray-500/10 dark:text-gray-400";
};
</script>

<template>
  <div class="grid grid-cols-12 mt-2 mb-6 gap-7">
    <!-- Header -->
    <div class="col-span-12">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 class="text-2xl font-bold text-card-foreground">Plantillas de Préstamo</h2>
          <p class="text-sm text-muted mt-1">Gestiona las reglas reutilizables para crear créditos</p>
        </div>
        <Button @click="openCreateModal" class="gap-2">
          <Icon name="Plus" :size="18" />
          Nueva Plantilla
        </Button>
      </div>
    </div>

    <!-- Summary Cards -->
    <div class="col-span-12 grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div
        v-for="(card, i) in summaryCards"
        :key="i"
        class="rounded-xl border border-border bg-card p-5 relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
      >
        <div :class="[card.bgGlow, 'absolute -top-6 -right-6 w-24 h-24 rounded-full blur-2xl']"></div>
        <div class="relative flex items-start justify-between">
          <div>
            <p class="text-xs font-medium text-muted uppercase tracking-wider mb-1">{{ card.label }}</p>
            <p class="text-2xl font-bold text-card-foreground">{{ card.value }}</p>
          </div>
          <div :class="['bg-gradient-to-br', card.gradient, 'w-10 h-10 rounded-lg flex items-center justify-center shadow-lg']">
            <Icon :name="card.icon" :size="20" class="text-white" />
          </div>
        </div>
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
              placeholder="Buscar por nombre o descripción..."
              class="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-background text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
              @input="currentPage = 1"
            />
          </div>
          <span class="text-sm text-muted">
            <strong class="text-card-foreground">{{ filteredPlantillas.length }}</strong> plantillas
          </span>
        </div>
      </div>
    </div>

    <!-- Table -->
    <div class="col-span-12">
      <div v-if="loading" class="p-12 text-center">
        <div class="w-10 h-10 border-4 rounded-full border-border animate-spin border-t-primary mx-auto mb-4"></div>
        <p class="text-sm text-muted">Cargando plantillas...</p>
      </div>

      <div v-else-if="filteredPlantillas.length === 0" class="rounded-xl border border-border bg-card p-12 text-center">
        <Icon name="FileX" :size="48" class="text-muted mx-auto mb-4" />
        <h4 class="text-lg font-semibold text-card-foreground mb-2">No se encontraron plantillas</h4>
        <p class="text-sm text-muted">Crea una nueva plantilla para empezar a crear créditos</p>
      </div>

      <div v-else class="rounded-xl border border-border bg-card overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-muted/30 border-b border-border">
                <th class="text-left px-5 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider">Plantilla</th>
                <th class="text-right px-5 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider">Interés</th>
                <th class="text-right px-5 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider">Mora</th>
                <th class="text-right px-5 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider">Periodicidad</th>
                <th class="text-center px-5 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider">Estado</th>
                <th class="text-center px-5 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <tr
                v-for="plantilla in paginatedPlantillas"
                :key="plantilla.id"
                class="transition-colors hover:bg-hover group"
              >
                <td class="px-5 py-4">
                  <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
                      <Icon name="FileText" :size="16" class="text-white" />
                    </div>
                    <div>
                      <p class="font-semibold text-card-foreground group-hover:text-primary transition-colors">{{ plantilla.nombre }}</p>
                      <p v-if="plantilla.descripcion" class="text-xs text-muted line-clamp-1">{{ plantilla.descripcion }}</p>
                    </div>
                  </div>
                </td>
                <td class="px-5 py-4 text-right">
                  <span class="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 text-xs font-semibold">
                    {{ formatPercent(plantilla.tasa_interes) }}
                  </span>
                </td>
                <td class="px-5 py-4 text-right">
                  <span class="px-2 py-0.5 rounded-md bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400 text-xs font-semibold">
                    {{ formatPercent(plantilla.tasa_mora_diaria) }}
                  </span>
                </td>
                <td class="px-5 py-4 text-right font-medium text-card-foreground">
                  Cada {{ plantilla.frecuencia_dias }} día<span v-if="plantilla.frecuencia_dias !== 1">s</span>
                </td>
                <td class="px-5 py-4 text-center">
                  <span :class="[getStatusBadgeClass(plantilla.activa), 'px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider inline-block']">
                    {{ plantilla.activa ? "Activa" : "Inactiva" }}
                  </span>
                </td>
                <td class="px-5 py-4">
                  <div class="flex gap-1 justify-center">
                    <button
                      @click="openEditModal(plantilla)"
                      class="p-2 rounded-lg transition-colors hover:bg-amber-50 dark:hover:bg-amber-500/10"
                      title="Editar"
                    >
                      <Icon name="Pencil" :size="15" class="text-muted hover:text-amber-500 transition-colors" />
                    </button>
                    <button
                      @click="openDeleteModal(plantilla)"
                      class="p-2 rounded-lg transition-colors hover:bg-red-50 dark:hover:bg-red-500/10"
                      title="Eliminar"
                    >
                      <Icon name="Trash2" :size="15" class="text-muted hover:text-red-500 transition-colors" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
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

  <!-- CREATE / EDIT PLANTILLA MODAL -->
  <Teleport to="body">
    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="fixed inset-0 bg-black/50 backdrop-blur-sm" @click="showModal = false"></div>
      <div class="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
        <!-- Modal Header -->
        <div class="sticky top-0 z-10 bg-card flex items-center justify-between px-6 py-4 border-b border-border">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow">
              <Icon name="FileText" :size="18" class="text-white" />
            </div>
            <div>
              <h3 class="text-base font-bold text-card-foreground">
                {{ isEditing ? "Editar Plantilla" : "Nueva Plantilla de Préstamo" }}
              </h3>
              <p class="text-xs text-muted mt-0.5">
                {{ isEditing ? "Actualiza los parámetros de esta plantilla" : "Define las reglas reutilizables para nuevos créditos" }}
              </p>
            </div>
          </div>
          <button
            @click="showModal = false"
            class="p-2 rounded-lg hover:bg-hover transition-colors"
          >
            <Icon name="X" :size="20" class="text-muted" />
          </button>
        </div>

        <!-- Modal Content -->
        <div class="px-6 py-5 space-y-6">
          <!-- SECCIÓN 1: Identidad -->
          <div>
            <h4 class="text-sm font-semibold text-card-foreground mb-4">Identidad de la Plantilla</h4>

            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nombre <span class="text-red-600">*</span>
                </label>
                <input
                  v-model="formData.nombre"
                  type="text"
                  placeholder="Ej: Préstamo Quincenal 10%"
                  :class="[
                    'w-full px-3 py-2 border rounded-lg bg-background text-foreground transition-colors',
                    formErrors.nombre ? 'border-red-500 focus:ring-red-500' : 'border-border focus:ring-primary',
                    'focus:ring-1 focus:border-transparent outline-none',
                  ]"
                  @input="delete formErrors.nombre"
                />
                <p v-if="formErrors.nombre" class="mt-1 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                  ⚠️ {{ formErrors.nombre }}
                </p>
                <p class="mt-1 text-xs text-muted">Usa un nombre descriptivo para identificar esta plantilla</p>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Descripción (opcional)
                </label>
                <textarea
                  v-model="formData.descripcion"
                  placeholder="Notas internas: para qué se usa esta plantilla, casos especiales, etc."
                  rows="2"
                  class="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-1 focus:ring-primary focus:border-transparent outline-none transition-colors resize-none"
                />
                <p class="mt-1 text-xs text-muted">Máximo 500 caracteres</p>
              </div>
            </div>
          </div>

          <!-- SECCIÓN 2: Reglas -->
          <div>
            <h4 class="text-sm font-semibold text-card-foreground mb-4">Reglas de la Plantilla</h4>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Tasa Interés -->
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Interés <span class="text-red-600">*</span>
                </label>
                <div class="relative">
                  <input
                    v-model.number="formData.tasa_interes"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    placeholder="10"
                    :class="[
                      'w-full px-3 py-2 border rounded-lg bg-background text-foreground transition-colors pr-8',
                      formErrors.tasa_interes ? 'border-red-500' : 'border-border focus:ring-primary',
                      'focus:ring-1 focus:border-transparent outline-none',
                    ]"
                    @input="delete formErrors.tasa_interes"
                  />
                  <span class="absolute right-3 top-1/2 -translate-y-1/2 text-muted text-sm">%</span>
                </div>
                <p v-if="formErrors.tasa_interes" class="mt-1 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                  ⚠️ {{ formErrors.tasa_interes }}
                </p>
                <p class="mt-1 text-xs text-muted">Porcentaje del monto total. Ej: 10% de Q1,000 = Q100</p>
              </div>

              <!-- Tasa Mora -->
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Mora por Atraso <span class="text-red-600">*</span>
                </label>
                <div class="relative">
                  <input
                    v-model.number="formData.tasa_mora_diaria"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    placeholder="2"
                    :class="[
                      'w-full px-3 py-2 border rounded-lg bg-background text-foreground transition-colors pr-8',
                      formErrors.tasa_mora_diaria ? 'border-red-500' : 'border-border focus:ring-primary',
                      'focus:ring-1 focus:border-transparent outline-none',
                    ]"
                    @input="delete formErrors.tasa_mora_diaria"
                  />
                  <span class="absolute right-3 top-1/2 -translate-y-1/2 text-muted text-sm">%</span>
                </div>
                <p v-if="formErrors.tasa_mora_diaria" class="mt-1 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                  ⚠️ {{ formErrors.tasa_mora_diaria }}
                </p>
              </div>

              <!-- Frecuencia -->
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Frecuencia de Cobro <span class="text-red-600">*</span>
                </label>
                <div class="flex gap-2">
                  <input
                    v-model.number="formData.frecuencia_dias"
                    type="number"
                    min="1"
                    max="365"
                    placeholder="30"
                    :class="[
                      'flex-1 px-3 py-2 border rounded-lg bg-background text-foreground transition-colors',
                      formErrors.frecuencia_dias ? 'border-red-500' : 'border-border focus:ring-primary',
                      'focus:ring-1 focus:border-transparent outline-none',
                    ]"
                    @input="delete formErrors.frecuencia_dias"
                  />
                  <div class="px-3 py-2 border border-border rounded-lg bg-muted/50 text-sm text-muted flex items-center">
                    días
                  </div>
                </div>
                <p v-if="formErrors.frecuencia_dias" class="mt-1 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                  ⚠️ {{ formErrors.frecuencia_dias }}
                </p>
              </div>

              <!-- Estado -->
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Estado
                </label>
                <div class="flex items-center gap-3 h-10">
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input
                      v-model="formData.activa"
                      type="checkbox"
                      class="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                    />
                    <span class="text-sm text-foreground">Plantilla activa</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <!-- SECCIÓN 3: Simulación -->
          <div class="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-lg p-4">
            <div class="flex items-start gap-3 mb-4">
              <Icon name="Info" :size="18" class="text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <h4 class="font-semibold text-blue-900 dark:text-blue-100">
                  Simulador: Vista Previa de la Plantilla
                </h4>
                <p class="text-sm text-blue-700 dark:text-blue-200 mt-0.5">
                  Prueba cómo funcionaría esta plantilla con valores ejemplo
                </p>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Monto ejemplo
                </label>
                <div class="relative">
                  <span class="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">Q</span>
                  <input
                    v-model.number="simulacion.monto"
                    type="number"
                    min="1"
                    placeholder="5000"
                    class="w-full pl-7 pr-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-1 focus:ring-blue-500 focus:border-transparent outline-none transition-colors text-sm"
                  />
                </div>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Cuotas
                </label>
                <input
                  v-model.number="simulacion.cuotas"
                  type="number"
                  min="1"
                  max="60"
                  placeholder="12"
                  class="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-1 focus:ring-blue-500 focus:border-transparent outline-none transition-colors text-sm"
                />
              </div>
            </div>

            <button
              @click="generarSimulacion"
              :disabled="simulando"
              class="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
            >
              {{ simulando ? "Calculando..." : "Generar Vista Previa" }}
            </button>

            <!-- Resultado -->
            <div v-if="simulacion.resultado" class="mt-3 bg-white dark:bg-gray-900 border-l-4 border-green-500 p-3 rounded">
              <div class="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span class="text-gray-600 dark:text-gray-400">Cuota por pago</span>
                  <p class="text-lg font-bold text-gray-900 dark:text-white">
                    {{ formatCurrency(simulacion.resultado.cuota_monto) }}
                  </p>
                </div>
                <div>
                  <span class="text-gray-600 dark:text-gray-400">Total a cobrar</span>
                  <p class="text-lg font-bold text-gray-900 dark:text-white">
                    {{ formatCurrency(simulacion.resultado.total_cobrar) }}
                  </p>
                </div>
                <div>
                  <span class="text-gray-600 dark:text-gray-400">Interés total</span>
                  <p class="text-base font-semibold text-green-600 dark:text-green-400">
                    + {{ formatCurrency(simulacion.resultado.interes_total) }}
                  </p>
                </div>
                <div>
                  <span class="text-gray-600 dark:text-gray-400">Mora por atraso</span>
                  <p class="text-base font-semibold text-orange-600 dark:text-orange-400">
                    + {{ formatCurrency(simulacion.resultado.mora_por_cuota_atraso) }}
                  </p>
                </div>
              </div>
              <p class="mt-2 text-xs text-gray-600 dark:text-gray-400 border-t pt-2">
                💡 Esta es solo una simulación. Los valores reales variarán según el monto y cuotas de cada crédito.
              </p>
            </div>
          </div>
        </div>

        <!-- Modal Footer -->
        <div class="sticky bottom-0 bg-card flex items-center justify-end gap-3 px-6 py-4 border-t border-border rounded-b-2xl">
          <Button variant="outline" @click="showModal = false">
            Cancelar
          </Button>
          <Button
            @click="handleSubmit"
            :disabled="saving"
            class="gap-2"
          >
            <Icon v-if="saving" name="Loader2" :size="16" class="animate-spin" />
            {{ saving ? "Guardando..." : (isEditing ? "Guardar Cambios" : "Guardar Plantilla") }}
          </Button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- DELETE PLANTILLA MODAL -->
  <Teleport to="body">
    <div v-if="showDeleteModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="fixed inset-0 bg-black/50 backdrop-blur-sm" @click="showDeleteModal = false"></div>
      <div class="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm">
        <div class="px-6 py-5">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
              <Icon name="AlertTriangle" :size="20" class="text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h3 class="font-semibold text-card-foreground">Eliminar Plantilla</h3>
              <p class="text-sm text-muted mt-0.5">Esta acción no se puede deshacer</p>
            </div>
          </div>

          <p class="text-sm text-foreground mb-6">
            ¿Estás seguro de que quieres eliminar la plantilla
            <strong>"{{ deletingPlantilla?.nombre }}"</strong>?
          </p>

          <div class="flex gap-3 justify-end">
            <Button variant="outline" @click="showDeleteModal = false">
              Cancelar
            </Button>
            <Button
              @click="handleDelete"
              variant="outline"
              class="border-red-600 text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
            >
              Eliminar
            </Button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
