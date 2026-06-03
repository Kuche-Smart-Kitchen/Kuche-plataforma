# Documentacion Backend: Seguimiento de timeline y pagos en cliente confirmado

## Objetivo

Definir de forma explicita como debe comportarse backend para que el formulario de **Clientes confirmados** (admin) pueda:

1. Guardar avance de linea de tiempo (`etapaActual`).
2. Guardar y leer pagos (`pagos`).
3. Mantener nota de seguimiento (`seguimientoNota`).
4. Reflejar esos cambios en la vista de `/seguimiento` del cliente.

---

## Contexto funcional

En frontend admin existe un modal de "Estatus publico" para clientes confirmados que ahora permite:

- Editar `etapaActual` con los mismos pasos de timeline del seguimiento cliente.
- Registrar montos y comprobantes de pagos.
- Guardar nota de seguimiento.

La vista `/seguimiento` cliente lee esos mismos campos para pintar:

- Paso actual de timeline.
- Barra de progreso.
- Pagos registrados.

---

## Fuente de verdad esperada en backend

Backend debe persistir estos campos **en la tarea/proyecto del cliente confirmado** (registro principal de seguimiento):

- `etapaActual: string`
- `pagos: object`
- `seguimientoNota: string` (y opcional alias `notaSeguimiento`)
- `inversion` / `inversionTotal` (ya usado para total del proyecto)

> Recomendacion: usar la **tarea** como fuente de verdad y reflejar esos datos en el payload de seguimiento (`project`) al autenticar cliente.

---

## Catalogo canonico de etapas (`etapaActual`)

Valores permitidos (exactos):

1. `Diseño Aprobado`
2. `Materiales en Taller`
3. `Corte CNC`
4. `Ensamble`
5. `Instalación Final`

Reglas:

- Si llega valor fuera de catalogo, backend debe normalizar a `Diseño Aprobado` o rechazar con error de validacion.
- Guardar exactamente con acentos para evitar desajustes visuales en frontend.

---

## Estructura de pagos esperada

```json
{
  "pagos": {
    "anticipo": {
      "amount": 0,
      "date": "",
      "receiptLabel": "Ver recibo",
      "receiptImage": ""
    },
    "segundoPago": {
      "amount": 0,
      "date": "",
      "receiptLabel": "Ver recibo",
      "receiptImage": ""
    },
    "liquidacion": {
      "amount": 0,
      "date": "",
      "receiptLabel": "Ver recibo",
      "receiptImage": ""
    }
  }
}
```

Reglas:

- `amount` debe ser numero entero, `>= 0`.
- `date`, `receiptLabel`, `receiptImage` son opcionales pero recomendados para control de pago registrado.
- Backend no debe volver a aplicar split automatico (1/3, 1/3, 1/3).

---

## Endpoint de escritura (admin)

### PATCH tarea

Endpoint:

- `PATCH /api/tareas/:id`

Backend debe aceptar y persistir al menos:

```json
{
  "etapaActual": "Corte CNC",
  "pagos": {
    "anticipo": { "amount": 80000, "date": "2026-06-03", "receiptLabel": "recibo-1.jpg", "receiptImage": "https://..." },
    "segundoPago": { "amount": 0, "date": "", "receiptLabel": "Ver recibo", "receiptImage": "" },
    "liquidacion": { "amount": 0, "date": "", "receiptLabel": "Ver recibo", "receiptImage": "" }
  },
  "seguimientoNota": "Cliente validó avances de corte"
}
```

Compatibilidad recomendada:

- Si llega `notaSeguimiento`, mapear internamente a `seguimientoNota`.
- Mantener salida con ambos si existe legado.

---

## Endpoint de lectura (admin)

Los endpoints que alimentan tablero/admin deben regresar los campos persistidos para hidratar modal:

- `etapaActual`
- `pagos`
- `seguimientoNota` / `notaSeguimiento`
- `inversion` / `inversionTotal`

Aplica para respuestas desde:

- `/api/tareas`
- `/api/tareas/:id`
- `/api/kanban/*` (si el admin consume kanban por etapas)

---

## Endpoint de lectura (seguimiento cliente)

En login/carga de proyecto de seguimiento, backend debe incluir en `project`:

- `etapaActual`
- `pagos`
- `seguimientoNota` (opcional para UI)
- `inversion` / `inversionTotal`

Objetivo:

- El timeline en `/seguimiento` debe reflejar exactamente el valor guardado por admin.
- El estado de pagos mostrado al cliente debe salir del mismo objeto `pagos`.

---

## Donde se debe registrar en base de datos

Minimo requerido:

1. **Documento de tarea del cliente confirmado**
   - Campo `etapaActual`.
   - Campo `pagos`.
   - Campo `seguimientoNota`.

2. **Proyeccion para modulo de seguimiento cliente**
   - Al construir `project` para `/seguimiento`, mapear directamente los campos anteriores.

Recomendacion:

- Evitar guardar `etapaActual` en una coleccion temporal o cache sin persistencia.
- Usar actualizacion atomica sobre la tarea para evitar desincronizacion con pagos y nota.

---

## Validaciones recomendadas backend

1. Validar `etapaActual` contra catalogo permitido.
2. Validar estructura completa de `pagos`.
3. Normalizar montos a enteros no negativos.
4. Rechazar payloads invalidos con `400` + mensaje claro.
5. Mantener consistencia de aliases (`seguimientoNota`/`notaSeguimiento`, `inversion`/`inversionTotal`).

---

## Checklist de prueba end-to-end

1. En admin, abrir cliente confirmado y guardar `etapaActual = "Ensamble"`.
2. Confirmar en DB que la tarea tiene `etapaActual: "Ensamble"`.
3. Recargar admin y validar que modal rehidrata mismo paso.
4. Iniciar sesion en `/seguimiento` con ese cliente.
5. Validar que timeline del cliente muestra `Ensamble` como etapa actual.
6. Registrar un pago con recibo en admin y guardar.
7. Validar en DB que `pagos` se actualiza.
8. Validar en `/seguimiento` que pago aparece reflejado.

---

## Criterio de exito

Se considera correcto cuando:

- Admin guarda avance/pagos/nota una sola vez.
- Backend persiste en tarea confirmada.
- Backend devuelve esos campos en admin y seguimiento.
- Cliente ve el mismo avance en timeline sin ajustes manuales adicionales.