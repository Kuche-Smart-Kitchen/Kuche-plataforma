# Diagnóstico frontend: 404 "Proyecto no encontrado" en datos de contrato

Endpoint afectado: `PATCH /api/proyectos/:codigo/datos-contrato`
(`actualizarDatosContratoProyecto` en `src/lib/axios/proyectosApi.ts`).

## Síntoma

```
Failed to load resource: 404
[axios error response] Object
Recurso no encontrado: Proyecto no encontrado
```

## Causa en backend (ya corregida)

El backend buscaba `Proyecto.clienteId === :codigo` con el texto literal. El resto del sistema
(seguimiento) normaliza el código (`K-8821` → `K8821`, solo alfanuméricos en mayúsculas) y resuelve
el proyecto por el acceso de tracking o por la tarea. Ahora el endpoint hace lo mismo:

1. Normaliza `:codigo` (quita guiones/espacios, mayúsculas).
2. Busca por acceso de tracking activo (`projectId`).
3. Busca por `Proyecto.clienteId`.
4. Busca por `Tarea.clienteId` y usa su `proyectoId`.

Requiere reiniciar/desplegar el backend con este cambio.

## Si el 404 persiste: causa en frontend / datos

El 404 es legítimo cuando el cliente **no tiene un `Proyecto` vinculado** (la tarea no tiene
`proyectoId`). Revisar:

1. **Código enviado**: debe ser `KanbanTask.codigoProyecto` (= `clienteId` del item kanban), nunca
   `task.id` (ObjectId de la tarea) ni el `proyectoId`. Comprobar en la pestaña Network la URL real:
   `/api/proyectos/<codigo>/datos-contrato`.
2. **Codificar el parámetro**: usar `encodeURIComponent(codigo)`.
3. **Ruta/proxy**: la URL final debe ser `/api/proxy/api/proyectos/...` (mismo prefijo que el resto
   de llamadas). Un 404 con cuerpo HTML indica ruta equivocada; el nuestro devuelve JSON
   `{ success:false, message }`.
4. **Proyecto inexistente**: si el item kanban llega con `proyectoId: null`, no hay proyecto. El
   frontend debe deshabilitar "Guardar" en ese caso (o mostrar "Este cliente aún no tiene proyecto
   vinculado") en lugar de llamar al endpoint. Dato disponible en los endpoints `/api/kanban/*`:
   `proyectoId`.
5. **Mensaje**: el backend ahora responde
   `Proyecto no encontrado para el código indicado (el cliente aún no tiene un proyecto vinculado)`;
   mostrarlo tal cual al usuario.

## Contrato recordatorio

Body permitido (solo estos campos, otros devuelven 400):

```json
{ "tipo": "Cocina", "fechaContrato": "2026-10-07", "fechaEntrega": "2026-12-01" }
```

- `tipo`: `Cocina | Closet | vestidor | Mueble para el baño`.
- Fechas `YYYY-MM-DD`; `""` limpia el campo; `fechaEntrega >= fechaContrato`.
- Requiere sesión admin/staff (cookie `token` o `Authorization: Bearer`).
