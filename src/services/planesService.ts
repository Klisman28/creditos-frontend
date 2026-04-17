import apiClient from '@/apiClient'

export interface Plantilla {
  id: number;
  nombre: string;
  interes_porcentaje: number;
  mora_porcentaje: number;
  frecuencia_dias: number;
  descripcion?: string;
  activa: boolean;
  created_at: string;
  updated_at: string;
  periodo?: { id: number; nombre: string };
}

export interface SimulacionPlan {
  capital_ejemplo: number;
  interes_porcentaje: number;
  interes_monto_calculado: number;
  total_pagar: number;
  cuotas: number;
  monto_por_cuota: number;
  mora_porcentaje: number;
  mora_por_cuota_atrasada: number;
}

export interface CreatePlantillaRequest {
  nombre: string;
  interes_porcentaje: number;
  mora_porcentaje: number;
  frecuencia_dias: number;
  descripcion?: string;
  activa: boolean;
}

export interface UpdatePlantillaRequest {
  nombre?: string;
  interes_porcentaje?: number;
  mora_porcentaje?: number;
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
  simular: (data: {
    monto_ejemplo: number;
    cuotas: number;
    interes_porcentaje: number;
    mora_porcentaje: number;
  }) => apiClient.post<SimulacionPlan>('/planes/simular', data).then(r => r.data),
}

export default planesService
