# Guía Frontend: Confirmar aprobación de diseño

Esta guía define cómo sincronizar la aprobación del cliente desde Agenda con el estado persistido de la tarea Kanban. La aprobación consta de dos escrituras: primero se termina la visita; después se aprueba y avanza la tarea. No se debe mover la tarjeta en la UI hasta confirmar la respuesta del servidor.

## Requisitos previos

- La tarea debe estar en `etapa: "disenos"` y `designApprovedByAdmin: true`.
- La visita debe estar vinculada a la tarea por `tareaId` y no estar cancelada.
- La visita debe estar `operationalStatus: "in_progress"` o ya `"completed"`.
- El usuario de `PATCH /api/tareas/:id` debe tener rol `admin`. La ruta de estado de Visita admite los roles autorizados en backend.
- Enviar el bearer token en ambas llamadas.

**Visitas anteriores:** las visitas creadas antes de enviar `tareaId` no se consideran vinculadas. No buscar ni asociar por email o nombre. La edición `PATCH /api/visitas/:id` no cambia ese vínculo; hace falta crear una visita vinculada correctamente o corregir el dato mediante una migración controlada.

## Secuencia de confirmación

### 1. Completar la visita

La ruta es `PATCH /api/visitas/:id/status` y recibe `{ "status": "completed" }`.

Transiciones permitidas:

- `pending` → `in_progress` → `completed`
- Si ya está `in_progress`, solicitar `completed`.
- Si ya está `completed`, no repetir la llamada; continuar con la aprobación de la tarea. El endpoint también es idempotente si se reintenta.

No se debe mandar `completed` directamente desde `pending`: el backend responderá `409`.

```js
const visitId = String(visit._id || visit.id);
const taskId = String(visit.tareaId?._id || visit.tareaId || '');

if (!taskId) {
  throw new Error('La visita no está vinculada a una tarea');
}

if (visit.estado === 'cancelada') {
  throw new Error('No se puede aprobar desde una visita cancelada');
}

if (visit.operationalStatus === 'pending') {
  await api.patch(`/api/visitas/${visitId}/status`, { status: 'in_progress' }, authConfig);
  visit.operationalStatus = 'in_progress';
}

if (visit.operationalStatus === 'in_progress') {
  const response = await api.patch(
    `/api/visitas/${visitId}/status`,
    { status: 'completed' },
    authConfig
  );

  if (response.data?.success !== true
      || response.data?.data?.operationalStatus !== 'completed') {
    throw new Error('El backend no confirmó la finalización de la visita');
  }
}
```

`authConfig` debe contener `headers: { Authorization: `Bearer ${token}` }` o usar la configuración autenticada global de Axios.

### 2. Aprobar y avanzar la tarea

Una vez completada la visita, llamar a `PATCH /api/tareas/:id`. Usar el `tareaId` de la visita, no el ID de la visita ni el de una cita.

```js
const response = await api.patch(
  `/api/tareas/${taskId}`,
  {
    designApprovedByClient: true,
    etapa: 'cotizacion',
    estado: 'pendiente',
    citaStarted: false,
    citaFinished: false
  },
  authConfig
);

const updatedTask = response.data?.data;
const confirmed = response.data?.success === true
  && updatedTask?.designApprovedByClient === true
  && updatedTask?.etapa === 'cotizacion'
  && updatedTask?.estado === 'pendiente'
  && updatedTask?.citaStarted === false
  && updatedTask?.citaFinished === false;

if (!confirmed) {
  throw new Error('Backend no confirmó la aprobación del cliente ni el avance a Cotización');
}

// Solo aquí actualizar la tarjeta localmente o refrescar el Kanban.
```

Backend también acepta `{ designApprovedByClient: true }` y aplica la etapa, estado y flags de cita requeridos. En ambos casos, validar la respuesta antes de cambiar la tarjeta en cliente.

La respuesta exitosa tiene esta forma:

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

## Reintentos y errores

Las dos escrituras no forman una transacción. Si la visita queda `completed` y falla el `PATCH /api/tareas/:id`, reintentar únicamente la aprobación de la tarea. No regresar ni repetir el ciclo presencial.

En el `catch`, mostrar y registrar el mensaje real del servidor; no registrar solo el objeto plegado de consola:

```js
catch (error) {
  const status = error.response?.status;
  const message = error.response?.data?.message || error.message;
  console.error('Error aprobando diseño', {
    status,
    message,
    response: error.response?.data
  });
  throw error;
}
```

Causas habituales de `409`:

- `Se requiere una visita completada...`: no existe una visita con `tareaId` igual al ID de esta tarea y `operationalStatus: "completed"`. Comprobar el vínculo y el resultado del primer `PATCH`.
- `La tarea debe estar en Diseños y tener aprobación administrativa`: la etapa o la aprobación administrativa no cumple el requisito. Consultar la tarea actualizada desde Kanban.
- `Transición de estado operativo no permitida`: se intentó completar una visita pendiente sin iniciarla, o se intentó reabrir una completada.
- Visita cancelada: no se puede iniciar ni completar.

Un `403` al actualizar la tarea indica que la sesión no corresponde a un usuario con rol `admin`; no debe resolverse ocultando el error ni marcando la tarjeta localmente.

En el objeto de tarea, usar el campo raíz `designApprovedByAdmin` como referencia de aprobación administrativa. `visita.aprobadaPorAdmin` es un dato legado duplicado y puede no coincidir en tareas antiguas; backend ya contempla esa discrepancia.

## Diagnóstico de la incidencia actual

En DevTools → Network, abrir la petición fallida `PATCH /api/tareas/:id` y consultar `Response`:

1. Si dice que no hay visita completada, revisar `tareaId` en `GET /api/visitas/` y `operationalStatus` en la respuesta de `PATCH /api/visitas/:id/status`.
2. Si dice que falta aprobación administrativa o que no está en Diseños, revisar `etapa` y `designApprovedByAdmin` de la tarea devuelta por Kanban.
3. Confirmar que `/api/tareas/:id` recibe el ID de la tarea y que ambas peticiones llevan el bearer token.
4. Si el backend ya se actualizó pero el error persiste, confirmar que el frontend apunta al despliegue que contiene esta versión.

No usar `PATCH /api/visitas/:id` para cambiar el estado presencial y no cambiar `Visita.estado` a `completada`: el ciclo presencial se guarda únicamente en `operationalStatus`.
