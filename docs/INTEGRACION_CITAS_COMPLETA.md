# ✅ Integración Completa: Agenda de Citas con Backend

## 📋 Cambios Realizados

### 1. **Componente CrearCitaModal.tsx**
- ✅ Formulario completo con validación
- ✅ Integración con reCAPTCHA v3 (CRÍTICO)
- ✅ Envío de token de reCAPTCHA en headers
- ✅ Manejo de errores del backend
- ✅ Recarga automática de lista tras éxito

### 2. **Layout Principal (layout.tsx)**
- ✅ Script de reCAPTCHA v3 cargado en head
- ✅ Usa variable de entorno: `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`

### 3. **Utility para reCAPTCHA (lib/recaptcha.ts)**
- ✅ Función `obtenerTokenRecaptcha()` para obtener tokens
- ✅ Función `isRecaptchaAvailable()` para verificar disponibilidad
- ✅ Tipado de `window.grecaptcha`

### 4. **Página de Agenda (admin/agenda/page.tsx)**
- ✅ Botón "Nueva Cita" abre modal
- ✅ Recarga automática tras crear cita
- ✅ Se muestra la nueva cita en el kanban

### 5. **Configuración (.env.local)**
- ✅ Variable `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` agregada
- ✅ Placeholder para que configures tu clave

---

## 🔧 Configuración Requerida

### Paso 1: Obtener Claves de reCAPTCHA v3

1. Ir a: **https://www.google.com/recaptcha/admin**
2. Iniciar sesión con cuenta de Google
3. Clic en "+" para crear nuevo sitio
4. Llenar:
   - **Nombre:** Kuche Plataforma
   - **Tipo:** reCAPTCHA v3
   - **Dominios:**
     - localhost
     - 127.0.0.1
     - (tu dominio en producción)
5. Aceptar términos y clic en "Crear"
6. Copiar: **Site Key** y **Secret Key**

### Paso 2: Configurar Frontend

Editar `.env.local`:

```env
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=YOUR_SITE_KEY_HERE
```

**Nota:** Esta variable ES pública (visible en navegador), es intencional.

### Paso 3: Configurar Backend

El backend necesita:

```env
RECAPTCHA_SECRET_KEY=YOUR_SECRET_KEY_HERE
```

---

## 🧪 Probar la Integración

### Test 1: Verificar reCAPTCHA está cargado

Abrir **Consola del Navegador** (F12):

```javascript
// En la consola:
window.grecaptcha
```

**Resultado esperado:** Objeto con propiedades `ready`, `execute`, etc.

### Test 2: Crear una Cita

1. Ir a **Admin → Agenda**
2. Clic botón **"Nueva Cita"**
3. Llenar datos:
   - **Nombre:** Juan López
   - **Correo:** juan@example.com
   - **Teléfono:** +34 666 123 456
   - **Fecha:** Mañana (mínimo)
   - **Hora:** 14:00 (9-18 disponible)
4. Clic **"Crear Cita"**

**Esperado:**
- Se obtiene token de reCAPTCHA
- Se envía al backend con header `captcha-token`
- Cita se crea en base de datos
- Modal cierra automáticamente
- Nueva cita aparece en kanban

### Test 3: Verificar en Consola del Navegador

```javascript
// Verás logs como:
"=== RESPUESTA RECIBIDA ==="
```

### Test 4: Verificar en Base de Datos

```javascript
// Conectar a MongoDB y ver:
db.cita.find({})
```

**Debe haber una nueva cita con:**
- `clienteId`: "ABC123" (6 caracteres generados)
- `nombreCliente`: "Juan López"
- `estado`: "programada"
- `createdAt`: timestamp reciente

---

## 🚀 Flujo Completo de Datos

```
┌─────────────────────────────────┐
│  Usuario en Admin → Agenda      │
│  Clic "Nueva Cita"              │
└────────┬────────────────────────┘
         │
         ↓
┌─────────────────────────────────┐
│  Modal CrearCitaModal abre      │
│  Formulario con campos          │
└────────┬────────────────────────┘
         │
         ↓
┌─────────────────────────────────┐
│  Usuario completa y clic Crear  │
│  - Validaciones básicas ✓       │
│  - reCAPTCHA disponible ✓       │
└────────┬────────────────────────┘
         │
         ↓
┌──────────────────────────────────┐
│  obtenerTokenRecaptcha()         │
│  - Espera a que grecaptcha esté  │
│    listo                         │
│  - Ejecuta grecaptcha.execute()  │
│  - Retorna token                 │
└────────┬─────────────────────────┘
         │
         ↓
┌──────────────────────────────────┐
│  crearCita(datos, token)         │
│  POST /api/citas/agregarCita     │
│  Headers:                        │
│  - Content-Type: application/... │
│  - captcha-token: TOKEN ✓        │
│  Body: {nombre, correo, tel...} │
└────────┬─────────────────────────┘
         │
         ↓
┌──────────────────────────────────┐
│  Backend (express)               │
│  1. Valida captcha-token         │
│  2. Valida datos (fecha, email)  │
│  3. Crea Cita en BD              │
│  4. Retorna {success, data}      │
└────────┬─────────────────────────┘
         │
         ↓
┌──────────────────────────────────┐
│  Frontend recibe respuesta       │
│  ✓ success: true                 │
│  ✓ data.clienteId: "ABC123"      │
│  ✓ data._id: ObjectId            │
└────────┬─────────────────────────┘
         │
         ↓
┌──────────────────────────────────┐
│  Modal cierra                    │
│  onCitaCreada() ejecuta:         │
│  - cargarDatos() recarga citas   │
│  - Nueva cita aparece en kanban  │
└──────────────────────────────────┘
```

---

## ⚠️ Errores Comunes y Soluciones

| Error | Causa | Solución |
|-------|-------|----------|
| "reCAPTCHA no está cargado" | Variable de entorno no configurada | Editar `.env.local` con tu Site Key |
| "Error 400: captcha-token requerido" | Token no se envía | Verificar que `obtenerTokenRecaptcha()` se ejecutó |
| "Error 400: Fecha no futura" | Fecha en pasado | Seleccionar fecha futura (mínimo mañana) |
| "Error 400: Lunes a viernes" | Intenta fin de semana | Seleccionar solo lunes-viernes |
| "Error 400: 9 AM a 6 PM" | Hora fuera de rango | Seleccionar entre 09:00 y 17:59 |
| "Error 400: 1 hora anticipación" | Menos de 1 hora | Anticipación mínima: 1 hora |
| "Error: Conflicto de disponibilidad" | Horario ocupado | Seleccionar horario con 1+ hora de separación |

---

## 📝 Checklist para Producción

- [ ] reCAPTCHA v3 Site Key en `.env.local`
- [ ] reCAPTCHA v3 Secret Key en backend `.env`
- [ ] Backend URL correcta en `NEXT_PUBLIC_API_URL`
- [ ] Script de reCAPTCHA carga correctamente (F12 Console)
- [ ] Modal se abre correctamente
- [ ] Token se obtiene sin errores
- [ ] Cita se crea en base de datos
- [ ] Nueva cita aparece en kanban
- [ ] Emails de confirmación enviados (si está implementado)
- [ ] Rate limiting funciona (5 intentos/5 min por código)
- [ ] Testing con múltiples citas

---

## 🔌 APIs Involucradas

### Frontend → Backend
- **POST /api/citas/agregarCita**
  - Headers: `captcha-token`
  - Body: CitaCreate
  - Response: {success, data: Cita}

### Frontend → Google reCAPTCHA
- **Ejecuta script v3**
  - Obtiene token automáticamente
  - No requiere interacción del usuario

### Backend → Google reCAPTCHA
- **POST https://www.google.com/recaptcha/api/siteverify**
  - Valida que el token sea legítimo
  - Retorna score de confianza

---

## 📞 Próximos Pasos

1. **Agregar tu Site Key de reCAPTCHA**
   - Editar `.env.local`
   - Recargar navegador (Ctrl+Shift+R)

2. **Verificar reCAPTCHA está cargado**
   - F12 → Console
   - Verificar `window.grecaptcha` existe

3. **Probar creación de cita**
   - Ir a Admin → Agenda
   - Clic "Nueva Cita"
   - Llenar y enviar

4. **Monitorear logs**
   - Browser console (F12)
   - Network tab para ver requests
   - MongoDB para verificar datos

5. **Produción**
   - Usar dominios reales en reCAPTCHA
   - Configurar variables de entorno en servidor
   - Habilitar HTTPS (reCAPTCHA v3 requiere)

---

## ✅ Estado

- ✅ Frontend conectado con backend
- ✅ reCAPTCHA v3 integrado
- ✅ Validaciones implementadas
- ✅ Manejo de errores completo
- ✅ Build sin errores
- ⏳ Requiere: Site Key de reCAPTCHA para testing

---

**Ultima actualización:** 18 de Mayo de 2026
