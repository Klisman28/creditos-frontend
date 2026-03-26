import { ref, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import notificacionesService, { type Notificacion } from "@/services/notificacionesService";

const POLL_INTERVAL_MS = 30_000; // poll every 30 seconds

// ─── Time-relative helper ─────────────────────────────────────────

export function timeAgo(isoUtc: string): string {
  const diffMs = Date.now() - new Date(isoUtc).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "ahora mismo";
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return `hace ${days} día${days !== 1 ? "s" : ""}`;
}

// ─── Composable ───────────────────────────────────────────────────

export function useNotificaciones() {
  const router = useRouter();
  const notificaciones = ref<Notificacion[]>([]);
  const unreadCount = ref(0);
  const loading = ref(false);
  let timer: ReturnType<typeof setInterval> | null = null;

  // ── Fetch ────────────────────────────────────────────────────────
  const refresh = async () => {
    loading.value = true;
    try {
      const [list, countData] = await Promise.all([
        notificacionesService.getAll(),
        notificacionesService.getCount(),
      ]);
      notificaciones.value = list;
      unreadCount.value = countData.unread;
    } catch {
      // fail silently — never break UX
    } finally {
      loading.value = false;
    }
  };

  // ── Marcar una como leída ────────────────────────────────────────
  const marcarLeida = async (id: number) => {
    try {
      await notificacionesService.marcarLeida(id);
      const n = notificaciones.value.find((x) => x.id === id);
      if (n && n.leido === 0) {
        n.leido = 1;
        unreadCount.value = Math.max(0, unreadCount.value - 1);
      }
    } catch {
      // silent
    }
  };

  // ── Marcar todas como leídas ─────────────────────────────────────
  const marcarTodasLeidas = async () => {
    try {
      await notificacionesService.marcarTodasLeidas();
      notificaciones.value.forEach((n) => (n.leido = 1));
      unreadCount.value = 0;
    } catch {
      // silent
    }
  };

  // ── Abrir notificación → marcar + navegar ─────────────────────────
  const abrirNotificacion = async (n: Notificacion) => {
    if (!n.leido) await marcarLeida(n.id);
    if (n.prestamo_id) {
      router.push({ name: "prestamoDetalle", params: { id: n.prestamo_id } });
    }
  };

  // ── Lifecycle ────────────────────────────────────────────────────
  onMounted(() => {
    refresh();
    timer = setInterval(refresh, POLL_INTERVAL_MS);
  });

  onUnmounted(() => {
    if (timer) clearInterval(timer);
  });

  return {
    notificaciones,
    unreadCount,
    loading,
    refresh,
    marcarLeida,
    marcarTodasLeidas,
    abrirNotificacion,
    timeAgo,
  };
}
