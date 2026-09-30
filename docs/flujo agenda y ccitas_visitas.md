Especificación Técnica de Frontend (UI / UX / Componentes)
1. Integración de Endpoints Asumidos (Contrato Backend-Frontend)
La Agenda compone las dos fuentes existentes en el frontend: `GET /api/citas/verCitas` y `GET /api/visitas/`.
No se requiere `GET /api/agenda/events`. El filtrado de fechas pasadas y estados inactivos ocurre en la UI.

Contrato nuevo requerido en backend:

- `PATCH /api/visitas/:id/status`, body `{ status: "pending" | "in_progress" | "completed" }`. Persiste el ciclo presencial sin sobrescribir `estado` de agenda.
- `POST /api/visitas/` acepta y devuelve `tareaId` para vincular la visita a su tarjeta; el recurso también devuelve `operationalStatus`.

Para aprobar el diseño no se agrega `/api/cards/:id/client-approve-design`: la UI reutiliza `PATCH /api/tareas/:id` con `designApprovedByClient: true`, `etapa: "cotizacion"`, `estado: "pendiente"`, `citaStarted: false` y `citaFinished: false`. Este cambio de tarea es el que avanza la tarjeta.

2. Vista 1: Tablero Kanban ("Taller y Operaciones")
Columna "Diseños"
Flujo Actual de Administración:

Se muestra el componente de subida de diseño y el botón de aprobación por parte del administrador.

Nuevo Botón de Acción:

Una vez que el diseño es aprobado por el administrador, se habilita un nuevo botón en la tarjeta: [Agendar Visita].

Comportamiento del Modal/Formulario de Visita:

Al hacer clic en [Agendar Visita], se abre un modal con un formulario para capturar los datos de la visita.

Al enviar el formulario, se realiza la petición para registrar la visita con `tareaId` igual al ID de la tarjeta.

Regla visual clave: La tarjeta no cambia de columna en este tablero Kanban. Permanece en la columna "Diseños" mientras se gestiona su visita en la agenda.

3. Vista 2: Página de Agenda (/agenda)
A. Renderizado y Filtrado de Tarjetas
Fuente de datos: Consulta citas y visitas por separado y combina ambos resultados en la Agenda.

Filtros automáticos de UI:

Ocultar citas/visitas que ya pasaron de fecha u hora.

Ocultar elementos que ya no se encuentran en estatus activo.

Diferenciación Visual (Estilos CSS / Badges):

Las Citas tradicionales se muestran con su diseño y color habitual.

Las Visitas deben tener un color de fondo, borde o badge distintivo (por ejemplo, un tono azul o morado diferente al de las citas) para que el operador las identifique visualmente de inmediato.

B. Interacción y Panel de Detalle al Hacer Clic
Al hacer clic sobre una tarjeta de Visita en la agenda, se abre un modal o panel lateral de detalle que permite:

Consultar y Editar: Ver los datos de la visita y modificar la información si es necesario.

Ciclo de Vida Operativo (Botones secuenciales):

[Comenzar Cita / Visita]: Cambia el estatus visual a en proceso.

[Terminar Cita / Visita]: Concluye la fase presencial.

Aprobación del Diseño:

Incluir la acción/botón de [Aprobar Diseño por el Cliente].

Al hacer clic aquí, se ejecuta la petición que marca la visita como terminada y actualiza automáticamente el flujo de la tarjeta.

En la interfaz, la tarjeta se actualiza para reflejar que la visita concluyó y que el diseño fue aprobado (lo que a su vez avanza la tarjeta en el flujo general de la aplicación).

4. Diagrama de Flujo de Interfaz (UI State Machine)
Plaintext
[Tablero Kanban: Columna Diseños]
       │
       ├── 1. Subir Diseño & Aprobar (Admin)
       └── 2. Habilita botón [Agendar Visita] ──> Abre Formulario/Modal
              │
              └─ (Se crea visita) -> La tarjeta se MANTIENE visualmente en "Diseños"
       
[Página de Agenda]
       │
       ├── Muestra Citas y Visitas (Diferenciadas por color / Filtra pasadas)
       └── Clic en tarjeta de Visita ──> Abre Panel de Detalle (Consulta y Edición)
              │
              ├── [Comenzar Visita]
              ├── [Terminar Visita]
              └── [Aprobar Diseño por el Cliente] 
                     │
                     └─ (Dispara actualización de UI y avanza la tarjeta de estatus)

5. Contrato backend pendiente
El detalle de rutas, métodos, payloads, permisos, transiciones, respuestas y casos de aceptación está en
[`CONTRATO_BACKEND_OPERACIONES_AGENDA.md`](CONTRATO_BACKEND_OPERACIONES_AGENDA.md). La ruta nueva
`PATCH /api/visitas/:id/status` y los campos `tareaId` / `operationalStatus` deben existir en backend
para que el ciclo operativo persista entre sesiones. La aprobación de la tarjeta reutiliza la
actualización existente `PATCH /api/tareas/:id`.