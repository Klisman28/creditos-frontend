import { useAuthStore } from "@/stores/auth";

/**
 * Thin composable wrapper around the Pinia auth store.
 * Keeps backward-compatibility with all existing components that import `useAuth`.
 *
 * IMPORTANT: We return the store itself as `state` so that template bindings
 * like `state.user`, `state.loading` etc. remain reactive.
 * Methods are bound via arrow-function getters to preserve Pinia's `this` context.
 */
export const useAuth = () => {
  const store = useAuthStore();

  return {
    /** Reactive state — use in templates: state.user, state.loading, etc. */
    state: store,

    // Methods — must be called through the store to keep `this` binding
    login: (...args: Parameters<typeof store.login>) => store.login(...args),
    register: (...args: Parameters<typeof store.register>) => store.register(...args),
    logout: () => store.logout(),
    checkToken: (force?: boolean) => store.checkToken(force),
  };
};
