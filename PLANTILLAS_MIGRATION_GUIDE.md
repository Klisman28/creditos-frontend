# 📋 Guía de Migración: Sistema de Plantillas de Préstamo

## ✅ Estado de Implementación

**Completado**: Rediseño completo de la arquitectura de Planes → Plantillas de Préstamo

### Qué cambió

| Aspecto | Antes | Después |
|---------|-------|---------|
| **Concepto** | Plan = Préstamo específico | Plantilla = Reglas reutilizables |
| **Campos persistidos** | `capital`, `total`, `cuota`, `interes`, `mora` | `nombre`, `tasa_interes_anual`, `tasa_mora_diaria`, `frecuencia_dias` |
| **Simulación** | Guardada en BD | Solo en tiempo real (no persistida) |
| **UI** | 7 inputs confusos | 4 inputs claros + simulador interactivo |

---

## 🚀 Para Desarrolladores

### Backend (FastAPI)

**Nuevos endpoints:**

```bash
# Listar plantillas
GET /planes/

# Crear plantilla
POST /planes/
{
  "nombre": "Préstamo Quincenal 10%",
  "tasa_interes_anual": 10.0,
  "tasa_mora_diaria": 2.0,
  "frecuencia_dias": 15,
  "descripcion": "Plantilla estándar",
  "activa": true
}

# Simular plantilla (NOaciona los datos)
POST /planes/simular?monto=5000&cuotas=12&tasa_interes_anual=10&tasa_mora_diaria=2
{
  "monto": 5000,
  "cuotas": 12,
  "cuota_monto": 437.50,
  "total_cobrar": 5250.00,
  "interes_total": 250.00,
  "mora_por_cuota_atraso": 8.71
}

# Actualizar plantilla
PUT /planes/{id}
{
  "tasa_interes_anual": 11.0
}

# Eliminar plantilla
DELETE /planes/{id}
```

**Cambios en modelo:**

```python
class Plan(Base):
    # Nuevos campos
    tasa_interes_anual: float     # % anual
    tasa_mora_diaria: float       # % diario
    frecuencia_dias: int          # Cada X días
    descripcion: Optional[str]    # Notas internas
    activa: bool                  # Disponible para crear créditos
    created_at: datetime          # Auditoría
    updated_at: datetime          # Auditoría
    
    # Eliminados
    # - capital (específico de crédito)
    # - total (específico de crédito)
    # - cuota (calculado, no almacenado)
```

### Frontend (Vue 3)

**Interfaz actualizada:**

```typescript
export interface Plantilla {
  id: number;
  nombre: string;
  tasa_interes_anual: number;
  tasa_mora_diaria: number;
  frecuencia_dias: number;
  descripcion?: string;
  activa: boolean;
  created_at: string;
  updated_at: string;
}

export interface SimulacionPlan {
  monto: number;
  cuotas: number;
  cuota_monto: number;
  total_cobrar: number;
  interes_total: number;
  mora_por_cuota_atraso: number;
}
```

**Nuevo servicio:**

```typescript
planesService.simular({
  monto: 5000,
  cuotas: 12,
  tasa_interes_anual: 10,
  tasa_mora_diaria: 2
})
```

---

## 🔄 Migración de Datos (Si tienes planes existentes)

Si tu BD ya tiene datos en la tabla `plan`, debes migrar:

```sql
-- 1. Agregar nuevas columnas
ALTER TABLE plan ADD COLUMN tasa_interes_anual FLOAT DEFAULT 0;
ALTER TABLE plan ADD COLUMN tasa_mora_diaria FLOAT DEFAULT 0;
ALTER TABLE plan ADD COLUMN frecuencia_dias INT DEFAULT 30;
ALTER TABLE plan ADD COLUMN descripcion TEXT;
ALTER TABLE plan ADD COLUMN activa BOOLEAN DEFAULT true;
ALTER TABLE plan ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE plan ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP;

-- 2. Copiar datos de campos viejos a nuevos (si aplica)
UPDATE plan SET 
  tasa_interes_anual = interes,
  tasa_mora_diaria = mora,
  frecuencia_dias = COALESCE(
    CASE 
      WHEN frequency_type = 'daily' THEN 1
      WHEN frequency_type = 'weekly' THEN 7
      WHEN frequency_type = 'biweekly' THEN 15
      WHEN frequency_type = 'monthly' THEN 30
      ELSE COALESCE(interval_value * 
             CASE interval_unit 
               WHEN 'days' THEN 1
               WHEN 'weeks' THEN 7
               WHEN 'months' THEN 30
               ELSE 30
             END, 30)
    END, 30
  );

-- 3. Eliminar columnas viejas (DESPUÉS de validar los datos)
-- ALTER TABLE plan DROP COLUMN capital;
-- ALTER TABLE plan DROP COLUMN total;
-- ALTER TABLE plan DROP COLUMN cuota;
-- ALTER TABLE plan DROP COLUMN frequency_type;
-- ALTER TABLE plan DROP COLUMN interval_value;
-- ALTER TABLE plan DROP COLUMN interval_unit;

-- 4. Hacer nombre único
ALTER TABLE plan ADD CONSTRAINT unique_plan_nombre UNIQUE (nombre);
```

---

## 📝 Guía para Usuarios

### Crear una Plantilla

1. **Ve a "Plantillas de Préstamo"**
2. **Haz clic en "Nueva Plantilla"**
3. **Rellena los datos:**

| Campo | Ejemplo | Propósito |
|-------|---------|-----------|
| Nombre | "Préstamo Quincenal 10%" | Identifica la plantilla |
| Interés Anual | 10 | % que cobras cada año |
| Mora por Atraso | 2 | % extra si el cliente se atrasa |
| Frecuencia | 15 | Cobras cada 15 días |
| Descripción | "Para clientes nuevos" | Notas internas |

4. **Usa el Simulador:**
   - Ingresa un monto (ej: Q5,000)
   - Ingresa cuotas (ej: 12)
   - Haz clic en "Generar Vista Previa"
   - Verás: cuota, total, interés, mora

5. **Guarda la plantilla**

### Crear un Crédito con una Plantilla

Cuando crees un crédito:

```
1. Selecciona la plantilla (ej: "Préstamo Quincenal 10%")
2. Ingresa el monto del crédito (ej: Q5,000)
3. Ingresa el número de cuotas (ej: 12)
4. El sistema calcula automáticamente:
   - Cuota = (monto × (1 + interes)) / cuotas
   - Total = cuota × cuotas
   - Interés = total - monto
   - Mora por atraso = cuota × mora%
```

---

## ✨ Beneficios de la Nueva Arquitectura

| Beneficio | Antes | Después |
|-----------|-------|---------|
| **Claridad** | Confuso qué es un "plan" | Cristalino: plantilla = reglas |
| **Reusabilidad** | Un plan = un crédito | Una plantilla = N créditos |
| **Mantenibilidad** | 500 planes duplicados | 10-20 plantillas únicas |
| **Cambios de reglas** | Ambiguo qué créditos aplica | Claro: esta plantilla → estos créditos |
| **Simulación** | Datos mezclados | Vista previa sin persistencia |
| **UX** | Formulario confuso | Formulario intuitivo + simulador |

---

## 🔍 Testing Checklist

- [ ] Crear una plantilla nueva
- [ ] Editar una plantilla existente
- [ ] Usar el simulador con diferentes valores
- [ ] Crear un crédito con una plantilla
- [ ] Verificar que el crédito usa las reglas correctas
- [ ] Cambiar una regla de plantilla (ej: interés 10% → 12%)
- [ ] Verificar que créditos viejos mantienen su tasa original
- [ ] Eliminar una plantilla
- [ ] Buscar plantilla por nombre
- [ ] Filtrar por estado (activa/inactiva)

---

## 🐛 Troubleshooting

**Problema:** "Ya existe una plantilla con ese nombre"
- **Solución:** Los nombres deben ser únicos. Cambia el nombre o usa la plantilla existente.

**Problema:** "Monto debe ser mayor a 0" en simulador
- **Solución:** Ingresa un monto válido (>0) antes de simular.

**Problema:** Error 403 "Solo administradores pueden crear plantillas"
- **Solución:** Solo administradores pueden crear/editar plantillas. Pide a un admin.

**Problema:** Los cálculos del simulador no coinciden con el crédito
- **Solución:** Verifica que uses la misma plantilla y valores. El simulador es solo una vista previa.

---

## 📚 Referencias

- **Modelo**: `/app/models/plan.py`
- **Schemas**: `/app/schemas/plan.py`
- **Endpoints**: `/app/api/planes.py`
- **Frontend**: `/src/pages/creditos/PlanesPage.vue`
- **Servicio**: `/src/services/planesService.ts`

---

## 🚢 Próximas Mejoras (Roadmap)

- [ ] Permitir inactivar plantillas sin eliminarlas
- [ ] Historial de cambios en plantillas
- [ ] Plantillas por rol (administrador vs cobrador)
- [ ] Importar/exportar plantillas
- [ ] Presets de plantillas comunes
- [ ] Estadísticas: "Cuántos créditos usan esta plantilla"

---

**Última actualización:** 2026-04-08
**Versión:** 2.0 (Template-based architecture)
