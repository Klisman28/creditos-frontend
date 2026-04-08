import apiClient from '@/apiClient'

export interface Plantilla {
  id: number;
  nombre: string;
  tasa_interes: number;
  tasa_mora_diaria: number;
  frecuencia_dias: number;
  descripcion?: string;
  activa: boolean;
  created_at: string;
  updated_at: string;
  periodo?: { id: number; nombre: string };
}

export interface SimulacionPlan {
  monto: number;
  cuotas: number;
  cuota_monto: number;
  total_cobrar: number;
  interes_total: number;
  mora_por_cuota_atraso: number;
}

export interface CreatePlantillaRequest {
  nombre: string;
  tasa_interes: number;
  tasa_mora_diaria: number;
  frecuencia_dias: number;
  descripcion?: string;
  activa: boolean;
}

export interface UpdatePlantillaRequest {
  nombre?: string;
  tasa_interes?: number;
  tasa_mora_diaria?: number;
  frecuencia_dias?: number;
  descripcion?: string;
  activa?: boolean;
}

export interface Periodo {
  id: number;
  nombre: string;
  descripcion?: string;
  tiempo?: number;
}

const planesService = {
  getAll: () => apiClient.get<Plantilla[]>('/planes').then(r => r.data),
  getPeriodos: () => apiClient.get<Periodo[]>('/planes/periodos').then(r => r.data),
  getById: (id: number) => apiClient.get<Plantilla>(`/planes/${id}`).then(r => r.data),
  create: (data: CreatePlantillaRequest) => apiClient.post<Plantilla>('/planes/', data).then(r => r.data),
  update: (id: number, data: UpdatePlantillaRequest) => apiClient.put<Plantilla>(`/planes/${id}`, data).then(r => r.data),
  remove: (id: number) => apiClient.delete(`/planes/${id}`).then(r => r.data),
  simular: (params: {
    monto: number;
    cuotas: number;
    tasa_interes: number;
    tasa_mora_diaria: number;
  }) => apiClient.post<SimulacionPlan>('/planes/simular', null, { params }).then(r => r.data),
}

export default planesService
