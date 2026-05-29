import { runtimeStore } from "@/lib/runtime-store";
import { obtenerHorariosOcupados } from "@/lib/axios/citasApi";

export type AppointmentsByDateAndTime = Record<string, string[]>;

const STORAGE_KEY = "kuche_appointments_persistent";

/**
 * Convierte una fecha a formato YYYY-MM-DD para usar como clave
 */
export const getDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * Extrae la hora en formato HH:00 de un string ISO
 */
export const extractHourFromISO = (isoString: string): string => {
  try {
    const date = new Date(isoString);
    const hours = String(date.getHours()).padStart(2, "0");
    return `${hours}:00`;
  } catch {
    return "";
  }
};

/**
 * Obtiene todos los horarios ocupados del backend (PÚBLICOS - sin autenticación)
 * Y los convierte al formato de appointmentsByDateAndTime
 */
export const loadAppointmentsFromBackend = async (): Promise<AppointmentsByDateAndTime> => {
  try {
    const response = await obtenerHorariosOcupados();
    
    if (!response.success) {
      return {};
    }

    // Validar que response.data existe y es un array
    if (!response.data || !Array.isArray(response.data)) {
      return {};
    }

    const appointments: AppointmentsByDateAndTime = {};

    // Iterar sobre array de horarios ocupados
    response.data.forEach((horario) => {
      const dateKey = horario.fecha; // Ya viene en formato YYYY-MM-DD
      const hour = horario.hora;     // Ya viene en formato HH:00

      if (dateKey && hour) {
        if (!appointments[dateKey]) {
          appointments[dateKey] = [];
        }
        appointments[dateKey].push(hour);
      }
    });

    return appointments;
  } catch (error) {
    console.error("Error al cargar horarios ocupados del backend:", error);
    return {};
  }
};

/**
 * Obtiene todas las citas registradas del localStorage
 */
export const loadAppointments = (): AppointmentsByDateAndTime => {
  if (typeof window === "undefined") return {};
  try {
    // Intentar cargar de localStorage primero
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as AppointmentsByDateAndTime;
      return parsed && typeof parsed === "object" ? parsed : {};
    }
  } catch {
    // ignore parse errors
  }
  return {};
};

/**
 * Obtener horas bloqueadas para una fecha específica
 * Bloquea: la hora ocupada + 1 hora antes + 1 hora después
 */
export const getBlockedHours = (
  date: Date,
  appointments: AppointmentsByDateAndTime
): Set<string> => {
  const dateKey = getDateKey(date);
  const bookedTimes = appointments[dateKey] || [];
  const blocked = new Set<string>();

  bookedTimes.forEach((time) => {
    const [hourStr] = time.split(":");
    const hour = parseInt(hourStr, 10);

    // Bloquear la hora ocupada
    blocked.add(time);

    // Bloquear 1 hora antes
    if (hour > 9) {
      const prevHour = String(hour - 1).padStart(2, "0");
      blocked.add(`${prevHour}:00`);
    }

    // Bloquear 1 hora después
    if (hour < 17) {
      const nextHour = String(hour + 1).padStart(2, "0");
      blocked.add(`${nextHour}:00`);
    }
  });

  return blocked;
};

/**
 * Verificar si una hora está pasada (solo aplica si la fecha es hoy)
 */
export const isPastHour = (
  selectedDate: Date | null,
  time: string,
  today: Date,
  todayStart: Date
): boolean => {
  if (!selectedDate) return false;

  const [hourStr] = time.split(":");
  const hour = parseInt(hourStr, 10);

  return (
    selectedDate.getTime() === todayStart.getTime() &&
    hour <= today.getHours()
  );
};

/**
 * Verificar si una hora está dentro del rango de anticipación mínima (2 horas)
 * Solo aplica si la fecha es hoy. Desactiva horas que no cumplen con el mínimo de 2 horas de anticipación
 * Ejemplo: Si es 8:00 AM hoy, desactiva 9:00 y 10:00
 */
export const isWithinMinimumAnticipation = (
  selectedDate: Date | null,
  time: string,
  today: Date,
  todayStart: Date,
  minimumHours: number = 2
): boolean => {
  if (!selectedDate) return false;

  // Solo aplica si es hoy
  if (selectedDate.getTime() !== todayStart.getTime()) {
    return false;
  }

  const [hourStr] = time.split(":");
  const hour = parseInt(hourStr, 10);

  // Calcular la hora mínima requerida (ahora + 2 horas)
  const minimumAllowedHour = today.getHours() + minimumHours;

  // Si la hora solicitada es menor que la mínima requerida, está fuera del rango permitido
  return hour < minimumAllowedHour;
};

/**
 * Verificar si una fecha es fin de semana
 */
export const isWeekend = (date: Date): boolean => {
  const dayOfWeek = date.getDay();
  return dayOfWeek === 0 || dayOfWeek === 6;
};

/**
 * Verificar si una fecha está en el pasado
 */
export const isPastDate = (date: Date, todayStart: Date): boolean => {
  return date < todayStart;
};

/**
 * Registrar nueva cita en localStorage
 */
export const registerAppointment = (
  date: Date,
  time: string
): AppointmentsByDateAndTime => {
  if (typeof window === "undefined") return {};

  const dateKey = getDateKey(date);
  const currentAppointments = loadAppointments();
  const currentTimes = currentAppointments[dateKey] || [];

  const updated = {
    ...currentAppointments,
    [dateKey]: [...currentTimes, time],
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // ignore storage errors
  }

  return updated;
};

/**
 * Limpiar todas las citas registradas
 */
export const clearAllAppointments = (): void => {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore storage errors
  }
};
