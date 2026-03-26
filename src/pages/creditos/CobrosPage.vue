<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import apiClient from "@/apiClient";
import Footer from "@/components/Footer.vue";
import Icon from "@/components/Icon.vue";
import { Button } from "@/components/ui/button";
import { push } from "notivue";

interface PagoItem {
  ficha_id: number;
  prestamo_id: number;
  dpi: string;
  cliente: string;
  ruta: string;
  hora: string;
  no_dia: number;
  cuota: number;
  mora: number;
  interes: number;
  capital: number;
  total: number;
  estado: number;
  estado_label: string;
}

interface PagosHoyResponse {
  fecha: string;
  total: number;
  total_cuota: number;
  items: PagoItem[];
}

const loading = ref(true);
const data = ref<PagosHoyResponse | null>(null);
const searchQuery = ref("");

// Cobrar modal state
const showCobrarModal = ref(false);
const selectedPago = ref<PagoItem | null>(null);
const cobrarForm = ref({ monto: 0, mora: 0 });
const cobrarSaving = ref(false);

const loadData = async () => {
  loading.value = true;
  try {
    const res = await apiClient.get("/pagos/hoy");
    data.value = res.data;
  } catch (error: any) {
    push.error(error.response?.data?.detail || "Error al cargar cobros del día");
  } finally {
    loading.value = false;
  }
};

onMounted(loadData);

const cobrosRealizados = computed(() =>
  data.value?.items.filter((i) => i.estado === 1).length ?? 0
);
const cobrosPendientes = computed(() =>
  data.value?.items.filter((i) => i.estado === 0).length ?? 0
);
const totalRecaudado = computed(() =>
  data.value?.items
    .filter((i) => i.estado === 1)
    .reduce((acc, i) => acc + (i.total || 0), 0) ?? 0
);

const filteredItems = computed(() => {
  if (!data.value) return [];
  const q = searchQuery.value.toLowerCase().trim();
  if (!q) return data.value.items;
  return data.value.items.filter(
    (i) =>
      i.cliente.toLowerCase().includes(q) ||
      i.ruta.toLowerCase().includes(q)
  );
});

const openCobrar = (pago: PagoItem) => {
  selectedPago.value = pago;
  cobrarForm.value = { monto: pago.total, mora: pago.mora || 0 };
  showCobrarModal.value = true;
};

const handleCobrar = async () => {
  if (!selectedPago.value) return;
  cobrarSaving.value = true;
  try {
    await apiClient.post("/pagos/efectuar", {
      ficha_pago_id: selectedPago.value.ficha_id,
      monto: cobrarForm.value.monto,
      mora: cobrarForm.value.mora,
    });
    push.success(`Cobro registrado para ${selectedPago.value.cliente}`);
    showCobrarModal.value = false;
    selectedPago.value = null;
    await loadData();
  } catch (error: any) {
    push.error(error.response?.data?.detail || "Error al efectuar el cobro");
  } finally {
    cobrarSaving.value = false;
  }
};

const formatMoney = (val: number | null | undefined) =>
  `Q${(val || 0).toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatHora = (hora: string | null) => {
  if (!hora) return "—";
  return hora.substring(0, 5);
};
</script>

<template>
  <div class="grid grid-cols-12 mt-2 mb-6 gap-7">
    <!-- Header -->
    <div class="col-span-12">
      <h2 class="text-2xl font-bold text-card-foreground">Cobros del Día</h2>
      <p class="text-sm text-muted mt-1">Registro y seguimiento de cobros realizados hoy</p>
    </div>

    <!-- Stat Cards -->
    <div class="col-span-12 sm:col-span-4">
      <div class="rounded-xl border border-border bg-card p-5 transition-all hover:shadow-md">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-medium text-muted uppercase tracking-wide">Cobros Realizados</p>
            <h3 class="text-2xl font-bold text-emerald-600 mt-1">
              <span v-if="loading">—</span>
              <span v-else>{{ cobrosRealizados }}</span>
            </h3>
          </div>
          <div class="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
            <Icon name="CheckCircle" :size="20" class="text-emerald-600 dark:text-emerald-400" />
          </div>
        </div>
      </div>
    </div>

    <div class="col-span-12 sm:col-span-4">
      <div class="rounded-xl border border-border bg-card p-5 transition-all hover:shadow-md">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-medium text-muted uppercase tracking-wide">Pendientes</p>
            <h3 class="text-2xl font-bold text-amber-600 mt-1">
              <span v-if="loading">—</span>
              <span v-else>{{ cobrosPendientes }}</span>
            </h3>
          </div>
          <div class="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
            <Icon name="Clock" :size="20" class="text-amber-600 dark:text-amber-400" />
          </div>
        </div>
      </div>
    </div>

    <div class="col-span-12 sm:col-span-4">
      <div class="rounded-xl border border-border bg-card p-5 transition-all hover:shadow-md">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-medium text-muted uppercase tracking-wide">Total Recaudado</p>
            <h3 class="text-2xl font-bold text-blue-600 mt-1">
              <span v-if="loading">—</span>
              <span v-else>{{ formatMoney(totalRecaudado) }}</span>
            </h3>
          </div>
          <div class="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
            <Icon name="HandCoins" :size="20" class="text-blue-600 dark:text-blue-400" />
          </div>
        </div>
      </div>
    </div>

    <!-- Search + Table -->
    <div class="col-span-12">
      <div class="rounded-xl border border-border bg-card overflow-hidden">
        <!-- Toolbar -->
        <div class="flex items-center gap-3 px-6 py-4 border-b border-border">
          <div class="relative flex-1 max-w-sm">
            <Icon name="Search" :size="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Buscar por cliente o ruta..."
              class="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none"
            />
          </div>
          <Button variant="outline" size="sm" class="gap-2" @click="loadData" :disabled="loading">
            <Icon name="RefreshCw" :size="14" :class="loading ? 'animate-spin' : ''" />
            Actualizar
          </Button>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="p-12 text-center">
          <div class="w-10 h-10 border-4 rounded-full border-border animate-spin border-t-primary mx-auto mb-4"></div>
          <p class="text-sm text-muted">Cargando cobros del día...</p>
        </div>

        <!-- Empty State -->
        <div v-else-if="filteredItems.length === 0" class="p-12 text-center">
          <div class="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Icon name="HandCoins" :size="32" class="text-primary" />
          </div>
          <h4 class="text-lg font-semibold text-card-foreground mb-2">
            {{ data?.items.length === 0 ? 'No hay cobros programados para hoy' : 'No se encontraron resultados' }}
          </h4>
          <p class="text-sm text-muted">
            {{ data?.items.length === 0 ? 'Las fichas de cobro aparecerán aquí cuando haya registros para el día.' : 'Intente con otro término de búsqueda.' }}
          </p>
        </div>

        <!-- Table -->
        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-muted/30 text-muted uppercase text-[10px] tracking-widest font-bold border-b border-border">
                <th class="px-4 py-3 text-left">Cliente</th>
                <th class="px-4 py-3 text-left">Ruta</th>
                <th class="px-4 py-3 text-left">Hora</th>
                <th class="px-4 py-3 text-right">Cuota</th>
                <th class="px-4 py-3 text-right">Mora</th>
                <th class="px-4 py-3 text-right">Total</th>
                <th class="px-4 py-3 text-center">Estado</th>
                <th class="px-4 py-3 text-center">Acción</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <tr
                v-for="item in filteredItems"
                :key="item.ficha_id"
                class="hover:bg-muted/20 transition-colors"
              >
                <td class="px-4 py-3">
                  <div class="font-medium text-card-foreground">{{ item.cliente }}</div>
                  <div class="text-xs text-muted">{{ item.dpi }}</div>
                </td>
                <td class="px-4 py-3 text-muted">{{ item.ruta || '—' }}</td>
                <td class="px-4 py-3 text-muted font-mono">{{ formatHora(item.hora) }}</td>
                <td class="px-4 py-3 text-right font-mono">{{ formatMoney(item.cuota) }}</td>
                <td class="px-4 py-3 text-right font-mono" :class="item.mora > 0 ? 'text-red-500 font-bold' : 'text-muted'">
                  {{ formatMoney(item.mora) }}
                </td>
                <td class="px-4 py-3 text-right font-bold font-mono text-card-foreground">{{ formatMoney(item.total) }}</td>
                <td class="px-4 py-3 text-center">
                  <span
                    :class="[
                      'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide',
                      item.estado === 1
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                        : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
                    ]"
                  >
                    <span class="w-1.5 h-1.5 rounded-full bg-current"></span>
                    {{ item.estado_label || (item.estado === 1 ? 'Cobrado' : 'Pendiente') }}
                  </span>
                </td>
                <td class="px-4 py-3 text-center">
                  <Button
                    v-if="item.estado === 0"
                    size="sm"
                    variant="default"
                    class="h-8 gap-1 text-xs"
                    @click="openCobrar(item)"
                  >
                    <Icon name="HandCoins" :size="13" />
                    Cobrar
                  </Button>
                  <span v-else class="text-emerald-500">
                    <Icon name="CheckCircle2" :size="18" />
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Cobrar Modal -->
    <div
      v-if="showCobrarModal && selectedPago"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    >
      <div class="bg-card w-full max-w-md rounded-2xl shadow-2xl border border-border overflow-hidden animate-in zoom-in-95 duration-200">
        <!-- Modal Header -->
        <div class="px-6 py-5 border-b border-border flex items-center justify-between bg-muted/30">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Icon name="HandCoins" :size="20" class="text-primary" />
            </div>
            <div>
              <h3 class="text-base font-bold text-card-foreground">Registrar Cobro</h3>
              <p class="text-xs text-muted">{{ selectedPago.cliente }}</p>
            </div>
          </div>
          <button
            @click="showCobrarModal = false"
            class="p-2 hover:bg-muted rounded-full transition-colors text-muted"
          >
            <Icon name="X" :size="18" />
          </button>
        </div>

        <!-- Modal Body -->
        <div class="p-6 space-y-4">
          <!-- Info row -->
          <div class="grid grid-cols-3 gap-3 text-xs bg-muted/20 rounded-xl p-4 border border-border">
            <div>
              <span class="text-muted block mb-0.5">Ruta</span>
              <span class="font-bold text-card-foreground">{{ selectedPago.ruta || '—' }}</span>
            </div>
            <div>
              <span class="text-muted block mb-0.5">Cuota</span>
              <span class="font-bold text-card-foreground">{{ formatMoney(selectedPago.cuota) }}</span>
            </div>
            <div>
              <span class="text-muted block mb-0.5">Mora Calc.</span>
              <span class="font-bold text-red-500">{{ formatMoney(selectedPago.mora) }}</span>
            </div>
          </div>

          <div class="space-y-2">
            <label class="text-xs font-bold text-muted uppercase tracking-widest">Monto a Cobrar</label>
            <input
              v-model.number="cobrarForm.monto"
              type="number"
              min="0"
              step="0.01"
              class="w-full px-4 py-3 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none font-bold text-lg"
            />
          </div>

          <div class="space-y-2">
            <label class="text-xs font-bold text-muted uppercase tracking-widest">Mora (Opcional)</label>
            <input
              v-model.number="cobrarForm.mora"
              type="number"
              min="0"
              step="0.01"
              class="w-full px-4 py-3 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none"
            />
          </div>

          <div class="bg-primary/5 rounded-xl p-4 border border-primary/10 flex items-center justify-between">
            <span class="text-sm font-bold text-primary/80 uppercase">Total</span>
            <span class="text-xl font-black text-primary">{{ formatMoney(cobrarForm.monto + cobrarForm.mora) }}</span>
          </div>
        </div>

        <!-- Modal Footer -->
        <div class="px-6 py-4 bg-muted/30 border-t border-border flex justify-end gap-3">
          <Button variant="outline" @click="showCobrarModal = false" :disabled="cobrarSaving">
            Cancelar
          </Button>
          <Button
            variant="default"
            @click="handleCobrar"
            :disabled="cobrarSaving || cobrarForm.monto <= 0"
            class="px-6 shadow-lg shadow-primary/20 min-w-[120px]"
          >
            <span v-if="!cobrarSaving">Confirmar Cobro</span>
            <div v-else class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          </Button>
        </div>
      </div>
    </div>

    <Footer />
  </div>
</template>
