# syncTaskFromCita() - Sincronización de Citas a Tareas

## ¿Qué hace?
Sincroniza automáticamente una **cita** (appointment) con una **tarea** en el sistema. Cuando se crea, actualiza o cambia el estado de una cita, esta función asegura que existe una tarea correspondiente con toda la información sincronizada.

## Propósito
Permite que los ingenieros y arquitectos vean las citas como tareas en su panel de trabajo (kanban/workflow), sin duplicar información.

## Flujo de funcionamiento

### 1. **Extrae los ingenieros asignados** (soporta array o singular)
```
Si ingenieroAsignado es un ARRAY:
  - Obtiene todos los IDs del array
  - Busca el nombre de cada ingeniero en la BD
  
Si ingenieroAsignado es SINGULAR (formato antiguo):
  - Convierte a formato de array para compatibilidad
```

### 2. **Busca si ya existe una tarea** para esta cita
- Usa `sourceType: 'cita'` y `sourceId: citaId` para identificarla
- Si existe, la actualiza
- Si no existe, la crea nueva

### 3. **Sincroniza los datos**
Copia la información de la cita a la tarea:
- **Estado**: Convierte estado de cita → estado de tarea
- **Ingenieros**: Lista completa de asignados
- **Descripción**: Información adicional o especificaciones
- **Cliente**: Datos del cliente
- **Historial**: Registra quién y cuándo hizo el cambio

### 4. **Actualiza acceso de seguimiento**
Asegura que el cliente pueda ver el progreso de su cita en el portal de seguimiento.

## Cambio clave reciente
Ahora soporta **múltiples ingenieros por cita** (antes solo soportaba uno):
- ✅ Array de ingenieros: `ingenieroAsignado: [id1, id2, id3]`
- ✅ Backward compatible: Sigue funcionando con singular
- ✅ Todos los ingenieros aparecen en la tarea

## Ejemplo
**Si una cita tiene:**
```
ingenieroAsignado: [id_juan, id_carlos]
estado: "en_proceso"
nombreCliente: "María"
```

**La tarea sincronizada tendrá:**
```
asignadoA: [id_juan, id_carlos]
asignadoANombre: ["Juan García", "Carlos López"]
estado: "en_proceso"
cita: { nombreCliente: "María", ... }
```

## Cuándo se ejecuta
- Al crear una cita nueva
- Al actualizar datos de la cita
- Al cambiar el estado de la cita
- Al asignar/reasignar ingenieros
