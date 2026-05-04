<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { push } from "notivue";
import Icon from "@/components/Icon.vue";
import { Button } from "@/components/ui/button";
import pagosService, {
  type PreviewPagoResponse,
  type FichaDetalle,
} from "@/services/pagosService";
import type { PreviewLoteResponse, LineaLote, RegistrarLoteResponse } from "@/services/pagosService";

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

// V1.1 payment mode
type PaymentMode = "SINGLE" | "PARTIAL" | "MULTI";
type DistribMode = "AUTO" | "MANUAL";

const paymentMode = ref<PaymentMode>("SINGLE");
const distribMode = ref<DistribMode>("AUTO");

// PARTIAL mode
const partialFichaId = ref<number | null>(null);
const partialMonto = ref<string>("");  // string for input binding

// MULTI mode — selected ficha ids + manual amounts
const multiSelectedIds = ref<Set<number>>(new Set());
const multiMontos = ref<Record<number, string>>({});  // ficha_id -> amount string
const multiMontoTotal = ref<string>("");  // for AUTO mode

// V1.1 preview
const previewLote = ref<PreviewLoteResponse | null>(null);
const loadingPreviewLote = ref(false);
const previewLoteError = ref("");

// ── Computed ───────────────────────────────────────────────────────
const fichaSeleccionada = computed(() =>
  fichas.value.find((f) => f.ficha_id === selectedFichaId.value) ?? null
);

const partialFichaObj = computed(() =>
  fichas.value.find(f => f.ficha_id === partialFichaId.value) ?? null
);

const partialMaxMonto = computed(() => {
  const f = partialFichaObj.value;
  if (!f) return 0;
  const yaP = 0; // monto_pagado not in FichaDetalle — treat as 0 for fresh payment
  return Math.max(0, f.total_estimado - yaP);
});

const multiSelectedFichas = computed(() =>
  fichas.value.filter(f => multiSelectedIds.value.has(f.ficha_id) && f.estado === 0)
);

const multiManualTotal = computed(() => {
  if (distribMode.value !== "MANUAL") return 0;
  return multiSelectedFichas.value.reduce((sum, f) => {
    return sum + (parseFloat(multiMontos.value[f.ficha_id] || "0") || 0);
  }, 0);
});

const canContinueLote = computed(() => {
  if (paymentMode.value === "PARTIAL") {
    const m = parseFloat(partialMonto.value);
    return !!partialFichaId.value && m > 0 && m <= partialMaxMonto.value + 0.05;
  }
  if (paymentMode.value === "MULTI") {
    if (multiSelectedIds.value.size === 0) return false;
    if (distribMode.value === "AUTO") return parseFloat(multiMontoTotal.value) > 0;
    if (distribMode.value === "MANUAL") return multiManualTotal.value > 0;
  }
  return true;
});

const canContinue = computed(() => {
  if (paymentMode.value !== "SINGLE") return canContinueLote.value;
  if (strategy.value === "SPECIFIC_INSTALLMENT") return !!selectedFichaId.value;
  return true;
});

const canConfirm = computed(() => {
  if (paymentMode.value !== "SINGLE") {
    return previewLote.value !== null && !loadingPreviewLote.value && !saving.value;
  }
  return preview.value !== null && !loadingPreview.value && !saving.value;
});

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

const toggleMultiFicha = (fichaId: number) => {
  const s = new Set(multiSelectedIds.value);
  if (s.has(fichaId)) {
    s.delete(fichaId);
    delete multiMontos.value[fichaId];
  } else {
    s.add(fichaId);
  }
  multiSelectedIds.value = s;
};

const buildLoteRequest = () => {
  if (paymentMode.value === "PARTIAL") {
    return {
      prestamo_id: props.prestamoId,
      fecha_efectiva_pago: fechaEfectiva.value,
      metodo_pago: metodoPago.value,
      modo: "PARTIAL" as const,
      aplicaciones: [{ ficha_id: partialFichaId.value!, monto: parseFloat(partialMonto.value) }],
    };
  }
  if (paymentMode.value === "MULTI") {
    if (distribMode.value === "AUTO") {
      return {
        prestamo_id: props.prestamoId,
        fecha_efectiva_pago: fechaEfectiva.value,
        metodo_pago: metodoPago.value,
        modo: "MULTI_AUTO" as const,
        ficha_ids: Array.from(multiSelectedIds.value),
        monto_total: parseFloat(multiMontoTotal.value),
      };
    } else {
      return {
        prestamo_id: props.prestamoId,
        fecha_efectiva_pago: fechaEfectiva.value,
        metodo_pago: metodoPago.value,
        modo: "MULTI_MANUAL" as const,
        aplicaciones: multiSelectedFichas.value.map(f => ({
          ficha_id: f.ficha_id,
          monto: parseFloat(multiMontos.value[f.ficha_id] || "0"),
        })).filter(a => a.monto > 0),
      };
    }
  }
  return null;
};

const fetchPreviewLote = async () => {
  previewLoteError.value = "";
  previewLote.value = null;
  const req = buildLoteRequest();
  if (!req) return;
  loadingPreviewLote.value = true;
  try {
    previewLote.value = await pagosService.previewLote(req);
  } catch (err: any) {
    previewLoteError.value = err.response?.data?.detail || "Error al calcular preview";
  } finally {
    loadingPreviewLote.value = false;
  }
};

const goToStep2Lote = async () => {
  step.value = 2;
  await fetchPreviewLote();
};

const goToStep2 = async () => {
  if (paymentMode.value !== "SINGLE") {
    return goToStep2Lote();
  }
  step.value = 2;
  await fetchPreview();
};

const handleConfirmLote = async () => {
  if (!previewLote.value || saving.value) return;
  saving.value = true;
  const req = buildLoteRequest();
  if (!req) { saving.value = false; return; }
  try {
    const res = await pagosService.registrarLote({ ...req, observaciones: observaciones.value || undefined });
    const total = previewLote.value.total;
    push.success(`Lote registrado — ${res.fichas_procesadas} cuota(s) — Q${total.toFixed(2)}`);
    emit("registered", { pago_id: res.pago_ids[0] ?? 0, prestamo_id: props.prestamoId });
  } catch (err: any) {
    push.error(err.response?.data?.detail || "Error al registrar el lote");
  } finally {
    saving.value = false;
  }
};

const handleConfirm = async () => {
  if (paymentMode.value !== "SINGLE") {
    return handleConfirmLote();
  }
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

// Reset lote state when mode changes
watch(paymentMode, () => {
  partialFichaId.value = null;
  partialMonto.value = "";
  multiSelectedIds.value = new Set();
  multiMontos.value = {};
  multiMontoTotal.value = "";
  previewLote.value = null;
  previewLoteError.value = "";
  step.value = 1;
  // Load fichas for lote modes
  if (paymentMode.value !== "SINGLE" && fichas.value.length === 0) {
    loadFichas();
  }
});

// ── Init ───────────────────────────────────────────────────────────
onMounted(() => {
  if (strategy.value === "SPECIFIC_INSTALLMENT") {
    loadFichas();
  }
});

// suppress unused warning — fichaSeleccionada may be used in future extensions
void fichaSeleccionada;
// suppress unused warning — LineaLote used as type import only
void (null as unknown as LineaLote);
void (null as unknown as RegistrarLoteResponse);
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

      <!-- Mode selector -->
      <div>
        <p class="text-sm font-semibold text-card-foreground mb-3">Tipo de pago</p>
        <div class="grid grid-cols-3 gap-2">
          <button
            v-for="m in [
              { key: 'SINGLE', label: 'Cuota completa', icon: 'CheckCircle' },
              { key: 'PARTIAL', label: 'Pago parcial', icon: 'SplitSquareHorizontal' },
              { key: 'MULTI', label: 'Varias cuotas', icon: 'Layers' },
            ]"
            :key="m.key"
            @click="paymentMode = m.key as any"
            :class="[
              'flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center',
              paymentMode === m.key
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-border/80 hover:bg-hover/50'
            ]"
          >
            <Icon :name="m.icon" :size="16" :class="paymentMode === m.key ? 'text-primary' : 'text-muted'" />
            <span :class="['text-xs font-semibold', paymentMode === m.key ? 'text-primary' : 'text-card-foreground']">{{ m.label }}</span>
          </button>
        </div>
      </div>

      <!-- SINGLE mode: Strategy selector -->
      <div v-if="paymentMode === 'SINGLE'">
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
        <div v-if="strategy === 'SPECIFIC_INSTALLMENT'" class="space-y-2 mt-4">
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

      <!-- PARTIAL mode -->
      <div v-if="paymentMode === 'PARTIAL'" class="space-y-4">
        <div class="space-y-2">
          <p class="text-xs font-semibold text-muted uppercase tracking-wider">Selecciona la cuota</p>
          <div v-if="loadingFichas" class="py-6 flex justify-center">
            <div class="w-7 h-7 border-2 border-border border-t-primary rounded-full animate-spin"></div>
          </div>
          <div v-else class="max-h-52 overflow-y-auto rounded-xl border border-border divide-y divide-border">
            <button
              v-for="f in fichas.filter(f => f.estado === 0)"
              :key="f.ficha_id"
              @click="partialFichaId = f.ficha_id; partialMonto = f.total_estimado.toFixed(2)"
              :class="[
                'w-full flex items-center justify-between px-4 py-3 text-left transition-colors',
                partialFichaId === f.ficha_id ? 'bg-primary/5' : 'hover:bg-hover/50'
              ]"
            >
              <div class="flex items-center gap-3">
                <div :class="['w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold', partialFichaId === f.ficha_id ? 'bg-primary text-primary-foreground' : 'bg-muted/30 text-muted']">
                  {{ f.no_dia }}
                </div>
                <div>
                  <p class="text-xs font-semibold text-card-foreground">Cuota #{{ f.no_dia }}</p>
                  <p class="text-[11px] text-muted">{{ formatDate(f.fecha_programada) }}</p>
                </div>
              </div>
              <p class="text-xs font-bold text-card-foreground">Q{{ f.total_estimado.toFixed(2) }}</p>
            </button>
          </div>
        </div>
        <div v-if="partialFichaId">
          <label class="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
            Monto a pagar <span class="normal-case font-normal">(máx Q{{ partialMaxMonto.toFixed(2) }})</span>
          </label>
          <input
            v-model="partialMonto"
            type="number"
            step="0.01"
            :max="partialMaxMonto"
            min="0.01"
            placeholder="0.00"
            class="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
          />
          <p v-if="parseFloat(partialMonto) < partialMaxMonto - 0.01 && parseFloat(partialMonto) > 0"
            class="text-[11px] text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
            <Icon name="Info" :size="11" /> Pago parcial — quedará saldo pendiente en esta cuota
          </p>
        </div>
      </div>

      <!-- MULTI mode -->
      <div v-if="paymentMode === 'MULTI'" class="space-y-4">
        <!-- Distribution mode toggle -->
        <div class="flex gap-2">
          <button
            v-for="d in [{ key: 'AUTO', label: 'Automático' }, { key: 'MANUAL', label: 'Manual' }]"
            :key="d.key"
            @click="distribMode = d.key as any"
            :class="[
              'flex-1 py-2 rounded-lg text-xs font-semibold border-2 transition-all',
              distribMode === d.key ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted hover:border-border/80'
            ]"
          >{{ d.label }}</button>
        </div>

        <!-- AUTO total input -->
        <div v-if="distribMode === 'AUTO'">
          <label class="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">Monto total a distribuir (Q)</label>
          <input
            v-model="multiMontoTotal"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="0.00"
            class="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
          />
          <p class="text-[11px] text-muted mt-1">Se distribuirá de la cuota más antigua a la más reciente.</p>
        </div>

        <!-- Ficha checkboxes -->
        <div class="space-y-1.5">
          <p class="text-xs font-semibold text-muted uppercase tracking-wider">
            Cuotas a incluir
            <span class="normal-case font-normal">({{ multiSelectedIds.size }} seleccionadas)</span>
          </p>
          <div v-if="loadingFichas" class="py-6 flex justify-center">
            <div class="w-7 h-7 border-2 border-border border-t-primary rounded-full animate-spin"></div>
          </div>
          <div v-else class="max-h-48 overflow-y-auto rounded-xl border border-border divide-y divide-border">
            <div
              v-for="f in fichas.filter(f => f.estado === 0)"
              :key="f.ficha_id"
              class="flex items-center gap-3 px-4 py-3"
            >
              <button
                @click="toggleMultiFicha(f.ficha_id)"
                :class="[
                  'w-5 h-5 rounded flex items-center justify-center border-2 transition-all flex-shrink-0',
                  multiSelectedIds.has(f.ficha_id) ? 'bg-primary border-primary' : 'border-border'
                ]"
              >
                <Icon v-if="multiSelectedIds.has(f.ficha_id)" name="Check" :size="11" class="text-white" />
              </button>
              <div class="flex-1 min-w-0">
                <p class="text-xs font-semibold text-card-foreground">Cuota #{{ f.no_dia }} — {{ formatDate(f.fecha_programada) }}</p>
                <p class="text-[11px] text-muted">Q{{ f.total_estimado.toFixed(2) }}</p>
              </div>
              <!-- Manual amount input per ficha -->
              <input
                v-if="distribMode === 'MANUAL' && multiSelectedIds.has(f.ficha_id)"
                v-model="multiMontos[f.ficha_id]"
                type="number"
                step="0.01"
                :max="f.total_estimado"
                min="0.01"
                placeholder="0.00"
                class="w-24 px-2 py-1.5 rounded-lg border border-border bg-background text-xs focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                @click.stop
              />
              <p v-else-if="distribMode === 'MANUAL' && !multiSelectedIds.has(f.ficha_id)" class="text-xs text-muted w-24 text-right">—</p>
            </div>
          </div>
        </div>

        <!-- Manual total display -->
        <div v-if="distribMode === 'MANUAL' && multiSelectedIds.size > 0" class="flex justify-between items-center px-1">
          <span class="text-xs text-muted">Total manual</span>
          <span class="text-sm font-bold text-card-foreground">Q{{ multiManualTotal.toFixed(2) }}</span>
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

      <!-- V1.1 LOTE preview -->
      <template v-if="paymentMode !== 'SINGLE'">
        <div v-if="loadingPreviewLote" class="flex items-center gap-3 py-4 px-4 rounded-xl bg-muted/20 border border-border">
          <div class="w-5 h-5 border-2 border-border border-t-primary rounded-full animate-spin flex-shrink-0"></div>
          <p class="text-sm text-muted">Calculando distribución...</p>
        </div>
        <div v-else-if="previewLoteError" class="flex items-start gap-3 p-4 rounded-xl bg-red-500/5 border border-red-500/20">
          <Icon name="AlertCircle" :size="16" class="text-red-500 mt-0.5 flex-shrink-0" />
          <p class="text-sm text-red-600 dark:text-red-400">{{ previewLoteError }}</p>
        </div>
        <div v-else-if="previewLote" class="rounded-xl border border-border overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-xs">
              <thead>
                <tr class="bg-muted/30 border-b border-border">
                  <th class="text-left px-3 py-2 font-semibold text-muted uppercase tracking-wider">#</th>
                  <th class="text-left px-3 py-2 font-semibold text-muted uppercase tracking-wider hidden sm:table-cell">Fecha</th>
                  <th class="text-right px-3 py-2 font-semibold text-muted uppercase tracking-wider">Total</th>
                  <th class="text-right px-3 py-2 font-semibold text-muted uppercase tracking-wider">Aplicar</th>
                  <th class="text-right px-3 py-2 font-semibold text-muted uppercase tracking-wider hidden sm:table-cell">Pendiente</th>
                  <th class="text-center px-3 py-2 font-semibold text-muted uppercase tracking-wider">Estado</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border">
                <tr v-for="l in previewLote.lineas" :key="l.ficha_id">
                  <td class="px-3 py-2 font-bold text-card-foreground">#{{ l.no_dia }}</td>
                  <td class="px-3 py-2 text-muted hidden sm:table-cell">{{ formatDate(l.fecha_programada) }}</td>
                  <td class="px-3 py-2 text-right text-card-foreground">Q{{ l.total_ficha.toFixed(2) }}</td>
                  <td class="px-3 py-2 text-right font-bold text-primary">Q{{ l.monto_aplicar.toFixed(2) }}</td>
                  <td class="px-3 py-2 text-right text-muted hidden sm:table-cell">
                    {{ l.pendiente_restante > 0 ? `Q${l.pendiente_restante.toFixed(2)}` : '—' }}
                  </td>
                  <td class="px-3 py-2 text-center">
                    <span :class="[
                      'text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase',
                      l.nuevo_estado === 1 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' :
                      l.nuevo_estado === 2 ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' :
                      'bg-muted text-muted'
                    ]">
                      {{ l.nuevo_estado === 1 ? 'Pagado' : l.nuevo_estado === 2 ? 'Parcial' : 'Pendiente' }}
                    </span>
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr class="bg-muted/20 border-t-2 border-border">
                  <td colspan="3" class="px-3 py-2 text-right text-xs font-semibold text-muted">Total a cobrar</td>
                  <td class="px-3 py-2 text-right font-bold text-xl text-primary">Q{{ previewLote.total.toFixed(2) }}</td>
                  <td colspan="2"></td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div v-if="previewLote.impacto_caja" class="flex items-center gap-1.5 px-4 py-2 border-t border-border">
            <Icon name="Landmark" :size="12" class="text-emerald-500" />
            <span class="text-[11px] text-emerald-600 dark:text-emerald-400">Impacta caja física</span>
          </div>
        </div>
      </template>

      <!-- SINGLE mode preview -->
      <template v-if="paymentMode === 'SINGLE'">
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
      </template>
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
