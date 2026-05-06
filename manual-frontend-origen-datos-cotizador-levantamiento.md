# Manual frontend: origen de datos por pantalla e input

Este documento indica, para cada dato funcional de Cotizador y Levantamiento Detallado:

- En qué pantalla/ruta se captura o configura.
- Qué input/control lo modifica.
- De dónde sale cuando no es captura directa.
- Dónde se persiste.

## 1. Pantallas involucradas

- `/dashboard/Levantamiento-detallado`
- `/dashboard/cotizador`
- `/dashboard/configuracion-levantamiento`
- (solo referencia visual de muros) `/dashboard/referencia-tipos-pared`

## 2. Fuentes globales de datos (base)

## 2.1 localStorage y claves usadas

- `kuche.config.levantamiento.v2`
  - Configuración global del levantamiento: escenarios, IVA, margen, factor hasta techo, catálogo de materiales y precios de extras.
- `kuche.catalogoKuche.v1`
  - Catálogo editable del cotizador formal (categorías e ítems de materiales).
- `kuche-kanban-tasks`
  - Tarjetas del tablero Kanban con sus cotizaciones preliminares/formales.
- `kuche-active-cita-task`
  - Id de la tarea/cita activa para levantar preliminar.
- `kuche-active-cotizacion-formal-task`
  - Id de tarea activa para cotización formal.
- `kuche-cita-return-url`
  - Ruta de regreso al cerrar flujo.
- `kuche_project_${codigoProyecto}`
  - Snapshot para seguimiento público/cliente.

## 2.2 Catálogos por defecto (fallback)

- Levantamiento detallado usa defaults de:
  - `createDefaultLevantamientoConfig()`
  - `DEFAULT_LEVANTAMIENTO_MATERIALES`
  - `defaultExtrasPrecios()`
  - `defaultLevantamientoDetalle()`
- Cotizador usa catálogo base en:
  - `initialCatalogoKuche`

## 3. Levantamiento detallado: mapeo de datos

Pantalla: `/dashboard/Levantamiento-detallado`

## 3.1 Sección A · Datos del proyecto

| Dato | Input/control en UI | Estado/estructura | Origen inicial | Persistencia |
|---|---|---|---|---|
| Cliente | Input `levantamiento-cliente` | `clientName` | Si hay cita activa, se precarga desde la tarea Kanban (`task.project`) | Se guarda dentro de `PreliminarData.client` en la tarea Kanban |
| Tipo de proyecto | `CatalogProjectTypeField` | `projectType` | Default: primer valor de `CATALOG_PROJECT_TYPES`; si hay preliminar previo, se toma el último | Se guarda en `PreliminarData.projectType` |
| Ubicación | Input de ubicación | `location` | Si hay cita activa: `task.location` (si existe) | Se guarda en `PreliminarData.location` |
| Largo (m) | Input numérico `levantamiento-largo` | `largo` | Usuario o precarga del último preliminar de la tarea | Se guarda en `PreliminarData.largo` y en `PreliminarData.levantamiento.largo` |
| Alto (m) | Input numérico `levantamiento-alto` | `alto` | Usuario o precarga del último preliminar | Se guarda en `PreliminarData.alto` y en `PreliminarData.levantamiento.alto` |
| Semanas mín/máx | Inputs `levantamiento-semanas-min/max` | `deliveryWeeksMin`, `deliveryWeeksMax` | Usuario o parseo de `pre.date` (último preliminar) | Se serializa como etiqueta en `PreliminarData.date` |
| ¿Con isla? | Botones Sí/No | `levantamiento.conIsla` | Vacío por defecto | Se guarda en `PreliminarData.levantamiento` |
| ¿Hasta el techo? | Botones Sí/No | `levantamiento.medidasGenerales.hastaTecho` | `false/undefined` por defecto | Se guarda en `PreliminarData.levantamiento` |
| Comentarios sección A | Textarea | `levantamiento.sectionComments.a` | Vacío por defecto | Se guarda en `PreliminarData.levantamiento` |

## 3.2 Sección B · Medidas de paredes

| Dato | Input/control en UI | Estado/estructura | Origen inicial | Persistencia |
|---|---|---|---|---|
| Cantidad de paredes (1-4) | Tarjetas con icono de pared | `levantamiento.wallSlotCount` | 0 por defecto | En `PreliminarData.levantamiento` |
| Modo alterno “Otra situación de muros” | Botón dedicado | `levantamiento.wallMedidasModoLibre`, `wallOtro` | `false` y vacío | En `PreliminarData.levantamiento` |
| Tipo por pared | Selección de tipo de muro | `levantamiento.wallMeasures[wall-i].__typeId` | Vacío por slot | En `PreliminarData.levantamiento` |
| Alias de pared | Input alias | `levantamiento.wallMeasures[wall-i].__alias` | Vacío | En `PreliminarData.levantamiento` |
| Cotas de pared | Inputs dinámicos según tipo (ancho, alto, vanos, etc.) | `levantamiento.wallMeasures[wall-i][field]` | Vacío por defecto | En `PreliminarData.levantamiento` |
| Comentarios sección B | Textarea | `levantamiento.sectionComments.b` | Vacío | En `PreliminarData.levantamiento` |

## 3.3 Sección C · Electrodomésticos

| Dato | Input/control en UI | Estado/estructura | Origen inicial | Persistencia |
|---|---|---|---|---|
| Selección por ítem de catálogo | Checkbox “Seleccionar” por ítem | `levantamiento.applianceDocumentIds[]` | Lista vacía | En `PreliminarData.levantamiento` |
| Medidas por ítem | Inputs ancho/alto/fondo | `levantamiento.applianceMeasures[id]` | Mapa inicial vacío por ítem | En `PreliminarData.levantamiento` |
| “Otro electrodoméstico” incluir | Checkbox | `levantamiento.applianceOtroInDocument` | `false` | En `PreliminarData.levantamiento` |
| “Otro electrodoméstico” detalle | Textarea + medidas | `levantamiento.applianceOtro` | Vacío | En `PreliminarData.levantamiento` |
| Comentarios sección C | Textarea | `levantamiento.sectionComments.c` | Vacío | En `PreliminarData.levantamiento` |

## 3.4 Sección D · Showroom digital

| Dato | Input/control en UI | Estado/estructura | Origen inicial | Persistencia |
|---|---|---|---|---|
| Cubierta seleccionada | Tarjeta/carrusel de materiales | `selectedCubierta` | `null` | Se serializa en `PreliminarData.cubierta` |
| Frentes seleccionados | Tarjetas multi-select | `selectedFrenteIds[]` | `[]` | Se serializa concatenado en `PreliminarData.frente` |
| Herraje seleccionado | Tarjeta/carrusel | `selectedHerraje` | `null` | Se serializa en `PreliminarData.herraje` |
| Búsqueda de material | Input buscar | `materialSearch` | Vacío | Solo estado UI |
| Precio por metro mostrado | Texto de tarjeta | derivado | Sale de `resolvePrecioPorMetroForShowroomSelection()` sobre `levantamientoConfig.materiales` | No se persiste por separado |
| Comentarios sección D | Textarea | `levantamiento.sectionComments.d` | Vacío | En `PreliminarData.levantamiento` |

## 3.5 Sección E · Extras

| Dato | Input/control en UI | Estado/estructura | Origen inicial | Persistencia |
|---|---|---|---|---|
| Cantidad por luminario | Toggle + controles +/- por tipo | `levantamiento.lightingQty[id]` | `defaultLightingQty()` (0) | En `PreliminarData.levantamiento` |
| Medidas por luminario | Inputs ancho/alto/fondo en detalle | `levantamiento.lightingMeasures[id]` | Mapa inicial vacío | En `PreliminarData.levantamiento` |
| “Otro luminario” incluir | Checkbox | `levantamiento.lightingOtroInDocument` | `false` | En `PreliminarData.levantamiento` |
| “Otro luminario” descripción/precio | Textarea + inputs | `levantamiento.lightingOtro` | Vacío | En `PreliminarData.levantamiento` |
| Cantidad accesorios especiales | Stepper por ítem | `levantamiento.specialAccessoriesQty[id]` | `defaultSpecialAccessoriesQty()` (0) | En `PreliminarData.levantamiento` |
| Precio unitario de extras | No se captura aquí | derivado de config | Sale de `levantamientoConfig.extrasPrecios` | Config global (`kuche.config.levantamiento.v2`) |
| Comentarios sección E | Textarea | `levantamiento.sectionComments.e` | Vacío | En `PreliminarData.levantamiento` |

## 3.6 Escenarios y cierre

| Dato | Input/control en UI | Estado/estructura | Origen inicial | Persistencia |
|---|---|---|---|---|
| Escenario visual seleccionado | Tarjetas Esencial/Tendencia/Premium | `selectedScenario` | `"esencial"` | Se usa para referencia/cateo en cálculo y PDF |
| IVA aplicado | No editable aquí | `levantamientoConfig.ivaPercent` | Desde config global o default 0.16 | `kuche.config.levantamiento.v2` |
| Margen de rango | No editable aquí | `levantamientoConfig.marginPercent` | Desde config global o default 0.08 | `kuche.config.levantamiento.v2` |
| Factor hasta techo | No editable aquí (solo activar Sí/No) | `levantamientoConfig.factorHastaTecho` + `medidasGenerales.hastaTecho` | Config global + toggle de sección A | Config global + preliminar |
| Guardado final de preliminar | Botones de cierre | `buildPreliminarDataFromForm()` | Datos del formulario + métricas calculadas | Se guarda en `kanbanStorageKey` como nueva preliminar |

## 4. Cotizador formal: mapeo de datos

Pantalla: `/dashboard/cotizador`

## 4.1 Sección A · Datos del proyecto

| Dato | Input/control en UI | Estado/estructura | Origen inicial | Persistencia |
|---|---|---|---|---|
| Cliente | Input `cotizador-cliente` + datalist + modal “Nuevo” | `client`, `clients[]` | Precarga desde último preliminar de la tarea activa formal; fallback a datos de tarjeta | Se guarda en cotización formal dentro de Kanban |
| Tipo de proyecto | `CatalogProjectTypeField` | `projectType` | Default catálogo; puede precargarse desde preliminar previo | En cotización formal |
| Ubicación | Input `cotizador-ubicacion` | `location` | Precarga de preliminar/tarjeta si existe | En cotización formal |
| Semanas min/max | Inputs numéricos | `deliveryWeeksMin`, `deliveryWeeksMax` | Parseadas desde `pre.date` si existe | Se guarda como etiqueta de entrega |
| Largo/alto | Inputs numéricos | `largo`, `alto` | Precarga desde preliminar previo | En cotización formal |

## 4.2 Sección B · Refinamiento y especificaciones

| Dato | Input/control en UI | Estado/estructura | Origen inicial | Persistencia |
|---|---|---|---|---|
| Catálogo de materiales | Grid por categoría + qty steppers | `catalogoKuche`, `quantities` | Se intenta cargar desde `kuche.catalogoKuche.v1`; fallback `initialCatalogoKuche` | Catálogo persistente en `kuche.catalogoKuche.v1`; cantidades se guardan al cerrar cotización |
| Material base / color / espesor efectivos | Selección implícita por categoría | `effectiveMaterialBaseId`, `effectiveColorId`, `effectiveThicknessId` | Fallback a defaults; si hay cantidades, toma el ítem con mayor qty de cada categoría | Se reflejan en PDF/formal |
| Importar Excel | Input file `.xlsx/.xls` | `excelImportSummary`, `excelPreviewLines`, posible merge a catálogo/cantidades | Archivo del usuario | Se usa para poblar vista y totales de la sesión |
| Buscar material | Input buscar | `materialSearch` | Vacío | Solo UI |
| Agregar/editar/eliminar material | Modal y menú contextual | `newItem*`, `editingItemId`, `catalogoKuche` | Usuario | Catálogo persiste en `kuche.catalogoKuche.v1` |
| Destacar para PDF | Botón estrella | `pdfHighlightedItems[id]` | `false` por default | Se usa en PDF formal |
| Coeficiente de Operación (utilidad) | Numeric + botones +/- | `utilidadPct` | 30 por defecto | En cálculo de totales formal |
| Flete / logística | Numeric + botones +/- | `fletePct` | 2 por defecto | En cálculo de totales formal |
| IVA del formal | No editable (fijo) | constante 16% | Fijo en código | Se aplica en totales formal |

## 4.3 Sección C · Imágenes de referencia

| Dato | Input/control en UI | Estado/estructura | Origen inicial | Persistencia |
|---|---|---|---|---|
| Imágenes de referencia | Input file `image/*` (multiple) | `referenceImages[]` | Vacío | Se incluyen en PDF; se guardan como parte de la cotización formal según flujo de guardado |

## 4.4 Cierre y guardado formal

| Dato | Input/control en UI | Estado/estructura | Origen inicial | Persistencia |
|---|---|---|---|---|
| Total sin IVA, IVA, total neto | Panel de resumen | `precioTotalSinIva`, `montoIva`, `totalNeto` | Derivado de cantidades, utilidad y flete | Persistido en cotización formal de la tarea |
| PDF formal y hoja de taller | Botones de generar/terminar | `buildWorkshopPdf...`, `saveFormalPdf(...)` | Datos de secciones A/B/C | Se guardan por clave (`formalPdfKey`, `workshopPdfKey`) y se referencian en Kanban |
| Paso a seguimiento | Botones terminar | actualización de tarea y etapa | Usa tarea activa en localStorage | Persistencia en `kuche-kanban-tasks` y `kuche_project_${codigoProyecto}` |

## 5. Configuración central que alimenta Levantamiento

Pantalla: `/dashboard/configuracion-levantamiento`

## 5.1 Inputs de configuración

| Grupo | Input/control | Campo de config | Dónde impacta |
|---|---|---|---|
| Escenarios | Numeric por Esencial/Tendencia/Premium | `scenarioPrices.*` | Cateo visual en Levantamiento (referencia) |
| IVA | DecimalFractionInput | `ivaPercent` | Cálculo de IVA en Levantamiento |
| Margen de rango | DecimalFractionInput | `marginPercent` | Rango estimado +/- en Levantamiento |
| Factor hasta techo | NumericInput | `factorHastaTecho` | Multiplica frentes/herrajes cuando “hasta techo = sí” |
| Materiales | Tabla editable (nombre/categoría/$/m) | `materiales[]` | Showroom D: resolución de precio por metro |
| Extras iluminación | Numeric por item | `extrasPrecios.iluminacion[id]` | Sección E: total de extras |
| Extras accesorios | Numeric por item | `extrasPrecios.accesoriosEspeciales[id]` | Sección E: total de extras |

## 5.2 Guardado

- Botón Guardar: persiste en `kuche.config.levantamiento.v2`.
- Botón Restaurar: reemplaza con defaults de `createDefaultLevantamientoConfig()`.
- Al guardar, dispara evento `kuche:levantamiento-config-updated`.
- Levantamiento escucha ese evento y refresca configuración en vivo.

## 6. Reglas de precarga entre pantallas (flujo operativo)

- De cita activa a Levantamiento:
  - Con `kuche-active-cita-task` + `kuche-kanban-tasks`, se precargan cliente y tipo de proyecto (último preliminar si existe).
- De preliminar a Cotizador formal:
  - Con `kuche-active-cotizacion-formal-task`, cotizador toma el último preliminar de esa tarjeta y precarga cliente, ubicación, tipo, semanas, largo y alto.
- De configuración a Levantamiento:
  - `getLevantamientoConfig()` carga al montar.
  - Evento `kuche:levantamiento-config-updated` sincroniza cambios sin recargar pantalla.

## 7. Checklist rápido para clonar frontend en otra rama

- Replicar rutas:
  - `/dashboard/Levantamiento-detallado`
  - `/dashboard/cotizador`
  - `/dashboard/configuracion-levantamiento`
- Respetar claves de localStorage listadas en este manual.
- Mantener la forma de `PreliminarData`, `CotizacionFormalData` y `LevantamientoDetalle`.
- Mantener `parse/normalización` de porcentajes en configuración (IVA y margen).
- Mantener el evento `kuche:levantamiento-config-updated` para refresh en vivo.
