<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import apiClient from "@/apiClient";
import Footer from "@/components/Footer.vue";
import Icon from "@/components/Icon.vue";
import { Button } from "@/components/ui/button";
import { push } from "notivue";
import { useAuthStore } from "@/stores/auth";
import { LOAN_TABS } from "@/types/loan";
import RegistrarPagoModal from "@/components/pagos/RegistrarPagoModal.vue";

const authStore = useAuthStore();
const esAdmin = computed(() => ["administrador", "supervisor", "validador"].includes(authStore.role ?? ""));

const route = useRoute();
const router = useRouter();
const prestamoId = route.params.id as string;

const activeTab = ref("resumen"); // CAMBIO: default tab es "resumen" (antes era "ficha")
const loading = ref(true);
const prestamo = ref<any>(null);

const tabs = computed(() => LOAN_TABS); // CAMBIO: usar constante LOAN_TABS (5 tabs)

const loadPrestamo = async () => {
  loading.value = true;
  try {
    const response = await apiClient.get(`/prestamos/${prestamoId}`);
    prestamo.value = response.data;
  } catch (error) {
    console.error("Error loading loan detail:", error);
    push.error("No se pudo cargar el detalle del préstamo.");
    // router.push({ name: 'prestamos' });
  } finally {
    loading.value = false;
  }
};

onMounted(loadPrestamo);

// ── Pagar Cuota modal ────────────────────────────────────────────────
const showPagarModal = ref(false);
const pagarFichaId = ref<number | null>(null);

const openPagarModal = (fichaId?: number) => {
  pagarFichaId.value = fichaId ?? null;
  showPagarModal.value = true;
};

// ── Aprobación ────────────────────────────────────────────────────────
const showAprobacionModal = ref(false);
const aprobacionAccion = ref<"aprobar" | "rechazar">("aprobar");
const aprobacionObs = ref("");
const aprobacionLoading = ref(false);

const esPendiente = () => prestamo.value?.estado_p_id === 0 || prestamo.value?.estado_p_id === 1;

const openAprobacion = (accion: "aprobar" | "rechazar") => {
  aprobacionAccion.value = accion;
  aprobacionObs.value = "";
  showAprobacionModal.value = true;
};

const confirmarAprobacion = async () => {
  aprobacionLoading.value = true;
  try {
    await apiClient.patch(`/prestamos/${prestamoId}/aprobacion`, {
      accion: aprobacionAccion.value,
      observaciones: aprobacionObs.value || null,
    });
    push.success(aprobacionAccion.value === "aprobar" ? "Crédito aprobado correctamente" : "Crédito rechazado");
    showAprobacionModal.value = false;
    await loadPrestamo();
  } catch (err: any) {
    push.error(err.response?.data?.detail || "Error al procesar la acción");
  } finally {
    aprobacionLoading.value = false;
  }
};

const getEstadoLabel = (id: number) => {
  const map: Record<number, string> = {
    0: "Pendiente", 1: "En revisión", 3: "Aprobado", 5: "Activo",
    9: "Cancelado", 10: "En mora", 11: "Rechazado",
  };
  return map[id] ?? "Desconocido";
};

const getEstadoBadge = (id: number) => {
  if (id === 3 || id === 5) return "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400";
  if (id === 11) return "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400";
  if (id === 0 || id === 1) return "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400";
  return "bg-muted text-muted-foreground";
};

const formatMoney = (val: number | null | undefined) => {
  return `Q${(val || 0).toLocaleString("es-GT", { minimumFractionDigits: 2 })}`;
};

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return "—";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("es-GT", { day: "2-digit", month: "short", year: "numeric" });
};

// ── NUEVOS COMPUTED PROPERTIES para banda resumen mejorada ────────────────────────────────────
const cuotasPagadas = computed(() => (prestamo.value?.pagos ?? []).length);

// Source of truth: prestamo.cuotas from DB (user-entered at creation).
// fichas_pago.length is used as display fallback only when cuotas is null (legacy loans).
const cuotasTotal = computed(() => {
  const fromDB = prestamo.value?.cuotas;
  if (fromDB && fromDB > 0) return fromDB;
  return (prestamo.value?.fichas_pago ?? []).length;
});

const proximaCuotaFecha = computed(() => {
  const fichas = prestamo.value?.fichas_pago ?? [];  // ✅ Fallback a array vacío
  if (!fichas.length) return "—";
  const nextPending = fichas.find((f: any) => f.estado !== 1);
  return nextPending ? formatDate(nextPending.fecha) : "—";
});

const proximaCuotaMonto = computed(() => {
  const fichas = prestamo.value?.fichas_pago ?? [];  // ✅ Fallback a array vacío
  if (!fichas.length) return 0;
  const nextPending = fichas.find((f: any) => f.estado !== 1);
  return nextPending?.cuota ?? 0;
});

const diasAtraso = computed(() => {
  const fichas = prestamo.value?.fichas_pago ?? [];  // ✅ Fallback a array vacío
  if (!fichas.length) return 0;
  const today = new Date();
  let maxDays = 0;
  fichas.forEach((f: any) => {
    if (f.estado !== 1 && new Date(f.fecha) < today) {
      const days = Math.floor((today.getTime() - new Date(f.fecha).getTime()) / (1000 * 60 * 60 * 24));
      maxDays = Math.max(maxDays, days);
    }
  });
  return maxDays;
});

const riesgoLabel = computed(() => {
  if (diasAtraso.value > 15) return "CRÍTICO";
  if (diasAtraso.value > 5) return "ADVERTENCIA";
  return "NORMAL";
});

const riesgoColor = computed(() => {
  if (diasAtraso.value > 15) return "bg-red-500";
  if (diasAtraso.value > 5) return "bg-amber-500";
  return "bg-emerald-500";
});

const porcentajePagado = computed(() => {
  return cuotasTotal.value > 0 ? Math.round((cuotasPagadas.value / cuotasTotal.value) * 100) : 0;
});

const getFichaStatusLabel = (id: number) => {
  const map: Record<number, string> = {
    0: 'Pendiente', 1: 'Pagado', 2: 'No Pagado',
    3: 'Pago parcial', 4: 'Adelantado', 5: 'Parcial Adelantado'
  };
  return map[id] || 'Pendiente';
};

// ── Imágenes ────────────────────────────────────────────────────────
const IMAGEN_CAMPOS = [
  { campo: "foto_compromiso", label: "Foto Compromiso" },
  { campo: "foto_recibo",     label: "Foto Recibo"     },
  { campo: "foto_solicitud",  label: "Foto Solicitud"  },
] as const;

type CampoImagen = typeof IMAGEN_CAMPOS[number]["campo"];

const imgUploading = ref<Record<string, boolean>>({});
const imgDeleting  = ref<Record<string, boolean>>({});
const imgFileInputs = ref<Record<string, HTMLInputElement | null>>({});

const getImgUrl = (campo: CampoImagen): string | null =>
  prestamo.value?.[campo] ?? null;

const triggerImgInput = (campo: string) =>
  imgFileInputs.value[campo]?.click();

const handleImgSelect = async (e: Event, campo: CampoImagen) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  imgUploading.value[campo] = true;
  try {
    const fd = new FormData();
    fd.append("file", file);
    const res = await apiClient.post(`/prestamos/${prestamoId}/imagenes/${campo}`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    prestamo.value[campo] = res.data.url;
    push.success("Imagen subida correctamente");
  } catch (err: any) {
    push.error(err.response?.data?.detail || "Error al subir imagen");
  } finally {
    imgUploading.value[campo] = false;
    (e.target as HTMLInputElement).value = "";
  }
};

const deleteImagen = async (campo: CampoImagen) => {
  imgDeleting.value[campo] = true;
  try {
    await apiClient.delete(`/prestamos/${prestamoId}/imagenes/${campo}`);
    prestamo.value[campo] = null;
    push.success("Imagen eliminada");
  } catch (err: any) {
    push.error(err.response?.data?.detail || "Error al eliminar imagen");
  } finally {
    imgDeleting.value[campo] = false;
  }
};

// ── Print helpers ────────────────────────────────────────────────────
const printLoading = ref(false);

const openPrintWindow = (html: string) => {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank");
  if (!win) { push.error("El navegador bloqueó la ventana de impresión. Permite ventanas emergentes."); URL.revokeObjectURL(url); return; }
  win.addEventListener("load", () => { win.focus(); setTimeout(() => { win.print(); URL.revokeObjectURL(url); }, 300); });
};

const generandoFichas = ref(false);
const regenerarFichas = async () => {
  generandoFichas.value = true;
  try {
    await apiClient.post(`/prestamos/${prestamoId}/generar-fichas`);
    push.success("Calendario regenerado correctamente");
    // Reload detail
    const { data } = await apiClient.get(`/prestamos/${prestamoId}`);
    prestamo.value = data;
  } catch (e: any) {
    push.error(e.response?.data?.detail || "No se pudo regenerar el calendario");
  } finally {
    generandoFichas.value = false;
  }
};

const printFicha = async () => {
  printLoading.value = true;
  try {
    const { data } = await apiClient.get(`/documentos/ficha-pago/${prestamoId}`);
    const filas = data.progreso_fichas.map((f: any, i: number) => `
      <tr style="border-bottom:1px solid #e5e7eb;">
        <td style="padding:8px 12px;">${i + 1}</td>
        <td style="padding:8px 12px;">${f.fecha_esperada ?? '—'}</td>
        <td style="padding:8px 12px; text-align:center;">
          <span style="padding:2px 8px; border-radius:9999px; font-size:11px; font-weight:700;
            background:${f.estado_str === 'Pagado' ? '#d1fae5' : '#fef3c7'};
            color:${f.estado_str === 'Pagado' ? '#065f46' : '#92400e'};">
            ${f.estado_str}
          </span>
        </td>
      </tr>`).join("");

    openPrintWindow(`<!DOCTYPE html><html><head><meta charset="UTF-8">
      <title>Ficha de Pago #${data.credito_id}</title>
      <style>body{font-family:Arial,sans-serif;padding:32px;color:#111;}
        h2{margin-bottom:4px;} table{width:100%;border-collapse:collapse;margin-top:16px;}
        th{background:#f3f4f6;padding:8px 12px;text-align:left;font-size:12px;text-transform:uppercase;letter-spacing:.05em;}
        @media print{body{padding:16px;}}
      </style></head><body>
      <h2>Ficha de Pago — Crédito #${data.credito_id}</h2>
      <p style="color:#6b7280;font-size:14px;margin:0;">Cliente: <strong>${data.cliente}</strong> &nbsp;|&nbsp; Promotor: <strong>${data.promotor}</strong></p>
      <p style="color:#6b7280;font-size:14px;margin:4px 0;">Monto: <strong>Q${Number(data.monto_otorgado).toFixed(2)}</strong> &nbsp;|&nbsp; Interés: <strong>Q${Number(data.interes_pactado).toFixed(2)}</strong> &nbsp;|&nbsp; Desembolso: <strong>${data.fecha_desembolso ?? '—'}</strong></p>
      <table><thead><tr><th>#</th><th>Fecha</th><th>Estado</th></tr></thead><tbody>${filas}</tbody></table>
      </body></html>`);
  } catch { push.error("No se pudo generar la ficha de pago"); }
  finally { printLoading.value = false; }
};

const printCompromiso = async () => {
  printLoading.value = true;
  try {
    const { data } = await apiClient.get(`/documentos/compromiso/${prestamoId}`);
    openPrintWindow(`<!DOCTYPE html><html><head><meta charset="UTF-8">
      <title>Compromiso de Pago #${data.credito_id}</title>
      <style>body{font-family:Arial,sans-serif;padding:40px;color:#111;max-width:700px;margin:auto;}
        h2{text-align:center;margin-bottom:4px;} p{line-height:1.7;font-size:14px;}
        .field{margin:12px 0;} .label{font-size:11px;text-transform:uppercase;color:#6b7280;letter-spacing:.05em;}
        .firma{margin-top:60px;border-top:1px solid #111;width:260px;text-align:center;padding-top:8px;font-size:12px;}
        @media print{body{padding:24px;}}
      </style></head><body>
      <h2>Compromiso de Pago</h2>
      <p style="text-align:center;color:#6b7280;font-size:13px;margin-bottom:24px;">Crédito #${data.credito_id} — Fecha: ${data.fecha_generacion}</p>
      <div class="field"><div class="label">Cliente</div><strong>${data.cliente_nombres} ${data.cliente_apellidos}</strong></div>
      <div class="field"><div class="label">DPI</div>${data.dpi ?? '—'}</div>
      <div class="field"><div class="label">Monto del Crédito</div><strong>Q${Number(data.monto).toFixed(2)}</strong></div>
      <div style="margin-top:24px;padding:16px;background:#f9fafb;border-radius:8px;font-size:13px;line-height:1.8;">
        ${data.texto_legal}
      </div>
      <div class="firma">Firma del cliente</div>
      </body></html>`);
  } catch { push.error("No se pudo generar el compromiso"); }
  finally { printLoading.value = false; }
};

const getFichaStatusBadgeClass = (id: number) => {
  const map: Record<number, string> = {
    0: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-500',
    1: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-500',
    2: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-500',
    3: 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-500',
    4: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-500',
    5: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-500'
  };
  return `px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${map[id] || 'bg-muted text-muted-foreground'}`;
};
</script>

<template>
  <div class="grid grid-cols-12 mt-2 mb-6 gap-7">
    <!-- Header -->
    <div class="col-span-12 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div class="flex items-center gap-2 text-sm text-muted">
        <router-link :to="{ name: 'prestamos' }" class="hover:text-primary transition-colors">Préstamos</router-link>
        <Icon name="ChevronRight" :size="14" />
        <span class="text-card-foreground font-medium">Crédito #{{ prestamoId }}</span>
      </div>
      <div class="flex items-center gap-2 flex-wrap">
        <!-- Badge de estado -->
        <span v-if="prestamo" :class="['px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider', getEstadoBadge(prestamo.estado_p_id)]">
          {{ getEstadoLabel(prestamo.estado_p_id) }}
        </span>

        <!-- Botones de aprobación (solo si está pendiente) -->
        <template v-if="prestamo && esPendiente()">
          <Button size="sm" class="gap-2 bg-emerald-500 hover:bg-emerald-600" @click="openAprobacion('aprobar')">
            <Icon name="CheckCircle" :size="15" /> Aprobar
          </Button>
          <Button size="sm" variant="outline" class="gap-2 text-red-500 border-red-300 hover:bg-red-50 dark:hover:bg-red-500/10" @click="openAprobacion('rechazar')">
            <Icon name="XCircle" :size="15" /> Rechazar
          </Button>
        </template>

        <Button variant="outline" size="sm" @click="router.back()">
          <Icon name="ArrowLeft" :size="16" class="mr-2" /> Volver
        </Button>
        <Button size="sm" class="bg-emerald-500 hover:bg-emerald-600" @click="openPagarModal()">
          <Icon name="Receipt" :size="16" class="mr-2" /> Pagar Cuota
        </Button>
      </div>
    </div>

    <!-- Loan Summary Banner - MEJORADO -->
    <div class="col-span-12">
      <div class="rounded-2xl border border-border bg-card p-6 shadow-sm overflow-hidden relative">
        <div class="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>

        <div class="relative">
          <!-- Encabezado -->
          <h2 class="text-2xl font-bold mb-6">Crédito #{{ prestamoId }} — {{ prestamo?.cliente?.nombre }}</h2>

          <!-- Métricas principales (3 columnas) -->
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6 mb-6">
            <div>
              <p class="text-xs font-bold text-muted uppercase tracking-widest mb-1">💰 Monto Original</p>
              <p class="text-2xl font-bold text-card-foreground">{{ formatMoney(prestamo?.monto) }}</p>
              <p class="text-xs text-muted mt-1">+ Interés: {{ formatMoney(prestamo?.interes) }}</p>
            </div>

            <div>
              <p class="text-xs font-bold text-muted uppercase tracking-widest mb-1">💵 Saldo Pendiente</p>
              <p class="text-2xl font-bold text-primary">{{ formatMoney(prestamo?.saldo) }}</p>
              <p class="text-xs text-muted mt-1">Recuperado: {{ formatMoney(prestamo?.capital_recuperado) }}</p>
            </div>

            <div>
              <p class="text-xs font-bold text-muted uppercase tracking-widest mb-1">📅 Próxima Cuota</p>
              <p class="text-2xl font-bold text-card-foreground">{{ proximaCuotaFecha }}</p>
              <p class="text-xs text-muted mt-1">Monto: {{ formatMoney(proximaCuotaMonto) }}</p>
            </div>
          </div>

          <!-- Métricas de riesgo -->
          <div class="flex flex-wrap gap-4 pt-4 border-t border-border">
            <!-- Atraso -->
            <div v-if="diasAtraso > 0" class="flex items-center gap-2">
              <div class="w-3 h-3 rounded-full bg-red-500"></div>
              <span class="text-sm font-medium text-red-600">⚠️ Atraso: {{ diasAtraso }} días</span>
            </div>

            <!-- Progreso -->
            <div class="flex items-center gap-2">
              <div class="w-3 h-3 rounded-full bg-emerald-500"></div>
              <span class="text-sm font-medium text-card-foreground">
                📈 Progreso: {{ cuotasPagadas }}/{{ cuotasTotal }} cuotas ({{ porcentajePagado }}%)
              </span>
            </div>

            <!-- Riesgo -->
            <div class="flex items-center gap-2">
              <div class="w-3 h-3 rounded-full" :class="riesgoColor"></div>
              <span class="text-sm font-medium text-card-foreground">🎯 Riesgo: {{ riesgoLabel }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tabs Navigation -->
    <div class="col-span-12">
      <div class="flex gap-1 bg-muted/30 p-1 rounded-xl w-full max-w-4xl mx-auto overflow-x-auto no-scrollbar border border-border">
        <button
          v-for="tab in tabs" :key="tab.id"
          @click="activeTab = tab.id"
          :class="['flex items-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap',
            activeTab === tab.id ? 'bg-card text-primary shadow-sm border border-border' : 'text-muted hover:text-card-foreground']"
        >
          <Icon :name="tab.icon" :size="15" />
          <span class="hidden xs:inline">{{ tab.label }}</span>
        </button>
      </div>
    </div>

    <!-- Tab Content -->
    <div class="col-span-12">
      <div class="min-h-[400px]">
        <div v-if="loading" class="flex flex-col items-center justify-center py-20">
          <div class="w-12 h-12 border-4 rounded-full border-border animate-spin border-t-primary mb-4"></div>
          <p class="text-sm text-muted font-medium">Cargando información detallada...</p>
        </div>

        <div v-else-if="prestamo" class="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300 pb-10">
          
          <!-- Tab: Calendario (antes: Ficha) -->
          <div v-if="activeTab === 'calendario'" class="space-y-6">
            <!-- Alerta si fichas generadas ≠ cuotas pactadas -->
            <div
              v-if="prestamo.cuotas && (prestamo.fichas_pago ?? []).length > 0 && (prestamo.fichas_pago ?? []).length !== prestamo.cuotas"
              class="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10 px-4 py-3 flex items-start gap-3"
            >
              <Icon name="AlertTriangle" :size="18" class="text-amber-600 mt-0.5 shrink-0" />
              <p class="text-sm text-amber-800 dark:text-amber-300">
                <strong>Inconsistencia detectada:</strong>
                el crédito fue pactado con <strong>{{ prestamo.cuotas }}</strong> cuotas pero
                el calendario tiene <strong>{{ (prestamo.fichas_pago ?? []).length }}</strong> fichas.
                Usa <em>Regenerar</em> para corregirlo.
              </p>
            </div>
            <div class="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
              <div class="p-6 border-b border-border flex items-center justify-between bg-muted/5">
                <div>
                  <h3 class="font-bold text-card-foreground">Ficha de Pago / Calendario de Cuotas</h3>
                  <p v-if="prestamo.cuotas" class="text-xs text-muted mt-0.5">
                    {{ (prestamo.fichas_pago ?? []).length }} de {{ prestamo.cuotas }} cuotas pactadas
                  </p>
                </div>
                <div class="flex items-center gap-2">
                  <Button v-if="esAdmin && prestamo?.plan_id" variant="outline" size="sm" class="gap-2" :disabled="generandoFichas" @click="regenerarFichas">
                    <Icon v-if="generandoFichas" name="Loader2" :size="14" class="animate-spin" />
                    <Icon v-else name="RefreshCw" :size="14" />
                    Regenerar
                  </Button>
                  <Button variant="outline" size="sm" class="gap-2" :disabled="printLoading" @click="printFicha">
                    <Icon v-if="printLoading" name="Loader2" :size="14" class="animate-spin" />
                    <Icon v-else name="Printer" :size="14" />
                    Imprimir Ficha
                  </Button>
                </div>
              </div>
              <div class="overflow-x-auto">
                <table class="w-full text-sm border-collapse">
                  <thead>
                    <tr class="bg-muted/30 border-b border-border text-[10px] uppercase text-muted font-bold tracking-widest">
                      <th class="px-3 py-3 sm:px-6 sm:py-4 text-left border-b border-border">No.</th>
                      <th class="px-3 py-3 sm:px-6 sm:py-4 text-left border-b border-border">Fecha</th>
                      <th class="px-3 py-3 sm:px-6 sm:py-4 text-right border-b border-border">Cuota</th>
                      <th class="px-3 py-3 sm:px-6 sm:py-4 text-right border-b border-border hidden sm:table-cell">Mora</th>
                      <th class="px-3 py-3 sm:px-6 sm:py-4 text-center border-b border-border">Estado</th>
                      <th class="px-3 py-3 sm:px-6 sm:py-4 text-right border-b border-border">Total</th>
                      <th class="px-3 py-3 sm:px-6 sm:py-4 text-center border-b border-border"></th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-border">
                    <tr v-if="!(prestamo.fichas_pago ?? []).length">
                      <td colspan="7" class="px-6 py-10 text-center">
                        <div class="flex flex-col items-center gap-2">
                          <div class="w-12 h-12 rounded-xl bg-muted/30 flex items-center justify-center">
                            <Icon name="CalendarX2" :size="22" class="text-muted" />
                          </div>
                          <p class="text-sm font-medium text-card-foreground">Sin calendario de cuotas</p>
                          <p class="text-xs text-muted max-w-xs">
                            {{ prestamo.plan_id ? 'Recargue la página. Si el problema persiste, el plan no tiene cuotas configuradas.' : 'Este crédito no tiene un plan de pago asignado. Asigna un plan para generar el calendario.' }}
                          </p>
                        </div>
                      </td>
                    </tr>
                    <tr v-for="ficha in prestamo.fichas_pago" :key="ficha.id" class="hover:bg-muted/10 transition-colors">
                       <td class="px-3 py-3 sm:px-6 sm:py-4 font-bold text-card-foreground border-b border-border/50">{{ ficha.no_dia }}</td>
                       <td class="px-3 py-3 sm:px-6 sm:py-4 font-medium border-b border-border/50">{{ formatDate(ficha.fecha) }}</td>
                       <td class="px-3 py-3 sm:px-6 sm:py-4 text-right border-b border-border/50">{{ formatMoney(ficha.cuota) }}</td>
                       <td class="px-3 py-3 sm:px-6 sm:py-4 text-right border-b border-border/50 hidden sm:table-cell">
                         <span :class="[ficha.mora > 0 ? 'text-red-500 font-bold' : 'text-muted']">
                           {{ formatMoney(ficha.mora) }}
                         </span>
                       </td>
                       <td class="px-3 py-3 sm:px-6 sm:py-4 text-center border-b border-border/50">
                         <span :class="getFichaStatusBadgeClass(ficha.estado || 0)">
                           {{ getFichaStatusLabel(ficha.estado || 0) }}
                         </span>
                       </td>
                       <td class="px-3 py-3 sm:px-6 sm:py-4 text-right font-bold text-primary border-b border-border/50">
                         {{ formatMoney(ficha.total || ficha.cuota) }}
                       </td>
                       <td class="px-3 py-3 sm:px-6 sm:py-4 text-center border-b border-border/50">
                         <button
                           v-if="(ficha.estado || 0) !== 1"
                           @click="openPagarModal(ficha.id)"
                           class="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-medium transition-colors mx-auto"
                           title="Pagar esta cuota"
                         >
                           <Icon name="CheckCircle" :size="12" />
                           <span class="hidden sm:inline">Pagar</span>
                         </button>
                         <Icon v-else name="CheckCircle" :size="15" class="text-emerald-500 mx-auto" />
                       </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- Tab: Resumen (antes: Información) -->
          <div v-if="activeTab === 'resumen'" class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h3 class="font-bold text-card-foreground mb-6 flex items-center gap-2 border-b border-border pb-4">
                <Icon name="User" :size="18" class="text-primary" /> Datos del Cliente
              </h3>
              <div class="space-y-4 text-left">
                <div v-for="item in [
                  { label: 'Nombre Completo', value: prestamo.cliente?.nombre },
                  { label: 'DPI / Cédula', value: prestamo.cliente?.dpi },
                  { label: 'Teléfono', value: prestamo.cliente?.telefono },
                ]" :key="item.label">
                  <p class="text-[10px] font-bold text-muted uppercase tracking-widest">{{ item.label }}</p>
                  <p class="text-sm font-medium text-card-foreground">{{ item.value || '—' }}</p>
                </div>
              </div>
            </div>
            <div class="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h3 class="font-bold text-card-foreground mb-6 flex items-center gap-2 border-b border-border pb-4">
                <Icon name="Briefcase" :size="18" class="text-primary" /> Detalles del Crédito
              </h3>
              <div class="space-y-4 text-left">
                <div v-for="item in [
                  { label: 'Tipo de Préstamo', value: prestamo.tipo === 1 ? 'Normal' : 'Especial' },
                  { label: 'Clasificación', value: prestamo.clasificacion_id === 0 ? 'Normal (P)' : String.fromCharCode(64 + prestamo.clasificacion_id) },
                  { label: 'Plan de Pago', value: prestamo.plan?.nombre || '—' },
                  { label: 'Cuotas Pactadas', value: prestamo.cuotas ? String(prestamo.cuotas) : '—' },
                  { label: 'Interés Total', value: formatMoney(prestamo.interes) },
                  { label: 'Mora Acumulada', value: formatMoney(prestamo.mora) },
                  { label: 'Fecha Inicio', value: formatDate(prestamo.fecha_inicio) },
                  { label: 'Fecha Fin', value: formatDate(prestamo.fecha_fin) },
                  { label: 'Fecha de Desembolso', value: formatDate(prestamo.fecha_desembolso) },
                ]" :key="item.label">
                  <p class="text-[10px] font-bold text-muted uppercase tracking-widest">{{ item.label }}</p>
                  <p class="text-sm font-medium text-card-foreground">{{ item.value || '—' }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Tab: Pagos -->
          <div v-if="activeTab === 'pagos'" class="space-y-6">

             <!-- Resumen de pagos -->
             <div class="rounded-2xl border border-border bg-card p-6 shadow-sm">
               <h3 class="font-bold text-card-foreground mb-4 border-b border-border pb-4">Resumen de Pagos</h3>
               <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                 <div>
                   <p class="text-[10px] font-bold text-muted uppercase tracking-widest mb-1">Total Pagado</p>
                   <p class="text-2xl font-bold text-primary">
                     {{ formatMoney((prestamo?.pagos ?? []).reduce((sum: number, p: any) => sum + (p.monto || 0), 0)) }}
                   </p>
                 </div>
                 <div>
                   <p class="text-[10px] font-bold text-muted uppercase tracking-widest mb-1">Cuotas Pagadas</p>
                   <p class="text-2xl font-bold text-card-foreground">{{ (prestamo?.pagos ?? []).length }}/{{ (prestamo?.fichas_pago ?? []).length }}</p>
                 </div>
                 <div>
                   <p class="text-[10px] font-bold text-muted uppercase tracking-widest mb-1">Interés Cobrado</p>
                   <p class="text-xl font-bold text-card-foreground">
                     {{ formatMoney((prestamo?.pagos ?? []).reduce((sum: number, p: any) => sum + (p.interes || 0), 0)) }}
                   </p>
                 </div>
                 <div>
                   <p class="text-[10px] font-bold text-muted uppercase tracking-widest mb-1">Mora Cobrada</p>
                   <p class="text-xl font-bold text-red-600">
                     {{ formatMoney((prestamo?.pagos ?? []).reduce((sum: number, p: any) => sum + (p.mora || 0), 0)) }}
                   </p>
                 </div>
               </div>
               <div class="pt-4 border-t border-border">
                 <p class="text-xs text-muted mb-2">Última transacción:</p>
                 <p class="text-sm font-medium text-card-foreground">
                   {{ prestamo?.pagos?.[0] ? formatDate(prestamo.pagos[0].created_at ? (prestamo.pagos[0].created_at as string) : prestamo.pagos[0].fecha) : '—' }}
                   {{ prestamo?.pagos?.[0] ? formatMoney(prestamo.pagos[0].monto) : '' }}
                 </p>
               </div>
             </div>

             <!-- Tabla de pagos (contenedor) -->
             <div class="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
                <div class="p-6 border-b border-border flex items-center justify-between bg-muted/5">
                  <h3 class="font-bold text-card-foreground">Historial de Pagos</h3>
                </div>
             <div class="overflow-x-auto">
                <table class="w-full text-sm border-collapse">
                  <thead>
                     <tr class="bg-muted/30 border-b border-border text-[10px] uppercase text-muted font-bold tracking-widest">
                        <th class="px-3 py-3 sm:px-6 sm:py-4 text-left border-b border-border">Fecha</th>
                        <th class="px-3 py-3 sm:px-6 sm:py-4 text-left border-b border-border hidden sm:table-cell">Descripción</th>
                        <th class="px-3 py-3 sm:px-6 sm:py-4 text-right border-b border-border hidden md:table-cell">Capital</th>
                        <th class="px-3 py-3 sm:px-6 sm:py-4 text-right border-b border-border hidden md:table-cell">Interés</th>
                        <th class="px-3 py-3 sm:px-6 sm:py-4 text-right border-b border-border hidden sm:table-cell">Mora</th>
                        <th class="px-3 py-3 sm:px-6 sm:py-4 text-right border-b border-border font-bold">Total</th>
                     </tr>
                  </thead>
                  <tbody class="divide-y divide-border">
                     <tr v-if="!(prestamo.pagos ?? []).length">
                        <td colspan="6" class="px-6 py-10 text-center">
                          <div class="flex flex-col items-center gap-2">
                            <div class="w-12 h-12 rounded-xl bg-muted/30 flex items-center justify-center">
                              <Icon name="ReceiptText" :size="22" class="text-muted" />
                            </div>
                            <p class="text-sm font-medium text-card-foreground">Sin pagos registrados</p>
                            <p class="text-xs text-muted">Los pagos aparecerán aquí cuando se registren cobros en la ficha de este crédito.</p>
                          </div>
                        </td>
                     </tr>
                     <tr v-for="pago in prestamo.pagos" :key="pago.id" class="hover:bg-muted/10 transition-colors">
                        <td class="px-3 py-3 sm:px-6 sm:py-4 font-medium border-b border-border/50">{{ formatDate(pago.created_at ? (pago.created_at as string) : pago.fecha) }}</td>
                        <td class="px-3 py-3 sm:px-6 sm:py-4 text-xs text-muted border-b border-border/50 hidden sm:table-cell">{{ pago.descripcion || 'Pago regular' }}</td>
                        <td class="px-3 py-3 sm:px-6 sm:py-4 text-right font-medium border-b border-border/50 hidden md:table-cell">{{ formatMoney(pago.capital) }}</td>
                        <td class="px-3 py-3 sm:px-6 sm:py-4 text-right font-medium border-b border-border/50 hidden md:table-cell">{{ formatMoney(pago.interes) }}</td>
                        <td class="px-3 py-3 sm:px-6 sm:py-4 text-right text-red-500 font-medium border-b border-border/50 hidden sm:table-cell">{{ formatMoney(pago.mora) }}</td>
                        <td class="px-3 py-3 sm:px-6 sm:py-4 text-right font-bold text-primary border-b border-border/50">{{ formatMoney(pago.monto) }}</td>
                     </tr>
                  </tbody>
                </table>
                </div>
             </div>

          </div>

          <!-- Tab: Documentos (fusionado: documento + compromiso) -->
          <div v-if="activeTab === 'documentos'" class="space-y-6 max-w-3xl">

            <!-- Documento 1: Compromiso -->
            <div class="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div class="flex items-start gap-4 mb-4">
                <div class="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                  <Icon name="FileCheck" :size="24" class="text-emerald-600" />
                </div>
                <div class="flex-1">
                  <h4 class="font-bold text-card-foreground">Compromiso de Pago</h4>
                  <p class="text-xs text-muted mt-1">Estado: <span class="inline-block px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">Generado</span></p>
                  <p class="text-xs text-muted mt-1">Generado: 01 Ene 2026</p>
                </div>
              </div>
              <p class="text-xs text-muted mb-4">ℹ️ Debe ser firmado por el cliente en presencia del promotor.</p>
              <div class="flex gap-2 flex-wrap">
                <Button variant="outline" size="sm" class="gap-2" :disabled="printLoading" @click="printCompromiso">
                  <Icon v-if="printLoading" name="Loader2" :size="14" class="animate-spin" />
                  <Icon v-else name="Printer" :size="14" />
                  Imprimir
                </Button>
                <Button variant="outline" size="sm" class="gap-2">
                  <Icon name="Download" :size="14" />
                  Descargar
                </Button>
                <Button variant="outline" size="sm" class="gap-2">
                  <Icon name="CheckCircle" :size="14" />
                  Marcar como enviado
                </Button>
              </div>
            </div>

            <!-- Documento 2: Ficha de Pago -->
            <div class="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div class="flex items-start gap-4 mb-4">
                <div class="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                  <Icon name="ClipboardList" :size="24" class="text-blue-600" />
                </div>
                <div class="flex-1">
                  <h4 class="font-bold text-card-foreground">Ficha de Pago</h4>
                  <p class="text-xs text-muted mt-1">Estado: <span class="inline-block px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">Generada</span></p>
                  <p class="text-xs text-muted mt-1">Generada: 01 Ene 2026</p>
                </div>
              </div>
              <p class="text-xs text-muted mb-4">ℹ️ Calendario de pagos completo para entregar al cliente.</p>
              <div class="flex gap-2 flex-wrap">
                <Button variant="outline" size="sm" class="gap-2" :disabled="printLoading" @click="printFicha">
                  <Icon v-if="printLoading" name="Loader2" :size="14" class="animate-spin" />
                  <Icon v-else name="Printer" :size="14" />
                  Imprimir
                </Button>
                <Button variant="outline" size="sm" class="gap-2">
                  <Icon name="Download" :size="14" />
                  Descargar
                </Button>
                <Button variant="outline" size="sm" class="gap-2">
                  <Icon name="Send" :size="14" />
                  Enviar WhatsApp
                </Button>
              </div>
            </div>

            <!-- Estado de documentación -->
            <div class="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-6">
              <p class="text-sm text-emerald-900 font-medium">✅ Estado: 2 de 2 documentos completados</p>
              <p class="text-xs text-emerald-700 mt-2">Crédito listo para desembolsar</p>
            </div>

          </div>

           <!-- Tab: Evidencia (antes: Imágenes) -->
          <div v-if="activeTab === 'evidencia'" class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div v-for="img in IMAGEN_CAMPOS" :key="img.campo" class="rounded-2xl border border-border bg-card overflow-hidden">
              <!-- Con imagen -->
              <div v-if="getImgUrl(img.campo)" class="group relative">
                <div class="aspect-video overflow-hidden">
                  <img :src="getImgUrl(img.campo)!" class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                </div>
                <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                  <a :href="getImgUrl(img.campo)!" target="_blank">
                    <Button size="sm" variant="outline" class="h-8 w-8 p-0 rounded-full text-white border-white/60 hover:bg-white/20">
                      <Icon name="Maximize" :size="14" />
                    </Button>
                  </a>
                  <Button
                    size="sm" variant="outline"
                    class="h-8 w-8 p-0 rounded-full text-red-400 border-red-400/60 hover:bg-red-500/20"
                    :disabled="imgDeleting[img.campo]"
                    @click="deleteImagen(img.campo)"
                  >
                    <Icon v-if="!imgDeleting[img.campo]" name="Trash2" :size="14" />
                    <Icon v-else name="Loader2" :size="14" class="animate-spin" />
                  </Button>
                </div>
              </div>

              <!-- Sin imagen -->
              <div
                v-else
                class="aspect-video flex flex-col items-center justify-center gap-2 bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors"
                @click="triggerImgInput(img.campo)"
              >
                <Icon v-if="!imgUploading[img.campo]" name="ImagePlus" :size="28" class="text-muted" />
                <Icon v-else name="Loader2" :size="28" class="text-primary animate-spin" />
                <span class="text-xs text-muted">{{ imgUploading[img.campo] ? 'Subiendo...' : 'Subir imagen' }}</span>
              </div>

              <!-- Footer -->
              <div class="px-3 py-2 flex items-center justify-between border-t border-border">
                <p class="text-[11px] font-bold text-muted uppercase tracking-wide">{{ img.label }}</p>
                <Button
                  v-if="!getImgUrl(img.campo)"
                  size="sm" variant="outline"
                  class="h-7 px-2 text-xs gap-1"
                  :disabled="imgUploading[img.campo]"
                  @click="triggerImgInput(img.campo)"
                >
                  <Icon name="Upload" :size="12" />
                  Subir
                </Button>
                <Button
                  v-else
                  size="sm" variant="outline"
                  class="h-7 px-2 text-xs gap-1"
                  @click="triggerImgInput(img.campo)"
                >
                  <Icon name="RefreshCcw" :size="12" />
                  Cambiar
                </Button>
              </div>

              <input
                type="file"
                accept=".png,.jpg,.jpeg,.webp,.heic"
                class="hidden"
                :ref="el => imgFileInputs[img.campo] = el as HTMLInputElement"
                @change="handleImgSelect($event, img.campo)"
              />
            </div>
          </div>

        </div>

        <div v-else class="flex flex-col items-center justify-center py-20">
          <div class="w-16 h-16 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center mb-4">
            <Icon name="AlertCircle" :size="32" class="text-red-500" />
          </div>
          <p class="text-base font-bold text-card-foreground mb-2">Error al cargar el préstamo</p>
          <p class="text-sm text-muted mb-6 max-w-md text-center">No se pudo cargar la información del préstamo. Por favor intenta de nuevo o contacta al administrador.</p>
          <Button variant="outline" @click="loadPrestamo" class="gap-2">
            <Icon name="RefreshCw" :size="16" /> Reintentar
          </Button>
        </div>
      </div>
    </div>

    <!-- Modal Aprobación / Rechazo -->
    <div v-if="showAprobacionModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div class="bg-card w-full max-w-md rounded-2xl shadow-2xl border border-border overflow-hidden animate-in zoom-in-95 duration-200">
        <div class="px-6 py-5 border-b border-border flex items-center justify-between"
          :class="aprobacionAccion === 'aprobar' ? 'bg-emerald-50/50 dark:bg-emerald-500/5' : 'bg-red-50/50 dark:bg-red-500/5'">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center"
              :class="aprobacionAccion === 'aprobar' ? 'bg-emerald-100 dark:bg-emerald-500/10' : 'bg-red-100 dark:bg-red-500/10'">
              <Icon :name="aprobacionAccion === 'aprobar' ? 'CheckCircle' : 'XCircle'" :size="20"
                :class="aprobacionAccion === 'aprobar' ? 'text-emerald-600' : 'text-red-500'" />
            </div>
            <div>
              <h3 class="text-base font-bold text-card-foreground">
                {{ aprobacionAccion === 'aprobar' ? 'Aprobar Crédito' : 'Rechazar Crédito' }}
              </h3>
              <p class="text-xs text-muted">Crédito #{{ prestamoId }}</p>
            </div>
          </div>
          <button @click="showAprobacionModal = false" class="p-2 hover:bg-muted rounded-full transition-colors text-muted">
            <Icon name="X" :size="18" />
          </button>
        </div>

        <div class="p-6 space-y-4">
          <p class="text-sm text-card-foreground">
            ¿Confirmas que deseas
            <strong :class="aprobacionAccion === 'aprobar' ? 'text-emerald-600' : 'text-red-500'">
              {{ aprobacionAccion === 'aprobar' ? 'aprobar' : 'rechazar' }}
            </strong>
            este crédito?
          </p>
          <div class="space-y-1">
            <label class="text-xs font-medium text-muted">Observaciones <span class="text-muted/60">(opcional)</span></label>
            <textarea
              v-model="aprobacionObs"
              rows="3"
              placeholder="Motivo o comentario..."
              class="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none resize-none"
            />
          </div>
        </div>

        <div class="px-6 py-4 bg-muted/20 border-t border-border flex justify-end gap-2">
          <Button variant="outline" @click="showAprobacionModal = false" :disabled="aprobacionLoading">Cancelar</Button>
          <Button
            :class="aprobacionAccion === 'aprobar' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-red-500 hover:bg-red-600'"
            :disabled="aprobacionLoading"
            @click="confirmarAprobacion"
            class="gap-2 text-white"
          >
            <Icon v-if="aprobacionLoading" name="Loader2" :size="14" class="animate-spin" />
            {{ aprobacionAccion === 'aprobar' ? 'Confirmar Aprobación' : 'Confirmar Rechazo' }}
          </Button>
        </div>
      </div>
    </div>

    <Footer />
  </div>

  <!-- PAGAR CUOTA MODAL (V2) -->
  <Teleport to="body">
    <div v-if="showPagarModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="fixed inset-0 bg-black/50 backdrop-blur-sm" @click="showPagarModal = false"></div>
      <div class="relative w-full max-w-2xl">
        <RegistrarPagoModal
          :prestamo-id="Number(prestamoId)"
          :ficha-id="pagarFichaId"
          :cliente-nombre="prestamo?.cliente?.nombre"
          @close="showPagarModal = false"
          @registered="showPagarModal = false; loadPrestamo()"
        />
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
</style>
