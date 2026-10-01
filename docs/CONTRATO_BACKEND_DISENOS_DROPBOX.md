# Contrato Backend: Diseños en Dropbox

Este contrato separa el almacenamiento de diseños del resto de documentos y define cómo relacionar cada archivo con su tarea y cliente. El frontend ya dirige los diseños a la ruta propuesta aquí; el backend debe implementar la ruta y devolver la metadata indicada para que la tarjeta conserve su estado al recargar.

## 1. Decisión de almacenamiento

| Tipo de archivo | Almacenamiento | Flujo frontend |
| --- | --- | --- |
| Diseño inicial o revisado (`tipo=diseno`, `nivel=preliminar`) | Dropbox | `POST /api/tareas/:tareaId/archivos/dropbox` |
| Diseño final (`tipo=diseno`, `nivel=final`) | Dropbox | `POST /api/tareas/:tareaId/archivos/dropbox` |
| Levantamiento, cotización formal, hoja de taller, contrato, comprobantes de pago y otros archivos | Cloudinary | Se conserva el flujo existente de `subirArchivoCliente` y `POST /api/tareas/:tareaId/archivos` para registrar metadata. |

La decisión de proveedor debe tomarse por tipo en el frontend: `diseno` va a Dropbox y los demás tipos continúan en Cloudinary. No mover ni cambiar las rutas vigentes de Cloudinary.

## 2. Nueva ruta requerida

```http
POST /api/tareas/:tareaId/archivos/dropbox
Authorization: Bearer <token de sesión>
Content-Type: multipart/form-data
```

La llamada se envía desde el navegador mediante el proxy configurado en Axios (`/api/proxy/api/tareas/...`). El backend recibe los siguientes campos multipart:

| Campo | Tipo | Requerido | Descripción |
| --- | --- | --- | --- |
| `file` | binario | Sí | Archivo de diseño seleccionado. |
| `clienteId` | string | Sí | Código estable de cliente/proyecto (`codigoProyecto`); el frontend usa el ID de tarea como último fallback si la tarjeta no tiene código. |
| `tipo` | string | Sí | Valor fijo `diseno`. |
| `nivel` | enum | Sí | `preliminar` para el diseño inicial/revisión, `final` para el diseño aceptado presentado al cliente. |

El `tareaId` de la URL es la relación autoritativa con Kanban. Guardar ese mismo valor como `tareasId` en metadata por compatibilidad con los endpoints actuales de lectura de archivos. Validar que la tarea exista y que el usuario tenga rol autorizado (mínimo `admin` para `nivel=final`); no confiar en `clienteId` enviado sin verificar que corresponda a la tarea.

### Ejemplo lógico del request

```text
file: <bytes del archivo>
clienteId: K-8821
tipo: diseno
nivel: final
```

## 3. Operación en backend

1. Validar autenticación, rol, `tareaId`, `clienteId`, `tipo`, `nivel`, extensión/MIME y límites de tamaño.
2. Subir el contenido al Dropbox configurado en backend. Las credenciales/tokens de Dropbox permanecen exclusivamente en servidor; nunca devolverlos ni enviarlos al navegador.
3. Crear o actualizar un enlace compartido descargable/visible para el frontend. La interfaz usa `url` para preview y descarga.
4. Registrar de forma persistente la metadata asociada tanto a la tarea como al código de cliente/proyecto.
5. Devolver éxito solo cuando Dropbox y la persistencia de la relación hayan terminado. Si Dropbox acepta el archivo pero falla el registro, limpiar el archivo remoto o informar un fallo recuperable; no responder `success: true`.

Convención de carpeta sugerida en Dropbox:

```text
/Kuche/<clienteId>/disenos/<tareaId>/<nivel>/<nombre-archivo>
```

Sanitizar `clienteId`, `tareaId` y nombre de archivo antes de formar rutas. Evitar sobrescrituras accidentales; permitir versiones o nombres únicos.

## 4. Metadata que debe guardarse

Guardar y devolver al menos:

| Campo | Tipo | Ejemplo |
| --- | --- | --- |
| `_id` | string/ObjectId | ID estable del registro de archivo. |
| `tareasId` | string/ObjectId | ID de la tarea; debe coincidir con `:tareaId`. |
| `clienteId` | string | `K-8821`. |
| `tipo` | string | `diseno`. |
| `nivel` | enum | `preliminar` o `final`. |
| `nombre` | string | Nombre original del archivo. |
| `url` | string | Enlace compartido de Dropbox usado por la interfaz. |
| `provider` | string | `dropbox`. |
| `key` | string | Identificador/ruta Dropbox estable, por ejemplo `path_lower`. |
| `mimeType` | string | MIME recibido o detectado por backend. |
| `createdAt` | fecha ISO | Fecha de registro. |

Guardar esta metadata en el arreglo de archivos de la tarea que se entrega como `archivos[]` en los endpoints Kanban. Mantener también la lectura por `GET /api/archivos/tarea/:tareaId` y, si aplica, `GET /api/archivos/cliente/:clienteId`.

## 5. Respuesta requerida

Formato compatible con el cliente del frontend:

```json
{
  "success": true,
  "message": "Diseño almacenado en Dropbox",
  "data": {
    "_id": "ID_ARCHIVO",
    "tareasId": "ID_TAREA",
    "clienteId": "K-8821",
    "tipo": "diseno",
    "nivel": "final",
    "nombre": "render-final.pdf",
    "url": "https://www.dropbox.com/scl/fi/.../render-final.pdf?rlkey=...&dl=0",
    "key": "/Kuche/K-8821/disenos/ID_TAREA/final/render-final.pdf",
    "provider": "dropbox",
    "mimeType": "application/pdf",
    "createdAt": "2026-10-01T12:00:00.000Z"
  }
}
```

El frontend también acepta el registro bajo `data.archivo` o `data.file`, y toma el enlace de `url`, `sharedUrl` o `link`; aun así, se recomienda estandarizar `data` directamente con el formato anterior. `success: true` sin metadata y enlace es inválido para la UI.

## 6. Lectura Kanban y estabilidad tras recarga

`GET /api/kanban/disenos` y cualquier endpoint que entregue la tarea deben devolver `archivos[]` con `nivel`, `provider` y `url`. Ejemplo:

```json
{
  "_id": "ID_TAREA",
  "etapa": "disenos",
  "designApprovedByAdmin": true,
  "designApprovedByClient": false,
  "archivos": [
    {
      "_id": "ID_ARCHIVO",
      "nombre": "render-final.pdf",
      "tipo": "diseno",
      "nivel": "final",
      "provider": "dropbox",
      "url": "https://www.dropbox.com/scl/fi/.../render-final.pdf?rlkey=...&dl=0"
    }
  ]
}
```

El frontend deriva los controles de estos datos persistidos:

- No hay archivo final: mostrar las acciones permitidas según archivos existentes y aprobación administrativa.
- Existe `archivos[].nivel === "final"` y `designApprovedByClient !== true`: ocultar subidas y agendamiento; mostrar solo **Aprobar por cliente** en el tablero de admin y en Aprobación de Diseños.
- `designApprovedByClient === true` y tarea en `etapa: "cotizacion"`: la tarjeta sale de Diseños y aparece en Cotización.

El backend debe devolver `designApprovedByAdmin`, `designApprovedByClient`, `etapa` y metadata de archivos en lecturas Kanban posteriores a una recarga. No inferir aprobaciones únicamente por existencia de un archivo ni reiniciar flags durante la subida.

## 7. Errores y códigos HTTP

| HTTP | Caso |
| --- | --- |
| `400` | Falta `file`, `clienteId`, `tipo` o `nivel`; valores/formato inválidos. |
| `401` / `403` | Sesión ausente o rol sin permiso. |
| `404` | Tarea inexistente. |
| `413` | Archivo excede límite configurado. |
| `415` | Tipo de archivo no permitido. |
| `5xx` | Error de Dropbox o persistencia de metadata. |

Responder errores como `{ "success": false, "message": "..." }`. El cliente no debe mostrar alerta de éxito si la respuesta HTTP o `success` falla, o si falta la metadata requerida.

## 8. Compatibilidad y migración

Los archivos anteriores guardados en Cloudinary no cambian automáticamente de proveedor. Para conservarlos, no reescribir sus registros. Si deben estar en Dropbox, crear una migración que copie los binarios, preserve cliente/tarea y nivel, confirme la lectura y solo entonces cambie el proveedor; de lo contrario, volver a subirlos desde Operaciones.

Los registros de diseño históricos sin `nivel` no permiten distinguir de forma segura el diseño inicial del final. Migrarlos con una regla revisada por negocio o volver a cargarlos; no marcarlos automáticamente como `final`.

## 9. Criterios de aceptación

1. Cargas iniciales y finales de tipo `diseno` llegan a Dropbox y quedan persistidas con `provider: "dropbox"` y el `nivel` correcto.
2. Un archivo final relaciona el `tareaId` de URL con `clienteId` de la tarjeta y se devuelve en `GET /api/kanban/disenos`.
3. Recargar la página mantiene el final identificado y deja visible solamente la acción de aprobación del cliente.
4. Una subida fallida en Dropbox o en persistencia devuelve `success: false`; la UI muestra el error y no marca el archivo como cargado.
5. Cotizaciones, levantamientos, hojas de taller, contratos y comprobantes siguen el flujo Cloudinary actual sin cambiar sus rutas ni metadata.