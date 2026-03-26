import apiClient from "@/apiClient";

export interface Notificacion {
  id: number;
  tipo: string;
  titulo: string;
  mensaje: string | null;
  prestamo_id: number | null;
  leido: number;        // 0 = no leída, 1 = leída
  created_at: string;   // ISO datetime UTC
  monto: number | null;
  cliente_nombre: string;
}

export interface NotificacionCount {
  unread: number;
}

const notificacionesService = {
  async getAll(): Promise<Notificacion[]> {
    const r = await apiClient.get<Notificacion[]>("/notificaciones/");
    return r.data;
  },

  async getCount(): Promise<NotificacionCount> {
    const r = await apiClient.get<NotificacionCount>("/notificaciones/count");
    return r.data;
  },

  async marcarLeida(id: number): Promise<void> {
    await apiClient.post(`/notificaciones/${id}/leer`);
  },

  async marcarTodasLeidas(): Promise<void> {
    await apiClient.post("/notificaciones/leer-todas");
  },
};

export default notificacionesService;
