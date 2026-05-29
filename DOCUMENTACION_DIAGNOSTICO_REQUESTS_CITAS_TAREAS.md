# Diagnostico De Requests Entre Citas Y Tareas

## Objetivo

Este documento sirve para revisar por que ves `200 OK` en consola pero no observas el cambio donde esperas verlo.

La idea es separar claramente dos flujos:

- **cita**: actualiza datos de la cita y el estado de la cita;
- **tarea**: guarda la informacion operativa que usa el panel, incluyendo responsables y datos que evolucionan con el proceso.

## Conclusion Rapida

Con los logs que compartiste, el frontend esta llamando rutas de **cita**:

- `PUT /api/citas/:id/actualizarDatos`
- `PUT /api/citas/updateEstado/:id`

Eso significa que la peticion **no** esta actualizando directamente la tarea.

Si lo que quieres ver reflejado es la tarea, debes revisar una request a:

- `PUT /api/tareas/:id`
- o `PATCH /api/tareas/:id`

## Lo Que Muestran Tus Logs

### Log del backend

```text
OPTIONS /api/citas/6a0dc790e09d61302c1cf672/actualizarDatos 204
PUT /api/citas/6a0dc790e09d61302c1cf672/actualizarDatos 200
OPTIONS /api/citas/updateEstado/6a0dc790e09d61302c1cf672 204
PUT /api/citas/updateEstado/6a0dc790e09d61302c1cf672 200
```

### Log del navegador

```text
Object
  citaId: "6a0dc790e09d61302c1cf672"
  datosCita:
    informacionAdicional: "Cita En hacienda de tapias\n"
    nombreCliente: "Miguel Sanchez"
    ubicacion: "Durango Capital"
  rawCita:
    informacionAdicional: "Cita En hacienda de tapias\n"
    nombreCliente: "Miguel Sanchez"
    ubicacion: "Durango Capital"
[citasApi] actualizarDatosCita request:
```

## Que Significa Eso

### 1. El frontend si esta generando una peticion

No esta fallando el envio a nivel de red.

### 2. La peticion esta entrando a citas, no a tareas

Eso es lo mas importante.

La ruta `actualizarDatosCita` solo actualiza datos basicos de la cita:

- nombreCliente
- correoCliente
- telefonoCliente
- ubicacion
- informacionAdicional

La ruta `updateEstado` solo cambia el estado de la cita.

Ninguna de esas dos rutas actualiza la asignacion de la tarea.

### 3. Los datos del log del navegador son pocos

En la consola solo aparece un objeto con:

- `nombreCliente`
- `ubicacion`
- `informacionAdicional`

No aparece una lista de responsables ni un payload de tarea completo.

Eso indica que el problema no esta en MongoDB: el problema esta en que el frontend esta usando el flujo de cita para un cambio que esperas ver en la tarea.

## Donde Esta El Problema

El problema esta en la **ruta que dispara el frontend**.

### Si quieres actualizar solo la cita

Entonces la request correcta es una de estas:

- `PUT /api/citas/:id/actualizarDatos`
- `PUT /api/citas/updateEstado/:id`

Y debes esperar que cambie solo la cita.

### Si quieres actualizar la tarea del panel

Entonces debes usar:

- `PUT /api/tareas/:id`
- o `PATCH /api/tareas/:id`

y el payload debe incluir `asignadoA` como arreglo si quieres responsables.

## Como Debe Verse Una Request Correcta De Tarea

### URL esperada

```http
PUT /api/tareas/6a0dc791e09d61302c1cf679
```

### Body esperado

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

### Respuesta esperada

- `success: true`
- `data.asignadoA` con todos los IDs
- `data.asignadoANombre` con los nombres resueltos
- los demas campos de la tarea sin perderse

## Como Debe Verse Una Request Correcta De Cita

### URL esperada

```http
PUT /api/citas/6a0dc790e09d61302c1cf672/actualizarDatos
```

### Body esperado

```json
{
  "nombreCliente": "Miguel Sanchez",
  "ubicacion": "Durango Capital",
  "informacionAdicional": "Cita En hacienda de tapias\n"
}
```

### Respuesta esperada

- `success: true`
- `data.cita` con los datos actualizados
- no cambia la asignacion de la tarea salvo que el flujo sincronizador lo haga por su lado

## Pasos Para Confirmarlo En El Frontend

### Paso 1. Abrir Network

1. Abre la pantalla del panel donde haces el cambio.
2. Abre DevTools con `F12`.
3. Ve a `Network`.
4. Limpia la lista de requests.

### Paso 2. Hacer la accion exacta

Haz una sola accion a la vez:

- si editas datos de cita, cambia solo datos de cita;
- si editas responsables, cambia solo responsables;
- si editas una tarea, entra al formulario de tarea.

### Paso 3. Revisar la request

Mira si la llamada dice:

- `citas` -> estas editando cita;
- `tareas` -> estas editando tarea.

Si ves `citas`, no esperes cambios directos en la tarea.

### Paso 4. Revisar el body

Busca estas claves:

- para cita: `nombreCliente`, `ubicacion`, `informacionAdicional`, `estado` o `estadoCita`;
- para tarea: `asignadoA`, `etapa`, `estado`, `titulo`.

Si el body no trae `asignadoA`, no estas probando la asignacion real de la tarea.

### Paso 5. Revisar la respuesta

En la respuesta valida:

- que la ruta sea la que esperabas;
- que el objeto devuelto sea el correcto;
- que los cambios esten en el recurso correcto.

## Regla Importante

No confundas sincronizacion con edicion directa.

Puede pasar que:

- la cita se actualice correctamente;
- la tarea tenga otra logica de sincronizacion;
- y por eso no veas el mismo cambio donde esperabas.

## Diagnostico Para Tu Caso

Con lo que muestras, el diagnostico mas probable es este:

1. El frontend esta mandando una request de **cita**.
2. El backend responde correctamente.
3. Tu revision espera ver ese cambio en la **tarea**.
4. Por eso parece que "no se actualiza".

## Que Debes Verificar A Continuacion

### Si quieres cambiar datos del panel operativo

Asegurate de que el frontend haga una request a tareas y no a citas.

### Si quieres cambiar datos de la cita

Entonces revisa la coleccion de citas en MongoDB, no la de tareas.

### Si quieres cambiar asignados

Asegurate de que el formulario realmente use el endpoint de tareas y que mande `asignadoA`.

## Checklist Final

- [ ] La request correcta es a `tareas` si estoy editando el panel operativo.
- [ ] La request correcta es a `citas` si estoy editando datos de cita.
- [ ] El body incluye la clave correcta para lo que quiero cambiar.
- [ ] La respuesta del backend corresponde al recurso correcto.
- [ ] Estoy revisando la coleccion correcta en MongoDB.

## Resumen

Tu log demuestra que la API responde bien, pero la peticion esta entrando a `citas`.

Si esperas ver cambios en la tarea, el problema no es la persistencia: es que el frontend esta disparando la ruta equivocada o revisando el documento equivocado.
