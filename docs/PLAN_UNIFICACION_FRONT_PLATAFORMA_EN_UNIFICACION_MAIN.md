# Plan de unificacion: Front_plataforma -> unificacion_main

## Objetivo
- Integrar en `unificacion_main` la funcionalidad existente en `origin/Front_plataforma` sin perder los cambios propios ya presentes en `unificacion_main`.
- Ejecutar la unificacion por dominios funcionales y con validaciones intermedias, evitando un merge ciego de cientos de archivos en una sola operacion.

## Estado real detectado en Git

### Ramas y commits observados
- `unificacion_main` apunta a `553b691`.
- `origin/unificacion_main` apunta a `553b691`.
- `Front_plataforna` (rama local, con nombre distinto al del reporte) apunta a `553b691`.
- `origin/Front_plataforma` apunta a `b83b415`.

### Hallazgos clave
- El reporte adjunto no describe el estado actual de `unificacion_main` remoto, sino una comparacion historica previa o una rama local distinta no disponible ahora con ese mismo nombre.
- El commit citado en el reporte (`cbf47aa`) no esta disponible en el repositorio local actual.
- La funcionalidad listada en el reporte si aparece en `origin/Front_plataforma`.
- Esa funcionalidad no existe hoy en `unificacion_main`.

### Conclusiones tecnicas
- Hoy no existe un escenario de "copiar Front_plataforma a unificacion_main" ya resuelto en Git.
- El trabajo correcto es integrar una linea divergente: `origin/Front_plataforma` sobre la base actual de `unificacion_main`.
- Las dos ramas tienen cambios propios relevantes. No conviene reemplazar una por otra.

## Contraste funcional validado

### Funcionalidad presente en `origin/Front_plataforma`
- Capa HTTP modular en `src/lib/axios/*`.
- Contextos nuevos en `src/contexts/*`.
- Nuevas pantallas administrativas y de flujo en `src/app/admin/*`.
- Flujo ampliado de agendado y levantamiento.
- Endpoint interno `src/app/api/instagram-oembed/route.ts`.
- Componentes de seguimiento, blobs y autenticacion de seguimiento.
- Utilidades de captcha y runtime store.
- `vercel.json` y documentacion funcional adicional.

### Estado actual en `unificacion_main`
- No existe `src/lib/axios/axiosConfig.ts`.
- No existe `src/contexts/AdminWorkflowContext.tsx`.
- No existe `src/app/api/instagram-oembed/route.ts`.
- No existe `src/components/admin/KanbanBoard.tsx`.
- No existe `src/lib/recaptcha.ts`.
- La rama actual tiene una linea propia de trabajo fuerte en showroom, catalogo, assets, layout y varias pantallas que no deben perderse.

## Naturaleza de la divergencia

### Divergencia entre ramas
- `unificacion_main...origin/Front_plataforma`: 38 commits a la izquierda y 42 commits a la derecha.
- Existe ancestro comun, pero ambas lineas evolucionaron por separado.

### Zonas con colision esperada
- `package.json`
- `README.md`
- `src/app/admin/*`
- `src/app/dashboard/*`
- `src/app/seguimiento/*`
- `src/app/page.tsx`
- `src/app/login/page.tsx`
- `src/components/admin/*`
- `src/components/home/*`
- `src/components/levantamiento/*`
- `src/lib/*`
- `docs/*`

### Cambios de estructura que requieren cuidado
- Renombres de componentes `ui` a raiz del proyecto en `origin/Front_plataforma`.
- Archivos eliminados en una rama pero vigentes en la otra.
- Diferencias de arquitectura: capa Axios/contextos/estado de autenticacion contra implementaciones locales o mas simples en la rama actual.
- Diferencias de assets y documentacion: una rama agrega mucho material funcional y la otra conserva diagramas UML/ERD que la rama remota no trae.

## Estrategia de unificacion propuesta

### Principio rector
- Integrar por capas y por dominios, con commits pequenos, validables y reversibles.
- No hacer un `git merge` final como primer movimiento operativo.
- Mantener `unificacion_main` como rama destino.

### Rama de trabajo recomendada
- Crear una rama tecnica temporal desde `unificacion_main`, por ejemplo: `merge/front-plataforma-into-unificacion`.
- Hacer toda la integracion alli.
- Reservar `unificacion_main` para recibir el resultado cuando la rama de integracion compile y navegue correctamente.

## Plan por fases

### Fase 0. Congelamiento y baseline
- Confirmar cual es la fuente correcta: `origin/Front_plataforma` o una rama local perdida asociada al commit `cbf47aa`.
- Tomar inventario versionado de archivos por dominio.
- Generar una matriz de decisiones por archivo: conservar actual, traer remoto, fusionar manualmente, eliminar.

Entregable:
- Tabla de integracion por dominio y por archivo conflictivo.

### Fase 1. Infraestructura y dependencias
- Fusionar `package.json` y dependencias faltantes.
- Evaluar `vercel.json` y variables de entorno requeridas.
- Normalizar scripts de desarrollo y build para que soporten ambos conjuntos funcionales.

Puntos a revisar:
- `axios`
- `jspdf`, `jspdf-autotable`, `xlsx`, `sharp`, `exceljs`, `jimp`
- compatibilidad de scripts `dev`, `build` y utilidades de `scripts/`

Resultado esperado:
- Proyecto instala y compila con la union de dependencias.

### Fase 2. Primitivas compartidas y utilidades base
- Integrar primero piezas de bajo acoplamiento:
  - `src/lib/runtime-store.ts`
  - `src/lib/role-routes.ts`
  - `src/lib/formatters.ts`
  - `src/lib/process-file-types.ts`
  - `src/lib/recaptcha.ts`
  - `src/lib/load-turnstile-script.ts`
  - hooks y componentes de input/modal reutilizables
- Resolver duplicados por cambio de ubicacion de componentes (`src/components/ui/*` frente a `src/components/*`).

Resultado esperado:
- Base utilitaria unificada para soportar capas superiores.

### Fase 3. Capa de integracion HTTP y autenticacion
- Introducir `src/lib/axios/*` de forma controlada.
- Definir si la aplicacion actual va a adoptar Axios como capa principal o si se mantendra convivencia temporal con implementaciones locales.
- Integrar `AuthContext`, `SeguimientoAuthContext` y `useAuth` solo despues de estabilizar la capa HTTP.

Decision recomendada:
- Mantener una sola capa cliente de backend y evitar mezclar fetch ad hoc con Axios para los mismos dominios.
- Si hay consumo backend en la rama actual, migrarlo gradualmente hacia `src/lib/axios/*`.

Resultado esperado:
- Un contrato unico para llamadas al backend y manejo consistente de sesion/errores.

### Fase 4. Admin workflow y Kanban
- Integrar primero los modulos de mayor valor operacional:
  - `src/contexts/AdminWorkflowContext.tsx`
  - `src/components/admin/KanbanBoard.tsx`
  - `TaskDetailModal`, `VisitScheduleModal`, `CitaModal`, `CrearCitaModal`
  - paginas `src/app/admin/equipamiento/page.tsx` y `src/app/admin/proyectos-inactivos/page.tsx`
- Revisar compatibilidad con el admin actual en `unificacion_main`.

Riesgo principal:
- Conflictos de estado compartido, rutas de navegacion y contratos de datos del tablero.

Resultado esperado:
- Flujo admin integrado sin romper lo ya existente en showroom/home/catalogo.

### Fase 5. Agendado y levantamiento
- Unificar:
  - `src/app/dashboard/configuracion-levantamiento/page.tsx`
  - `src/app/configuracion-levantamiento/page.tsx` si se decide conservar ambas rutas
  - `src/components/agendar/LevantamientoSection.tsx`
  - `src/components/levantamiento/*`
  - validaciones en `src/lib/validaciones/*`
- Revisar dependencias con `src/lib/config-levantamiento.ts`, `src/lib/levantamiento-catalog.ts` y generacion PDF.

Riesgo principal:
- Diferencias en estructura de datos y local storage/configuracion persistida.

Resultado esperado:
- Un solo flujo de levantamiento coherente, con sus componentes visuales y validaciones alineadas.

### Fase 6. Seguimiento y archivos
- Integrar:
  - `src/app/seguimiento/storage-blobs.ts`
  - `src/lib/seguimiento-storage-blobs.ts`
  - `src/lib/seguimiento-project.ts`
  - `src/hooks/useClienteArchivos.ts`
  - layouts y dashboards de seguimiento
- Resolver el choque con `src/lib/seguimiento-access.ts`, que en la rama actual existe y en la remota aparece eliminado.

Decision recomendada:
- No eliminar `seguimiento-access.ts` hasta verificar si el acceso por rol de la rama actual sigue siendo necesario.

Resultado esperado:
- Seguimiento con autenticacion, archivos y permisos consolidados.

### Fase 7. Home, catalogo, experiencia y assets
- Integrar de forma selectiva los cambios visuales y de contenido.
- No aceptar automaticamente reemplazos masivos de `public/images` sin validar impacto visual y peso de build.
- Conservar la linea actual de showroom/catalogo de `unificacion_main` cuando el cambio remoto no aporte funcionalidad directa.

Decision recomendada:
- Separar "funcionalidad" de "contenido visual" en commits distintos.

Resultado esperado:
- Integracion visual controlada, sin perder identidad ni introducir deuda de assets innecesaria.

### Fase 8. Documentacion final y limpieza
- Reintegrar documentacion funcional nueva sin perder diagramas y UML vigentes de la rama actual.
- Evitar que la documentacion de una rama sustituya por completo la de la otra.
- Unificar README, variables de entorno y guias de integracion.

Resultado esperado:
- Documentacion consolidada, no destructiva.

## Orden operativo recomendado
1. Crear rama tecnica de integracion desde `unificacion_main`.
2. Integrar dependencias y configuracion de despliegue.
3. Integrar utilidades base y componentes compartidos.
4. Integrar capa Axios y autenticacion.
5. Integrar admin workflow y kanban.
6. Integrar agendado y levantamiento.
7. Integrar seguimiento y archivos.
8. Integrar assets y contenido visual de forma selectiva.
9. Consolidar documentacion.
10. Ejecutar validaciones finales y solo entonces fusionar en `unificacion_main`.

## Validaciones obligatorias por fase
- `npm install`
- `npm run lint`
- `npm run build`
- prueba manual de rutas afectadas por la fase
- prueba manual de flujos con backend real o mocks estables

## Riesgos principales
- Resolver conflictos como simples reemplazos de archivo puede borrar trabajo valioso de la rama actual.
- La capa Axios introduce contratos y variables de entorno que hoy no existen en `unificacion_main`.
- El area de admin/seguimiento depende de contexto, auth y backend; integrarla antes de la infraestructura base aumentaria el retrabajo.
- Los assets pueden inflar el repositorio y ocultar cambios funcionales relevantes si se mezclan demasiado pronto.

## Criterio de exito
- `unificacion_main` conserva lo propio de showroom/catalogo/home y suma la funcionalidad operativa de `origin/Front_plataforma`.
- Existe una sola arquitectura entendible para auth, backend, dashboard y seguimiento.
- El proyecto compila, navega y documenta claramente las variables y dependencias requeridas.

## Siguiente paso recomendado
- Preparar la matriz de integracion por archivo y arrancar la Fase 1 sobre una rama tecnica nueva.