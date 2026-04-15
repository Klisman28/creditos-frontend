/**
 * Types para detalle de préstamo
 * Refactorización de PrestamoDetailPage.vue
 */

export type TabId = 'resumen' | 'calendario' | 'pagos' | 'documentos' | 'evidencia'

export interface Tab {
  id: TabId
  label: string
  icon: string
}

/**
 * Constantes de tabs (NUEVA ESTRUCTURA: 5 tabs)
 * Antes: ficha, informacion, pagos, documento, compromiso, imagenes (6 tabs)
 * Después: resumen, calendario, pagos, documentos, evidencia (5 tabs)
 */
export const LOAN_TABS: Tab[] = [
  { id: 'resumen', label: 'Resumen', icon: 'BarChart3' },
  { id: 'calendario', label: 'Calendario', icon: 'Calendar' },
  { id: 'pagos', label: 'Pagos', icon: 'DollarSign' },
  { id: 'documentos', label: 'Documentos', icon: 'FileText' },
  { id: 'evidencia', label: 'Evidencia', icon: 'Images' },
]

/**
 * Estados del préstamo
 */
export const LOAN_STATUS = {
  0: { label: 'Pendiente', color: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10' },
  1: { label: 'En revisión', color: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10' },
  3: { label: 'Aprobado', color: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10' },
  5: { label: 'Activo', color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10' },
  9: { label: 'Cancelado', color: 'bg-slate-50 text-slate-700 dark:bg-slate-500/10' },
  10: { label: 'En mora', color: 'bg-red-50 text-red-700 dark:bg-red-500/10' },
  11: { label: 'Rechazado', color: 'bg-red-50 text-red-700 dark:bg-red-500/10' },
} as const

/**
 * Estados de fichas de pago
 */
export const FICHA_STATUS = {
  0: { label: 'Pendiente', color: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10' },
  1: { label: 'Pagado', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10' },
  2: { label: 'No pagado', color: 'bg-red-100 text-red-700 dark:bg-red-500/10' },
  3: { label: 'Pago parcial', color: 'bg-blue-100 text-blue-700 dark:bg-blue-500/10' },
  4: { label: 'Adelantado', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10' },
  5: { label: 'Parcial adelantado', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10' },
} as const

/**
 * Tipos de imágenes/evidencia
 */
export const IMAGE_FIELDS = [
  { key: 'foto_compromiso', label: 'Foto Compromiso', description: 'Documento firmado' },
  { key: 'foto_recibo', label: 'Foto Recibo', description: 'Comprobante de pago' },
  { key: 'foto_solicitud', label: 'Foto Solicitud', description: 'Solicitud inicial' },
] as const
