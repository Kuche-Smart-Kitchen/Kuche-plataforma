# Reporte de contraste funcional

## Alcance
- Rama analizada: Front_plataforma (HEAD: cbf47aa)
- Rama base: origin/unificacion_main
- Metodo: analisis de diferencias con git diff y git log, sin cambiar de rama

## Resumen ejecutivo
- Cambios totales: 253 archivos
- Altas: 171
- Modificaciones: 81
- Eliminaciones: 1
- Delta estimado: 36,841 inserciones y 10,143 eliminaciones

## Funcionalidad que existe en Front_plataforma y falta en origin/unificacion_main

### 1) Capa de integracion HTTP modular con Axios
- Se agrega una capa de APIs por dominio para backend (citas, clientes, cotizaciones, kanban, tareas, levantamiento, uploads, auth, usuarios, seguimiento, catalogos).
- Centraliza configuracion de base URL y manejo de endpoints.

Archivos representativos:
- src/lib/axios/axiosConfig.ts
- src/lib/axios/index.ts
- src/lib/axios/adminWorkflowApi.ts
- src/lib/axios/citasApi.ts
- src/lib/axios/clientesApi.ts
- src/lib/axios/cotizacionesApi.ts
- src/lib/axios/equipamientoApi.ts
- src/lib/axios/kanbanApi.ts
- src/lib/axios/levantamientoConfigApi.ts
- src/lib/axios/levantamientosApi.ts
- src/lib/axios/tareasApi.ts
- src/lib/axios/uploadsApi.ts
- src/lib/axios/seguimientoApi.ts
- src/lib/axios/authApi.ts
- src/lib/axios/usuariosApi.ts
- src/lib/axios/archivosClienteApi.ts
- src/lib/axios/catalogosApi.ts

### 2) Expansión de panel administrativo
- Se incorporan páginas y componentes para flujo operativo: equipamiento, proyectos inactivos, citas, asignaciones y tablero.

Archivos representativos:
- src/app/admin/equipamiento/page.tsx
- src/app/admin/proyectos-inactivos/page.tsx
- src/components/admin/KanbanBoard.tsx
- src/components/admin/TaskDetailModal.tsx
- src/components/admin/VisitScheduleModal.tsx
- src/components/admin/CitaModal.tsx
- src/components/admin/CrearCitaModal.tsx
- src/components/admin/ClientWorkflowGrid.tsx
- src/contexts/AdminWorkflowContext.tsx

### 3) Flujo de agendado y levantamiento detallado
- Se agregan componentes y validaciones para captura de levantamiento, tipos de pared y resumen técnico.

Archivos representativos:
- src/components/agendar/LevantamientoSection.tsx
- src/components/levantamiento/LevantamientoResumen.tsx
- src/components/levantamiento/WallTypeImage.tsx
- src/components/levantamiento/WallMeasureDiagramOverlay.tsx
- src/components/levantamiento/sections/LevantamientoSections.tsx
- src/lib/validaciones/enviarCita.ts
- src/lib/validaciones/validacionesAgendaCitas.ts
- src/app/configuracion-levantamiento/page.tsx
- src/app/dashboard/configuracion-levantamiento/page.tsx

### 4) Seguimiento de clientes y archivos
- Se amplía el seguimiento con manejo de blobs/archivos y control de acceso por contexto/rol.

Archivos representativos:
- src/app/seguimiento/storage-blobs.ts
- src/lib/seguimiento-storage-blobs.ts
- src/lib/seguimiento-project.ts
- src/lib/seguimiento-access.ts
- src/hooks/useClienteArchivos.ts
- src/contexts/SeguimientoAuthContext.tsx

### 5) Seguridad/Captcha
- Integración de Turnstile y utilidades de verificación.

Archivos representativos:
- src/components/ui/Captcha.tsx
- src/lib/load-turnstile-script.ts
- src/lib/recaptcha.ts

### 6) Endpoint interno nuevo en Next.js
- Se añade API route para Instagram oEmbed.

Archivo:
- src/app/api/instagram-oembed/route.ts

### 7) Actualización de UX y contenido visual
- Cambios amplios en home, catalogo y experiencia 3D, con renovación de medios en public/images.

Archivos representativos:
- src/components/home/ExperienceSteps.tsx
- src/components/home/InstagramProfile.tsx
- src/lib/experience-steps-media.ts
- public/images/**

### 8) Documentación funcional adicional
- Se agregan múltiples documentos técnicos y de integración frontend-backend.

Archivos representativos:
- docs/DOCUMENTACION_COMPLETA.md
- docs/INTEGRACION_CITAS_COMPLETA.md
- docs/BACKEND-ENDPOINTS-CITAS-ADMIN.md
- docs/DOCUMENTACION_CITAS_FRONTEND.md
- src/docs/FRONTEND_KANBAN_INTEGRATION.md
- CAMBIOS_DISENO_FRONT_PLATAFORNA.md
- DOCUMENTACION_*.md (raiz)

## Requisitos de instalación y ejecución

### Base
- Node.js >= 20.9.0
- npm (o yarn/pnpm/bun)

### Dependencias
- Ejecutar: npm install
- Diferencia detectada contra origin/unificacion_main: se añade axios (^1.7.9)

### Variables de entorno requeridas
- NEXT_PUBLIC_API_URL
- NEXT_PUBLIC_FILE_UPLOAD_ENDPOINT
- NEXT_PUBLIC_TURNSTILE_SITE_KEY

### Variables para funcionalidad de Instagram oEmbed
- META_GRAPH_VERSION (opcional, por defecto v22.0)
- META_OEMBED_ACCESS_TOKEN
- META_APP_ID
- META_APP_CLIENT_TOKEN

### Variables opcionales de showroom
- NEXT_PUBLIC_GOOGLE_MAPS_EMBED_SRC
- NEXT_PUBLIC_SHOWROOM_ADDRESS

### Nota de despliegue
- vercel.json trae configuración de build/install y valores NEXT_PUBLIC_* para despliegue.

## Contraste directo con origin/unificacion_main
- Front_plataforma contiene una arquitectura de APIs frontend (axios) que no está en la base comparada.
- Front_plataforma incorpora nuevos contextos de autenticación y workflow por módulos.
- Front_plataforma añade endpoint interno para oEmbed de Instagram.
- Front_plataforma amplía paneles de admin/dashboard/seguimiento con nuevas páginas y modales.
- Front_plataforma trae una expansión importante de assets y documentación funcional.

## Inventario completo de archivos y commits
- Todos los archivos diferentes (253) están en: docs/ANEXO_DIFERENCIA_ARCHIVOS_FRONT_PLATAFORMA_VS_UNIFICACION_MAIN.txt
- Commits exclusivos de Front_plataforma están en: docs/ANEXO_COMMITS_FRONT_PLATAFORMA_VS_UNIFICACION_MAIN.txt
