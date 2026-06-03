# Matematicas de porcentajes del cotizador formal

Este documento explica, paso a paso, como el sistema calcula los montos que dependen de porcentajes en el cotizador de [src/app/dashboard/cotizador/page.tsx](src/app/dashboard/cotizador/page.tsx).

## 1) Variables de porcentaje que usa el sistema

En el flujo principal existen dos porcentajes configurables por el usuario:

- `utilidadPct` (por defecto 30)
- `fletePct` (por defecto 2)

Tambien existe un porcentaje fijo:

- `IVA = 16%`

Referencias:

- [src/app/dashboard/cotizador/page.tsx](src/app/dashboard/cotizador/page.tsx#L450)
- [src/app/dashboard/cotizador/page.tsx](src/app/dashboard/cotizador/page.tsx#L558)

## 2) Base sobre la que se aplican los porcentajes

Primero se calcula el costo base directo (`baseCost`) sumando cada linea del catalogo:

- `linea = precioUnitario * cantidad`
- `baseCost = suma de todas las lineas`

La categoria `ESPESOR` se excluye de esa suma para evitar afectar el costo base.

Referencia:

- [src/app/dashboard/cotizador/page.tsx](src/app/dashboard/cotizador/page.tsx#L542)

## 3) Conversion de porcentaje a factor decimal

Para aplicar un porcentaje se usa la conversion clasica:

$$
\text{factor decimal} = \frac{\text{porcentaje}}{100}
$$

Por ejemplo:

- `30% -> 0.30`
- `2% -> 0.02`
- `16% -> 0.16`

## 4) Formulas de calculo comercial

Con `costoBaseDirecto = baseCost`, el orden real en codigo es:

$$
\text{montoUtilidad} = \text{costoBaseDirecto} \times \frac{\text{utilidadPct}}{100}
$$

$$
\text{montoFlete} = \text{costoBaseDirecto} \times \frac{\text{fletePct}}{100}
$$

$$
\text{subtotalComercial} = \text{costoBaseDirecto} + \text{montoUtilidad} + \text{montoFlete}
$$

$$
\text{montoIva} = \text{subtotalComercial} \times 0.16
$$

$$
\text{totalNeto} = \text{subtotalComercial} + \text{montoIva}
$$

Referencias:

- [src/app/dashboard/cotizador/page.tsx](src/app/dashboard/cotizador/page.tsx#L553)
- [src/app/dashboard/cotizador/page.tsx](src/app/dashboard/cotizador/page.tsx#L559)

## 5) Ejemplo numerico completo

Supongamos:

- `costoBaseDirecto = 100,000`
- `utilidadPct = 30`
- `fletePct = 2`

Entonces:

1. `montoUtilidad = 100,000 * 0.30 = 30,000`
2. `montoFlete = 100,000 * 0.02 = 2,000`
3. `subtotalComercial = 100,000 + 30,000 + 2,000 = 132,000`
4. `montoIva = 132,000 * 0.16 = 21,120`
5. `totalNeto = 132,000 + 21,120 = 153,120`

Resultado final:

- Total sin IVA: `132,000`
- IVA: `21,120`
- Total neto: `153,120`

## 6) Restricciones de captura de porcentajes

Para evitar valores invalidos, los porcentajes se limitan a un rango de `0` a `100` con `clampPct`:

$$
\text{clampPct}(x) = \min(100, \max(0, x))
$$

Ademas, los botones `+` y `-` ajustan en pasos de `5`, y el input numerico permite edicion directa.

Referencias:

- [src/app/dashboard/cotizador/page.tsx](src/app/dashboard/cotizador/page.tsx#L772)
- [src/app/dashboard/cotizador/page.tsx](src/app/dashboard/cotizador/page.tsx#L2452)
- [src/app/dashboard/cotizador/page.tsx](src/app/dashboard/cotizador/page.tsx#L2494)

## 7) Porcentajes de forma de pago en el PDF

En la cotizacion formal PDF, el total del proyecto se reparte en:

- `50%` anticipo
- `25%` primer dia de instalacion
- `25%` finiquito

El calculo se hace asi:

$$
\text{projectPrice} = \text{round}(\text{totalNeto})
$$

$$
\text{anticipo} = \text{round}(\text{projectPrice} \times 0.5)
$$

$$
\text{primerDia} = \text{round}(\text{projectPrice} \times 0.25)
$$

$$
\text{finiquito} = \text{projectPrice} - \text{anticipo} - \text{primerDia}
$$

Nota importante: `finiquito` se calcula por diferencia para garantizar que la suma total cuadre exactamente con `projectPrice`, aun cuando haya redondeos.

Referencias:

- [src/app/dashboard/cotizador/page.tsx](src/app/dashboard/cotizador/page.tsx#L1584)
- [src/app/dashboard/cotizador/page.tsx](src/app/dashboard/cotizador/page.tsx#L1820)

## 8) Observaciones tecnicas

- Los porcentajes de utilidad y flete se aplican sobre el costo base directo, no sobre un subtotal ya con IVA.
- El IVA se calcula despues de sumar costo base + utilidad + flete.
- No hay descuentos porcentuales en esta pantalla; solo recargos comerciales (utilidad y flete) y luego impuestos.
- El factor de espesor (`0.97`, `1.00`, `1.05`, `1.08`) es un multiplicador tecnico y no participa en la formula final de `totales`; sirve para el calculo de `materialSubtotal` informativo.

Referencia:

- [src/app/dashboard/cotizador/page.tsx](src/app/dashboard/cotizador/page.tsx#L538)