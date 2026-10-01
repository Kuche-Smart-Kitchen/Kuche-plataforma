# Contrato Backend: Operaciones, Diseños y Agenda

Este documento define el contrato necesario para conectar el flujo de Operaciones/Kanban con la Agenda. Distingue las rutas que el frontend ya consume de los cambios que el backend debe implementar. Las citas y las visitas son recursos diferentes: no deben compartir identificadores, campos de fecha ni estados.

## 1. Resumen de implementación

| Recurso | Método y ruta | Situación | Uso |
| --- | --- | --- | --- |
| Citas | `GET /api/citas/verCitas` | Existente | Consultar citas tradicionales de Agenda. |
| Visitas | `GET /api/visitas/` | Existente | Consultar visitas. Requiere sesión. |
| Visitas | `POST /api/visitas/agendarVisita` | Existente | Registrar una visita. El frontend prueba `/api/visitas/` como fallback si la ruta devuelve 404/405. |
| Visitas | `GET /api/visitas/disponibilidad?fecha=YYYY-MM-DD` | Existente | Consultar disponibilidad al agendar desde Agenda. Fallback: `/api/visitas/horarios-ocupados`. |
| Visitas | `PATCH /api/visitas/:id` | Existente | Editar datos y programación de una visita. |
| Visitas | `DELETE /api/visitas/:id` | Existente | Eliminar una visita desde Agenda. |
| Visitas | `PATCH /api/visitas/:id/status` | **Nuevo requerido** | Cambiar el estado operativo presencial. |
| Tareas/Kanban | `GET /api/kanban/citas`, `/api/kanban/disenos`, `/api/kanban/cotizacion`, `/api/kanban/contrato` | Existentes | Cargar y refrescar tarjetas para el tablero y validar la tarea vinculada. |
| Archivos de tarea | `POST /api/tareas/:id/archivos` | Existente; agregar/retornar metadata `nivel` | Registrar el archivo final y permitir reconocerlo tras refrescar. |
| Tareas/Kanban | `PATCH /api/tareas/:id` | Existente; ampliar/confirmar campos | Registrar aprobación del cliente y avanzar la tarjeta de Diseños a Cotización. |

No se necesita crear `GET /api/agenda/events` ni `PATCH /api/cards/:id/client-approve-design`. La Agenda combina los GET de citas y visitas; la actualización de la tarjeta reutiliza `/api/tareas/:id`.

## 2. Flujo de extremo a extremo

1. Administración carga y aprueba el diseño. La tarea permanece en la etapa `disenos`.
2. El botón **Agendar visita** crea un recurso Visita asociado a la tarea mediante `tareaId`. Crear la visita **no** cambia `tarea.etapa` ni marca `designApprovedByClient`.
3. Agenda carga citas y visitas por separado. Oculta citas/visitas pasadas e inactivas. Una visita presencial terminada permanece visible mientras el diseño asociado no esté aprobado por el cliente.
4. En el detalle de la visita, el operador registra en orden `pending` → `in_progress` → `completed`.
5. Una vez terminada la visita, el operador puede registrar la aprobación del cliente. Si el botón se pulsa desde Operaciones o Aprobación de Diseños, el frontend localiza la visita por `tareaId`; si está `pending`, la pasa primero a `in_progress` y luego a `completed`; si ya está `in_progress`, solo solicita `completed`; si ya está `completed`, no repite la llamada. Después actualiza la tarea con `PATCH /api/tareas/:id`.
6. La tarea queda en `etapa: "cotizacion"`, conserva `estado: "pendiente"` y `designApprovedByClient: true`. La Agenda la oculta cuando vuelve a cargar; el Kanban refresca la tarjeta en Cotización.

**Importante sobre el actor:** el botón se llama “Aprobar diseño por el cliente”, pero en la pantalla administrativa es un operador quien registra esa decisión. Si se requiere aprobación autenticada directamente por el cliente, debe definirse un flujo y autorización de cliente separados; esta ruta administrativa no constituye evidencia de identidad del cliente.

## 3. Modelo Visita

Los estados de agenda existentes permanecen independientes del estado presencial:

| Campo | Tipo | Requerido | Regla |
| --- | --- | --- | --- |
| `fechaProgramada` | fecha ISO 8601 | Sí | Campo de fecha oficial de Visita. Debe ser futura y respetar la validación de disponibilidad. |
| `nombreCliente` | string | Sí | Nombre del cliente. |
| `correoCliente` | string | Sí | Email válido; normalizar a minúsculas. |
| `telefonoCliente` | string | Sí | Teléfono del cliente. |
| `ubicacion` | string | No | Dirección o ubicación de la visita. |
| `informacionAdicional` | string | No | Descripción/tipo. En el formulario del Kanban se envía `"Presentación de diseño"`; Agenda combina título y tipo en este campo. |
| `estado` | enum | No | Estado de agenda existente: `solicitada` (default), `programada`, `confirmada` o `cancelada`. No representa inicio/término presencial. |
| `tareaId` | ObjectId/string | Condicional | Nuevo vínculo a la tarea Kanban que originó esta visita. Debe apuntar a una tarea existente en etapa `disenos`. |
| `operationalStatus` | enum | Sí en lectura; default al crear | Nuevo estado presencial: `pending`, `in_progress` o `completed`. Default: `pending`. |

No reutilizar `fechaAgendada` (pertenece a Cita), `status` como alias de `estado`, ni los estados de citas (`programada`, `en_proceso`, etc.) para el ciclo presencial. `operationalStatus` es el nombre de campo persistido y `status` solo es el nombre del parámetro del endpoint nuevo.

### Metadata del diseño final

La subida usa Cloudinary y registra el archivo mediante la ruta existente `POST /api/tareas/:id/archivos`. Para los archivos de tipo `diseno`, el frontend manda el campo opcional `nivel`:

```json
{
  "archivos": [
    {
      "nombre": "render-final.pdf",
      "url": "https://res.cloudinary.com/example/render-final.pdf",
      "tipo": "diseno",
      "clienteId": "K-8821",
      "nivel": "final"
    }
  ]
}
```

El backend debe persistir `nivel: "final"` en el archivo asociado a la tarea y devolverlo dentro de `archivos[]` en `GET /api/kanban/disenos` (o en el endpoint Kanban que devuelva esa tarjeta). La UI usa ese dato para ocultar subida de archivo, subida de diseño final y agendamiento, y dejar disponible únicamente la aprobación del cliente. Archivos anteriores registrados sin `nivel` no se pueden clasificar con certeza: deben migrarse o volver a cargarse como finales.

## 4. Crear una visita desde Kanban

### Request

El frontend usa primero `POST /api/visitas/agendarVisita`; si responde 404 o 405, intenta `POST /api/visitas/`.

```http
POST /api/visitas/agendarVisita
Content-Type: application/json
captcha-token: <token Turnstile>
```

```json
{
  "fechaProgramada": "2026-10-15T16:00:00.000Z",
  "nombreCliente": "Cliente de ejemplo",
  "correoCliente": "cliente@ejemplo.com",
  "telefonoCliente": "5551234567",
  "ubicacion": "Dirección de la visita",
  "informacionAdicional": "Presentación de diseño",
  "tareaId": "507f1f77bcf86cd799439011"
}
```

`estado` se omite en esta creación y debe tomar el default vigente (`solicitada`). `operationalStatus` se omite y debe inicializarse en `pending`. El backend debe guardar y devolver ambos campos nuevos (`tareaId`, `operationalStatus`) además de los campos de Visita existentes.

Aplicar en backend al crear **y editar**: `fechaProgramada` futura, `correoCliente` válido y ausencia de otra visita activa (`solicitada`, `programada` o `confirmada`) dentro de ±1 hora. El modal de Kanban consulta antes del POST tanto `GET /api/visitas/disponibilidad?fecha=YYYY-MM-DD` como `GET /api/citas/disponibilidad?fecha=YYYY-MM-DD` y bloquea los horarios ocupados; de todas formas, la validación final debe ser atómica en backend porque otro usuario puede reservar el horario entre la consulta y la creación. Ambos endpoints deben devolver `success`, `fecha` y `horariosOcupados`.

### Autorización del vínculo

El cliente HTTP distingue los dos casos: una visita pública sin `tareaId` omite el bearer token y envía captcha; una visita creada desde una tarjeta incluye `tareaId`, envía captcha y adjunta el bearer token de la sesión. El captcha protege la creación pública, pero **no autoriza** enlazar una tarea interna. El backend debe aplicar autorización condicional:

- Con `tareaId`: exigir bearer token y rol autorizado para Operaciones/Agenda. Mantener captcha si el middleware de creación lo exige, pero no usarlo como autorización.
- Sin `tareaId`: conservar el flujo público existente con captcha.

Si el backend no permite autorización condicional en la ruta actual, acordar antes de cambiar el contrato una ruta interna autenticada dedicada; no aceptar el `tareaId` en la ruta pública.

Validar en backend que la tarea existe, está en `disenos`, tiene `designApprovedByAdmin: true` y pertenece al proyecto/cliente enviado. No aceptar un `tareaId` arbitrario por el solo hecho de que el captcha sea válido.

### Respuesta mínima esperada

Mantener el formato usado por la aplicación (`{ success, message?, data }`) y devolver el identificador creado junto con los campos usados por Agenda:

```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439012",
    "fechaProgramada": "2026-10-15T16:00:00.000Z",
    "nombreCliente": "Cliente de ejemplo",
    "correoCliente": "cliente@ejemplo.com",
    "telefonoCliente": "5551234567",
    "ubicacion": "Dirección de la visita",
    "informacionAdicional": "Presentación de diseño",
    "estado": "solicitada",
    "tareaId": "507f1f77bcf86cd799439011",
    "operationalStatus": "pending"
  }
}
```

## 5. Listar y editar visitas

### Listar

```http
GET /api/visitas/
Authorization: Bearer <token>
```

La lista debe incluir `tareaId`, `estado`, `fechaProgramada` y `operationalStatus` en cada elemento. Roles de lectura documentados para esta ruta: `admin`, `arquitecto`, `empleado`, `empleado_general`, `ingeniero` y `staff`. Agenda cruza `tareaId` con los datos de Kanban para conocer si `designApprovedByClient` ya está activo.

### Editar datos

```http
PATCH /api/visitas/:id
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "fechaProgramada": "2026-10-16T17:00:00.000Z",
  "nombreCliente": "Cliente actualizado",
  "correoCliente": "cliente@ejemplo.com",
  "telefonoCliente": "5551234567",
  "ubicacion": "Nueva dirección",
  "informacionAdicional": "Presentación de diseño"
}
```

La edición no debe borrar ni cambiar `tareaId` u `operationalStatus` si no vienen explícitamente. El frontend no envía actualmente un responsable persistido ni un campo `tipo` independiente; no asumir que esos datos se guardan en la Visita.

### Eliminar

```http
DELETE /api/visitas/:id
Authorization: Bearer <token>
```

Esta ruta ya es invocada por el botón de eliminación del modal de Agenda.

## 6. Nueva ruta: estado operativo presencial

### Request

```http
PATCH /api/visitas/:id/status
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{ "status": "in_progress" }
```

Valores permitidos: `pending`, `in_progress`, `completed`. La ruta persiste el valor en `Visita.operationalStatus` y devuelve `{ "success": true, "data": { "operationalStatus": "in_progress" } }`. El frontend exige `success === true` y el estado actualizado exacto en `data`. No modifica `Visita.estado`, `fechaProgramada` ni la tarea.

### Transiciones

| Estado actual | Nuevo estado | Resultado |
| --- | --- | --- |
| `pending` | `in_progress` | Permitido: comenzar visita. |
| `in_progress` | `completed` | Permitido: terminar visita. |
| mismo estado | mismo estado | Idempotente: devolver éxito, necesario para reintentos de red. |
| `pending` | `completed` | Rechazar con 409; primero se debe comenzar. |
| `completed` | `pending` o `in_progress` | Rechazar con 409; no reabrir con esta ruta. |

Rechazar estados desconocidos con 400, visitas inexistentes con 404, falta de sesión/permisos con 401/403 y transiciones no permitidas con 409. Una visita con `estado: "cancelada"` no debe poder iniciarse ni terminarse. Para cualquier 409, devolver una respuesta JSON con un `message` legible que identifique el conflicto (horario ocupado, visita duplicada para la tarea o transición inválida); el frontend la presenta al operador.

## 7. Aprobar diseño y avanzar la tarea

No se agrega endpoint nuevo para la tarjeta. Tras verificar la visita, el frontend actualiza `PATCH /api/tareas/:id`.

### Request semántico mínimo

```http
PATCH /api/tareas/507f1f77bcf86cd799439011
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "designApprovedByClient": true,
  "etapa": "cotizacion",
  "estado": "pendiente",
  "citaStarted": false,
  "citaFinished": false
}
```

Estos nombres corresponden al payload del backend. El modelo local usa `stage` y `status`, pero el adaptador del frontend los transforma a `etapa` y `estado` antes de enviar. `designApprovedByAdmin` debe seguir verdadero.

El usuario debe autenticarse con bearer token y tener rol `admin`. El backend debe validar que la tarea existe, está en `disenos`, `designApprovedByAdmin` es verdadero, contiene un archivo `archivos[].nivel: "final"` y hay una visita asociada por `tareaId` con `operationalStatus: "completed"`. La actualización debe guardar los cinco campos de manera coherente y devolverlos en `data`. El frontend exige `success === true` y confirma todos los campos antes de actualizar la UI:

```json
{
  "success": true,
  "data": {
    "_id": "ID_TAREA",
    "id": "ID_TAREA",
    "etapa": "cotizacion",
    "estado": "pendiente",
    "designApprovedByAdmin": true,
    "designApprovedByClient": true,
    "citaStarted": false,
    "citaFinished": false
  }
}
```

Si las precondiciones no se cumplen, responder 409 sin modificar la tarea. Sin rol admin responder 403. El endpoint debe aceptar reintentos cuando la visita ya esté `completed`.

La UI ejecuta las escrituras secuenciales descritas arriba. No son una transacción distribuida. Si falla el PATCH de tarea después de completar la visita, reintentar solo la aprobación de tarea; no repetir ni reabrir la visita. Para 409/403, el backend debe devolver un `message` legible; el frontend conserva la tarjeta y presenta ese mensaje. La guía detallada está en [`GUIA_FRONTEND_CONFIRMACION_APROBACION_DISENO.md`](GUIA_FRONTEND_CONFIRMACION_APROBACION_DISENO.md).

## 8. Citas tradicionales y filtros de Agenda

Las citas siguen siendo otra colección y no se convierten en visitas:

| Propiedad | Cita | Visita |
| --- | --- | --- |
| Fecha | `fechaAgendada` | `fechaProgramada` |
| Lista de Agenda | `GET /api/citas/verCitas` (fallbacks documentados) | `GET /api/visitas/` |
| Estado de recurso | `programada`, `en_proceso`, `completada`, `cancelada` | `solicitada`, `programada`, `confirmada`, `cancelada` |
| Ciclo presencial adicional | No se modifica en este flujo | `operationalStatus` |
| Identificador | ID de Cita | ID de Visita; `tareaId` apunta a Kanban |

La UI oculta eventos cuya fecha/hora local ya pasó. Citas inactivas (`completada`, `cancelada`) no se muestran. Visitas canceladas no se muestran; una visita `operationalStatus: "completed"` sigue mostrándose mientras la tarea enlazada no tenga `designApprovedByClient: true`.

No buscar vínculos entre Cita y Visita por coincidencia de email/nombre: la relación del nuevo flujo es explícitamente `Visita.tareaId`.

## 9. Lista de trabajo backend

- [ ] Agregar `tareaId` opcional e indexado a Visita; conservarlo al editar y devolverlo al listar.
- [ ] Agregar `operationalStatus` con default `pending` y enum `pending | in_progress | completed`.
- [ ] En `POST /api/tareas/:id/archivos`, aceptar, persistir y devolver `nivel: "preliminar" | "final"` para los archivos de diseño; incluirlo en las respuestas Kanban.
- [ ] Implementar `PATCH /api/visitas/:id/status` con autenticación, autorización, transiciones e idempotencia descritas arriba.
- [ ] Asegurar que el alta vinculada con `tareaId` requiere autorización interna y valida tarea/etapa/aprobación; coordinar el envío del token con frontend.
- [ ] Confirmar que `PATCH /api/tareas/:id` acepta y persiste `designApprovedByClient`, `etapa`, `estado`, `citaStarted` y `citaFinished`; agregar validación de visita completada antes de aprobar.
- [ ] Mantener listas y respuestas compatibles con el formato `{ success, message?, data }` y probar persistencia tras una nueva sesión/recarga.

## 10. Casos de aceptación compartidos

1. Una tarea en `disenos` sin aprobación administrativa no puede crear una visita vinculada.
2. Una visita creada conserva `tareaId` y aparece en `GET /api/visitas/` con `operationalStatus: "pending"`.
3. Una carga de diseño final se guarda con `archivos[].nivel: "final"` y sigue identificada así después de un GET Kanban.
4. Iniciar cambia solo `operationalStatus` a `in_progress`; terminar lo cambia a `completed`; ninguno cambia `estado` de agenda ni etapa Kanban.
5. No se puede aprobar el diseño desde una visita pendiente o en proceso.
6. Aprobar tras completar la visita deja `designApprovedByClient: true` y mueve la tarea a `cotizacion` sin cerrar la tarea (`estado: "pendiente"`).
7. Si se recarga la aplicación, la visita conserva su estado, el archivo final conserva `nivel: "final"` y la tarjeta sigue en la etapa persistida.
8. Una cita tradicional no adquiere `tareaId` ni pasa por las rutas operativas de Visita.