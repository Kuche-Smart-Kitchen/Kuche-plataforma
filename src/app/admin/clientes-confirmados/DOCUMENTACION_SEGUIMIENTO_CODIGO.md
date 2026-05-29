# 📋 Documentación: Envío de Código de ClienteIdentidad en Seguimiento

## 🎯 Objetivo
Documentar cómo se envía y valida el código de `clienteIdentidad` en el sistema de seguimiento de clientes.

---

## 🔄 Flujo de Datos

### 1️⃣ **Recepción del Código**
```
Frontend (Usuario) 
    ↓ 
POST /api/seguimiento/login 
    ↓ 
Backend (Controller: seguimiento.controller.js)
```

El frontend envía el código del cliente:
```json
{
  "codigo": "A1B2C3"
}
```

---

## 📊 Proceso en el Backend

### **Paso 1: Validación Inicial**
**Archivo:** `src/controllers/seguimiento.controller.js` - `loginSeguimiento()`

```javascript
const codigo = normalizeCodigoInput(resolveCodigoFromBody(req.body));
// Resultado: "A1B2C3" (normalizado a mayúsculas, 6 caracteres)
```

- ✅ Valida longitud (debe ser exactamente 6 caracteres)
- ✅ Normaliza a mayúsculas
- ✅ Aplica rate limiting por IP

---

### **Paso 2: Búsqueda en TrackingAccess**
```javascript
let access = await findEnabledAccessByCodigo6(codigo);
// Busca en la colección TrackingAccess por codigo6
```

Si no encuentra:
```javascript
access = await bootstrapTrackingAccessByCodigo6(codigo);
// Intenta crear acceso automático
```

---

### **Paso 3: Construcción del Snapshot del Proyecto**
**Archivo:** `src/controllers/seguimiento.controller.js` - `buildProjectSnapshot(access)`

```javascript
const snapshot = await buildProjectSnapshot(access);
```

**AQUÍ ES DONDE OCURRE LA MAGIA:**

#### **Para Proyectos:**
```javascript
// 1. Obtiene el proyecto asociado al código
const proyecto = await resolveProjectForAccess(access);

// 2. Busca el código en clienteIdentidad
const clienteCodigo = String(proyecto?.clienteId || access?.codigo6).trim().toUpperCase();
const clienteIdentidad = await ClienteIdentidad.findOne({ codigo: clienteCodigo }).lean();

// 3. Usa el código de clienteIdentidad
let codigoClienteIdentidad = access.codigo6;
if (clienteIdentidad?.codigo) {
    codigoClienteIdentidad = clienteIdentidad.codigo; // ✅ AQUÍ SE ASIGNA
}

// 4. Lo incluye en el snapshot que se retorna
return {
    codigo: codigoClienteIdentidad,  // ✅ CÓDIGO DE CLIENTEIDENTIDAD
    cliente: proyecto.nombreCliente,
    isProspect: false,
    // ... más datos
};
```

#### **Para Tareas:**
```javascript
// Mismo proceso pero para tareas individuales
const tarea = await resolveTaskForAccess(access);
const clienteCodigo = String(tarea?.clienteId || access?.codigo6).trim().toUpperCase();
const clienteIdentidad = await ClienteIdentidad.findOne({ codigo: clienteCodigo }).lean();

let codigoClienteIdentidad = access.codigo6;
if (clienteIdentidad?.codigo) {
    codigoClienteIdentidad = clienteIdentidad.codigo;
}

return {
    codigo: codigoClienteIdentidad,  // ✅ CÓDIGO DE CLIENTEIDENTIDAD
    // ... datos de la tarea
};
```

---

### **Paso 4: Generación del Token JWT**
```javascript
const { token, expiresAt } = signTrackingToken(access);
```

El token contiene:
```javascript
{
    sub: access._id,           // ID del acceso
    scope: 'tracking:read',    // Permiso
    codigo6: access.codigo6    // Código del acceso (para validaciones posteriores)
}
```

---

### **Paso 5: Respuesta al Cliente**
```json
{
    "success": true,
    "data": {
        "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "expiresAt": "2026-05-18T14:30:00.000Z",
        "project": {
            "codigo": "A1B2C3",           // ✅ Código de clienteIdentidad
            "cliente": "Juan López",
            "isProspect": false,
            "inversion": 5000,
            "fechaInicio": "18 de Mayo",
            "fechaEntrega": "25 de Mayo",
            "garantiaInicio": "2026-05-25",
            "estadoProyecto": "en_proceso",
            "etapaActual": "instalacion",
            "pagos": { /* ... */ },
            "seguimientoNota": "Proyecto en etapa de instalación",
            "archivos": [ /* ... */ ],
            "projectId": "507f1f77bcf86cd799439011"
        }
    }
}
```

---

## 📱 Uso en el Frontend

### **Ejemplo con JavaScript/React:**

```javascript
// 1. Login
const loginResponse = await fetch('http://localhost:3000/api/seguimiento/login', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        codigo: 'A1B2C3'  // Código del cliente
    })
});

const loginData = await loginResponse.json();

if (loginData.success) {
    const { token, project } = loginData.data;
    
    console.log('Código del cliente:', project.codigo);  // "A1B2C3"
    console.log('Cliente:', project.cliente);             // "Juan López"
    console.log('Estado:', project.estadoProyecto);       // "en_proceso"
    
    // Guardar token para posteriores solicitudes
    localStorage.setItem('trackingToken', token);
    
    // 2. Hacer solicitudes con el token
    const projectResponse = await fetch('http://localhost:3000/api/seguimiento/proyecto', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    
    const projectData = await projectResponse.json();
    console.log(projectData);
}
```

---

## 🗄️ Estructura de la Base de Datos

### **ClienteIdentidad Collection:**
```javascript
{
    _id: ObjectId("..."),
    codigo: "A1B2C3",        // ✅ CÓDIGO ÚNICO DE 6 CARACTERES
    nombre: "Juan López",
    correo: "juan@email.com",
    telefono: "+34 666 123 456",
    correoNormalizado: "juan@email.com",
    telefonoNormalizado: "+34666123456",
    archivos: [ /* archivos del cliente */ ],
    createdAt: ISODate("2025-01-15T10:00:00Z"),
    updatedAt: ISODate("2026-05-18T12:30:00Z")
}
```

### **Relación con otras colecciones:**
```
ClienteIdentidad (codigo: "A1B2C3")
    ↓
Proyecto (clienteId: "A1B2C3")
    ↓
Tarea (clienteId: "A1B2C3")
```

---

## 🔐 Seguridad

### **Rate Limiting Implementado:**
- **Por IP:** 10 intentos en 10 minutos
- **Por Código:** 5 intentos en 5 minutos
- **Bloqueo:** Devuelve error 429 (Too Many Requests)

### **Validación:**
- ✅ El código debe ser exactamente 6 caracteres
- ✅ Se normaliza a mayúsculas
- ✅ Se valida contra la base de datos
- ✅ Se requiere token JWT válido para posteriores solicitudes

---

## 📝 Resumen del Flujo Completo

```
┌─────────────────┐
│  Frontend       │
│  Envía: A1B2C3  │
└────────┬────────┘
         │
         ↓
┌──────────────────────────────┐
│  POST /seguimiento/login     │
│  Valida código (6 caracteres)│
└────────┬─────────────────────┘
         │
         ↓
┌──────────────────────────────┐
│  Busca en TrackingAccess     │
│  y bootstrapea si es necesario
└────────┬─────────────────────┘
         │
         ↓
┌────────────────────────────────────┐
│  buildProjectSnapshot()            │
│  Busca en ClienteIdentidad         │
│  y obtiene código correcto         │
└────────┬─────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────────┐
│  Genera JWT Token                       │
│  Retorna: { token, project }            │
│  project.codigo = "A1B2C3"              │
└────────┬────────────────────────────────┘
         │
         ↓
┌─────────────────────────────────┐
│  Frontend recibe respuesta      │
│  Guarda token                   │
│  Muestra código A1B2C3          │
└─────────────────────────────────┘
```

---

## ✅ Verificación de Cambios

Los cambios fueron realizados en:
- **Archivo:** `src/controllers/seguimiento.controller.js`
- **Línea:** ~323 (función `buildProjectSnapshot`)
- **Cambio:** Se agregó importación de `ClienteIdentidad` y lógica para obtener el código correcto

El código ahora:
1. ✅ Busca el cliente en `clienteIdentidad`
2. ✅ Obtiene el código exacto de esa colección
3. ✅ Lo envía en la respuesta
4. ✅ Lo almacena en el seguimiento del proyecto

---

## 🧪 Pruebas con cURL

```bash
# 1. Login
curl -X POST http://localhost:3000/api/seguimiento/login \
  -H "Content-Type: application/json" \
  -d '{"codigo":"A1B2C3"}'

# Respuesta esperada:
# {
#   "success": true,
#   "data": {
#     "token": "...",
#     "project": {
#       "codigo": "A1B2C3",
#       ...
#     }
#   }
# }

# 2. Obtener proyecto (con token)
curl -X GET http://localhost:3000/api/seguimiento/proyecto \
  -H "Authorization: Bearer <TOKEN_AQUI>"

# 3. Obtener archivos
curl -X GET http://localhost:3000/api/seguimiento/archivos \
  -H "Authorization: Bearer <TOKEN_AQUI>"

# 4. Obtener pagos
curl -X GET http://localhost:3000/api/seguimiento/pagos \
  -H "Authorization: Bearer <TOKEN_AQUI>"

# 5. Logout
curl -X POST http://localhost:3000/api/seguimiento/logout \
  -H "Authorization: Bearer <TOKEN_AQUI>"
```

---

## 📞 Soporte

En caso de problemas:
1. Verificar que el código exista en `clienteIdentidad`
2. Verificar que el `TrackingAccess` esté habilitado
3. Revisar logs del servidor para más detalles
4. Verificar que el token no haya expirado
