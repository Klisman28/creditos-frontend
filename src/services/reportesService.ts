import apiClient from '@/apiClient'

export interface ResumenGeneral {
  periodo_inicio?: string;
  periodo_fin?: string;
  capital_colocado_nuevo: number;
  capital_recuperado: number;
  interes_recolectado: number;
  mora_recolectada: number;
  mora_total: number;
  flujo_caja_total: number;
  total_pagos: number;
  prestamos_otorgados: number;
  prestamos_activos: number;
}

export interface ResumenDiarioRow {
  fecha: string;
  capital: number;
  interes: number;
  mora: number;
  total: number;
  cantidad: number;
}

const reportesService = {
  getGeneral: (params?: { inicio?: string; fin?: string }) =>
    apiClient.get('/reportes/general', { params }).then(r => r.data),

  getClientes: (params?: { inicio?: string; fin?: string; search?: string }) =>
    apiClient.get('/reportes/clientes', { params }).then(r => r.data),

  getResumenDiario: (dias = 7) =>
    apiClient.get('/reportes/resumen-diario', { params: { dias } }).then(r => r.data),
}

export default reportesService
