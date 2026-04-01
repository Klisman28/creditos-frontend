import { defineStore } from "pinia";
import { ref } from "vue";
import apiClient from "@/apiClient";

export const useConfigStore = defineStore("config", () => {
  const nombre = ref("Confía");
  const acronimo = ref("C");
  const logo_url = ref<string | null>(null);
  const favicon_url = ref<string | null>(null);
  const color_primario = ref("#1976D2");

  async function load() {
    try {
      const res = await apiClient.get("/configuracion");
      nombre.value = res.data.nombre || "Confía";
      acronimo.value = res.data.acronimo || "C";
      logo_url.value = res.data.logo_url || null;
      favicon_url.value = res.data.favicon_url || null;
      color_primario.value = res.data.color_primario || "#1976D2";

      // Update document title
      if (nombre.value) document.title = nombre.value;

      // Update all favicon links
      const iconUrl = favicon_url.value || logo_url.value;
      if (iconUrl) {
        // Remove all existing favicon links
        document.querySelectorAll<HTMLLinkElement>("link[rel~='icon'], link[rel='apple-touch-icon']")
          .forEach(el => el.remove());

        // Add a single favicon pointing to the S3 logo
        const link = document.createElement("link");
        link.rel = "icon";
        link.type = "image/webp";
        link.href = iconUrl + "?v=" + Date.now(); // cache-bust
        document.head.appendChild(link);
      }
    } catch {
      // Silently fail — defaults remain
    }
  }

  return { nombre, acronimo, logo_url, favicon_url, color_primario, load };
});
