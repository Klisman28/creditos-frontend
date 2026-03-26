<script setup lang="ts">
import { BellRing } from "lucide-vue-next";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import Icon from "@/components/Icon.vue";
import { useNotificaciones, timeAgo } from "@/composables/useNotificaciones";

const {
  notificaciones,
  unreadCount,
  loading,
  refresh,
  marcarTodasLeidas,
  abrirNotificacion,
} = useNotificaciones();

const formatMonto = (val: number | null) => {
  if (val == null) return "";
  return `Q${val.toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
</script>

<template>
  <Popover>
    <PopoverTrigger as-child>
      <!-- Bell with badge -->
      <button class="relative" aria-label="Notificaciones">
        <BellRing :strokeWidth="1.5" :size="20" class="text-primary" />
        <span
          v-if="unreadCount > 0"
          class="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none"
        >
          {{ unreadCount > 99 ? "99+" : unreadCount }}
        </span>
      </button>
    </PopoverTrigger>

    <PopoverContent class="w-[360px] p-0 mt-2 overflow-hidden">

      <!-- ── Header ─────────────────────────────────────────────── -->
      <div class="flex items-center justify-between px-4 py-3 border-b border-border">
        <div class="flex items-center gap-2">
          <p class="text-sm font-bold text-card-foreground">Notificaciones</p>
          <span
            v-if="unreadCount > 0"
            class="text-[10px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full leading-tight"
          >
            {{ unreadCount }}
          </span>
        </div>
        <div class="flex items-center gap-2">
          <!-- Refresh -->
          <button
            @click="refresh"
            class="p-1.5 rounded-lg hover:bg-hover transition-colors"
            title="Actualizar"
          >
            <Icon
              name="RefreshCw"
              :size="13"
              :class="['text-muted transition-transform', loading ? 'animate-spin' : '']"
            />
          </button>
          <!-- Marcar todas leídas -->
          <button
            v-if="unreadCount > 0"
            @click="marcarTodasLeidas"
            class="text-[11px] font-semibold text-primary hover:underline transition-colors"
            title="Marcar todas como leídas"
          >
            Leer todas
          </button>
        </div>
      </div>

      <!-- ── Loading skeleton ───────────────────────────────────── -->
      <div v-if="loading && notificaciones.length === 0" class="py-3">
        <div
          v-for="i in 3"
          :key="i"
          class="flex gap-3 items-start px-4 py-3 animate-pulse"
        >
          <div class="w-8 h-8 rounded-lg bg-muted shrink-0 mt-0.5"></div>
          <div class="flex-1 space-y-1.5">
            <div class="h-3 bg-muted rounded w-3/4"></div>
            <div class="h-3 bg-muted rounded w-full"></div>
            <div class="h-2.5 bg-muted rounded w-1/3"></div>
          </div>
        </div>
      </div>

      <!-- ── Empty state ────────────────────────────────────────── -->
      <div
        v-else-if="!loading && notificaciones.length === 0"
        class="flex flex-col items-center gap-2 py-10 px-4"
      >
        <div class="w-12 h-12 rounded-2xl bg-muted/40 flex items-center justify-center">
          <Icon name="BellOff" :size="22" class="text-muted" />
        </div>
        <p class="text-sm font-medium text-card-foreground">Sin notificaciones</p>
        <p class="text-xs text-muted text-center">
          Aquí aparecerán los créditos que requieran aprobación.
        </p>
      </div>

      <!-- ── Notification list ──────────────────────────────────── -->
      <div v-else class="max-h-[360px] overflow-y-auto divide-y divide-border">
        <button
          v-for="item in notificaciones"
          :key="item.id"
          class="w-full text-left flex gap-3 items-start px-4 py-3.5 transition-colors hover:bg-hover group"
          :class="{ 'bg-blue-50/50 dark:bg-blue-500/5': item.leido === 0 }"
          @click="abrirNotificacion(item)"
        >
          <!-- Icon + unread dot -->
          <div class="relative shrink-0 mt-0.5">
            <div
              class="w-9 h-9 rounded-xl flex items-center justify-center"
              :class="item.leido === 0 ? 'bg-amber-100 dark:bg-amber-500/15' : 'bg-muted/50'"
            >
              <Icon
                name="FileWarning"
                :size="17"
                :class="item.leido === 0 ? 'text-amber-600 dark:text-amber-400' : 'text-muted'"
              />
            </div>
            <!-- unread indicator -->
            <span
              v-if="item.leido === 0"
              class="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-primary border-2 border-card"
            ></span>
          </div>

          <!-- Content -->
          <div class="flex-1 min-w-0">
            <p
              class="text-[13px] leading-tight mb-0.5 truncate"
              :class="item.leido === 0 ? 'font-bold text-card-foreground' : 'font-medium text-card-foreground'"
            >
              {{ item.titulo }}
            </p>
            <p class="text-xs text-muted leading-snug line-clamp-2">
              {{ item.mensaje }}
            </p>
            <div class="flex items-center gap-2 mt-1.5">
              <span
                v-if="item.monto"
                class="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded-full"
              >
                {{ formatMonto(item.monto) }}
              </span>
              <span class="text-[10px] text-muted">
                {{ item.created_at ? timeAgo(item.created_at) : "" }}
              </span>
            </div>
          </div>

          <!-- Arrow -->
          <Icon
            name="ChevronRight"
            :size="13"
            class="text-muted shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
          />
        </button>
      </div>

      <!-- ── Footer ─────────────────────────────────────────────── -->
      <div v-if="notificaciones.length > 0" class="border-t border-border px-4 py-2.5">
        <RouterLink
          to="/prestamos"
          class="block text-xs font-semibold text-center text-primary hover:underline transition-colors"
        >
          Ver todos los préstamos →
        </RouterLink>
      </div>

    </PopoverContent>
  </Popover>
</template>
