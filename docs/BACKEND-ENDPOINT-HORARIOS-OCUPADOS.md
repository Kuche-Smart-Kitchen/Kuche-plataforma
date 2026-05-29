# Endpoint: Obtener Horarios Ocupados (Público)

## Descripción General
Endpoint público que devuelve SOLO la fecha y hora de todas las citas **sin requerir autenticación ni exponer información sensible del cliente**. Esto es crítico para que el frontend cargue los horarios disponibles sin necesidad de credenciales.

## Endpoint
```
GET /api/citas/horarios-ocupados
```

## Autenticación
**NINGUNA** - Este es un endpoint completamente público.

## Headers
```
Content-Type: application/json
```

## Query Parameters
Ninguno requerido.

## Respuesta Exitosa (200 OK)

### Opción 1: Array directo
```json
[
  {
    "fecha": "2026-05-20",
    "hora": "09:00"
  },
  {
    "fecha": "2026-05-20",
    "hora": "10:00"
  },
  {
    "fecha": "2026-05-21",
    "hora": "14:00"
  }
]
```

### Opción 2: Objeto con estructura ApiResponse
```json
{
  "success": true,
  "data": [
    {
      "fecha": "2026-05-20",
      "hora": "09:00"
    },
    {
      "fecha": "2026-05-20",
      "hora": "10:00"
    },
    {
      "fecha": "2026-05-21",
      "hora": "14:00"
    }
  ]
}
```

## Formato de Campos

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `fecha` | string | Fecha en formato ISO: `YYYY-MM-DD` |
| `hora` | string | Hora en formato de 24 horas: `HH:00` |

## Criterios de Inclusión de Citas

Solo incluir citas que cumplan:
1. **Estado**: `programada` o `en_proceso` (NO incluir `completada` o `cancelada`)
2. **Fecha futura**: La fecha debe ser mayor o igual a hoy
3. **Horario válido**: Entre 09:00 y 17:00 (9 AM a 5 PM)

## Consideraciones de Seguridad

1. **NO incluir información sensible**:
   - ❌ Nombres de clientes
   - ❌ Correos electrónicos
   - ❌ Teléfonos
   - ❌ Datos del ingeniero asignado
   - ❌ Información adicional
   - ❌ IDs de citas (_id)

2. **Solo fecha y hora**:
   - ✅ Fecha (formato YYYY-MM-DD)
   - ✅ Hora (formato HH:00)

## Manejo de Errores

Si ocurre un error, devolver:

```json
{
  "success": false,
  "message": "Error al obtener horarios ocupados",
  "data": []
}
```

En caso de error crítico, devolver array vacío `[]` para que el frontend continúe funcionando sin bloqueos.

## Casos de Uso en Frontend

1. **Al cargar `/agendar`**:
   - El frontend llama a `obtenerHorariosOcupados()`
   - Obtiene todas las horas ocupadas
   - Desactiva esos horarios en el calendario para que no se puedan seleccionar
   - Los botones de hora se muestran tachados y deshabilitados

2. **Persistencia local**:
   - El frontend también carga citas del localStorage (creadas en la sesión actual)
   - Combina backend + localStorage para mostrar el estado completo

## Ejemplo de Implementación (Node.js/Express)

```javascript
router.get('/horarios-ocupados', async (req, res) => {
  try {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const citas = await Cita.find({
      estado: { $in: ['programada', 'en_proceso'] },
      fechaAgendada: { $gte: hoy }
    }).select('fechaAgendada -_id').lean();

    const horarios = citas.map(cita => {
      const fecha = new Date(cita.fechaAgendada);
      return {
        fecha: fecha.toISOString().split('T')[0], // YYYY-MM-DD
        hora: String(fecha.getHours()).padStart(2, '0') + ':00' // HH:00
      };
    });

    res.json(horarios);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener horarios',
      data: []
    });
  }
});
```

## Testing

### Prueba 1: Sin autenticación (debe funcionar)
```bash
curl http://localhost:3001/api/citas/horarios-ocupados
```

### Prueba 2: Con token JWT (debe funcionar igual)
```bash
curl -H "Authorization: Bearer TOKEN_AQUI" \
     http://localhost:3001/api/citas/horarios-ocupados
```

### Resultado esperado
Array de horarios ocupados sin información sensible.

## Impacto en Performance

- Consulta lightweight: solo fecha y hora, sin población de referencias
- Usar `.lean()` en MongoDB para resultados más rápidos
- Cacheable (considerar TTL de 5-15 minutos en producción)

## Notas de Implementación

1. Este endpoint es **crítico para la experiencia del usuario** - debe ser rápido
2. No requiere validación de CAPTCHA
3. No requiere autenticación
4. Es seguro exponerlo públicamente (solo fecha/hora)
5. Frontend depende de esta información para bloquear horarios automáticamente
