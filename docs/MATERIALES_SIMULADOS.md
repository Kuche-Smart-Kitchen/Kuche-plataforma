Lista de materiales simulados (exportable a JSON para importación en la base de datos)

JSON array — campos: `id`, `nombre`, `categoria` (cubierta|frente|herraje), `gama` (Estandar|Tendencia|Premium), `precioPorMetro`

```json
[
  {"id":"cub-est-1","nombre":"Laminado Blanco Nieve","categoria":"cubierta","gama":"Estandar","precioPorMetro":1800},
  {"id":"cub-est-2","nombre":"Granito San Gabriel","categoria":"cubierta","gama":"Estandar","precioPorMetro":2200},
  {"id":"cub-tend-1","nombre":"Cuarzo Clásico","categoria":"cubierta","gama":"Tendencia","precioPorMetro":3400},
  {"id":"cub-tend-2","nombre":"Porcelánico Terrazzo","categoria":"cubierta","gama":"Tendencia","precioPorMetro":3600},
  {"id":"cub-prem-1","nombre":"Mármol Calacatta","categoria":"cubierta","gama":"Premium","precioPorMetro":5200},
  {"id":"cub-prem-2","nombre":"Piedra sinterizada XL","categoria":"cubierta","gama":"Premium","precioPorMetro":5800},
  {"id":"fre-est-1","nombre":"Melamina blanca","categoria":"frente","gama":"Estandar","precioPorMetro":950},
  {"id":"fre-est-2","nombre":"MDF hidrófugo","categoria":"frente","gama":"Estandar","precioPorMetro":1100},
  {"id":"fre-tend-1","nombre":"Laca semimate","categoria":"frente","gama":"Tendencia","precioPorMetro":2100},
  {"id":"fre-tend-2","nombre":"Chapa nogal","categoria":"frente","gama":"Tendencia","precioPorMetro":1950},
  {"id":"fre-prem-1","nombre":"Laca alto brillo","categoria":"frente","gama":"Premium","precioPorMetro":3600},
  {"id":"fre-prem-2","nombre":"Madera maciza","categoria":"frente","gama":"Premium","precioPorMetro":3400},
  {"id":"her-est-1","nombre":"Bisagra estándar","categoria":"herraje","gama":"Estandar","precioPorMetro":750},
  {"id":"her-est-2","nombre":"Corredera básica","categoria":"herraje","gama":"Estandar","precioPorMetro":850},
  {"id":"her-tend-1","nombre":"Soft-close","categoria":"herraje","gama":"Tendencia","precioPorMetro":1550},
  {"id":"her-tend-2","nombre":"Push to open","categoria":"herraje","gama":"Tendencia","precioPorMetro":1450},
  {"id":"her-prem-1","nombre":"Servo drive","categoria":"herraje","gama":"Premium","precioPorMetro":2600},
  {"id":"her-prem-2","nombre":"Guías ocultas premium","categoria":"herraje","gama":"Premium","precioPorMetro":2400}
]
```

Instrucciones rápidas:
- Copia el JSON y úsalo para insertar en tu base de datos según tu esquema.
- Campos adicionales como `unidadMedida`, `idCotizador` o `descripcion` pueden agregarse en la importación si tu API los requiere.

Fin del documento.
