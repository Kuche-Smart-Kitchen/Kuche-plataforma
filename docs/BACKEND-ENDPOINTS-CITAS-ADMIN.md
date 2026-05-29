# Endpoints de Citas - Especificación Backend Detallada

## 1. Asignar Múltiples Ingenieros a una Cita

### Endpoint
```
PUT /api/citas/{id}/asignarIngenieros
```

### Propósito
Permite asignar uno o más ingenieros a una cita, reemplazando la asignación anterior.

### Autenticación
**Requerida**: Solo administrador

### Headers
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

### Parámetros de URL
```
id: string (ID de la cita)
```

### Body Request

```json
{
  "ingenieroIds": ["id_ingeniero_1", "id_ingeniero_2", "id_ingeniero_3"]
}
```

**O solo un ingeniero:**
```json
{
  "ingenieroIds": ["id_ingeniero_1"]
}
```

**Para desasignar todos:**
```json
{
  "ingenieroIds": []
}
```

### Estructura de Respuesta (200 OK)

```json
{
  "success": true,
  "message": "Ingenieros asignados correctamente",
  "data": {
    "cita": {
      "_id": "cita_id",
      "nombreCliente": "Juan Pérez",
      "correoCliente": "juan@example.com",
      "telefonoCliente": "+525512345678",
      "fechaAgendada": "2026-05-20T14:00:00Z",
      "ubicacion": "Durango Capital",
      "estado": "programada",
      "ingenieroAsignado": [
        {
          "_id": "ing_1",
          "nombre": "Carlos García",
          "correo": "carlos@kuche.com",
          "telefono": "+525587654321",
          "rol": "Ingeniero"
        },
        {
          "_id": "ing_2",
          "nombre": "María López",
          "correo": "maria@kuche.com",
          "telefono": "+525598765432",
          "rol": "Ingeniero"
        }
      ],
      "createdAt": "2026-05-15T10:30:00Z",
      "updatedAt": "2026-05-20T12:00:00Z"
    }
  }
}
```

### Cambio de Estructura de Datos

**ANTES:**
```typescript
ingenieroAsignado?: {
  _id: string;
  nombre: string;
  correo: string;
  telefono?: string;
  rol: string;
} | string;
```

**DESPUÉS:**
```typescript
ingenieroAsignado?: ({
  _id: string;
  nombre: string;
  correo: string;
  telefono?: string;
  rol: string;
} | string)[];
```

### Validaciones

1. **IDs válidos**: Todos los IDs en `ingenieroIds` deben ser válidos
2. **Ingenieros existentes**: Verificar que los ingenieros existen en la BD
3. **Sin duplicados**: No permitir duplicados en `ingenieroIds`
4. **Solo admin**: Solo usuarios con rol `admin` pueden hacer esta operación

### Errores

```json
{
  "success": false,
  "message": "Error al asignar ingenieros",
  "error": "El ingeniero con ID {id} no existe"
}
```

---

## 2. Actualizar Datos de la Cita (Cliente)

### Endpoint
```
PUT /api/citas/{id}/actualizarDatos
```

### Propósito
Permite editar información del cliente y detalles de la cita. Solo admin puede editar estos datos.

### Autenticación
**Requerida**: Solo administrador

### Headers
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

### Parámetros de URL
```
id: string (ID de la cita)
```

### Body Request (Solo campos a actualizar)

```json
{
  "nombreCliente": "Juan Pérez Actualizado",
  "correoCliente": "nuevocorreo@example.com",
  "telefonoCliente": "+525599998888",
  "ubicacion": "Gómez Palacio",
  "informacionAdicional": "Información actualizada del proyecto"
}
```

### Estructura de Respuesta (200 OK)

```json
{
  "success": true,
  "message": "Datos de la cita actualizados correctamente",
  "data": {
    "cita": {
      "_id": "cita_id",
      "nombreCliente": "Juan Pérez Actualizado",
      "correoCliente": "nuevocorreo@example.com",
      "telefonoCliente": "+525599998888",
      "fechaAgendada": "2026-05-20T14:00:00Z",
      "ubicacion": "Gómez Palacio",
      "informacionAdicional": "Información actualizada del proyecto",
      "estado": "programada",
      "ingenieroAsignado": [...],
      "createdAt": "2026-05-15T10:30:00Z",
      "updatedAt": "2026-05-20T12:15:00Z"
    }
  }
}
```

### Campos Editables

| Campo | Tipo | Requerido | Validación |
|-------|------|-----------|-----------|
| `nombreCliente` | string | No | Min 3 caracteres |
| `correoCliente` | string | No | Email válido |
| `telefonoCliente` | string | No | Formato +52 |
| `ubicacion` | string | No | - |
| `informacionAdicional` | string | No | - |

### Campos NO Editables

- `fechaAgendada` (requiere cancelar y crear nueva)
- `estado` (usar endpoint específico)
- `ingenieroAsignado` (usar endpoint específico)

### Validaciones

1. **Email**: Si se proporciona, debe ser email válido
2. **Teléfono**: Si se proporciona, debe ser teléfono válido
3. **No vacíos**: Los campos no deben ser vacíos después de actualizar
4. **Solo admin**: Solo usuarios con rol `admin` pueden hacer esta operación

### Errores

```json
{
  "success": false,
  "message": "Error al actualizar datos",
  "error": "Email no válido"
}
```

---

## 3. Actualizar Estado de la Cita

### Endpoint
```
PUT /api/citas/{id}/actualizarEstado
```

### Propósito
Cambia el estado de la cita y opcionalmente la fecha de término.

### Autenticación
**Requerida**: Solo administrador

### Headers
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

### Body Request

```json
{
  "estado": "en_proceso",
  "fechaTermino": "2026-05-25T16:00:00Z"
}
```

### Estados Permitidos

- `programada`: Cita pendiente
- `en_proceso`: Cita en ejecución
- `completada`: Cita finalizada (requiere `fechaTermino`)
- `cancelada`: Cita cancelada

### Validaciones

1. **Estado válido**: Solo valores permitidos
2. **Transiciones válidas**: 
   - `programada` → `en_proceso`, `cancelada`
   - `en_proceso` → `completada`, `cancelada`
   - `completada` → No puede cambiar
   - `cancelada` → No puede cambiar
3. **Fecha de término**: Requerida si estado es `completada`, debe ser >= `fechaAgendada`

---

## 4. Notas de Implementación

### Migración de Datos

Si el backend ya tiene citas con `ingenieroAsignado` singular, hacer una migración:

```javascript
// Migración de ingenieroAsignado singular a array
db.citas.updateMany(
  { ingenieroAsignado: { $exists: true, $ne: null, $type: "object" } },
  [
    {
      $set: {
        ingenieroAsignado: ["$ingenieroAsignado"]
      }
    }
  ]
);

// Convertir strings a arrays
db.citas.updateMany(
  { ingenieroAsignado: { $type: "string" } },
  [
    {
      $set: {
        ingenieroAsignado: ["$ingenieroAsignado"]
      }
    }
  ]
);
```

### Backward Compatibility

El frontend debe manejar:
- `ingenieroAsignado` como object (antiguo)
- `ingenieroAsignado` como array (nuevo)

```typescript
const getIngenieros = (cita: Cita) => {
  if (!cita.ingenieroAsignado) return [];
  if (Array.isArray(cita.ingenieroAsignado)) return cita.ingenieroAsignado;
  return [cita.ingenieroAsignado]; // Compatibilidad con antiguo formato
};
```

### Performance

- Usar indexes en: `_id`, `estado`, `ingenieroAsignado._id`
- Cachear lista de empleados (no cambia frecuentemente)
- Invalidar caché cuando se asignen ingenieros

### Testing

**Test 1: Asignar múltiples ingenieros**
```bash
curl -X PUT http://localhost:3001/api/citas/abc123/asignarIngenieros \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ingenieroIds": ["ing1", "ing2", "ing3"]}'
```

**Test 2: Editar datos del cliente**
```bash
curl -X PUT http://localhost:3001/api/citas/abc123/actualizarDatos \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "nombreCliente": "Nuevo Nombre",
    "correoCliente": "nuevo@example.com",
    "telefonoCliente": "+525599998888"
  }'
```

**Test 3: Actualizar estado**
```bash
curl -X PUT http://localhost:3001/api/citas/abc123/actualizarEstado \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"estado": "en_proceso"}'
```

---

## 5. Ejemplo de Implementación (Node.js/Express)

### Asignar Múltiples Ingenieros

```javascript
router.put('/:id/asignarIngenieros', verifyToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { ingenieroIds } = req.body;

    // Validar IDs
    if (!Array.isArray(ingenieroIds)) {
      return res.status(400).json({
        success: false,
        message: 'ingenieroIds debe ser un array'
      });
    }

    // Remover duplicados
    const uniqueIds = [...new Set(ingenieroIds)];

    // Verificar que todos los ingenieros existen
    const ingenieros = await Usuario.find({ _id: { $in: uniqueIds } });
    if (ingenieros.length !== uniqueIds.length) {
      return res.status(400).json({
        success: false,
        message: 'Uno o más ingenieros no existen'
      });
    }

    // Actualizar cita
    const cita = await Cita.findByIdAndUpdate(
      id,
      { ingenieroAsignado: uniqueIds.length > 0 ? ingenieros : [] },
      { new: true }
    ).populate('ingenieroAsignado');

    res.json({
      success: true,
      message: 'Ingenieros asignados correctamente',
      data: { cita }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al asignar ingenieros',
      error: error.message
    });
  }
});
```

### Actualizar Datos del Cliente

```javascript
router.put('/:id/actualizarDatos', verifyToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { nombreCliente, correoCliente, telefonoCliente, ubicacion, informacionAdicional } = req.body;

    // Validaciones
    if (correoCliente && !isValidEmail(correoCliente)) {
      return res.status(400).json({
        success: false,
        message: 'Email no válido'
      });
    }

    // Construir objeto de actualización
    const updateData = {};
    if (nombreCliente) updateData.nombreCliente = nombreCliente;
    if (correoCliente) updateData.correoCliente = correoCliente;
    if (telefonoCliente) updateData.telefonoCliente = telefonoCliente;
    if (ubicacion !== undefined) updateData.ubicacion = ubicacion;
    if (informacionAdicional !== undefined) updateData.informacionAdicional = informacionAdicional;

    const cita = await Cita.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('ingenieroAsignado');

    res.json({
      success: true,
      message: 'Datos de la cita actualizados correctamente',
      data: { cita }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al actualizar datos',
      error: error.message
    });
  }
});
```

### Actualizar Estado

```javascript
router.put('/:id/actualizarEstado', verifyToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { estado, fechaTermino } = req.body;

    const estadosValidos = ['programada', 'en_proceso', 'completada', 'cancelada'];
    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({
        success: false,
        message: 'Estado no válido'
      });
    }

    if (estado === 'completada' && !fechaTermino) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere fechaTermino cuando estado es completada'
      });
    }

    const cita = await Cita.findByIdAndUpdate(
      id,
      {
        estado,
        ...(fechaTermino && { fechaTermino })
      },
      { new: true }
    ).populate('ingenieroAsignado');

    res.json({
      success: true,
      message: 'Estado actualizado correctamente',
      data: { cita }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al actualizar estado',
      error: error.message
    });
  }
});
```

---

## Resumen de Cambios

| Aspecto | Antes | Después |
|--------|--------|---------|
| Ingenieros por cita | 1 | Múltiples |
| Endpoint asignar | PUT `/asignarIngeniero` | PUT `/asignarIngenieros` |
| Edición de datos | No | Sí (admin) |
| Campos editables | Solo estado | Estado, datos cliente, ingenieros |
| Endpoints | 1 | 3 nuevos + actualización |
