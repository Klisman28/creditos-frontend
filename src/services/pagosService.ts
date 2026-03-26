import apiClient from "@/apiClient";

export interface FichaItem {
  ficha_id: number;
  prestamo_id: number | null;
  dpi: string;
  cliente: string;
  ruta: string;
  hora: string;
  no_dia: number | null;
  cuota: number;
  mora: number;
  interes: number;
  capital: number;
  total: number;
  estado: number;
  estado_label: string;
}

// Alias used in some pages
export type FichaPago = FichaItem;

export interface VencidoItem {
  prestamo_id: number;
  dpi: string;
  cliente: string;
  ruta: string;
  monto: number;
  mora: number;
  saldo: number;
  capital_activo: number;
}

export interface HistorialItem {
  id: number;
  fecha: string;
  prestamo_id: number;
  cliente: string;
  dpi: string;
  monto: number;
  capital: number;
  interes: number;
  mora: number;
  total: number;
  descripcion: string | null;
}

// Alias used in some pages
export type PagoHistorial = HistorialItem;

export interface PagosResponse {
  fecha: string;
  total: number;
  total_cuota: number;
  items: FichaItem[];
}

export interface VencidosResponse {
  total: number;
  total_mora: number;
  items: VencidoItem[];
}

export interface HistorialResponse {
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
  items: HistorialItem[];
}

export interface EfectuarPagoRequest {
  ficha_pago_id: number;
  monto: number;
  mora?: number;
  descripcion?: string;
}

const pagosService = {
  getHoy: async (search?: string) => {
    const res = await apiClient.get<PagosResponse>("/pagos/hoy", {
      params: search ? { search } : undefined,
    });
    return res.data;
  },

  getPendientes: async (search?: string) => {
    const res = await apiClient.get<PagosResponse>("/pagos/pendientes", {
      params: search ? { search } : undefined,
    });
    return res.data;
  },

  getVencidos: async (search?: string) => {
    const res = await apiClient.get<VencidosResponse>("/pagos/vencidos", {
      params: search ? { search } : undefined,
    });
    return res.data;
  },

  getHistorial: async (params: { page?: number; per_page?: number; search?: string } = {}) => {
    const res = await apiClient.get<HistorialResponse>("/pagos/historial", { params });
    return res.data;
  },

  efectuarPago: async (data: EfectuarPagoRequest) => {
    const res = await apiClient.post("/pagos/efectuar", data);
    return res.data;
  },
};

export default pagosService;
