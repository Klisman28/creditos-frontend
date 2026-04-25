import apiClient from "@/apiClient";

export interface Persona {
  id: number;
  nombre: string;
  apellido: string;
  dpi: string | null;
  nit?: string | null;
  telefono: string | null;
  celular1?: string | null;
  celular2?: string | null;
  domicilio?: string | null;
  foto_perfil?: string | null;
  genero?: number | null;
  fecha_nacimiento?: string | null;
  cumple?: number | null;
}

export interface Prestamo {
  id: number;
  monto: number;
  mora: number;
  saldo: number;
  interes: number;
  estado_p_id: number;
  clasificacion_id: number;
  fecha_inicio?: string;
  fecha_fin?: string;
  fecha_desembolso?: string;
  activo: number;
  pagado: number;
  tipo: number;
  observaciones?: string | null;
  cliente?: Cliente | null;
  plan?: { id: number; nombre: string; mora: number };
  pagos?: any[];
  fichas_pago?: any[];
}

export interface Cliente {
  id: number;
  nombre?: string;
  dpi?: string | null;
  fecha_ingreso: string | null;
  empresa_trabajo: string | null;
  direccion_trabajo?: string | null;
  direccion_recibo?: string | null;
  nombre_recibo?: string | null;
  telefono_empresa?: string | null;
  tiempo_trabajando?: string | null;
  estado_civil: string | null;
  salario: number | null;
  actividad: string | null;
  direccion_cobrar: string | null;
  nacionalidad: string | null;
  tipo_casa?: string | null;
  no_hijos?: number | null;
  clasificacion_id?: number | null;
  observaciones?: string | null;
  foto_dpi?: string | null;
  foto_recibo?: string | null;
  foto_firma?: string | null;
  persona: Persona | null;
  prestamos?: Prestamo[];
}

export const clientesService = {
  async getAll(params: { skip?: number; limit?: number; search?: string } = { limit: 500 }) {
    const response = await apiClient.get<Cliente[]>("/clientes/", { params });
    return response.data;
  },

  async getById(id: number | string) {
    const response = await apiClient.get<Cliente>(`/clientes/${id}`);
    return response.data;
  },

  async create(data: any) {
    const response = await apiClient.post<Cliente>("/clientes/", data);
    return response.data;
  },

  async update(id: number | string, data: any) {
    const response = await apiClient.put<Cliente>(`/clientes/${id}`, data);
    return response.data;
  },
};
