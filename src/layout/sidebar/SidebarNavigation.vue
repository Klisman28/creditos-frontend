<script setup lang="ts">
import Scrollbar from "simplebar-vue";
// CUSTOM COMPONENT
import NavItem from "./NavItem.vue";
// MENU LIST
import { navigation } from "@/data/navigation";
</script>

<template>
  <div class="px-4 py-5 mb-2">
    <RouterLink to="/panel" class="flex items-center gap-2">
      <div class="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
        <span class="text-white text-sm font-bold">C</span>
      </div>
      <span class="text-sm font-bold text-card-foreground">Créditos</span>
    </RouterLink>
  </div>

  <Scrollbar class="h-[calc(100vh-75px)]">
    <nav class="pb-4 space-y-6">
      <div class="space-y-3" v-for="navGroup in navigation" :key="navGroup.id">
        <h4 class="px-5 text-[12px] font-semibold text-primary uppercase">
          {{ navGroup.name }}
        </h4>

        <ul>
          <NavItem v-for="(menuItem, index) in navGroup.menu" :item="menuItem" :key="index" />
        </ul>
      </div>
    </nav>
  </Scrollbar>
</template>
