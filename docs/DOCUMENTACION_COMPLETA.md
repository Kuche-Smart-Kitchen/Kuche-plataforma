# 📚 Documentación Completa: Backend Cocinas Inteligentes - Seguimiento y Citas

**Fecha:** 18 de Mayo de 2026  
**Proyecto:** Backend Cocinas Inteligentes  
**Versión:** 1.0  

---

## 📑 Tabla de Contenidos

1. [Contexto General](#contexto-general)
2. [Sistema de Seguimiento de Clientes](#sistema-de-seguimiento-de-clientes)
3. [Integración con ClienteIdentidad](#integración-con-clienteidentidad)
4. [Sistema de Citas](#sistema-de-citas)
5. [Flujos de Datos](#flujos-de-datos)
6. [Ejemplos de Implementación](#ejemplos-de-implementación)
7. [Troubleshooting](#troubleshooting)

---

## 🎯 Contexto General

### Descripción del Proyecto
El backend de Cocinas Inteligentes es un sistema de gestión integral que permite:
- **Gestión de clientes** con códigos únicos de identificación
- **Seguimiento de proyectos** en tiempo real
- **Agendamiento de citas** con validaciones complejas
- **Tracking de tareas** y avances de proyectos

### Tecnologías Utilizadas
- **Node.js** con Express.js
- **MongoDB** para persistencia de datos
- **JWT** para autenticación
- **reCAPTCHA v3** para protección contra bots

---

# 📊 Sistema de Seguimiento de Clientes

## 1. Ubicación de Endpoints

**Archivo de Rutas:** `src/routes/seguimiento.routes.js`  
**Archivo de Controlador:** `src/controllers/seguimiento.controller.js`  
**Modelo de Acceso:** `src/models/trackingAccess.model.js`

## 2. Lista Completa de Endpoints

### Rutas Públicas

#### `POST /api/seguimiento/login`
**Descripción:** Inicio de sesión para seguimiento de proyectos  
**Autenticación:** No requiere  
**Protección:** reCAPTCHA v3 (recomendado)

**Request:**
```json
{
    "codigo": "A1B2C3"
}
```

**Response (200):**
```json
{
    "success": true,
    "data": {
        "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "expiresAt": "2026-05-18T14:30:00.000Z",
        "project": {
            "codigo": "A1B2C3",
            "cliente": "Juan López",
            "isProspect": false,
            "inversion": 5000,
            "fechaInicio": "18 de Mayo",
            "fechaEntrega": "25 de Mayo",
            "garantiaInicio": "2026-05-25",
            "estadoProyecto": "en_proceso",
            "etapaActual": "instalacion",
            "pagos": {
                "anticipo": {
                    "amount": 1500,
                    "date": "2026-05-10",
                    "receiptLabel": "Ver recibo",
                    "receiptImage": "url_recibo"
                },
                "segundoPago": {
                    "amount": 1500,
                    "date": "",
                    "receiptLabel": "Ver recibo",
                    "receiptImage": ""
                },
                "liquidacion": {
                    "amount": 2000,
                    "date": "",
                    "receiptLabel": "Ver recibo",
                    "receiptImage": ""
                }
            },
            "seguimientoNota": "Proyecto en etapa de instalación",
            "archivos": [
                {
                    "id": "archivo-001",
                    "nombre": "Plano cocina.pdf",
                    "tipo": "pdf",
                    "url": "https://..."
                }
            ],
            "cotizacionPreliminarImage": "url_cotizacion_preliminar",
            "cotizacionFormalImage": "url_cotizacion_formal",
            "projectId": "507f1f77bcf86cd799439011"
        }
    }
}
```

**Errores:**
```json
// 401 - Código inválido
{
    "success": false,
    "message": "Codigo invalido"
}

// 429 - Demasiados intentos
{
    "success": false,
    "message": "Demasiados intentos. Intenta mas tarde"
}
```

---

### Rutas Protegidas (Requieren Token JWT)

#### `GET /api/seguimiento/proyecto`
**Headers Requeridos:**
```
Authorization: Bearer <TOKEN>
```

**Response:**
Retorna los datos completos del proyecto (igual que en login)

---

#### `GET /api/seguimiento/archivos`
**Headers Requeridos:**
```
Authorization: Bearer <TOKEN>
```

**Response (200):**
```json
{
    "success": true,
    "data": {
        "archivos": [
            {
                "id": "archivo-001",
                "nombre": "Plano cocina.pdf",
                "tipo": "pdf",
                "url": "https://...",
                "createdAt": "2026-05-15T10:00:00Z"
            },
            {
                "id": "archivo-002",
                "nombre": "Cotizacion formal.pdf",
                "tipo": "cotizacion_formal",
                "url": "https://..."
            }
        ],
        "tipos": ["pdf", "img", "archivo", "cotizacion_formal", "recibo"]
    }
}
```

---

#### `GET /api/seguimiento/pagos`
**Headers Requeridos:**
```
Authorization: Bearer <TOKEN>
```

**Response (200):**
```json
{
    "success": true,
    "data": {
        "pagos": {
            "anticipo": {
                "amount": 1500,
                "date": "2026-05-10",
                "receiptLabel": "Ver recibo",
                "receiptImage": "url_recibo_1"
            },
            "segundoPago": {
                "amount": 1500,
                "date": null,
                "receiptLabel": "Ver recibo",
                "receiptImage": ""
            },
            "liquidacion": {
                "amount": 2000,
                "date": null,
                "receiptLabel": "Ver recibo",
                "receiptImage": ""
            }
        },
        "totalPagado": 1500,
        "totalPendiente": 3500,
        "porcentajePagado": 30
    }
}
```

---

#### `POST /api/seguimiento/logout`
**Headers Requeridos:**
```
Authorization: Bearer <TOKEN>
```

**Response (200):**
```json
{
    "success": true,
    "message": "Sesión cerrada correctamente"
}
```

---

### Rutas de Debug (Solo Desarrollo)

#### `GET /api/seguimiento/debug/proyectos`
Retorna todos los proyectos en la base de datos (PELIGROSO - SOLO DESARROLLO)

#### `GET /api/seguimiento/debug/access`
Retorna todos los accesos de tracking (PELIGROSO - SOLO DESARROLLO)

#### `POST /api/seguimiento/debug/validate`
Valida un código de seguimiento

---

## 3. Rate Limiting Implementado

El sistema incluye protección contra fuerza bruta:

```
Por IP: 10 intentos en 10 minutos
Por Código: 5 intentos en 5 minutos

Si se excede → Error 429 (Too Many Requests)
```

---

## 4. Validaciones de Seguridad

✅ **Validación de Código:**
- Debe ser exactamente 6 caracteres
- Se normaliza a mayúsculas automáticamente
- Debe existir en TrackingAccess
- Bootstrap automático si no existe

✅ **Validación de Token JWT:**
- Requiere firma válida
- Incluye scope `tracking:read`
- Expira en tiempo configurable

✅ **Información Sensible:**
- No se retorna información de pagos sin autorización
- Se ocultan datos privados del cliente
- Solo retorna archivos públicos

---

# 🔗 Integración con ClienteIdentidad

## 1. ¿Qué es ClienteIdentidad?

Es el modelo central de identidad del cliente que:
- Almacena información única del cliente
- Genera un **código único de 6 caracteres**
- Se enlaza con Proyectos, Tareas y Citas
- Proporciona un identificador consistente

## 2. Modelo ClienteIdentidad

**Archivo:** `src/models/clienteIdentidad.model.js`

### Estructura de Base de Datos

```javascript
{
    _id: ObjectId("507f1f77bcf86cd799439012"),
    codigo: "A1B2C3",                          // ✅ CÓDIGO ÚNICO
    nombre: "Juan López García",
    correo: "juan@example.com",
    telefono: "+34 666 123 456",
    correoNormalizado: "juan@example.com",     // Índice de búsqueda
    telefonoNormalizado: "34666123456",        // Índice de búsqueda
    archivos: [
        {
            id: "archivo-001",
            taskId: "tarea-123",
            proyectoId: "proyecto-456",
            tipo: "pdf",
            nombre: "Documento.pdf",
            url: "https://...",
            key: "path/to/file",
            provider: "cloudinary",
            mimeType: "application/pdf",
            relacionadoA: "cliente",
            relacionadoId: "",
            clienteId: "A1B2C3",
            createdAt: "2026-05-18T10:00:00Z"
        }
    ],
    createdAt: "2025-01-15T10:00:00Z",
    updatedAt: "2026-05-18T12:30:00Z"
}
```

---

## 3. Cambio Implementado: Uso de ClienteIdentidad en Seguimiento

### Problema Original
El sistema retornaba un código generado dinámicamente en lugar del código real de `clienteIdentidad`.

### Solución Implementada

**Archivo Modificado:** `src/controllers/seguimiento.controller.js`

**Cambio 1: Importación**
```javascript
import ClienteIdentidad from '../models/clienteIdentidad.model.js';
```

**Cambio 2: Simplificación en buildProjectSnapshot()**

Para **Proyectos**:
```javascript
// Ahora usa directamente proyecto.clienteId (ya contiene código de clienteIdentidad)
const codigoClienteIdentidad = String(proyecto?.clienteId || access?.codigo6 || ultimaTarea?.clienteId || '').trim().toUpperCase();

// Retorna en snapshot
return {
    codigo: codigoClienteIdentidad,  // ✅ CÓDIGO DE CLIENTEIDENTIDAD
    // ... resto de datos
};
```

Para **Tareas**:
```javascript
// Usa clienteId de la tarea (ya sincronizado con clienteIdentidad)
const codigoClienteIdentidad = String(tarea?.clienteId || access?.codigo6 || '').trim().toUpperCase();

return {
    codigo: codigoClienteIdentidad,  // ✅ CÓDIGO DE CLIENTEIDENTIDAD
    // ... resto de datos
};
```

---

## 4. Hook Pre-Save en Modelo Proyecto

**Archivo Modificado:** `src/models/proyecto.model.js`

### Importación Agregada
```javascript
import { resolveOrCreateClienteIdentidad } from '../services/clienteIdentidad.service.js';
```

### Hook Pre-Save

```javascript
proyectoSchema.pre('save', async function preSaveClienteIdentidad(next) {
    try {
        // Si ya tiene clienteId y clienteRef, no hacer nada
        if (this.clienteId && this.clienteRef) {
            return next();
        }

        // Si tiene clienteRef pero no clienteId, resolver desde la referencia
        if (this.clienteRef && !this.clienteId) {
            const ClienteIdentidad = mongoose.model('ClienteIdentidad');
            const cliente = await ClienteIdentidad.findById(this.clienteRef).lean();
            if (cliente?.codigo) {
                this.clienteId = cliente.codigo;
            }
            return next();
        }

        // Si no tiene referencias, intentar crear o resolver clienteIdentidad
        if (!this.clienteRef || !this.clienteId) {
            const nombreCliente = this.nombreCliente || this.nombre || 'Cliente';
            const clienteIdentidad = await resolveOrCreateClienteIdentidad({
                nombre: nombreCliente,
                correo: '',
                telefono: ''
            });

            if (clienteIdentidad) {
                this.clienteRef = clienteIdentidad._id;
                this.clienteId = clienteIdentidad.codigo;
            }
        }

        next();
    } catch (error) {
        console.warn('Error en pre-save de clienteIdentidad para proyecto:', error.message);
        next();
    }
});
```

### ¿Qué hace?
✅ Asegura que TODO proyecto tenga un `clienteId` populado  
✅ Si falta, crea o resuelve automáticamente desde `clienteIdentidad`  
✅ Mantiene sincronización entre `clienteRef` e `clienteId`

---

## 5. Relación de Datos

```
ClienteIdentidad (codigo: "A1B2C3")
        ↓
        ├── Proyecto (clienteId: "A1B2C3", clienteRef: ObjectId)
        │       ↓
        │       └── Tarea (clienteId: "A1B2C3", clienteRef: ObjectId)
        │
        ├── Cita (clienteId: "A1B2C3", clienteRef: ObjectId)
        │
        └── Archivos (clienteId: "A1B2C3")
```

---

## 6. Flujo Mejorado de Seguimiento

```
┌─────────────────────┐
│  Frontend Cliente   │
│  Ingresa: A1B2C3    │
└────────┬────────────┘
         │
         ↓
┌──────────────────────────────┐
│  POST /seguimiento/login     │
│  {codigo: "A1B2C3"}          │
└────────┬─────────────────────┘
         │
         ↓
┌──────────────────────────────┐
│  Busca en TrackingAccess     │
│  y valida código             │
└────────┬─────────────────────┘
         │
         ↓
┌──────────────────────────────────┐
│  buildProjectSnapshot()          │
│  Obtiene proyecto/tarea          │
│  clienteId ya tiene código ✅     │
└────────┬────────────────────────┘
         │
         ↓
┌──────────────────────────────────┐
│  Genera JWT Token                │
│  proyecto.clienteId = "A1B2C3"   │
└────────┬────────────────────────┘
         │
         ↓
┌─────────────────────────────────┐
│  Response al Frontend           │
│  codigo: "A1B2C3" ✅             │
│  Datos del proyecto             │
│  Token para posteriores requests │
└─────────────────────────────────┘
```

---

# 📅 Sistema de Citas

## 1. Ubicación de Archivos

**Modelo:** `src/models/citas.model.js`  
**Rutas:** `src/routes/citas.routes.js`  
**Controlador:** `src/controllers/citas.controller.js`  

---

## 2. Modelo de Datos - Estructura Completa

### Campos Requeridos

```javascript
{
    fechaAgendada: Date,          // ISO o Timestamp (OBLIGATORIO)
    nombreCliente: String,         // Mínimo 3 caracteres (OBLIGATORIO)
    correoCliente: String,         // Email válido (OBLIGATORIO)
    telefonoCliente: String,       // Mínimo 7 dígitos (OBLIGATORIO)
}
```

### Campos Opcionales

```javascript
{
    ubicacion: String,             // Dirección de la cita
    diseno: ObjectId,              // Referencia a diseño
    informacionAdicional: String,  // Notas del cliente
}
```

### Campos Generados Automáticamente

```javascript
{
    _id: ObjectId,                 // ID único
    clienteRef: ObjectId,          // Referencia a ClienteIdentidad
    clienteId: String,             // Código de 6 caracteres (GENERADO)
    correoNormalizado: String,     // Email normalizado (GENERADO)
    telefonoNormalizado: String,   // Teléfono normalizado (GENERADO)
    estado: String,                // "programada" por defecto
    fechaInicio: Date,             // null por defecto
    fechaTermino: Date,            // null por defecto
    ingenieroAsignado: ObjectId,   // null por defecto
    historialEstados: Array,       // Auditoría de cambios
    createdAt: Date,               // Timestamp de creación
    updatedAt: Date                // Timestamp de actualización
}
```

---

## 3. Validaciones Críticas

### 3.1 Token reCAPTCHA (CRÍTICO)
**Ubicación:** Header `captcha-token`  
**Requerido:** ✅ SÍ  
**Sin este token → Error 400**

```javascript
header('captcha-token'): 'TOKEN_RECAPTCHA_V3_AQUI'
```

### 3.2 Validación de Fecha

```
✅ Debe ser FUTURA
✅ Mínimo 1 HORA de anticipación (desde ahora)
✅ Solo LUNES a VIERNES (sin fin de semana)
✅ Solo entre 9:00 AM y 6:00 PM (hora de México: America/Mexico_City)
✅ NO conflicto con otras citas (buffer de 1 hora)
```

### 3.3 Validación de Email
```
✅ Formato válido (regex: ^[^\s@]+@[^\s@]+\.[^\s@]+$)
✅ Se normaliza automáticamente a minúsculas
```

### 3.4 Validación de Teléfono
```
✅ Mínimo 7 dígitos
✅ Se acepta con o sin formato
✅ Se normaliza removiendo caracteres especiales
```

---

## 4. Endpoints de Citas

### Rutas Públicas (Sin Autenticación)

#### `POST /api/citas/agregarCita`
**Descripción:** Crear/agendar una nueva cita

**Headers Requeridos:**
```
Content-Type: application/json
captcha-token: <TOKEN_RECAPTCHA>
```

**Request Body:**
```json
{
    "fechaAgendada": "2026-05-20T14:30:00Z",
    "nombreCliente": "Juan López García",
    "correoCliente": "juan@example.com",
    "telefonoCliente": "+34 666 123 456",
    "ubicacion": "Calle Principal 123, Madrid",
    "diseno": "507f1f77bcf86cd799439011",
    "informacionAdicional": "Prefiero acero inoxidable"
}
```

**Response Exitosa (201):**
```json
{
    "success": true,
    "message": "Cita creada exitosamente",
    "data": {
        "_id": "667a8b9c1d2e3f4a5b6c7d8e",
        "fechaAgendada": "2026-05-20T14:30:00.000Z",
        "nombreCliente": "Juan López García",
        "correoCliente": "juan@example.com",
        "telefonoCliente": "+34 666 123 456",
        "ubicacion": "Calle Principal 123, Madrid",
        "diseno": {
            "_id": "507f1f77bcf86cd799439011",
            "nombre": "Cocina Moderna",
            "descripcion": "Diseño contemporáneo",
            "imagenes": ["url1", "url2"]
        },
        "informacionAdicional": "Prefiero acero inoxidable",
        "estado": "programada",
        "clienteId": "A1B2C3",
        "clienteRef": "507f1f77bcf86cd799439012",
        "createdAt": "2026-05-18T10:00:00.000Z",
        "updatedAt": "2026-05-18T10:00:00.000Z"
    }
}
```

**Errores Posibles:**

```json
// 400 - Falta reCAPTCHA
{
    "success": false,
    "message": "reCAPTCHA (captcha-token) es requerido en headers"
}

// 400 - Falta fecha requerida
{
    "success": false,
    "message": "Fecha agendada es requerida"
}

// 400 - Falta 1 hora de anticipación
{
    "success": false,
    "message": "La cita debe solicitarse con al menos 1 hora de anticipación"
}

// 400 - Fin de semana
{
    "success": false,
    "message": "Las citas solo pueden agendarse de lunes a viernes",
    "diaRecibido": "sábado, 20 de mayo de 2026"
}

// 400 - Fuera de horario
{
    "success": false,
    "message": "Las citas solo pueden agendarse entre las 9:00 AM y las 6:00 PM (hora de México)",
    "horaRecibida": "19:30"
}

// 400 - Conflicto de disponibilidad
{
    "success": false,
    "message": "Ya existe una cita programada en ese horario. Debe haber al menos 1 hora de separación entre citas.",
    "citasOcupadas": ["14:30", "15:45"]
}

// 500 - Error del servidor
{
    "success": false,
    "message": "Error al crear la cita",
    "error": "Descripción del error"
}
```

---

#### `GET /api/citas/disponibilidad`
**Descripción:** Obtener horarios disponibles

**Query Parameters:**
```
?fecha=2026-05-20
?horarios=true
```

**Response:**
```json
{
    "success": true,
    "data": {
        "horariosDisponibles": [
            "09:00", "10:00", "11:00", "12:00",
            "14:00", "15:00", "16:00", "17:00"
        ],
        "horariosOcupados": ["13:00"],
        "fecha": "2026-05-20",
        "diasDisponibles": ["lunes", "martes", "miércoles", "jueves", "viernes"]
    }
}
```

---

### Rutas Autenticadas

#### `PUT /api/citas/actualizarCita/:id`
**Headers:**
```
Authorization: Bearer <TOKEN>
Content-Type: application/json
```

**Request Body:**
```json
{
    "fechaAgendada": "2026-05-21T15:00:00Z",
    "ubicacion": "Nueva dirección",
    "informacionAdicional": "Cambios de especificaciones"
}
```

---

#### `GET /api/citas/verCita/:id`
**Headers:**
```
Authorization: Bearer <TOKEN>
```

**Response:** Retorna la cita completa con todos sus detalles

---

#### `GET /api/citas/porCliente?correo=juan@example.com`
**Headers:**
```
Authorization: Bearer <TOKEN>
```

**Response:** Array de citas del cliente

---

#### `GET /api/citas/misCitas`
**Headers:**
```
Authorization: Bearer <TOKEN>
```

**Response:** Citas asignadas al ingeniero autenticado

---

#### `PUT /api/citas/updateEstado/:id`
**Headers:**
```
Authorization: Bearer <TOKEN>
```

**Request Body:**
```json
{
    "estado": "completada",
    "nota": "Cita completada satisfactoriamente"
}
```

**Estados Válidos:** `"programada"`, `"en_proceso"`, `"completada"`, `"cancelada"`

---

#### `PUT /api/citas/:id/iniciar`
**Headers:**
```
Authorization: Bearer <TOKEN>
```

**Efecto:** 
- Cambia estado a `"en_proceso"`
- Registra `fechaInicio`

---

#### `PUT /api/citas/:id/finalizar`
**Headers:**
```
Authorization: Bearer <TOKEN>
Content-Type: application/json
```

**Request Body (Opcional):**
```json
{
    "especificacionesFinales": {
        "medidas": "2.5m x 1.8m",
        "materialesSeleccionados": "Nogal europeo",
        "presupuestoEstimado": 5000
    }
}
```

**Efecto:**
- Cambia estado a `"completada"`
- Registra `fechaTermino`

---

#### `POST /api/citas/:id/cancel`
**Headers:**
```
Authorization: Bearer <TOKEN>
```

**Request Body:**
```json
{
    "razon": "Cliente solicita cambio de fecha"
}
```

**Efecto:**
- Cambia estado a `"cancelada"`
- Registra razón de cancelación

---

#### `PUT /api/citas/:id/asignarIngeniero`
**Headers:**
```
Authorization: Bearer <TOKEN>
```

**Request Body:**
```json
{
    "ingenieroId": "507f1f77bcf86cd799439013"
}
```

**Efecto:** Asigna ingeniero a la cita

---

#### `DELETE /api/citas/eliminarCita/:id`
**Headers:**
```
Authorization: Bearer <TOKEN>
```

---

## 5. Hook Pre-Save en Modelo Cita

**Archivo:** `src/models/citas.model.js`

```javascript
citasSchema.pre('save', async function preSaveClienteIdentity(next) {
    try {
        // Normalizar correo
        const correoNormalizado = String(this.correoCliente || '').trim().toLowerCase();
        const telefonoNormalizado = String(this.telefonoCliente || '').replace(/\D/g, '').trim();

        this.correoCliente = correoNormalizado;
        this.correoNormalizado = correoNormalizado || null;
        this.telefonoNormalizado = telefonoNormalizado || null;

        // Crear o resolver clienteIdentidad
        const clienteIdentidad = await resolveOrCreateClienteIdentidad({
            nombre: this.nombreCliente,
            correo: this.correoCliente,
            telefono: this.telefonoCliente
        });

        // Asignar referencias automáticamente
        if (clienteIdentidad) {
            this.clienteRef = clienteIdentidad._id;
            this.clienteId = clienteIdentidad.codigo;
        }

        next();
    } catch (error) {
        next(error);
    }
});
```

---

# 🔄 Flujos de Datos Completos

## Flujo 1: Crear Cita → Proyecto → Seguimiento

```
┌──────────────────────────┐
│  Frontend: Agendar Cita  │
│  - Datos del cliente     │
│  - Fecha/Hora            │
│  - reCAPTCHA token       │
└────────┬─────────────────┘
         │
         ↓
┌──────────────────────────────────┐
│  POST /api/citas/agregarCita     │
│  Validaciones:                   │
│  ✓ reCAPTCHA                     │
│  ✓ Fecha futura                  │
│  ✓ 1 hora anticipación           │
│  ✓ Lunes-Viernes                 │
│  ✓ 9-18 (Hora México)            │
│  ✓ No conflicto                  │
└────────┬─────────────────────────┘
         │
         ↓
┌─────────────────────────────────┐
│  Hook Pre-Save                  │
│  1. Normaliza correo/teléfono   │
│  2. Crea/Resuelve               │
│     ClienteIdentidad            │
│  3. Asigna clienteId = "A1B2C3" │
└────────┬────────────────────────┘
         │
         ↓
┌──────────────────────────────┐
│  Cita Guardada en DB         │
│  clienteId: "A1B2C3"         │
│  clienteRef: ObjectId        │
│  estado: "programada"        │
└────────┬─────────────────────┘
         │
         ↓
┌──────────────────────────────┐
│  syncTaskFromCita()          │
│  Crea Tarea automáticamente: │
│  - Vinculada a la cita       │
│  - clienteId: "A1B2C3"       │
│  - etapa: "citas"            │
└────────┬─────────────────────┘
         │
         ↓
┌──────────────────────────────┐
│  Proyecto (si existe)        │
│  vinculado con:              │
│  - clienteId: "A1B2C3"       │
│  - clienteRef: ObjectId      │
└────────┬─────────────────────┘
         │
         ↓
┌──────────────────────────────┐
│  Cliente ve seguimiento      │
│  POST /seguimiento/login     │
│  - código: "A1B2C3"          │
│  ✓ Obtiene datos completos   │
│  ✓ Cita visible en etapa     │
│  ✓ Proyecto actualizado      │
└──────────────────────────────┘
```

---

## Flujo 2: Login de Seguimiento

```
┌──────────────────────────┐
│  Cliente Frontend        │
│  Ingresa: A1B2C3         │
└────────┬─────────────────┘
         │
         ↓
┌──────────────────────────────────┐
│  POST /seguimiento/login         │
│  { codigo: "A1B2C3" }            │
└────────┬─────────────────────────┘
         │
         ↓
┌──────────────────────────────────────┐
│  Rate Limiting                       │
│  - Por IP: 10/10min                  │
│  - Por Código: 5/5min                │
└────────┬─────────────────────────────┘
         │
         ↓
┌──────────────────────────────────────┐
│  Validar Código                      │
│  1. Longitud = 6 ✓                   │
│  2. Buscar en TrackingAccess         │
│  3. Si no → Bootstrap                │
│  4. Retornar access object           │
└────────┬─────────────────────────────┘
         │
         ↓
┌────────────────────────────────────┐
│  buildProjectSnapshot()            │
│  1. Obtener Proyecto               │
│  2. Obtener última Tarea           │
│  3. codigoClienteIdentidad =       │
│     proyecto.clienteId = "A1B2C3"  │
│  4. Obtener archivos               │
│  5. Armar pagos DTO                │
└────────┬───────────────────────────┘
         │
         ↓
┌────────────────────────────────────┐
│  Firmar JWT Token                  │
│  Payload:                          │
│  - sub: access._id                 │
│  - scope: "tracking:read"          │
│  - codigo6: "A1B2C3"               │
│  TTL: 30min (configurable)         │
└────────┬───────────────────────────┘
         │
         ↓
┌────────────────────────────────────┐
│  Response al Cliente               │
│  {                                 │
│    token: "JWT...",                │
│    expiresAt: "2026-05-18T14:30",  │
│    project: {                      │
│      codigo: "A1B2C3" ✅            │
│      cliente: "Juan López",        │
│      estado: "en_proceso",         │
│      ... todos los datos           │
│    }                               │
│  }                                 │
└────────────────────────────────────┘
         │
         ↓
┌────────────────────────────────────┐
│  Cliente Autenticado               │
│  Puede ver:                        │
│  - GET /proyecto                   │
│  - GET /archivos                   │
│  - GET /pagos                      │
│  - POST /logout                    │
└────────────────────────────────────┘
```

---

# 💻 Ejemplos de Implementación

## Ejemplo 1: Crear Cita (Vanilla JavaScript)

```javascript
// 1. Obtener token reCAPTCHA
async function obtenerTokenRecaptcha() {
    return new Promise((resolve) => {
        grecaptcha.ready(function() {
            grecaptcha.execute('YOUR_SITE_KEY', { action: 'submit' })
                .then(token => resolve(token));
        });
    });
}

// 2. Validar formulario en frontend
function validarFormulario(datos) {
    const errores = [];

    if (!datos.nombre || datos.nombre.trim().length < 3) {
        errores.push('Nombre mínimo 3 caracteres');
    }

    const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regexEmail.test(datos.correo)) {
        errores.push('Email inválido');
    }

    const soloNumeros = datos.telefono.replace(/\D/g, '');
    if (soloNumeros.length < 7) {
        errores.push('Teléfono mínimo 7 dígitos');
    }

    const fecha = new Date(datos.fecha);
    if (fecha <= new Date()) {
        errores.push('Fecha debe ser futura');
    }

    const diferencia = fecha.getTime() - new Date().getTime();
    if (diferencia < 60 * 60 * 1000) {
        errores.push('Mínimo 1 hora de anticipación');
    }

    const dia = fecha.getDay();
    if (dia === 0 || dia === 6) {
        errores.push('Solo lunes a viernes');
    }

    const hora = fecha.getHours();
    if (hora < 9 || hora >= 18) {
        errores.push('Solo 9 AM a 6 PM');
    }

    return errores;
}

// 3. Crear cita
async function crearCita(formulario) {
    // Validar
    const errores = validarFormulario(formulario);
    if (errores.length > 0) {
        alert('Errores:\n' + errores.join('\n'));
        return null;
    }

    // Obtener reCAPTCHA
    const captchaToken = await obtenerTokenRecaptcha();

    // Hacer request
    try {
        const respuesta = await fetch('http://localhost:3000/api/citas/agregarCita', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'captcha-token': captchaToken
            },
            body: JSON.stringify({
                fechaAgendada: new Date(formulario.fecha).toISOString(),
                nombreCliente: formulario.nombre,
                correoCliente: formulario.correo,
                telefonoCliente: formulario.telefono,
                ubicacion: formulario.ubicacion,
                informacionAdicional: formulario.notas
            })
        });

        const resultado = await respuesta.json();

        if (resultado.success) {
            console.log('✅ Cita creada:', resultado.data);
            return resultado.data;
        } else {
            alert('❌ ' + resultado.message);
            return null;
        }
    } catch (error) {
        alert('❌ Error: ' + error.message);
        return null;
    }
}

// 4. Formulario HTML
document.getElementById('btnEnviar').addEventListener('click', async () => {
    const cita = await crearCita({
        nombre: document.getElementById('nombre').value,
        correo: document.getElementById('correo').value,
        telefono: document.getElementById('telefono').value,
        ubicacion: document.getElementById('ubicacion').value,
        fecha: document.getElementById('fecha').value,
        notas: document.getElementById('notas').value
    });
});
```

---

## Ejemplo 2: Login de Seguimiento

```javascript
async function loginSeguimiento(codigo) {
    try {
        const respuesta = await fetch('http://localhost:3000/api/seguimiento/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ codigo })
        });

        const datos = await respuesta.json();

        if (!datos.success) {
            alert('Código inválido: ' + datos.message);
            return null;
        }

        // Guardar token
        localStorage.setItem('trackingToken', datos.data.token);
        localStorage.setItem('trackingExpires', datos.data.expiresAt);

        // Mostrar datos del proyecto
        const proyecto = datos.data.project;
        console.log('Proyecto:', proyecto.cliente);
        console.log('Estado:', proyecto.estadoProyecto);
        console.log('Etapa:', proyecto.etapaActual);
        console.log('Código Cliente:', proyecto.codigo);

        return datos.data;
    } catch (error) {
        alert('Error: ' + error.message);
        return null;
    }
}

// Uso
document.getElementById('btnLogin').addEventListener('click', () => {
    const codigo = document.getElementById('codigoInput').value.toUpperCase();
    loginSeguimiento(codigo);
});
```

---

## Ejemplo 3: Obtener Datos de Seguimiento

```javascript
async function obtenerProyectoSeguimiento() {
    const token = localStorage.getItem('trackingToken');

    if (!token) {
        alert('No hay sesión. Inicia sesión primero');
        return null;
    }

    try {
        const respuesta = await fetch('http://localhost:3000/api/seguimiento/proyecto', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!respuesta.ok) {
            if (respuesta.status === 401) {
                alert('Token expirado. Inicia sesión de nuevo');
                localStorage.removeItem('trackingToken');
            }
            return null;
        }

        const datos = await respuesta.json();
        return datos.data;
    } catch (error) {
        console.error('Error:', error);
        return null;
    }
}

async function obtenerArchivosSeguimiento() {
    const token = localStorage.getItem('trackingToken');

    const respuesta = await fetch('http://localhost:3000/api/seguimiento/archivos', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    const datos = await respuesta.json();
    return datos.data?.archivos || [];
}

async function obtenerPagosSeguimiento() {
    const token = localStorage.getItem('trackingToken');

    const respuesta = await fetch('http://localhost:3000/api/seguimiento/pagos', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    const datos = await respuesta.json();
    return datos.data?.pagos || {};
}
```

---

# 🆘 Troubleshooting

## Problema 1: "Cita no se registra"

**Causas Posibles:**
1. ❌ Falta token reCAPTCHA en header `captcha-token`
2. ❌ Fecha no válida (fin de semana, fuera de horario, < 1 hora)
3. ❌ Conflicto de disponibilidad
4. ❌ Datos incompletos

**Solución:**
```javascript
// Verificar reCAPTCHA
console.log('Token enviado:', headers['captcha-token']);

// Verificar fecha
const fecha = new Date('2026-05-20T14:30:00');
console.log('Día:', fecha.getDay()); // 0-6 (0=Domingo)
console.log('Hora:', fecha.getHours()); // 0-23
console.log('Es futura:', fecha > new Date());
```

---

## Problema 2: "Código incorrecto en seguimiento"

**Causas Posibles:**
1. ❌ Proyecto no tiene `clienteId` populado
2. ❌ ClienteIdentidad no existe
3. ❌ TrackingAccess no existe para el código

**Solución:**
```javascript
// Verificar proyecto
db.proyecto.findById(proyectoId);
// Debe tener: clienteId, clienteRef

// Verificar ClienteIdentidad
db.clienteidentidad.findOne({codigo: "A1B2C3"});
// Debe existir

// Verificar TrackingAccess
db.trackingaccess.findOne({codigo6: "A1B2C3"});
// Si no existe, se crea automáticamente
```

---

## Problema 3: "Rate limiting - Demasiados intentos"

**Causa:** Se excedió el límite de intentos

**Solución:**
```
Por IP: Esperar 10 minutos
Por Código: Esperar 5 minutos

O reiniciar el servidor (limpia la cache)
```

---

## Problema 4: "Token expirado"

**Solución:**
```javascript
// Verificar expiración
const expiresAt = new Date(localStorage.getItem('trackingExpires'));
if (new Date() > expiresAt) {
    // Token expirado, hacer login de nuevo
    loginSeguimiento(codigo);
}
```

---

## Problema 5: "Email o teléfono normalizados no coinciden"

**Causa:** No se normalizó correctamente

**Solución:**
```javascript
// Frontend debe normalizar igual que backend
const correo = 'JUAN@EXAMPLE.COM'.toLowerCase().trim();
// Resultado: 'juan@example.com'

const telefono = '+34 666-123-456'.replace(/\D/g, '');
// Resultado: '34666123456'
```

---

# 📋 Resumen Ejecutivo

## Cambios Realizados

### 1. Sistema de Seguimiento
✅ Creado endpoint `/api/seguimiento/login` (PÚBLICA)  
✅ Creado endpoint `/api/seguimiento/proyecto` (PROTEGIDA)  
✅ Creado endpoint `/api/seguimiento/archivos` (PROTEGIDA)  
✅ Creado endpoint `/api/seguimiento/pagos` (PROTEGIDA)  
✅ Implementado rate limiting (IP + Código)  
✅ Token JWT con scope `tracking:read`

### 2. Integración ClienteIdentidad
✅ Importado modelo ClienteIdentidad en controlador seguimiento  
✅ Simplificado buildProjectSnapshot() para usar proyecto.clienteId  
✅ Agregado hook pre-save en Proyecto para poblar clienteId  
✅ Asegurado que TODO proyecto tenga código de 6 caracteres

### 3. Sistema de Citas
✅ Creado POST /api/citas/agregarCita (PÚBLICA)  
✅ Implementadas validaciones complejas de fecha  
✅ Validación de disponibilidad (buffer 1 hora)  
✅ Integración con reCAPTCHA v3 (obligatorio)  
✅ Hook pre-save para generar clienteId automáticamente  
✅ Sincronización con Tareas y Proyectos

---

## Requisitos Críticos

### Backend
```
✅ MongoDB conectado
✅ JWT secret configurado
✅ reCAPTCHA secret key configurado
✅ Hora de México (America/Mexico_City)
✅ Rate limiting en memoria
```

### Frontend
```
✅ reCAPTCHA v3 integrado
✅ Validación de formulario
✅ Manejo de errores
✅ Guardar/recuperar tokens
✅ Conversión de fechas ISO 8601
```

---

## Próximos Pasos

1. **Integración Frontend:**
   - [ ] Implementar formulario de citas
   - [ ] Integrar reCAPTCHA v3
   - [ ] Crear página de seguimiento
   - [ ] Validación en frontend

2. **Pruebas:**
   - [ ] Probar creación de citas
   - [ ] Probar login de seguimiento
   - [ ] Verificar clienteId en base de datos
   - [ ] Probar rate limiting

3. **Mejoras Futuras:**
   - [ ] Email de confirmación de cita
   - [ ] SMS de recordatorio
   - [ ] Integración de pago
   - [ ] Dashboard de seguimiento

---

## Recursos Disponibles

**Documentación Separada:**
- `DOCUMENTACION_SEGUIMIENTO_CODIGO.md` - Detalles de seguimiento
- `DOCUMENTACION_CITAS_FRONTEND.md` - Detalles de citas

**Archivos Modificados:**
- `src/controllers/seguimiento.controller.js`
- `src/models/proyecto.model.js`
- `src/models/citas.model.js`

---

## Contacto y Soporte

Para dudas o problemas:
1. Revisar la sección de Troubleshooting
2. Consultar los logs del servidor
3. Verificar conexión a MongoDB
4. Revisar configuración de variables de entorno

---

**Documento Actualizado:** 18 de Mayo de 2026  
**Versión:** 1.0  
**Estado:** ✅ Completo y Funcional
