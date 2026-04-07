import path from "path";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  },
  base: "/",
  server: { port: 5050 },
  build: {
    chunkSizeWarningLimit: 1600,
    outDir: "dist",
    emptyOutDir: true
  }
});
