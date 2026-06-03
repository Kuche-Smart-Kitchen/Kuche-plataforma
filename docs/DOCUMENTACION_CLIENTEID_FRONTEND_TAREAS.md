# Documento: clienteId para Frontend (Tareas y Kanban)

## Objetivo

Mostrar en frontend el codigo de cliente tipo `US3XXB` usando el dato que ya envia el backend.

## Donde se genera el dato en backend

### 1) Mapper principal de tareas

Archivo: `src/controllers/tareas.controller.js`

Funcion: `mapTask`

Campos enviados por cada tarea:

- `clienteId`
- `clientId`
- `codigoCliente`
- `codigo`
- `cliente.clienteId`
- `cliente.codigo`

Referencia directa:

- Alias y codigo: lineas alrededor de `clientId`, `codigoCliente`, `codigo`
- Campo principal: `clienteId`
- Objeto cliente: `cliente.clienteId`, `cliente.codigo`

### 2) Mapper de kanban

Archivo: `src/controllers/kanban.controller.js`

Funcion: `mapTask`

Tambien envia los mismos campos para consistencia:

- `clienteId`
- `clientId`
- `codigoCliente`
- `codigo`
- `cliente.clienteId`
- `cliente.codigo`

## Endpoints que consume frontend

### Tareas

- `GET /api/tareas`
- `GET /api/tareas/:id`

Definidos en:

- `src/routes/tareas.routes.js`

### Kanban

- `GET /api/kanban/citas`
- `GET /api/kanban/disenos`
- `GET /api/kanban/cotizacion`
- `GET /api/kanban/contrato`

Definidos en:

- `src/routes/kanban.routes.js`

## Estructura de respuesta (importante)

Este backend usa envelope de respuesta.

Archivo: `src/middlewares/responseWrapper.js`

Formato exitoso:

```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "clienteId": "US3XXB",
      "clientId": "US3XXB",
      "codigoCliente": "US3XXB",
      "codigo": "US3XXB",
      "cliente": {
        "clienteId": "US3XXB",
        "codigo": "US3XXB"
      }
    }
  ]
}
```

Si es un endpoint por id (`/api/tareas/:id`), `data` es un objeto, no un arreglo.

## Como mapearlo en frontend

Usa un selector unico con fallback para evitar que cambie segun pantalla:

```js
export const getCodigoCliente = (item) => {
  return (
    item?.clienteId ||
    item?.clientId ||
    item?.codigoCliente ||
    item?.codigo ||
    item?.cliente?.clienteId ||
    item?.cliente?.codigo ||
    ''
  );
};
```

Render:

```jsx
<span>{getCodigoCliente(tarea) || 'Sin codigo'}</span>
```

## Errores comunes por los que no se ve

1. Leer mal el envelope:
   - Correcto en listados: `response.data.data`
   - Correcto en detalle: `response.data.data`

2. Consumir otro endpoint distinto al esperado:
   - La tarjeta puede venir de `/api/kanban/*` y no de `/api/tareas`.

3. No reiniciar backend despues de cambios en mapper.

4. Tener base URL de frontend apuntando a otro entorno/servidor.

## Checklist rapido de validacion

1. En Network, abrir el request usado por la vista.
2. Confirmar que en `Response` existe alguno de:
   - `clienteId`
   - `clientId`
   - `codigoCliente`
   - `codigo`
3. Confirmar en consola del frontend:
   - `console.log(response.data.data[0])`
4. Si ahi aparece `US3XXB` pero no en pantalla, el problema es solo de render/mapeo en frontend.

## Resumen operativo

El backend ya envia el codigo de cliente para tareas y kanban. El frontend solo necesita leer `response.data.data` y pintar `clienteId` (con fallback recomendado) en el componente.
