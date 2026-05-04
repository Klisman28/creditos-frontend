<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { push } from "notivue";
import Icon from "@/components/Icon.vue";
import { Button } from "@/components/ui/button";
import pagosService, {
  type PreviewPagoResponse,
  type FichaDetalle,
} from "@/services/pagosService";

// ── Props / Emits ──────────────────────────────────────────────────
const props = defineProps<{
  prestamoId: number;
  fichaId?: number | null;
  clienteNombre?: string;
}>();

const emit = defineEmits<{
  close: [];
  registered: [payload: { pago_id: number; prestamo_id: number }];
}>();

// ── State ──────────────────────────────────────────────────────────
type Strategy = "OLDEST_DUE" | "NEXT_INSTALLMENT" | "SPECIFIC_INSTALLMENT";
type Step = 1 | 2;

const step = ref<Step>(1);
const strategy = ref<Strategy>(props.fichaId ? "SPECIFIC_INSTALLMENT" : "OLDEST_DUE");
const selectedFichaId = ref<number | null>(props.fichaId ?? null);

const fechaHoy = new Date().toISOString().split("T")[0];
const fechaEfectiva = ref(fechaHoy);
const metodoPago = ref("CASH");
const observaciones = ref("");

const fichas = ref<FichaDetalle[]>([]);
const loadingFichas = ref(false);

const preview = ref<PreviewPagoResponse | null>(null);
const loadingPreview = ref(false);
const previewError = ref("");

const saving = ref(false);

let previewTimer: ReturnType<typeof setTimeout> | null = null;

// ── Computed ───────────────────────────────────────────────────────
const fichaSeleccionada = computed(() =>
  fichas.value.find((f) => f.ficha_id === selectedFichaId.value) ?? null
);

const canContinue = computed(() => {
  if (strategy.value === "SPECIFIC_INSTALLMENT") return !!selectedFichaId.value;
  return true;
});

const canConfirm = computed(() => preview.value !== null && !loadingPreview.value && !saving.value);

const clasificacionLabel = computed(() => {
  const map: Record<string, string> = {
    PAGO_ADELANTADO: "Pago adelantado",
    PAGO_A_TIEMPO: "Pago a tiempo",
    PAGO_CON_ATRASO: "Pago con atraso",
  };
  return map[preview.value?.clasificacion ?? ""] ?? preview.value?.clasificacion ?? "";
});

const clasificacionClass = computed(() => {
  const map: Record<string, string> = {
    PAGO_ADELANTADO: "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
    PAGO_A_TIEMPO: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    PAGO_CON_ATRASO: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400",
  };
  return map[preview.value?.clasificacion ?? ""] ?? "bg-muted text-muted";
});

// ── Methods ────────────────────────────────────────────────────────
const formatMoney = (v: number | null | undefined) => {
  if (v == null) return "Q0.00";
  return `Q${v.toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDate = (s: string | null) => {
  if (!s) return "—";
  return new Date(s + "T00:00:00").toLocaleDateString("es-GT", { day: "2-digit", month: "short", year: "numeric" });
};

const loadFichas = async () => {
  loadingFichas.value = true;
  try {
    const res = await pagosService.getFichasPorPrestamo(props.prestamoId);
    fichas.value = res.fichas;
  } catch {
    push.error("No se pudo cargar el calendario de cuotas");
  } finally {
    loadingFichas.value = false;
  }
};

const fetchPreview = async () => {
  previewError.value = "";
  if (strategy.value === "SPECIFIC_INSTALLMENT" && !selectedFichaId.value) return;

  loadingPreview.value = true;
  try {
    preview.value = await pagosService.previewPago({
      prestamo_id: props.prestamoId,
      strategy: strategy.value,
      ficha_pago_id: selectedFichaId.value ?? undefined,
      fecha_efectiva_pago: fechaEfectiva.value,
      metodo_pago: metodoPago.value,
    });
  } catch (err: any) {
    previewError.value = err.response?.data?.detail || "Error al calcular el preview";
    preview.value = null;
  } finally {
    loadingPreview.value = false;
  }
};

const scheduleFetchPreview = () => {
  if (previewTimer) clearTimeout(previewTimer);
  previewTimer = setTimeout(fetchPreview, 500);
};

const goToStep2 = async () => {
  step.value = 2;
  await fetchPreview();
};

const handleConfirm = async () => {
  if (!preview.value || saving.value) return;
  saving.value = true;
  try {
    const res = await pagosService.registrarPago({
      prestamo_id: props.prestamoId,
      strategy: strategy.value,
      ficha_pago_id: selectedFichaId.value ?? undefined,
      fecha_efectiva_pago: fechaEfectiva.value,
      monto: preview.value.total,
      metodo_pago: metodoPago.value,
      observaciones: observaciones.value || undefined,
    });
    push.success(`Pago registrado — ${clasificacionLabel.value} — ${formatMoney(res.total_pagado)}`);
    emit("registered", { pago_id: res.pago_id, prestamo_id: props.prestamoId });
  } catch (err: any) {
    push.error(err.response?.data?.detail || "Error al registrar el pago");
  } finally {
    saving.value = false;
  }
};

// ── Watchers ───────────────────────────────────────────────────────
watch(strategy, (val) => {
  selectedFichaId.value = null;
  preview.value = null;
  if (val === "SPECIFIC_INSTALLMENT" && fichas.value.length === 0) {
    loadFichas();
  }
});

watch(fechaEfectiva, scheduleFetchPreview);
watch(metodoPago, scheduleFetchPreview);

// ── Init ───────────────────────────────────────────────────────────
onMounted(() => {
  if (strategy.value === "SPECIFIC_INSTALLMENT") {
    loadFichas();
  }
});

// suppress unused warning — fichaSeleccionada may be used in future extensions
void fichaSeleccionada;
</script>

<template>
  <div class="bg-card w-full max-w-2xl rounded-2xl shadow-2xl border border-border overflow-hidden">

    <!-- Header -->
    <div class="flex items-center justify-between px-6 py-5 border-b border-border">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
          <Icon name="Receipt" :size="18" class="text-primary" />
        </div>
        <div>
          <h3 class="text-base font-bold text-card-foreground">Registrar Pago</h3>
          <p v-if="clienteNombre" class="text-xs text-muted">{{ clienteNombre }} — Préstamo #{{ prestamoId }}</p>
          <p v-else class="text-xs text-muted">Préstamo #{{ prestamoId }}</p>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <!-- Step indicator -->
        <div class="flex items-center gap-1.5">
          <div :class="['w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all', step === 1 ? 'bg-primary text-primary-foreground' : 'bg-emerald-500 text-white']">
            <Icon v-if="step > 1" name="Check" :size="12" />
            <span v-else>1</span>
          </div>
          <div class="w-8 h-px bg-border"></div>
          <div :class="['w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all', step === 2 ? 'bg-primary text-primary-foreground' : 'bg-border text-muted']">2</div>
        </div>
        <button @click="emit('close')" class="p-1.5 rounded-lg hover:bg-hover transition-colors">
          <Icon name="X" :size="16" class="text-muted" />
        </button>
      </div>
    </div>

    <!-- Step 1: Selección de estrategia y cuota -->
    <div v-if="step === 1" class="p-6 space-y-5">

      <!-- Strategy selector -->
      <div>
        <p class="text-sm font-semibold text-card-foreground mb-3">¿Qué cuota deseas pagar?</p>
        <div class="space-y-2">
          <button
            v-for="opt in [
              { value: 'OLDEST_DUE', label: 'Cuota más antigua pendiente', desc: 'Paga la cuota vencida más antigua (recomendado)', icon: 'AlertCircle' },
              { value: 'NEXT_INSTALLMENT', label: 'Próxima cuota', desc: 'Paga la cuota programada más próxima', icon: 'Calendar' },
              { value: 'SPECIFIC_INSTALLMENT', label: 'Cuota específica', desc: 'Elige una cuota del calendario', icon: 'ListChecks' },
            ]"
            :key="opt.value"
            @click="strategy = opt.value as Strategy"
            :class="[
              'w-full flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all text-left',
              strategy === opt.value
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-border/80 hover:bg-hover/50'
            ]"
          >
            <div :class="['w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', strategy === opt.value ? 'bg-primary/10' : 'bg-muted/30']">
              <Icon :name="opt.icon" :size="16" :class="strategy === opt.value ? 'text-primary' : 'text-muted'" />
            </div>
            <div class="flex-1 min-w-0">
              <p :class="['text-sm font-semibold', strategy === opt.value ? 'text-primary' : 'text-card-foreground']">{{ opt.label }}</p>
              <p class="text-xs text-muted">{{ opt.desc }}</p>
            </div>
            <div :class="['w-4 h-4 rounded-full border-2 flex-shrink-0 transition-all', strategy === opt.value ? 'border-primary bg-primary' : 'border-border']">
              <div v-if="strategy === opt.value" class="w-full h-full rounded-full bg-white scale-50"></div>
            </div>
          </button>
        </div>
      </div>

      <!-- Ficha list for SPECIFIC_INSTALLMENT -->
      <div v-if="strategy === 'SPECIFIC_INSTALLMENT'" class="space-y-2">
        <p class="text-xs font-semibold text-muted uppercase tracking-wider">Selecciona una cuota</p>
        <div v-if="loadingFichas" class="py-8 flex justify-center">
          <div class="w-8 h-8 border-2 border-border border-t-primary rounded-full animate-spin"></div>
        </div>
        <div v-else class="max-h-56 overflow-y-auto rounded-xl border border-border divide-y divide-border">
          <button
            v-for="f in fichas.filter(f => f.estado === 0)"
            :key="f.ficha_id"
            @click="selectedFichaId = f.ficha_id"
            :class="[
              'w-full flex items-center justify-between px-4 py-3 text-left transition-colors',
              selectedFichaId === f.ficha_id ? 'bg-primary/5' : 'hover:bg-hover/50'
            ]"
          >
            <div class="flex items-center gap-3">
              <div :class="['w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0', selectedFichaId === f.ficha_id ? 'bg-primary text-primary-foreground' : 'bg-muted/30 text-muted']">
                {{ f.no_dia }}
              </div>
              <div>
                <p class="text-xs font-semibold text-card-foreground">Cuota #{{ f.no_dia }}</p>
                <p class="text-[11px] text-muted">{{ formatDate(f.fecha_programada) }}</p>
              </div>
            </div>
            <div class="text-right">
              <p class="text-xs font-bold text-card-foreground">{{ formatMoney(f.total_estimado) }}</p>
              <span :class="['text-[10px] px-1.5 py-0.5 rounded-full font-semibold', f.estado_label === 'Vencido' ? 'bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400' : 'bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400']">
                {{ f.estado_label }}
              </span>
            </div>
          </button>
          <div v-if="fichas.filter(f => f.estado === 0).length === 0" class="py-8 text-center text-sm text-muted">
            No hay cuotas pendientes
          </div>
        </div>
      </div>
    </div>

    <!-- Step 2: Datos del pago + Preview -->
    <div v-if="step === 2" class="p-6 space-y-5">

      <!-- Payment fields -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">Fecha efectiva de pago</label>
          <input
            v-model="fechaEfectiva"
            type="date"
            class="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
          />
        </div>
        <div>
          <label class="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">Método de pago</label>
          <select
            v-model="metodoPago"
            class="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
          >
            <option value="CASH">Efectivo</option>
            <option value="TRANSFER">Transferencia</option>
          </select>
        </div>
      </div>

      <div>
        <label class="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">Observaciones</label>
        <textarea
          v-model="observaciones"
          rows="2"
          placeholder="Opcional..."
          class="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none"
        ></textarea>
      </div>

      <!-- Preview loading -->
      <div v-if="loadingPreview" class="flex items-center gap-3 py-4 px-4 rounded-xl bg-muted/20 border border-border">
        <div class="w-5 h-5 border-2 border-border border-t-primary rounded-full animate-spin flex-shrink-0"></div>
        <p class="text-sm text-muted">Calculando resumen...</p>
      </div>

      <!-- Preview error -->
      <div v-else-if="previewError" class="flex items-start gap-3 p-4 rounded-xl bg-red-500/5 border border-red-500/20">
        <Icon name="AlertCircle" :size="16" class="text-red-500 mt-0.5 flex-shrink-0" />
        <p class="text-sm text-red-600 dark:text-red-400">{{ previewError }}</p>
      </div>

      <!-- Preview summary -->
      <div v-else-if="preview" class="rounded-xl border border-border bg-muted/10 overflow-hidden">
        <!-- Warning cuotas previas -->
        <div v-if="preview.tiene_vencidas_previas" class="flex items-start gap-3 px-4 py-3 bg-amber-500/5 border-b border-amber-500/20">
          <Icon name="AlertTriangle" :size="15" class="text-amber-500 mt-0.5 flex-shrink-0" />
          <p class="text-xs text-amber-700 dark:text-amber-400">
            Hay <strong>{{ preview.cantidad_vencidas_previas }}</strong> cuota{{ preview.cantidad_vencidas_previas > 1 ? 's' : '' }} vencida{{ preview.cantidad_vencidas_previas > 1 ? 's' : '' }} antes de esta.
          </p>
        </div>

        <div class="px-4 py-3 space-y-2">
          <div class="flex justify-between text-sm py-1 border-b border-border/50">
            <span class="text-muted">Cuota objetivo</span>
            <span class="font-semibold text-card-foreground">#{{ preview.no_dia }} — {{ formatDate(preview.fecha_programada) }}</span>
          </div>
          <div class="flex justify-between text-sm py-1 border-b border-border/50">
            <span class="text-muted">Fecha efectiva</span>
            <span class="font-medium text-card-foreground">{{ formatDate(preview.fecha_efectiva_pago) }}</span>
          </div>
          <div class="flex justify-between text-sm py-1 border-b border-border/50">
            <span class="text-muted">Clasificación</span>
            <span :class="['text-[11px] px-2 py-0.5 rounded-full font-bold uppercase', clasificacionClass]">
              {{ clasificacionLabel }}
            </span>
          </div>
          <div class="flex justify-between text-sm py-1 border-b border-border/50">
            <span class="text-muted">Cuota</span>
            <span class="font-medium text-card-foreground">{{ formatMoney(preview.cuota) }}</span>
          </div>
          <div class="flex justify-between text-sm py-1 border-b border-border/50">
            <span class="text-muted">Mora</span>
            <span :class="preview.mora > 0 ? 'font-semibold text-red-500' : 'text-muted'">{{ formatMoney(preview.mora) }}</span>
          </div>
          <div class="flex justify-between text-sm py-1.5">
            <span class="font-bold text-card-foreground">Total a pagar</span>
            <span class="font-bold text-xl text-primary">{{ formatMoney(preview.total) }}</span>
          </div>
          <div v-if="preview.impacto_caja" class="flex items-center gap-1.5 pt-1">
            <Icon name="Landmark" :size="12" class="text-emerald-500" />
            <span class="text-[11px] text-emerald-600 dark:text-emerald-400">Impacta caja física</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/5">
      <button
        v-if="step === 2"
        @click="step = 1; preview = null"
        class="flex items-center gap-2 text-sm text-muted hover:text-card-foreground transition-colors"
      >
        <Icon name="ArrowLeft" :size="15" /> Atrás
      </button>
      <div v-else></div>

      <div class="flex items-center gap-3">
        <button
          @click="emit('close')"
          class="px-4 py-2 rounded-lg text-sm font-medium border border-border hover:bg-hover transition-colors"
        >
          Cancelar
        </button>

        <Button
          v-if="step === 1"
          :disabled="!canContinue"
          @click="goToStep2"
          class="gap-2"
        >
          Continuar <Icon name="ArrowRight" :size="15" />
        </Button>

        <Button
          v-if="step === 2"
          :disabled="!canConfirm"
          @click="handleConfirm"
          class="gap-2 bg-emerald-500 hover:bg-emerald-600"
        >
          <span v-if="saving" class="flex items-center gap-2">
            <Icon name="Loader2" :size="14" class="animate-spin" /> Registrando...
          </span>
          <span v-else class="flex items-center gap-2">
            <Icon name="CheckCircle" :size="15" /> Confirmar pago
          </span>
        </Button>
      </div>
    </div>

  </div>
</template>
