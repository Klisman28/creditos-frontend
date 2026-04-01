<script lang="ts" setup>
import { onMounted } from "vue";
import { Notivue, Notification, lightTheme, NotivueTheme } from "notivue";
import { useAuthStore } from "@/stores/auth";
import { useConfigStore } from "@/stores/config";

const theme: NotivueTheme = {
  ...lightTheme,
  "--nv-icon-size": "1rem",
  "--nv-spacing": ".75rem",
  "--nv-global-bg": "var(--color-card)",
  "--nv-global-border": "var(--color-border)",
  "--nv-global-fg": "var(--color-card-foreground)"
};

const auth = useAuthStore();
const configStore = useConfigStore();

onMounted(() => {
  auth.checkToken();
  configStore.load();
});
</script>

<template>
  <!-- INITIAL LOADING SPINNER: only while auth hasn't finished its first check -->
  <div
    v-if="auth.loading && !auth.ready"
    class="flex fixed inset-0 z-50 justify-center items-center transition-opacity duration-500 bg-background">
    <div
      class="w-16 h-16 border-[6px] rounded-full border-border animate-spin border-t-primary"></div>
  </div>

  <template v-else>
    <!-- ROUTER VIEW -->
    <RouterView />

    <!-- NOTIVUE NOTIFICATION -->
    <Notivue v-slot="item">
      <Notification :item="item" :theme="theme" />
    </Notivue>
  </template>
</template>
