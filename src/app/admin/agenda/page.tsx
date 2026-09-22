/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import Captcha from "@/components/ui/Captcha";

import { useEscapeClose } from "@/hooks/useEscapeClose";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useVisitasContext } from "@/contexts/VisitasContext";
import { actualizarVisita, eliminarVisita, obtenerVisitas } from "@/lib/axios/visitasApi";
import { obtenerTodasLasCitas } from "@/lib/axios/citasApi";
import { syncKanbanTasksFromBackend } from "@/lib/admin-workflow";

type AppointmentType =
  | "Levantamiento / Medidas"
  | "Cotización en sitio"
  | "Presentación de diseño";

type AppointmentStatus = "Pendiente" | "Confirmada";

type Appointment = {
  id: string;
  title: string;
  client: string;
  location: string;
  date: string;
  time: string;
  type: AppointmentType;
  assignedTo: string | null;
  status: AppointmentStatus;
  email?: string;
  phone?: string;
};

/** Cita (módulo aparte) mostrada solo como alerta informativa; nunca se edita/elimina desde aquí. */
type CitaAlert = {
  id: string;
  client: string;
  email: string;
  phone: string;
  location: string;
  date: string;
  time: string;
  info: string;
  assignedTo: string | null;
};

type TeamMember = {
  id: string;
  name: string;
  role: string;
};

const UNASSIGNED_FILTER = "__unassigned__";

const typeStyles: Record<AppointmentType, string> = {
  "Levantamiento / Medidas": "bg-sky-100 text-sky-700",
  "Cotización en sitio": "bg-emerald-100 text-emerald-700",
  "Presentación de diseño": "bg-purple-100 text-purple-700",
};

const weekDays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const BUSINESS_START_HOUR = 9;
const BUSINESS_END_HOUR = 18;

const buildTimeSlots = () => {
  const slots: string[] = [];
  for (let hour = BUSINESS_START_HOUR; hour < BUSINESS_END_HOUR; hour += 1) {
    slots.push(`${String(hour).padStart(2, "0")}:00`);
  }
  return slots;
};
const TIME_SLOTS = buildTimeSlots();

const formatMonthLabel = (date: Date) =>
  date.toLocaleDateString("es-MX", { month: "long", year: "numeric" });

const toDateInput = (date: Date) => date.toISOString().slice(0, 10);

const normalizeMatchText = (value: string) => value.trim().toLowerCase();

export default function AgendaPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [citas, setCitas] = useState<CitaAlert[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState("Todos");
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { agendar, consultarDisponibilidad } = useVisitasContext();
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState("");
  const [remoteOccupiedTimes, setRemoteOccupiedTimes] = useState<string[]>([]);
  const [formState, setFormState] = useState<Appointment>({
    id: "",
    title: "",
    client: "",
    location: "",
    date: toDateInput(new Date()),
    time: "09:00",
    type: "Levantamiento / Medidas",
    assignedTo: "",
    status: "Confirmada",
  });
  const modalRef = useRef<HTMLDivElement | null>(null);

  useEscapeClose(isModalOpen, () => setIsModalOpen(false));
  useFocusTrap(isModalOpen, modalRef);

  useEffect(() => {
    const load = async () => {
      try {
        const [visitasResponse, citasResponse] = await Promise.all([
          obtenerVisitas(),
          obtenerTodasLasCitas(),
          syncKanbanTasksFromBackend(),
        ]);

        if (visitasResponse.success && Array.isArray(visitasResponse.data)) {
          const nextAppointments: Appointment[] = visitasResponse.data.map((visita, index) => ({
            id: String((visita._id as string | undefined) ?? (visita.id as string | undefined) ?? `agenda-${index}`),
            title: typeof visita.informacionAdicional === "string" ? visita.informacionAdicional : "Visita",
            client: typeof visita.nombreCliente === "string" ? visita.nombreCliente : "Cliente sin nombre",
            location: typeof visita.ubicacion === "string" ? visita.ubicacion : "",
            date: typeof visita.fechaProgramada === "string" ? visita.fechaProgramada.slice(0, 10) : toDateInput(new Date()),
            time: typeof visita.fechaProgramada === "string" ? visita.fechaProgramada.slice(11, 16) : "09:00",
            type: "Levantamiento / Medidas",
            assignedTo:
              typeof visita.asignadoA === "string"
                ? visita.asignadoA
                : typeof visita.responsableId === "string"
                  ? visita.responsableId
                  : null,
            status: visita.estado === "solicitada" || visita.estado === "programada" ? "Pendiente" : "Confirmada",
            email: typeof visita.correoCliente === "string" ? visita.correoCliente : "",
            phone: typeof visita.telefonoCliente === "string" ? visita.telefonoCliente : "",
          }));
          setAppointments(nextAppointments);
          if (nextAppointments.length > 0) {
            setTeamMembers((prev) => prev.length > 0 ? prev : [{ id: "ingeniero", name: "Ingeniero", role: "Asignado" }]);
          }
        }

        if (citasResponse.success && Array.isArray(citasResponse.data)) {
          const nextCitas: CitaAlert[] = citasResponse.data.map((cita, index) => {
            const ingeniero = cita.ingenieroAsignado;
            const assignedTo =
              typeof ingeniero === "string"
                ? ingeniero
                : Array.isArray(ingeniero) && ingeniero.length > 0
                  ? String(ingeniero[0])
                  : ingeniero && typeof ingeniero === "object" && "nombre" in (ingeniero as Record<string, unknown>)
                    ? String((ingeniero as Record<string, unknown>).nombre ?? "")
                    : null;
            return {
              id: String((cita._id as string | undefined) ?? `cita-${index}`),
              client: typeof cita.nombreCliente === "string" ? cita.nombreCliente : "Cliente sin nombre",
              email: typeof cita.correoCliente === "string" ? cita.correoCliente : "",
              phone: typeof cita.telefonoCliente === "string" ? cita.telefonoCliente : "",
              location: typeof cita.ubicacion === "string" ? cita.ubicacion : "",
              date: typeof cita.fechaAgendada === "string" ? cita.fechaAgendada.slice(0, 10) : toDateInput(new Date()),
              time: typeof cita.fechaAgendada === "string" ? cita.fechaAgendada.slice(11, 16) : "09:00",
              info: typeof cita.informacionAdicional === "string" ? cita.informacionAdicional : "",
              assignedTo: assignedTo || null,
            };
          });
          setCitas(nextCitas);
        }
      } catch {
        // fallback silencioso
      }
    };

    void load();
  }, []);

  useEffect(() => {
    if (!isModalOpen || !formState.date) return;
    let cancelled = false;
    void consultarDisponibilidad(formState.date)
      .then((response) => {
        if (cancelled) return;
        setRemoteOccupiedTimes(response.horariosOcupados ?? []);
      })
      .catch(() => {
        if (!cancelled) setRemoteOccupiedTimes([]);
      });
    return () => {
      cancelled = true;
    };
  }, [isModalOpen, formState.date, consultarDisponibilidad]);

  /** Horas ya tomadas por citas o visitas ese día (excluye la visita que se está editando). */
  const occupiedTimesForDate = useMemo(() => {
    const set = new Set<string>(remoteOccupiedTimes);
    for (const cita of citas) {
      if (cita.date === formState.date) set.add(cita.time);
    }
    for (const item of appointments) {
      if (item.date === formState.date && item.id !== editingId) set.add(item.time);
    }
    return set;
  }, [remoteOccupiedTimes, citas, appointments, formState.date, editingId]);

  const availableTimeSlots = useMemo(
    () => TIME_SLOTS.filter((slot) => !occupiedTimesForDate.has(slot) || slot === formState.time),
    [occupiedTimesForDate, formState.time],
  );

  useEffect(() => {
    if (!isModalOpen) return;
    if (occupiedTimesForDate.has(formState.time)) {
      const firstFree = TIME_SLOTS.find((slot) => !occupiedTimesForDate.has(slot));
      if (firstFree) setFormState((prev) => ({ ...prev, time: firstFree }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isModalOpen, occupiedTimesForDate]);

  useEffect(() => {
    if (!isModalOpen) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsModalOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isModalOpen]);

  const filteredAppointments = useMemo(() => {
    if (selectedEmployee === "Todos") {
      return appointments;
    }
    if (selectedEmployee === UNASSIGNED_FILTER) {
      return appointments.filter((appointment) => !appointment.assignedTo);
    }
    return appointments.filter((appointment) => appointment.assignedTo === selectedEmployee);
  }, [appointments, selectedEmployee]);

  const filteredCitas = useMemo(() => {
    if (selectedEmployee === "Todos") return citas;
    if (selectedEmployee === UNASSIGNED_FILTER) return citas.filter((c) => !c.assignedTo);
    return citas.filter((c) => c.assignedTo === selectedEmployee);
  }, [citas, selectedEmployee]);

  /** Una cita ya tiene visita registrada si coincide fecha + correo (o nombre) con alguna visita existente. */
  const citaMatchingVisita = (cita: CitaAlert): Appointment | undefined =>
    appointments.find((visita) => {
      if (visita.date !== cita.date) return false;
      const emailMatch = cita.email && visita.email && normalizeMatchText(cita.email) === normalizeMatchText(visita.email);
      const nameMatch = normalizeMatchText(cita.client) === normalizeMatchText(visita.client);
      return Boolean(emailMatch || nameMatch);
    });

  const daysInMonth = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: lastDay }, (_, index) => {
      const day = index + 1;
      return new Date(year, month, day);
    });
  }, [currentMonth]);

  const calendarCells = useMemo(() => {
    const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const startOffset = (firstDay.getDay() + 6) % 7;
    const totalCells = startOffset + daysInMonth.length;
    const trailing = (7 - (totalCells % 7)) % 7;
    return [
      ...Array.from({ length: startOffset }, () => null),
      ...daysInMonth,
      ...Array.from({ length: trailing }, () => null),
    ];
  }, [currentMonth, daysInMonth]);

  const openNewModal = (date: string) => {
    setEditingId(null);
    setFormState({
      id: "",
      title: "",
      client: "",
      location: "",
      date,
      time: "09:00",
      type: "Levantamiento / Medidas",
      assignedTo: teamMembers[0]?.id ?? "",
      status: "Confirmada",
    });
    setFormError(null);
    setCaptchaToken("");
    setIsModalOpen(true);
  };

  const openEditModal = (appointment: Appointment) => {
    setEditingId(appointment.id);
    setFormState(appointment);
    setFormError(null);
    setIsModalOpen(true);
  };

  /** Clic en la alerta de una cita: precarga sus datos para registrar la visita correspondiente. */
  const openVisitaFromCita = (cita: CitaAlert) => {
    setEditingId(null);
    setFormState({
      id: "",
      title: cita.info || "Visita",
      client: cita.client,
      location: cita.location,
      date: cita.date,
      time: cita.time,
      type: "Levantamiento / Medidas",
      assignedTo: teamMembers[0]?.id ?? "",
      status: "Confirmada",
      email: cita.email,
      phone: cita.phone,
    });
    setFormError(null);
    setCaptchaToken("");
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formState.title.trim() || !formState.client.trim() || !formState.date || !formState.time) {
      setFormError("Completa título, cliente, fecha y hora.");
      return;
    }
    if (!formState.email?.trim() || !formState.phone?.trim()) {
      setFormError("El correo y el teléfono del cliente son obligatorios.");
      return;
    }
    if (occupiedTimesForDate.has(formState.time)) {
      setFormError("Ese horario ya está ocupado por otra cita o visita. Elige otro.");
      return;
    }
    if (!editingId && !captchaToken) {
      setFormError("Confirma el captcha para registrar la visita.");
      return;
    }
    setIsSaving(true);
    setFormError(null);
    const normalizedStatus =
      formState.assignedTo && formState.status === "Pendiente" ? "Confirmada" : formState.status;
    try {
      const payload = {
        fechaProgramada: new Date(`${formState.date}T${formState.time}:00`).toISOString(),
        nombreCliente: formState.client.trim(),
        correoCliente: formState.email.trim(),
        telefonoCliente: formState.phone.trim(),
        ubicacion: formState.location.trim(),
        informacionAdicional: `${formState.title.trim()} - ${formState.type}`,
        estado: normalizedStatus === "Confirmada" ? "confirmada" : "solicitada",
      } as const;
      const response = editingId
        ? await actualizarVisita(editingId, payload)
        : await agendar(payload, captchaToken);
      if (!response.success) throw new Error(response.message || "No se pudo registrar la visita.");
      const savedAppointment: Appointment = {
        ...formState,
        status: normalizedStatus,
        id: String(response.data?._id ?? `v${Date.now().toString(36)}`),
      };
      setAppointments((prev) => editingId
        ? prev.map((item) => item.id === editingId ? savedAppointment : item)
        : [...prev, savedAppointment]);
      setCaptchaToken("");
      setIsModalOpen(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "No se pudo registrar la visita.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingId) {
      return;
    }
    setIsSaving(true);
    setFormError(null);
    try {
      const response = await eliminarVisita(editingId);
      if (!response.success) throw new Error(response.message || "No se pudo eliminar la visita.");
      setAppointments((prev) => prev.filter((item) => item.id !== editingId));
      setIsModalOpen(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "No se pudo eliminar la visita.");
    } finally {
      setIsSaving(false);
    }
  };


  return (
    <div className="flex h-[calc(100vh-2rem)] flex-col gap-6 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agenda de Citas y Visitas</h1>
          <p className="mt-1 text-sm text-gray-500 capitalize">{formatMonthLabel(currentMonth)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() =>
              setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
            }
            className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm transition hover:bg-gray-50"
            aria-label="Mes anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() =>
              setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
            }
            className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm transition hover:bg-gray-50"
            aria-label="Mes siguiente"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <select
            value={selectedEmployee}
            onChange={(event) => setSelectedEmployee(event.target.value)}
            className="rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 shadow-sm outline-none"
          >
            <option value="Todos">Todos</option>
            <option value={UNASSIGNED_FILTER}>🚨 Citas sin asignar</option>
            {teamMembers.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => openNewModal(toDateInput(new Date()))}
            className="rounded-2xl bg-[#8B1C1C] px-5 py-2.5 text-sm font-semibold text-white shadow-sm"
          >
            Agendar visita
          </button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 flex-col gap-2">
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day) => (
            <div key={day} className="px-2 text-sm font-medium text-gray-500">
              {day}
            </div>
          ))}
        </div>
        <div className="grid flex-1 min-h-0 grid-cols-7 grid-rows-6 gap-2">
          {calendarCells.map((date, index) => {
            if (!date) {
              return <div key={`empty-${index}`} className="rounded-2xl border border-transparent p-1" />;
            }
            const dateKey = toDateInput(date);
            const dayAppointments = filteredAppointments.filter((item) => item.date === dateKey);
            const dayCitas = filteredCitas.filter((c) => c.date === dateKey);
            return (
              <button
                key={dateKey}
                type="button"
                onClick={() => openNewModal(dateKey)}
                className="flex min-h-0 flex-col rounded-2xl border border-gray-100 bg-white p-1.5 text-left transition-colors hover:bg-gray-50"
              >
                <div className="text-xs font-semibold text-gray-500">{date.getDate()}</div>
                <div className="mt-1 flex-1 min-h-0 space-y-1 overflow-y-auto custom-scrollbar">
                  {dayCitas.map((cita) => {
                    const matchedVisita = citaMatchingVisita(cita);
                    if (matchedVisita) {
                      return (
                        <button
                          key={`cita-${cita.id}`}
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            openEditModal(matchedVisita);
                          }}
                          className="flex w-full items-center gap-1 truncate rounded-md bg-emerald-600 px-2 py-0.5 text-left text-[10px] text-white shadow-sm"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          <span className="truncate">Visita registrada · {cita.time} · {cita.client}</span>
                        </button>
                      );
                    }
                    return (
                      <button
                        key={`cita-${cita.id}`}
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          openVisitaFromCita(cita);
                        }}
                        className="flex w-full items-center gap-1 truncate rounded-md bg-amber-500 px-2 py-0.5 text-left text-[10px] text-white shadow-sm"
                      >
                        <AlertCircle className="h-3 w-3" />
                        <span className="truncate">Cita · {cita.time} · {cita.client}</span>
                      </button>
                    );
                  })}
                  {dayAppointments.map((appointment) => {
                    const isPending = appointment.status === "Pendiente" || !appointment.assignedTo;
                    return (
                      <button
                        key={appointment.id}
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          openEditModal(appointment);
                        }}
                        className={`flex w-full items-center gap-1 truncate rounded-md px-2 py-0.5 text-left text-[10px] shadow-sm ${
                          isPending
                            ? "bg-red-500 text-white animate-pulse"
                            : typeStyles[appointment.type]
                        }`}
                      >
                        {isPending ? <AlertCircle className="h-3 w-3" /> : null}
                        <span className="truncate">
                          {appointment.time} · {appointment.client}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {isModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            ref={modalRef}
            tabIndex={-1}
            className="w-full max-w-xl max-h-[90vh] overflow-y-auto custom-scrollbar rounded-3xl border border-white/70 bg-white/95 p-6 shadow-2xl backdrop-blur"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {editingId ? "Editar visita" : "Agendar visita"}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-500"
              >
                Cerrar
              </button>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="text-xs font-semibold text-gray-500 sm:col-span-2">
                Título
                <input
                  value={formState.title}
                  onChange={(event) => setFormState((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder="Ej. Medición cocina principal"
                  className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none"
                />
              </label>
              <label className="text-xs font-semibold text-gray-500 sm:col-span-2">
                Cliente
                <input
                  value={formState.client}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, client: event.target.value }))
                  }
                  placeholder="Ej. Mariana Fuentes"
                  className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none"
                />
              </label>
              <label className="text-xs font-semibold text-gray-500">
                Correo *
                <input
                  type="email"
                  required
                  value={formState.email ?? ""}
                  onChange={(event) => setFormState((prev) => ({ ...prev, email: event.target.value }))}
                  placeholder="cliente@correo.com"
                  className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none"
                />
              </label>
              <label className="text-xs font-semibold text-gray-500">
                Teléfono *
                <input
                  required
                  value={formState.phone ?? ""}
                  onChange={(event) => setFormState((prev) => ({ ...prev, phone: event.target.value }))}
                  placeholder="Teléfono"
                  className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none"
                />
              </label>
              <label className="text-xs font-semibold text-gray-500 sm:col-span-2">
                Dirección / Ubicación
                <textarea
                  value={formState.location}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, location: event.target.value }))
                  }
                  placeholder="Ej. Calle 123, Col. Centro, CDMX"
                  className="mt-2 min-h-[90px] w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none"
                />
              </label>
              <label className="text-xs font-semibold text-gray-500">
                Fecha
                <input
                  value={formState.date}
                  onChange={(event) => setFormState((prev) => ({ ...prev, date: event.target.value }))}
                  type="date"
                  className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none"
                />
              </label>
              <label className="text-xs font-semibold text-gray-500">
                Hora
                <select
                  value={formState.time}
                  onChange={(event) => setFormState((prev) => ({ ...prev, time: event.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none"
                >
                  {TIME_SLOTS.map((slot) => {
                    const isOccupied = occupiedTimesForDate.has(slot) && slot !== formState.time;
                    return (
                      <option key={slot} value={slot} disabled={isOccupied}>
                        {slot} {isOccupied ? "· Ocupado" : ""}
                      </option>
                    );
                  })}
                </select>
                {availableTimeSlots.length === 0 ? (
                  <span className="mt-1 block text-[10px] font-medium text-rose-600">
                    No hay horarios disponibles ese día.
                  </span>
                ) : null}
              </label>
              <label className="text-xs font-semibold text-gray-500">
                Tipo de visita
                <select
                  value={formState.type}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      type: event.target.value as AppointmentType,
                    }))
                  }
                  className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none"
                >
                  <option value="Levantamiento / Medidas">Levantamiento / Medidas</option>
                  <option value="Cotización en sitio">Cotización en sitio</option>
                  <option value="Presentación de diseño">Presentación de diseño</option>
                </select>
              </label>
              <label className="text-xs font-semibold text-gray-500">
                Asignar a
                <select
                  value={formState.assignedTo ?? ""}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      assignedTo: event.target.value,
                      status: event.target.value ? "Confirmada" : prev.status,
                    }))
                  }
                  className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none"
                >
                  {teamMembers.length === 0 ? (
                    <option value="">Sin integrantes</option>
                  ) : null}
                  <option value="">Sin asignar</option>
                  {teamMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-semibold text-gray-500">
                Estado
                <select
                  value={formState.status}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      status: event.target.value as AppointmentStatus,
                      assignedTo:
                        event.target.value === "Pendiente" ? "" : prev.assignedTo,
                    }))
                  }
                  className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none"
                  disabled={Boolean(formState.assignedTo)}
                >
                  <option value="Pendiente">Pendiente</option>
                  <option value="Confirmada">Confirmada</option>
                </select>
                {formState.assignedTo ? (
                  <span className="mt-2 block text-[10px] font-medium text-gray-400">
                    Asignación requerida completada.
                  </span>
                ) : null}
              </label>
            </div>
            {formError ? (
              <p className="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{formError}</p>
            ) : null}
            {!editingId ? (
              <div className="mt-4">
                <Captcha
                  onVerify={setCaptchaToken}
                  onExpire={() => setCaptchaToken("")}
                  onError={() => setCaptchaToken("")}
                />
              </div>
            ) : null}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              {editingId ? (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="rounded-2xl border border-rose-200 px-4 py-2 text-xs font-semibold text-rose-600"
                >
                  Eliminar cita
                </button>
              ) : (
                <span />
              )}
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-2xl border border-gray-200 bg-white px-5 py-2 text-xs font-semibold text-gray-600"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="rounded-2xl bg-[#8B1C1C] px-5 py-2 text-xs font-semibold text-white disabled:opacity-60"
                >
                  {isSaving ? "Guardando..." : editingId ? "Guardar cambios" : "Guardar visita"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
