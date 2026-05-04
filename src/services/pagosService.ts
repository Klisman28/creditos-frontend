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

export interface FichaDetalle {
  ficha_id: number;
  no_dia: number | null;
  fecha_programada: string | null;
  cuota: number;
  mora_estimada: number;
  interes: number;
  capital: number;
  total_estimado: number;
  estado: number;  // 0=pendiente, 1=pagado
  estado_label: string;
  pago_id: number | null;
}

export interface FichasPorPrestamoResponse {
  prestamo_id: number;
  total_fichas: number;
  pendientes: number;
  vencidas: number;
  fichas: FichaDetalle[];
}

export interface PreviewPagoRequest {
  prestamo_id: number;
  strategy: "OLDEST_DUE" | "NEXT_INSTALLMENT" | "SPECIFIC_INSTALLMENT";
  ficha_pago_id?: number | null;
  fecha_efectiva_pago: string;  // YYYY-MM-DD
  metodo_pago?: string;
}

export interface PreviewPagoResponse {
  prestamo_id: number;
  ficha_id: number;
  no_dia: number | null;
  fecha_programada: string;
  fecha_efectiva_pago: string;
  cuota: number;
  mora: number;
  total: number;
  clasificacion: "PAGO_ADELANTADO" | "PAGO_A_TIEMPO" | "PAGO_CON_ATRASO";
  strategy: string;
  tiene_vencidas_previas: boolean;
  cantidad_vencidas_previas: number;
  impacto_caja: boolean;
}

export interface RegistrarPagoRequest {
  prestamo_id: number;
  strategy: "OLDEST_DUE" | "NEXT_INSTALLMENT" | "SPECIFIC_INSTALLMENT";
  ficha_pago_id?: number | null;
  fecha_efectiva_pago: string;  // YYYY-MM-DD
  monto: number;
  metodo_pago: string;
  observaciones?: string;
}

export interface RegistrarPagoResponse {
  ok: boolean;
  pago_id: number;
  ficha_id: number;
  clasificacion: string;
  mora: number;
  total_pagado: number;
  cuotas_pendientes: number;
  prestamo_pagado: boolean;
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

  getFichasPorPrestamo: async (prestamoId: number) => {
    const res = await apiClient.get<FichasPorPrestamoResponse>(`/pagos/prestamo/${prestamoId}/fichas`);
    return res.data;
  },

  previewPago: async (data: PreviewPagoRequest) => {
    const res = await apiClient.post<PreviewPagoResponse>("/pagos/preview", data);
    return res.data;
  },

  registrarPago: async (data: RegistrarPagoRequest) => {
    const res = await apiClient.post<RegistrarPagoResponse>("/pagos/registrar", data);
    return res.data;
  },
};

export default pagosService;
