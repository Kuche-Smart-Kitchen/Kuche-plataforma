# 📋 Documentación: Sistema de Citas - Integración Frontend-Backend

## 🎯 Descripción General
Este documento proporciona toda la información necesaria para que el frontend pueda crear, consultar y gestionar citas con el backend del sistema de Cocinas Inteligentes.

---

## 📊 Modelo de Datos - Estructura de Cita

### **Campos Requeridos** (Obligatorios para crear cita):

| Campo | Tipo | Descripción | Ejemplo |
|-------|------|-------------|---------|
| `fechaAgendada` | ISO Date o Timestamp | Fecha y hora de la cita | `2026-05-20T14:30:00Z` o `1716219000000` |
| `nombreCliente` | String | Nombre completo del cliente | `"Juan López García"` |
| `correoCliente` | String | Email del cliente (se normaliza a minúsculas) | `"juan@example.com"` |
| `telefonoCliente` | String | Teléfono del cliente (se normaliza) | `"+34 666 123 456"` |

### **Campos Opcionales**:

| Campo | Tipo | Descripción | Ejemplo |
|-------|------|-------------|---------|
| `ubicacion` | String | Dirección donde se realizará la cita | `"Calle Principal 123, Madrid"` |
| `diseno` | ObjectId (MongoDB) | ID del diseño a consultar | `"507f1f77bcf86cd799439011"` |
| `informacionAdicional` | String | Notas adicionales del cliente | `"Prefiero acero inoxidable"` |

### **Campos Generados Automáticamente**:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `_id` | ObjectId | ID único de la cita |
| `clienteRef` | ObjectId | Referencia a ClienteIdentidad (se genera automáticamente) |
| `clienteId` | String | Código de 6 caracteres desde ClienteIdentidad (se genera automáticamente) |
| `correoNormalizado` | String | Correo en minúsculas y sin espacios |
| `telefonoNormalizado` | String | Teléfono solo con números |
| `estado` | String | Estado inicial: `"programada"` |
| `fechaInicio` | Date | Se asigna cuando se inicia la cita (null por defecto) |
| `fechaTermino` | Date | Se asigna cuando se finaliza la cita (null por defecto) |
| `createdAt` | Date | Timestamp de creación |
| `updatedAt` | Date | Timestamp de última actualización |

---

## 🔒 Requisitos de Validación

### **1. Validación de reCAPTCHA (CRÍTICO)**
El backend REQUIERE un token de reCAPTCHA v3 en el header `captcha-token`:

```javascript
headers: {
    'captcha-token': 'TOKEN_RECAPTCHA_AQUI'
}
```

**Sin este token, la solicitud será rechazada con error 400.**

### **2. Validación de Fecha**
- ✅ La fecha debe ser **futura**
- ✅ Mínimo **1 hora de anticipación** desde el momento actual (zona horaria México)
- ✅ Solo **lunes a viernes** (sin fin de semana)
- ✅ Solo entre **9:00 AM y 6:00 PM** (hora de México: America/Mexico_City)

### **3. Validación de Disponibilidad**
- ✅ Debe haber **mínimo 1 hora de separación** entre citas
- ✅ Se valida buffer de 1 hora antes y después del horario solicitado

### **4. Validación de Email**
- ✅ Formato válido de correo
- ✅ Se normaliza a minúsculas

### **5. Validación de Teléfono**
- ✅ Se acepta con o sin formato especial
- ✅ Se normaliza removiendo caracteres especiales

---

## 🔌 Endpoints Disponibles

### **1. CREAR CITA (Pública - No requiere autenticación)**
```http
POST /api/citas/agregarCita
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

**Respuesta Exitosa (201):**
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
        "correoNormalizado": "juan@example.com",
        "telefonoNormalizado": "34666123456",
        "createdAt": "2026-05-18T10:00:00.000Z",
        "updatedAt": "2026-05-18T10:00:00.000Z"
    }
}
```

**Respuestas de Error:**
```json
// Error 400: Falta reCAPTCHA
{
    "success": false,
    "message": "reCAPTCHA (captcha-token) es requerido en headers"
}

// Error 400: Fecha no futura
{
    "success": false,
    "message": "La cita debe solicitarse con al menos 1 hora de anticipación"
}

// Error 400: Fin de semana
{
    "success": false,
    "message": "Las citas solo pueden agendarse de lunes a viernes",
    "diaRecibido": "sábado, 20 de mayo de 2026"
}

// Error 400: Fuera de horario
{
    "success": false,
    "message": "Las citas solo pueden agendarse entre las 9:00 AM y las 6:00 PM (hora de México)",
    "horaRecibida": "19:30"
}

// Error 400: Conflicto de disponibilidad
{
    "success": false,
    "message": "Ya existe una cita programada en ese horario. Debe haber al menos 1 hora de separación entre citas.",
    "citasOcupadas": ["14:30", "15:45"]
}
```

---

### **2. OBTENER DISPONIBILIDAD (Pública)**
```http
GET /api/citas/disponibilidad
```

**Query Parameters (Opcionales):**
```
?fecha=2026-05-20  // Formato: YYYY-MM-DD
?horarios=true     // Retorna horarios disponibles
```

**Respuesta Exitosa:**
```json
{
    "success": true,
    "data": {
        "horariosDisponibles": [
            "09:00",
            "10:00",
            "11:00",
            "14:00",
            "15:00",
            "16:00",
            "17:00"
        ],
        "horariosOcupados": [
            "12:00",
            "13:00"
        ]
    }
}
```

---

### **3. ACTUALIZAR CITA (Requiere Autenticación)**
```http
PUT /api/citas/actualizarCita/:id
Authorization: Bearer <TOKEN>
Content-Type: application/json
```

**Request Body:**
```json
{
    "fechaAgendada": "2026-05-21T15:00:00Z",
    "ubicacion": "Nueva dirección",
    "informacionAdicional": "Cambio de especificaciones"
}
```

---

### **4. CONSULTAR CITA POR ID (Requiere Autenticación)**
```http
GET /api/citas/verCita/:id
Authorization: Bearer <TOKEN>
```

---

### **5. OBTENER CITAS DEL CLIENTE (Requiere Autenticación)**
```http
GET /api/citas/porCliente?correo=juan@example.com
Authorization: Bearer <TOKEN>
```

---

### **6. OBTENER CITAS DEL INGENIERO ASIGNADO (Requiere Autenticación)**
```http
GET /api/citas/misCitas
Authorization: Bearer <TOKEN>
```

---

### **7. CAMBIAR ESTADO DE CITA (Requiere Autenticación)**
```http
PUT /api/citas/updateEstado/:id
Authorization: Bearer <TOKEN>
Content-Type: application/json
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

### **8. INICIAR CITA (Requiere Autenticación)**
```http
PUT /api/citas/:id/iniciar
Authorization: Bearer <TOKEN>
```

**Efecto:** Cambia estado a `"en_proceso"` y registra `fechaInicio`

---

### **9. FINALIZAR CITA (Requiere Autenticación)**
```http
PUT /api/citas/:id/finalizar
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

---

### **9. CANCELAR CITA (Requiere Autenticación)**
```http
POST /api/citas/:id/cancel
Authorization: Bearer <TOKEN>
Content-Type: application/json
```

**Request Body:**
```json
{
    "razon": "Cliente solicita cambio de fecha"
}
```

---

### **10. ASIGNAR INGENIERO (Admin Only)**
```http
PUT /api/citas/:id/asignarIngeniero
Authorization: Bearer <TOKEN>
Content-Type: application/json
```

**Request Body:**
```json
{
    "ingenieroId": "507f1f77bcf86cd799439013"
}
```

---

## 💻 Ejemplos de Implementación Frontend

### **JavaScript/Fetch API - Crear Cita**

```javascript
// 1. Obtener token de reCAPTCHA desde Google
async function obtenerTokenRecaptcha() {
    return new Promise((resolve) => {
        grecaptcha.ready(function() {
            grecaptcha.execute('YOUR_RECAPTCHA_SITE_KEY', { action: 'submit' })
                .then(function(token) {
                    resolve(token);
                });
        });
    });
}

// 2. Crear cita
async function crearCita(datosFormulario) {
    try {
        // Obtener token de reCAPTCHA
        const captchaToken = await obtenerTokenRecaptcha();

        // Preparar datos
        const datos = {
            fechaAgendada: new Date(datosFormulario.fecha).toISOString(),
            nombreCliente: datosFormulario.nombre,
            correoCliente: datosFormulario.correo,
            telefonoCliente: datosFormulario.telefono,
            ubicacion: datosFormulario.ubicacion || '',
            diseno: datosFormulario.disenoId || null,
            informacionAdicional: datosFormulario.notas || ''
        };

        // Hacer solicitud
        const respuesta = await fetch('http://localhost:3000/api/citas/agregarCita', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'captcha-token': captchaToken
            },
            body: JSON.stringify(datos)
        });

        const resultado = await respuesta.json();

        if (resultado.success) {
            console.log('✅ Cita creada:', resultado.data);
            alert(`Cita agendada para ${new Date(resultado.data.fechaAgendada).toLocaleString('es-MX')}`);
            return resultado.data;
        } else {
            console.error('❌ Error:', resultado.message);
            alert(`Error: ${resultado.message}`);
            return null;
        }
    } catch (error) {
        console.error('Error al crear cita:', error);
        alert('Error de conexión');
        return null;
    }
}
```

---

### **React - Hook para Crear Cita**

```jsx
import { useState } from 'react';

export function useCitas() {
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState(null);

    const crearCita = async (datosFormulario) => {
        setCargando(true);
        setError(null);

        try {
            // Obtener token de reCAPTCHA
            const captchaToken = await window.grecaptcha.execute(
                process.env.REACT_APP_RECAPTCHA_SITE_KEY,
                { action: 'submit' }
            );

            const respuesta = await fetch(
                `${process.env.REACT_APP_API_URL}/api/citas/agregarCita`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'captcha-token': captchaToken
                    },
                    body: JSON.stringify({
                        fechaAgendada: datosFormulario.fecha,
                        nombreCliente: datosFormulario.nombre,
                        correoCliente: datosFormulario.correo,
                        telefonoCliente: datosFormulario.telefono,
                        ubicacion: datosFormulario.ubicacion,
                        diseno: datosFormulario.disenoId,
                        informacionAdicional: datosFormulario.notas
                    })
                }
            );

            const datos = await respuesta.json();

            if (!datos.success) {
                setError(datos.message);
                return null;
            }

            return datos.data;
        } catch (err) {
            setError(err.message);
            return null;
        } finally {
            setCargando(false);
        }
    };

    return { crearCita, cargando, error };
}

// Uso en componente
function FormularioCita() {
    const { crearCita, cargando, error } = useCitas();

    const handleSubmit = async (e) => {
        e.preventDefault();
        const cita = await crearCita({
            fecha: '2026-05-20T14:30:00Z',
            nombre: 'Juan López',
            correo: 'juan@example.com',
            telefono: '+34 666 123 456',
            ubicacion: 'Calle Principal 123',
            disenoId: null,
            notas: 'Información adicional'
        });

        if (cita) {
            alert('¡Cita agendada exitosamente!');
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            {/* Campos del formulario */}
            <button type="submit" disabled={cargando}>
                {cargando ? 'Agendando...' : 'Agendar Cita'}
            </button>
            {error && <p style={{ color: 'red' }}>{error}</p>}
        </form>
    );
}
```

---

### **HTML/Vanilla JavaScript - Formulario Completo**

```html
<!DOCTYPE html>
<html>
<head>
    <title>Agendar Cita</title>
    <script src="https://www.google.com/recaptcha/api.js" async defer></script>
</head>
<body>
    <h1>Agendar Cita</h1>
    <form id="formularioCita">
        <div>
            <label>Nombre del Cliente:</label>
            <input type="text" id="nombre" required>
        </div>

        <div>
            <label>Email:</label>
            <input type="email" id="correo" required>
        </div>

        <div>
            <label>Teléfono:</label>
            <input type="tel" id="telefono" required>
        </div>

        <div>
            <label>Ubicación:</label>
            <input type="text" id="ubicacion">
        </div>

        <div>
            <label>Fecha y Hora:</label>
            <input type="datetime-local" id="fecha" required>
        </div>

        <div>
            <label>Información Adicional:</label>
            <textarea id="notas"></textarea>
        </div>

        <button type="submit">Agendar Cita</button>
    </form>

    <p id="mensaje"></p>

    <script>
        document.getElementById('formularioCita').addEventListener('submit', async (e) => {
            e.preventDefault();

            // Obtener token de reCAPTCHA
            const captchaToken = await grecaptcha.execute(
                'YOUR_RECAPTCHA_SITE_KEY',
                { action: 'submit' }
            );

            // Convertir fecha local a ISO
            const fechaLocal = document.getElementById('fecha').value;
            const fecha = new Date(fechaLocal).toISOString();

            const datos = {
                fechaAgendada: fecha,
                nombreCliente: document.getElementById('nombre').value,
                correoCliente: document.getElementById('correo').value,
                telefonoCliente: document.getElementById('telefono').value,
                ubicacion: document.getElementById('ubicacion').value,
                informacionAdicional: document.getElementById('notas').value
            };

            try {
                const respuesta = await fetch(
                    'http://localhost:3000/api/citas/agregarCita',
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'captcha-token': captchaToken
                        },
                        body: JSON.stringify(datos)
                    }
                );

                const resultado = await respuesta.json();

                if (resultado.success) {
                    document.getElementById('mensaje').innerHTML = 
                        `✅ Cita agendada para ${new Date(resultado.data.fechaAgendada).toLocaleString('es-MX')}`;
                    document.getElementById('formularioCita').reset();
                } else {
                    document.getElementById('mensaje').innerHTML = 
                        `❌ Error: ${resultado.message}`;
                }
            } catch (error) {
                document.getElementById('mensaje').innerHTML = 
                    `❌ Error de conexión: ${error.message}`;
            }
        });
    </script>
</body>
</html>
```

---

## 🔍 Validación en el Frontend (Antes de Enviar)

Implementar estas validaciones evita errores:

```javascript
function validarFormularioCita(datos) {
    const errores = [];

    // Validar nombre
    if (!datos.nombreCliente || datos.nombreCliente.trim().length < 3) {
        errores.push('El nombre debe tener al menos 3 caracteres');
    }

    // Validar email
    const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regexEmail.test(datos.correoCliente)) {
        errores.push('Email inválido');
    }

    // Validar teléfono (al menos 7 dígitos)
    const soloNumeros = datos.telefonoCliente.replace(/\D/g, '');
    if (soloNumeros.length < 7) {
        errores.push('Teléfono debe tener al menos 7 dígitos');
    }

    // Validar fecha
    const fecha = new Date(datos.fechaAgendada);
    const ahora = new Date();

    // Verificar que sea futura
    if (fecha <= ahora) {
        errores.push('La fecha debe ser futura');
    }

    // Verificar que sea en 1 hora como mínimo
    const diferencia = fecha.getTime() - ahora.getTime();
    const unaHora = 60 * 60 * 1000;
    if (diferencia < unaHora) {
        errores.push('La cita debe ser con al menos 1 hora de anticipación');
    }

    // Verificar que sea lunes-viernes
    const diaSemana = fecha.getDay();
    if (diaSemana === 0 || diaSemana === 6) {
        errores.push('Las citas solo pueden agendarse de lunes a viernes');
    }

    // Verificar horario 9-18
    const hora = fecha.getHours();
    if (hora < 9 || hora >= 18) {
        errores.push('Las citas solo pueden agendarse entre 9:00 AM y 6:00 PM');
    }

    return errores;
}

// Uso
const datos = {
    nombreCliente: 'Juan',
    correoCliente: 'juan@test.com',
    telefonoCliente: '6661234567',
    fechaAgendada: new Date('2026-05-20T14:00:00').toISOString()
};

const errores = validarFormularioCita(datos);
if (errores.length > 0) {
    console.error('Errores de validación:', errores);
} else {
    console.log('✅ Formulario válido');
}
```

---

## 🧪 Pruebas con cURL

### **Crear Cita**
```bash
curl -X POST http://localhost:3000/api/citas/agregarCita \
  -H "Content-Type: application/json" \
  -H "captcha-token: YOUR_RECAPTCHA_TOKEN_HERE" \
  -d '{
    "fechaAgendada": "2026-05-20T14:30:00Z",
    "nombreCliente": "Juan López",
    "correoCliente": "juan@test.com",
    "telefonoCliente": "+34 666 123 456",
    "ubicacion": "Calle Principal 123",
    "informacionAdicional": "Información adicional"
  }'
```

### **Obtener Disponibilidad**
```bash
curl -X GET "http://localhost:3000/api/citas/disponibilidad?fecha=2026-05-20"
```

---

## 🔐 Variables de Entorno Necesarias

**.env (Backend):**
```
RECAPTCHA_SECRET_KEY=your_recaptcha_secret_key
```

**.env (Frontend):**
```
REACT_APP_RECAPTCHA_SITE_KEY=your_recaptcha_site_key
REACT_APP_API_URL=http://localhost:3000
```

---

## 📋 Resumen de Requisitos

✅ **Para crear una cita:**
1. ✓ Token de reCAPTCHA en header `captcha-token`
2. ✓ Nombre completo (mínimo 3 caracteres)
3. ✓ Email válido
4. ✓ Teléfono (mínimo 7 dígitos)
5. ✓ Fecha futura con mínimo 1 hora de anticipación
6. ✓ Solo lunes a viernes
7. ✓ Solo entre 9:00 AM y 6:00 PM (Hora México)
8. ✓ Mínimo 1 hora de separación con otras citas

---

## 🆘 Troubleshooting

| Problema | Solución |
|----------|----------|
| "captcha-token es requerido" | Verificar que reCAPTCHA está correctamente integrado y el token se envía en headers |
| "Fecha agendada debe solicitarse con 1 hora" | Seleccionar una fecha más lejana en el futuro |
| "Citas solo pueden agendarse lunes-viernes" | Validar el día seleccionado (no sábado/domingo) |
| "Citas solo entre 9:00 AM y 6:00 PM" | Cambiar la hora seleccionada |
| "Ya existe una cita programada" | Cambiar a un horario con 1 hora de separación |
| "Email inválido" | Usar formato válido: ejemplo@dominio.com |
| Error 500 | Revisar logs del servidor y la conexión a base de datos |

---

## 📞 Endpoints Relacionados

- **Diseños:** `GET /api/disenos` - Obtener disponibles para asignar a cita
- **Clientes:** `GET /api/clientes` - Información del cliente
- **Tracking:** `GET /api/seguimiento/proyecto` - Ver cita en seguimiento del cliente

---

## ✅ Checklist Implementación

- [ ] reCAPTCHA v3 integrado en el frontend
- [ ] Validaciones en el frontend antes de enviar
- [ ] Header `captcha-token` enviado en POST
- [ ] Manejo de errores mostrado al usuario
- [ ] Formulario limpiado después de envío exitoso
- [ ] Conversión correcta de fechas (ISO 8601)
- [ ] Confirmación visual después de agendar
- [ ] Email de confirmación (si está implementado)
- [ ] Cita aparece en seguimiento del cliente
- [ ] Tarea automática generada desde cita
