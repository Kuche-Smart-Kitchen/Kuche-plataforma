 "use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Captcha from "@/components/Captcha";
import { useEscapeClose } from "@/hooks/useEscapeClose";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useAgendarCita } from "@/contexts/AgendarCitaContext";
import {
  getDateKey,
  loadAppointments,
  loadAppointmentsFromBackend,
  getBlockedHours,
  isPastHour,
  isWithinMinimumAnticipation,
  isWeekend,
  isPastDate,
  registerAppointment,
  type AppointmentsByDateAndTime,
} from "@/lib/validaciones/validacionesAgendaCitas";

export default function BookingSection() {
  const { isLoading, error, success, enviar, limpiar } = useAgendarCita();
  const weekDays = ["L", "M", "M", "J", "V", "S", "D"];
  const monthNames = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];
  const timeSlots = Array.from({ length: 9 }, (_, i) => {
    const hour = 9 + i;
    return String(hour).padStart(2, "0") + ":00";
  });
  const today = new Date();
  const todayStart = useMemo(
    () => new Date(today.getFullYear(), today.getMonth(), today.getDate()),
    [today],
  );
  const [currentMonth, setCurrentMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [selectedDate, setSelectedDate] = useState<Date | null>(today);
  const [selectedTime, setSelectedTime] = useState<string>("12:00");
  const [location, setLocation] = useState<"capital" | "otro">("capital");
  const [otherLocation, setOtherLocation] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const [captchaToken, setCaptchaToken] = useState("");
  const [pendingSummary, setPendingSummary] = useState<{
    dateLabel: string;
    time: string;
    locationLabel: string;
    date: Date;
  } | null>(null);
  const [appointmentsByDateAndTime, setAppointmentsByDateAndTime] =
    useState<AppointmentsByDateAndTime>({});

  const isSameDay = (left: Date, right: Date) =>
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate();

  const getAvailableTimesForDate = (date: Date, now: Date) => {
    if (isPastDate(date, todayStart) || isWeekend(date)) {
      return [] as string[];
    }

    const blockedHours = getBlockedHours(date, appointmentsByDateAndTime);

    return timeSlots.filter((time) => {
      const isPastTime = isPastHour(date, time, now, todayStart);
      const isWithinMinimum = isWithinMinimumAnticipation(
        date,
        time,
        now,
        todayStart,
      );
      return !isPastTime && !isWithinMinimum && !blockedHours.has(time);
    });
  };

  const findNextAvailableSlot = (startDate: Date) => {
    const referenceDate = new Date(
      startDate.getFullYear(),
      startDate.getMonth(),
      startDate.getDate(),
    );
    const now = new Date();

    for (let offset = 0; offset < 60; offset += 1) {
      const candidateDate = new Date(
        referenceDate.getFullYear(),
        referenceDate.getMonth(),
        referenceDate.getDate() + offset,
      );
      const availableTimes = getAvailableTimesForDate(candidateDate, now);

      if (availableTimes.length > 0) {
        return {
          date: candidateDate,
          time: availableTimes[0],
        };
      }
    }

    return null;
  };

  // Cargar citas del backend y localStorage
  useEffect(() => {
    const loadCitas = async () => {
      try {
        // Cargar citas del backend
        const backendCitas = await loadAppointmentsFromBackend();
        
        // Cargar citas del localStorage (recientemente agendadas)
        const localCitas = loadAppointments();
        
        // Combinar ambas fuentes
        const combined: AppointmentsByDateAndTime = {};
        
        // Agregar citas del backend
        Object.entries(backendCitas).forEach(([dateKey, times]) => {
          combined[dateKey] = [...(combined[dateKey] || []), ...times];
        });
        
        // Agregar citas del localStorage
        Object.entries(localCitas).forEach(([dateKey, times]) => {
          combined[dateKey] = [...(combined[dateKey] || []), ...times];
        });
        
        setAppointmentsByDateAndTime(combined);
      } catch (error) {
        console.error("Error al cargar citas:", error);
        // Fallback: cargar solo del localStorage
        const localCitas = loadAppointments();
        setAppointmentsByDateAndTime(localCitas);
      }
    };
    
    loadCitas();
  }, []);

      useEffect(() => {
        const referenceDate = selectedDate ?? today;
        const nextAvailableSlot = findNextAvailableSlot(referenceDate);

        if (!nextAvailableSlot) {
          return;
        }

        const shouldMoveDate =
          !selectedDate || !isSameDay(selectedDate, nextAvailableSlot.date);

        if (shouldMoveDate) {
          setSelectedDate(nextAvailableSlot.date);
          setSelectedTime(nextAvailableSlot.time);
          setCurrentMonth(
            new Date(
              nextAvailableSlot.date.getFullYear(),
              nextAvailableSlot.date.getMonth(),
              1,
            ),
          );
          return;
        }

        const availableTimesForSelectedDate = getAvailableTimesForDate(
          referenceDate,
          new Date(),
        );

        if (!availableTimesForSelectedDate.includes(selectedTime)) {
          setSelectedTime(nextAvailableSlot.time);
        }
      }, [appointmentsByDateAndTime, selectedDate, selectedTime]);

  useEscapeClose(isModalOpen, () => setIsModalOpen(false));
  useFocusTrap(isModalOpen, modalRef);
  const monthLabel = useMemo(() => {
    return `${monthNames[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`;
  }, [currentMonth, monthNames]);
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const totalDays = new Date(year, month + 1, 0).getDate();
    const startOffset = (firstDay.getDay() + 6) % 7;
    return Array.from({ length: 42 }).map((_, index) => {
      const day = index - startOffset + 1;
      return day > 0 && day <= totalDays ? day : null;
    });
  }, [currentMonth]);

  return (
    <section id="agendar-cita" className="bg-background px-4 pb-12">
      <form
        className="mx-auto grid max-w-6xl grid-cols-1 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl md:grid-cols-[1fr_1.1fr]"
        onSubmit={(event) => {
          event.preventDefault();
          // Mostrar modal sin validaciones
          const dateLabel = selectedDate
            ? new Intl.DateTimeFormat("es-MX", {
                weekday: "long",
                day: "2-digit",
                month: "long",
                year: "numeric",
              }).format(selectedDate)
            : "";
          const locationLabel =
            location === "capital"
              ? "Durango Capital"
              : otherLocation.trim() || "Otro municipio";
          setPendingSummary({
            dateLabel,
            time: selectedTime,
            locationLabel,
            date: selectedDate || new Date(),
          });
          setIsModalOpen(true);
        }}
      >
        <div className="border-b border-gray-200 bg-gray-50 p-6 md:border-b-0 md:border-r md:p-8">
          <div className="flex items-center justify-between pb-4">
            <div className="text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
              Küche
            </div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.3em] text-secondary">
              Selecciona fecha
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-sm text-secondary"
                aria-label="Mes anterior"
                  onClick={() =>
                    setCurrentMonth(
                      new Date(
                        currentMonth.getFullYear(),
                        currentMonth.getMonth() - 1,
                        1,
                      ),
                    )
                  }
              >
                ⬹
              </button>
              <div className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">
                {monthLabel}
              </div>
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-sm text-secondary"
                aria-label="Mes siguiente"
                  onClick={() =>
                    setCurrentMonth(
                      new Date(
                        currentMonth.getFullYear(),
                        currentMonth.getMonth() + 1,
                        1,
                      ),
                    )
                  }
              >
                ⬺
              </button>
            </div>

            <div className="mt-4 grid grid-cols-7 gap-2 text-center text-[11px] font-semibold text-secondary">
              {weekDays.map((day, index) => (
                <div key={`${day}-${index}`}>{day}</div>
              ))}
            </div>

            <div className="mt-2 grid grid-cols-7 gap-2 text-center text-sm text-secondary">
              {calendarDays.map((day, index) => {
                if (!day) {
                  return <div key={`empty-${index}`} className="h-8" />;
                }
                const dateValue = new Date(
                  currentMonth.getFullYear(),
                  currentMonth.getMonth(),
                  day,
                );
                const isPastDate_val = isPastDate(dateValue, todayStart);
                const isWeekend_val = isWeekend(dateValue);
                const isSelected =
                  selectedDate &&
                  selectedDate.getDate() === day &&
                  selectedDate.getMonth() === currentMonth.getMonth() &&
                  selectedDate.getFullYear() === currentMonth.getFullYear();
                const isDisabled = isPastDate_val || isWeekend_val;

                return (
                  <button
                    key={`day-${day}`}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => {
                      if (!isDisabled) {
                        setSelectedDate(dateValue);
                      }
                    }}
                    className={`flex h-8 items-center justify-center rounded-lg border text-sm font-medium ${
                      isSelected
                        ? "border-accent bg-accent text-white shadow-sm"
                        : isDisabled
                          ? "border-transparent text-gray-300 cursor-not-allowed"
                          : "border-transparent text-secondary hover:border-gray-200"
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-secondary">
              Horarios disponibles
            </p>
            <div className="mt-3 space-y-3">
              {/* Primera fila: 9 AM - 1 PM */}
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                {timeSlots.slice(0, 5).map((time) => {
                  const [hourStr] = time.split(":");
                  const hour = parseInt(hourStr, 10);
                  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
                  const displayPeriod = hour >= 12 ? "PM" : "AM";
                  const isActive = time === selectedTime;

                  // Verificar si esta hora está pasada (solo si es hoy)
                  const isPastTime = isPastHour(
                    selectedDate,
                    time,
                    today,
                    todayStart
                  );

                  // Verificar si está dentro del rango de anticipación mínima (2 horas)
                  const isWithinMinimum = isWithinMinimumAnticipation(
                    selectedDate,
                    time,
                    today,
                    todayStart
                  );

                  // Verificar si esta hora está bloqueada por citas existentes
                  const blockedHours = selectedDate
                    ? getBlockedHours(selectedDate, appointmentsByDateAndTime)
                    : new Set<string>();
                  const isBlocked = blockedHours.has(time);

                  const isDisabled_time = isPastTime || isBlocked || isWithinMinimum;

                  return (
                    <button
                      key={time}
                      type="button"
                      disabled={isDisabled_time}
                      onClick={() => {
                        if (!isDisabled_time) {
                          setSelectedTime(time);
                        }
                      }}
                      className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                        isActive
                          ? "border-accent bg-accent text-white shadow-sm"
                          : isDisabled_time
                            ? "border-transparent text-gray-300 cursor-not-allowed line-through"
                            : "border-gray-200 text-secondary hover:border-gray-300"
                      }`}
                    >
                      {displayHour} {displayPeriod}
                    </button>
                  );
                })}
              </div>
              {/* Segunda fila: 2 PM - 5 PM */}
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {timeSlots.slice(5).map((time) => {
                  const [hourStr] = time.split(":");
                  const hour = parseInt(hourStr, 10);
                  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
                  const displayPeriod = hour >= 12 ? "PM" : "AM";
                  const isActive = time === selectedTime;

                  // Verificar si esta hora está pasada (solo si es hoy)
                  const isPastTime = isPastHour(
                    selectedDate,
                    time,
                    today,
                    todayStart
                  );

                  // Verificar si está dentro del rango de anticipación mínima (2 horas)
                  const isWithinMinimum = isWithinMinimumAnticipation(
                    selectedDate,
                    time,
                    today,
                    todayStart
                  );

                  // Verificar si esta hora está bloqueada por citas existentes
                  const blockedHours = selectedDate
                    ? getBlockedHours(selectedDate, appointmentsByDateAndTime)
                    : new Set<string>();
                  const isBlocked = blockedHours.has(time);

                  const isDisabled_time = isPastTime || isBlocked || isWithinMinimum;

                  return (
                    <button
                      key={time}
                      type="button"
                      disabled={isDisabled_time}
                      onClick={() => {
                        if (!isDisabled_time) {
                          setSelectedTime(time);
                        }
                      }}
                      className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                        isActive
                          ? "border-accent bg-accent text-white shadow-sm"
                          : isDisabled_time
                            ? "border-transparent text-gray-300 cursor-not-allowed line-through"
                            : "border-gray-200 text-secondary hover:border-gray-300"
                      }`}
                    >
                      {displayHour} {displayPeriod}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 md:p-8">
          <div className="pb-4 text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
            Información del proyecto
          </div>

          <div className="mt-6 grid gap-4">
            <label className="text-[11px] font-semibold uppercase tracking-[0.25em] text-secondary">
              Nombre completo
              <input
                type="text"
                placeholder="Escribe tu nombre"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className="mt-2 w-full border-b border-gray-300 bg-transparent pb-2 text-sm text-primary placeholder:text-gray-400 focus:border-primary focus:outline-none"
              />
            </label>
            <label className="text-[11px] font-semibold uppercase tracking-[0.25em] text-secondary">
              Teléfono / WhatsApp
              <input
                type="tel"
                placeholder="+52"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className="mt-2 w-full border-b border-gray-300 bg-transparent pb-2 text-sm text-primary placeholder:text-gray-400 focus:border-primary focus:outline-none"
              />
            </label>
            <label className="text-[11px] font-semibold uppercase tracking-[0.25em] text-secondary">
              Correo electrónico
              <input
                type="email"
                placeholder="example@mail.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-2 w-full border-b border-gray-300 bg-transparent pb-2 text-sm text-primary placeholder:text-gray-400 focus:border-primary focus:outline-none"
              />
            </label>
          </div>

          <div className="mt-6 space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-secondary">
              Ubicación
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setLocation("capital");
                  setOtherLocation("");
                }}
                className={`rounded-lg px-4 py-3 text-xs font-semibold uppercase tracking-[0.25em] ${
                  location === "capital"
                    ? "bg-primary text-white"
                    : "border border-gray-200 text-secondary"
                }`}
              >
                Durango Capital
              </button>
              <button
                type="button"
                onClick={() => {
                  setLocation("otro");
                }}
                className={`rounded-lg px-4 py-3 text-xs font-semibold uppercase tracking-[0.25em] ${
                  location === "otro"
                    ? "bg-primary text-white"
                    : "border border-gray-200 text-secondary"
                }`}
              >
                Otro municipio
              </button>
            </div>
            {location === "otro" ? (
              <label className="text-[11px] font-semibold uppercase tracking-[0.25em] text-secondary">
                Especifica tu ubicación
                <input
                  type="text"
                  placeholder="Ej. Gómez Palacio"
                  value={otherLocation}
                  onChange={(event) => setOtherLocation(event.target.value)}
                  className="mt-2 w-full border-b border-gray-300 bg-transparent pb-2 text-sm text-primary placeholder:text-gray-400 focus:border-primary focus:outline-none"
                />
              </label>
            ) : null}
          </div>

          <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs text-secondary">Verificación de seguridad</p>
            <Captcha
              onVerify={(token) => {
                setCaptchaToken(token);
              }}
              onExpire={() => setCaptchaToken("")}
              onError={() => setCaptchaToken("")}
              className="mt-3"
            />
          </div>

          <button
            type="submit"
            className="mt-5 w-full rounded-2xl bg-accent py-4 text-xs font-semibold uppercase tracking-[0.4em] text-white shadow-lg shadow-accent/30 transition hover:-translate-y-0.5"
          >
            Agendar visita
          </button>
        </div>
        {isModalOpen && pendingSummary ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            role="dialog"
            aria-modal="true"
          >
            <div
              ref={modalRef}
              tabIndex={-1}
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            >
              {/* Mensaje de Éxito */}
              {success ? (
                <div className="flex flex-col items-center text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                    <span className="text-2xl">✓</span>
                  </div>
                  <h3 className="text-lg font-semibold text-primary">
                    ¡Cita Registrada!
                  </h3>
                  <p className="mt-2 text-sm text-secondary">
                    Tu cita ha sido registrada correctamente. Nos comunicaremos contigo pronto para confirmar los detalles.
                  </p>
                  <button
                    type="button"
                    className="mt-6 w-full rounded-lg bg-green-600 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-white transition hover:bg-green-700"
                    onClick={() => {
                      setIsModalOpen(false);
                      setPendingSummary(null);
                      limpiar();
                    }}
                  >
                    Cerrar
                  </button>
                </div>
              ) : error ? (
                /* Mensaje de Error */
                <div className="flex flex-col items-center text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                    <span className="text-2xl">✕</span>
                  </div>
                  <h3 className="text-lg font-semibold text-primary">
                    Error al Registrar
                  </h3>
                  <p className="mt-2 text-sm text-red-600 font-medium">
                    {error}
                  </p>
                  <p className="mt-1 text-xs text-secondary">
                    Por favor, intenta nuevamente.
                  </p>
                  <div className="mt-6 flex w-full gap-3">
                    <button
                      type="button"
                      className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-secondary transition hover:border-gray-300"
                      onClick={() => {
                        setIsModalOpen(false);
                        setPendingSummary(null);
                        limpiar();
                      }}
                    >
                      Cerrar
                    </button>
                    <button
                      type="button"
                      disabled={isLoading}
                      className="flex-1 rounded-lg bg-accent px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-white transition hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={async () => {
                        if (!pendingSummary) return;

                        const response = await enviar({
                          nombreCliente: fullName,
                          correoCliente: email,
                          telefonoCliente: phone,
                          fechaAgendada: pendingSummary.date,
                          horaAgendada: pendingSummary.time,
                          ubicacion:
                            location === "capital"
                              ? "Durango Capital"
                              : otherLocation,
                          informacionAdicional: "",
                          captchaToken,
                        });

                        if (response.success) {
                          const updated = registerAppointment(
                            pendingSummary.date,
                            pendingSummary.time
                          );
                          setAppointmentsByDateAndTime(updated);

                          setFullName("");
                          setPhone("");
                          setEmail("");
                          setOtherLocation("");
                          setCaptchaToken("");

                          setTimeout(() => {
                            setIsModalOpen(false);
                            setPendingSummary(null);
                            limpiar();
                          }, 2000);
                        }
                      }}
                    >
                      {isLoading ? "Reintentando..." : "Reintentar"}
                    </button>
                  </div>
                </div>
              ) : (
                /* Modal de Confirmación */
                <>
                  <div className="text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
                    Confirmación
                  </div>
                  <h3 className="mt-3 text-xl font-semibold text-primary">
                    ¿Agendar esta visita?
                  </h3>
                  <div className="mt-5 space-y-3 text-sm text-secondary">
                    <div className="rounded-lg bg-gray-50 p-3">
                      <p>
                        <span className="font-semibold text-primary">Fecha:</span>{" "}
                        {pendingSummary?.dateLabel}
                      </p>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-3">
                      <p>
                        <span className="font-semibold text-primary">Horario:</span>{" "}
                        {pendingSummary?.time}
                      </p>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-3">
                      <p>
                        <span className="font-semibold text-primary">Ubicación:</span>{" "}
                        {pendingSummary?.locationLabel}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 flex gap-3">
                    <button
                      type="button"
                      className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-secondary transition hover:border-gray-300"
                      onClick={() => setIsModalOpen(false)}
                      disabled={isLoading}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      disabled={isLoading}
                      className="flex-1 rounded-lg bg-accent px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-white transition hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={async () => {
                        if (!pendingSummary) return;

                        const response = await enviar({
                          nombreCliente: fullName,
                          correoCliente: email,
                          telefonoCliente: phone,
                          fechaAgendada: pendingSummary.date,
                          horaAgendada: pendingSummary.time,
                          ubicacion:
                            location === "capital"
                              ? "Durango Capital"
                              : otherLocation,
                          informacionAdicional: "",
                          captchaToken,
                        });

                        if (response.success) {
                          const updated = registerAppointment(
                            pendingSummary.date,
                            pendingSummary.time
                          );
                          setAppointmentsByDateAndTime(updated);

                          setFullName("");
                          setPhone("");
                          setEmail("");
                          setOtherLocation("");
                          setCaptchaToken("");

                          setTimeout(() => {
                            setIsModalOpen(false);
                            setPendingSummary(null);
                            limpiar();
                          }, 2000);
                        }
                      }}
                    >
                      {isLoading ? "Enviando..." : "Confirmar"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : null}
      </form>
    </section>
  );
}

