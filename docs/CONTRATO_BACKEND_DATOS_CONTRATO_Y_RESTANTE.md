# Contrato backend: datos de contrato y restante por pagar

Alcance: `/admin/clientes-confirmados` y `/admin/clientes-en-proceso`.

## Cambios en frontend

- Se eliminó "Subir contrato" (`ContratoUploadButton`) de ambos expedientes. Solo queda "Pagos del proyecto".
- Las tarjetas de confirmados y en proceso muestran **Restante por pagar** = `presupuestoTotal - totalPagado`.
- En el sidebar de confirmados, `ConfirmedClientContractFields` es ahora un formulario único (tipo de proyecto, fecha de contrato, fecha de entrega) con un botón Guardar que persiste en backend.
- Tras guardar "Pagos del proyecto" se recargan los kanban para refrescar el restante.

## Función frontend nueva

`src/lib/axios/proyectosApi.ts`

- `actualizarDatosContratoProyecto(codigo, { tipo?, fechaContrato?, fechaEntrega? })`
- `TIPOS_PROYECTO` = `["Cocina", "Closet", "vestidor", "Mueble para el baño"]` (mismo enum de `Proyecto.tipo`).

## Ruta que el backend debe crear

`PATCH /api/proyectos/:codigo/datos-contrato` (auth admin)

- `:codigo` = `Proyecto.clienteId` (código K-XXXX, el mismo `codigoProyecto` del kanban).
- Body (todos opcionales):

```json
{ "tipo": "Cocina", "fechaContrato": "2026-10-07", "fechaEntrega": "2026-12-01" }
```

- `tipo`: debe estar en el enum de `Proyecto.tipo`; si no, 400.
- `fechaContrato` / `fechaEntrega`: `YYYY-MM-DD`; cadena vacía `""` limpia el campo (guardar `null`). Validar `fechaEntrega >= fechaContrato` cuando ambas existan.
- Respuesta: `{ "success": true, "data": <Proyecto actualizado> }`; en error `{ "success": false, "message": "..." }`.

## Cambios al modelo `Proyecto`

```js
fechaContrato: { type: Date, default: null },
fechaEntrega: { type: Date, default: null },
```

## Campos que los endpoints `/api/kanban/*` (items de tarea con proyecto vinculado) deben devolver

Mapeados en `mapKanbanItemToTask` (`src/lib/admin-workflow.ts`):

| Campo del item | Origen en `Proyecto`                              | Uso en frontend            |
| -------------- | ------------------------------------------------- | -------------------------- |
| `tipo`         | `tipo`                                            | `projectTypeSummary`       |
| `fechaContrato`| `fechaContrato` (ISO)                             | `contractDate`             |
| `fechaEntrega` | `fechaEntrega` (ISO)                              | `estimatedDeliveryDate`    |
| `presupuestoTotal` | `presupuestoTotal`                            | `presupuestoTotal`         |
| `totalPagado`  | `pagos.anticipo.amount + pagos.segundoPago.amount + pagos.liquidacion.amount` | `totalPagado` |

Notas:

- `presupuestoTotal` debe mantenerse sincronizado con `inversion` que envía `PATCH /api/seguimiento/proyectos/:codigo` (modal "Pagos del proyecto"); ese mismo endpoint actualiza `pagos.*.amount`.
- Si `presupuestoTotal` es 0 o no viene, la tarjeta muestra "Sin presupuesto".
- Helper de cálculo: `getMontoRestante` en `src/lib/kanban.ts`.

## Actualización — "Tipo de proyecto" pasa a texto libre + visibilidad de vínculo Proyecto↔Tarea

Motivo: el campo "Tipo de proyecto" del sidebar de confirmados ahora es un `<input type="text">`
(con `<datalist>` de sugerencias, no restrictivo) en lugar de un `<select>` limitado al enum.
Además, el admin reportaba que el cliente "no tiene proyecto vinculado" aunque ya guardara datos de
contrato: el frontend nunca leía/mostraba `proyectoId`, así que no había forma de confirmarlo en UI.

### 1. Backend DEBE relajar la validación de `Proyecto.tipo`

- Cambiar el schema de `enum: [...]` a `String` libre (recomendado: `trim: true`, `maxlength` razonable
  p.ej. 60, y rechazar solo vacío/solo-espacios si se quiere mantener obligatorio).
  - **Mientras esto no se despliegue, cualquier valor fuera del enum anterior (`Cocina`, `Closet`,
    `vestidor`, `Mueble para el baño`) seguirá devolviendo 400** al guardar desde el nuevo input.
- El frontend ya no envía el tipo `TipoProyecto`; ahora `tipo` viaja como `string` libre (trim aplicado
  en frontend, pero backend debe repetir el trim/validación por seguridad).

### 2. Backend DEBE incluir `proyectoId` en la respuesta de `/api/kanban/*`

- Los endpoints consumidos por `fetchBackendKanbanTasks` (`obtenerKanbanCitas`, `obtenerKanbanDisenos`,
  `obtenerKanbanCotizacion`, `obtenerKanbanContrato`) deben devolver `proyectoId` (el `Tarea.proyectoId`,
  ObjectId como string) en cada item cuando exista. El frontend ya lo mapea
  (`mapKanbanItemToTask` → `KanbanTask.proyectoId`) y lo usa para mostrar la etiqueta
  "Proyecto vinculado" / "Sin vincular aún" en `ConfirmedClientContractFields`.
- Si el campo no viene, la UI seguirá mostrando "Sin vincular aún" aunque el `Proyecto` sí exista en BD.

### 3. Confirmar que `PATCH /api/proyectos/:codigo/datos-contrato` siga devolviendo el `Proyecto` con `_id`

- El frontend ahora toma `response.data._id` tras guardar para marcar el vínculo de inmediato sin
  esperar un refresh completo del kanban. Si el shape de `data` cambia, debe seguir incluyendo `_id`
  como string (o el campo equivalente del ObjectId del `Proyecto`).

### Resumen de impacto en frontend (ya aplicado, no requiere acción de backend)

- `src/lib/kanban.ts`: `KanbanTask` ahora tiene `proyectoId?: string`.
- `src/lib/admin-workflow.ts`: `mapKanbanItemToTask` mapea `raw.proyectoId` → `KanbanTask.proyectoId`.
- `src/lib/axios/proyectosApi.ts`: `DatosContratoProyecto.tipo` es `string` (ya no `TipoProyecto`);
  `TIPOS_PROYECTO` se conserva solo para el `<datalist>` de sugerencias.
- `src/components/admin/ConfirmedClientContractFields.tsx`: input de texto libre + badge de estado de
  vínculo + actualización optimista de `proyectoId` desde la respuesta del PATCH.
