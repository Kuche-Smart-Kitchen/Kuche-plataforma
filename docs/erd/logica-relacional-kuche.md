# Logica relacional - Kuche (conceptual)

> Basado en las estructuras de `KanbanTask` y el almacenamiento en `localStorage`:
> - `kuche-kanban-tasks`
> - `kuche_project_<codigo>`

## Esquema relacional (normalizado)

Relaciones y llaves:

```text
KANBAN_TASK(
  id PK, stage, status, followUpStatus,
  createdAt, followUpEnteredAt,
  project, title, priority, dueDate, location, mapsUrl,
  citaStarted, citaFinished,
  designApprovedByAdmin, designApprovedByClient,
  codigoProyecto FK -> SEGUIMIENTO_PROYECTO(codigo)
)

TASK_ASSIGNED_TO(
  taskId PK/FK -> KANBAN_TASK(id),
  employeeName PK
)

TASK_FILE(
  fileId PK,
  taskId PK/FK -> KANBAN_TASK(id),
  name, type, src
)

PRELIMINAR_COTIZACION(
  cotId PK,
  taskId FK -> KANBAN_TASK(id),
  client, projectType, location, date, rangeLabel,
  cubierta, frente, herraje
)

COTIZACION_FORMAL(
  cotId PK,
  taskId FK -> KANBAN_TASK(id),
  client, projectType, location, date, rangeLabel,
  cubierta, frente, herraje,
  formalPdfKey, pdfDataUrl
)

SEGUIMIENTO_PROYECTO(
  codigo PK,
  cliente,
  isProspect
)
```

## Logica relacional: auto-avance de etapa (KanbanTablero)

Transicion 1: `citas -> disenos`

```text
R1 = sigma_{stage='citas' AND citaStarted AND citaFinished}(KANBAN_TASK)
// para cada t en R1:
//   t.stage := 'disenos'
//   t.status := 'pendiente'
```

Transicion 2: `disenos -> cotizacion`

```text
R2 = sigma_{stage='disenos' AND designApprovedByAdmin AND designApprovedByClient}(KANBAN_TASK)
// para cada t en R2:
//   t.stage := 'cotizacion'
//   t.status := 'pendiente'
//   t.citaStarted := false; t.citaFinished := false
```

Transicion 3: `cotizacion -> contrato`

```text
R3 = sigma_{stage='cotizacion' AND citaStarted AND citaFinished}(KANBAN_TASK)
// para cada t en R3:
//   t.stage := 'contrato'
//   t.status := 'pendiente'
//   t.followUpEnteredAt := now
//   t.followUpStatus := 'pendiente'
```

## Logica relacional: seguimiento (confirmar / descartar / auto-descartar)

Confirmar:

```text
TC_confirm = sigma_{id = :taskId AND stage='contrato' AND followUpStatus='pendiente'}(KANBAN_TASK)
// update:
//   followUpStatus := 'confirmado'
//   status := 'completada'
```

Descartar:

```text
TC_discard = sigma_{id = :taskId AND stage='contrato' AND followUpStatus='pendiente'}(KANBAN_TASK)
// update:
//   followUpStatus := 'descartado'
//   status := 'completada'
```

Auto-descartar por expiracion (10 dias en el codigo):

```text
TC_expired =
  sigma_{stage='contrato' AND followUpStatus='pendiente' AND
         (days(now) - days(followUpEnteredAt)) >= 10}(KANBAN_TASK)
// update:
//   followUpStatus := 'descartado'
//   status := 'completada'
```

## Logica relacional: consultas para pantallas

Clientes confirmados (`/admin/clientes-confirmados`):

```text
Q_confirmados = sigma_{followUpStatus='confirmado'}(KANBAN_TASK)
```

Clientes descartados (`/admin/clientes-descartados`):

```text
Q_descartados = sigma_{followUpStatus='descartado'}(KANBAN_TASK)
```

Clientes en proceso (`/admin/clientes-en-proceso`):

El codigo excluye las tareas en `contrato` con followUpStatus confirmado/descartado.

```text
Q_en_proceso =
  sigma_{NOT(stage='contrato' AND followUpStatus IN ('confirmado','descartado'))}(KANBAN_TASK)

// (opcional) filtrado por empleado:
//   Q_en_proceso_emp = Q_en_proceso JOIN TASK_ASSIGNED_TO
//                      donde employeeName = :empleado
```

Mi proyecto por codigo (`/seguimiento`):

```text
P = sigma_{codigo = :codigo}(SEGUIMIENTO_PROYECTO)

// unir para encontrar la tarea asociada:
T = P JOIN KANBAN_TASK  ON (KANBAN_TASK.codigoProyecto = P.codigo)

// si isProspect=true mostramos PRELIMINAR_COTIZACION:
PreDocs  = T JOIN PRELIMINAR_COTIZACION
// si isProspect=false mostramos COTIZACION_FORMAL:
FormalDocs = T JOIN COTIZACION_FORMAL
```

