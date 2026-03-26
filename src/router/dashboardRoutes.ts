import { RouteRecordRaw } from "vue-router";

export const dashboardRoutes: RouteRecordRaw[] = [
  {
    name: "panelControl",
    path: "/panel",
    component: () => import("@/pages/dashboard/PanelControl.vue"),
    meta: { title: "Panel de Control" }
  },
  {
    name: "clientes",
    path: "/clientes",
    component: () => import("@/pages/creditos/ClientesPage.vue"),
    meta: { title: "Clientes" }
  },
  {
    name: "clienteDetalle",
    path: "/clientes/:id",
    component: () => import("@/pages/creditos/ClienteDetailPage.vue"),
    meta: { title: "Detalle de Cliente" }
  },
  {
    name: "clienteEditar",
    path: "/clientes/:id/editar",
    component: () => import("@/pages/creditos/ClienteEditPage.vue"),
    meta: { title: "Editar Cliente" }
  },
  {
    name: "prestamos",
    path: "/prestamos",
    component: () => import("@/pages/creditos/PrestamosPage.vue"),
    meta: { title: "Préstamos" }
  },
  {
    name: "prestamoDetalle",
    path: "/prestamos/:id",
    component: () => import("@/pages/creditos/PrestamoDetailPage.vue"),
    meta: { title: "Detalle de Préstamo" }
  },
  {
    name: "creditosEntregar",
    path: "/creditos-entregar",
    component: () => import("@/pages/creditos/CreditosEntregarPage.vue"),
    meta: { title: "Créditos a Entregar" }
  },
  {
    name: "creditosFinalizar",
    path: "/creditos-finalizar",
    component: () => import("@/pages/creditos/CreditosFinalizarPage.vue"),
    meta: { title: "Créditos a Finalizar" }
  },
  {
    name: "fechasDescanso",
    path: "/fechas-descanso",
    component: () => import("@/pages/creditos/FechasDescansoPage.vue"),
    meta: { title: "Fechas de Descanso" }
  },
  {
    name: "hojasRuta",
    path: "/hojas-ruta",
    component: () => import("@/pages/creditos/HojasRutaPage.vue"),
    meta: { title: "Hojas de Ruta" }
  },
  {
    name: "cobros",
    path: "/cobros",
    component: () => import("@/pages/creditos/CobrosPage.vue"),
    meta: { title: "Cobros del Día" }
  },
  {
    name: "pagos",
    path: "/pagos",
    component: () => import("@/pages/creditos/PagosPage.vue"),
    meta: { title: "Pagos" }
  },
  {
    name: "empleados",
    path: "/empleados",
    component: () => import("@/pages/creditos/EmpleadosPage.vue"),
    meta: { title: "Empleados" }
  },
  {
    name: "empleadoDetalle",
    path: "/empleados/:id",
    component: () => import("@/pages/creditos/EmpleadoDetailPage.vue"),
    meta: { title: "Perfil de Empleado" }
  },
  {
    name: "empleadoEditar",
    path: "/empleados/:id/editar",
    component: () => import("@/pages/creditos/EmpleadoEditPage.vue"),
    meta: { title: "Editar Empleado" }
  },
  {
    name: "planes",
    path: "/planes",
    component: () => import("@/pages/creditos/PlanesPage.vue"),
    meta: { title: "Planes de Préstamo" }
  },
  {
    name: "reportes",
    path: "/reportes",
    component: () => import("@/pages/creditos/ReportesPage.vue"),
    meta: { title: "Reportes" }
  },
  {
    name: "configuracion",
    path: "/configuracion",
    component: () => import("@/pages/creditos/ConfiguracionPage.vue"),
    meta: { title: "Configuración" }
  },
];
