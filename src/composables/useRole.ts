import { computed } from "vue";
import { useAuthStore } from "@/stores/auth";

export function useRole() {
  const auth = useAuthStore();

  const role = computed<string | null>(() => {
    const r = auth.user?.roles?.[0]?.nombre;
    return r ? (r as string).toLowerCase() : null;
  });

  const isAdmin = computed(() => role.value === "administrador");
  const isCobrador = computed(() => role.value === "cobrador");

  function can(allowedRoles: string[]): boolean {
    if (!role.value) return false;
    return allowedRoles.map((r) => r.toLowerCase()).includes(role.value);
  }

  return { role, isAdmin, isCobrador, can };
}
