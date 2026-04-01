<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from "vue";
import apiClient from "@/apiClient";
import Footer from "@/components/Footer.vue";
import Icon from "@/components/Icon.vue";
import { Button } from "@/components/ui/button";
import { push } from "notivue";

// ── Types ──────────────────────────────────────────────────────────
interface CompanyConfig {
  id?: number;
  nombre: string;
  acronimo: string;
  telefono: string;
  email: string;
  direccion: string;
  nit: string;
  capital: number;
  moneda: string;
  simbolo_moneda: string;
  zona_horaria: string;
  formato_fecha: string;
  color_primario: string;
  logo_url: string | null;
  favicon_url: string | null;
  nombre_reportes: string;
  pie_documento: string;
  texto_legal: string;
}

const DEFAULTS: CompanyConfig = {
  nombre: "", acronimo: "", telefono: "", email: "", direccion: "", nit: "",
  capital: 0, moneda: "GTQ", simbolo_moneda: "Q", zona_horaria: "America/Guatemala",
  formato_fecha: "DD/MM/YYYY", color_primario: "#1976D2",
  logo_url: null, favicon_url: null,
  nombre_reportes: "", pie_documento: "", texto_legal: "",
};

// ── State ──────────────────────────────────────────────────────────
const loading = ref(true);
const saving = ref(false);
const form = reactive<CompanyConfig>({ ...DEFAULTS });
const originalJson = ref("");
const activeSection = ref("general");

const BACKEND_URL = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api/v1").replace("/api/v1", "");

// ── Sections ───────────────────────────────────────────────────────
const sections = [
  { id: "general", label: "Datos Generales", icon: "Building2" },
  { id: "parametros", label: "Parámetros del Sistema", icon: "Settings" },
  { id: "identidad", label: "Identidad Visual", icon: "Palette" },
  { id: "documentos", label: "Documentos", icon: "FileText" },
];

// ── Dirty detection ────────────────────────────────────────────────
const isDirty = computed(() => JSON.stringify(form) !== originalJson.value);

// ── Logo ───────────────────────────────────────────────────────────
const logoFile = ref<File | null>(null);
const logoPreview = ref<string | null>(null);
const logoUploading = ref(false);
const logoDeleting = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

const resolvedLogoUrl = computed(() => {
  if (logoPreview.value) return logoPreview.value;
  if (form.logo_url) {
    // S3 URLs are already absolute; local legacy paths need the backend prefix
    if (form.logo_url.startsWith("http")) return form.logo_url;
    return `${BACKEND_URL}${form.logo_url}`;
  }
  return null;
});

const handleFileSelect = (e: Event) => {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  const ext = file.name.split(".").pop()?.toLowerCase();
  if (!["png", "jpg", "jpeg", "webp", "svg"].includes(ext || "")) {
    push.error("Formato no válido. Usa PNG, JPG, WEBP o SVG.");
    return;
  }
  if (file.size > 2 * 1024 * 1024) {
    push.error("El archivo excede 2 MB.");
    return;
  }

  logoFile.value = file;
  logoPreview.value = URL.createObjectURL(file);
};

const uploadLogo = async () => {
  if (!logoFile.value) return;
  logoUploading.value = true;
  try {
    const fd = new FormData();
    fd.append("file", logoFile.value);
    const res = await apiClient.post("/configuracion/logo", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    form.logo_url = res.data.logo_url;
    logoFile.value = null;
    logoPreview.value = null;
    originalJson.value = JSON.stringify(form);
    push.success("Logo actualizado correctamente");
  } catch (error: any) {
    push.error(error.response?.data?.detail || "Error al subir el logo");
  } finally {
    logoUploading.value = false;
  }
};

const deleteLogo = async () => {
  logoDeleting.value = true;
  try {
    await apiClient.delete("/configuracion/logo");
    form.logo_url = null;
    logoPreview.value = null;
    logoFile.value = null;
    originalJson.value = JSON.stringify(form);
    push.success("Logo eliminado");
  } catch {
    push.error("Error al eliminar el logo");
  } finally {
    logoDeleting.value = false;
  }
};

// ── CRUD ───────────────────────────────────────────────────────────
const loadConfig = async () => {
  loading.value = true;
  try {
    const res = await apiClient.get("/configuracion");
    Object.assign(form, { ...DEFAULTS, ...res.data });
    originalJson.value = JSON.stringify(form);
  } catch (error: any) {
    push.error(error.response?.data?.detail || "Error al cargar la configuración");
  } finally {
    loading.value = false;
  }
};

const handleSave = async () => {
  saving.value = true;
  try {
    const res = await apiClient.post("/configuracion", form);
    Object.assign(form, { ...DEFAULTS, ...res.data });
    originalJson.value = JSON.stringify(form);
    push.success("Configuración guardada correctamente");
  } catch (error: any) {
    push.error(error.response?.data?.detail || "Error al guardar");
  } finally {
    saving.value = false;
  }
};

onMounted(loadConfig);

// ── Helpers ────────────────────────────────────────────────────────
const todayFormatted = computed(() => {
  const d = new Date();
  const map: Record<string, string> = {
    "DD/MM/YYYY": `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth()+1).toString().padStart(2, "0")}/${d.getFullYear()}`,
    "MM/DD/YYYY": `${(d.getMonth()+1).toString().padStart(2, "0")}/${d.getDate().toString().padStart(2, "0")}/${d.getFullYear()}`,
    "YYYY-MM-DD": `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`,
  };
  return map[form.formato_fecha] || map["DD/MM/YYYY"];
});
</script>

<template>
  <div class="space-y-6 mt-2 mb-10">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h2 class="text-2xl font-extrabold text-card-foreground">Configuración</h2>
        <p class="text-sm text-muted mt-1">Administra los datos y parámetros de tu empresa</p>
      </div>
      <div class="flex items-center gap-3">
        <span v-if="isDirty" class="flex items-center gap-1.5 text-xs text-amber-500 font-medium animate-pulse">
          <span class="w-2 h-2 rounded-full bg-amber-500"></span>
          Cambios sin guardar
        </span>
        <Button
          variant="default"
          :disabled="saving || !isDirty"
          @click="handleSave"
          class="shadow-lg shadow-primary/20 gap-2 px-6"
        >
          <template v-if="!saving">
            <Icon name="Save" :size="16" />
            Guardar
          </template>
          <template v-else>
            <div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            Guardando...
          </template>
        </Button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex flex-col items-center justify-center min-h-[400px]">
      <div class="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      <p class="text-muted mt-4 animate-pulse">Cargando configuración...</p>
    </div>

    <!-- Main Grid -->
    <div v-else class="grid grid-cols-12 gap-6">
      <!-- Sidebar Navigation -->
      <div class="col-span-12 lg:col-span-3">
        <div class="bg-card border border-border rounded-2xl p-3 sticky top-4">
          <button
            v-for="sec in sections"
            :key="sec.id"
            @click="activeSection = sec.id"
            :class="[
              'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all group mb-1',
              activeSection === sec.id
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'text-muted hover:bg-muted/50 hover:text-card-foreground'
            ]"
          >
            <Icon :name="sec.icon as any" :size="18" :class="activeSection === sec.id ? 'text-white' : 'text-muted group-hover:text-primary'" />
            {{ sec.label }}
          </button>
        </div>
      </div>

      <!-- Content Area -->
      <div class="col-span-12 lg:col-span-5">
        <div class="bg-card border border-border rounded-2xl overflow-hidden">

          <!-- ═══ DATOS GENERALES ═══════════════════════════════ -->
          <div v-if="activeSection === 'general'" class="animate-in fade-in slide-in-from-bottom-2">
            <div class="px-6 py-5 border-b border-border bg-muted/20 flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <Icon name="Building2" :size="18" class="text-primary" />
              </div>
              <div>
                <h3 class="text-sm font-bold text-card-foreground">Datos Generales</h3>
                <p class="text-xs text-muted">Información de identidad de la empresa</p>
              </div>
            </div>

            <div class="p-6 space-y-5">
              <div class="space-y-2">
                <label class="text-xs font-bold text-muted uppercase tracking-widest ml-1">Nombre de la Empresa</label>
                <input v-model="form.nombre" type="text" placeholder="Ej. Financiera Los Andes"
                  class="w-full px-4 py-3 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none text-card-foreground" />
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div class="space-y-2">
                  <label class="text-xs font-bold text-muted uppercase tracking-widest ml-1">Acrónimo</label>
                  <input v-model="form.acronimo" type="text" placeholder="Ej. FLA" maxlength="10"
                    class="w-full px-4 py-3 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none text-card-foreground uppercase" />
                </div>
                <div class="space-y-2">
                  <label class="text-xs font-bold text-muted uppercase tracking-widest ml-1">NIT / ID Fiscal</label>
                  <input v-model="form.nit" type="text" placeholder="Ej. 1234567-8"
                    class="w-full px-4 py-3 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none text-card-foreground" />
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div class="space-y-2">
                  <label class="text-xs font-bold text-muted uppercase tracking-widest ml-1">Teléfono</label>
                  <input v-model="form.telefono" type="text" placeholder="Ej. 5555-1234"
                    class="w-full px-4 py-3 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none text-card-foreground" />
                </div>
                <div class="space-y-2">
                  <label class="text-xs font-bold text-muted uppercase tracking-widest ml-1">Correo Corporativo</label>
                  <input v-model="form.email" type="email" placeholder="info@empresa.com"
                    class="w-full px-4 py-3 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none text-card-foreground" />
                </div>
              </div>

              <div class="space-y-2">
                <label class="text-xs font-bold text-muted uppercase tracking-widest ml-1">Dirección</label>
                <input v-model="form.direccion" type="text" placeholder="4a Calle 2-50, Zona 1"
                  class="w-full px-4 py-3 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none text-card-foreground" />
              </div>
            </div>
          </div>

          <!-- ═══ PARÁMETROS DEL SISTEMA ════════════════════════ -->
          <div v-if="activeSection === 'parametros'" class="animate-in fade-in slide-in-from-bottom-2">
            <div class="px-6 py-5 border-b border-border bg-muted/20 flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <Icon name="Settings" :size="18" class="text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h3 class="text-sm font-bold text-card-foreground">Parámetros del Sistema</h3>
                <p class="text-xs text-muted">Moneda, capital y formatos operativos</p>
              </div>
            </div>

            <div class="p-6 space-y-5">
              <div class="space-y-2">
                <label class="text-xs font-bold text-muted uppercase tracking-widest ml-1">Capital Inicial</label>
                <div class="relative">
                  <span class="absolute left-4 top-1/2 -translate-y-1/2 text-muted font-bold text-sm">{{ form.simbolo_moneda }}</span>
                  <input v-model.number="form.capital" type="number" min="0" step="0.01" placeholder="0.00"
                    class="w-full pl-8 pr-4 py-3 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none text-card-foreground font-mono" />
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div class="space-y-2">
                  <label class="text-xs font-bold text-muted uppercase tracking-widest ml-1">Código Moneda</label>
                  <select v-model="form.moneda"
                    class="w-full px-4 py-3 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none text-card-foreground">
                    <option value="GTQ">GTQ — Quetzal</option>
                    <option value="USD">USD — Dólar</option>
                    <option value="MXN">MXN — Peso Mexicano</option>
                    <option value="HNL">HNL — Lempira</option>
                  </select>
                </div>
                <div class="space-y-2">
                  <label class="text-xs font-bold text-muted uppercase tracking-widest ml-1">Símbolo</label>
                  <input v-model="form.simbolo_moneda" type="text" maxlength="5" placeholder="Q"
                    class="w-full px-4 py-3 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none text-card-foreground text-center font-bold text-lg" />
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div class="space-y-2">
                  <label class="text-xs font-bold text-muted uppercase tracking-widest ml-1">Zona Horaria</label>
                  <select v-model="form.zona_horaria"
                    class="w-full px-4 py-3 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none text-card-foreground">
                    <option value="America/Guatemala">América/Guatemala</option>
                    <option value="America/Mexico_City">América/México</option>
                    <option value="America/Tegucigalpa">América/Honduras</option>
                    <option value="America/New_York">América/Nueva York</option>
                  </select>
                </div>
                <div class="space-y-2">
                  <label class="text-xs font-bold text-muted uppercase tracking-widest ml-1">Formato de Fecha</label>
                  <select v-model="form.formato_fecha"
                    class="w-full px-4 py-3 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none text-card-foreground">
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  </select>
                </div>
              </div>

              <div class="bg-muted/20 rounded-xl p-4 border border-border">
                <p class="text-xs text-muted">Ejemplo: <span class="font-mono font-bold text-card-foreground">{{ form.simbolo_moneda }}1,250.00</span> · Fecha: <span class="font-mono font-bold text-card-foreground">{{ todayFormatted }}</span></p>
              </div>
            </div>
          </div>

          <!-- ═══ IDENTIDAD VISUAL ══════════════════════════════ -->
          <div v-if="activeSection === 'identidad'" class="animate-in fade-in slide-in-from-bottom-2">
            <div class="px-6 py-5 border-b border-border bg-muted/20 flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center">
                <Icon name="Palette" :size="18" class="text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <h3 class="text-sm font-bold text-card-foreground">Identidad Visual</h3>
                <p class="text-xs text-muted">Logo y color de marca de la empresa</p>
              </div>
            </div>

            <div class="p-6 space-y-6">
              <!-- Logo Upload -->
              <div class="space-y-3">
                <label class="text-xs font-bold text-muted uppercase tracking-widest ml-1">Logo de la Empresa</label>

                <div class="border-2 border-dashed border-border rounded-2xl p-6 flex flex-col items-center justify-center text-center transition-colors hover:border-primary/40 bg-muted/10">
                  <!-- Preview -->
                  <div v-if="resolvedLogoUrl" class="mb-4 relative group">
                    <img :src="resolvedLogoUrl" alt="Logo" class="max-h-24 max-w-[200px] object-contain rounded-lg" />
                    <div class="absolute inset-0 bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                      <button @click="fileInput?.click()" class="w-8 h-8 bg-white rounded-full flex items-center justify-center hover:scale-110 transition-transform" title="Reemplazar">
                        <Icon name="RefreshCcw" :size="14" class="text-gray-700" />
                      </button>
                      <button @click="deleteLogo" :disabled="logoDeleting" class="w-8 h-8 bg-white rounded-full flex items-center justify-center hover:scale-110 transition-transform" title="Eliminar">
                        <Icon name="Trash2" :size="14" class="text-red-500" />
                      </button>
                    </div>
                  </div>

                  <!-- Empty state -->
                  <template v-else>
                    <div class="w-16 h-16 rounded-2xl bg-muted/30 flex items-center justify-center mb-3">
                      <Icon name="ImagePlus" :size="28" class="text-muted" />
                    </div>
                    <p class="text-sm font-medium text-card-foreground">Sube el logo de tu empresa</p>
                    <p class="text-[11px] text-muted mt-1">PNG, JPG, WEBP o SVG · Máx. 2 MB · 512×512 recomendado</p>
                  </template>

                  <input ref="fileInput" type="file" accept=".png,.jpg,.jpeg,.webp,.svg" class="hidden" @change="handleFileSelect" />

                  <div class="flex gap-2 mt-4">
                    <Button v-if="!resolvedLogoUrl" variant="outline" size="sm" class="gap-2" @click="fileInput?.click()">
                      <Icon name="Upload" :size="14" />
                      Seleccionar Archivo
                    </Button>
                    <Button v-if="logoFile" variant="default" size="sm" class="gap-2 shadow shadow-primary/20" @click="uploadLogo" :disabled="logoUploading">
                      <template v-if="!logoUploading">
                        <Icon name="Check" :size="14" />
                        Subir Logo
                      </template>
                      <template v-else>
                        <div class="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Subiendo...
                      </template>
                    </Button>
                  </div>
                </div>
              </div>

              <!-- Primary Color -->
              <div class="space-y-2">
                <label class="text-xs font-bold text-muted uppercase tracking-widest ml-1">Color Primario</label>
                <div class="flex items-center gap-3">
                  <input v-model="form.color_primario" type="color"
                    class="w-12 h-12 rounded-xl border border-border cursor-pointer p-1 bg-background" />
                  <input v-model="form.color_primario" type="text" maxlength="9" placeholder="#1976D2"
                    class="flex-1 px-4 py-3 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none text-card-foreground font-mono uppercase" />
                </div>
                <p class="text-[11px] text-muted ml-1">Define el color principal del branding en reportes y documentos.</p>
              </div>
            </div>
          </div>

          <!-- ═══ DOCUMENTOS ════════════════════════════════════ -->
          <div v-if="activeSection === 'documentos'" class="animate-in fade-in slide-in-from-bottom-2">
            <div class="px-6 py-5 border-b border-border bg-muted/20 flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Icon name="FileText" :size="18" class="text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 class="text-sm font-bold text-card-foreground">Configuración de Documentos</h3>
                <p class="text-xs text-muted">Campos que aparecen en reportes y fichas</p>
              </div>
            </div>

            <div class="p-6 space-y-5">
              <div class="space-y-2">
                <label class="text-xs font-bold text-muted uppercase tracking-widest ml-1">Nombre en Reportes</label>
                <input v-model="form.nombre_reportes" type="text" :placeholder="form.nombre || 'Nombre que aparece en encabezados'"
                  class="w-full px-4 py-3 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none text-card-foreground" />
                <p class="text-[11px] text-muted ml-1">Si se deja vacío, se usa el nombre de la empresa.</p>
              </div>

              <div class="space-y-2">
                <label class="text-xs font-bold text-muted uppercase tracking-widest ml-1">Pie de Documento</label>
                <textarea v-model="form.pie_documento" rows="2" placeholder="Ej. Todos los derechos reservados — Financiera Los Andes"
                  class="w-full px-4 py-3 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none text-card-foreground resize-none"></textarea>
              </div>

              <div class="space-y-2">
                <label class="text-xs font-bold text-muted uppercase tracking-widest ml-1">Texto Legal</label>
                <textarea v-model="form.texto_legal" rows="3" placeholder="Clausula legal corta que se imprime en contratos y fichas de cobro..."
                  class="w-full px-4 py-3 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none text-card-foreground resize-none"></textarea>
              </div>
            </div>
          </div>

        </div>
      </div>

      <!-- ═══ LIVE PREVIEW PANEL ════════════════════════════════ -->
      <div class="col-span-12 lg:col-span-4">
        <div class="bg-card border border-border rounded-2xl overflow-hidden sticky top-4">
          <div class="px-6 py-4 border-b border-border bg-muted/20">
            <h4 class="text-xs font-bold text-muted uppercase tracking-widest">Vista Previa</h4>
          </div>

          <div class="p-6 space-y-6">
            <!-- Company Brand Preview -->
            <div class="flex items-center gap-4">
              <div v-if="resolvedLogoUrl" class="w-14 h-14 rounded-xl border border-border overflow-hidden bg-white flex items-center justify-center p-1 shrink-0">
                <img :src="resolvedLogoUrl" alt="Logo" class="max-w-full max-h-full object-contain" />
              </div>
              <div v-else class="w-14 h-14 rounded-xl flex items-center justify-center text-white text-xl font-black shrink-0" :style="{ backgroundColor: form.color_primario || '#1976D2' }">
                {{ (form.acronimo || form.nombre || 'E').substring(0, 2).toUpperCase() }}
              </div>
              <div class="min-w-0">
                <p class="text-base font-bold text-card-foreground truncate">{{ form.nombre || 'Nombre de Empresa' }}</p>
                <p v-if="form.acronimo" class="text-[11px] text-muted font-bold uppercase tracking-wider">{{ form.acronimo }}</p>
              </div>
            </div>

            <!-- Divider -->
            <hr class="border-border" />

            <!-- Document Header Simulation -->
            <div class="bg-muted/20 rounded-xl p-4 border border-border space-y-3">
              <p class="text-[10px] font-bold text-muted uppercase tracking-widest">Encabezado de Documento</p>

              <div class="bg-card rounded-lg p-4 border border-border shadow-sm">
                <div class="flex items-start gap-3 border-b border-border pb-3 mb-3">
                  <div v-if="resolvedLogoUrl" class="w-10 h-10 rounded-lg overflow-hidden bg-white flex items-center justify-center p-0.5 shrink-0 border border-border">
                    <img :src="resolvedLogoUrl" class="max-w-full max-h-full object-contain" />
                  </div>
                  <div v-else class="w-10 h-10 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0" :style="{ backgroundColor: form.color_primario || '#1976D2' }">
                    {{ (form.acronimo || 'E').substring(0, 2) }}
                  </div>
                  <div class="min-w-0">
                    <p class="text-xs font-bold text-card-foreground leading-tight">{{ form.nombre_reportes || form.nombre || 'Empresa' }}</p>
                    <p class="text-[10px] text-muted leading-tight mt-0.5">{{ form.nit ? `NIT: ${form.nit}` : '' }}{{ form.nit && form.telefono ? ' · ' : '' }}{{ form.telefono ? `Tel: ${form.telefono}` : '' }}</p>
                    <p v-if="form.direccion" class="text-[10px] text-muted leading-tight">{{ form.direccion }}</p>
                  </div>
                </div>

                <div class="space-y-1">
                  <div class="h-2 bg-muted/40 rounded-full w-3/4"></div>
                  <div class="h-2 bg-muted/40 rounded-full w-1/2"></div>
                  <div class="h-2 bg-muted/40 rounded-full w-5/6"></div>
                </div>

                <div v-if="form.pie_documento" class="mt-4 pt-3 border-t border-border">
                  <p class="text-[9px] text-muted text-center italic leading-tight">{{ form.pie_documento }}</p>
                </div>
              </div>
            </div>

            <!-- Quick Info -->
            <div class="space-y-2">
              <p class="text-[10px] font-bold text-muted uppercase tracking-widest">Parámetros Activos</p>
              <div class="grid grid-cols-2 gap-2">
                <div class="bg-muted/20 rounded-lg p-2.5 text-center">
                  <p class="text-[10px] text-muted">Moneda</p>
                  <p class="text-sm font-bold text-card-foreground">{{ form.simbolo_moneda }} {{ form.moneda }}</p>
                </div>
                <div class="bg-muted/20 rounded-lg p-2.5 text-center">
                  <p class="text-[10px] text-muted">Formato</p>
                  <p class="text-sm font-bold text-card-foreground">{{ form.formato_fecha }}</p>
                </div>
                <div class="bg-muted/20 rounded-lg p-2.5 text-center col-span-2">
                  <p class="text-[10px] text-muted">Capital Registrado</p>
                  <p class="text-lg font-extrabold text-primary font-mono">{{ form.simbolo_moneda }}{{ (form.capital || 0).toLocaleString('es-GT', { minimumFractionDigits: 2 }) }}</p>
                </div>
              </div>
            </div>

            <!-- Color Preview -->
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-lg shrink-0 border border-border" :style="{ backgroundColor: form.color_primario }"></div>
              <div>
                <p class="text-xs font-medium text-card-foreground">Color Primario</p>
                <p class="text-[11px] text-muted font-mono">{{ form.color_primario }}</p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>

    <Footer />
  </div>
</template>
