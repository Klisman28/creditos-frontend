<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
// SHADCN COMPONENTS
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
// CUSTOM COMPONENT
import Icon from "@/components/Icon.vue";
// AUTH STORE
import { useAuthStore } from "@/stores/auth";

const router = useRouter();
const auth = useAuthStore();

const userName = computed(() => auth.user?.name || "Usuario");
const userEmail = computed(() => auth.user?.email || "");
const userInitials = computed(() => {
  const name = auth.user?.name || "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.charAt(0).toUpperCase();
});
const userRole = computed(() => {
  const roles = auth.user?.roles;
  if (roles?.length) {
    const r = roles[0];
    return typeof r === "string" ? r : r?.nombre || null;
  }
  return null;
});

const handleLogout = () => {
  auth.logout();
  router.replace({ name: "Login" });
};
</script>

<template>
  <Popover>
    <!-- ── Trigger ──────────────────────────────────────────────── -->
    <PopoverTrigger as-child>
      <button
        class="flex items-center gap-2.5 py-1.5 pr-2 pl-3 rounded-full cursor-pointer
               transition-all duration-200 bg-hover hover:bg-border/60 active:scale-[.97]
               focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
      >
        <span class="text-[13px] font-semibold text-card-foreground text-nowrap leading-tight hidden sm:block">
          {{ userName }}
        </span>

        <Avatar size="xs" class="border-2 border-primary/20 shrink-0">
          <AvatarFallback
            class="bg-gradient-to-br from-primary to-blue-400 text-white text-[11px] font-bold"
          >
            {{ userInitials }}
          </AvatarFallback>
        </Avatar>
      </button>
    </PopoverTrigger>

    <!-- ── Dropdown Content ─────────────────────────────────────── -->
    <PopoverContent
      class="w-[240px] p-0 rounded-xl shadow-xl border border-border/60 overflow-hidden"
      :side-offset="8"
    >
      <!-- User info header -->
      <div class="px-4 pt-4 pb-3 bg-gradient-to-b from-muted/30 to-transparent">
        <div class="flex items-center gap-3">
          <Avatar size="sm" class="border-2 border-primary/20 shrink-0">
            <AvatarFallback
              class="bg-gradient-to-br from-primary to-blue-400 text-white text-sm font-bold"
            >
              {{ userInitials }}
            </AvatarFallback>
          </Avatar>

          <div class="min-w-0">
            <p class="text-sm font-semibold text-card-foreground leading-tight truncate">
              {{ userName }}
            </p>
            <p v-if="userEmail" class="text-[11px] text-muted truncate mt-0.5">
              {{ userEmail }}
            </p>
            <span
              v-if="userRole"
              class="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider
                     text-primary bg-primary/10 px-2 py-0.5 rounded-full leading-tight"
            >
              {{ userRole }}
            </span>
          </div>
        </div>
      </div>

      <!-- Divider -->
      <div class="px-3">
        <hr class="border-border/60" />
      </div>

      <!-- Menu items -->
      <div class="py-1.5">
        <button
          class="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-card-foreground
                 transition-all duration-150 hover:bg-hover hover:text-primary group"
          @click="router.push({ name: 'miPerfil' })"
        >
          <div class="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center
                      transition-transform duration-150 group-hover:scale-105">
            <Icon name="User" :size="15" class="text-blue-600 dark:text-blue-400" />
          </div>
          <div class="text-left">
            <p class="font-medium leading-tight">Mi Perfil</p>
            <p class="text-[11px] text-muted leading-tight mt-0.5">Ver mi ficha de empleado</p>
          </div>
        </button>
      </div>

      <!-- Divider -->
      <div class="px-3">
        <hr class="border-border/60" />
      </div>

      <!-- Logout -->
      <div class="py-1.5">
        <button
          class="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400
                 transition-all duration-150 hover:bg-red-50 dark:hover:bg-red-500/10 group"
          @click="handleLogout"
        >
          <div class="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-500/10 flex items-center justify-center
                      transition-transform duration-150 group-hover:scale-105">
            <Icon name="LogOut" :size="15" class="text-red-500 dark:text-red-400" />
          </div>
          <div class="text-left">
            <p class="font-medium leading-tight">Cerrar sesión</p>
            <p class="text-[11px] text-red-400 dark:text-red-500 leading-tight mt-0.5">Salir del sistema</p>
          </div>
        </button>
      </div>
    </PopoverContent>
  </Popover>
</template>
