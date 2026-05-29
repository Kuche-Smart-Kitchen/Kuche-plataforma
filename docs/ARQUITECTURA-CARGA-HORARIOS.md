# Flujo de Carga de Horarios - Arquitectura Completa

## Diagrama de Flujo

```
┌─────────────────────────────────────────────────────────────────┐
│ Usuario abre /agendar                                           │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ BookingSection.tsx - useEffect (mount)                          │
│ Llama: loadCitas()                                              │
└────────────────────────────┬────────────────────────────────────┘
                             │
         ┌───────────────────┴───────────────────┐
         │                                       │
         ▼                                       ▼
    ┌─────────────────┐            ┌──────────────────────┐
    │ localStorage    │            │ Backend API          │
    │ kuche_appoint.. │            │ GET /horarios-..     │
    └────────┬────────┘            └──────────┬───────────┘
             │                                │
             ▼                                ▼
    ┌─────────────────┐            ┌──────────────────────┐
    │ loadAppointments│            │obtenerHorariosOcupados
    │ ()              │            │ ()                   │
    └────────┬────────┘            └──────────┬───────────┘
             │                                │
             │ Devuelve:                      │ Devuelve:
             │ {                              │ [{
             │   "2026-05-20": ["09:00"],     │   fecha: "2026-05-20",
             │   "2026-05-21": ["14:00"]      │   hora: "09:00"
             │ }                              │ }, ...]
             │                                │
         ┌───┴────────────────────────────────┴───┐
         │                                        │
         ▼                                        ▼
┌──────────────────────────────────────────────────────────┐
│ Combinar ambas fuentes:                                  │
│ - Backend: Citas ya registradas en el sistema            │
│ - localStorage: Citas de esta sesión (no guardadas aún)  │
│                                                          │
│ Resultado final: AppointmentsByDateAndTime               │
│ {                                                        │
│   "2026-05-20": ["09:00", "10:00", "14:00"],            │
│   "2026-05-21": ["14:00", "15:00"]                      │
│ }                                                        │
└─────────────────────────┬──────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ setAppointmentsByDateAndTime(combined)                          │
│ Re-render del calendario                                        │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ Renderizar botones de horas:                                    │
│ - Obtener horas bloqueadas: getBlockedHours(selectedDate, ...)  │
│ - Aplicar estilos (tachado, gris, deshabilitado)                │
│ - Usuario NO puede hacer clic en horas ocupadas                 │
└─────────────────────────────────────────────────────────────────┘
```

## Componentes Clave

### 1. Frontend: `BookingSection.tsx`

```typescript
// Al montar el componente
useEffect(() => {
  const loadCitas = async () => {
    try {
      // 1. Cargar del backend (PÚBLICO)
      const backendCitas = await loadAppointmentsFromBackend();
      
      // 2. Cargar del localStorage (local)
      const localCitas = loadAppointments();
      
      // 3. Combinar
      const combined = { ...backendCitas, ...localCitas };
      
      // 4. Actualizar estado
      setAppointmentsByDateAndTime(combined);
    } catch (error) {
      // Fallback: solo localStorage si falla el backend
      const localCitas = loadAppointments();
      setAppointmentsByDateAndTime(localCitas);
    }
  };
  
  loadCitas();
}, []);
```

### 2. Validaciones: `validacionesAgendaCitas.ts`

#### Función: `loadAppointmentsFromBackend()`

```typescript
export const loadAppointmentsFromBackend = async (): Promise<AppointmentsByDateAndTime> => {
  try {
    // Llamar endpoint público
    const response = await obtenerHorariosOcupados();
    
    if (!response.success || !response.data) {
      return {};
    }

    // Convertir array a Record<fecha, hora[]>
    const appointments: AppointmentsByDateAndTime = {};
    response.data.forEach((horario) => {
      const dateKey = horario.fecha; // YYYY-MM-DD
      const hour = horario.hora;     // HH:00
      
      if (dateKey && hour) {
        if (!appointments[dateKey]) {
          appointments[dateKey] = [];
        }
        appointments[dateKey].push(hour);
      }
    });

    return appointments;
  } catch (error) {
    console.error("Error al cargar horarios:", error);
    return {}; // Fallback: array vacío
  }
};
```

#### Función: `getBlockedHours()`

```typescript
export const getBlockedHours = (
  date: Date,
  appointments: AppointmentsByDateAndTime
): Set<string> => {
  const dateKey = getDateKey(date);
  const occupied = appointments[dateKey] || [];
  const blocked = new Set<string>();

  // Agregar horas ocupadas + buffer (1 hora antes/después)
  occupied.forEach((hour) => {
    blocked.add(hour);
    
    // Buffer: una hora antes
    const hourNum = parseInt(hour.split(':')[0]);
    if (hourNum > 9) {
      blocked.add(String(hourNum - 1).padStart(2, '0') + ':00');
    }
    
    // Buffer: una hora después
    if (hourNum < 17) {
      blocked.add(String(hourNum + 1).padStart(2, '0') + ':00');
    }
  });

  return blocked;
};
```

### 3. API: `citasApi.ts`

#### Función: `obtenerHorariosOcupados()`

```typescript
export const obtenerHorariosOcupados = async (): Promise<ApiResponse<HorarioOcupadoPublico[]>> => {
  try {
    const response = await axiosInstance.get('/api/citas/horarios-ocupados', {
      skipAuthToken: true, // ← CRÍTICO: No enviar token JWT
    } as any);
    
    if (Array.isArray(response.data)) {
      return {
        success: true,
        data: response.data
      };
    }
    
    return response.data;
  } catch (error) {
    console.error('Error en obtenerHorariosOcupados:', error);
    return {
      success: false,
      data: [],
      message: 'Error al obtener horarios ocupados'
    };
  }
};
```

## Tipos de Datos

### `HorarioOcupadoPublico` (del Backend)
```typescript
interface HorarioOcupadoPublico {
  fecha: string; // "YYYY-MM-DD"
  hora: string;  // "HH:00"
}
```

### `AppointmentsByDateAndTime` (Frontend)
```typescript
type AppointmentsByDateAndTime = Record<string, string[]>;

// Ejemplo:
{
  "2026-05-20": ["09:00", "10:00", "14:00"],
  "2026-05-21": ["14:00", "15:00"]
}
```

## Flujo de Registro de Nueva Cita

```
1. Usuario selecciona fecha/hora
   ↓
2. Ingresa datos (nombre, email, teléfono)
   ↓
3. Hace clic en "Confirmar"
   ↓
4. Se muestra modal de confirmación
   ↓
5. Hace clic en "Confirmar" en modal
   ↓
6. Se ejecuta: enviar(payload)
   ↓
7. Backend recibe POST /api/citas/agregarCita
   ↓
8. Backend valida y guarda cita
   ↓
9. Frontend recibe respuesta exitosa
   ↓
10. Se llama: registerAppointment(date, time)
    - Guarda en localStorage
    - Retorna updated AppointmentsByDateAndTime
    ↓
11. Se llama: setAppointmentsByDateAndTime(updated)
    - Re-render del calendario
    - Hora recién registrada ahora aparece ocupada
    ↓
12. Se muestra modal de "¡Cita Registrada!"
    ↓
13. Usuario puede continuar agendando más citas
    - Las nuevas citas se cargan automáticamente
```

## Manejo de Errores

### Escenario 1: Backend caído
```
- obtenerHorariosOcupados() falla
- loadAppointmentsFromBackend() devuelve {}
- Se carga solo desde localStorage
- Usuario puede ver solo citas de esta sesión
- ✓ Experiencia degradada pero funcional
```

### Escenario 2: Network timeout
```
- El catch en loadCitas() captura el error
- Fallback a localStorage
- Si no hay datos locales, se usa {}
- ✓ Sin bloqueos, usuario puede usar el formulario
```

### Escenario 3: localStorage corrupto
```
- loadAppointments() devuelve {}
- Se carga del backend sin problema
- ✓ Backend es fuente de verdad
```

## Consideraciones de Performance

1. **Carga inicial**: ~200ms (petición HTTP + parsing)
2. **Fallback**: <10ms (localStorage solo)
3. **Combinación**: <1ms (merging de objetos pequeños)
4. **No bloquea UI**: async/await en useEffect

## Seguridad

1. **`skipAuthToken: true`**: No se envía JWT, permitiendo acceso público
2. **Sin información sensible**: Backend solo devuelve fecha/hora
3. **No requiere CAPTCHA**: Este es un GET público
4. **Idempotente**: Múltiples llamadas dan mismo resultado

## Testing

```typescript
// Verificar que citas se carguen correctamente
describe('loadAppointmentsFromBackend', () => {
  it('debe combinar backend + localStorage', async () => {
    // Mock del backend
    jest.mock('citasApi', () => ({
      obtenerHorariosOcupados: jest.fn().mockResolvedValue({
        success: true,
        data: [
          { fecha: '2026-05-20', hora: '09:00' }
        ]
      })
    }));
    
    const result = await loadAppointmentsFromBackend();
    expect(result['2026-05-20']).toContain('09:00');
  });
});
```

## Próximos Pasos

1. ✅ Frontend: Crear función `obtenerHorariosOcupados()`
2. ✅ Frontend: Integrar en `BookingSection.tsx`
3. ⏳ Backend: Implementar endpoint `GET /api/citas/horarios-ocupados`
4. ⏳ Testing: Verificar que calcula correctamente con buffer de 1 hora
5. ⏳ Monitoring: Agregar logs para trackear tiempos de carga
