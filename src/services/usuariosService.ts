import apiClient from "@/apiClient";
import type { Persona } from "./clientesService";

export interface Rol {
  id: number;
  nombre: string;
  descripcion: string;
}

export interface Agencia {
  id: number;
  nombre: string;
}

export interface Usuario {
  id: number;
  name: string;
  email: string;
  persona_id: number | null;
  agencia_id: number | null;
  estado: number;
  sueldo_base?: number | null;
  comision_capital_activo?: number | null;
  comision_cliente_nuevo?: number | null;
  combustible?: number | null;
  descuento_mora?: number | null;
  otros?: number | null;
  persona: Persona | null;
  agencia?: Agencia | null;
  roles: Rol[];
}

export const usuariosService = {
  async getAll() {
    const response = await apiClient.get<Usuario[]>("/usuarios/");
    return response.data;
  },

  async getById(id: number | string) {
    const response = await apiClient.get<Usuario>(`/usuarios/${id}`);
    return response.data;
  },

  async getRoles() {
    const response = await apiClient.get<Rol[]>("/usuarios/roles");
    return response.data;
  },

  async getAgencias() {
    const response = await apiClient.get<Agencia[]>("/usuarios/agencias");
    return response.data;
  },

  async create(data: any) {
    const response = await apiClient.post<Usuario>("/usuarios/", data);
    return response.data;
  },

  async update(id: number | string, data: any) {
    const response = await apiClient.put<Usuario>(`/usuarios/${id}`, data);
    return response.data;
  },

  async deleteUser(id: number | string) {
    const response = await apiClient.delete(`/usuarios/${id}`);
    return response.data;
  },

  // Keep "delete" alias for any existing callers
  async delete(id: number | string) {
    return usuariosService.deleteUser(id);
  },
};
