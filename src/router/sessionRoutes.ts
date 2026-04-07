import { RouteRecordRaw } from "vue-router";

export const sessionRoutes: RouteRecordRaw[] = [
  {
    path: "/login",
    name: "Login",
    component: () => import("@/pages/sessions/Login.vue"),
    meta: { title: "Login", guestOnly: true }
  }
  // Note: Register, ForgetPassword, and Verification routes are not implemented in backend (app/api/auth.py)
  // Only /auth/login and /auth/me endpoints exist. These routes should be enabled once backend support is added.
];
