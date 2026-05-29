# Catalogo de electrodomesticos para registro manual

Fuente: `src/lib/levantamiento-catalog.ts` (`APPLIANCE_ITEMS`, `APPLIANCE_CATEGORIAS`, `APPLIANCE_LEVANTAMIENTO_IMAGE_BY_ID`, `APPLIANCE_LEVANTAMIENTO_IMAGE_EXTRAS`).

## Orden de categorias en la UI

1. Microondas
2. Estufas
3. Refrigeradores
4. Parrillas
5. Tarjas
6. Campanas
7. Otros

## Fallback general de imagen

- `APPLIANCE_CATALOGO_IMAGE_FALLBACK`: `/images/hero-placeholder.svg`

## Campos sugeridos para tu pagina de registro

- `id`: identificador tecnico unico
- `categoria`: grupo visual
- `label`: nombre mostrado al usuario
- `hint`: descripcion corta
- `imagePrimary`: imagen principal (si existe)
- `imageExtras`: alternativas de imagen (si existen)
- `imageFallback`: placeholder

## Datos completos

```json
[

  {
    "id": "otro-cafetera",
    "categoria": "Otros",
    "label": "Cafetera",
    "hint": "Cafe espresso, americano u oficina segun espacio asignado.",
    "imagePrimary": null,
    "imageExtras": [],
    "imageFallback": "/images/hero-placeholder.svg"
  },
  {
    "id": "otro-lavavajillas",
    "categoria": "Otros",
    "label": "Lavavajillas",
    "hint": "Integrado, semi-integrado o de libre instalacion.",
    "imagePrimary": null,
    "imageExtras": [],
    "imageFallback": "/images/hero-placeholder.svg"
  },
  {
    "id": "otro-freidora-aire",
    "categoria": "Otros",
    "label": "Freidora de aire",
    "hint": "Sobremesa o hueco dedicado en torre o mueble bajo.",
    "imagePrimary": null,
    "imageExtras": [],
    "imageFallback": "/images/hero-placeholder.svg"
  },
  {
    "id": "otro-horno-gas",
    "categoria": "Otros",
    "label": "Horno de gas",
    "hint": "Independiente o columna de coccion; validar toma de gas y ventilacion.",
    "imagePrimary": null,
    "imageExtras": [],
    "imageFallback": "/images/hero-placeholder.svg"
  },
  {
    "id": "otro-tostadora",
    "categoria": "Otros",
    "label": "Tostadora",
    "hint": "Pequeno electro de apoyo en encimera o cajon.",
    "imagePrimary": null,
    "imageExtras": [],
    "imageFallback": "/images/hero-placeholder.svg"
  },
  {
    "id": "otro-dispensador-agua",
    "categoria": "Otros",
    "label": "Dispensador de agua",
    "hint": "Filtrada, fria/caliente; fijo o sobre cubierta.",
    "imagePrimary": null,
    "imageExtras": [],
    "imageFallback": "/images/hero-placeholder.svg"
  },
  {
    "id": "otro-enfriador-vinos",
    "categoria": "Otros",
    "label": "Enfriador de vinos",
    "hint": "Columna o bajo cubierta segun capacidad de botellas.",
    "imagePrimary": null,
    "imageExtras": [],
    "imageFallback": "/images/hero-placeholder.svg"
  },
  {
    "id": "otro-tarja-extra",
    "categoria": "Otros",
    "label": "Tarja extra",
    "hint": "Segunda tarja en barista, isla o area de apoyo (distinta de la tarja principal de la cocina).",
    "imagePrimary": null,
    "imageExtras": [],
    "imageFallback": "/images/hero-placeholder.svg"
  }
]
```

## Nota operativa

- El indice de paso `APPLIANCE_OTRO_STEP_INDEX` es dinamico y equivale a la longitud del arreglo de electrodomesticos.
- En esta base hay 33 electrodomesticos registrados.

---

# Catalogo de extras para registro manual

Fuente operativa: `src/app/admin/equipamiento/page.tsx` (`PREDEFINED_EXTRA_CATEGORIES`) y `src/contexts/CatalogEquipamientoContext.tsx`.

## Orden de categorias en la UI

1. Alacena extraible
2. Bote de basura
3. Space tower
4. Mecanismos electricos
5. Sistemas inteligentes (alexa)
6. Esquinas magicas
7. Persianas enrollables
8. Botelleros/especiero/canastillas

## Campos sugeridos para tu pagina de registro

- `id`: identificador tecnico unico
- `categoria`: categoria visible en la UI
- `label`: nombre mostrado al usuario
- `hint`: descripcion corta del uso
- `imagePrimary`: imagen principal (si existe)
- `imageExtras`: alternativas de imagen (si existen)
- `imageFallback`: placeholder

## Datos base sugeridos

```json
[
  {
    "id": "extra-alacena-extraible",
    "categoria": "Alacena extraible",
    "label": "Alacena extraíble",
    "hint": "Modulo alto o bajo con extracción total para acceso rapido a insumos o despensa.",
    "imagePrimary": null,
    "imageExtras": [],
    "imageFallback": "/images/hero-placeholder.svg"
  },
  {
    "id": "extra-bote-basura",
    "categoria": "Bote de basura",
    "label": "Bote de basura",
    "hint": "Sistema oculto o extraible para separación de residuos dentro del mueble.",
    "imagePrimary": null,
    "imageExtras": [],
    "imageFallback": "/images/hero-placeholder.svg"
  },
  {
    "id": "extra-space-tower",
    "categoria": "Space tower",
    "label": "Space tower",
    "hint": "Torre de almacenamiento vertical para aprovechar altura completa del mueble.",
    "imagePrimary": null,
    "imageExtras": [],
    "imageFallback": "/images/hero-placeholder.svg"
  },
  {
    "id": "extra-mecanismos-electricos",
    "categoria": "Mecanismos electricos",
    "label": "Mecanismos eléctricos",
    "hint": "Soluciones motorizadas o automatizadas para apertura, elevacion o apoyo de uso diario.",
    "imagePrimary": null,
    "imageExtras": [],
    "imageFallback": "/images/hero-placeholder.svg"
  },
  {
    "id": "extra-sistemas-inteligentes-alexa",
    "categoria": "Sistemas inteligentes (alexa)",
    "label": "Sistemas inteligentes",
    "hint": "Integraciones con asistentes de voz, automatizacion y control de escenas.",
    "imagePrimary": null,
    "imageExtras": [],
    "imageFallback": "/images/hero-placeholder.svg"
  },
  {
    "id": "extra-esquinas-magicas",
    "categoria": "Esquinas magicas",
    "label": "Esquinas mágicas",
    "hint": "Mecanismos de aprovechamiento de esquina con bandejas o brazos articulados.",
    "imagePrimary": null,
    "imageExtras": [],
    "imageFallback": "/images/hero-placeholder.svg"
  },
  {
    "id": "extra-persianas-enrollables",
    "categoria": "Persianas enrollables",
    "label": "Persianas enrollables",
    "hint": "Cierre oculto o tapa enrollable para cubrir nichos, despensas o equipos.",
    "imagePrimary": null,
    "imageExtras": [],
    "imageFallback": "/images/hero-placeholder.svg"
  },
  {
    "id": "extra-botelleros-especiero-canastillas",
    "categoria": "Botelleros/especiero/canastillas",
    "label": "Botelleros, especiero y canastillas",
    "hint": "Accesorios de organizacion para vino, especias, trapos o canastillas de almacenaje.",
    "imagePrimary": null,
    "imageExtras": [],
    "imageFallback": "/images/hero-placeholder.svg"
  }
]
```

## Nota operativa de extras

- Estas categorias hoy se usan como categorias base en la UI de equipamiento.
- El backend deberia devolverlas como `extrasCategorias` para que el catalogo de extras no dependa de un arreglo fijo.
- Si quieres agregar items reales, puedes reutilizar esta estructura y crear un catalogo por categoria.
