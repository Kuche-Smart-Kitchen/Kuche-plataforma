# Flujo de visitas en tareas

Este documento describe el payload que debe mandar el frontend para que el backend procese correctamente el flujo de visita, aprobación de diseño y subida del diseño final.

## Flujo esperado

1. El admin aprueba el diseño.
2. El frontend registra la visita en la tarea.
3. El cliente aprueba la visita/diseño.
4. El diseño final se sube como archivo de tarea con tipo `diseno_final` o `diseno`.
5. El backend guarda el archivo en Dropbox y en Mongo solo persiste el enlace, la key y el provider.

## Payload canónico

Para crear o actualizar una tarea, usa `visita` como estructura principal.

```json
{
  "designApprovedByAdmin": true,
  "designApprovedByClient": false,
  "visitScheduledAt": "2026-06-02T14:00:00.000Z",
  "visita": {
    "fechaProgramada": "2026-06-02T14:00:00.000Z",
    "aprobadaPorAdmin": true,
    "aprobadaPorCliente": false,
    "actualizadaEn": "2026-06-02T14:05:00.000Z"
  }
}
```

## Campos que acepta el backend

### Visita

- `visita.fechaProgramada`
- `visita.aprobadaPorAdmin`
- `visita.aprobadaPorCliente`
- `visita.actualizadaEn`

### Compatibilidad legacy

El backend también sigue aceptando estos campos planos para no romper pantallas antiguas:

- `visitScheduledAt`
- `designApprovedByAdmin`
- `designApprovedByClient`

Si envías `visita`, ese objeto debe ser la referencia principal.

## Reglas de negocio

- Cuando el diseño está aprobado por admin, la tarea debe llevar `designApprovedByAdmin: true` y/o `visita.aprobadaPorAdmin: true`.
- Cuando el cliente aprueba la visita/diseño, debe marcarse `designApprovedByClient: true` y/o `visita.aprobadaPorCliente: true`.
- El backend sincroniza `visita` con los campos legacy de la tarea.
- Si se envía un archivo de diseño final, el frontend debe mandarlo con `tipo: diseno_final` o `tipo: diseno`.

## Subida de archivos

Para adjuntar el diseño final a una tarea:

```json
{
  "archivos": [
    {
      "nombre": "diseno-final.pdf",
      "tipo": "diseno_final",
      "url": "https://dropbox-url-o-ruta-temporal",
      "key": "dropbox:...",
      "provider": "dropbox",
      "mimeType": "application/pdf",
      "clienteId": "ABC123",
      "createdAt": "2026-06-02T14:10:00.000Z"
    }
  ]
}
```

Notas:

- Si el frontend manda el archivo por `multipart/form-data`, el backend puede resolver Dropbox o Cloudinary según el tipo.
- Para diseño final, el flujo correcto es Dropbox.
- `clienteId` debe existir; si no, la tarea no puede relacionar bien el archivo con el cliente.

## Respuesta esperada

El backend devuelve la tarea con:

- `visita`
- `visitScheduledAt`
- `designApprovedByAdmin`
- `designApprovedByClient`
- `clienteId`
- `archivos`

## Recomendación práctica

Para evitar inconsistencias, el frontend debería enviar siempre:

1. `visita` como fuente principal.
2. `visitScheduledAt`, `designApprovedByAdmin` y `designApprovedByClient` solo por compatibilidad.
3. `tipo: diseno_final` al adjuntar el diseño final.
