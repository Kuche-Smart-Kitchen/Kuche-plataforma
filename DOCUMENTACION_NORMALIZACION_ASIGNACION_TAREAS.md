# Normalizacion De Asignacion De Tareas

## Objetivo

La tarea debe guardar la asignacion de empleados usando un solo campo canónico en la base de datos: `asignadoA`.

Antes, el flujo podia mandar la misma lista en varios nombres de campo (`asignadoA`, `assignedToIds`, `assignedTo`). Eso no se persiste como tres listas distintas, pero si complica la lectura del contrato y puede hacer pensar que la asignacion se guarda varias veces.

## Que Quedo Normalizado

### En base de datos

- `asignadoA` es el arreglo que se guarda.
- `asignadoANombre` guarda los nombres resueltos solo para mostrar.
- No se crea un registro separado por cada alias de entrada.

### En backend

- El schema acepta `asignadoA`, `assignedToIds` y `assignedTo` como entrada.
- La validacion transforma cualquier alias de entrada al campo canonico `asignadoA`.
- El controller trabaja solo con `asignadoA`.
- La respuesta sigue mostrando alias derivados por compatibilidad visual, pero no son campos nuevos de persistencia.

## Flujo Correcto

### 1. El frontend manda la lista una sola vez

Ejemplo recomendado:

```json
{
  "asignadoA": ["66f0a1111111111111111111", "66f0a2222222222222222222"],
  "titulo": "Tarea de prueba",
  "etapa": "contrato",
  "estado": "pendiente"
}
```

### 2. El schema normaliza la entrada

Si llega cualquiera de estos campos:

- `asignadoA`
- `assignedToIds`
- `assignedTo`

el backend los convierte a `asignadoA`.

### 3. El controller resuelve los responsables

El controller:

- elimina duplicados
- recorta espacios vacios
- valida que cada ID exista
- guarda el arreglo completo en `asignadoA`
- guarda los nombres resueltos en `asignadoANombre`

### 4. La respuesta refleja la lista guardada

La respuesta debe devolver la tarea con:

- `asignadoA` como arreglo
- `asignadoANombre` como arreglo de nombres
- campos editados sin perder lo que no se cambio

## Errores Que Pueden Aparecer

### 1. Enviar nombres en vez de IDs

Si el frontend manda nombres, correos o etiquetas en vez de IDs, la validacion o la resolucion de usuarios fallara.

Sintoma:

- `No se encontraron responsables validos`
- la asignacion no se guarda

Solucion:

- mandar solo IDs reales de usuarios

### 2. Mandar un string donde se espera un arreglo

Aunque el backend acepta string o arreglo en compatibilidad, el flujo recomendado es enviar siempre un arreglo.

Sintoma:

- solo se guarda un responsable
- el frontend cree que envio varios, pero el payload llego truncado

Solucion:

- asegurar que `assignedToIds` o `asignadoA` sea un arreglo

### 3. Incluir IDs vacios o repetidos

Si la lista contiene valores vacios o duplicados, el backend los limpia, pero el frontend puede mostrar un estado confuso si no normaliza antes.

Sintoma:

- responsables repetidos en el formulario
- payload mas grande de lo necesario

Solucion:

- filtrar vacios antes de enviar
- no repetir la misma lista en tres campos si ya se usa `asignadoA`

### 4. Usar un ID que no existe

Si algun ID ya no existe en la base de datos o no pertenece a un usuario valido, el controller puede rechazar la operacion completa.

Sintoma:

- error 404 o mensaje de responsables invalidos

Solucion:

- verificar que el ID siga activo y exista

### 5. Creer que los alias se almacenan por separado

Los alias `assignedToIds` y `assignedTo` no son campos de persistencia independientes.

Sintoma:

- confusion al revisar el documento guardado
- expectativa de ver varios campos duplicados

Solucion:

- revisar solo `asignadoA` y `asignadoANombre` en MongoDB

## Recomendacion De Implementacion

### Frontend

- Enviar solo `asignadoA` si ya trabajas directo contra el backend.
- Si necesitas compatibilidad temporal, puedes seguir enviando `assignedToIds`, pero no es obligatorio duplicarlo.
- No mandar nombres de empleados en la lista de responsables.

### Backend

- Mantener `asignadoA` como unica fuente de verdad.
- Convertir alias de entrada en `asignadoA` en el schema.
- Usar el controller solo para validar IDs, resolver nombres y guardar.

## Checklist De Revision

- [ ] La peticion trae IDs reales
- [ ] La peticion usa un arreglo y no un string accidental
- [ ] El schema transforma el alias correcto a `asignadoA`
- [ ] El controller guarda todos los IDs recibidos
- [ ] MongoDB conserva el arreglo completo en `asignadoA`
- [ ] La respuesta devuelve la lista correcta al frontend

## Resultado Esperado

Despues de esta normalizacion, la asignacion debe comportarse asi:

- una tarea puede tener varios responsables
- el backend guarda un solo arreglo canonico
- el frontend no necesita duplicar la lista en varios nombres de campo
- al volver a cargar la tarea, se ve la misma asignacion que se guardo
