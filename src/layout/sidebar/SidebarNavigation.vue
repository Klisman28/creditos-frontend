<script setup lang="ts">
import { computed } from "vue";
import Scrollbar from "simplebar-vue";
// CUSTOM COMPONENT
import NavItem from "./NavItem.vue";
// MENU LIST
import { navigation } from "@/data/navigation";
import { useRole } from "@/composables/useRole";
import { useConfigStore } from "@/stores/config";

const { role } = useRole();
const configStore = useConfigStore();

const filteredNavigation = computed(() => {
  const userRole = role.value;

  return navigation
    .filter((group) => !group.roles || (userRole !== null && group.roles.includes(userRole)))
    .map((group) => ({
      ...group,
      menu: group.menu
        .filter((item) => !item.roles || (userRole !== null && item.roles.includes(userRole)))
        .map((item) => ({
          ...item,
          children: item.children?.filter(
            (child) => !child.roles || (userRole !== null && child.roles.includes(userRole))
          )
        }))
    }));
});
</script>

<template>
  <!-- Brand header -->
  <RouterLink
    to="/panel"
    title="Ir al inicio"
    class="flex items-center gap-3 px-4 py-4 border-b border-border hover:bg-hover transition-colors"
  >
    <div class="w-8 h-8 rounded-lg overflow-hidden bg-primary flex items-center justify-center shrink-0">
      <img v-if="configStore.logo_url" :src="configStore.logo_url" class="w-full h-full object-contain" />
      <span v-else class="text-white text-xs font-bold">
        {{ (configStore.acronimo || configStore.nombre || 'C').charAt(0).toUpperCase() }}
      </span>
    </div>
    <span class="text-sm font-bold text-card-foreground truncate leading-tight">
      {{ configStore.nombre || 'Sistema' }}
    </span>
  </RouterLink>

  <Scrollbar class="h-[calc(100vh-65px)]">
    <nav class="py-3 space-y-4">
      <div
        v-for="navGroup in filteredNavigation"
        :key="navGroup.id"
        class="space-y-1"
      >
        <!-- Hide the group label for "Panel Principal" since the header already acts as home -->
        <h4
          v-if="navGroup.id !== 1"
          class="px-5 pt-2 pb-1 text-[11px] font-semibold text-muted uppercase tracking-widest"
        >
          {{ navGroup.name }}
        </h4>

        <ul>
          <NavItem v-for="(menuItem, index) in navGroup.menu" :item="menuItem" :key="index" />
        </ul>
      </div>
    </nav>
  </Scrollbar>
</template>
