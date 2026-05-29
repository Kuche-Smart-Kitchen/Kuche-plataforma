# Separacion De Edicion Y Asignacion En Tareas

## Objetivo

Se separo el flujo de tareas en dos acciones distintas para evitar que una sola peticion mezcle dos responsabilidades diferentes:

- **editar datos de la tarea**
- **asignar trabajadores a la tarea**

Esto permite que el frontend tenga dos botones claros:

1. **Guardar cambios** para los datos de la tarea.
2. **Asignar trabajador** para los responsables.

## Por Que Se Hizo Esta Separacion

Antes, el mismo endpoint intentaba manejar todo al mismo tiempo:

- datos generales de la tarea;
- etapa;
- estado;
- asignacion de trabajadores;
- datos derivados del flujo de cita;
- notas y fechas.

Eso hacia que el formulario fuera mas frágil y que cualquier problema en asignacion pudiera afectar el guardado de los demas datos.

Separarlo reduce el riesgo de romper todo por una sola parte.

## Que Quedo En Cada Endpoint

### 1. Edicion de datos de tarea

#### Endpoint

```http
PUT /api/tareas/:id
```

Tambien acepta:

```http
PATCH /api/tareas/:id
```

#### Para que sirve

Este endpoint ahora es solo para editar datos de la tarea.

Ejemplos:

- titulo;
- etapa;
- estado;
- notas;
- prioridad;
- fechas;
- ubicacion;
- datos embebidos de cita o cliente;
- project / nombreProyecto;
- pagos;
- seguimiento.

#### Importante

Este endpoint ya **no** debe usarse para mandar responsables.

Si el frontend envia `asignadoA` aqui, ya no es el flujo correcto.

### 2. Asignacion de trabajadores

#### Endpoint

```http
PUT /api/tareas/:id/asignar-trabajadores
```

Tambien acepta:

```http
PATCH /api/tareas/:id/asignar-trabajadores
```

#### Para que sirve

Este endpoint solo actualiza:

- `asignadoA`
- `asignadoANombre`

#### Regla

Solo un `admin` puede usarlo.

## Como Debe Verse El Frontend Ahora

### Boton 1: Guardar cambios

Este boton debe enviar solo los datos editables de la tarea.

Ejemplo de payload:

```json
{
  "titulo": "Tarea de prueba",
  "etapa": "contrato",
  "estado": "pendiente",
  "notas": "Actualizacion del detalle",
  "prioridad": "media",
  "ubicacion": "Durango Capital"
}
```

### Boton 2: Asignar trabajador

Este boton debe enviar solo los responsables.

Ejemplo de payload:

```json
{
  "asignadoA": [
    "698369a08e72ed6558bdf6da",
    "6998b2becb83c41f1ee66687"
  ]
}
```

## Flujo Recomendado En La UI

### Paso 1

El usuario modifica los datos de la tarea en el formulario.

### Paso 2

El usuario presiona **Guardar cambios**.

### Paso 3

Si necesita cambiar responsables, usa el boton **Asignar trabajador**.

### Paso 4

El frontend refresca la tarea despues de cada accion para mostrar el estado real.

## Beneficios De Esta Separacion

- menos riesgo de romper el guardado completo;
- mas claridad en el frontend;
- mas facil depurar errores;
- mas facil revisar que cambio falló;
- mejor control de responsabilidades en el backend.

## Que Puede Salir Mal Si Se Mezcla Otra Vez

### 1. Enviar responsables en el endpoint de datos

Si el frontend vuelve a mandar `asignadoA` en `PUT /api/tareas/:id`, ese flujo ya no es el correcto.

### 2. Mandar datos generales en el endpoint de asignacion

Si el frontend envia titulo, etapa o notas al endpoint de asignacion, no es necesario y puede causar validaciones innecesarias.

### 3. No refrescar la tarea despues de guardar

Aunque el backend guarde bien, la UI puede mostrar estado viejo si no vuelve a leer la tarea actualizada.

## Campos Canonicos

### Para datos de tarea

- `titulo`
- `etapa`
- `estado`
- `notas`
- `prioridad`
- `ubicacion`
- `mapsUrl`
- `fechaLimite`
- `scheduledAt`
- `visitScheduledAt`
- `nombreProyecto`
- `project`
- `pagos`
- `seguimientoNota`

### Para asignacion

- `asignadoA`

Ese arreglo es el que se guarda en la base de datos.

## Resumen Tecnico Del Cambio

### Antes

- Un solo update intentaba hacer todo.
- La asignacion estaba mezclada con la edicion general.
- Un problema en responsables podia afectar el guardado de otros campos.

### Ahora

- Un endpoint guarda los datos generales.
- Otro endpoint guarda solo responsables.
- El frontend puede dispararlos por separado.

## Recomendacion Final Para El Frontend

No mezcles los dos flujos.

Haz dos acciones separadas:

1. guardar datos de la tarea;
2. asignar trabajadores.

Esa es la forma mas segura de evitar regresiones y de saber exactamente donde falla algo si aparece un error.
