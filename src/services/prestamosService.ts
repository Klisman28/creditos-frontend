import apiClient from "@/apiClient";
import type { Cliente } from "./clientesService";

export interface Plan {
  id: number;
  nombre: string;
  interes_porcentaje: number;
  mora_porcentaje: number;
  frecuencia_dias: number;
  descripcion?: string;
  activa: boolean;
  // Legacy fields (deprecated)
  monto?: number;
  interes?: number;
  plazo?: number;
  mora?: number;
  cuota?: number;
  capital?: number;
  total?: number;
  periodo?: { id: number; nombre: string };
}

export interface Prestamo {
  id: number;
  monto: number;
  capital_activo: number;
  user_id: number;
  cliente_id: number;
  plan_id: number | null;
  estado_p_id: number;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  fecha_desembolso: string | null;
  mora: number;
  saldo: number;
  activo: number;
  pagado: number;
  capital_recuperado: number;
  mora_recuperada: number;
  cliente: Cliente | null;
  plan: Plan | null;
}

export interface PrestamoDetail extends Prestamo {
  clasificacion_id?: number;
  tipo?: number;
  observaciones?: string | null;
  fichas_pago?: any[];
  pagos?: any[];
}

export interface CreatePrestamoPayload {
  cliente_id: number;
  plan_id: number;
  monto: number;
  cuotas: number;
  fecha_inicio?: string;
  fecha_desembolso?: string;
  fecha_fin?: string;
  tipo: 1 | 2 | 3;
  observaciones?: string;
  plan_snapshot?: {
    interes_porcentaje_aplicado: number;
    mora_porcentaje_aplicado: number;
    frecuencia_dias_aplicada: number;
    cuotas_aplicadas: number;
    nombre_plan: string;
  };
  interes_monto_calculado?: number;
  total_pagar_calculado?: number;
}

export interface FechaDescanso {
  id: number;
  fecha: string;
  descripcion: string | null;
}

export const prestamosService = {
  async getAll(params: { skip?: number; limit?: number } = { limit: 500 }) {
    const response = await apiClient.get<Prestamo[]>("/prestamos/", { params });
    return response.data;
  },

  async getById(id: number | string) {
    const response = await apiClient.get<PrestamoDetail>(`/prestamos/${id}`);
    return response.data;
  },

  async create(data: CreatePrestamoPayload) {
    const response = await apiClient.post<Prestamo>("/prestamos/", data);
    return response.data;
  },

  async getAEntregar() {
    const response = await apiClient.get("/prestamos/a-entregar");
    return response.data;
  },

  async getAFinalizar(params?: { inicio?: string; fin?: string }) {
    const response = await apiClient.get("/prestamos/a-finalizar", { params });
    return response.data;
  },

  async searchClientes(q: string) {
    const response = await apiClient.get("/prestamos/search-clientes", { params: { q } });
    return response.data;
  },

  async getFechasDescanso() {
    const response = await apiClient.get<FechaDescanso[]>("/prestamos/fechas-descanso");
    return response.data;
  },

  async createFechaDescanso(data: { fecha: string; descripcion?: string }) {
    const response = await apiClient.post<FechaDescanso>("/prestamos/fechas-descanso", data);
    return response.data;
  },

  async deleteFechaDescanso(id: number) {
    const response = await apiClient.delete(`/prestamos/fechas-descanso/${id}`);
    return response.data;
  },

  // Keep legacy planes helper for backward compat
  async getPlanes() {
    const response = await apiClient.get<Plan[]>("/planes/");
    return response.data;
  },
};
