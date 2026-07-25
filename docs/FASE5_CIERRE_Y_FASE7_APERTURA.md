# Cierre Fase 5 y Apertura Fase 7

Fecha: 2026-07-24
Rama de trabajo: unificacion_main (integracion incremental)

## Fase 5: Estado de cierre

### Objetivo de fase
Consolidar flujo de agendado/levantamiento con cambios seguros, reversibles y validados por build.

### Bloques cerrados en esta iteracion
1. Hidratacion inicial de Seccion A extraida a helper dedicado.
2. Calculo de metricas/costos extraido a helper dedicado.
3. Catalogo showroom y resumen de seleccion extraidos a helper dedicado.
4. Escenarios y calculo de referencia (cateo) extraidos a helper dedicado.

### Archivos clave de Fase 5
- src/app/dashboard/Levantamiento-detallado/page.tsx
- src/app/dashboard/Levantamiento-detallado/logica_Levantamiento_y_cotizacion/sectionA.ts
- src/app/dashboard/Levantamiento-detallado/logica_Levantamiento_y_cotizacion/calculos.ts
- src/app/dashboard/Levantamiento-detallado/logica_Levantamiento_y_cotizacion/showroomCatalog.ts
- src/app/dashboard/Levantamiento-detallado/logica_Levantamiento_y_cotizacion/escenarios.ts

### Evidencia de validacion
1. Build de aplicacion: OK.
2. Smoke seguimiento por backend: OK para NY277S, US3XXB y HM7ACW.
3. Lint focalizado de archivos Fase 5: con errores preexistentes en `Levantamiento-detallado/page.tsx` (reglas `react-hooks/set-state-in-effect` y `react-hooks/preserve-manual-memoization`).

### Criterio de cierre aplicado
- Fase 5 se considera cerrada funcionalmente para continuar el orden de fases porque:
	- la modularizacion objetivo quedo completada,
	- el build esta en verde,
	- los smoke E2E de seguimiento siguen en verde.
- Se mantiene una excepcion de calidad pendiente: sanear lint de la pantalla de levantamiento antes del gate final de unificacion.

### Riesgo residual Fase 5
- Existen deltas amplios contra origin/Front_plataforma en otras rutas de dashboard/levantamiento y componentes relacionados.
- El lint global del workspace sigue fallando por deuda preexistente en modulos no pertenecientes al cierre de este bloque.

## Fase 7: Apertura

### Objetivo de apertura
Iniciar integracion selectiva de cambios visuales y de contenido sin reemplazos masivos ni regresiones funcionales.

### Principios activos
1. Priorizar funcionalidad sobre estetica.
2. No reemplazar assets en bloque.
3. Integrar cambios visuales por lotes pequenos con build por lote.
4. Separar commits funcionales de commits visuales.

### Inventario inicial de candidatos (alto nivel)
- app: page, experiencia, catalogo, acabados, agendar, aliados
- components/home: FeaturedProjects, ExperienceSteps, InstagramProfile
- components/catalogo: ProjectCard
- public/images: revisar solo assets estrictamente usados por vistas priorizadas

### Primer lote recomendado de Fase 7
1. Home y experiencia: textos/estructuras ligeras sin tocar rutas API.
2. Catalogo: ajustes visuales de cards y secciones sin tocar contrato de datos.
3. Verificacion por lote: build + revision manual de responsive desktop/mobile.

### Avance ejecutado (Lote 1)
1. Integrado nuevo bloque visual `ExperienceSteps` en Home.
2. Ajustados titulos/descripciones en `FeaturedProjects` (solo contenido visual).
3. Validacion del lote: build OK.
4. Validacion de no regresion critica: smoke seguimiento backend OK (NY277S, US3XXB, HM7ACW).

### Avance ejecutado (Lote 2)
1. Integrado bloque `InstagramProfile` en Home.
2. Agregada ruta API `instagram-oembed` con manejo de credenciales/env y errores de red.
3. Degradacion controlada: si faltan credenciales Meta, el frontend muestra embed directo sin romper la pagina.
4. Validacion del lote: build OK + smoke seguimiento backend OK (NY277S, US3XXB, HM7ACW).

### Avance ejecutado (Lote 3)
1. Ajuste de robustez en `instagram-oembed`: respuestas de fallback con `status 200` para evitar ruido de error en cliente cuando falta token Meta o hay fallo upstream.
2. Ajuste de UX en Home: renombrado encabezado de `ExperienceSteps` a "Ruta de tu proyecto" para diferenciar secciones y reducir ambiguedad visual.
3. Verificacion visual local en Home: secciones `FeaturedProjects`, `ExperienceSteps` e `Instagram` presentes.
4. Validacion del lote: build OK + smoke seguimiento backend OK (NY277S, US3XXB, HM7ACW).

### Avance ejecutado (Lote 4)
1. Corregidos caracteres corruptos en testimonios (render de comillas en citas) para eliminar artefactos visuales en Home.
2. Ajustes de espaciado/posicion de numerales en `experiencia/page.tsx` para mejorar consistencia visual sin cambiar contratos ni logica de datos.
3. Validacion del lote: build OK + smoke seguimiento backend OK (NY277S, US3XXB, HM7ACW).

### Avance ejecutado (Lote 5)
1. Catalogo: agregado resumen visual de filtros activos y conteo de resultados (`x de y proyectos`) para mejorar orientacion del usuario.
2. Catalogo: agregado estado vacio con accion de recuperacion (`Mostrar todos`) para robustez de navegacion por filtros.
3. Alcance controlado: sin cambios en contratos de `ProjectCard` ni en estructura de datos de proyectos.
4. Validacion del lote: build OK + smoke seguimiento backend OK (NY277S, US3XXB, HM7ACW).

### Avance ejecutado (Lote 6)
1. Catalogo: filtros sincronizados con URL (`categoria`, `subcategoria`) para enlaces compartibles y recuperacion de contexto.
2. Catalogo: agregado CTA de "Reiniciar filtros" cuando el usuario sale de la combinacion por defecto.
3. Ajuste de accesibilidad UX en chips de filtros: `focus-visible` + estados hover mas claros.
4. Bloqueador tratado en fase: el uso de `useSearchParams` rompia build estatico por requisito de `Suspense`; se resolvio migrando a sincronizacion con `window.history` en cliente, manteniendo comportamiento sin romper prerender.
5. Validacion del lote: build OK + smoke seguimiento backend OK (NY277S, US3XXB, HM7ACW).

## Gate para pasar a siguiente fase despues de Fase 7
1. Build en verde.
2. Rutas visuales priorizadas navegables.
3. Sin cambios funcionales colaterales en admin/dashboard/seguimiento.
4. Documentacion de lote actualizada.

## Pendiente transversal (no bloqueante para abrir Fase 7)
- Resolver deuda de lint heredada en `src/app/dashboard/Levantamiento-detallado/page.tsx` y otros modulos del workspace para el cierre final integral.

## Cierre Fase 7 (formal)

### Gate de salida verificado
1. Build en verde: cumplido en todos los lotes ejecutados.
2. Rutas visuales priorizadas navegables: Home, Catalogo y Experiencia en estado estable.
3. Sin regresiones funcionales colaterales en seguimiento: smoke backend continuo en verde (NY277S, US3XXB, HM7ACW).
4. Documentacion de lotes actualizada: cumplido.

## Fase 8: Apertura

### Objetivo de apertura
Avanzar convergencia estructural entre ramas (contratos y normalizacion de datos) manteniendo compatibilidad hacia atras y build estable.

### Principios activos de Fase 8
1. Asumir riesgo tecnico con mitigacion inmediata en la misma fase.
2. Introducir capas adaptadoras antes de endurecer contratos.
3. Preservar comportamiento visible mientras se limpia estructura interna.
4. Validar cada lote con build + smoke seguimiento.

### Avance ejecutado (Fase 8 - Lote 1)
1. Catalogo: agregado adaptador de normalizacion de datos en `src/lib/catalog-normalization.ts`.
2. Catalogo: flujo de filtros y conteos migrado a proyectos normalizados en `src/app/catalogo/page.tsx`.
3. Catalogo/Modal: el detalle de hotspot ahora se renderiza de forma consistente (siempre disponible via normalizacion) en `src/components/catalogo/ProjectCard.tsx`.
4. Validacion del lote: build OK + smoke seguimiento backend OK (NY277S, US3XXB, HM7ACW).

### Avance ejecutado (Fase 8 - Lote 2)
1. Catalogo: separada tipologia de datos en `src/lib/catalog-types.ts` con dos capas explicitas: `CatalogProjectInput` (fuente flexible) y `CatalogProject` (normalizado estricto).
2. Catalogo: `normalizeCatalogProjects` actualizado para producir estructura estricta (hotspots/detail/imageSrc/imageAlt y objectFit garantizados).
3. Catalogo: `ProjectCard` migrado a consumo exclusivo de tipo normalizado estricto, reduciendo opcionales y acercando contrato interno al objetivo de convergencia.
4. Validacion del lote: build OK + smoke seguimiento backend OK (NY277S, US3XXB, HM7ACW).

### Avance ejecutado (Fase 8 - Lote 3)
1. Limpieza de deuda puntual de lint en `useFocusTrap` eliminando `any` y usando `focus({ preventScroll: true })` de forma tipada.
2. Limpieza de deuda puntual en `HorizontalScrollStrip`: la API de ref quedo alineada con el uso real por callback, sin mutar refs externos desde el componente.
3. Validacion del lote: build OK.
4. Resultado esperado de calidad: estos cambios reducen deuda nueva; el lint global sigue reflejando deuda heredada amplia fuera del lote actual.

### Siguiente lote previsto en Fase 8
1. Endurecer contrato interno de `ProjectCard` de forma progresiva (hotspots/detalle requeridos en capa normalizada) sin migracion masiva de dataset en un solo paso.

## Analisis de cierre integral (estado actual)

### Avances consolidados
1. Fase 5 cerrada funcionalmente (modularizacion Levantamiento) con build verde.
2. Fase 7 cerrada formalmente por lotes visuales (Home/Experiencia/Catalogo) con estabilidad funcional.
3. Fase 8 en marcha con convergencia estructural de catalogo:
	- adaptador de normalizacion,
	- tipologia separada (`input` vs `normalizado`),
	- `ProjectCard` operando sobre contrato estricto normalizado.

### Gates verificados
1. Build de aplicacion: OK.
2. Navegacion principal en rutas priorizadas: operativa.

### Bloqueadores vigentes para concluir unificacion total
1. Lint global en rojo: 99 problemas (49 errores, 50 warnings), con foco en reglas `react-hooks/set-state-in-effect` y deuda heredada multi-modulo.
2. Divergencia restante entre ramas: 462 archivos totales (171 en `src/`), por lo que la convergencia completa aun no esta finalizada.
3. Smoke backend de seguimiento con inestabilidad por rate-limit `HTTP 429` en algunas corridas (bloqueador externo/intermitente para cerrar gate E2E continuo).

### Criterio para poder declarar concluido
1. Lint global en verde o con excepciones explicitamente acotadas/aprobadas por fase.
2. Reducir brecha de convergencia en `src/` a alcance residual documentado y aceptado.
3. Smoke de seguimiento estable en corridas consecutivas sin 429 (o con politica de retry/backoff acordada para gate CI).
