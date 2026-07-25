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

## Gate para pasar a siguiente fase despues de Fase 7
1. Build en verde.
2. Rutas visuales priorizadas navegables.
3. Sin cambios funcionales colaterales en admin/dashboard/seguimiento.
4. Documentacion de lote actualizada.

## Pendiente transversal (no bloqueante para abrir Fase 7)
- Resolver deuda de lint heredada en `src/app/dashboard/Levantamiento-detallado/page.tsx` y otros modulos del workspace para el cierre final integral.
