import apiClient from '@/apiClient'

export interface Plan {
  id: number;
  nombre: string;
  total: number;
  interes: number;
  mora: number;
  cuota: number;
  capital: number;
  periodo_id?: number;
  periodo?: { id: number; nombre: string };
}

export interface Periodo {
  id: number;
  nombre: string;
  descripcion?: string;
  tiempo?: number;
}

const planesService = {
  getAll: () => apiClient.get('/planes').then(r => r.data),
  getPeriodos: () => apiClient.get('/planes/periodos').then(r => r.data),
  getById: (id: number) => apiClient.get(`/planes/${id}`).then(r => r.data),
  create: (data: any) => apiClient.post('/planes/', data).then(r => r.data),
  update: (id: number, data: any) => apiClient.put(`/planes/${id}`, data).then(r => r.data),
  remove: (id: number) => apiClient.delete(`/planes/${id}`).then(r => r.data),
}

export default planesService
