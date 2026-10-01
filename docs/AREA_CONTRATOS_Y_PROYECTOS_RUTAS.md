# Área de Contratos y Proyectos — rutas y datos enviados

Documenta el flujo usado en el expediente de **Clientes en proceso** y **Clientes Confirmados**
(`src/app/admin/clientes-en-proceso/page.tsx`, `src/app/admin/clientes-confirmados/page.tsx`).

## 1. Subir contrato firmado (`ContratoUploadButton`)

Componente: `src/components/admin/ContratoUploadButton.tsx`.
Mismo mecanismo que el resto de archivos del cliente (diseños, cotización formal, hoja de taller):
sube el archivo directo del navegador a Cloudinary y luego registra la URL en la tarea.

### Paso 1 — Subida directa a Cloudinary

- Función: `subirArchivoDirectoACloudinary` (`src/lib/cloudinary-direct.ts`).
- Método/URL: `POST https://api.cloudinary.com/v1_1/{NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/auto/upload`
- Body (`multipart/form-data`):
  | Campo | Valor |
  | --- | --- |
  | `file` | el PDF seleccionado |
  | `upload_preset` | `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` (unsigned) |
  | `folder` | `kuche/archivos-cliente` |
- Respuesta usada: `secure_url`, `public_id`.

### Paso 2 — Registro del archivo en el backend

- Función: `agregarArchivosTarea` (`src/lib/axios/tareasApi.ts`), invocada desde `subirArchivoCliente`
  (`src/lib/axios/archivosClienteApi.ts`).
- Método/URL: `POST /api/tareas/{tareasId}/archivos` (vía proxy `/api/proxy/api/tareas/...`).
- Body:
  ```json
  {
    "archivos": [
      {
        "nombre": "<nombre del archivo>",
        "url": "<secure_url de Cloudinary>",
        "tipo": "contrato",
        "key": "cloudinary:<public_id>",
        "provider": "cloudinary",
        "mimeType": "application/pdf",
        "clienteId": "<codigoProyecto>",
        "nivel": "final"
      }
    ]
  }
  ```
- `nivel` es opcional (`preliminar` | `final`) y se envía para distinguir el diseño inicial del diseño final presentado al cliente. Para un diseño final, el backend debe persistirlo en el archivo de la tarea y devolverlo dentro de `archivos[]` en las respuestas de Kanban.
- `tareasId` = `KanbanTask.id` del cliente (id real de la tarea/cita en backend).
- `clienteId` = `KanbanTask.codigoProyecto` (código público del proyecto, ej. `K-8821`).

### Lectura posterior (para listarlo en el expediente)

`ClientDocuments` (`src/components/admin/ClientDocuments.tsx`) combina, sin duplicar por `url`:

- `GET /api/archivos/cliente/{codigoProyecto}`
- `GET /api/archivos/tarea/{tareaId}`
- `GET /api/archivos/panel/{codigoProyecto}`

El botón de subida fuerza un refetch pasando una `key` incremental a `ClientDocuments` tras
subir con éxito.

## 2. Pagos del proyecto (`PublicStatusEditorModal`)

Componente: `src/components/admin/PublicStatusEditorModal.tsx`, abierto con el botón
**"Pagos del proyecto"** del expediente.

### Cargar datos actuales

1. `POST /api/seguimiento/login` (con fallback a `/api/seguimiento/auth` y `/api/seguimiento/access`)
   — función `autenticarSeguimientoCliente` (`src/lib/axios/seguimientoApi.ts`).
   Body: `{ "codigo": "<codigoProyecto en mayúsculas>" }` (o `code`/`clienteId` según el endpoint
   que responda). Devuelve `{ token, project }`.
2. `GET /api/seguimiento/proyecto` con header `Authorization: Bearer <token>` — función
   `obtenerProyectoSeguimiento`. Devuelve el proyecto completo (inversión, pagos, archivos, etc.).

### Guardar cambios

- Función: `actualizarEstatusPublico` (`src/lib/axios/seguimientoApi.ts`).
- Método/URL: `PATCH /api/seguimiento/proyectos/{codigoProyecto}`.
- Body:
  ```json
  {
    "estadoProyecto": "Cliente en proceso | Cliente confirmado | Proyecto entregado",
    "etapaActual": "Diseño Aprobado | Materiales en Taller | Corte CNC | Ensamble | Instalación Final",
    "fechaInicio": "YYYY-MM-DD | Por definir",
    "fechaEntrega": "YYYY-MM-DD | Por definir",
    "garantiaInicio": "YYYY-MM-DD",
    "inversion": 0,
    "pagos": {
      "anticipo": { "amount": 0, "date": "YYYY-MM-DD", "receiptLabel": "Ver recibo", "receiptImage": "<dataURL o vacío>" },
      "segundoPago": { "amount": 0, "date": "YYYY-MM-DD", "receiptLabel": "Ver recibo", "receiptImage": "<dataURL o vacío>" },
      "liquidacion": { "amount": 0, "date": "YYYY-MM-DD", "receiptLabel": "Ver recibo", "receiptImage": "<dataURL o vacío>" }
    }
  }
  ```
- `restante` (monto por pagar) se calcula en el cliente: `max(0, inversion - suma de amount de los 3 pagos)`,
  no se envía al backend.
- Los `receiptImage` de los comprobantes se guardan como data URL (PDF sin comprimir, imágenes
  comprimidas a JPEG) dentro de este mismo `PATCH`; no usan Cloudinary.

## 3. Notas

- `codigoProyecto` es la clave que conecta ambos flujos (archivos por Cloudinary/tareas y
  pagos por seguimiento); si el cliente no tiene código asignado, ambos botones quedan deshabilitados.
- El botón de contrato es independiente del de pagos: se puede subir el contrato aunque el
  proyecto de seguimiento aún no tenga datos de pagos capturados, y viceversa.
