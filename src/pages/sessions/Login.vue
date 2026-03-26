<script setup lang="ts">
import { RouterLink, useRoute, useRouter } from "vue-router";
import { useForm } from "vee-validate";
import { push } from "notivue";
import * as yup from "yup";
// SHADCN COMPONENTS
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
// CUSTOM COMPONENTS
import Icon from "@/components/Icon.vue";
import TextField from "@/components/form/TextField.vue";
// AUTH COMPOSABLE
import { useAuth } from "@/auth/useAuth";

const route = useRoute();
const router = useRouter();
const { login } = useAuth();

const validationSchema = yup.object({
  email: yup.string().required("El usuario o correo es obligatorio"),
  password: yup
    .string()
    .min(4, "La contraseña debe tener al menos 4 caracteres")
    .required("La contraseña es obligatoria")
});

const { values, handleSubmit, isSubmitting, setFieldValue } = useForm({
  validationSchema,
  initialValues: {
    email: "",
    password: "",
    remember: true
  }
});

const onSubmit = handleSubmit(async (values) => {
  try {
    await login({ email: values.email, password: values.password, rememberMe: values.remember });
    const redirectTo = route.query.redirect?.toString() || "/panel";
    router.replace(redirectTo);
    push.success("Sesión iniciada correctamente");
  } catch (error) {
    push.error("Usuario o contraseña incorrectos");
  }
});
</script>

<template>
  <div class="grid min-h-screen lg:grid-cols-2 bg-primary">
    <div class="hidden items-center p-20 text-white lg:flex xl:px-40">
      <div>
        <div class="mb-10 flex items-center gap-3">
          <Icon name="Landmark" :size="36" :strokeWidth="2" class="text-white" />
          <span class="text-2xl font-bold tracking-wide">CRÉDITOS</span>
        </div>
        <h4 class="mb-7 text-4xl font-bold">Bienvenido de vuelta</h4>
        <h5 class="text-xl font-semibold">Sistema de Gestión de Créditos</h5>
        <p class="mt-2 text-sm leading-relaxed">
          Administra préstamos, clientes, promotores y cobros de manera eficiente.
          Control total de tu cartera de créditos con reportes en tiempo real
          y seguimiento de operaciones diarias.
        </p>
      </div>
    </div>

    <div
      class="content-center col-span-full p-10 sm:px-16 sm:py-20 bg-background lg:rounded-tl-[2rem] lg:rounded-bl-[2rem] md:px-40 lg:px-20 2xl:px-52 lg:col-span-1 lg:rtl:rounded-tr-[2rem] lg:rtl:rounded-br-[2rem] rtl:rounded-tl-none rtl:rounded-bl-none">
      <h3 class="font-semibold">Iniciar Sesión</h3>
      <div class="flex gap-1 mt-1 mb-10 text-sm font-medium">
        <p class="text-muted">Sistema de Créditos</p>
      </div>

      <form @submit="onSubmit">
        <div class="space-y-5">
          <TextField id="email" name="email" label="Usuario o Correo" placeholder="Ingresa tu usuario o correo" />
          <TextField
            id="password"
            type="password"
            name="password"
            label="Contraseña"
            placeholder="Ingresa tu contraseña" />
        </div>

        <div class="flex justify-between mt-3">
          <div class="flex gap-2 items-center">
            <Checkbox
              id="remember"
              class="w-4 h-4 rounded-sm border"
              :defaultChecked="values.remember"
              :onUpdate:checked="(value) => setFieldValue('remember', value)" />
            <label for="remember" class="text-sm font-medium leading-none">Recordarme</label>
          </div>

          <RouterLink
            to="/forget-password"
            class="text-sm transition-all text-primary hover:underline underline-offset-2">
            ¿Olvidaste tu contraseña?
          </RouterLink>
        </div>

        <Button :disabled="isSubmitting" type="submit" class="mt-8! w-full">
          <span v-if="!isSubmitting">Ingresar al Sistema</span>
          <span v-else class="flex items-center gap-2">
            <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Verificando...
          </span>
        </Button>
      </form>

      <div class="mt-10 text-center">
        <p class="text-xs text-muted">
          © {{ new Date().getFullYear() }} Sistema de Créditos — Todos los derechos reservados
        </p>
      </div>
    </div>
  </div>
</template>
