# Guía de síntesis para replicar la funcionalidad operativa en unificacion_main

## Objetivo

Este documento resume la lógica funcional y la integración con el backend que hacen que la rama funcional del proyecto responda correctamente, para poder replicarla en la rama unificacion_main sin depender del diseño visual.

La idea no es copiar la UI, sino transferir la arquitectura de funcionamiento que permite que el flujo completo funcione en producción y en entorno desplegado.

---

## 1. Resumen ejecutivo

La versión que funciona correctamente hace lo siguiente:

1. Usa una capa de servicios HTTP centralizada para hablar con el backend.
2. Configura correctamente la URL base del backend con variables de entorno.
3. Envía credenciales/autenticación de forma consistente.
4. Maneja errores de red y de autorización de forma controlada.
5. Requiere que el backend acepte el origen del frontend y las cabeceras necesarias para preflight y autenticación.

El problema más importante detectado en la otra rama es que, aunque el frontend no muestra un error visible, la interacción con el backend no termina de funcionar en despliegue porque la conexión no está permitida correctamente por CORS o por la configuración de la URL y credenciales.

---

## 2. Arquitectura funcional que debe replicarse

### 2.1 Frontend

El frontend está montado sobre Next.js y usa una capa de APIs modular por dominio.

Archivos clave:
- [src/lib/axios/axiosConfig.ts](../src/lib/axios/axiosConfig.ts)
- [src/lib/axios/README.md](../src/lib/axios/README.md)
- [src/lib/axios/authApi.ts](../src/lib/axios/authApi.ts)
- [src/lib/axios/citasApi.ts](../src/lib/axios/citasApi.ts)
- [src/lib/axios/tareasApi.ts](../src/lib/axios/tareasApi.ts)
- [src/lib/axios/kanbanApi.ts](../src/lib/axios/kanbanApi.ts)
- [src/lib/axios/levantamientosApi.ts](../src/lib/axios/levantamientosApi.ts)
- [src/lib/axios/uploadsApi.ts](../src/lib/axios/uploadsApi.ts)
- [src/lib/axios/seguimientoApi.ts](../src/lib/axios/seguimientoApi.ts)

### 2.2 Backend

El backend debe exponer endpoints claros para:
- autenticación
- citas
- tareas/kanban
- levantamientos
- uploads
- seguimiento

El frontend necesita que esos endpoints existan con un contrato estable y sin ambigüedades.

---

## 3. Lo que debe quedar igual en la rama destino

### 3.1 Configuración de conexión

El frontend debe leer la URL base del backend desde una variable de entorno:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

En producción:

```env
NEXT_PUBLIC_API_URL=https://tu-backend.com
```

Esto es obligatorio para que el frontend sepa a qué backend apuntar.

### 3.2 Axios centralizado

La instancia de Axios debe:
- apuntar a la base correcta del backend
- enviar `withCredentials: true` si se usan cookies
- incluir `Authorization: Bearer <token>` cuando exista sesión
- gestionar errores 401/403/404/500 de forma consistente
- agregar un timestamp a peticiones GET para evitar caché

El comportamiento base se encuentra en [src/lib/axios/axiosConfig.ts](../src/lib/axios/axiosConfig.ts).

### 3.3 Autenticación

El frontend necesita un flujo claro de autenticación:
- almacenar token o sesión de manera consistente
- anexar token en requests
- limpiar sesión cuando 401 ocurra
- redirigir a login si la sesión ya no es válida

Si el backend usa cookies, entonces la configuración de CORS debe permitir credenciales.

---

## 4. Contratos de backend que deben existir

### 4.1 Autenticación

Endpoints esperados:
- POST `/api/auth/login`
- POST `/api/auth/logout`
- GET `/api/auth/me` o equivalente

El frontend necesita recibir:
- token o datos de usuario
- estado de éxito/error
- mensajes claros

### 4.2 Citas

Endpoints esperados:
- POST `/api/citas/agregarCita`
- GET `/api/citas/disponibilidad`
- GET `/api/citas/verCita/:id`
- PUT `/api/citas/updateEstado/:id`
- PUT `/api/citas/:id/iniciar`
- PUT `/api/citas/:id/finalizar`
- PUT `/api/citas/:id/asignarIngeniero`

El frontend necesita recibir una estructura consistente y que no dependa de errores de CORS o de respuestas mal formadas.

### 4.3 Kanban y tareas

Endpoints esperados:
- GET `/api/kanban/citas`
- GET `/api/kanban/disenos`
- GET `/api/kanban/cotizacion`
- GET `/api/tareas`
- PATCH `/api/tareas/:id`

El backend debe devolver la información necesaria para renderizar el tablero y los detalles operativos.

### 4.4 Levantamiento

Endpoints esperados:
- GET/POST/PUT para configuración y datos de levantamiento
- endpoint de upload si hay archivos o imágenes

La lógica del frontend depende de que los datos lleguen en un formato estable y que los archivos se suban correctamente.

### 4.5 Uploads

Endpoints esperados:
- POST `/api/uploads`
- o endpoint equivalente configurado por `NEXT_PUBLIC_FILE_UPLOAD_ENDPOINT`

La rama funcional usa un layer dedicado para este tema en [src/lib/axios/uploadsApi.ts](../src/lib/axios/uploadsApi.ts).

---

## 5. El problema de despliegue: CORS y credenciales

### 5.1 Síntoma observado

En la rama que no funciona bien desplegada, el frontend no muestra un error visible, pero la integración con el backend falla porque el origen del frontend no está permitido o porque las credenciales no son aceptadas.

### 5.2 Qué debe revisar el backend

El backend debe responder correctamente a:
- `OPTIONS` preflight
- `Access-Control-Allow-Origin` con el dominio del frontend
- `Access-Control-Allow-Credentials: true` si se usan cookies
- `Access-Control-Allow-Headers` con `Authorization`, `Content-Type`, `X-Requested-With`
- `Access-Control-Allow-Methods` con `GET,POST,PUT,PATCH,DELETE,OPTIONS`

### 5.3 Regla práctica

Si el frontend usa `withCredentials: true`, entonces el backend no puede simplemente devolver `*` para el origen. Debe devolver el origen exacto, por ejemplo:

```text
Access-Control-Allow-Origin: https://tu-frontend.com
Access-Control-Allow-Credentials: true
```

Si el frontend corre en local:

```text
Access-Control-Allow-Origin: http://localhost:3000
Access-Control-Allow-Credentials: true
```

---

## 6. Plan de acción para replicar la lógica en unificacion_main

### Fase 1: Replantear la base de conexión

- [ ] Agregar la capa de Axios centralizada
- [ ] Configurar `NEXT_PUBLIC_API_URL`
- [ ] Configurar `NEXT_PUBLIC_FILE_UPLOAD_ENDPOINT` si aplica
- [ ] Asegurar que las peticiones agreguen token o credenciales

### Fase 2: Replantear los flujos clave

- [ ] Autenticación
- [ ] Citas
- [ ] Tareas / Kanban
- [ ] Levantamientos
- [ ] Uploads / archivos
- [ ] Seguimiento

### Fase 3: Ajustar el backend para producción

- [ ] Permitir el origen del frontend en CORS
- [ ] Aceptar preflight correctamente
- [ ] Permitir headers de autorización y contenido
- [ ] Validar respuestas y errores en producción

### Fase 4: Validación funcional

- [ ] Iniciar sesión correctamente
- [ ] Cargar datos del tablero y módulos principales
- [ ] Crear/editar una cita
- [ ] Cargar y guardar levantamiento
- [ ] Subir archivos correctamente
- [ ] Confirmar que el flujo completo funciona en despliegue

---

## 7. Plantilla de documento de implementación para la otra rama

Puedes usar esta estructura para preparar el plan real en la rama destino:

```md
# Plan de implementación: replicar funcionalidad operativa desde la rama funcional

## Objetivo
Recrear la lógica de conexión y funcionamiento del backend en la rama unificacion_main.

## Alcance
- Autenticación
- Citas
- Tareas / Kanban
- Levantamientos
- Uploads
- Seguimiento

## Dependencias
- Variable NEXT_PUBLIC_API_URL
- Backend con CORS configurado
- Endpoints con contrato estable

## Pasos
1. Portar Axios base y servicios por dominio
2. Asegurar token/credenciales
3. Ajustar CORS y preflight
4. Validar flujos críticos
5. Probar en despliegue
```

---

## 8. Recomendación final

No intentes replicar todo el diseño visual primero. Primero replica:

1. la conexión con el backend
2. la autenticación
3. los flujos críticos de negocio
4. la configuración de CORS y despliegue

Si eso queda bien, la rama unificacion_main podrá conservar sus mejoras visuales sin perder la capacidad operativa.
