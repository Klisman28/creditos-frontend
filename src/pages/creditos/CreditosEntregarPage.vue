<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRouter } from "vue-router";
import { prestamosService } from "@/services/prestamosService";
import Footer from "@/components/Footer.vue";
import Icon from "@/components/Icon.vue";
import { Button } from "@/components/ui/button";
import { push } from "notivue";

const router = useRouter();

interface EntregarItem {
  prestamo_id: number;
  codigo: string;
  monto: number;
  cliente: string;
  cliente_id: number;
  plan: string;
  fecha_desembolso: string | null;
  observaciones: string | null;
}

const items = ref<EntregarItem[]>([]);
const loading = ref(true);
const searchQuery = ref("");
const currentPage = ref(1);
const itemsPerPage = 12;

const loadData = async () => {
  loading.value = true;
  try {
    const data = await prestamosService.getAEntregar();
    items.value = data.items ?? data;
  } catch (error) {
    push.error("Error al cargar créditos a entregar");
  } finally {
    loading.value = false;
  }
};

onMounted(loadData);

const filtered = computed(() => {
  if (!searchQuery.value) return items.value;
  const q = searchQuery.value.toLowerCase();
  return items.value.filter((i) =>
    `${i.codigo} ${i.cliente} ${i.cliente_id}`.toLowerCase().includes(q)
  );
});

const totalPages = computed(() => Math.ceil(filtered.value.length / itemsPerPage));
const paginated = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  return filtered.value.slice(start, start + itemsPerPage);
});

const totalMonto = computed(() => items.value.reduce((s, i) => s + i.monto, 0));

const formatMoney = (val: number) =>
  `Q${val.toLocaleString("es-GT", { minimumFractionDigits: 2 })}`;

const formatDate = (d: string | null) => {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("es-GT", {
    day: "2-digit", month: "short", year: "numeric",
  });
};
</script>

<template>
  <div class="grid grid-cols-12 mt-2 mb-6 gap-7">
    <!-- Header -->
    <div class="col-span-12">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 class="text-2xl font-bold text-card-foreground">Créditos a Entregar</h2>
          <p class="text-sm text-muted mt-1">Préstamos aprobados pendientes de desembolso</p>
        </div>
        <Button @click="loadData" variant="outline" class="gap-2">
          <Icon name="RefreshCw" :size="16" />
          Actualizar
        </Button>
      </div>
    </div>

    <!-- Summary -->
    <div class="col-span-12 sm:col-span-6">
      <div class="rounded-xl border border-border bg-card p-5 relative overflow-hidden">
        <div class="absolute -top-6 -right-6 w-24 h-24 rounded-full blur-2xl bg-blue-500/10"></div>
        <div class="relative flex items-start justify-between">
          <div>
            <p class="text-xs font-medium text-muted uppercase tracking-wider mb-1">Créditos Pendientes</p>
            <p class="text-3xl font-bold text-card-foreground">{{ items.length }}</p>
          </div>
          <div class="bg-gradient-to-br from-blue-500 to-indigo-600 w-11 h-11 rounded-lg flex items-center justify-center shadow-lg">
            <Icon name="Send" :size="20" class="text-white" />
          </div>
        </div>
      </div>
    </div>
    <div class="col-span-12 sm:col-span-6">
      <div class="rounded-xl border border-border bg-card p-5 relative overflow-hidden">
        <div class="absolute -top-6 -right-6 w-24 h-24 rounded-full blur-2xl bg-emerald-500/10"></div>
        <div class="relative flex items-start justify-between">
          <div>
            <p class="text-xs font-medium text-muted uppercase tracking-wider mb-1">Monto Total a Entregar</p>
            <p class="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{{ formatMoney(totalMonto) }}</p>
          </div>
          <div class="bg-gradient-to-br from-emerald-500 to-teal-600 w-11 h-11 rounded-lg flex items-center justify-center shadow-lg">
            <Icon name="Banknote" :size="20" class="text-white" />
          </div>
        </div>
      </div>
    </div>

    <!-- Search -->
    <div class="col-span-12">
      <div class="rounded-xl border border-border bg-card p-5">
        <div class="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div class="relative w-full sm:w-96">
            <Icon name="Search" :size="18" class="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input v-model="searchQuery" type="text"
              placeholder="Buscar crédito: Código, Cliente, Cod. Cliente..."
              class="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-background text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
              @input="currentPage = 1" />
          </div>
          <span class="text-sm text-muted">
            <strong class="text-card-foreground">{{ filtered.length }}</strong> créditos
          </span>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="col-span-12">
      <div v-if="loading" class="p-12 text-center">
        <div class="w-10 h-10 border-4 rounded-full border-border animate-spin border-t-primary mx-auto mb-4"></div>
        <p class="text-sm text-muted">Cargando...</p>
      </div>

      <div v-else-if="filtered.length === 0" class="rounded-xl border border-border bg-card p-12 text-center">
        <Icon name="PackageCheck" :size="48" class="text-muted mx-auto mb-4" />
        <h4 class="text-lg font-semibold text-card-foreground mb-2">No hay créditos pendientes de entrega</h4>
        <p class="text-sm text-muted">Todos los créditos aprobados han sido desembolsados</p>
      </div>

      <div v-else class="rounded-xl border border-border bg-card overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-muted/30 border-b border-border">
                <th class="text-left px-5 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider">Préstamo</th>
                <th class="text-right px-5 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider">Monto</th>
                <th class="text-left px-5 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider">Cliente</th>
                <th class="text-center px-5 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider">Cod. Cliente</th>
                <th class="text-left px-5 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider">Plan</th>
                <th class="text-left px-5 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider">Desembolso</th>
                <th class="text-center px-5 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider">Acción</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <tr v-for="item in paginated" :key="item.prestamo_id" class="transition-colors hover:bg-hover group">
                <td class="px-5 py-4">
                  <div
                    class="flex items-center gap-3 cursor-pointer group/item"
                    @click="router.push({ name: 'prestamoDetalle', params: { id: item.prestamo_id } })"
                  >
                    <div class="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm group-hover/item:scale-110 transition-transform">
                      <Icon name="FileText" :size="16" class="text-white" />
                    </div>
                    <span class="font-semibold text-primary font-mono group-hover/item:underline">{{ item.codigo }}</span>
                  </div>
                </td>
                <td class="px-5 py-4 text-right font-bold text-card-foreground">{{ formatMoney(item.monto) }}</td>
                <td
                  class="px-5 py-4 font-medium text-card-foreground hover:text-primary transition-colors cursor-pointer"
                  @click="router.push({ name: 'clienteDetalle', params: { id: item.cliente_id } })"
                >
                  {{ item.cliente }}
                </td>
                <td class="px-5 py-4 text-center">
                  <span class="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700 text-xs font-mono font-semibold text-card-foreground">{{ item.cliente_id }}</span>
                </td>
                <td class="px-5 py-4">
                  <span class="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">{{ item.plan }}</span>
                </td>
                <td class="px-5 py-4 text-xs text-muted">{{ formatDate(item.fecha_desembolso) }}</td>
                <td class="px-5 py-4 text-center">
                  <button class="flex items-center gap-1.5 px-3 py-1.5 mx-auto rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-medium transition-colors" title="Entregar crédito">
                    <Icon name="SendHorizonal" :size="13" />
                    Entregar
                  </button>
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
