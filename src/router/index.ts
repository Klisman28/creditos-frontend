import { createRouter, createWebHistory } from "vue-router";
import NProgress from "nprogress";
// ROUTE GROUP FILES
import { sessionRoutes } from "./sessionRoutes";
import { dashboardRoutes } from "./dashboardRoutes";

// ==============================================================
declare module "vue-router" {
  interface RouteMeta {
    title?: string;
    requiresAuth?: boolean;
    guestOnly?: boolean;
  }
}
// ==============================================================

const router = createRouter({
  history: createWebHistory(),
  routes: [
    // ── Root: redirect based on auth state ──────────────────────
    {
      path: "/",
      name: "Root",
      redirect: () => ({ path: "/panel" })
    },

    // ── Landing page (template demo, out of main flow) ─────────
    {
      path: "/landing",
      name: "Landing",
      component: () => import("@/pages/home/index.vue"),
      meta: { title: "Landing" }
    },

    // ── Authenticated layout & child routes ─────────────────────
    {
      path: "/dashboard",
      name: "Dashboards",
      redirect: "/panel",
      component: () => import("@/layout/DefaultLayout.vue"),
      meta: { requiresAuth: true },
      children: [
        ...dashboardRoutes,

        // ── /mi-perfil: smart redirect to the logged-in user's employee page
        // Uses the auth store to get the user's ID and redirects to /empleados/:id
        // NOTE: The User model IS the employee in this system (users table has
        // sueldo_base, comision_capital_activo, etc.), so user.id == empleado.id.
        // In the future, if an explicit empleado_id field is added to the user,
        // this redirect should use that field instead.
        {
          name: "miPerfil",
          path: "/mi-perfil",
          component: () => import("@/pages/creditos/EmpleadoDetailPage.vue"),
          meta: { title: "Mi Perfil" }
        },
      ]
    },

    // ── Session (public / guest-only) routes ────────────────────
    {
      path: "/sessions",
      name: "Sessions",
      redirect: "/login",
      children: [...sessionRoutes]
    }
  ]
});

// ── Progress bar ─────────────────────────────────────────────────
NProgress.configure({ showSpinner: false });

const DEFAULT_TITLE = "Sistema de Créditos";
const setDocumentTitle = (title?: string) => {
  document.title = title ? `${title} - ${DEFAULT_TITLE}` : DEFAULT_TITLE;
};

// ── Global navigation guard ─────────────────────────────────────
router.beforeEach(async (to, _from, next) => {
  if (to.name) NProgress.start();
  setDocumentTitle(to.meta.title);

  // Lazy-import Pinia store (safe here because Pinia is installed before Router)
  const { useAuthStore } = await import("@/stores/auth");
  const auth = useAuthStore();

  // Rehydrate session: waits for the single shared promise
  await auth.checkToken();

  const isAuthenticated = !!auth.user;
  const requiresAuth = to.matched.some((r) => r.meta.requiresAuth);
  const guestOnly = to.matched.some((r) => r.meta.guestOnly);

  // 1) Protected route, user NOT logged in → send to login with redirect
  if (requiresAuth && !isAuthenticated) {
    return next({
      name: "Login",
      query: { redirect: to.fullPath }
    });
  }

  // 2) Guest-only route (login, register…), user IS logged in → send to panel
  if (guestOnly && isAuthenticated) {
    return next({ path: "/panel", replace: true });
  }

  // 3) /mi-perfil → inject user's own ID as the route param
  if (to.name === "miPerfil" && isAuthenticated) {
    // The EmpleadoDetailPage reads `route.params.id`. For /mi-perfil we don't
    // have :id in the URL, so we redirect to /empleados/{userId} instead.
    return next({
      name: "empleadoDetalle",
      params: { id: auth.user!.id },
      replace: true
    });
  }

  // 4) All good
  next();
});

router.afterEach(() => {
  NProgress.done();
});

export default router;
