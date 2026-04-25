import type { NavGroup } from "@/layout/sidebar/type";

export const navigation: NavGroup[] = [
  {
    id: 2,
    name: "Operaciones",
    menu: [
      {
        icon: "Users",
        label: "Clientes",
        route: "/clientes",
      },
      {
        icon: "Wallet",
        label: "Créditos",
        children: [
          { label: "Listado de Créditos", route: "/prestamos" },
          { label: "Créditos a Entregar", route: "/creditos-entregar", roles: ["administrador"] },
          { label: "Créditos a Finalizar", route: "/creditos-finalizar", roles: ["administrador"] },
          { label: "Fechas de Descanso", route: "/fechas-descanso", roles: ["administrador"] },
          { label: "Planes", route: "/planes", roles: ["administrador"] },
        ],
      },
      {
        icon: "Route",
        label: "Hojas de Ruta",
        route: "/hojas-ruta",
      },
      {
        icon: "HandCoins",
        label: "Cobros del Día",
        route: "/cobros",
      },
      {
        icon: "CreditCard",
        label: "Pagos",
        route: "/pagos",
      },
      {
        icon: "Vault",
        label: "Caja",
        children: [
          { label: "Caja Activa", route: "/caja" },
          { label: "Historial de Sesiones", route: "/caja/sesiones", roles: ["administrador"] },
        ],
      },
    ]
  },
  {
    id: 3,
    name: "Administración",
    roles: ["administrador"],
    menu: [
      {
        icon: "UserCog",
        label: "Empleados",
        route: "/empleados",
      },
      {
        icon: "BarChart3",
        label: "Reportes",
        route: "/reportes",
      },
      {
        icon: "Settings",
        label: "Configuración",
        route: "/configuracion",
      },
    ]
  }
];
