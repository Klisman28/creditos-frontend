<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { push } from "notivue";
import Icon from "@/components/Icon.vue";
import Footer from "@/components/Footer.vue";
import { Button } from "@/components/ui/button";
import cajaService from "@/services/cajaService";
import type {
  CashSession,
  CashMovement,
  CashSummary,
  RecoverySimulation,
  ClosingSimulation,
} from "@/services/cajaService";

// ─── State ────────────────────────────────────────────────────────────

const loading = ref(true);
const activeSession = ref<CashSession | null>(null);
const summary = ref<CashSummary | null>(null);
const movements = ref<CashMovement[]>([]);
const recovery = ref<RecoverySimulation | null>(null);
const closingSim = ref<ClosingSimulation | null>(null);
const activeTab = ref<"movimientos" | "recuperacion" | "cierre">("movimientos");

// ─── Open session form ────────────────────────────────────────────────

const openForm = ref({ monto_apertura: "", observaciones: "" });
const openSaving = ref(false);

// ─── Add movement modal ───────────────────────────────────────────────

const showMovModal = ref(false);
const movForm = ref({ tipo: "INGRESO" as "INGRESO" | "EGRESO", monto: "", descripcion: "" });
const movSaving = ref(false);

// ─── Close session modal ──────────────────────────────────────────────

const showCloseModal = ref(false);
const closeForm = ref({ monto_cierre: "", observaciones: "" });
const closeSaving = ref(false);

// ─── Load data ────────────────────────────────────────────────────────

const loadAll = async () => {
  loading.value = true;
  try {
    const session = await cajaService.getActivaSession();
    activeSession.value = session;

    if (session) {
      const [s, m, r, c] = await Promise.all([
        cajaService.getSummary(session.id),
        cajaService.getMovements(session.id),
        cajaService.getRecoverySimulation(),
        cajaService.getClosingSimulation(session.id),
      ]);
      summary.value = s;
      movements.value = m;
      recovery.value = r;
      closingSim.value = c;
    }
  } catch (e: any) {
    push.error(e.response?.data?.detail || "Error al cargar la caja");
  } finally {
    loading.value = false;
  }
};

onMounted(loadAll);

// ─── Open session ─────────────────────────────────────────────────────

const handleOpenSession = async () => {
  const monto = parseFloat(openForm.value.monto_apertura);
  if (isNaN(monto) || monto < 0) {
    push.error("El monto de apertura debe ser un número válido");
    return;
  }
  openSaving.value = true;
  try {
    await cajaService.openSession({
      monto_apertura: monto,
      observaciones: openForm.value.observaciones || undefined,
    });
    push.success("Caja abierta correctamente");
    openForm.value = { monto_apertura: "", observaciones: "" };
    await loadAll();
  } catch (e: any) {
    push.error(e.response?.data?.detail || "Error al abrir la caja");
  } finally {
    openSaving.value = false;
  }
};

// ─── Add movement ─────────────────────────────────────────────────────

const openMovModal = () => {
  movForm.value = { tipo: "INGRESO", monto: "", descripcion: "" };
  showMovModal.value = true;
};

const handleAddMovement = async () => {
  if (!activeSession.value) return;
  const monto = parseFloat(movForm.value.monto);
  if (isNaN(monto) || monto <= 0) {
    push.error("El monto debe ser mayor a cero");
    return;
  }
  movSaving.value = true;
  try {
    await cajaService.addMovement(activeSession.value.id, {
      tipo: movForm.value.tipo,
      monto,
      descripcion: movForm.value.descripcion || undefined,
    });
    push.success("Movimiento registrado");
    showMovModal.value = false;
    await loadAll();
  } catch (e: any) {
    push.error(e.response?.data?.detail || "Error al registrar movimiento");
  } finally {
    movSaving.value = false;
  }
};

// ─── Close session ────────────────────────────────────────────────────

const openCloseModal = () => {
  closeForm.value = {
    monto_cierre: summary.value?.efectivo_esperado?.toString() ?? "",
    observaciones: "",
  };
  showCloseModal.value = true;
};

const handleCloseSession = async () => {
  if (!activeSession.value) return;
  const monto = parseFloat(closeForm.value.monto_cierre);
  if (isNaN(monto) || monto < 0) {
    push.error("El monto contado debe ser un número válido");
    return;
  }
  closeSaving.value = true;
  try {
    await cajaService.closeSession(activeSession.value.id, {
      monto_cierre: monto,
      observaciones: closeForm.value.observaciones || undefined,
    });
    push.success("Caja cerrada exitosamente");
    showCloseModal.value = false;
    await loadAll();
  } catch (e: any) {
    push.error(e.response?.data?.detail || "Error al cerrar la caja");
  } finally {
    closeSaving.value = false;
  }
};

// ─── Helpers ──────────────────────────────────────────────────────────

const fmt = (val: number | null | undefined) =>
  `Q${(val || 0).toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDatetime = (iso: string | null) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-GT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const fmtDate = (d: string | null) => {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
};

const tipoLabel: Record<string, string> = {
  APERTURA: "Apertura",
  INGRESO: "Ingreso",
  EGRESO: "Egreso",
  PAGO_CREDITO: "Cobro Crédito",
  CIERRE: "Cierre",
};

const tipoColor: Record<string, string> = {
  APERTURA: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  INGRESO: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  EGRESO: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
  PAGO_CREDITO: "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400",
  CIERRE: "bg-muted text-muted-foreground",
};

const tipoIcon: Record<string, string> = {
  APERTURA: "Unlock",
  INGRESO: "TrendingUp",
  EGRESO: "TrendingDown",
  PAGO_CREDITO: "HandCoins",
  CIERRE: "Lock",
};

const diferencia = computed(() => {
  const cierre = parseFloat(closeForm.value.monto_cierre);
  if (!summary.value || isNaN(cierre)) return null;
  return cierre - summary.value.efectivo_esperado;
});

const diferenciaClass = computed(() => {
  if (diferencia.value === null) return "";
  if (diferencia.value === 0) return "text-emerald-600 font-bold";
  if (diferencia.value > 0) return "text-blue-600 font-bold";
  return "text-red-600 font-bold";
});

const movimientosFiltrados = computed(() =>
  movements.value.filter((m) => m.tipo !== "APERTURA" && m.tipo !== "CIERRE")
);
</script>

<template>
  <div class="grid grid-cols-12 mt-2 mb-6 gap-7">

    <!-- ── Loading ──────────────────────────────────────────────────── -->
    <div v-if="loading" class="col-span-12 flex flex-col items-center justify-center py-24">
      <div class="w-10 h-10 border-4 rounded-full border-border animate-spin border-t-primary mb-4"></div>
      <p class="text-sm text-muted">Cargando caja...</p>
    </div>

    <!-- ── SIN SESIÓN ACTIVA ─────────────────────────────────────────── -->
    <template v-else-if="!activeSession">
      <div class="col-span-12">
        <h2 class="text-2xl font-bold text-card-foreground">Caja</h2>
        <p class="text-sm text-muted mt-1">Control de efectivo diario</p>
      </div>

      <div class="col-span-12 flex justify-center">
        <div class="w-full max-w-lg rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <!-- Header -->
          <div class="px-6 pt-8 pb-6 text-center border-b border-border bg-muted/20">
            <div class="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Icon name="Vault" :size="32" class="text-primary" />
            </div>
            <h3 class="text-xl font-bold text-card-foreground">Abrir Caja</h3>
            <p class="text-sm text-muted mt-1">
              No hay una sesión de caja activa. Ingresa el monto inicial para comenzar.
            </p>
          </div>

          <!-- Form -->
          <div class="p-6 space-y-5">
            <div class="space-y-2">
              <label class="text-xs font-bold text-muted uppercase tracking-widest">
                Monto de Apertura
              </label>
              <div class="relative">
                <span class="absolute left-4 top-1/2 -translate-y-1/2 text-muted font-bold text-sm">Q</span>
                <input
                  v-model="openForm.monto_apertura"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  class="w-full pl-8 pr-4 py-3 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none font-bold text-lg"
                />
              </div>
              <p class="text-xs text-muted">Efectivo físico al inicio del día</p>
            </div>

            <div class="space-y-2">
              <label class="text-xs font-bold text-muted uppercase tracking-widest">
                Notas (Opcional)
              </label>
              <textarea
                v-model="openForm.observaciones"
                rows="2"
                placeholder="Observaciones de apertura..."
                class="w-full px-4 py-3 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none text-sm resize-none"
              />
            </div>

            <Button
              class="w-full py-3 text-sm font-bold shadow-lg shadow-primary/20 gap-2"
              :disabled="openSaving"
              @click="handleOpenSession"
            >
              <div v-if="openSaving" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <Icon v-else name="Unlock" :size="16" />
              {{ openSaving ? "Abriendo..." : "Abrir Caja" }}
            </Button>
          </div>
        </div>
      </div>
    </template>

    <!-- ── SESIÓN ACTIVA ─────────────────────────────────────────────── -->
    <template v-else>

      <!-- Header -->
      <div class="col-span-12 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div class="flex items-center gap-3 mb-1">
            <h2 class="text-2xl font-bold text-card-foreground">Caja</h2>
            <span
              :class="[
                'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide',
                activeSession.estado === 'ABIERTA'
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                  : 'bg-muted text-muted-foreground'
              ]"
            >
              <span class="w-1.5 h-1.5 rounded-full bg-current" :class="activeSession.estado === 'ABIERTA' ? 'animate-pulse' : ''"></span>
              {{ activeSession.estado === "ABIERTA" ? "Abierta" : "Cerrada" }}
            </span>
          </div>
          <p class="text-sm text-muted">
            Sesión #{{ activeSession.id }} · {{ fmtDate(activeSession.fecha) }} ·
            Apertura {{ fmtDatetime(activeSession.opened_at) }}
          </p>
        </div>
        <div v-if="activeSession.estado === 'ABIERTA'" class="flex gap-3">
          <Button variant="outline" size="sm" class="gap-2" @click="loadAll" :disabled="loading">
            <Icon name="RefreshCw" :size="14" :class="loading ? 'animate-spin' : ''" />
            Actualizar
          </Button>
          <Button variant="outline" size="sm" class="gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50" @click="openMovModal">
            <Icon name="Plus" :size="14" />
            Movimiento
          </Button>
          <Button
            size="sm"
            class="gap-2 bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/20"
            @click="openCloseModal"
          >
            <Icon name="Lock" :size="14" />
            Cerrar Caja
          </Button>
        </div>
      </div>

      <!-- Stat Cards -->
      <div class="col-span-12 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <!-- Apertura -->
        <div class="rounded-xl border border-border bg-card p-4 transition-all hover:shadow-md">
          <div class="flex items-center justify-between mb-2">
            <p class="text-[10px] font-bold text-muted uppercase tracking-widest">Apertura</p>
            <div class="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
              <Icon name="Unlock" :size="14" class="text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <p class="text-lg font-bold text-card-foreground font-mono">{{ fmt(summary?.monto_apertura) }}</p>
        </div>

        <!-- Cobros de Créditos -->
        <div class="rounded-xl border border-border bg-card p-4 transition-all hover:shadow-md">
          <div class="flex items-center justify-between mb-2">
            <p class="text-[10px] font-bold text-muted uppercase tracking-widest">Cobros</p>
            <div class="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center">
              <Icon name="HandCoins" :size="14" class="text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
          <p class="text-lg font-bold text-indigo-600 font-mono">{{ fmt(summary?.total_cobros_creditos) }}</p>
        </div>

        <!-- Ingresos manuales -->
        <div class="rounded-xl border border-border bg-card p-4 transition-all hover:shadow-md">
          <div class="flex items-center justify-between mb-2">
            <p class="text-[10px] font-bold text-muted uppercase tracking-widest">Ingresos</p>
            <div class="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
              <Icon name="TrendingUp" :size="14" class="text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <p class="text-lg font-bold text-emerald-600 font-mono">{{ fmt(summary?.total_ingresos) }}</p>
        </div>

        <!-- Egresos -->
        <div class="rounded-xl border border-border bg-card p-4 transition-all hover:shadow-md">
          <div class="flex items-center justify-between mb-2">
            <p class="text-[10px] font-bold text-muted uppercase tracking-widest">Egresos</p>
            <div class="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
              <Icon name="TrendingDown" :size="14" class="text-red-600 dark:text-red-400" />
            </div>
          </div>
          <p class="text-lg font-bold text-red-600 font-mono">{{ fmt(summary?.total_egresos) }}</p>
        </div>

        <!-- Efectivo esperado -->
        <div class="col-span-2 sm:col-span-1 rounded-xl border-2 border-primary/20 bg-primary/5 p-4 transition-all hover:shadow-md">
          <div class="flex items-center justify-between mb-2">
            <p class="text-[10px] font-bold text-primary/70 uppercase tracking-widest">Efectivo Esperado</p>
            <div class="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Icon name="Vault" :size="14" class="text-primary" />
            </div>
          </div>
          <p class="text-xl font-black text-primary font-mono">{{ fmt(summary?.efectivo_esperado) }}</p>
          <p class="text-[10px] text-muted mt-1">{{ summary?.total_movimientos ?? 0 }} movimientos</p>
        </div>
      </div>

      <!-- Tabs -->
      <div class="col-span-12">
        <div class="flex gap-1 bg-muted/30 p-1 rounded-xl border border-border w-fit mb-5">
          <button
            v-for="tab in [
              { key: 'movimientos', label: 'Movimientos', icon: 'List' },
              { key: 'recuperacion', label: 'Recuperación', icon: 'Target' },
              { key: 'cierre', label: 'Simulación Cierre', icon: 'Calculator' },
            ]"
            :key="tab.key"
            @click="activeTab = tab.key as any"
            :class="[
              'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all',
              activeTab === tab.key
                ? 'bg-card text-card-foreground shadow-sm'
                : 'text-muted hover:text-card-foreground'
            ]"
          >
            <Icon :name="tab.icon" :size="14" />
            {{ tab.label }}
          </button>
        </div>

        <!-- ── TAB: Movimientos ──────────────────────────────────────── -->
        <div v-if="activeTab === 'movimientos'" class="rounded-xl border border-border bg-card overflow-hidden">
          <div class="px-6 py-4 border-b border-border flex items-center justify-between">
            <div>
              <h3 class="text-sm font-bold text-card-foreground">Movimientos de la Sesión</h3>
              <p class="text-xs text-muted mt-0.5">Registro completo de entradas y salidas</p>
            </div>
          </div>

          <!-- Empty -->
          <div v-if="movimientosFiltrados.length === 0" class="py-16 text-center">
            <div class="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Icon name="List" :size="26" class="text-primary" />
            </div>
            <h4 class="text-base font-semibold text-card-foreground mb-1">Sin movimientos aún</h4>
            <p class="text-sm text-muted">Los movimientos aparecerán aquí cuando se registren cobros o entradas manuales.</p>
          </div>

          <!-- Table -->
          <div v-else class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="bg-muted/30 text-muted uppercase text-[10px] tracking-widest font-bold border-b border-border">
                  <th class="px-5 py-3 text-left">#</th>
                  <th class="px-5 py-3 text-left">Fecha / Hora</th>
                  <th class="px-5 py-3 text-left">Tipo</th>
                  <th class="px-5 py-3 text-right">Monto</th>
                  <th class="px-5 py-3 text-left">Descripción</th>
                  <th class="px-5 py-3 text-left">Origen</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border">
                <tr
                  v-for="mov in movimientosFiltrados"
                  :key="mov.id"
                  class="hover:bg-muted/20 transition-colors"
                >
                  <td class="px-5 py-3 text-muted text-xs">{{ mov.id }}</td>
                  <td class="px-5 py-3 text-muted font-mono text-xs">{{ fmtDatetime(mov.created_at) }}</td>
                  <td class="px-5 py-3">
                    <span :class="['inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide', tipoColor[mov.tipo] || 'bg-muted text-muted-foreground']">
                      <Icon :name="tipoIcon[mov.tipo] || 'Circle'" :size="10" />
                      {{ tipoLabel[mov.tipo] || mov.tipo }}
                    </span>
                  </td>
                  <td class="px-5 py-3 text-right font-mono font-bold" :class="mov.tipo === 'EGRESO' ? 'text-red-600' : mov.tipo === 'PAGO_CREDITO' || mov.tipo === 'INGRESO' ? 'text-emerald-600' : 'text-card-foreground'">
                    {{ mov.tipo === 'EGRESO' ? '−' : '+' }}{{ fmt(mov.monto) }}
                  </td>
                  <td class="px-5 py-3 text-muted text-xs max-w-[200px] truncate">
                    {{ mov.descripcion || "—" }}
                  </td>
                  <td class="px-5 py-3 text-xs text-muted">
                    <span v-if="mov.source_type === 'pago'" class="inline-flex items-center gap-1 text-indigo-600">
                      <Icon name="Link" :size="10" />
                      Pago #{{ mov.source_id }}
                    </span>
                    <span v-else>Manual</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- ── TAB: Recuperación ────────────────────────────────────── -->
        <div v-if="activeTab === 'recuperacion'">
          <div v-if="!recovery" class="py-16 text-center">
            <p class="text-sm text-muted">No hay datos de simulación disponibles.</p>
          </div>
          <div v-else>
            <div class="mb-4 flex items-center gap-2">
              <div class="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
                <Icon name="Target" :size="16" class="text-amber-600" />
              </div>
              <div>
                <h3 class="text-sm font-bold text-card-foreground">Simulación de Recuperación</h3>
                <p class="text-xs text-muted">Fichas de cobro pendientes para hoy — {{ fmtDate(recovery.fecha) }}</p>
              </div>
            </div>

            <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div class="rounded-xl border border-border bg-card p-5 hover:shadow-md transition-all">
                <p class="text-[10px] font-bold text-muted uppercase tracking-widest mb-2">Fichas Pendientes</p>
                <p class="text-3xl font-black text-card-foreground">{{ recovery.fichas_pendientes }}</p>
                <p class="text-xs text-muted mt-1">cobros programados</p>
              </div>

              <div class="rounded-xl border border-border bg-card p-5 hover:shadow-md transition-all">
                <p class="text-[10px] font-bold text-muted uppercase tracking-widest mb-2">Total Cuotas</p>
                <p class="text-2xl font-black text-blue-600 font-mono">{{ fmt(recovery.total_cuotas) }}</p>
                <p class="text-xs text-muted mt-1">capital + interés</p>
              </div>

              <div class="rounded-xl border border-border bg-card p-5 hover:shadow-md transition-all">
                <p class="text-[10px] font-bold text-muted uppercase tracking-widest mb-2">Mora Pendiente</p>
                <p class="text-2xl font-black text-red-600 font-mono">{{ fmt(recovery.total_mora) }}</p>
                <p class="text-xs text-muted mt-1">por cobrar</p>
              </div>

              <div class="rounded-xl border-2 border-emerald-200 bg-emerald-50 dark:bg-emerald-500/5 dark:border-emerald-500/20 p-5 hover:shadow-md transition-all">
                <p class="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest mb-2">Recuperación Esperada</p>
                <p class="text-2xl font-black text-emerald-700 dark:text-emerald-400 font-mono">{{ fmt(recovery.total_esperado) }}</p>
                <p class="text-xs text-emerald-600/70 dark:text-emerald-400/60 mt-1">si se cobran todas las fichas</p>
              </div>
            </div>

            <div class="mt-4 rounded-xl border border-amber-200 bg-amber-50/50 dark:bg-amber-500/5 dark:border-amber-500/20 p-4">
              <div class="flex items-start gap-3">
                <Icon name="Info" :size="16" class="text-amber-600 mt-0.5 shrink-0" />
                <p class="text-xs text-amber-700 dark:text-amber-400">
                  Esta simulación muestra las fichas de pago programadas para hoy. El monto real puede variar si hay moras adicionales o pagos parciales.
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- ── TAB: Simulación Cierre ────────────────────────────────── -->
        <div v-if="activeTab === 'cierre'">
          <div v-if="!closingSim" class="py-16 text-center">
            <p class="text-sm text-muted">No hay datos de simulación disponibles.</p>
          </div>
          <div v-else>
            <div class="mb-4 flex items-center gap-2">
              <div class="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Icon name="Calculator" :size="16" class="text-primary" />
              </div>
              <div>
                <h3 class="text-sm font-bold text-card-foreground">Simulación de Cierre</h3>
                <p class="text-xs text-muted">Proyección del efectivo al cerrar la sesión actual</p>
              </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
              <!-- Desglose -->
              <div class="rounded-xl border border-border bg-card p-5">
                <h4 class="text-xs font-bold text-muted uppercase tracking-widest mb-4">Desglose</h4>
                <div class="space-y-3">
                  <div class="flex justify-between items-center py-2 border-b border-border/50">
                    <div class="flex items-center gap-2">
                      <div class="w-6 h-6 rounded-md bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
                        <Icon name="Unlock" :size="12" class="text-blue-600 dark:text-blue-400" />
                      </div>
                      <span class="text-sm text-muted">Apertura</span>
                    </div>
                    <span class="font-mono font-bold text-sm text-card-foreground">{{ fmt(closingSim.monto_apertura) }}</span>
                  </div>

                  <div class="flex justify-between items-center py-2 border-b border-border/50">
                    <div class="flex items-center gap-2">
                      <div class="w-6 h-6 rounded-md bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center">
                        <Icon name="HandCoins" :size="12" class="text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <span class="text-sm text-muted">Cobros créditos</span>
                    </div>
                    <span class="font-mono font-bold text-sm text-emerald-600">+{{ fmt(closingSim.total_cobros_creditos) }}</span>
                  </div>

                  <div class="flex justify-between items-center py-2 border-b border-border/50">
                    <div class="flex items-center gap-2">
                      <div class="w-6 h-6 rounded-md bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                        <Icon name="TrendingUp" :size="12" class="text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <span class="text-sm text-muted">Ingresos manuales</span>
                    </div>
                    <span class="font-mono font-bold text-sm text-emerald-600">+{{ fmt(closingSim.total_ingresos) }}</span>
                  </div>

                  <div class="flex justify-between items-center py-2 border-b border-border/50">
                    <div class="flex items-center gap-2">
                      <div class="w-6 h-6 rounded-md bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
                        <Icon name="TrendingDown" :size="12" class="text-red-600 dark:text-red-400" />
                      </div>
                      <span class="text-sm text-muted">Egresos</span>
                    </div>
                    <span class="font-mono font-bold text-sm text-red-600">−{{ fmt(closingSim.total_egresos) }}</span>
                  </div>

                  <div class="flex justify-between items-center pt-2">
                    <span class="text-sm font-bold text-card-foreground">Efectivo esperado</span>
                    <span class="font-mono font-black text-lg text-primary">{{ fmt(closingSim.efectivo_esperado) }}</span>
                  </div>
                </div>
              </div>

              <!-- Acción rápida de cierre -->
              <div class="rounded-xl border-2 border-primary/20 bg-primary/5 p-5 flex flex-col justify-between">
                <div>
                  <h4 class="text-xs font-bold text-primary/70 uppercase tracking-widest mb-2">¿Listo para cerrar?</h4>
                  <p class="text-sm text-muted mb-4">
                    El efectivo esperado en caja es
                    <strong class="text-primary font-mono">{{ fmt(closingSim.efectivo_esperado) }}</strong>.
                    Al cerrar, podrás ingresar el monto físico contado y registrar la diferencia.
                  </p>
                </div>
                <Button
                  v-if="activeSession.estado === 'ABIERTA'"
                  class="w-full gap-2 bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/20"
                  @click="openCloseModal"
                >
                  <Icon name="Lock" :size="15" />
                  Cerrar Caja Ahora
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

    </template>

    <!-- ────────────────────────────────────────────────────────────────
         MODAL: Agregar Movimiento
    ──────────────────────────────────────────────────────────────────── -->
    <Teleport to="body">
      <div
        v-if="showMovModal"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        @click.self="showMovModal = false"
      >
        <div class="bg-card w-full max-w-md rounded-2xl shadow-2xl border border-border overflow-hidden">
          <!-- Header -->
          <div class="px-6 py-5 border-b border-border flex items-center justify-between bg-muted/30">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Icon name="ArrowLeftRight" :size="20" class="text-primary" />
              </div>
              <div>
                <h3 class="text-base font-bold text-card-foreground">Registrar Movimiento</h3>
                <p class="text-xs text-muted">Sesión #{{ activeSession?.id }}</p>
              </div>
            </div>
            <button @click="showMovModal = false" class="p-2 hover:bg-muted rounded-full transition-colors text-muted">
              <Icon name="X" :size="18" />
            </button>
          </div>

          <!-- Body -->
          <div class="p-6 space-y-5">
            <!-- Tipo -->
            <div class="space-y-2">
              <label class="text-xs font-bold text-muted uppercase tracking-widest">Tipo de Movimiento</label>
              <div class="grid grid-cols-2 gap-3">
                <button
                  @click="movForm.tipo = 'INGRESO'"
                  :class="[
                    'flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-bold transition-all',
                    movForm.tipo === 'INGRESO'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                      : 'border-border bg-card text-muted hover:border-muted-foreground'
                  ]"
                >
                  <Icon name="TrendingUp" :size="16" />
                  Ingreso
                </button>
                <button
                  @click="movForm.tipo = 'EGRESO'"
                  :class="[
                    'flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-bold transition-all',
                    movForm.tipo === 'EGRESO'
                      ? 'border-red-500 bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400'
                      : 'border-border bg-card text-muted hover:border-muted-foreground'
                  ]"
                >
                  <Icon name="TrendingDown" :size="16" />
                  Egreso
                </button>
              </div>
            </div>

            <!-- Monto -->
            <div class="space-y-2">
              <label class="text-xs font-bold text-muted uppercase tracking-widest">Monto</label>
              <div class="relative">
                <span class="absolute left-4 top-1/2 -translate-y-1/2 text-muted font-bold text-sm">Q</span>
                <input
                  v-model="movForm.monto"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  class="w-full pl-8 pr-4 py-3 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none font-bold text-lg"
                />
              </div>
            </div>

            <!-- Descripción -->
            <div class="space-y-2">
              <label class="text-xs font-bold text-muted uppercase tracking-widest">Descripción (Opcional)</label>
              <input
                v-model="movForm.descripcion"
                type="text"
                placeholder="Ej: Fondo chico, combustible..."
                class="w-full px-4 py-3 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none text-sm"
              />
            </div>
          </div>

          <!-- Footer -->
          <div class="px-6 py-4 bg-muted/30 border-t border-border flex justify-end gap-3">
            <Button variant="outline" @click="showMovModal = false" :disabled="movSaving">Cancelar</Button>
            <Button
              :class="movForm.tipo === 'INGRESO' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20' : 'bg-red-600 hover:bg-red-700 shadow-lg shadow-red-500/20'"
              @click="handleAddMovement"
              :disabled="movSaving || !movForm.monto"
            >
              <div v-if="movSaving" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
              <Icon v-else :name="movForm.tipo === 'INGRESO' ? 'TrendingUp' : 'TrendingDown'" :size="14" class="mr-2" />
              {{ movSaving ? "Guardando..." : `Registrar ${movForm.tipo === 'INGRESO' ? 'Ingreso' : 'Egreso'}` }}
            </Button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ────────────────────────────────────────────────────────────────
         MODAL: Cerrar Caja
    ──────────────────────────────────────────────────────────────────── -->
    <Teleport to="body">
      <div
        v-if="showCloseModal"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        @click.self="showCloseModal = false"
      >
        <div class="bg-card w-full max-w-md rounded-2xl shadow-2xl border border-border overflow-hidden">
          <!-- Header -->
          <div class="px-6 py-5 border-b border-border flex items-center justify-between bg-red-50/50 dark:bg-red-500/5">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-500/10 flex items-center justify-center">
                <Icon name="Lock" :size="20" class="text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 class="text-base font-bold text-card-foreground">Cerrar Caja</h3>
                <p class="text-xs text-muted">Ingresa el efectivo físico contado</p>
              </div>
            </div>
            <button @click="showCloseModal = false" class="p-2 hover:bg-muted rounded-full transition-colors text-muted">
              <Icon name="X" :size="18" />
            </button>
          </div>

          <!-- Body -->
          <div class="p-6 space-y-5">
            <!-- Resumen rápido -->
            <div class="grid grid-cols-2 gap-3 bg-muted/20 rounded-xl p-4 border border-border text-xs">
              <div>
                <span class="text-muted block mb-0.5">Efectivo esperado</span>
                <span class="font-bold text-card-foreground font-mono text-sm">{{ fmt(summary?.efectivo_esperado) }}</span>
              </div>
              <div>
                <span class="text-muted block mb-0.5">Movimientos</span>
                <span class="font-bold text-card-foreground">{{ summary?.total_movimientos ?? 0 }}</span>
              </div>
            </div>

            <!-- Monto contado -->
            <div class="space-y-2">
              <label class="text-xs font-bold text-muted uppercase tracking-widest">Monto Contado</label>
              <div class="relative">
                <span class="absolute left-4 top-1/2 -translate-y-1/2 text-muted font-bold text-sm">Q</span>
                <input
                  v-model="closeForm.monto_cierre"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  class="w-full pl-8 pr-4 py-3 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none font-bold text-lg"
                />
              </div>
            </div>

            <!-- Diferencia -->
            <div
              v-if="diferencia !== null"
              :class="[
                'rounded-xl p-4 border flex items-center justify-between',
                diferencia === 0 ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-500/5 dark:border-emerald-500/20' :
                diferencia > 0 ? 'bg-blue-50 border-blue-200 dark:bg-blue-500/5 dark:border-blue-500/20' :
                'bg-red-50 border-red-200 dark:bg-red-500/5 dark:border-red-500/20'
              ]"
            >
              <div class="flex items-center gap-2">
                <Icon
                  :name="diferencia === 0 ? 'CheckCircle' : diferencia > 0 ? 'TrendingUp' : 'AlertTriangle'"
                  :size="16"
                  :class="diferencia === 0 ? 'text-emerald-600' : diferencia > 0 ? 'text-blue-600' : 'text-red-600'"
                />
                <span class="text-sm font-medium text-card-foreground">
                  {{ diferencia === 0 ? "Sin diferencia" : diferencia > 0 ? "Sobrante" : "Faltante" }}
                </span>
              </div>
              <span :class="['font-mono font-black text-lg', diferenciaClass]">
                {{ diferencia > 0 ? '+' : '' }}{{ fmt(diferencia) }}
              </span>
            </div>

            <!-- Advertencia si hay faltante -->
            <div v-if="diferencia !== null && diferencia < 0" class="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/5 rounded-xl p-3 border border-amber-200 dark:border-amber-500/20">
              <Icon name="AlertTriangle" :size="14" class="shrink-0 mt-0.5" />
              <span>Hay un faltante en caja. Verifica los movimientos antes de cerrar.</span>
            </div>

            <!-- Notas -->
            <div class="space-y-2">
              <label class="text-xs font-bold text-muted uppercase tracking-widest">Notas de Cierre (Opcional)</label>
              <textarea
                v-model="closeForm.observaciones"
                rows="2"
                placeholder="Observaciones al cerrar..."
                class="w-full px-4 py-3 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none text-sm resize-none"
              />
            </div>
          </div>

          <!-- Footer -->
          <div class="px-6 py-4 bg-muted/30 border-t border-border flex justify-end gap-3">
            <Button variant="outline" @click="showCloseModal = false" :disabled="closeSaving">Cancelar</Button>
            <Button
              class="bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/20 gap-2"
              @click="handleCloseSession"
              :disabled="closeSaving || !closeForm.monto_cierre"
            >
              <div v-if="closeSaving" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <Icon v-else name="Lock" :size="14" />
              {{ closeSaving ? "Cerrando..." : "Confirmar Cierre" }}
            </Button>
          </div>
        </div>
      </div>
    </Teleport>

    <Footer />
  </div>
</template>
