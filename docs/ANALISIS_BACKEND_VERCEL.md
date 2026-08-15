# Análisis del backend para despliegue en Vercel

## Objetivo

Validar qué debe exponer el backend para que el frontend funcione correctamente con la arquitectura actual basada en proxy interno de Next.js.

## 1. Variables de entorno esperadas por el frontend

El frontend espera estas variables:

- NEXT_PUBLIC_API_URL
- BACKEND_API_URL
- NEXT_PUBLIC_FILE_UPLOAD_ENDPOINT

### Recomendación

En Vercel define:

```env
NEXT_PUBLIC_API_URL=https://tu-backend.com
BACKEND_API_URL=https://tu-backend.com
NEXT_PUBLIC_FILE_UPLOAD_ENDPOINT=/api/proxy/uploads
```

## 2. Endpoints que debe exponer el backend

### 2.1 Autenticación

Se esperan rutas como:

- POST /api/auth/login
- POST /api/auth/logout
- GET /api/auth/me

También son toleradas por el frontend (si no existe la ruta principal) estas alternativas:

- /api/login
- /api/me
- /api/auth/profile
- /api/user/me

### 2.2 Citas

- PUT /api/citas/:id/iniciar
- PUT /api/citas/:id/finalizar
- PUT /api/citas/:id/asignarIngenieros
- PUT /api/citas/:id/asignarIngeniero
- PUT /api/citas/:id/asignar-ingenieros

### 2.3 Tareas y Kanban

- GET /api/kanban/citas
- GET /api/kanban/disenos
- GET /api/kanban/cotizacion
- GET /api/kanban/contrato
- PUT /api/tareas/:id/etapa
- PUT /api/tareas/:id/asignar-trabajadores
- PATCH /api/tareas/:id

### 2.4 Seguimiento

- POST /api/seguimiento/login
- POST /api/seguimiento/auth
- POST /api/seguimiento/access

### 2.5 Archivos

- GET /api/archivos/cliente/:clienteId
- GET /api/archivos/cliente/:clienteId/tipo/:tipo

### 2.6 Uploads

- POST /api/uploads
- o el endpoint configurado en NEXT_PUBLIC_FILE_UPLOAD_ENDPOINT

## 3. Formato de respuesta esperado

El frontend funciona mejor si el backend responde con un body JSON claro.

### 3.1 Login

Respuesta esperada en formato similar a:

```json
{
  "success": true,
  "message": "Login exitoso",
  "data": {
    "token": "abc123",
    "user": {
      "id": "64f...",
      "nombre": "Juan",
      "correo": "juan@empresa.com",
      "rol": "empleado"
    }
  }
}
```

También se admite:

```json
{
  "success": true,
  "token": "abc123",
  "user": {
    "nombre": "Juan",
    "correo": "juan@empresa.com",
    "rol": "empleado"
  }
}
```

### 3.2 Perfil actual

```json
{
  "success": true,
  "data": {
    "id": "64f...",
    "nombre": "Juan",
    "correo": "juan@empresa.com",
    "rol": "empleado"
  }
}
```

### 3.3 Kanban

El backend puede devolver:

- un array directamente
- o un objeto con una propiedad como data, items, result, results, citas, disenos, cotizacion, contrato

### 3.4 Seguimiento

```json
{
  "success": true,
  "data": {
    "project": {
      "codigo": "K-8821",
      "cliente": "Juan",
      "isProspect": false
    }
  }
}
```

## 4. CORS y preflight

Como el frontend usa un proxy interno de Next.js, el backend debe aceptar peticiones con estas cabeceras:

- Authorization
- Content-Type
- X-Requested-With

Y responder a OPTIONS con:

```http
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET,POST,PUT,PATCH,DELETE,OPTIONS
Access-Control-Allow-Headers: Authorization, Content-Type, X-Requested-With
Access-Control-Allow-Credentials: true
```

## 5. Recomendación de pruebas

Prueba el backend en este orden:

1. POST /api/auth/login
2. GET /api/auth/me
3. GET /api/kanban/citas
4. GET /api/kanban/disenos
5. GET /api/kanban/cotizacion
6. GET /api/kanban/contrato
7. POST /api/seguimiento/login
8. GET /api/archivos/cliente/:id
9. POST /api/uploads

## 6. Qué revisar si sigue fallando

Si luego del deploy el flujo sigue sin funcionar, lo más probable es que el problema sea backend:

- el endpoint no existe con ese nombre
- el método está mal definido
- la respuesta no tiene el formato esperado
- las cabeceras de auth o cookies no se aceptan
- CORS no está bien configurado para preflight

## 7. Resumen corto

Para que este frontend funcione en Vercel, el backend debe:

- exponer endpoints claros
- responder con JSON consistente
- permitir headers de autorización y contenido
- aceptar preflight OPTIONS
- devolver datos de auth, kanban, seguimiento y archivos en un formato razonable
