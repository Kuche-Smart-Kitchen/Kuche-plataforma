# Rutas de catálogo usadas por el frontend

Documento de referencia para comparar con el backend. El frontend trabaja con rutas de fallback; el backend solo necesita exponer una de las variantes listadas para cada recurso.

## Materiales

- `GET /api/catalogos/materiales`
- `GET /api/materiales`
- `GET /api/catalogo/materiales`
- `POST /api/catalogos/materiales`
- `PATCH /api/catalogos/materiales/:id`
- `DELETE /api/catalogos/materiales/:id`

## Herrajes

- `GET /api/catalogos/herrajes`
- `GET /api/herrajes`
- `GET /api/catalogo/herrajes`
- `POST /api/catalogos/herrajes`
- `PATCH /api/catalogos/herrajes/:id`
- `DELETE /api/catalogos/herrajes/:id`

## Equipamiento

- `GET /api/electrodomesticos`
- `GET /api/catalogos/electrodomesticos`
- `GET /api/electrodomesticos/categorias`
- `GET /api/electro-categorias`
- `GET /api/catalogos/electro-categorias`
- `GET /api/extras`
- `GET /api/catalogos/extras`
- `GET /api/extras/categorias`
- `GET /api/extras-categorias`
- `GET /api/catalogos/extras-categorias`

## Notas

- El frontend usa `PATCH` y `DELETE` sobre la misma familia de rutas base con `/:id`.
- Si una ruta no responde, el cliente prueba la siguiente variante automática.
- La edición de precios depende de `Guardar cambios` o del botón `Guardar` por fila en modo edición.