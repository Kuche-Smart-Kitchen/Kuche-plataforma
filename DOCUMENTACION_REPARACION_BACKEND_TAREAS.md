## Contexto Del Problema

La edición de tareas ya funciona en el frontend, pero la asignación no se está persistiendo como debería. El caso importante es que una tarea puede tener más de una persona asignada, así que el flujo no debe tratar `assignedToIds` como un valor singular.

Durante el trabajo anterior hice estos cambios en el frontend:

1. Dejé la edición de tareas concentrada en el formulario de detalles de tarea.
2. Quité la UI y los callers de asignación de ingenieros desde la agenda y el modal de citas.
3. Ajusté el payload para enviar solo IDs de responsables y no nombres.
4. Mantengo compatibilidad con el contrato actual del backend enviando alias conocidos de asignación.

El síntoma actual sugiere que el backend todavía está ignorando, sobrescribiendo o normalizando mal la lista de responsables cuando llega desde el formulario.

## Lo Que Debe Hacer El Backend

- Aceptar múltiples responsables en una sola actualización.
- Guardar la lista completa de IDs recibidos.
- No convertir automáticamente una lista en un solo valor.
- No exigir datos extra cuando la edición es parcial.
- Responder con la tarea actualizada y con la asignación visible en la respuesta.
- Mantener compatibilidad con los nombres de campo que hoy envía el frontend.

## Estado Actual Del Backend

La actualización de tareas ya quedó lista para recibir una sola petición con edición parcial y asignación múltiple.

4. Mantengo compatibilidad con el contrato actual del backend en la entrada de UI, pero el request final usa el campo canónico `asignadoA`.

```http
PUT /api/tareas/:id
PATCH /api/tareas/:id
```

### Reglas Aplicadas

- Solo `admin` puede editar tareas.
- `asignadoA` es el campo canónico que se persiste en la base de datos.
- `assignedToIds` y `assignedTo` se aceptan solo como alias de entrada y se normalizan a `asignadoA`.
- La respuesta devuelve `asignadoA` como arreglo y conserva alias derivados por compatibilidad.
- Se aceptan actualizaciones parciales sin exigir campos extra.

### Alias Que Acepta El Backend

- `etapa` o `stage`
- `estado` o `status`
- `nombreProyecto`, `project`, `title`, `titulo`
- `fechaLimite` o `dueDate`
- `ubicacion` o `location`
- `asignadoA`, `assignedToIds`, `assignedTo`

### Compatibilidad De Responsables
    // payload.assignedToIds = assignedToIds; // Removed for clarity
    // payload.assignedTo = assignedToIds; // Removed for clarity

## Flujo Actual En El Frontend

El formulario de detalles prepara un `patch` con campos editables y pasa `assignedToIds` como arreglo de IDs. Ese arreglo luego se transforma en el payload final de actualización de tarea.

### Formulario de detalles de tarea

  if (!activeTask) return;

  try {
    setIsSaving(true);
    await updateTask(activeTask, {
      dueDate: taskDraft.dueDate || undefined,
      location: taskDraft.location.trim() || undefined,
      mapsUrl: taskDraft.mapsUrl.trim() || undefined,
      stage: taskDraft.stage,
      status: taskDraft.status,
      assignedToIds: taskDraft.assignedToIds,
    });
```

Ese formulario es el único lugar donde se debe editar la tarea. Ya no se usa el flujo de asignación de ingenieros desde agenda o cita.

### Constructor del payload de tarea

Archivo: [src/contexts/AdminWorkflowContext.tsx](src/contexts/AdminWorkflowContext.tsx)

```tsx
const buildTaskUpdatePayload = (patch: WorkflowTaskPatch): ActualizarTareaData => {
  const payload: ActualizarTareaData = {};
  const assignedToIds = Array.isArray(patch.assignedToIds)
    ? patch.assignedToIds.filter((id): id is string => typeof id === "string" && id.trim().length > 0)
    : [];

  if (patch.title !== undefined) payload.titulo = patch.title;
  if (patch.stage !== undefined) payload.etapa = patch.stage;
  if (patch.status !== undefined) payload.estado = patch.status;
  if (patch.assignedToIds !== undefined) {
    payload.asignadoA = assignedToIds;
    payload.assignedToIds = assignedToIds;
    payload.assignedTo = assignedToIds;
  }
```

Esta parte es crítica: el frontend ya manda la lista completa, no un solo responsable.

### Tipo de actualización de tarea

Archivo: [src/lib/axios/tareasApi.ts](src/lib/axios/tareasApi.ts)

```ts
export interface ActualizarTareaData {
  titulo?: string;
  etapa?: EtapaTarea;
  estado?: EstadoTarea;
  asignadoA?: string | string[];
  assignedToIds?: string | string[];
  assignedTo?: string | string[];
  title?: string;
  project?: string;
  dueDate?: string;
  location?: string;
  nombreProyecto?: string;
  notas?: string;
  prioridad?: PrioridadTarea;
  fechaLimite?: string;
  ubicacion?: string;
  mapsUrl?: string;
```

La compatibilidad existe por tres nombres de campo, pero la intención real es que el backend trate todos como lista de IDs cuando aplique.

## Funciones Relevantes A Revisar En Backend

Estas son las piezas del frontend que más influyen en el problema:

### `updateTask`

Archivo: [src/contexts/AdminWorkflowContext.tsx](src/contexts/AdminWorkflowContext.tsx)

- Decide si la tarjeta es de tipo tarea o cita.
- Construye el payload mínimo.
- Envía `assignedToIds` cuando el usuario selecciona uno o más responsables.
- Llama a `actualizarTarjetaTarea` para tareas normales.

### `buildTaskUpdatePayload`

Archivo: [src/contexts/AdminWorkflowContext.tsx](src/contexts/AdminWorkflowContext.tsx)

- Sanitiza IDs vacíos.
- Puede repetir la misma lista en `asignadoA`, `assignedToIds` y `assignedTo` solo por compatibilidad temporal.
- Envía solo los campos editados.

### `ActualizarTareaData`

Archivo: [src/lib/axios/tareasApi.ts](src/lib/axios/tareasApi.ts)

- Define el contrato que consume el backend.
- Ya contempla listas para asignación múltiple.

## Qué Se Cambió En Esta Iteración Del Frontend

- Se quitó la asignación de ingenieros desde la agenda y desde el modal de citas.
- Se dejó la edición de tareas solo en el formulario de detalles.
- Se corrigió el payload para que use IDs, no nombres.
- Se mantuvo la edición parcial para no romper el resto del formulario.

## Hipótesis Técnica Del Fallo

Lo más probable es que el backend esté haciendo una de estas cosas:

- Tomar solo el primer ID y descartar el resto.
- Leer un campo distinto al que realmente envía el frontend.
- Sobrescribir la asignación con un único valor por compatibilidad antigua.
- Validar el payload como si `asignadoA` fuera un string y no un arreglo.

## Resultado Esperado

Después del ajuste backend, una edición de tarea desde el formulario debe:

- Guardar el resto de campos normalmente.
- Persistir uno o varios responsables.
- Reflejar la lista completa al recargar la tarea.
- Mantener el mismo comportamiento en el tablero y en el modal de detalles.

## Cómo Revisarlo Paso A Paso

Esta es la forma más segura de comprobar dónde se está rompiendo el flujo y dejarlo funcionando correctamente.

### 1. Confirmar qué manda realmente el frontend

Abre el formulario de edición de tarea y revisa la petición en la pestaña `Network` del navegador.

Verifica estas cosas:

- Que la petición salga a `PUT /api/tareas/:id` o `PATCH /api/tareas/:id`.
- Que `assignedToIds` llegue como arreglo de strings.
- Que `asignadoA`, `assignedToIds` y `assignedTo` no lleguen vacíos si seleccionaste responsables.
- Que no estén llegando nombres, correos o etiquetas en lugar de IDs.
- Que los campos parciales realmente estén presentes cuando editas solo una parte del formulario.

Si `assignedToIds` ya llega vacío o con datos incorrectos, el problema está en el frontend y no en el backend.

### 2. Revisar el payload que construye el frontend

En el flujo de actualización de tarea, revisa el constructor del payload.

Debes comprobar que:

- `title` se transforme a `titulo` o al campo que espere el backend.
- `project` se mande como nombre del proyecto y no como ID, salvo que realmente sea un `ObjectId`.
- `dueDate` se traduzca a `fechaLimite`.
- `location` se traduzca a `ubicacion`.
- `stage` se traduzca a `etapa`.
- `status` se traduzca a `estado`.
- `assignedToIds` se copie completo en `asignadoA`, `assignedToIds` y `assignedTo` solo si el backend lo necesita por compatibilidad.

Regla importante: el backend normaliza cualquier alias a `asignadoA`, así que no necesitas enviar el mismo arreglo tres veces si ya mandas el campo canónico.

Regla importante: si el frontend limpia o reduce la lista antes de enviar, el backend nunca podrá guardar múltiples responsables.

### 3. Probar una petición manual al backend

Antes de culpar al frontend, prueba el endpoint con un payload manual usando Postman, Insomnia o `curl`.

Ejemplo de payload mínimo válido:

```json
{
  "titulo": "Tarea de prueba",
  "etapa": "contrato",
  "estado": "pendiente",
  "asignadoA": ["66f0a1111111111111111111", "66f0a2222222222222222222"]
}
```

Si con este payload el backend sí guarda los responsables, entonces el fallo está en el frontend.

### 4. Verificar la respuesta del backend

Después de guardar, revisa la respuesta JSON.

Debe traer:

- `asignadoA` como arreglo de IDs.
- `assignedToIds` y `assignedTo` como alias derivados del mismo arreglo, no como campos persistidos.
- El resto de campos editados sin perder valores no modificados.

Si la respuesta trae solo un ID o trae un arreglo vacío, el problema está en la normalización del controller.

### 5. Revisar que los usuarios existan y estén activos

El backend solo puede resolver responsables válidos si esos IDs existen en la colección de usuarios o administradores que usa el proyecto.

Confirma que:

- Los IDs pertenecen a usuarios reales.
- Los usuarios tienen el rol permitido para ser asignados.
- Los usuarios no están deshabilitados.

Si un ID no existe, el backend puede rechazar toda la asignación o dejar la lista incompleta, según la lógica activa.

### 6. Revisar la persistencia en MongoDB

Después de guardar, inspecciona el documento de tarea en la base de datos.

Valida que:

- `asignadoA` sea un array.
- `asignadoANombre` tenga el mismo número de elementos o al menos los nombres resueltos.
- No se esté sobrescribiendo el array con un valor único después del `save()`.

Si MongoDB guarda bien pero el frontend muestra mal, el problema está en el mapeo de respuesta.

### 7. Revisar el mapeo de respuesta

En el backend, revisa la función que transforma la tarea para responder al frontend.

Debes confirmar que:

- `asignadoA` y `assignedToIds` salgan como arreglo.
- `asignadoANombre` y `assignedTo` salgan alineados con la lista guardada.
- No haya un paso intermedio que convierta el arreglo en un string.

### 8. Decidir si conviene separar la edición y la asignación

Si después de revisar todo lo anterior la asignación sigue siendo inestable, la solución más limpia es separar los flujos.

#### Opción A: Mantener todo junto

Úsala solo si:

- El frontend ya manda los IDs correctos.
- El backend ya resuelve la lista completa sin errores.
- No hay conflictos entre edición parcial y asignación.

#### Opción B: Separar edición y asignación

Úsala si:

- El payload combinado se vuelve difícil de mantener.
- La edición de campos y la asignación tienen reglas distintas.
- Quieres reducir el riesgo de que una parte rompa a la otra.

En ese caso, el frontend debería hacer dos llamadas:

1. Primero actualizar los datos de la tarea.
2. Después actualizar solo los responsables.

### 9. Flujo recomendado si decides separarlo

Si separas el proceso, el backend debería tener dos intenciones claras:

- `actualizarTarea` para editar datos generales.
- `actualizarAsignacionTarea` para guardar solo `asignadoA` / `assignedToIds`.

Con eso, el formulario de detalles puede guardar información general sin tocar responsables, y la selección de empleados puede disparar una segunda petición más simple.

### 10. Criterio final para darlo por resuelto

El flujo se considera correcto solo si todas estas condiciones se cumplen:

- El frontend manda el arreglo completo de IDs.
- El backend lo recibe sin truncarlo.
- La base de datos guarda todos los IDs.
- La respuesta devuelve la lista completa.
- Al recargar la tarea, la UI muestra exactamente los mismos responsables.

Si alguna de esas cinco condiciones falla, todavía no está resuelto.