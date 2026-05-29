# Solicitud backend: filtro y categorías de electrodomésticos

## Contexto
En la pantalla de administración de equipamiento, el listado de electrodomésticos necesita dos cosas para funcionar correctamente:

1. Un filtro de categorías visible y utilizable desde la UI.
2. Una sección de categorías que se alimente realmente desde el backend.

Actualmente la vista depende de `electroCategorias`, pero en algunos entornos esa lista no llega o llega vacía. Cuando eso pasa, el filtro no tiene opciones útiles y la sección de categorías queda vacía.

## Objetivo
Alinear el backend con la UI para que:

- La lista de electrodomésticos pueda filtrarse por categoría.
- La sección de categorías muestre categorías reales del backend.
- La UI no dependa de listas hardcodeadas para el catálogo de electrodomésticos.

## Lo que necesita la frontend

### 1. Endpoint de categorías de electrodomésticos
La frontend necesita un endpoint estable que devuelva las categorías disponibles para electrodomésticos.

#### Respuesta esperada
```json
{
  "success": true,
  "data": [
    {
      "_id": "66f1a1...",
      "nombre": "Microondas",
      "descripcion": "Electrodomésticos de cocción rápida",
      "orden": 1,
      "disponible": true
    }
  ]
}
```

#### Campos requeridos
- `_id`
- `nombre`
- `descripcion` opcional
- `orden` opcional
- `disponible` opcional

### 2. Endpoint de electrodomésticos con categoría consistente
El listado de electrodomésticos debe devolver cada item con la categoría que corresponde al catálogo.

#### Respuesta esperada
```json
{
  "success": true,
  "data": [
    {
      "_id": "66f2b2...",
      "nombre": "Microondas Samsung",
      "categoria": "Microondas",
      "precio": 3200,
      "descripcion": "Microondas de 23 litros",
      "imagenUrl": "https://...",
      "thumbnailUrl": "https://...",
      "disponible": true
    }
  ]
}
```

#### Reglas importantes
- El valor de `categoria` debe coincidir exactamente con el `nombre` de una categoría existente.
- No debe venir vacío para los items activos.
- Si el backend maneja una relación por `categoriaId`, también puede enviarse, pero la UI actualmente filtra por nombre visible.

### 3. Filtro por categoría en consulta
Si el backend soporta filtros query, sería ideal aceptar al menos:

- `categoria`
- `categoriaId`
- `q`
- `disponible`

#### Ejemplo
`GET /api/electrodomesticos?q=micro&categoria=Microondas&disponible=true`

## Comportamiento esperado en frontend

- El buscador filtra por nombre, categoría y descripción.
- El filtro de categorías debe mostrar las categorías del backend.
- La sección de categorías debe mostrar categorías cargadas desde el backend.
- Si el backend no devuelve categorías, la UI puede mostrar un estado vacío, pero no debe asumir una lista fija como fuente de verdad.

## Criterios de aceptación

- La lista de electrodomésticos se puede filtrar por categoría.
- Las categorías visibles provienen del backend.
- La sección de categorías no depende de un arreglo hardcodeado.
- La UI muestra un estado vacío claro si no llegan categorías.
- Los valores de categoría en electrodomésticos y categorías están sincronizados.

## Nota de implementación actual
Mientras el backend se ajusta, la frontend puede inferir categorías desde los electrodomésticos ya existentes para no dejar el filtro totalmente vacío. Eso es un fallback temporal, no la fuente de verdad.

## Prioridad
Alta. Esta pieza impacta el catálogo de electrodomésticos, la creación/edición de items y el filtrado administrativo.
