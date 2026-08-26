"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Captcha from "@/components/ui/Captcha";
import { useEscapeClose } from "@/hooks/useEscapeClose";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { agendarCita, obtenerDisponibilidadDia } from "@/lib/axios/citasApi";

const WEEK_DAYS = ["L", "M", "M", "J", "V", "S", "D"];
const MONTH_NAMES = [
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

const BUSINESS_START_HOUR = 9;
const BUSINESS_END_HOUR = 18;
const SLOT_DURATION_MINUTES = 60;
const SAME_DAY_BUFFER_MINUTES = 120;
const BOOKING_GAP_MINUTES = 60;

const buildTimeSlots = () => {
  const slots: string[] = [];
  for (let hour = BUSINESS_START_HOUR; hour < BUSINESS_END_HOUR; hour += 1) {
    slots.push(`${String(hour).padStart(2, "0")}:00`);
  }
  return slots;
};

const getDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseTimeToMinutes = (time: string) => {
  const [hourText, minuteText] = time.split(":");
  const hour = Number(hourText);
  const minutes = Number(minuteText ?? "0");
  return hour * 60 + minutes;
};

const formatMinutesToTime = (minutes: number) => {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
};

const getDateAtTime = (date: Date, time: string) => {
  const [hourText, minuteText] = time.split(":");
  const result = new Date(date);
  result.setHours(Number(hourText), Number(minuteText ?? "0"), 0, 0);
  return result;
};

function getTodayStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

type ExistingAppointment = {
  dateKey: string;
  startMinutes: number;
  endMinutes: number;
};

const getApiErrorMessage = (error: unknown): string => {
  if (!error || typeof error !== "object") {
    return "No fue posible guardar la cita. Inténtalo de nuevo.";
  }

  const response = "response" in error ? (error as { response?: unknown }).response : undefined;
  const responseData =
    response && typeof response === "object" && "data" in response
      ? (response as { data?: unknown }).data
      : undefined;

  if (responseData && typeof responseData === "object") {
    const data = responseData as Record<string, unknown>;
    const message = typeof data.message === "string" ? data.message.trim() : "";
    const errorValue = data.error;
    const detail =
      typeof errorValue === "string"
        ? errorValue.trim()
        : errorValue && typeof errorValue === "object" && "message" in errorValue
          ? typeof (errorValue as { message?: unknown }).message === "string"
            ? (errorValue as { message: string }).message.trim()
            : ""
          : "";
    const captchaErrors = Array.isArray(data["error-codes"])
      ? data["error-codes"].filter((item): item is string => typeof item === "string").join(", ")
      : "";

    if (message || detail || captchaErrors) {
      return [message, detail, captchaErrors ? `Código captcha: ${captchaErrors}` : ""]
        .filter(Boolean)
        .join(". ");
    }
  }

  return error instanceof Error && error.message
    ? error.message
    : "No fue posible guardar la cita. Inténtalo de nuevo.";
};

export default function BookingSection() {
  const todayStart = useMemo(() => getTodayStart(), []);
  const timeSlots = useMemo(() => buildTimeSlots(), []);
  const [currentMonth, setCurrentMonth] = useState(() =>
    new Date(todayStart.getFullYear(), todayStart.getMonth(), 1),
  );
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => todayStart);
  const [selectedTime, setSelectedTime] = useState<string>("09:00");
  const [location, setLocation] = useState<"capital" | "otro">("capital");
  const [otherLocation, setOtherLocation] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const [captchaToken, setCaptchaToken] = useState("");
  const [pendingSummary, setPendingSummary] = useState<{
    dateLabel: string;
    time: string;
    locationLabel: string;
    date: Date;
  } | null>(null);
  const [existingAppointments, setExistingAppointments] = useState<ExistingAppointment[]>([]);

  const getIsBlockedTime = (date: Date, time: string) => {
    const selectedStart = getDateAtTime(date, time);
    const now = new Date();
    const todayKey = getDateKey(new Date());
    const dateKey = getDateKey(date);

    if (selectedStart.getDay() === 0 || selectedStart.getDay() === 6) {
      return true;
    }

    const startMinutes = parseTimeToMinutes(time);
    const endMinutes = startMinutes + SLOT_DURATION_MINUTES;

    if (dateKey === todayKey) {
      const earliestAllowed = new Date(now.getTime() + SAME_DAY_BUFFER_MINUTES * 60 * 1000);
      if (selectedStart < earliestAllowed) {
        return true;
      }
    }

    if (date < todayStart) {
      return true;
    }

    for (const appointment of existingAppointments) {
      if (appointment.dateKey !== dateKey) {
        continue;
      }

      const hasGapBefore = endMinutes <= appointment.startMinutes - BOOKING_GAP_MINUTES;
      const hasGapAfter = startMinutes >= appointment.endMinutes + BOOKING_GAP_MINUTES;

      if (!hasGapBefore && !hasGapAfter) {
        return true;
      }
    }

    return false;
  };

  const availableTimeSlots = useMemo(() => {
    if (!selectedDate) {
      return timeSlots;
    }

    return timeSlots.filter((slot) => !getIsBlockedTime(selectedDate, slot));
  }, [selectedDate, timeSlots, existingAppointments]);

  useEffect(() => {
    let isMounted = true;

    const loadAvailability = async () => {
      if (!selectedDate) {
        setExistingAppointments([]);
        return;
      }

      try {
        const response = await obtenerDisponibilidadDia(getDateKey(selectedDate));
        if (!isMounted || !response.success) {
          return;
        }

        const appointments = (response.horariosOcupados ?? []).reduce<ExistingAppointment[]>(
          (accumulator, time) => {
            const startMinutes = parseTimeToMinutes(time);
            if (!Number.isFinite(startMinutes)) {
              return accumulator;
            }

            accumulator.push({
              dateKey: getDateKey(selectedDate),
              startMinutes,
              endMinutes: Math.min(startMinutes + SLOT_DURATION_MINUTES, 24 * 60),
            });

            return accumulator;
          },
          [],
        );

        if (isMounted) {
          setExistingAppointments(appointments);
        }
      } catch {
        if (isMounted) {
          setExistingAppointments([]);
        }
      }
    };

    void loadAvailability();

    return () => {
      isMounted = false;
    };
  }, [selectedDate]);

  useEffect(() => {
    if (selectedDate && selectedTime && !availableTimeSlots.includes(selectedTime)) {
      setSelectedTime(availableTimeSlots[0] ?? "09:00");
    }
  }, [selectedDate, availableTimeSlots, selectedTime]);

  useEscapeClose(isModalOpen, () => setIsModalOpen(false));
  useFocusTrap(isModalOpen, modalRef);

  const monthLabel = useMemo(() => {
    return `${MONTH_NAMES[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`;
  }, [currentMonth]);

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

  const handleConfirmAppointment = async () => {
    if (!pendingSummary || !selectedTime || !selectedDate) {
      return;
    }

    const dateAtTime = getDateAtTime(selectedDate, selectedTime);
    const payload = {
      nombreCliente: fullName.trim(),
      correoCliente: email.trim(),
      telefonoCliente: phone.trim(),
      ubicacion: location === "capital" ? "Durango Capital" : otherLocation.trim(),
      fechaAgendada: dateAtTime.toISOString(),
      informacionAdicional: `Solicitud de cita desde landing - ${location === "capital" ? "Durango Capital" : otherLocation.trim()}`,
      estado: "programada",
    };

    setIsSubmitting(true);
    setFormError(null);
    setFormMessage(null);

    try {
      const response = await agendarCita(payload, captchaToken);

      if (!response.success || !response.data) {
        throw new Error(response.message || "No fue posible guardar la cita.");
      }

      setFormMessage("Listo. Te contactaremos para confirmar tu visita.");
      setIsModalOpen(false);
      setPendingSummary(null);
      setSelectedTime(availableTimeSlots[0] ?? "09:00");
      setFullName("");
      setPhone("");
      setEmail("");
      setOtherLocation("");
      setCaptchaToken("");
      setLocation("capital");
    } catch (error) {
      setFormError(getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="agendar-cita" className="bg-background px-4 pb-12">
      <form
        className="mx-auto grid max-w-6xl grid-cols-1 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl md:grid-cols-[1fr_1.1fr]"
        onSubmit={(event) => {
          event.preventDefault();
          if (!selectedDate || !selectedTime || !location) {
            setFormMessage(null);
            setFormError("Selecciona fecha, horario y ubicación.");
            return;
          }
          if (!fullName.trim() || !phone.trim() || !email.trim()) {
            setFormMessage(null);
            setFormError("Completa tu nombre, teléfono y correo.");
            return;
          }
          if (location === "otro" && !otherLocation.trim()) {
            setFormMessage(null);
            setFormError("Indica tu ubicación.");
            return;
          }
          if (!captchaToken) {
            setFormMessage(null);
            setFormError("Confirma el captcha para continuar.");
            return;
          }
          const slotIsAvailable = !getIsBlockedTime(selectedDate, selectedTime);
          if (!slotIsAvailable) {
            setFormMessage(null);
            setFormError("El horario seleccionado ya no está disponible. Elige otro horario.");
            return;
          }
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
          setFormError(null);
          setFormMessage(null);
          setPendingSummary({
            dateLabel,
            time: selectedTime,
            locationLabel,
            date: selectedDate,
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
                <ChevronLeft className="h-5 w-5 shrink-0" aria-hidden />
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
                <ChevronRight className="h-5 w-5 shrink-0" aria-hidden />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-7 gap-2 text-center text-[11px] font-semibold text-secondary">
              {WEEK_DAYS.map((day, index) => (
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
                const isPast = dateValue < todayStart;
                const dayOfWeek = dateValue.getDay();
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                const dateKey = getDateKey(dateValue);
                const dayAppointments = existingAppointments.filter((appointment) => appointment.dateKey === dateKey).length;
                const isFull = dayAppointments >= 3;
                const isSelected =
                  selectedDate &&
                  selectedDate.getDate() === day &&
                  selectedDate.getMonth() === currentMonth.getMonth() &&
                  selectedDate.getFullYear() === currentMonth.getFullYear();
                return (
                  <button
                    key={`day-${day}`}
                    type="button"
                    disabled={isPast || isWeekend || isFull}
                    onClick={() => {
                      if (isPast || isWeekend || isFull) return;
                      setSelectedDate(dateValue);
                      setFormMessage(null);
                      setFormError(null);
                    }}
                    className={`flex h-8 items-center justify-center rounded-lg border text-sm font-medium ${
                      isSelected
                        ? "border-accent bg-accent text-white shadow-sm"
                        : isPast || isWeekend
                          ? "border-transparent text-gray-300"
                          : isFull
                            ? "border-transparent text-gray-300 line-through"
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
            <div className="mt-3 grid grid-cols-3 gap-3">
              {timeSlots.map((time) => {
                const isBlocked = selectedDate ? getIsBlockedTime(selectedDate, time) : true;
                const isActive = time === selectedTime;
                return (
                  <button
                    key={time}
                    type="button"
                    disabled={isBlocked}
                    onClick={() => {
                      if (isBlocked) return;
                      setSelectedTime(time);
                      setFormMessage(null);
                      setFormError(null);
                    }}
                    className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                      isBlocked
                        ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400"
                        : isActive
                          ? "border-accent bg-accent text-white shadow-sm"
                          : "border-gray-200 text-secondary hover:border-gray-300"
                    }`}
                  >
                    {time}
                  </button>
                );
              })}
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
                  setFormMessage(null);
                  setFormError(null);
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
                  setFormMessage(null);
                  setFormError(null);
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
                setFormMessage(null);
                setFormError(null);
              }}
              onExpire={() => {
                setCaptchaToken("");
                setFormError("La verificación expiró. Completa nuevamente el captcha.");
              }}
              onError={(errorCode) => {
                setCaptchaToken("");
                setFormError(
                  `No se pudo cargar el captcha${errorCode ? ` (${errorCode})` : ""}. Verifica la clave y el dominio configurados en Cloudflare.`,
                );
              }}
              className="mt-3"
            />
          </div>

          {formError ? (
            <p className="mt-6 text-xs font-semibold text-red-600">{formError}</p>
          ) : null}
          {formMessage ? (
            <p className="mt-6 text-xs font-semibold text-emerald-600">
              {formMessage}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-5 w-full rounded-2xl bg-accent py-4 text-xs font-semibold uppercase tracking-[0.4em] text-white shadow-lg shadow-accent/30 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Enviando..." : "Agendar visita"}
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
              <div className="text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
                Confirmación
              </div>
              <h3 className="mt-3 text-xl font-semibold text-primary">
                ¿Agendar esta visita?
              </h3>
              <div className="mt-5 space-y-2 text-sm text-secondary">
                <p>
                  <span className="font-semibold text-primary">Fecha:</span>{" "}
                  {pendingSummary.dateLabel}
                </p>
                <p>
                  <span className="font-semibold text-primary">Horario:</span>{" "}
                  {pendingSummary.time}
                </p>
                <p>
                  <span className="font-semibold text-primary">Ubicación:</span>{" "}
                  {pendingSummary.locationLabel}
                </p>
              </div>

              <p className="mt-5 rounded-xl border border-primary/10 bg-primary/[0.04] px-3 py-2.5 text-[11px] leading-relaxed text-secondary">
                La fecha y el horario que elegiste son una{" "}
                <span className="font-semibold text-primary">solicitud de visita</span>, no una cita firme. Küche puede
                reprogramarla por motivos operativos (disponibilidad del equipo, carga de trabajo u otras causas
                internas). La visita quedará confirmada cuando nos comuniquemos contigo y lo acordemos explícitamente.
              </p>

              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-secondary"
                  onClick={() => setIsModalOpen(false)}
                >
                  Editar
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  className="flex-1 rounded-lg bg-accent px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-white disabled:cursor-not-allowed disabled:opacity-70"
                  onClick={handleConfirmAppointment}
                >
                  {isSubmitting ? "Enviando..." : "Confirmar"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </form>
    </section>
  );
}

