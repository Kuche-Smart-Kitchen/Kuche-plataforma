 "use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Captcha from "@/components/Captcha";
import { crearCita, obtenerDisponibilidadDia, type CitaCreate } from "@/lib/axios/citasApi";
import { useEscapeClose } from "@/hooks/useEscapeClose";
import { useFocusTrap } from "@/hooks/useFocusTrap";

const prettyJson = (value: unknown) => {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "No se pudo serializar a JSON";
  }
};

export default function BookingSection() {
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
  const timeSlots = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"];
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
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const [captchaToken, setCaptchaToken] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingSummary, setPendingSummary] = useState<{
    dateLabel: string;
    time: string;
    locationLabel: string;
    date: Date;
  } | null>(null);
  const [horariosOcupados, setHorariosOcupados] = useState<string[]>([]);
  const [loadingCitas, setLoadingCitas] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [successClientCode, setSuccessClientCode] = useState<string | null>(null);
  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const successModalRef = useRef<HTMLDivElement | null>(null);
  const errorModalRef = useRef<HTMLDivElement | null>(null);
  const [appointmentsByDate, setAppointmentsByDate] = useState<Record<string, number>>({});

  const MAX_APPOINTMENTS_PER_DAY = 3;

  const getDateKey = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const registerAppointment = (date: Date) => {
    const key = getDateKey(date);
    setAppointmentsByDate((prev) => {
      const currentCount = prev[key] ?? 0;
      return {
        ...prev,
        [key]: currentCount + 1,
      };
    });
  };

  const isWithinOneHourWindow = (slotHour: number, occupiedHour: number) => {
    return Math.abs(slotHour - occupiedHour) <= 1;
  };

  useEscapeClose(isModalOpen, () => setIsModalOpen(false));
  useEscapeClose(isSuccessModalOpen, () => setIsSuccessModalOpen(false));
  useEscapeClose(isErrorModalOpen, () => setIsErrorModalOpen(false));
  useFocusTrap(isModalOpen, modalRef);
  useFocusTrap(isSuccessModalOpen, successModalRef);
  useFocusTrap(isErrorModalOpen, errorModalRef);

  // Cargar horarios ocupados del día seleccionado
  useEffect(() => {
    const cargarDisponibilidad = async () => {
      if (!selectedDate) {
        setHorariosOcupados([]);
        return;
      }

      setLoadingCitas(true);
      try {
        // Formatear fecha en ISO para el backend
        const fechaISO = selectedDate.toISOString().split('T')[0];
        const response = await obtenerDisponibilidadDia(fechaISO);
        
        if (response.success && response.data) {
          setHorariosOcupados(response.data.horariosOcupados);
        } else {
          setHorariosOcupados([]);
        }
      } catch (error) {
        console.error('Error al cargar disponibilidad:', error);
        setHorariosOcupados([]);
      } finally {
        setLoadingCitas(false);
      }
    };

    cargarDisponibilidad();
  }, [selectedDate]);

  // Verificar si un horario está disponible (ocupado +/-1h y anticipación mínima)
  const isTimeSlotAvailable = (timeSlot: string): boolean => {
    if (!selectedDate) return false;

    // Convertir timeSlot a hora numérica
    const [hours] = timeSlot.split(':').map(Number);

    // Bloquear horarios sin al menos 1 hora de anticipación
    if (!isTimeSlotInFuture(selectedDate, timeSlot)) {
      return false;
    }

    // Verificar cada horario ocupado
    for (const horarioOcupado of horariosOcupados) {
      const [horaOcupada] = horarioOcupado.split(':').map(Number);

      // Bloquear la hora exacta ocupada, una hora antes y una hora después
      if (isWithinOneHourWindow(hours, horaOcupada)) {
        return false;
      }
    }

    return true;
  };

  // Verificar si un horario cumple la validación de mínimo 1 hora en el futuro
  const isTimeSlotInFuture = (date: Date, timeSlot: string): boolean => {
    const now = new Date();
    const [hours, minutes] = timeSlot.split(':').map(Number);
    
    // Crear una fecha con la hora seleccionada
    const citaDateTime = new Date(date);
    citaDateTime.setHours(hours, minutes, 0, 0);
    
    // Calcular la diferencia en milisegundos
    const differentMs = citaDateTime.getTime() - now.getTime();
    const differenceHours = differentMs / (1000 * 60 * 60);
    
    // Debe haber al menos 1 hora de diferencia
    return differenceHours >= 1;
  };

  // Auto-cierre del modal de éxito después de 3 segundos
  useEffect(() => {
    if (isSuccessModalOpen) {
      const timer = setTimeout(() => {
        setIsSuccessModalOpen(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isSuccessModalOpen]);

  // Validar que el horario sea en el futuro (mínimo 1 hora)
  useEffect(() => {
    if (selectedTime && selectedDate && !isTimeSlotInFuture(selectedDate, selectedTime)) {
      setSelectedTime("");
      const now = new Date();
      const isToday = selectedDate.toDateString() === now.toDateString();
      
      if (isToday) {
        setFormError("Debes seleccionar un horario con mínimo 1 hora de anticipación desde ahora.");
      } else {
        setFormError("El horario seleccionado ya ha pasado. Por favor, selecciona otro.");
      }
      setFormMessage(null);
    }
  }, [selectedDate, selectedTime]);

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

  const resetForm = () => {
    setSelectedDate(today);
    setSelectedTime("12:00");
    setLocation("capital");
    setOtherLocation("");
    setFullName("");
    setPhone("");
    setEmail("");
    setCaptchaToken("");
    setFormMessage(null);
    setFormError(null);
    setPendingSummary(null);
  };

  const handleConfirmBooking = async () => {
    if (!selectedDate || !pendingSummary) return;

    // Validar reCAPTCHA antes de proceder
    if (!captchaToken) {
      setErrorMessage("Por favor valida el CAPTCHA antes de continuar.");
      setIsErrorModalOpen(true);
      return;
    }

    setIsSubmitting(true);
    setIsModalOpen(false);
    // Asegurar que los modales anteriores estén cerrados
    setIsSuccessModalOpen(false);
    setIsErrorModalOpen(false);
    setErrorMessage("");
    setSuccessClientCode(null);

    try {
      // Revalidar disponibilidad antes de crear la cita para evitar colisiones por concurrencia.
      const fechaISO = selectedDate.toISOString().split('T')[0];
      const disponibilidadActual = await obtenerDisponibilidadDia(fechaISO);
      const horariosActualizados =
        disponibilidadActual.success && disponibilidadActual.data
          ? disponibilidadActual.data.horariosOcupados
          : horariosOcupados;

      const [horaSeleccionada] = selectedTime.split(':').map(Number);
      const bloqueadoPorDisponibilidad = horariosActualizados.some((horarioOcupado) => {
        const [horaOcupada] = horarioOcupado.split(':').map(Number);
        return isWithinOneHourWindow(horaSeleccionada, horaOcupada);
      });

      if (!isTimeSlotInFuture(selectedDate, selectedTime) || bloqueadoPorDisponibilidad) {
        setHorariosOcupados(horariosActualizados);
        setIsModalOpen(false);
        setErrorMessage(
          "El horario seleccionado ya no está disponible. Selecciona otro horario (se bloquea la hora ocupada y +/-1 hora).",
        );
        setIsErrorModalOpen(true);
        return;
      }

      // Formatear la fecha al formato que espera el backend
      const fechaAgendada = new Date(selectedDate);
      const [hours, minutes] = selectedTime.split(":");
      fechaAgendada.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);

      const citaData: CitaCreate = {
        fechaAgendada: fechaAgendada.toISOString(),
        nombreCliente: fullName.trim(),
        correoCliente: email.trim(),
        telefonoCliente: phone.trim(),
        ubicacion: location === "capital" ? "Durango Capital" : otherLocation.trim(),
        informacionAdicional: `Horario solicitado: ${selectedTime}`,
      };

      const response = await crearCita(citaData, captchaToken);

      const responseData = response && "data" in response ? ((response.data as unknown) as Record<string, unknown> | undefined) : undefined;
      const payload =
        responseData && typeof responseData.data === "object" && responseData.data !== null
          ? (responseData.data as Record<string, unknown>)
          : responseData;
      const codeCandidate =
        (payload && typeof payload.clienteId === "string" && payload.clienteId) ||
        (payload && typeof payload.codigo === "string" && payload.codigo) ||
        (payload && typeof payload.cliente === "object" && payload.cliente !== null
          ? (() => {
              const cliente = payload.cliente as Record<string, unknown>;
              return typeof cliente.codigo === "string" ? cliente.codigo : null;
            })()
          : null);

      // Verificar si la respuesta indica éxito
      const isSuccess = 
        (response && response.success === true) || 
        (response && 'data' in response && response.data !== null);

      if (isSuccess) {
        setSuccessClientCode(
          typeof codeCandidate === "string"
            ? codeCandidate.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 6)
            : null,
        );
        setIsSuccessModalOpen(true);
        resetForm();
      } else {
        // Construir mensaje de error con horarios sugeridos si existen
        let errorMsg = response?.message || "No se pudo agendar la cita. Intenta nuevamente.";
        
        if (response?.citasOcupadas && response.citasOcupadas.length > 0) {
          errorMsg += ` | Horarios recomendados: ${response.citasOcupadas.join(', ')}`;
        }
        
        setErrorMessage(errorMsg);
        setIsErrorModalOpen(true);
      }
    } catch (error) {
      console.error("Error al crear la cita:", error);
      setErrorMessage(
        "Ocurrió un error al procesar tu solicitud. Por favor, intenta de nuevo."
      );
      setIsErrorModalOpen(true);
    } finally {
      setIsSubmitting(false);
      setPendingSummary(null);
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
          // Validar que el horario no sea en el pasado y tenga mínimo 1 hora de anticipación
          if (!isTimeSlotInFuture(selectedDate, selectedTime)) {
            setFormMessage(null);
            setFormError("La cita debe ser agendada con al menos 1 hora de anticipación y no puede ser en el pasado.");
            return;
          }
          // Validar que el horario esté disponible
          if (!isTimeSlotAvailable(selectedTime)) {
            setFormMessage(null);
            setFormError("El horario seleccionado no está disponible. Por favor, selecciona otro.");
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
                const isPast = dateValue < todayStart;
                const dayOfWeek = dateValue.getDay();
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                const dateKey = getDateKey(dateValue);
                const dayAppointments = appointmentsByDate[dateKey] ?? 0;
                const isFull = dayAppointments >= MAX_APPOINTMENTS_PER_DAY;
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
            {loadingCitas ? (
              <p className="mt-3 text-xs text-secondary">Cargando disponibilidad...</p>
            ) : null}
            <div className="mt-3 grid grid-cols-3 gap-3 md:grid-cols-5">
              {timeSlots.map((time) => {
                const isActive = time === selectedTime;
                const isAvailable = isTimeSlotAvailable(time);
                let disabledReason = "";
                
                if (!isAvailable) {
                  if (selectedDate && !isTimeSlotInFuture(selectedDate, time)) {
                    disabledReason = "Este horario no cumple con la anticipación mínima de 1 hora";
                  } else {
                    disabledReason = "Este horario está ocupado o dentro del bloqueo de +/-1 hora";
                  }
                }
                
                return (
                  <button
                    key={time}
                    type="button"
                    disabled={!isAvailable}
                    title={disabledReason}
                    onClick={() => {
                      if (isAvailable) {
                        setSelectedTime(time);
                        setFormMessage(null);
                        setFormError(null);
                      }
                    }}
                    className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                      !isAvailable
                        ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400 line-through"
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
            <p className="mt-3 text-[10px] text-secondary">
              ℹ️ Los horarios disponibles son de lunes a viernes. Se bloquea la hora ocupada y también una hora antes y una hora después.
            </p>
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
              onExpire={() => setCaptchaToken("")}
              onError={() => setCaptchaToken("")}
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
            className="mt-5 w-full rounded-2xl bg-accent py-4 text-xs font-semibold uppercase tracking-[0.4em] text-white shadow-lg shadow-accent/30 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "Procesando..." : "Agendar visita"}
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

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-secondary"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Editar
                </button>
                <button
                  type="button"
                  className="flex-1 rounded-lg bg-accent px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-white disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={handleConfirmBooking}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Enviando..." : "Confirmar"}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {/* Modal de Éxito */}
        {isSuccessModalOpen ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            role="dialog"
            aria-modal="true"
          >
            <div
              ref={successModalRef}
              tabIndex={-1}
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            >
              <div className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-600">
                ¡Éxito!
              </div>
              <h3 className="mt-3 text-xl font-semibold text-primary">
                ¡Cita agendada exitosamente!
              </h3>
              <p className="mt-4 text-sm text-secondary">
                Tu solicitud ha sido registrada correctamente. Te contactaremos pronto a tu teléfono para confirmar los detalles de tu visita.
              </p>
              {successClientCode ? (
                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  Código de cliente: <span className="font-semibold">{successClientCode}</span>
                </div>
              ) : null}

              <div className="mt-6">
                <button
                  type="button"
                  className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-white hover:bg-emerald-700 transition"
                  onClick={() => setIsSuccessModalOpen(false)}
                >
                  Entendido
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {/* Modal de Error */}
        {isErrorModalOpen ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            role="dialog"
            aria-modal="true"
          >
            <div
              ref={errorModalRef}
              tabIndex={-1}
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            >
              <div className="text-xs font-semibold uppercase tracking-[0.3em] text-red-600">
                Error
              </div>
              <h3 className="mt-3 text-xl font-semibold text-primary">
                No se pudo agendar la cita
              </h3>
              <p className="mt-4 text-sm text-secondary">
                {errorMessage || "Ocurrió un error al procesar tu solicitud. Por favor, intenta de nuevo."}
              </p>

              <div className="mt-6">
                <button
                  type="button"
                  className="w-full rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-white hover:bg-red-700 transition"
                  onClick={() => {
                    setIsErrorModalOpen(false);
                    setErrorMessage("");
                  }}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </form>
    </section>
  );
}

