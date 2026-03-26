import { defineStore } from "pinia";
import apiClient from "@/apiClient";

export interface User {
  id: number;
  email: string;
  name: string;
  roles: any[];
}

interface LoginData {
  email: string;
  password: string;
  rememberMe: boolean;
}

// Promise singleton: ensures checkToken only runs once at a time,
// and multiple callers (App.vue, router guard) all await the same promise.
let _checkTokenPromise: Promise<void> | null = null;

export const useAuthStore = defineStore("auth", {
  state: () => ({
    user: null as User | null,
    loading: true,
    error: null as Error | null,
    isAuthenticated: false,
    _tokenChecked: false
  }),

  getters: {
    /** True once the initial token verification has completed */
    ready: (state) => state._tokenChecked
  },

  actions: {
    /**
     * Verifies the stored token against the backend.
     * - Only runs once unless `force` is true.
     * - Returns a shared promise so concurrent callers don't duplicate requests.
     */
    checkToken(force = false): Promise<void> {
      if (this._tokenChecked && !force) {
        return Promise.resolve();
      }

      // If there's already a check in-flight, return the same promise
      if (_checkTokenPromise && !force) {
        return _checkTokenPromise;
      }

      _checkTokenPromise = this._doCheckToken();
      return _checkTokenPromise;
    },

    async _doCheckToken() {
      this._tokenChecked = true;
      this.loading = true;

      const token = localStorage.getItem("token");

      if (token) {
        try {
          const response = await apiClient.get("/auth/me");
          this.user = response.data;
          this.isAuthenticated = true;
        } catch (error) {
          console.error("Token verification failed:", error);
          localStorage.removeItem("token");
          this.user = null;
          this.isAuthenticated = false;
        }
      } else {
        this.user = null;
        this.isAuthenticated = false;
      }

      this.loading = false;
      _checkTokenPromise = null; // allow future forced checks
    },

    async login({ email, password }: LoginData) {
      this.loading = true;
      this.error = null;
      try {
        const formData = new URLSearchParams();
        formData.append("username", email);
        formData.append("password", password);

        const response = await apiClient.post("/auth/login", formData, {
          headers: { "Content-Type": "application/x-www-form-urlencoded" }
        });

        localStorage.setItem("token", response.data.access_token);
        this.isAuthenticated = true;

        // Re-fetch user profile with the new token
        await this.checkToken(true);
        return this.user;
      } catch (error: any) {
        this.error = error;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    register(_data: any) {
      throw new Error("Not implemented in custom backend");
    },

    logout() {
      localStorage.removeItem("token");
      this.user = null;
      this.isAuthenticated = false;
      this.error = null;
      this.loading = false;
    }
  }
});
