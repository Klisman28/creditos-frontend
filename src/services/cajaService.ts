import apiClient from "@/apiClient";

// ─── Types ────────────────────────────────────────────────────────────

export interface CashSession {
  id: number;
  agencia_id: number | null;
  user_id: number;
  fecha: string;
  monto_apertura: number;
  monto_cierre: number | null;
  estado: "ABIERTA" | "CERRADA";
  observaciones: string | null;
  opened_at: string;
  closed_at: string | null;
  closed_by: number | null;
}

export interface CashMovement {
  id: number;
  cash_session_id: number;
  tipo: "APERTURA" | "INGRESO" | "EGRESO" | "PAGO_CREDITO" | "CIERRE";
  monto: number;
  descripcion: string | null;
  source_type: string | null;
  source_id: number | null;
  created_by: number;
  created_at: string;
}

export interface CashSummary {
  session_id: number;
  fecha: string;
  estado: string;
  monto_apertura: number;
  total_ingresos: number;
  total_egresos: number;
  total_cobros_creditos: number;
  efectivo_esperado: number;
  monto_cierre: number | null;
  diferencia: number | null;
  total_movimientos: number;
}

export interface RecoverySimulation {
  fecha: string;
  fichas_pendientes: number;
  total_cuotas: number;
  total_mora: number;
  total_esperado: number;
}

export interface ClosingSimulation {
  session_id: number;
  fecha: string;
  monto_apertura: number;
  total_ingresos: number;
  total_egresos: number;
  total_cobros_creditos: number;
  efectivo_esperado: number;
}

export interface OpenSessionRequest {
  monto_apertura: number;
  observaciones?: string;
  agencia_id?: number;
}

export interface CreateMovementRequest {
  tipo: "INGRESO" | "EGRESO";
  monto: number;
  descripcion?: string;
}

export interface CloseSessionRequest {
  monto_cierre: number;
  observaciones?: string;
}

// ─── Service ──────────────────────────────────────────────────────────

const cajaService = {
  getActivaSession: (): Promise<CashSession | null> =>
    apiClient.get<CashSession | null>("/caja/sesiones/activa").then((r) => r.data),

  getSessions: (skip = 0, limit = 50): Promise<CashSession[]> =>
    apiClient.get<CashSession[]>("/caja/sesiones", { params: { skip, limit } }).then((r) => r.data),

  getSession: (id: number): Promise<CashSession> =>
    apiClient.get<CashSession>(`/caja/sesiones/${id}`).then((r) => r.data),

  getSummary: (id: number): Promise<CashSummary> =>
    apiClient.get<CashSummary>(`/caja/sesiones/${id}/resumen`).then((r) => r.data),

  getMovements: (id: number): Promise<CashMovement[]> =>
    apiClient.get<CashMovement[]>(`/caja/sesiones/${id}/movimientos`).then((r) => r.data),

  openSession: (data: OpenSessionRequest): Promise<CashSession> =>
    apiClient.post<CashSession>("/caja/sesiones", data).then((r) => r.data),

  addMovement: (id: number, data: CreateMovementRequest): Promise<CashMovement> =>
    apiClient.post<CashMovement>(`/caja/sesiones/${id}/movimientos`, data).then((r) => r.data),

  closeSession: (id: number, data: CloseSessionRequest): Promise<CashSession> =>
    apiClient.post<CashSession>(`/caja/sesiones/${id}/cerrar`, data).then((r) => r.data),

  getRecoverySimulation: (): Promise<RecoverySimulation> =>
    apiClient.get<RecoverySimulation>("/caja/simulacion/recuperacion").then((r) => r.data),

  getClosingSimulation: (id: number): Promise<ClosingSimulation> =>
    apiClient.get<ClosingSimulation>(`/caja/simulacion/cierre/${id}`).then((r) => r.data),
};

export default cajaService;
