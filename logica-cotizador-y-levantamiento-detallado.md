# Lógica del cotizador y del levantamiento detallado

Este documento resume las fórmulas y el manejo de porcentajes que actualmente usa el código.

## 1) Cotizador (dashboard/cotizador)

## 1.1 Variables base y cálculos principales

- Costo base por catálogo:
  - Se suma cada línea como:
    - `linea = unitPrice * qty`
  - Y el total base como:
    - `costoBaseDirecto = Σ(linea)`
- Referencia de material por metro lineal (no entra al total comercial actual):
  - `materialSubtotal = metrosValue * pricePerMeter * thicknessFactor`
  - Este valor se calcula como referencia técnica, pero el total comercial se construye con `costoBaseDirecto`.

## 1.2 Porcentajes aplicados en el total

- Utilidad:
  - `montoUtilidad = costoBaseDirecto * (utilidadPct / 100)`
- Flete/logística:
  - `montoFlete = costoBaseDirecto * (fletePct / 100)`
- Subtotal comercial:
  - `subtotalComercial = costoBaseDirecto + montoUtilidad + montoFlete`
- IVA:
  - `montoIva = subtotalComercial * 0.16`
- Total neto:
  - `totalNeto = subtotalComercial + montoIva`

## 1.3 Reglas de validación para porcentajes

- `utilidadPct` y `fletePct` se limitan a rango cerrado de 0 a 100 con:
  - `clampPct(value) = min(100, max(0, value))`
- En UI, los botones +/- mueven en pasos de 5 puntos porcentuales.

## 1.4 Cálculos de porcentajes para esquema de pagos (PDF formal)

- A partir de `projectPrice = round(totalNeto)`:
  - `anticipo = round(projectPrice * 0.50)`
  - `primerDia = round(projectPrice * 0.25)`
  - `finiquito = projectPrice - anticipo - primerDia`
- El texto y la tabla del PDF expresan 50% / 25% / 25%.

## 1.5 Importación Excel (impacto en fórmulas)

- Cada fila importada calcula:
  - `total = precioUnitario * cantidad`
- Esas filas se reflejan en cantidades/materiales que alimentan los totales y PDFs.

## 2) Levantamiento detallado (dashboard/Levantamiento-detallado)

## 2.1 Construcción de precios unitarios por metro

- Se toma `largoValue` desde el campo de largo (mínimo 0).
- Precio por metro de cada bloque:
  - Cubierta: `precioCubiertaM`
  - Herraje: `precioHerrajeM`
  - Frentes: `precioFrentesPorM = Σ(precioFrenteSeleccionado)`
- Los precios se resuelven desde configuración con esta prioridad:
  1. Coincidencia exacta por id
  2. Coincidencia por nombre (normalizado)
  3. Promedio de la categoría como fallback

## 2.2 Factor "hasta techo"

- Factor configurado:
  - `factorConfig = min(5, max(1, factorHastaTecho))`
- Activación:
  - Si `hastaTecho === true`, `factorActivo = factorConfig`
  - Si no, `factorActivo = 1`
- Aplicación:
  - Se aplica a frentes y herrajes, no a cubiertas.

## 2.3 Costos por bloque

- Cubiertas:
  - `costoCubiertas = largoValue * precioCubiertaM`
- Frentes:
  - `costoFrentes = largoValue * precioFrentesPorM * factorActivo`
- Herrajes:
  - `costoHerrajes = largoValue * precioHerrajeM * factorActivo`

## 2.4 Extras (iluminación + accesorios especiales)

### Iluminación

- Cantidad efectiva por luminario:
  - Si `lightingQty[id] > 0`, usa ese entero (limitado a 999)
  - Si no, en modo legado usa 1 cuando el id está seleccionado o hay medidas capturadas
- Total iluminación:
  - `totalIluminacion = Σ(qty * unit)`
  - `unit` viene de configuración (`extrasPrecios.iluminacion[id]`) si existe; si no, usa `precioFijo` del ítem
- "Otro" de iluminación:
  - Si `lightingOtro.precioEstimado > 0`, se suma directo al total

### Accesorios especiales

- Cantidad por ítem:
  - `q = max(0, floor(qtyMap[id]))`
- Total accesorios:
  - `totalAccesorios = Σ(q * unit)`
  - `unit` viene de configuración (`extrasPrecios.accesoriosEspeciales[id]`) si existe; si no, usa `precioBase` (o `precioFijo` como respaldo)

### Extras totales

- `costoExtras = totalIluminacion + totalAccesorios`

## 2.5 Subtotal, IVA, total y rango

- Subtotal:
  - `subtotal = costoCubiertas + costoFrentes + costoHerrajes + costoExtras`
- IVA configurable:
  - `iva = subtotal * ivaPercent`
- Total:
  - `total = subtotal + iva`
- Rango estimado con margen configurable:
  - `rangeMin = total * (1 - marginPercent)`
  - `rangeMax = total * (1 + marginPercent)`

## 2.6 Reglas de porcentajes configurables

- `ivaPercent` se guarda limitado a `[0, 1]`
- `marginPercent` se guarda limitado a `[0, 0.5]`
- En pantalla de configuración, el input acepta dos formas:
  - Fracción decimal: `0.16`, `0.08`
  - Número humano en porcentaje: `16`, `8`
- Conversión del parser flexible (con tope por defecto de 0.5):
  - Si `p > 0.5` y `p <= 50`, interpreta `%` y convierte `p/100`
  - En otro caso, toma `p` como fracción
  - Luego limita al rango válido

## 2.7 Referencia de escenario (cateo)

- Se calcula un valor de referencia visual, que no entra al subtotal final:
  - `costoReferenciaEscenario = largoValue * scenarioPrices[selectedScenario]`
- El total final siempre sale de materiales + extras + IVA (no del cateo).

## 2.8 Fórmulas auxiliares en levantamiento de muros

En la captura de muros hay dos derivaciones mostradas en UI:

- Pared con puerta:
  - `sobreVano = max(0, alturaTecho - altoVano)`
- Pared con ventana:
  - `sobreVano = max(0, alturaTecho - (antepecho + altoVano))`

## 3) Resumen rápido de porcentajes usados

- Cotizador:
  - `utilidadPct` (0 a 100)
  - `fletePct` (0 a 100)
  - IVA fijo del cotizador: 16%
  - Esquema de pagos PDF: 50% / 25% / 25%
- Levantamiento detallado:
  - `ivaPercent` configurable (0 a 1)
  - `marginPercent` configurable (0 a 0.5)
  - Factor hasta techo configurable (1 a 5), aplicado solo a frentes/herrajes
