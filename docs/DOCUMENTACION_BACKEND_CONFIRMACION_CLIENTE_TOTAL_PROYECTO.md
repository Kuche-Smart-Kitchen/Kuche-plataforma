# Documentacion Backend: Confirmacion de cliente con total de proyecto

## Objetivo del cambio

Cuando el admin da click en "Confirmar cliente" en Operaciones, frontend ahora abre un modal para capturar el monto total del proyecto.

Ese dato debe guardarse en base de datos y luego salir en el payload de seguimiento para que:

1. se vea el total del proyecto,
2. se registren pagos,
3. y se pueda calcular saldo pendiente.

## Cambio aplicado en frontend

Flujo implementado:

1. Click en "Confirmar cliente" en Operaciones.
2. Se abre modal de captura de monto total (MXN).
3. Al confirmar, frontend hace PATCH de la tarea con:
   - `followUpStatus: "confirmado"`
   - `status: "completada"`
   - `inversion` (numero)
   - `inversionTotal` (numero, alias compat)
   - `pagos` (anticipo, segundoPago, liquidacion)

Archivos front relevantes:

- `src/app/admin/operaciones/page.tsx`
- `src/components/admin/ConfirmClientAmountModal.tsx`
- `src/contexts/AdminWorkflowContext.tsx`
- `src/lib/admin-workflow.ts`
- `src/lib/axios/tareasApi.ts`

## Contrato esperado para backend

### 1) PATCH de tarea

Endpoint actual:

- `PATCH /api/tareas/:id`

Backend debe aceptar y persistir estos campos adicionales:

```json
{
  "followUpStatus": "confirmado",
  "status": "completada",
  "inversion": 250000,
  "inversionTotal": 250000,
  "pagos": {
    "anticipo": { "amount": 83333, "date": "", "receiptLabel": "Ver recibo", "receiptImage": "" },
    "segundoPago": { "amount": 83333, "date": "", "receiptLabel": "Ver recibo", "receiptImage": "" },
    "liquidacion": { "amount": 83334, "date": "", "receiptLabel": "Ver recibo", "receiptImage": "" }
  }
}
```

Notas:

- `inversion` e `inversionTotal` se envian iguales por compatibilidad; backend puede guardar uno como canonico y mapear el otro.
- `pagos` ya existe en frontend y se usa para seguimiento.

### 2) Lectura de tareas/Kanban

Endpoints de lectura que alimentan admin deben devolver el total guardado:

- `/api/kanban/citas`
- `/api/kanban/disenos`
- `/api/kanban/cotizacion`
- `/api/kanban/contrato`
- y/o `/api/tareas` (segun flujo interno)

Campos de salida requeridos por tarea:

- `inversion` (preferido) o `inversionTotal` (compat)
- `pagos`
- `followUpStatus`

### 3) Seguimiento cliente

Endpoints de seguimiento (login/proyecto) deben incluir en `project`:

- `inversion` o `inversionTotal`
- `pagos`
- `followUpStatus` (si aplica)

Recomendado incluir tambien:

- `saldoPendiente` (numero)
- `totalPagado` (numero)

Si no se mandan, frontend puede derivarlos, pero es mejor que backend sea fuente de verdad.

## Reglas de negocio recomendadas

1. Solo permitir guardar total si `followUpStatus` pasa a `confirmado`.
2. Validar `inversion > 0`.
3. Si llegan ambos (`inversion`, `inversionTotal`) y difieren, priorizar uno y loggear inconsistencia.
4. Mantener `pagos.amount` consistente con el total o recalcular en backend segun regla definida.

## Calculo sugerido de saldo

Formula recomendada:

```text
totalPagado = pagos.anticipo.amount + pagos.segundoPago.amount + pagos.liquidacion.amount
saldoPendiente = max(inversion - totalPagado, 0)
```

Si manejan pagos reales por comprobante, pueden calcular `totalPagado` usando solo pagos con fecha/comprobante validado.

## Checklist de verificacion backend

1. Confirmar cliente desde frontend con un total (ej. 250000).
2. Verificar en DB que se guardan:
   - `followUpStatus = confirmado`
   - `inversion` (o `inversionTotal`)
   - `pagos`
3. Verificar que el mismo registro vuelve en respuestas Kanban/Tareas.
4. Verificar que seguimiento devuelve el total y pagos en `project`.
5. Confirmar que el cliente en `/seguimiento` ya no cae en prospecto cuando esta confirmado.
