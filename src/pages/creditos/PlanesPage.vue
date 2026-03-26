<script setup lang="ts">
import { ref, onMounted, computed, watch } from "vue";
import planesService from "@/services/planesService";
import Footer from "@/components/Footer.vue";
import Icon from "@/components/Icon.vue";
import { Button } from "@/components/ui/button";
import { push } from "notivue";

// ── Types ────────────────────────────────────────────────────────────
type FrequencyType = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'custom';
type IntervalUnit  = 'days' | 'weeks' | 'months';

interface Periodo {
  id: number;
  nombre: string;
  descripcion: string | null;
  tiempo: number | null;
}

interface Plan {
  id: number;
  nombre: string | null;
  total: number | null;
  interes: number | null;
  mora: number | null;
  periodo_id: number | null;
  cuota: number | null;
  capital: number | null;
  periodo: Periodo | null;
}

// ── Frequency options (UI) ────────────────────────────────────────────
const FREQUENCY_OPTIONS = [
  { key: 'daily',    label: 'Diario',         icon: 'Sun',           subtitle: 'cada día'     },
  { key: 'weekly',   label: 'Semanal',         icon: 'CalendarDays',  subtitle: 'cada 7 días'  },
  { key: 'biweekly', label: 'Quincenal',       icon: 'CalendarRange', subtitle: 'cada 15 días' },
  { key: 'monthly',  label: 'Mensual',         icon: 'Calendar',      subtitle: 'cada mes'     },
  { key: 'custom',   label: 'Personalizado',   icon: 'Settings2',     subtitle: 'configura tú' },
] as const;

// ── Presets por frecuencia ────────────────────────────────────────────
// Decisión Quincenal: 15 días (no 2 semanas), por coherencia con el mercado GT donde
// "quincena" = días 1–15 y 16–30 del mes, sin importar semanas.
const FREQUENCY_PRESETS: Record<Exclude<FrequencyType, 'custom'>, { interval_value: number; interval_unit: IntervalUnit }> = {
  daily:    { interval_value: 1,  interval_unit: 'days'   },
  weekly:   { interval_value: 1,  interval_unit: 'weeks'  },
  biweekly: { interval_value: 15, interval_unit: 'days'   },
  monthly:  { interval_value: 1,  interval_unit: 'months' },
};

const UNIT_OPTIONS: { key: IntervalUnit; label: string; labelSingular: string }[] = [
  { key: 'days',   label: 'Días',    labelSingular: 'día'    },
  { key: 'weeks',  label: 'Semanas', labelSingular: 'semana' },
  { key: 'months', label: 'Meses',   labelSingular: 'mes'    },
];

// ── State ─────────────────────────────────────────────────────────────
const planes   = ref<Plan[]>([]);
const loading  = ref(true);
const searchQuery  = ref("");
const currentPage  = ref(1);
const itemsPerPage = 10;

// Modal state
const showModal       = ref(false);
const showDeleteModal  = ref(false);
const saving          = ref(false);
const isEditing       = ref(false);
const editingId       = ref<number | null>(null);
const deletingPlan    = ref<Plan | null>(null);
const formErrors      = ref<Record<string, string>>({});
const cuotaManual     = ref(false);

const formData = ref({
  nombre:         "",
  total:          null as number | null,
  interes:        null as number | null,
  mora:           null as number | null,
  // ── Periodicidad ──────────────────────────────
  frequency_type: null as FrequencyType | null,
  interval_value: 1    as number,
  interval_unit:  'days' as IntervalUnit,
  // ─────────────────────────────────────────────
  cuota:   null as number | null,
  capital: null as number | null,
});

// ── Watch: aplicar preset al elegir frecuencia fija ──────────────────
watch(
  () => formData.value.frequency_type,
  (ft) => {
    if (!ft || ft === 'custom') return;
    const preset = FREQUENCY_PRESETS[ft];
    formData.value.interval_value = preset.interval_value;
    formData.value.interval_unit  = preset.interval_unit;
    delete formErrors.value.frequency_type;
    delete formErrors.value.interval_value;
    delete formErrors.value.interval_unit;
  }
);

// ── Computed: días del intervalo ──────────────────────────────────────
const intervaloDias = computed((): number | null => {
  const val  = formData.value.interval_value;
  const unit = formData.value.interval_unit;
  if (!val || val < 1 || !formData.value.frequency_type) return null;
  if (unit === 'days')   return val;
  if (unit === 'weeks')  return val * 7;
  if (unit === 'months') return val * 30;
  return null;
});

// ── Computed: vista previa textual en tiempo real ─────────────────────
const periodicidadLabel = computed((): string | null => {
  const val  = formData.value.interval_value;
  const unit = formData.value.interval_unit;
  const ft   = formData.value.frequency_type;
  if (!ft || !val || val < 1) return null;
  const u = UNIT_OPTIONS.find(o => o.key === unit);
  const unitLabel = val === 1 ? u?.labelSingular : u?.label;
  return `Este plan cobra cada ${val} ${unitLabel}`;
});

// ── Auto-calculate cuota when capital + total + interes change ────────
watch(
  () => [formData.value.capital, formData.value.total, formData.value.interes],
  () => {
    if (!cuotaManual.value) {
      formData.value.cuota = cuotaSugerida.value;
    }
  }
);

const cuotaSugerida = computed((): number | null => {
  const cap = formData.value.capital;
  const tot = formData.value.total;
  if (!cap || !tot || tot <= 0) return null;
  const rate = (formData.value.interes || 0) / 100;
  return Math.round(((cap * (1 + rate)) / tot) * 100) / 100;
});

// ── Preview computeds ─────────────────────────────────────────────────
const totalACobrar = computed((): number | null => {
  const c = formData.value.cuota;
  const t = formData.value.total;
  if (!c || !t) return null;
  return Math.round(c * t * 100) / 100;
});

const interesTotal = computed((): number | null => {
  const cap   = formData.value.capital;
  const total = totalACobrar.value;
  if (!cap || !total) return null;
  return Math.round((total - cap) * 100) / 100;
});

const fechaFin = computed((): Date | null => {
  const dias = intervaloDias.value;
  const tot  = formData.value.total;
  if (!dias || !tot) return null;
  const d = new Date();
  d.setDate(d.getDate() + dias * tot);
  return d;
});

const duracionLabel = computed((): string => {
  const dias = intervaloDias.value;
  const tot  = formData.value.total;
  if (!dias || !tot) return "—";
  const totalDias = dias * tot;
  if (totalDias < 30)  return `${totalDias} días`;
  if (totalDias < 365) return `${(totalDias / 30).toFixed(1)} meses`;
  return `${(totalDias / 365).toFixed(1)} años`;
});

const nextPayments = computed(() => {
  const dias  = intervaloDias.value;
  const cuota = formData.value.cuota;
  const tot   = formData.value.total;
  if (!dias || !cuota || !tot) return [];
  const rows = [];
  const base = new Date();
  for (let i = 1; i <= Math.min(3, tot); i++) {
    const d = new Date(base);
    d.setDate(d.getDate() + dias * i);
    rows.push({ num: i, fecha: d, monto: cuota });
  }
  return rows;
});

const hasPreview = computed(() =>
  !!(formData.value.capital && formData.value.total && formData.value.cuota &&
     formData.value.frequency_type && intervaloDias.value)
);

// ── Validation ────────────────────────────────────────────────────────
const validateForm = (): boolean => {
  const errs: Record<string, string> = {};
  if (!formData.value.nombre.trim())
    errs.nombre = "El nombre es obligatorio";
  if (!formData.value.frequency_type)
    errs.frequency_type = "Selecciona una frecuencia de cobro";
  if (!formData.value.interval_value || formData.value.interval_value < 1)
    errs.interval_value = "El intervalo debe ser al menos 1";
  if (!formData.value.total || formData.value.total < 1)
    errs.total = "Debe ser al menos 1 cuota";
  if (!formData.value.capital || formData.value.capital <= 0)
    errs.capital = "El capital debe ser mayor a 0";
  if (!formData.value.cuota || formData.value.cuota <= 0)
    errs.cuota = "La cuota debe ser mayor a 0";
  if (formData.value.interes !== null && (formData.value.interes < 0 || formData.value.interes > 100))
    errs.interes = "Debe estar entre 0% y 100%";
  if (formData.value.mora !== null && (formData.value.mora < 0 || formData.value.mora > 100))
    errs.mora = "Debe estar entre 0% y 100%";
  formErrors.value = errs;
  return Object.keys(errs).length === 0;
};

const fmtDate = (d: Date) =>
  d.toLocaleDateString("es-GT", { day: "2-digit", month: "short", year: "numeric" });

// ── Data loading ──────────────────────────────────────────────────────
const loadPlanes = async () => {
  try {
    planes.value = await planesService.getAll();
  } catch {
    push.error("Error al cargar los planes");
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadPlanes();
});

// ── Filtering / pagination ────────────────────────────────────────────
const filteredPlanes = computed(() => {
  if (!searchQuery.value) return planes.value;
  const q = searchQuery.value.toLowerCase();
  return planes.value.filter((p) => {
    const nombre  = (p.nombre || "").toLowerCase();
    const periodo = (p.periodo?.nombre || "").toLowerCase();
    return nombre.includes(q) || periodo.includes(q);
  });
});

const totalPages = computed(() => Math.ceil(filteredPlanes.value.length / itemsPerPage));

const paginatedPlanes = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  return filteredPlanes.value.slice(start, start + itemsPerPage);
});

// ── Form helpers ──────────────────────────────────────────────────────
const resetForm = () => {
  formData.value = {
    nombre:         "",
    total:          null,
    interes:        null,
    mora:           null,
    frequency_type: null,
    interval_value: 1,
    interval_unit:  'days',
    cuota:          null,
    capital:        null,
  };
  formErrors.value = {};
  cuotaManual.value = false;
  isEditing.value   = false;
  editingId.value   = null;
};

// Reverse-map periodo existente a la nueva estructura al editar
const inferFrequency = (plan: Plan): { frequency_type: FrequencyType; interval_value: number; interval_unit: IntervalUnit } => {
  const dias = plan.periodo?.tiempo ?? null;
  if (!dias || dias === 1)  return { frequency_type: 'daily',    interval_value: 1,    interval_unit: 'days'   };
  if (dias === 7)           return { frequency_type: 'weekly',   interval_value: 1,    interval_unit: 'weeks'  };
  if (dias === 15)          return { frequency_type: 'biweekly', interval_value: 15,   interval_unit: 'days'   };
  if (dias === 30)          return { frequency_type: 'monthly',  interval_value: 1,    interval_unit: 'months' };
  return                           { frequency_type: 'custom',   interval_value: dias, interval_unit: 'days'   };
};

const openCreateModal = () => {
  resetForm();
  showModal.value = true;
};

const openEditModal = (plan: Plan) => {
  isEditing.value  = true;
  editingId.value  = plan.id;
  cuotaManual.value = true;
  const freq = inferFrequency(plan);
  formData.value = {
    nombre:         plan.nombre || "",
    total:          plan.total,
    interes:        plan.interes,
    mora:           plan.mora,
    frequency_type: freq.frequency_type,
    interval_value: freq.interval_value,
    interval_unit:  freq.interval_unit,
    cuota:          plan.cuota,
    capital:        plan.capital,
  };
  formErrors.value = {};
  showModal.value = true;
};

const openDeleteModal = (plan: Plan) => {
  deletingPlan.value = plan;
  showDeleteModal.value = true;
};

// ── Payload builder ───────────────────────────────────────────────────
// Envía los 3 campos nuevos al backend.
// periodo_id se manda null; el backend debe consumir frequency_type/interval_value/interval_unit.
// Si el backend aún requiere periodo_id, agregar lógica de búsqueda por tiempo aquí.
const buildPayload = () => ({
  nombre:         formData.value.nombre,
  total:          formData.value.total,
  interes:        formData.value.interes,
  mora:           formData.value.mora,
  cuota:          formData.value.cuota,
  capital:        formData.value.capital,
  frequency_type: formData.value.frequency_type,
  interval_value: formData.value.interval_value,
  interval_unit:  formData.value.interval_unit,
  periodo_id:     null, // legacy — backend debe migrar a los campos de arriba
});

const handleSubmit = async () => {
  if (!validateForm()) return;
  saving.value = true;
  try {
    const payload = buildPayload();
    if (isEditing.value && editingId.value) {
      await planesService.update(editingId.value, payload);
      push.success("Plan actualizado exitosamente");
    } else {
      await planesService.create(payload);
      push.success("Plan creado exitosamente");
    }
    showModal.value = false;
    resetForm();
    loading.value = true;
    await loadPlanes();
  } catch (error: any) {
    push.error(error.response?.data?.detail || "Error al guardar el plan");
  } finally {
    saving.value = false;
  }
};

const handleDelete = async () => {
  if (!deletingPlan.value) return;
  try {
    await planesService.remove(deletingPlan.value.id);
    push.success("Plan eliminado exitosamente");
    showDeleteModal.value = false;
    deletingPlan.value = null;
    loading.value = true;
    await loadPlanes();
  } catch (error: any) {
    push.error(error.response?.data?.detail || "Error al eliminar el plan");
  }
};

// ── Formatting ────────────────────────────────────────────────────────
const formatCurrency = (val: number | null) => {
  if (val == null) return "—";
  return `Q${val.toLocaleString("es-GT", { minimumFractionDigits: 2 })}`;
};

const formatPercent = (val: number | null) => {
  if (val == null) return "—";
  return `${val}%`;
};

// ── Periodo badge colors (table display — kept for backward compat) ───
const periodoColors: Record<string, string> = {
  Diario:    "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400",
  Semanal:   "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400",
  Semana:    "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400",
  Quincena:  "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
  Quincenal: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
  "15 días": "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
  Mensual:   "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
  "Un mes":  "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
  Mes:       "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
  Anual:     "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400",
  "Un año":  "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400",
  Año:       "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400",
};

const getPeriodoClass = (nombre: string | null | undefined) => {
  if (!nombre) return "bg-gray-100 text-gray-600 dark:bg-gray-500/10 dark:text-gray-400";
  return periodoColors[nombre] || "bg-gray-100 text-gray-600 dark:bg-gray-500/10 dark:text-gray-400";
};

// ── Summary cards ─────────────────────────────────────────────────────
const summaryCards = computed(() => {
  const total = planes.value.length;
  const avgInteres = total > 0
    ? planes.value.reduce((sum, p) => sum + (p.interes || 0), 0) / total : 0;
  const avgMora = total > 0
    ? planes.value.reduce((sum, p) => sum + (p.mora || 0), 0) / total : 0;
  const periodoSet = new Set(planes.value.map((p) => p.periodo?.nombre).filter(Boolean));

  return [
    { label: "Total Planes",      value: total,                      icon: "FileText",     gradient: "from-blue-500 to-indigo-600",  bgGlow: "bg-blue-500/10"   },
    { label: "Interés Promedio",  value: `${avgInteres.toFixed(1)}%`, icon: "TrendingUp",  gradient: "from-emerald-500 to-teal-600", bgGlow: "bg-emerald-500/10" },
    { label: "Mora Promedio",     value: `${avgMora.toFixed(1)}%`,    icon: "AlertTriangle",gradient: "from-amber-500 to-orange-600", bgGlow: "bg-amber-500/10"  },
    { label: "Periodos Usados",   value: periodoSet.size,             icon: "Calendar",    gradient: "from-purple-500 to-pink-600",  bgGlow: "bg-purple-500/10" },
  ];
});
</script>

<template>
  <div class="grid grid-cols-12 mt-2 mb-6 gap-7">
    <!-- Header -->
    <div class="col-span-12">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 class="text-2xl font-bold text-card-foreground">Planes de Préstamo</h2>
          <p class="text-sm text-muted mt-1">Gestión de planes de financiamiento y cuotas</p>
        </div>
        <Button @click="openCreateModal" class="gap-2">
          <Icon name="Plus" :size="18" />
          Nuevo Plan
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
              placeholder="Buscar por nombre o periodo..."
              class="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-background text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
              @input="currentPage = 1"
            />
          </div>
          <span class="text-sm text-muted">
            <strong class="text-card-foreground">{{ filteredPlanes.length }}</strong> planes registrados
          </span>
        </div>
      </div>
    </div>

    <!-- Table -->
    <div class="col-span-12">
      <div v-if="loading" class="p-12 text-center">
        <div class="w-10 h-10 border-4 rounded-full border-border animate-spin border-t-primary mx-auto mb-4"></div>
        <p class="text-sm text-muted">Cargando planes...</p>
      </div>

      <div v-else-if="filteredPlanes.length === 0" class="rounded-xl border border-border bg-card p-12 text-center">
        <Icon name="FileX" :size="48" class="text-muted mx-auto mb-4" />
        <h4 class="text-lg font-semibold text-card-foreground mb-2">No se encontraron planes</h4>
        <p class="text-sm text-muted">Crea un nuevo plan o intenta con otro término de búsqueda</p>
      </div>

      <div v-else class="rounded-xl border border-border bg-card overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-muted/30 border-b border-border">
                <th class="text-left px-5 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider">Plan</th>
                <th class="text-left px-5 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider">Periodo</th>
                <th class="text-right px-5 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider">Cuotas</th>
                <th class="text-right px-5 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider">Capital</th>
                <th class="text-right px-5 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider">Cuota</th>
                <th class="text-right px-5 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider">Interés</th>
                <th class="text-right px-5 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider">Mora</th>
                <th class="text-center px-5 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <tr
                v-for="plan in paginatedPlanes"
                :key="plan.id"
                class="transition-colors hover:bg-hover group"
              >
                <td class="px-5 py-4">
                  <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
                      <Icon name="FileText" :size="16" class="text-white" />
                    </div>
                    <div>
                      <p class="font-semibold text-card-foreground group-hover:text-primary transition-colors">{{ plan.nombre || "Sin nombre" }}</p>
                      <p class="text-xs text-muted">ID: {{ plan.id }}</p>
                    </div>
                  </div>
                </td>
                <td class="px-5 py-4">
                  <span
                    v-if="plan.periodo"
                    :class="[getPeriodoClass(plan.periodo.nombre), 'px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider']"
                  >
                    {{ plan.periodo.nombre }}
                  </span>
                  <span v-else class="text-muted text-xs">—</span>
                </td>
                <td class="px-5 py-4 text-right font-medium text-card-foreground">{{ plan.total ?? "—" }}</td>
                <td class="px-5 py-4 text-right font-medium text-card-foreground">{{ formatCurrency(plan.capital) }}</td>
                <td class="px-5 py-4 text-right font-medium text-card-foreground">{{ formatCurrency(plan.cuota) }}</td>
                <td class="px-5 py-4 text-right">
                  <span class="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 text-xs font-semibold">
                    {{ formatPercent(plan.interes) }}
                  </span>
                </td>
                <td class="px-5 py-4 text-right">
                  <span class="px-2 py-0.5 rounded-md bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 text-xs font-semibold">
                    {{ formatPercent(plan.mora) }}
                  </span>
                </td>
                <td class="px-5 py-4">
                  <div class="flex gap-1 justify-center">
                    <button
                      @click="openEditModal(plan)"
                      class="p-2 rounded-lg transition-colors hover:bg-amber-50 dark:hover:bg-amber-500/10"
                      title="Editar"
                    >
                      <Icon name="Pencil" :size="15" class="text-muted hover:text-amber-500 transition-colors" />
                    </button>
                    <button
                      @click="openDeleteModal(plan)"
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

  <!-- CREATE / EDIT PLAN MODAL -->
  <Teleport to="body">
    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="fixed inset-0 bg-black/50 backdrop-blur-sm" @click="showModal = false"></div>
      <div class="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">

        <!-- Modal Header -->
        <div class="sticky top-0 z-10 bg-card flex items-center justify-between px-6 py-4 border-b border-border rounded-t-2xl">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow">
              <Icon name="FileText" :size="18" class="text-white" />
            </div>
            <div>
              <h3 class="text-base font-bold text-card-foreground leading-tight">
                {{ isEditing ? "Editar Plan" : "Nuevo Plan de Préstamo" }}
              </h3>
              <p class="text-xs text-muted">{{ isEditing ? "Modifica los datos del plan" : "Configura el plan y revisa la vista previa" }}</p>
            </div>
          </div>
          <button @click="showModal = false" class="p-1.5 rounded-lg hover:bg-hover transition-colors">
            <Icon name="X" :size="18" class="text-muted" />
          </button>
        </div>

        <form @submit.prevent="handleSubmit" class="p-6 space-y-6">

          <!-- ① Nombre -->
          <div>
            <label class="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">Nombre del Plan *</label>
            <input
              v-model="formData.nombre"
              type="text"
              :class="['w-full px-3.5 py-2.5 rounded-xl border bg-background text-sm outline-none transition-colors',
                formErrors.nombre ? 'border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-400' : 'border-border focus:border-primary focus:ring-1 focus:ring-primary']"
              placeholder="Ej: Plan Diario 30 días"
              @input="delete formErrors.nombre"
            />
            <p v-if="formErrors.nombre" class="text-xs text-red-500 mt-1 flex items-center gap-1">
              <Icon name="AlertCircle" :size="12" />{{ formErrors.nombre }}
            </p>
          </div>

          <!-- ② Periodicidad — frecuencia + intervalo -->
          <div>
            <div class="mb-2">
              <label class="block text-xs font-semibold text-muted uppercase tracking-wider">Periodicidad del Plan *</label>
              <p class="text-xs text-muted mt-0.5">¿Con qué frecuencia se cobra cada cuota?</p>
            </div>

            <!-- Frecuencia: 5 botones -->
            <div class="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-3">
              <button
                v-for="opt in FREQUENCY_OPTIONS"
                :key="opt.key"
                type="button"
                :class="['flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl border-2 text-xs font-medium transition-all duration-150 cursor-pointer select-none',
                  formData.frequency_type === opt.key
                    ? 'border-primary bg-primary/5 text-primary shadow-sm scale-[1.02]'
                    : 'border-border bg-background text-card-foreground hover:border-primary/40 hover:bg-hover']"
                @click="formData.frequency_type = opt.key as FrequencyType; delete formErrors.frequency_type"
              >
                <Icon :name="opt.icon" :size="16" />
                <span class="leading-none">{{ opt.label }}</span>
                <span class="text-[9px] opacity-50 font-normal leading-none text-center">{{ opt.subtitle }}</span>
              </button>
            </div>

            <!-- Panel de configuración del intervalo -->
            <div
              v-if="formData.frequency_type"
              class="rounded-xl border border-border bg-muted/20 p-3 space-y-3"
            >
              <!-- Cada N [unidad] -->
              <div class="flex items-center gap-3 flex-wrap">
                <span class="text-xs font-medium text-muted whitespace-nowrap">Cada</span>

                <!-- Input numérico — editable solo en Personalizado -->
                <input
                  v-model.number="formData.interval_value"
                  type="number" min="1" step="1"
                  :disabled="formData.frequency_type !== 'custom'"
                  :class="['w-16 px-2 py-1.5 rounded-lg border text-sm text-center outline-none transition-colors font-semibold',
                    formData.frequency_type !== 'custom'
                      ? 'bg-muted/40 border-border text-muted cursor-not-allowed'
                      : formErrors.interval_value
                        ? 'border-red-400 bg-background focus:ring-1 focus:ring-red-400'
                        : 'border-border bg-background focus:border-primary focus:ring-1 focus:ring-primary']"
                  @input="delete formErrors.interval_value"
                />

                <!-- Toggle de unidad — editable solo en Personalizado -->
                <div class="flex rounded-lg border border-border overflow-hidden">
                  <button
                    v-for="unit in UNIT_OPTIONS"
                    :key="unit.key"
                    type="button"
                    :disabled="formData.frequency_type !== 'custom'"
                    :class="['px-3 py-1.5 text-xs font-medium transition-colors',
                      formData.interval_unit === unit.key
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-background text-card-foreground hover:bg-hover',
                      formData.frequency_type !== 'custom' ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer']"
                    @click="if (formData.frequency_type === 'custom') { formData.interval_unit = unit.key; delete formErrors.interval_unit }"
                  >
                    {{ unit.label }}
                  </button>
                </div>

                <!-- Ayuda contextual para Personalizado -->
                <span v-if="formData.frequency_type === 'custom'" class="text-[10px] text-muted italic">
                  Define la repetición exacta
                </span>
              </div>

              <!-- Vista previa textual en tiempo real -->
              <div
                v-if="periodicidadLabel"
                class="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20 text-xs text-primary font-medium"
              >
                <Icon name="Repeat" :size="12" class="shrink-0" />
                {{ periodicidadLabel }}
              </div>

              <!-- Error de interval_value -->
              <p v-if="formErrors.interval_value" class="text-xs text-red-500 flex items-center gap-1">
                <Icon name="AlertCircle" :size="12" />{{ formErrors.interval_value }}
              </p>
            </div>

            <!-- Error de frecuencia -->
            <p v-if="formErrors.frequency_type" class="text-xs text-red-500 mt-1 flex items-center gap-1">
              <Icon name="AlertCircle" :size="12" />{{ formErrors.frequency_type }}
            </p>
          </div>

          <!-- ③ Cuotas + Capital + Interés + Mora -->
          <div>
            <label class="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">Configuración Financiera</label>
            <div class="grid grid-cols-2 gap-3">
              <!-- Total cuotas -->
              <div>
                <label class="block text-xs text-muted mb-1">Total de Cuotas</label>
                <input
                  v-model.number="formData.total"
                  type="number" min="1" step="1"
                  :class="['w-full px-3 py-2.5 rounded-xl border bg-background text-sm outline-none transition-colors',
                    formErrors.total ? 'border-red-400 focus:border-red-500' : 'border-border focus:border-primary focus:ring-1 focus:ring-primary']"
                  placeholder="Ej: 30"
                  @input="delete formErrors.total"
                />
                <p v-if="formErrors.total" class="text-xs text-red-500 mt-0.5">{{ formErrors.total }}</p>
              </div>

              <!-- Capital -->
              <div>
                <label class="block text-xs text-muted mb-1">Capital (Q)</label>
                <input
                  v-model.number="formData.capital"
                  type="number" step="0.01" min="0"
                  :class="['w-full px-3 py-2.5 rounded-xl border bg-background text-sm outline-none transition-colors',
                    formErrors.capital ? 'border-red-400 focus:border-red-500' : 'border-border focus:border-primary focus:ring-1 focus:ring-primary']"
                  placeholder="0.00"
                  @input="delete formErrors.capital; cuotaManual = false"
                />
                <p v-if="formErrors.capital" class="text-xs text-red-500 mt-0.5">{{ formErrors.capital }}</p>
              </div>

              <!-- Interés -->
              <div>
                <label class="block text-xs text-muted mb-1">Interés (%)</label>
                <div class="relative">
                  <input
                    v-model.number="formData.interes"
                    type="number" step="0.01" min="0" max="100"
                    :class="['w-full pl-3 pr-8 py-2.5 rounded-xl border bg-background text-sm outline-none transition-colors',
                      formErrors.interes ? 'border-red-400' : 'border-border focus:border-primary focus:ring-1 focus:ring-primary']"
                    placeholder="0.00"
                    @input="delete formErrors.interes; cuotaManual = false"
                  />
                  <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">%</span>
                </div>
                <p v-if="formErrors.interes" class="text-xs text-red-500 mt-0.5">{{ formErrors.interes }}</p>
              </div>

              <!-- Mora -->
              <div>
                <label class="block text-xs text-muted mb-1">Mora (%)</label>
                <div class="relative">
                  <input
                    v-model.number="formData.mora"
                    type="number" step="0.01" min="0" max="100"
                    :class="['w-full pl-3 pr-8 py-2.5 rounded-xl border bg-background text-sm outline-none transition-colors',
                      formErrors.mora ? 'border-red-400' : 'border-border focus:border-primary focus:ring-1 focus:ring-primary']"
                    placeholder="0.00"
                    @input="delete formErrors.mora"
                  />
                  <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">%</span>
                </div>
                <p v-if="formErrors.mora" class="text-xs text-red-500 mt-0.5">{{ formErrors.mora }}</p>
              </div>
            </div>
          </div>

          <!-- ④ Cuota — with auto-suggest banner -->
          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="text-xs text-muted">Cuota por Pago (Q)</label>
              <button
                v-if="cuotaSugerida !== null && !cuotaManual"
                type="button"
                class="flex items-center gap-1 text-xs text-primary font-medium hover:underline"
                @click="formData.cuota = cuotaSugerida; cuotaManual = true; delete formErrors.cuota"
              >
                <Icon name="Sparkles" :size="12" />
                Aplicar sugerida: Q{{ cuotaSugerida?.toLocaleString('es-GT', { minimumFractionDigits: 2 }) }}
              </button>
              <button
                v-else-if="cuotaManual && cuotaSugerida !== null"
                type="button"
                class="text-xs text-muted hover:text-primary"
                @click="formData.cuota = cuotaSugerida; cuotaManual = false"
              >
                ↩ Recalcular automático
              </button>
            </div>
            <div
              v-if="cuotaSugerida !== null && formData.cuota !== cuotaSugerida"
              class="mb-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-xs text-blue-700 dark:text-blue-400"
            >
              <Icon name="Info" :size="13" />
              Cuota sugerida (capital + interés ÷ cuotas):
              <strong>Q{{ cuotaSugerida.toLocaleString('es-GT', { minimumFractionDigits: 2 }) }}</strong>
            </div>
            <input
              v-model.number="formData.cuota"
              type="number" step="0.01" min="0"
              :class="['w-full px-3.5 py-2.5 rounded-xl border bg-background text-sm outline-none transition-colors font-medium',
                formErrors.cuota ? 'border-red-400 focus:border-red-500' : 'border-border focus:border-primary focus:ring-1 focus:ring-primary']"
              placeholder="0.00"
              @input="cuotaManual = true; delete formErrors.cuota"
            />
            <p v-if="formErrors.cuota" class="text-xs text-red-500 mt-0.5 flex items-center gap-1">
              <Icon name="AlertCircle" :size="12" />{{ formErrors.cuota }}
            </p>
          </div>

          <!-- ⑤ Preview panel -->
          <div
            v-if="hasPreview"
            class="rounded-xl border border-border bg-muted/20 overflow-hidden"
          >
            <div class="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
              <Icon name="Eye" :size="15" class="text-primary" />
              <span class="text-xs font-semibold text-card-foreground uppercase tracking-wider">Vista Previa del Plan</span>
              <span class="ml-auto text-xs text-muted">Estimado</span>
            </div>
            <div class="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div class="bg-card rounded-lg p-3 border border-border">
                <p class="text-xs text-muted mb-1">Duración</p>
                <p class="text-sm font-bold text-card-foreground">{{ duracionLabel }}</p>
              </div>
              <div class="bg-card rounded-lg p-3 border border-border">
                <p class="text-xs text-muted mb-1">Total Cuotas</p>
                <p class="text-sm font-bold text-card-foreground">{{ formData.total }}</p>
              </div>
              <div class="bg-card rounded-lg p-3 border border-border">
                <p class="text-xs text-muted mb-1">Total a Cobrar</p>
                <p class="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  Q{{ totalACobrar?.toLocaleString('es-GT', { minimumFractionDigits: 2 }) ?? '—' }}
                </p>
              </div>
              <div class="bg-card rounded-lg p-3 border border-border">
                <p class="text-xs text-muted mb-1">Interés Total</p>
                <p :class="['text-sm font-bold', (interesTotal ?? 0) > 0 ? 'text-amber-500' : 'text-muted']">
                  Q{{ interesTotal?.toLocaleString('es-GT', { minimumFractionDigits: 2 }) ?? '0.00' }}
                </p>
              </div>
            </div>

            <!-- Fecha fin + primeros pagos -->
            <div class="px-4 pb-4 space-y-2">
              <div v-if="fechaFin" class="flex items-center gap-2 text-xs text-muted">
                <Icon name="CalendarCheck" :size="13" class="text-primary" />
                Fecha estimada de finalización:
                <strong class="text-card-foreground">{{ fmtDate(fechaFin) }}</strong>
              </div>
              <div v-if="nextPayments.length > 0">
                <p class="text-xs text-muted mb-1.5 flex items-center gap-1">
                  <Icon name="ListOrdered" :size="12" /> Primeros pagos estimados:
                </p>
                <div class="space-y-1">
                  <div
                    v-for="row in nextPayments"
                    :key="row.num"
                    class="flex items-center justify-between px-3 py-1.5 rounded-lg bg-card border border-border text-xs"
                  >
                    <span class="text-muted">Cuota {{ row.num }} — {{ fmtDate(row.fecha) }}</span>
                    <span class="font-semibold text-card-foreground">
                      Q{{ row.monto.toLocaleString('es-GT', { minimumFractionDigits: 2 }) }}
                    </span>
                  </div>
                  <p v-if="(formData.total ?? 0) > 3" class="text-xs text-muted text-center pt-0.5">
                    … y {{ (formData.total ?? 0) - 3 }} cuota(s) más
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- No preview yet hint -->
          <div
            v-else
            class="flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed border-border text-xs text-muted"
          >
            <Icon name="LayoutList" :size="16" class="shrink-0" />
            Completa la periodicidad, capital, cuotas y cuota para ver la vista previa del plan.
          </div>

          <!-- Actions -->
          <div class="flex justify-end gap-3 pt-1">
            <Button variant="outline" type="button" @click="showModal = false">Cancelar</Button>
            <Button type="submit" :disabled="saving" class="gap-2 min-w-[130px]">
              <svg v-if="saving" class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <Icon v-else :name="isEditing ? 'Save' : 'Plus'" :size="15" />
              {{ saving ? "Guardando..." : isEditing ? "Guardar Cambios" : "Crear Plan" }}
            </Button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>

  <!-- DELETE CONFIRMATION MODAL -->
  <Teleport to="body">
    <div v-if="showDeleteModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="fixed inset-0 bg-black/50 backdrop-blur-sm" @click="showDeleteModal = false"></div>
      <div class="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md">
        <div class="p-6 text-center">
          <div class="w-14 h-14 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <Icon name="AlertTriangle" :size="28" class="text-red-500" />
          </div>
          <h3 class="text-lg font-bold text-card-foreground mb-2">¿Eliminar plan?</h3>
          <p class="text-sm text-muted mb-1">Estás a punto de eliminar el plan</p>
          <p class="text-sm font-semibold text-card-foreground mb-4">"{{ deletingPlan?.nombre }}"</p>
          <p class="text-xs text-muted mb-6">
            Esta acción no se puede deshacer. Los préstamos asociados podrían verse afectados.
          </p>
          <div class="flex gap-3 justify-center">
            <Button variant="outline" @click="showDeleteModal = false">Cancelar</Button>
            <button
              @click="handleDelete"
              class="px-4 py-2.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors"
            >
              Sí, eliminar
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
