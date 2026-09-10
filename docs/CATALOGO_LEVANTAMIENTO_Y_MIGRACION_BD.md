# Catalogo del Levantamiento Detallado

## Estado actual

El levantamiento detallado **no carga todo su catalogo desde `localStorage` ni desde la base de datos**.

Actualmente combina estas fuentes:

| Grupo | Fuente actual | Archivo o ruta |
|---|---|---|
| Tipos de pared y esquema de medidas | Catalogo estatico en codigo | `src/lib/levantamiento-catalog.ts` |
| Electrodomesticos | Catalogo estatico para el levantamiento | `src/lib/levantamiento-catalog.ts` |
| Iluminacion | Catalogo estatico para el levantamiento | `src/lib/levantamiento-catalog.ts` |
| Accesorios especiales | Catalogo estatico para el levantamiento | `src/lib/levantamiento-catalog.ts` |
| Cubiertas, frentes y herrajes | Lista/precios por defecto en codigo | `src/lib/config-levantamiento.ts` |
| Imagenes del showroom | Archivos publicos | `public/images/materiales/` y `public/images/levantamiento/` |
| Borrador del levantamiento | `localStorage` | `kuche-levantamiento-draft` |
| Datos de la cita/tarea | Backend, cacheados en memoria del Kanban | `/api/kanban/*` |

La configuracion de precios de `config-levantamiento.ts` ya no persiste en `localStorage`; `getLevantamientoConfig()` devuelve valores por defecto en memoria.

## Inventario del catalogo actual

### Tipos de pared

- Pared recta
- Pared con ventana
- Pared con puerta
- Pared con 2 ventanas
- Pared con puerta y ventana
- Pared con puerta y 2 ventanas
- Pared con 2 puertas
- Otro tipo de muro o situacion especial

Ademas del nombre, cada tipo tiene un esquema de medidas, grupos visuales para el diagrama y lineas/cotas usadas en el PDF.

### Electrodomesticos

El catalogo contiene opciones agrupadas por categoria. Cada opcion tiene identificador estable, etiqueta, descripcion, imagen y, en algunos casos, datos de presentacion.

La pantalla usa estas categorias para construir el flujo:

- Refrigeradores
- Estufas y parrillas
- Campanas
- Hornos
- Microondas
- Tarjas
- Lavavajillas
- Otros

La lista exacta y sus identificadores se encuentran actualmente en `APPLIANCE_ITEMS`.

### Iluminacion

La pantalla usa opciones con identificador, etiqueta, descripcion, imagen y cantidad seleccionada. La lista exacta se encuentra actualmente en `LIGHTING_ITEMS`.

### Accesorios especiales

La pantalla usa opciones con identificador, etiqueta, descripcion, imagen y cantidad/precio base. La lista exacta se encuentra actualmente en `SPECIAL_ACCESSORIES_ITEMS`.

### Materiales del showroom

Se muestran tres categorias:

- Cubiertas
- Frentes
- Herrajes

La lista y el precio por metro actuales se encuentran en `DEFAULT_LEVANTAMIENTO_MATERIALES` dentro de `src/lib/config-levantamiento.ts`.

## APIs de base de datos disponibles en este workspace

El cliente existente `src/lib/axios/equipamientoApi.ts` tiene rutas para:

- `GET /api/electrodomesticos`
- `GET /api/electrodomesticos/categorias`
- `GET /api/extras`
- `GET /api/extras/categorias`

Estas rutas pueden alimentar electrodomesticos y extras de equipamiento, pero el levantamiento detallado todavía no las consume.

## Contrato que falta para eliminar el catalogo estatico

Para borrar `src/lib/levantamiento-catalog.ts` sin perder funcionalidad, el backend debe exponer y documentar rutas autenticadas para:

- `GET /api/catalogos/paredes`
- `GET /api/catalogos/paredes/:id/medidas`
- `GET /api/catalogos/materiales?categoria=cubierta`
- `GET /api/catalogos/materiales?categoria=frente`
- `GET /api/catalogos/materiales?categoria=herraje`
- `GET /api/catalogos/iluminacion`
- `GET /api/catalogos/accesorios-especiales`

Cada elemento debe incluir como minimo:

```json
{
  "_id": "...",
  "nombre": "...",
  "categoria": "...",
  "descripcion": "...",
  "imagenUrl": "...",
  "precio": 0,
  "activo": true
}
```

Los tipos de pared necesitan adicionalmente su esquema de medidas y la informacion visual usada por los diagramas. Sin ese contrato no es seguro sustituirlos por `equipamientoApi`, porque se perderian las medidas y el PDF.

## Plan de migracion

1. Confirmar las rutas reales y el shape de respuesta del backend para los seis catalogos.
2. Crear un cliente Axios de catalogos y un contexto `LevantamientoCatalogoProvider`.
3. Cargar en paralelo los catalogos activos y exponer estados `loading/error`.
4. Adaptar el levantamiento, el PDF y la configuracion para consumir el contexto.
5. Mantener solo los tipos y helpers de medidas en un modulo de dominio, fuera del catalogo de datos.
6. Eliminar `src/lib/levantamiento-catalog.ts` despues de retirar todas sus importaciones.
7. Eliminar los valores por defecto duplicados de `config-levantamiento.ts`.

## Estado de la migracion

Ya existe una capa de lectura para los catalogos documentados:

- `src/lib/axios/catalogosApi.ts` contiene las rutas oficiales.
- `src/contexts/LevantamientoCatalogoContext.tsx` carga los cuatro catalogos en paralelo.
- El layout global monta el provider.
- El levantamiento consume desde backend materiales, herrajes, electrodomesticos, iluminacion y accesorios especiales.
- No se usan valores estaticos como fallback para esas opciones.

`src/lib/levantamiento-catalog.ts` todavia no se puede eliminar por completo porque contiene el esquema de medidas, diagramas y normalizacion de paredes. La guia de rutas no define una API para paredes ni para sus medidas. Esa parte requiere un contrato adicional antes de retirar el archivo sin romper el formulario o el PDF.
