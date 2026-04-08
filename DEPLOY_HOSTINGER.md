# Guía de Deploy a Hostinger

## Archivos listos en `dist/`

Tu carpeta `dist/` ahora contiene:

✅ `.htaccess` - Rewrite rules para SPA routing
✅ `.nojekyll` - Marca para GitHub Pages
✅ `404.html` - Fallback para rutas no encontradas
✅ `index.html` - Punto de entrada principal
✅ `assets/` - 36 chunks de JavaScript compilado
✅ `images/`, `logos/` - Assets estáticos

## Pasos para subir a Hostinger

### 1. Accede al File Manager de Hostinger
- Abre Hostinger cPanel
- Ve a File Manager
- Navega a `public_html/`

### 2. BORRA los archivos viejos
⚠️ IMPORTANTE: Debes limpiar completamente

1. **Borra la carpeta `assets/` completa**
   - Selecciona `public_html/assets`
   - Clic derecho → Delete
   - Confirma

2. **Borra estos archivos individuales:**
   - `index.html` 
   - `404.html` (si existe una versión vieja)
   - `.htaccess` (si existe una versión vieja)

3. **Mantén carpetas:**
   - `images/`
   - `logos/`
   - `android-chrome-*.png`
   - `favicon.*`
   - `apple-touch-icon.png`

### 3. Sube los archivos nuevos

En tu máquina:
```bash
cd c:/Users/kagui/Documents/Github/credit-fronted/creditos-frontend/dist/
```

Sube TODO a `public_html/`:
- `.htaccess`
- `404.html`
- `.nojekyll`
- `index.html`
- Carpeta `assets/` completa (36 archivos)

### 4. Verifica permisos en Hostinger

Después de subir:
1. Selecciona `public_html/`
2. Clic derecho → Change Permissions
3. Carpetas: `755`
4. Archivos: `644`

### 5. Test

Accede a:
- `https://creditosroksa.com/login` → Debe cargar
- `https://creditosroksa.com/dashboard/panel` → Debe cargar
- Abre DevTools (F12) → Network tab
- Recarga la página
- Verifica que archivos en `/assets/` tengan status **200** ✅

Si ves 404 en assets, borra TODO de `public_html` y sube de nuevo.

## Si algo falla

### Error: "This Page Does Not Exist"
- El `.htaccess` no se subió correctamente
- Verifica que existe en `public_html/`
- Comprueba permisos de `.htaccess` sean 644

### Error: 404 en chunks específicos
- Te olvidaste de subir la carpeta `assets/` completa
- Borra `assets/` vieja y sube la nueva entera

### Error: CSS o JavaScript no aplica
- Borra caché del navegador: Ctrl+Shift+Del
- O abre en modo incógnito

## Git + Hostinger Workflow

Cada vez que hagas cambios:

```bash
# 1. Haz cambios en main branch
git add .
git commit -m "descripción"
git push origin main

# 2. GitHub Actions automáticamente:
#    - Buildea el proyecto
#    - Genera dist/ optimizado
#    - Publica en deploy branch

# 3. Descarga dist/ nuevo a tu máquina
#    (o usa SFTP/rsync para sincronizar)

# 4. Borra assets viejo en Hostinger
# 5. Sube dist/ nuevo
```

---

✅ Configuración lista. Ahora sube a Hostinger siguiendo estos pasos.
