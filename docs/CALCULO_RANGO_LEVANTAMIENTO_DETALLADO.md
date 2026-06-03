# Cálculo de rango en Levantamiento Detallado

Este documento describe exactamente cómo se calcula el rango estimado en la pantalla de levantamiento detallado.

## 1) Variables de entrada

- Largo lineal en metros: `largoValue`
- Escenario seleccionado: `esencial | tendencia | premium`
- Materiales seleccionados:
  - `cubierta` (precio por metro)
  - `frentes` (suma de precios por metro de todos los frentes seleccionados)
  - `herraje` (precio por metro)
- Electrodomésticos seleccionados del catálogo backend (suma automática)
- Accesorios seleccionados del catálogo backend (suma automática)
- Iluminación (total calculado por `cotizacionIluminacionTotal`)
- Configuración de levantamiento:
  - IVA: `ivaPercent`
  - Margen de rango: `marginPercent`
  - Precio por metro por escenario: `scenarioPrices`
  - Factor hasta techo: `factorHastaTecho`

## 2) Reglas de negocio

- Si `medidasGenerales.hastaTecho === true`, se activa `factorActivo = factorHastaTecho`.
- Si no está activo, `factorActivo = 1`.
- El factor se aplica a frentes y herrajes (no a cubierta).

## 3) Fórmulas exactas

### 3.1 Costo base por escenario

`costoBase = largoValue * scenarioPrices[selectedScenario]`

### 3.2 Costo de materiales

`costoMateriales = largoValue * (precioCubierta + (sumaFrentes * factorActivo) + (precioHerraje * factorActivo))`

### 3.3 Costos de equipamiento

- `costoElectrodomesticos = suma de precios backend de electrodomésticos seleccionados`
- `costoAccesorios = suma de precios backend de accesorios seleccionados`
- `costoIluminacion = cotizacionIluminacionTotal(levantamiento)`

### 3.4 Subtotal, IVA y total

`subtotal = costoBase + costoMateriales + costoElectrodomesticos + costoAccesorios + costoIluminacion`

`iva = subtotal * ivaPercent`

`total = subtotal + iva`

### 3.5 Rango estimado

`rangeMin = total * (1 - marginPercent)`

`rangeMax = total * (1 + marginPercent)`

El texto mostrado al usuario es:

`rangeLabel = formatCurrency(rangeMin) + " - " + formatCurrency(rangeMax)`

## 4) Ejemplo numérico

Supongamos:

- `largoValue = 4.0`
- `scenarioPrices.tendencia = 10000`
- `precioCubierta = 2500`
- `sumaFrentes = 1800`
- `precioHerraje = 900`
- `factorHastaTecho = 1.25` y está activo
- `costoElectrodomesticos = 18000`
- `costoAccesorios = 5000`
- `costoIluminacion = 3500`
- `ivaPercent = 0.16`
- `marginPercent = 0.12`

Cálculo:

1. `costoBase = 4.0 * 10000 = 40000`
2. `costoMateriales = 4.0 * (2500 + (1800 * 1.25) + (900 * 1.25))`
3. `costoMateriales = 4.0 * (2500 + 2250 + 1125) = 4.0 * 5875 = 23500`
4. `subtotal = 40000 + 23500 + 18000 + 5000 + 3500 = 90000`
5. `iva = 90000 * 0.16 = 14400`
6. `total = 90000 + 14400 = 104400`
7. `rangeMin = 104400 * (1 - 0.12) = 91872`
8. `rangeMax = 104400 * (1 + 0.12) = 116928`

Rango mostrado:

- `$91,872 - $116,928` (formato MXN)

## 5) Dónde está implementado

- Cálculo principal: `src/app/dashboard/Levantamiento-detallado/logica_Levantamiento_y_cotizacion/calculos.ts`
- Total de iluminación: `src/lib/levantamiento-catalog.ts` (`cotizacionIluminacionTotal`)
- Configuración de porcentajes y precios por escenario: `src/lib/config-levantamiento`
