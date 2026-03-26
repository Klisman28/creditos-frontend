export const navigation = [
  {
    id: 1,
    name: "Panel Principal",
    menu: [
      { label: "Panel de Control", route: "/panel", icon: "LayoutDashboard" },
    ]
  },
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
          { label: "Créditos a Entregar", route: "/creditos-entregar" },
          { label: "Créditos a Finalizar", route: "/creditos-finalizar" },
          { label: "Fechas de Descanso", route: "/fechas-descanso" },
          { label: "Planes", route: "/planes" },
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
    ]
  },
  {
    id: 3,
    name: "Administración",
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
