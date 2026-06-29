# Documento de Cálculo: Levantamiento Detallado por Área

## Introducción

El levantamiento detallado es una cotización preliminar que se realiza para cada proyecto. El sistema calcula el costo de una cocina integral considerando múltiples áreas o componentes: materiales lineales (cubiertas, frentes, herrajes), equipamiento (electrodomésticos, accesorios, iluminación) y aplica configuraciones como IVA y márgenes de precio.

Este documento explica cómo el sistema desglosa el cálculo por cada área, qué variables influyen en cada una, y cómo se integran para obtener el precio final.

## Estado de Paridad con Front_plataforna

Este documento y la implementación actual están alineados con la lógica de Front_plataforna para:

- Opciones del configurador de levantamiento
- Opciones visibles en levantamiento detallado
- Fórmulas de cálculo (subtotal, IVA, total y rango)
- Aplicación del factor hasta techo y extras

---

## Estructura General del Cálculo

El cálculo del levantamiento detallado se divide en **5 áreas principales**:

```
SUBTOTAL = Área 1 (Cubiertas) 
         + Área 2 (Frentes)
         + Área 3 (Herrajes)
         + Área 4 (Electrodomésticos)
         + Área 5 (Accesorios + Iluminación)
         + Costo Base de Escenario

TOTAL = SUBTOTAL * (1 + IVA)

RANGO = [TOTAL * (1 - Margen), TOTAL * (1 + Margen)]
```

---

## Área 1: Cubiertas

### Definición
Es el costo de la superficie de trabajo o encimera de la cocina. Se calcula de forma **lineal** en función del largo del mueble.

### Fórmula
```
Costo Cubiertas = Largo (m) × Precio por Metro de Cubierta
```

### Variables de Entrada
- **Largo**: Medida lineal en metros (capturada en Sección A del levantamiento)
- **Precio por Metro de Cubierta**: Obtenido del catálogo de materiales (seleccionado en Sección D - Showroom digital)
  - Se busca en la configuración por ID exacto
  - Si no existe, se busca por nombre normalizado
  - Si falla, usa el promedio de la categoría de cubiertas

### Ejemplo
- Largo: 3.5 metros
- Cubierta seleccionada: Graníto (precio: $2,500/m)
- **Costo Cubiertas = 3.5 × $2,500 = $8,750**

### Notas
- Las cubiertas **NO incluyen factor hasta techo**, siempre se multiplican solo por el largo
- Este es el componente más básico del cálculo

---

## Área 2: Frentes

### Definición
Son las caras frontales de los muebles de cocina. Pueden ser múltiples frentes (madera, vidrio, etc.) y se combinan.

### Fórmula
```
Costo Frentes = Largo (m) × (Suma de Precios/m de Frentes) × Factor Hasta Techo
```

### Variables de Entrada
- **Largo**: Medida lineal en metros (igual que cubiertas)
- **Suma de Precios/m de Frentes**: 
  - Se seleccionan múltiples frentes en Sección D
  - Cada frente tiene un precio por metro
  - Se suman todos los precios de los frentes seleccionados
- **Factor Hasta Techo**: Multiplicador condicional
  - Se activa si la opción "¿Hasta el techo?" en Sección A es "Sí"
  - Valor configurado en `/dashboard/configuracion-levantamiento`
  - Rango válido: 1 a 5 (por defecto: 1.25)
  - Si no está activo, factor = 1

### Ejemplo Sin Factor
- Largo: 3.5 metros
- Frente 1 (Melamina blanca): $800/m
- Frente 2 (Vidrio): $1,200/m
- Suma de precios: $800 + $1,200 = $2,000/m
- Factor hasta techo: NO activo (factor = 1)
- **Costo Frentes = 3.5 × $2,000 × 1 = $7,000**

### Ejemplo Con Factor
- Mismo largo: 3.5 metros
- Mismo Suma de precios: $2,000/m
- Factor hasta techo: SÍ activo (factor = 1.5)
- **Costo Frentes = 3.5 × $2,000 × 1.5 = $10,500**

### Notas
- La diferencia entre $7,000 y $10,500 es el **impacto del factor hasta techo**
- Este factor simula aumentar la altura de los frentes cuando se desea que lleguen hasta el cielo raso
- El sistema muestra una leyenda cuando el factor está activo: "(Incluye factor hasta el techo: x1.50)"

---

## Área 3: Herrajes

### Definición
Son los accesorios metálicos que hacen funcional la cocina: bisagras, deslizadera, remaches, manijas, etc.

### Fórmula
```
Costo Herrajes = Largo (m) × Precio por Metro de Herraje × Factor Hasta Techo
```

### Variables de Entrada
- **Largo**: Medida lineal en metros
- **Precio por Metro de Herraje**: 
  - Obtenido del material seleccionado en Sección D
  - Se resuelve de igual forma que las cubiertas (ID exacto → nombre → promedio)
- **Factor Hasta Techo**: Mismo comportamiento que frentes
  - Se activa si "¿Hasta el techo?" = "Sí"
  - Usa el mismo valor configurado

### Ejemplo
- Largo: 3.5 metros
- Herraje seleccionado: Sistema moderno (precio: $600/m)
- Factor hasta techo: SÍ activo (factor = 1.25)
- **Costo Herrajes = 3.5 × $600 × 1.25 = $2,625**

### Notas
- Al igual que frentes, el factor hasta techo multiplica el costo
- Si el factor NO está activo: 3.5 × $600 × 1 = $2,100
- La diferencia de $525 es el incremento por altura adicional

---

## Área 4: Electrodomésticos

### Definición
Son los equipos integrados en la cocina: refrigeradora, estufa, horno, lavavajillas, etc.

### Fórmula
```
Costo Electrodomésticos = Suma de Precios de Electrodomésticos Seleccionados
```

### Variables de Entrada
- **Catálogo de electrodomésticos**: Proviene del backend
- **Electrodomésticos seleccionados**: Se marcan en Sección C del levantamiento
- **Precio unitario**: Cada electrodoméstico tiene un precio fijo en el catálogo

### Ejemplo
- Refrigeradora (Lado a Lado): $18,000
- Estufa de Inducción: $8,500
- Lavavajillas: $12,000
- **Costo Electrodomésticos = $18,000 + $8,500 + $12,000 = $38,500**

### Notas
- No se multiplica por largo, son precios fijos
- El usuario puede capturar medidas de los electrodomésticos (ancho, alto, fondo) en Sección C, pero esto es solo informativo
- Existe opción "Otro electrodoméstico" para capturar manualmente un equipo no catalogado
- **NO aplica factor hasta techo**

---

## Área 5: Accesorios Especiales + Iluminación

### Accesorios Especiales

#### Definición
Componentes adicionales que mejoran la funcionalidad o estética: gavetas especiales, canastas deslizables, organizadores, espejos, etc.

#### Fórmula
```
Costo Accesorios = Suma (Cantidad × Precio Unitario de cada accesorio)
```

#### Variables de Entrada
- **Cantidad**: Stepper numérico por ítem (capturado en Sección E)
- **Precio Unitario**: Configurado en `/dashboard/configuracion-levantamiento` → sección "Extras - Accesorios Especiales"
  - Se resuelve primero desde configuración personalizada
  - Si no existe, usa `precioBase` del catálogo
  - Fallback final: `precioFijo`

#### Ejemplo
- Canasta deslizable: 2 unidades × $450/u = $900
- Gaveta con divisor: 1 unidad × $350/u = $350
- Espejo interior: 1 unidad × $200/u = $200
- **Costo Accesorios = $900 + $350 + $200 = $1,450**

### Iluminación

#### Definición
Sistemas de iluminación integrados: focos LED, barras de luz, luminarias, etc.

#### Fórmula
```
Costo Iluminación = Suma (Cantidad × Precio Unitario de cada luminario)
```

#### Variables de Entrada
- **Cantidad**: 
  - Si el usuario ingresa cantidad > 0 en los inputs, usa ese valor
  - Si está en 0 pero hay medidas capturadas, usa 1 (modo legado)
  - Limitado a máximo 999 unidades
- **Precio Unitario**: Configurado en `/dashboard/configuracion-levantamiento` → sección "Extras - Iluminación"
  - Se resuelve desde configuración personalizada primero
  - Fallback: `precioFijo` del catálogo

#### Ejemplo
- LED empotrado (blanco 4K): 6 unidades × $280/u = $1,680
- Barra LED (bajo mueble): 2 unidades × $450/u = $900
- Otro luminario personalizado: $1,200 (capturado como "otro" con precio estimado)
- **Costo Iluminación = $1,680 + $900 + $1,200 = $3,780**

#### Notas
- Existe opción "Otro luminario" para capturar un equipo no catalogado con precio estimado
- El usuario puede capturar medidas (ancho, alto, fondo) pero es solo informativo

### Total Área 5
```
Costo Área 5 = Costo Accesorios + Costo Iluminación
```

---

## Área 6: Costo Base de Escenario (Cateo)

### Definición
Es un precio de referencia que varía según el nivel de acabado elegido: Esencial, Tendencia o Premium. Funciona como una "línea base" independiente.

### Fórmula
```
Costo Base de Escenario = Largo (m) × Precio por Metro del Escenario Seleccionado
```

### Variables de Entrada
- **Largo**: Medida lineal en metros
- **Escenario Seleccionado**: 
  - Esencial (default: $5,000/m)
  - Tendencia (default: $10,000/m)
  - Premium (default: $15,000/m)
  - Estos precios se configuran en `/dashboard/configuracion-levantamiento`

### Ejemplo
- Largo: 3.5 metros
- Escenario seleccionado: Tendencia (precio: $10,000/m)
- **Costo Base de Escenario = 3.5 × $10,000 = $35,000**

### Notas
- Este costo se suma al subtotal junto con todos los componentes anteriores
- Es una **línea adicional**, no un reemplazo de materiales
- Representa un margen de calidad general o acabados básicos esperados
- **NO aplica factor hasta techo**

---

## Integración: Subtotal y Total Final

### Fórmula del Subtotal
```
SUBTOTAL = Costo Cubiertas
         + Costo Frentes
         + Costo Herrajes
         + Costo Electrodomésticos
         + Costo Accesorios
         + Costo Iluminación
         + Costo Base de Escenario
```

### Aplicación de IVA
```
IVA = SUBTOTAL × Porcentaje de IVA (configurable, default: 16%)

TOTAL NETO = SUBTOTAL + IVA
```

### Rango Estimado
```
RANGO MÍNIMO = TOTAL NETO × (1 - Margen de Rango)
RANGO MÁXIMO = TOTAL NETO × (1 + Margen de Rango)

Margen de Rango configurable, default: 8% (±$)
```

---

## Ejemplo Completo

### Datos de Entrada
- **Largo**: 4.0 metros
- **¿Hasta el techo?**: Sí (factor: 1.25)
- **Cubierta**: Granito ($2,500/m)
- **Frentes**: Melamina ($800/m) + Vidrio ($1,200/m) = $2,000/m
- **Herraje**: Moderno ($600/m)
- **Electrodomésticos seleccionados**: Refrigeradora $18,000 + Estufa $8,500 = $26,500
- **Accesorios**: 2 Canastas × $450 = $900
- **Iluminación**: 4 LED × $280 = $1,120
- **Escenario**: Tendencia ($10,000/m)
- **IVA**: 16%
- **Margen de Rango**: 8%

### Cálculos

| Área | Fórmula | Cálculo | Resultado |
|------|---------|---------|-----------|
| Cubiertas | 4.0 × $2,500 | 4.0 × $2,500 | **$10,000** |
| Frentes | 4.0 × $2,000 × 1.25 | 4.0 × $2,000 × 1.25 | **$10,000** |
| Herrajes | 4.0 × $600 × 1.25 | 4.0 × $600 × 1.25 | **$3,000** |
| Electrodomésticos | $26,500 | $26,500 | **$26,500** |
| Accesorios | $900 | $900 | **$900** |
| Iluminación | $1,120 | $1,120 | **$1,120** |
| Escenario | 4.0 × $10,000 | 4.0 × $10,000 | **$40,000** |
| | | **SUBTOTAL** | **$91,520** |
| IVA | $91,520 × 0.16 | $91,520 × 0.16 | **$14,643** |
| | | **TOTAL NETO** | **$106,163** |
| Margen Mín | $106,163 × (1 - 0.08) | $106,163 × 0.92 | **$97,670** |
| Margen Máx | $106,163 × (1 + 0.08) | $106,163 × 1.08 | **$114,656** |

### Resultado Final
- **Precio Estimado**: $106,163
- **Rango de Variación**: $97,670 - $114,656

---

## Impacto del Factor "Hasta Techo"

El factor "hasta techo" es crítico porque multiplica **solo 2 áreas**:

| Escenario | Frentes | Herrajes | Cubiertas | Electrodomésticos |
|-----------|---------|----------|-----------|-------------------|
| Sin factor (1) | Bajo | Bajo | Normal | Normal |
| Con factor (1.25) | +25% | +25% | SIN cambio | SIN cambio |
| Con factor (2.0) | +100% | +100% | SIN cambio | SIN cambio |

**En el ejemplo anterior:**
- Frentes: $8,000 → $10,000 (diferencia: +$2,000)
- Herrajes: $2,400 → $3,000 (diferencia: +$600)
- **Total incremento**: +$2,600

---

## Flujo de Resolución de Precios de Materiales

Cuando el sistema necesita el "Precio por Metro" de un material (cubierta, frente o herraje):

```
1. ¿Existe material por ID exacto?
   → SÍ: Usa ese precio
   → NO: Ir a paso 2

2. ¿Existe material por nombre normalizado?
   → SÍ: Usa ese precio
   → NO: Ir a paso 3

3. Fallback: Usa promedio de la categoría
   → Calcula el promedio de todos los materiales de esa categoría
```

---

## Configurador de Levantamiento (Opciones)

Pantalla: `/dashboard/configuracion-levantamiento`

### 1) Precio base por escenario ($/m lineal)

Opciones editables:
- Esencial
- Tendencia
- Premium

Uso en cálculo:
```
costoBase = largoValue * scenarioPrices[selectedScenario]
```

### 2) Impuestos y rango

Opciones editables:
- IVA
- Margen de rango
- Factor hasta techo

Reglas de captura:
- IVA y margen aceptan fracción decimal (0.16) o porcentaje humano (16)
- El parser convierte automáticamente si detecta formato de porcentaje
- El valor se limita al rango permitido en configuración

Uso en cálculo:
```
iva = subtotal * ivaPercent
total = subtotal + iva
rangeMin = total * (1 - marginPercent)
rangeMax = total * (1 + marginPercent)
```

### 3) Catálogo de materiales ($/m)

Opciones editables:
- Alta de material
- Edición de nombre, categoría y precio por metro
- Búsqueda por nombre o id
- Filtro por categoría: todas, cubierta, frente, herraje
- Eliminación de materiales

Categorías válidas:
- cubierta
- frente
- herraje

Uso en cálculo:
- La selección de cubierta, frentes y herraje del showroom usa este catálogo para resolver precio por metro.

### 4) Extras (apartado E)

Opciones editables:
- Precios unitarios de iluminación por tipo
- Precios unitarios de accesorios especiales por tipo

Uso en cálculo:
```
costoIluminacion = Σ(qty_luz * precio_luz)
costoAccesoriosEspeciales = Σ(qty_acc * precio_acc)
```

### 5) Acciones del configurador

Opciones operativas:
- Guardar configuración
- Restaurar por defecto

Comportamiento:
- Guardar persiste en localStorage (`kuche.config.levantamiento.v2`)
- Restaurar regresa a `createDefaultLevantamientoConfig()`
- Al guardar se emite el evento `kuche:levantamiento-config-updated` para refresco en vivo del levantamiento detallado

---

## Paridad de Opciones y Lógica en Levantamiento Detallado

Pantalla: `/dashboard/Levantamiento-detallado`

Las opciones visibles y su lógica de cálculo quedan alineadas con Front_plataforna así:

1. Sección D (Showroom): selección de cubierta, frentes múltiples y herraje con precios por metro.
2. Sección E (Extras): iluminación y accesorios especiales con cantidades y medidas opcionales.
3. Aplicación condicional de factor hasta techo en frentes y herrajes.
4. Suma de componentes:
```
subtotal = costoBase + costoMateriales + costoElectrodomesticos + costoAccesoriosEspeciales + costoIluminacion
```
5. Aplicación de IVA y rango:
```
total = subtotal + subtotal * ivaPercent
rangeMin = total * (1 - marginPercent)
rangeMax = total * (1 + marginPercent)
```

Con esto, el flujo completo de opciones del configurador y el comportamiento del levantamiento detallado quedan sincronizados con la referencia de Front_plataforna.

---

## Persistencia de Datos

Una vez guardado el levantamiento preliminar:

1. Se almacena en `localStorage` con clave `kuche-kanban-tasks`
2. Se organiza bajo la estructura `PreliminarData`
3. Contiene:
   - Datos del proyecto (cliente, ubicación, tipo)
   - Medidas (largo, alto, paredes)
   - Selecciones (cubiertas, frentes, herrajes, equipos)
   - Cantidades de extras
   - Comentarios por sección
   - Total estimado y rango

---

## Validaciones y Límites

| Campo | Validación | Comportamiento |
|-------|------------|-----------------|
| **Largo** | ≥ 0 | Si es negativo o vacío, se convierte a 0 |
| **Factor Hasta Techo** | 1 - 5 | Se limita automáticamente a este rango |
| **IVA** | 0 - 100% | Se limita automáticamente al rango válido |
| **Margen** | 0 - 50% | Se limita automáticamente al máximo 50% |
| **Cantidad Luminarios** | 0 - 999 | Máximo 999 unidades por tipo |
| **Cantidad Accesorios** | 0 - 999+ | Sin límite superior oficial |

---

## Resumen Visual

```
┌─────────────────────────────────────────────────┐
│         LEVANTAMIENTO DETALLADO                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  Entrada: Largo = 4m, Escenario = Tendencia   │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ Área 1 (Cubiertas)      4 × $2,500      │   │
│  │ Área 2 (Frentes)        4 × $2,000 × 1.25  │
│  │ Área 3 (Herrajes)       4 × $600 × 1.25    │
│  │ Área 4 (Electrodomésticos)     $26,500     │
│  │ Área 5 (Accesorios + Iluminación) $2,020   │
│  │ Área 6 (Escenario)      4 × $10,000        │
│  │ ─────────────────────────────────────── │
│  │ SUBTOTAL                         $91,520    │
│  │ + IVA (16%)                      $14,643    │
│  │ ─────────────────────────────────────── │
│  │ TOTAL                           $106,163    │
│  │ ─────────────────────────────────────── │
│  │ Rango (±8%)  $97,670 - $114,656            │
│  └─────────────────────────────────────────┘   │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## Conclusión

El cálculo del levantamiento detallado es modular y transparente:

- **Cada área tiene una responsabilidad clara** y se calcula independientemente
- **El factor hasta techo** es el principal multiplicador condicionado
- **Los escenarios** representan distintos niveles de acabado base
- **La configuración centralizada** permite ajustar totalmente el modelo de precios
- **El resultado final** incluye una banda de variación para negociar con el cliente

Este modelo permite **flexibilidad en la cotización** mientras mantiene **trazabilidad total** de cada componente del precio.
