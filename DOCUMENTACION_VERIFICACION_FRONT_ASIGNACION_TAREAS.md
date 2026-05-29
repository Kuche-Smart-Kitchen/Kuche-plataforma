# Verificacion Detallada Del Flujo De Asignacion De Tareas En Frontend

## Objetivo

Verificar, paso a paso, que la edicion de una tarea desde el frontend:

- mande solo la informacion necesaria;
- envie correctamente la lista de responsables;
- no duplique ni recorte los IDs;
- reciba una respuesta util desde el backend;
- muestre en pantalla lo mismo que quedo guardado en la base de datos.

Este documento esta pensado para revisar el flujo completo sin tocar otras partes del sistema.

## Contexto Importante

La coleccion que se usa como fuente de verdad es `tareas`.

Eso significa que cuando editas una tarea desde el panel:

- se actualizan los datos de la tarea;
- la cita original ya no es el origen principal de la informacion visible;
- la asignacion de personas debe guardarse en el campo `asignadoA`;
- los demas campos de la tarea pueden seguir actualizandose normalmente.

## Lo Que Debes Verificar En El Frontend

### 1. Que la peticion salga al endpoint correcto

La peticion de edicion debe ir a uno de estos endpoints:

- `PUT /api/tareas/:id`
- `PATCH /api/tareas/:id`

No debe ir a un endpoint de cita para esta prueba.

### 2. Que el payload lleve IDs reales

El campo de responsables debe contener IDs de usuarios, no nombres, no correos y no etiquetas.

### 3. Que el arreglo no se convierta en un solo valor

Si seleccionas varios responsables, el frontend debe mandar todos.
Si seleccionas varios responsables, el frontend debe mandar todos en `asignadoA`.

### 4. Que el backend responda con el arreglo completo

La respuesta debe regresar la tarea actualizada con `asignadoA` como arreglo.

### 5. Que la UI refleje el cambio al recargar

Despues de guardar, al abrir otra vez la tarea debe verse la misma lista de responsables.

## Datos De Prueba

Usa esta base para probar la asignacion:

```json
{
  "titulo": "Tarea de prueba",
  "etapa": "contrato",
  "estado": "pendiente",
  "asignadoA": [
    "698369a08e72ed6558bdf6da",
    "6998b2becb83c41f1ee66687",
    "699bbf2f7fb19775ad32e58f",
    "6997ecffc5f0b9b61a04f3fb"
  ]
}
```

Si quieres probar el flujo completo con campos extra, agrega solo los que realmente edites en el formulario.

## Paso A Paso Para Revisarlo En El Frontend

### Paso 1. Abrir DevTools

1. Abre la pantalla donde editas la tarea.
2. Presiona `F12` o `Ctrl + Shift + I`.
3. Entra a la pestaña `Network`.
4. Marca la opcion para conservar el registro si quieres revisar varias peticiones seguidas.

### Paso 2. Hacer un cambio pequeno

Para no confundir la prueba, cambia solo una cosa visible, por ejemplo:

- el titulo;
- una nota;
- la etapa;
- o la lista de responsables.

La idea es que puedas saber exactamente que cambio debio guardarse.

### Paso 3. Guardar la tarea

Haz clic en el boton de guardar del formulario de detalles.

En `Network` debes ver una peticion hacia la API de tareas.

### Paso 4. Revisar la peticion real

Abre la request y valida lo siguiente:

- `Request URL` apunta a `/api/tareas/:id`.
- `Request Method` es `PUT` o `PATCH`.
- `Status Code` es `200`.
- En `Payload` o `Request Body` aparece `asignadoA` como arreglo.

### Paso 5. Confirmar que no se altero el arreglo

Dentro del request revisa:

- que haya varios IDs si seleccionaste varios empleados;
- que no se haya quedado solo uno;
- que no llegue `null`, `undefined` o cadena vacia como valor de responsable;
- que no lleguen objetos completos si el backend espera IDs.

### Paso 6. Confirmar que el formulario no esté duplicando la lista de forma incorrecta

Si el frontend usa un constructor de payload, revisa que:

- el arreglo de seleccionados se limpie de valores vacios;
- el arreglo no se convierta en string;
- no se manden varios alias diferentes si ya estas usando `asignadoA` como campo canónico.

La forma mas segura es que el frontend mande solo `asignadoA`.

## Estructura Esperada Del Payload

### Opcion recomendada

```json
{
  "titulo": "Tarea de prueba",
  "etapa": "contrato",
  "estado": "pendiente",
  "asignadoA": [
    "698369a08e72ed6558bdf6da",
    "6998b2becb83c41f1ee66687"
  ]
}
```

### Opcion recomendada

```json
{
  "titulo": "Tarea de prueba",
  "etapa": "contrato",
  "estado": "pendiente",
  "asignadoA": [
    "698369a08e72ed6558bdf6da",
    "6998b2becb83c41f1ee66687"
  ]
}
```

La prueba debe enfocarse en `asignadoA`. No hace falta duplicar la lista en otros alias para esta verificacion.

## Que Debe Regresar El Backend

Despues de guardar, la respuesta debe traer:

- `success: true`;
- la tarea actualizada;
- `asignadoA` como arreglo de IDs;
- `asignadoANombre` con los nombres resueltos;
- los demas campos sin perder sus valores previos.

## Como Saber Si El Fallo Esta En El Frontend

El fallo esta en el frontend si ocurre alguna de estas cosas:

- la request no sale con `asignadoA`;
- el arreglo llega vacio aunque elegiste responsables;
- solo llega un ID aunque seleccionaste varios;
- llegan nombres en vez de IDs;
- la request ni siquiera se envia al guardar.

## Como Saber Si El Fallo Esta En El Backend

El fallo esta en el backend si ocurre alguna de estas cosas:

- la request sale bien desde Network;
- el backend responde `200`;
- pero la respuesta ya regresa `asignadoA` vacio o recortado;
- o el documento guardado en MongoDB no cambia.

## Checklist Rapido

### Antes de guardar

- [ ] Seleccione mas de un responsable.
- [ ] Verifique que los IDs sean reales.
- [ ] Confirmo que el formulario esta editando una tarea y no una cita.

### Al guardar

- [ ] La request fue a `/api/tareas/:id`.
- [ ] El metodo fue `PUT` o `PATCH`.
- [ ] La respuesta fue `200`.
- [ ] El payload incluyo `asignadoA`.

### Despues de guardar

- [ ] La respuesta regreso el arreglo completo.
- [ ] La tarea en la UI muestra los mismos responsables.
- [ ] Al recargar la pagina siguen apareciendo los mismos IDs o nombres.

## Recomendacion Practica

Para hacer la prueba mas limpia, usa solo un cambio por intento:

1. Primero prueba solo responsables.
2. Luego prueba responsables + titulo.
3. Luego prueba responsables + etapa + estado.

Asi puedes aislar rapidamente si el problema esta en la asignacion o en otro campo del formulario.

## ConclusioN

Si el frontend manda un arreglo valido en `asignadoA`, el backend debe poder guardarlo sin romper los demas datos de la tarea.

La prueba correcta no es solo ver que la request tenga `200`, sino confirmar que:

- el payload de salida es correcto;
- la respuesta del backend coincide;
- y la informacion que vuelve a mostrarse en pantalla es exactamente la misma que se guardo.
