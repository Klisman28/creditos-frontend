import apiClient from '@/apiClient'

export interface Configuracion {
  id?: number;
  nombre: string;
  acronimo: string;
  telefono?: string;
  capital?: number;
  direccion?: string;
}

const configuracionService = {
  get: () => apiClient.get<Configuracion>('/configuracion').then(r => r.data),
  update: (data: Configuracion) => apiClient.post<Configuracion>('/configuracion', data).then(r => r.data),
}

export default configuracionService
