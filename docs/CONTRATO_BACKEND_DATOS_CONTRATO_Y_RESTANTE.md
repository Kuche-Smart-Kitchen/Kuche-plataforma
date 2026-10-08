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
