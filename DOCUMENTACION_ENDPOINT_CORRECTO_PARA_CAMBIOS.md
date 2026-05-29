# Endpoint Correcto Segun El Cambio

## Regla General

Antes de guardar, separa dos flujos distintos:

- **cita**: datos de la agenda, estado de la cita y asignación de empleados a la cita.
- **tarea**: responsables del tablero operativo, etapa, estado de trabajo y seguimiento.

Si usas la ruta equivocada, el request puede responder `200` pero el cambio quedara guardado en la coleccion incorrecta.

## Citas

Usa endpoints de `citas` cuando el cambio afecte la cita original.

### Casos correctos

- cambiar nombre, correo, telefono, ubicacion o informacion adicional de la cita;
- cambiar el estado de la cita;
- asignar o quitar empleados/ingenieros de la cita;
- iniciar, finalizar o cancelar la cita.

### Endpoints relevantes

- `PUT /api/citas/:id/actualizarDatos`
- `PUT /api/citas/updateEstado/:id`
- `PUT /api/citas/:id/asignarIngenieros`

### Body esperado para asignar empleados

```json
{
  "ingenieroIds": ["id_1", "id_2"]
}
```

## Tareas

Usa endpoints de `tareas` cuando el cambio pertenezca al flujo operativo del panel.

### Casos correctos

- cambiar responsables de la tarea;
- cambiar etapa;
- cambiar estado operativo;
- editar titulo o notas de trabajo;
- actualizar fecha limite, ubicacion o datos visibles del panel.

### Endpoints relevantes

- `PUT /api/tareas/:id`
- `PATCH /api/tareas/:id`

### Body esperado para responsables de tarea

```json
{
  "titulo": "Tarea de prueba",
  "etapa": "contrato",
  "estado": "pendiente",
  "asignadoA": ["698369a08e72ed6558bdf6da", "6998b2becb83c41f1ee66687"]
}
```

## Que Debes Revisar En Network

### Si editas cita

Busca uno de estos requests:

```text
PUT /api/citas/:id/actualizarDatos
PUT /api/citas/updateEstado/:id
PUT /api/citas/:id/asignarIngenieros
```

### Si editas tarea

Busca uno de estos requests:

```text
PUT /api/tareas/:id
PATCH /api/tareas/:id
```

## Como Saber Si Funciono

### Funciono bien si

- el endpoint correcto se llamo;
- la respuesta fue `200`;
- el documento correcto cambio en la base de datos;
- al recargar la UI ves el mismo dato guardado.

### No funciono bien si

- el request fue a la coleccion equivocada;
- el backend respondio `200` pero revisaste otro documento;
- la UI no hizo refetch y mostro datos viejos;
- mandaste campos de cita cuando querias modificar la tarea.

## Resumen Final

- Usa `citas` para editar datos, estado y asignación de empleados de la cita.
- Usa `tareas` para asignacion y flujo operativo del panel.
- Si cambias responsables del panel, debes tocar `tareas`.
- Si cambias empleados asignados a la cita, debes tocar `citas`.
