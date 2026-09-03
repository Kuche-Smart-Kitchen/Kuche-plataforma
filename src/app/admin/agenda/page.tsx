/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";

import { useEscapeClose } from "@/hooks/useEscapeClose";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { syncKanbanTasksFromBackend } from "@/lib/admin-workflow";
import { mexicoCityDateTimeToISO, parseFechaAgendadaInMexicoCity, toLocalDateKey } from "@/lib/cita-datetime";
import { notifyWorkflowOfCitaCreated } from "@/lib/cita-kanban-sync";
import { actualizarCita, crearCita, obtenerTodasLasCitas } from "@/lib/axios/citasApi";

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
  estado?: string;
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

const formatMonthLabel = (date: Date) =>
  date.toLocaleDateString("es-MX", { month: "long", year: "numeric" });

const toDateInput = (date: Date) => toLocalDateKey(date);

const isMongoObjectId = (value: string) => /^[a-fA-F0-9]{24}$/.test(value);

const resolveAssignedTo = (value: unknown): string | null => {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (Array.isArray(value) && value.length > 0) {
    const first = value[0];
    if (typeof first === "string" && first.trim()) return first.trim();
    if (first && typeof first === "object" && "nombre" in first) {
      const nombre = (first as { nombre?: unknown }).nombre;
      if (typeof nombre === "string" && nombre.trim()) return nombre.trim();
    }
    return String(first);
  }
  if (value && typeof value === "object" && "nombre" in value) {
    const nombre = (value as { nombre?: unknown }).nombre;
    if (typeof nombre === "string" && nombre.trim()) return nombre.trim();
  }
  return null;
};

const mapMongoCitaToAppointment = (cita: Record<string, unknown>, index: number): Appointment => {
  const { date, time } = parseFechaAgendadaInMexicoCity(cita.fechaAgendada);
  const estado = typeof cita.estado === "string" ? cita.estado : "programada";
  const title =
    typeof cita.informacionAdicional === "string" && cita.informacionAdicional.trim()
      ? cita.informacionAdicional
      : "Visita";

  return {
    id: String(cita._id ?? cita.id ?? `agenda-${index}`),
    title,
    client: typeof cita.nombreCliente === "string" ? cita.nombreCliente : "Cliente sin nombre",
    location: typeof cita.ubicacion === "string" ? cita.ubicacion : "",
    date,
    time,
    type: "Levantamiento / Medidas",
    assignedTo: resolveAssignedTo(cita.ingenieroAsignado),
    status: estado === "cancelada" ? "Pendiente" : "Confirmada",
    email: typeof cita.correoCliente === "string" ? cita.correoCliente : "",
    phone: typeof cita.telefonoCliente === "string" ? cita.telefonoCliente : "",
    estado,
  };
};

const getPersistErrorMessage = (error: unknown): string => {
  if (error && typeof error === "object" && "response" in error) {
    const data = (error as { response?: { data?: { message?: unknown } } }).response?.data;
    if (typeof data?.message === "string" && data.message.trim()) return data.message;
  }
  if (error instanceof Error && error.message) return error.message;
  return "No fue posible guardar la cita en el backend.";
};

export default function AgendaPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState("Todos");
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
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

  const loadAppointments = useCallback(async () => {
    try {
      const [citasResponse] = await Promise.all([obtenerTodasLasCitas(), syncKanbanTasksFromBackend()]);
      if (!citasResponse.success) {
        console.error("[admin/agenda] obtenerTodasLasCitas respondió sin éxito", citasResponse);
        return;
      }
      if (!Array.isArray(citasResponse.data)) {
        console.error("[admin/agenda] obtenerTodasLasCitas no devolvió un arreglo de citas", citasResponse);
        return;
      }

      const nextAppointments = citasResponse.data.map(mapMongoCitaToAppointment);
      setAppointments(nextAppointments);
      if (nextAppointments.length > 0) {
        setTeamMembers((prev) =>
          prev.length > 0 ? prev : [{ id: "ingeniero", name: "Ingeniero", role: "Asignado" }],
        );
      }
    } catch (error) {
      console.error("[admin/agenda] Error de red o autenticación al cargar citas", error);
    }
  }, []);

  useEffect(() => {
    void loadAppointments();
  }, [loadAppointments]);

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
    setSaveError(null);
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
    setIsModalOpen(true);
  };

  const openEditModal = (appointment: Appointment) => {
    setEditingId(appointment.id);
    setSaveError(null);
    setFormState(appointment);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formState.title.trim() || !formState.client.trim() || !formState.date || !formState.time) {
      return;
    }
    const normalizedStatus =
      formState.assignedTo && formState.status === "Pendiente" ? "Confirmada" : formState.status;
    const fechaAgendada = mexicoCityDateTimeToISO(formState.date, formState.time);
    const payload: Record<string, unknown> = {
      nombreCliente: formState.client.trim(),
      correoCliente: formState.email?.trim() || "pendiente@kuche.local",
      telefonoCliente: formState.phone?.trim() || "0000000000",
      ubicacion: formState.location.trim() || undefined,
      fechaAgendada,
      informacionAdicional: formState.title.trim(),
      estado: normalizedStatus === "Pendiente" ? "programada" : (formState.estado ?? "programada"),
      ingenieroAsignado: formState.assignedTo?.trim() || undefined,
    };

    setIsSaving(true);
    setSaveError(null);

    try {
      let persistedId = editingId;
      if (editingId && isMongoObjectId(editingId)) {
        const updated = await actualizarCita(editingId, payload);
        if (updated.success === false) {
          throw new Error(updated.message || "No se pudo actualizar la cita.");
        }
      } else {
        const created = await crearCita(payload);
        if (!created.success || !created.data) {
          throw new Error(created.success === false ? created.message : "No se pudo crear la cita.");
        }
        persistedId = String(created.data._id ?? created.data.id ?? `a${Date.now().toString(36)}`);
      }

      const nextAppointment: Appointment = {
        ...formState,
        id: persistedId ?? `a${Date.now().toString(36)}`,
        status: normalizedStatus,
      };

      setAppointments((prev) => {
        if (editingId) {
          return prev.map((item) => (item.id === editingId ? nextAppointment : item));
        }
        return [...prev, nextAppointment];
      });

      notifyWorkflowOfCitaCreated({
        id: nextAppointment.id,
        nombreCliente: nextAppointment.client,
        fechaAgendada,
        ubicacion: nextAppointment.location,
        notes: nextAppointment.title,
        assignedTo: nextAppointment.assignedTo ? [nextAppointment.assignedTo] : undefined,
      });

      void syncKanbanTasksFromBackend();
      void loadAppointments();
      setIsModalOpen(false);
    } catch (error) {
      console.error("[admin/agenda] No se pudo persistir la cita", error);
      setSaveError(getPersistErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    if (!editingId) {
      return;
    }
    setAppointments((prev) => prev.filter((item) => item.id !== editingId));
    setIsModalOpen(false);
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
            return (
              <button
                key={dateKey}
                type="button"
                onClick={() => openNewModal(dateKey)}
                className="flex min-h-0 flex-col rounded-2xl border border-gray-100 bg-white p-1.5 text-left transition-colors hover:bg-gray-50"
              >
                <div className="text-xs font-semibold text-gray-500">{date.getDate()}</div>
                <div className="mt-1 flex-1 min-h-0 space-y-1 overflow-y-auto custom-scrollbar">
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
                <input
                  value={formState.time}
                  onChange={(event) => setFormState((prev) => ({ ...prev, time: event.target.value }))}
                  type="time"
                  className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none"
                />
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
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              {editingId ? (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isSaving}
                  className="rounded-2xl border border-rose-200 px-4 py-2 text-xs font-semibold text-rose-600 disabled:opacity-60"
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
                  disabled={isSaving}
                  className="rounded-2xl border border-gray-200 bg-white px-5 py-2 text-xs font-semibold text-gray-600 disabled:opacity-60"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={isSaving}
                  className="rounded-2xl bg-[#8B1C1C] px-5 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSaving ? "Guardando..." : editingId ? "Guardar cambios" : "Guardar cita"}
                </button>
              </div>
            </div>
            {saveError ? (
              <p className="mt-3 text-xs font-semibold text-red-600">{saveError}</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
