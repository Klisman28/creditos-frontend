<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRouter } from "vue-router";
import { prestamosService } from "@/services/prestamosService";
import Footer from "@/components/Footer.vue";
import Icon from "@/components/Icon.vue";
import { Button } from "@/components/ui/button";
import { push } from "notivue";

const router = useRouter();

interface FinalizarItem {
  prestamo_id: number;
  codigo: string;
  monto: number;
  clasificacion: string;
  clasificacion_id: number;
  fecha_fin: string | null;
  cliente: string;
  promotor: string;
}

const items = ref<FinalizarItem[]>([]);
const loading = ref(true);
const searchQuery = ref("");
const currentPage = ref(1);
const itemsPerPage = 12;

// Default range: last 7 days + next 90 days (to capture overdue and upcoming)
const today = new Date();
const start = new Date(today);
const end = new Date(today);

start.setDate(start.getDate() - 7); // 7 days in the past (catch overdue)
end.setDate(end.getDate() + 90);   // 90 days in the future

const fechaInicio = ref(start.toISOString().slice(0, 10));
const fechaFin = ref(end.toISOString().slice(0, 10));

const loadData = async () => {
  loading.value = true;
  try {
    const data = await prestamosService.getAFinalizar({
      inicio: fechaInicio.value,
      fin: fechaFin.value,
    });

    // Debugg log
    console.log("Respuesta del servidor:", data);

    // Handle both formats: {items: [...]} or direct array
    items.value = data.items ?? (Array.isArray(data) ? data : []);

    if (items.value.length === 0) {
      push.info("No hay créditos por finalizar en este periodo");
    }
  } catch (error: any) {
    console.error("Error detallado:", error);
    const message = error.response?.data?.detail || "Error al cargar créditos a finalizar";
    push.error(message);
  } finally {
    loading.value = false;
  }
};

onMounted(loadData);

const filtered = computed(() => {
  if (!searchQuery.value) return items.value;
  const q = searchQuery.value.toLowerCase();
  return items.value.filter((i) =>
    `${i.codigo} ${i.cliente} ${i.promotor}`.toLowerCase().includes(q)
  );
});

const totalPages = computed(() => Math.ceil(filtered.value.length / itemsPerPage));
const paginated = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  return filtered.value.slice(start, start + itemsPerPage);
});

const formatMoney = (val: number) =>
  `Q${val.toLocaleString("es-GT", { minimumFractionDigits: 2 })}`;

const formatDate = (d: string | null) => {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("es-GT", {
    day: "2-digit", month: "short", year: "numeric",
  });
};

const getClasificacionBadge = (id: number) => {
  const map: Record<number, { label: string; class: string }> = {
    0: { label: "Normal", class: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" },
    1: { label: "A", class: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400" },
    2: { label: "B", class: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400" },
    3: { label: "C", class: "bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400" },
    4: { label: "D", class: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400" },
  };
  return map[id] || map[0];
};
</script>

<template>
  <div class="grid grid-cols-12 mt-2 mb-6 gap-7">
    <!-- Header -->
    <div class="col-span-12">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 class="text-2xl font-bold text-card-foreground">Créditos a Finalizar</h2>
          <p class="text-sm text-muted mt-1">Préstamos que finalizan dentro del periodo seleccionado</p>
        </div>
      </div>
    </div>

    <!-- Date Filter -->
    <div class="col-span-12">
      <div class="rounded-xl border border-border bg-card p-5">
        <div class="flex flex-col sm:flex-row gap-4 items-end">
          <div class="flex-1">
            <label class="block text-xs font-medium text-muted mb-1.5">Rango:</label>
            <div class="flex items-center gap-2">
              <input v-model="fechaInicio" type="date"
                class="flex-1 px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
              <span class="text-muted text-sm">—</span>
              <input v-model="fechaFin" type="date"
                class="flex-1 px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
            </div>
          </div>
          <Button @click="loadData" class="gap-2 shrink-0">
            <Icon name="Search" :size="16" />
            Buscar
          </Button>
        </div>
        <p class="text-xs text-muted mt-3">
          <strong class="text-card-foreground">{{ items.length }}</strong> préstamos finalizan en este periodo
        </p>
      </div>
    </div>

    <!-- Content -->
    <div class="col-span-12">
      <div v-if="loading" class="p-12 text-center">
        <div class="w-10 h-10 border-4 rounded-full border-border animate-spin border-t-primary mx-auto mb-4"></div>
        <p class="text-sm text-muted">Cargando...</p>
      </div>

      <div v-else-if="filtered.length === 0" class="rounded-xl border border-border bg-card p-12 text-center">
        <Icon name="CalendarCheck" :size="48" class="text-muted mx-auto mb-4" />
        <h4 class="text-lg font-semibold text-card-foreground mb-2">No hay créditos por finalizar</h4>
        <p class="text-sm text-muted mb-4">No se encontraron préstamos que finalicen entre:</p>
        <p class="text-xs text-muted font-mono bg-muted/20 inline-block px-3 py-2 rounded">
          {{ formatDate(fechaInicio + "T00:00:00") }} hasta {{ formatDate(fechaFin + "T00:00:00") }}
        </p>
        <p class="text-xs text-muted mt-4">Intenta cambiar el rango de fechas o verifica que los créditos estén marcados como pendientes en el sistema</p>
      </div>

      <div v-else class="rounded-xl border border-border bg-card overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-muted/30 border-b border-border">
                <th class="text-left px-5 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider">Préstamo</th>
                <th class="text-right px-5 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider">Monto</th>
                <th class="text-center px-5 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider">Clasificación</th>
                <th class="text-left px-5 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider">Fecha Final</th>
                <th class="text-left px-5 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider">Cliente</th>
                <th class="text-left px-5 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider">Promotor</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <tr v-for="item in paginated" :key="item.prestamo_id" class="transition-colors hover:bg-hover group">
                <td class="px-5 py-4">
                  <div
                    class="flex items-center gap-3 cursor-pointer group/item"
                    @click="router.push({ name: 'prestamoDetalle', params: { id: item.prestamo_id } })"
                  >
                    <div class="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-sm group-hover/item:scale-110 transition-transform">
                      <Icon name="CalendarClock" :size="16" class="text-white" />
                    </div>
                    <span class="font-semibold text-primary font-mono group-hover/item:underline">{{ item.codigo }}</span>
                  </div>
                </td>
                <td class="px-5 py-4 text-right font-bold text-card-foreground">{{ formatMoney(item.monto) }}</td>
                <td class="px-5 py-4 text-center">
                  <span :class="[getClasificacionBadge(item.clasificacion_id).class, 'px-3 py-1 rounded-full text-xs font-bold']">
                    {{ getClasificacionBadge(item.clasificacion_id).label }}
                  </span>
                </td>
                <td class="px-5 py-4 text-sm text-card-foreground font-medium">
                  <div class="flex items-center gap-2">
                    <Icon name="Calendar" :size="14" class="text-muted" />
                    {{ formatDate(item.fecha_fin) }}
                  </div>
                </td>
                <td class="px-5 py-4 font-medium text-card-foreground group-hover:text-primary transition-colors">{{ item.cliente }}</td>
                <td class="px-5 py-4 text-muted">
                  <div class="flex items-center gap-2">
                    <Icon name="User" :size="14" class="text-muted" />
                    {{ item.promotor }}
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
</template>
