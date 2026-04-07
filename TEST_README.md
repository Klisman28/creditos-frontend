# Smoke Tests - Frontend Créditos

Pruebas de humo para validar que los flujos críticos del frontend no se rompen.

## 📦 Instalación

Las dependencias de test ya están instaladas:

```bash
npm install -D vitest @vitest/ui @vue/test-utils happy-dom @vitest/coverage-v8
```

## 🚀 Ejecución

### Correr todas las pruebas una vez:
```bash
npm run test:run
```

### Modo watch (desarrollo):
```bash
npm test
```

### Con reporte de cobertura:
```bash
npm run test:coverage
```

## 📋 Qué se prueba

### 1. **Componentes críticos existen y se cargan**
- ✅ Login page renders correctly
- ✅ Préstamos page loads
- ✅ Pagos page loads
- ✅ Hojas de Ruta page loads
- ✅ Cobros page loads
- ✅ AccesoDenegado page (for RBAC protection)

### 2. **Configuración de router y stores**
- ✅ Router está configurado
- ✅ Auth store está configurado
- ✅ useRole composable está disponible
- ✅ Navigation tiene estructura para RBAC

### 3. **Fix de duplicación de mora** ⭐
```typescript
// CobrosPage debe usar cuota, NO total
✅ openCobrar debe enviar: { monto: pago.cuota, mora: pago.mora }
❌ NO debe enviar: { monto: pago.total, mora: pago.mora } 
   (esto duplicaría: pago.total (ya incluye mora) + mora = duplicación)
```

### 4. **Control de Acceso por Rol (RBAC)**
- ✅ useRole composable funciona
- ✅ Navigation tiene roles configurados
- ✅ AccesoDenegado existe para proteger rutas

### 5. **API Client y Servicios**
- ✅ apiClient está configurado
- ✅ Servicios (pagos, préstamos, clientes) existen
- ✅ Interceptores y error handling configurados

## 📊 Resultados esperados

```
✓ Smoke Tests - Frontend Critical Flows (23 tests)
  ✓ Component Existence (6)
  ✓ Router Configuration (3)
  ✓ Mora Duplication Fix - CobrosPage (3)
  ✓ RBAC - Role-Based Access Control (3)
  ✓ API Client Configuration (2)
  ✓ Service Layer (3)

Test Files  1 passed (1)
Tests  23 passed (23)
```

## 🔍 Estructura de tests

```
src/__tests__/
├── setup.ts              # Mocks de API, servicios, notivue
└── smoke.spec.ts         # Pruebas de humo (23 tests)
```

## ⚙️ Configuración

- **vitest.config.ts**: Configuración de Vitest
  - Environment: happy-dom (DOM simulado)
  - Globals: true (describe, it, expect disponibles sin import)
  - setupFiles: mocks centralizados

## 📝 Agregar nuevas pruebas

Abre `src/__tests__/smoke.spec.ts` y agrega en el `describe` correspondiente:

```typescript
it('should do something specific', () => {
  // Arrange
  const mockData = { ... };
  
  // Act
  const result = someFunction(mockData);
  
  // Assert
  expect(result).toBe(expected);
});
```

## 🛠️ Troubleshooting

**Error: "getActivePinia() was called but there was no active Pinia"**
- No instanciar stores directamente. Solo importar módulos.

**Error: "Cannot find module '@/...'"**
- Verificar que vitest.config.ts tenga el alias `@` → `./src`

**Tests lentos**
- Usar `happy-dom` en lugar de `jsdom` (más rápido)

## 🎯 Próximas mejoras

- [ ] E2E tests con Playwright/Cypress
- [ ] Tests unitarios para componentes críticos
- [ ] Coverage target: >80%
- [ ] CI/CD integration

---

**Última actualización**: Abril 2026
**Mantenedor**: Sistema de Créditos Confía
