import axios from 'axios'
import { push } from 'notivue'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor — attach Bearer token
apiClient.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor — handle common errors
apiClient.interceptors.response.use(
  response => response,
  error => {
    const status = error.response?.status

    if (status === 401) {
      localStorage.removeItem('token')
      // Avoid push on login page to prevent infinite loop
      if (!window.location.pathname.includes('/login')) {
        push.error('Tu sesión ha expirado. Por favor inicia sesión nuevamente.')
        window.location.href = '/login'
      }
    } else if (status === 403) {
      push.error('No tienes permisos para realizar esta acción.')
    } else if (status === 422) {
      const detail = error.response?.data?.detail
      let msg = 'Datos inválidos. Verifica la información ingresada.'
      if (Array.isArray(detail)) {
        msg = detail.map((e: any) => `${e.loc?.join('.')} — ${e.msg}`).join('; ')
      } else if (typeof detail === 'string') {
        msg = detail
      }
      push.error(msg)
    } else if (status === 500) {
      const detail = error.response?.data?.detail
      const msg = typeof detail === 'string'
        ? detail
        : (typeof detail === 'object' ? JSON.stringify(detail) : 'Error interno del servidor')
      push.error(msg || 'Error interno del servidor. Intenta de nuevo más tarde.')
    }

    return Promise.reject(error)
  }
)

export default apiClient
