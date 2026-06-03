# Documentacion de clienteId en frontend admin

## Objetivo

Este documento explica de forma explicita:

1. Donde entra el dato `clienteId` al frontend.
2. Donde se normaliza y se guarda dentro de la tarea que usa el panel admin.
3. Por que hoy puede no mostrarse el valor correcto como `US3XXB`.
4. Que archivo y que funcion deben ajustarse para mostrarlo correctamente en pantalla.

## Resumen ejecutivo

El dato que se quiere mostrar no es el `_id` de Mongo ni `sourceId`, sino el campo de negocio `clienteId`.

En el frontend admin ese dato termina viviendo en `task.clientId` dentro del tipo `AdminWorkflowTask`.

El problema actual no es que el frontend no tenga un campo para `clienteId`. El problema es que la funcion central que lo extrae desde el payload del backend tiene una prioridad incorrecta y puede regresar primero:

- `cliente._id`
- `cliente.id`

antes de regresar:

- `cliente.clienteId`
- `cita.clienteId`
- `raw.clienteId`

Si el backend manda un objeto como este:

```json
{
  "clienteId": "US3XXB",
  "cliente": {
    "_id": "68357f927d1f6476dfa7b2d1",
    "clienteId": "US3XXB"
  }
}
```

la normalizacion actual puede terminar guardando `68357f927d1f6476dfa7b2d1` en `task.clientId` en lugar de `US3XXB`.

## Flujo real del dato en frontend

### 1. Carga principal del tablero admin

El panel admin obtiene las tareas desde el contexto:

- `src/contexts/AdminWorkflowContext.tsx`

La funcion `refresh()` llama a:

- `cargarTableroAdmin()` en `src/lib/axios/adminWorkflowApi.ts`

Esa funcion delega a:

- `fetchAdminWorkflowTasksSequentially()` en `src/lib/admin-workflow.ts`

## 2. Punto central donde se mapea cada registro

La normalizacion principal sucede en:

- `mapKanbanItemToAdminTask()` en `src/lib/admin-workflow.ts`

Esta funcion convierte el payload del backend al modelo que consumen las pantallas admin.

Dentro de ese mapper se asigna:

```ts
clientId: extractClientId(raw, citaPayload)
```

Es decir:

- El valor final que las pantallas leen como `task.clientId`
- depende completamente de `extractClientId(...)`

## 3. Donde vive el dato ya normalizado

El tipo que consumen las vistas admin es:

- `AdminWorkflowTask` en `src/lib/admin-workflow.ts`

Ese tipo declara:

```ts
clientId?: string;
```

Por lo tanto, el lugar correcto para dejar listo el valor `US3XXB` es:

- `task.clientId`

No conviene que cada pantalla tenga que reconstruirlo manualmente desde `task.cita`, `task.raw` o ids alternos.

## 4. Funcion exacta que hoy decide el valor

La funcion responsable es:

- `extractClientId(raw, citaPayload)` en `src/lib/admin-workflow.ts`

Actualmente revisa varias rutas posibles del payload, pero el orden de prioridad incluye ids tecnicos antes que `clienteId`.

Orden actual relevante:

```ts
toString(clienteFromCita?._id) ??
toString(clienteFromCita?.id) ??
toString(clienteFromCita?.clienteId) ??
...
toString(clienteFromRaw?._id) ??
toString(clienteFromRaw?.id) ??
toString(clienteFromRaw?.clienteId) ??
...
toString(raw.clienteId)
```

Ese orden explica por que puede ganar un `_id` de Mongo antes que `US3XXB`.

## 5. Donde puede venir clienteId en el payload

Segun la normalizacion actual, el frontend espera encontrarlo potencialmente en alguna de estas rutas:

- `raw.clienteId`
- `raw.cliente.clienteId`
- `raw.cita.clienteId`
- `raw.cita.cliente.clienteId`
- `raw.codigoCliente`
- `raw.cita.codigoCliente`

Pero tambien hoy acepta rutas tecnicas como:

- `raw.cliente._id`
- `raw.cliente.id`
- `raw.cita.cliente._id`
- `raw.cita.cliente.id`

Esas rutas tecnicas son justo las que contaminan la visualizacion si se usan como fuente principal.

## 6. Pantallas que muestran este valor

Las pantallas admin que hoy consumen el valor para mostrar "Codigo" son:

- `src/app/admin/operaciones/page.tsx`
- `src/app/admin/clientes-en-proceso/page.tsx`
- `src/app/admin/clientes-confirmados/page.tsx`
- `src/app/admin/proyectos-inactivos/page.tsx`

Todas esas pantallas terminan dependiendo de `task.clientId` o de helpers que parten de ese valor.

Por eso, si el mapeo central sale mal, todas las vistas salen mal.

## 7. Conclusion tecnica

El dato si se encuentra en frontend, pero el lugar correcto para resolverlo no es cada vista individual.

El ajuste correcto debe hacerse en:

- `src/lib/admin-workflow.ts`
- funcion `extractClientId(...)`

La regla correcta deberia ser:

1. Priorizar siempre `clienteId` de negocio.
2. Usar `codigoCliente` solo como compatibilidad si realmente representa el mismo codigo de negocio.
3. No usar `_id` ni `id` de Mongo como valor para mostrar al usuario.

## 8. Recomendacion concreta de mapeo

La prioridad recomendada para `extractClientId(...)` es esta:

```ts
return (
  toString(clienteFromCita?.clienteId) ??
  toString(citaPayload?.clienteId) ??
  toString(clienteFromRaw?.clienteId) ??
  toString(raw.clienteId) ??
  toString(citaPayload?.codigoCliente) ??
  toString(raw.codigoCliente) ??
  toString(clienteFromCita?.codigo) ??
  toString(clienteFromRaw?.codigo)
);
```

Y no deberia incluir:

```ts
cliente._id
cliente.id
```

si el objetivo es mostrar el codigo de cliente visible para negocio.

## 9. Como validar que ya quedo bien

Despues del ajuste, el valor esperado debe cumplirse asi:

- Si backend manda `clienteId: "US3XXB"`, entonces `task.clientId` debe valer `US3XXB`.
- En las vistas admin, donde dice "Codigo", debe mostrarse `US3XXB`.
- No debe mostrarse un ObjectId de 24 caracteres hexadecimales.

## 10. Logs de depuracion agregados temporalmente

Para inspeccionar la estructura real del payload recibido, se agregaron logs temporales en:

- `src/app/admin/clientes-en-proceso/page.tsx`
- `src/app/admin/clientes-confirmados/page.tsx`

Esos logs muestran el primer registro crudo recibido desde `refresh()` para confirmar en que ruta exacta llega `clienteId` en tu ambiente real.
