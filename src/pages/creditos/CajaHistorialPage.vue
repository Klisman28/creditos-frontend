<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { push } from "notivue";
import Icon from "@/components/Icon.vue";
import Footer from "@/components/Footer.vue";
import { Button } from "@/components/ui/button";
import cajaService from "@/services/cajaService";
import type { CashSession } from "@/services/cajaService";

const router = useRouter();

// ─── State ────────────────────────────────────────────────────────────

const loading = ref(true);
const sessions = ref<CashSession[]>([]);
const searchQuery = ref("");
const filterEstado = ref<"" | "ABIERTA" | "CERRADA">("");

// ─── Load ─────────────────────────────────────────────────────────────

const loadSessions = async () => {
  loading.value = true;
  try {
    sessions.value = await cajaService.getSessions(0, 100);
  } catch (e: any) {
    push.error(e.response?.data?.detail || "Error al cargar historial de caja");
  } finally {
    loading.value = false;
  }
};

onMounted(loadSessions);

// ─── Computed ─────────────────────────────────────────────────────────

const filtered = computed(() => {
  let items = sessions.value;
  if (filterEstado.value) {
    items = items.filter((s) => s.estado === filterEstado.value);
  }
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase();
    items = items.filter(
      (s) =>
        String(s.id).includes(q) ||
        s.fecha.includes(q) ||
        s.estado.toLowerCase().includes(q)
    );
  }
  return items;
});

const totalAbierta = computed(() => sessions.value.filter((s) => s.estado === "ABIERTA").length);
const totalCerrada = computed(() => sessions.value.filter((s) => s.estado === "CERRADA").length);

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

</script>

<template>
  <div class="grid grid-cols-12 mt-2 mb-6 gap-7">

    <!-- Header -->
    <div class="col-span-12 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h2 class="text-2xl font-bold text-card-foreground">Historial de Caja</h2>
        <p class="text-sm text-muted mt-1">Todas las sesiones registradas</p>
      </div>
      <Button variant="outline" size="sm" class="gap-2 self-start" @click="router.push('/caja')">
        <Icon name="Vault" :size="14" />
        Ir a Caja Activa
      </Button>
    </div>

    <!-- Summary cards -->
    <div class="col-span-12 sm:col-span-4">
      <div class="rounded-xl border border-border bg-card p-5 hover:shadow-md transition-all">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-medium text-muted uppercase tracking-wide">Total Sesiones</p>
            <h3 class="text-2xl font-bold text-card-foreground mt-1">{{ sessions.length }}</h3>
          </div>
          <div class="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
            <Icon name="Vault" :size="20" class="text-primary" />
          </div>
        </div>
      </div>
    </div>

    <div class="col-span-12 sm:col-span-4">
      <div class="rounded-xl border border-border bg-card p-5 hover:shadow-md transition-all">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-medium text-muted uppercase tracking-wide">Abiertas</p>
            <h3 class="text-2xl font-bold text-emerald-600 mt-1">{{ totalAbierta }}</h3>
          </div>
          <div class="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
            <Icon name="Unlock" :size="20" class="text-emerald-600 dark:text-emerald-400" />
          </div>
        </div>
      </div>
    </div>

    <div class="col-span-12 sm:col-span-4">
      <div class="rounded-xl border border-border bg-card p-5 hover:shadow-md transition-all">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-medium text-muted uppercase tracking-wide">Cerradas</p>
            <h3 class="text-2xl font-bold text-muted-foreground mt-1">{{ totalCerrada }}</h3>
          </div>
          <div class="w-11 h-11 rounded-xl bg-muted flex items-center justify-center">
            <Icon name="Lock" :size="20" class="text-muted-foreground" />
          </div>
        </div>
      </div>
    </div>

    <!-- Table -->
    <div class="col-span-12">
      <div class="rounded-xl border border-border bg-card overflow-hidden">
        <!-- Toolbar -->
        <div class="flex flex-col sm:flex-row items-start sm:items-center gap-3 px-6 py-4 border-b border-border">
          <div class="relative flex-1 max-w-sm w-full">
            <Icon name="Search" :size="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Buscar por ID, fecha..."
              class="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none"
            />
          </div>
          <select
            v-model="filterEstado"
            class="px-3 py-2 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none text-card-foreground"
          >
            <option value="">Todos los estados</option>
            <option value="ABIERTA">Abierta</option>
            <option value="CERRADA">Cerrada</option>
          </select>
          <Button variant="outline" size="sm" class="gap-2" @click="loadSessions" :disabled="loading">
            <Icon name="RefreshCw" :size="14" :class="loading ? 'animate-spin' : ''" />
            Actualizar
          </Button>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="p-12 text-center">
          <div class="w-10 h-10 border-4 rounded-full border-border animate-spin border-t-primary mx-auto mb-4"></div>
          <p class="text-sm text-muted">Cargando sesiones...</p>
        </div>

        <!-- Empty -->
        <div v-else-if="filtered.length === 0" class="p-12 text-center">
          <div class="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Icon name="Vault" :size="32" class="text-primary" />
          </div>
          <h4 class="text-lg font-semibold text-card-foreground mb-2">Sin sesiones registradas</h4>
          <p class="text-sm text-muted">No se encontraron sesiones de caja con los filtros actuales.</p>
        </div>

        <!-- Table -->
        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-muted/30 text-muted uppercase text-[10px] tracking-widest font-bold border-b border-border">
                <th class="px-5 py-3 text-left">ID</th>
                <th class="px-5 py-3 text-left">Fecha</th>
                <th class="px-5 py-3 text-left">Apertura</th>
                <th class="px-5 py-3 text-left">Cierre</th>
                <th class="px-5 py-3 text-right">Monto Apertura</th>
                <th class="px-5 py-3 text-right">Monto Contado</th>
                <th class="px-5 py-3 text-center">Estado</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <tr
                v-for="session in filtered"
                :key="session.id"
                class="hover:bg-muted/20 transition-colors cursor-pointer"
                @click="router.push('/caja')"
              >
                <td class="px-5 py-3 text-muted font-mono text-xs">#{{ session.id }}</td>
                <td class="px-5 py-3 text-card-foreground font-medium">{{ fmtDate(session.fecha) }}</td>
                <td class="px-5 py-3 text-muted text-xs font-mono">{{ fmtDatetime(session.opened_at) }}</td>
                <td class="px-5 py-3 text-muted text-xs font-mono">{{ fmtDatetime(session.closed_at) }}</td>
                <td class="px-5 py-3 text-right font-mono font-bold text-card-foreground">{{ fmt(session.monto_apertura) }}</td>
                <td class="px-5 py-3 text-right font-mono font-bold">
                  <span v-if="session.monto_cierre !== null" class="text-card-foreground">{{ fmt(session.monto_cierre) }}</span>
                  <span v-else class="text-muted">—</span>
                </td>
                <td class="px-5 py-3 text-center">
                  <span
                    :class="[
                      'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide',
                      session.estado === 'ABIERTA'
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                        : 'bg-muted text-muted-foreground'
                    ]"
                  >
                    <span class="w-1.5 h-1.5 rounded-full bg-current" :class="session.estado === 'ABIERTA' ? 'animate-pulse' : ''"></span>
                    {{ session.estado === "ABIERTA" ? "Abierta" : "Cerrada" }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <Footer />
  </div>
</template>
