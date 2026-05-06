"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { useEscapeClose } from "@/hooks/useEscapeClose";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import {
  actualizarCita,
  actualizarEstadoCita,
  asignarIngeniero,
  crearCita,
  eliminarCita,
  obtenerTodasLasCitas,
  type Cita,
} from "@/lib/axios/citasApi";
import { listarEmpleados, type Usuario } from "@/lib/axios/usuariosApi";

type AppointmentType =
  | "Levantamiento / Medidas"
  | "Cotización en sitio"
  | "Presentación de diseño";

type AppointmentStatus = "Pendiente" | "Confirmada";

type Appointment = {
  id: string;
  title: string;
  client: string;
  clientCode?: string;
  clientEmail: string;
  clientPhone: string;
  location: string;
  date: string;
  time: string;
  type: AppointmentType;
  assignedTo: string | null;
  status: AppointmentStatus;
  backendState: Cita["estado"];
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

const toDateInput = (date: Date) => date.toISOString().slice(0, 10);

const toDateTimeIso = (date: string, time: string) => {
  if (!date) return new Date().toISOString();
  const merged = `${date}T${time || "09:00"}:00`;
  const parsed = new Date(merged);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
};

const toAppointmentType = (cita: Cita): AppointmentType => {
  const disenoNombre =
    cita.diseno && typeof cita.diseno === "object" && "nombre" in cita.diseno
      ? cita.diseno.nombre
      : "";
  const source = `${cita.informacionAdicional || ""} ${disenoNombre || ""}`.toLowerCase();
  if (source.includes("cotiz")) return "Cotización en sitio";
  if (source.includes("dise")) return "Presentación de diseño";
  return "Levantamiento / Medidas";
};

const toAppointmentStatus = (cita: Cita): AppointmentStatus => {
  if (!cita.ingenieroAsignado) return "Pendiente";
  return "Confirmada";
};

const getAssignedId = (cita: Cita) => {
  if (!cita.ingenieroAsignado) return null;
  if (typeof cita.ingenieroAsignado === "string") return cita.ingenieroAsignado;
  return cita.ingenieroAsignado._id;
};

const citaToAppointment = (cita: Cita): Appointment => {
  const scheduledDate = new Date(cita.fechaAgendada);
  const safeDate = Number.isNaN(scheduledDate.getTime()) ? new Date() : scheduledDate;

  return {
    id: cita._id,
    title: cita.informacionAdicional || "Levantamiento / Medidas",
    client: cita.nombreCliente,
    clientCode:
      cita.clienteId ||
      (typeof cita.cliente === "object" && cita.cliente ? cita.cliente.clienteId : undefined),
    clientEmail: cita.correoCliente,
    clientPhone: cita.telefonoCliente,
    location: cita.ubicacion || "",
    date: toDateInput(safeDate),
    time: safeDate.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: false }),
    type: toAppointmentType(cita),
    assignedTo: getAssignedId(cita),
    status: toAppointmentStatus(cita),
    backendState: cita.estado,
  };
};

export default function AgendaPage() {
  const searchParams = useSearchParams();
  const selectedDateFromQuery = useMemo(() => {
    const date = searchParams.get("date");
    return date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
  }, [searchParams]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState("Todos");
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedDateForDayView, setSelectedDateForDayView] = useState<string | null>(selectedDateFromQuery);
  const [formState, setFormState] = useState<Appointment>({
    id: "",
    title: "",
    client: "",
    clientEmail: "",
    clientPhone: "",
    location: "",
    date: toDateInput(new Date()),
    time: "09:00",
    type: "Levantamiento / Medidas",
    assignedTo: "",
    status: "Pendiente",
    backendState: "programada",
  });
  const modalRef = useRef<HTMLDivElement | null>(null);
  const dayViewRef = useRef<HTMLDivElement | null>(null);

  useEscapeClose(isModalOpen, () => setIsModalOpen(false));
  useFocusTrap(isModalOpen, modalRef);

  useEscapeClose(selectedDateForDayView !== null, () => setSelectedDateForDayView(null));
  useFocusTrap(selectedDateForDayView !== null, dayViewRef);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [citasResponse, empleadosResponse] = await Promise.all([obtenerTodasLasCitas(), listarEmpleados()]);

      if (!citasResponse.success || !citasResponse.data) {
        throw new Error(citasResponse.message || "No se pudo cargar la agenda");
      }

      const citas = Array.isArray(citasResponse.data) ? citasResponse.data : [];
      setAppointments(citas.map(citaToAppointment));

      if (empleadosResponse.success && empleadosResponse.data) {
        setTeamMembers(
          empleadosResponse.data.map((member: Usuario) => ({
            id: member._id,
            name: member.nombre,
            role: member.rol,
          })),
        );
      }
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "Error al cargar agenda");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    if (selectedDateFromQuery) {
      setSelectedDateForDayView(selectedDateFromQuery);
    }
  }, [selectedDateFromQuery]);

  useEffect(() => {
    if (!isModalOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsModalOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isModalOpen]);

  const filteredAppointments = useMemo(() => {
    if (selectedEmployee === "Todos") return appointments;
    if (selectedEmployee === UNASSIGNED_FILTER) {
      return appointments.filter((appointment) => !appointment.assignedTo);
    }
    return appointments.filter((appointment) => appointment.assignedTo === selectedEmployee);
  }, [appointments, selectedEmployee]);

  const daysInMonth = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: lastDay }, (_, index) => new Date(year, month, index + 1));
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
      clientEmail: "",
      clientPhone: "",
      location: "",
      date,
      time: "09:00",
      type: "Levantamiento / Medidas",
      assignedTo: teamMembers[0]?.id ?? "",
      status: teamMembers[0]?.id ? "Confirmada" : "Pendiente",
      backendState: "programada",
    });
    setIsModalOpen(true);
  };

  const openDayView = (date: string) => {
    setSelectedDateForDayView(date);
  };

  const openEditModal = (appointment: Appointment) => {
    setEditingId(appointment.id);
    setFormState(appointment);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formState.title.trim() || !formState.client.trim() || !formState.date || !formState.time) return;
    if (!formState.clientEmail.trim() || !formState.clientPhone.trim()) {
      setError("Correo y teléfono del cliente son requeridos.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const fechaAgendada = toDateTimeIso(formState.date, formState.time);
      const normalizedStatus: AppointmentStatus = formState.assignedTo ? "Confirmada" : "Pendiente";

      if (editingId) {
        const updateResponse = await actualizarCita(editingId, {
          nombreCliente: formState.client.trim(),
          correoCliente: formState.clientEmail.trim(),
          telefonoCliente: formState.clientPhone.trim(),
          ubicacion: formState.location.trim() || undefined,
          informacionAdicional: formState.title.trim(),
          fechaAgendada,
        });
        if (!updateResponse.success) {
          throw new Error(updateResponse.message || "No se pudo actualizar la cita");
        }

        const assignResponse = await asignarIngeniero(editingId, {
          ingenieroId: formState.assignedTo || undefined,
        });
        if (!assignResponse.success) {
          throw new Error(assignResponse.message || "No se pudo actualizar asignación");
        }

        const estadoResponse = await actualizarEstadoCita(editingId, {
          estado: formState.assignedTo ? "en_proceso" : "programada",
        });
        if (!estadoResponse.success) {
          throw new Error(estadoResponse.message || "No se pudo actualizar estado");
        }
      } else {
        const createResponse = await crearCita(
          {
            fechaAgendada,
            nombreCliente: formState.client.trim(),
            correoCliente: formState.clientEmail.trim(),
            telefonoCliente: formState.clientPhone.trim(),
            ubicacion: formState.location.trim() || undefined,
            informacionAdicional: formState.title.trim(),
          },
          "",
        );

        if (!createResponse.success) {
          throw new Error(createResponse.message || "No se pudo crear la cita");
        }

        const createdId = createResponse.data?._id;
        if (createdId) {
          await asignarIngeniero(createdId, { ingenieroId: formState.assignedTo || undefined });
          await actualizarEstadoCita(createdId, {
            estado: formState.assignedTo ? "en_proceso" : "programada",
          });
        }
      }

      setIsModalOpen(false);
      await loadData();

      setFormState((prev) => ({
        ...prev,
        status: normalizedStatus,
      }));
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "No se pudo guardar la cita");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingId) return;
    setIsSaving(true);
    setError(null);
    try {
      const response = await eliminarCita(editingId);
      if (!response.success) {
        throw new Error(response.message || "No se pudo eliminar la cita");
      }
      setIsModalOpen(false);
      await loadData();
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "No se pudo eliminar la cita");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-2rem)] flex-col gap-6 overflow-y-auto">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agenda de Citas y Visitas</h1>
          <p className="mt-1 text-sm text-gray-500 capitalize">{formatMonthLabel(currentMonth)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm transition hover:bg-gray-50"
            aria-label="Mes anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
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
            <option value={UNASSIGNED_FILTER}>🟥 Citas sin asignar</option>
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

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="flex flex-1 min-h-0 flex-col gap-2">
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day) => (
            <div key={day} className="px-2 text-sm font-medium text-gray-500">
              {day}
            </div>
          ))}
        </div>
        <div className="grid flex-1 min-h-0 grid-cols-7 grid-rows-[repeat(6,minmax(120px,1fr))] gap-2">
          {calendarCells.map((date, index) => {
            if (!date) {
              return <div key={`empty-${index}`} className="rounded-2xl border border-transparent p-1" />;
            }
            const dateKey = toDateInput(date);
            const dayAppointments = filteredAppointments.filter((item) => item.date === dateKey);
            const hasAppointments = dayAppointments.length > 0;

            return (
              <button
                key={dateKey}
                type="button"
                onClick={() => openDayView(dateKey)}
                className={`flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border p-2 text-left transition-colors hover:bg-[#8B1C1C]/5 ${
                  hasAppointments ? "border-[#8B1C1C]/20 bg-[#8B1C1C]/5" : "border-gray-100 bg-white"
                }`}
              >
                <div className="text-xs font-bold text-[#8B1C1C]">{date.getDate()}</div>
                <div className="mt-1 min-h-0 flex-1 overflow-hidden">
                  {hasAppointments ? (
                    <>
                      <div className="mb-1 text-[11px] font-semibold text-[#8B1C1C]">
                        {dayAppointments.length} {dayAppointments.length === 1 ? "cita" : "citas"}
                      </div>
                      <div className="space-y-1 overflow-hidden">
                        {dayAppointments.slice(0, 2).map((appointment, idx) => {
                          const statusColor =
                            appointment.backendState === "programada"
                              ? "bg-[#8B1C1C]/10 text-[#8B1C1C]"
                              : appointment.backendState === "en_proceso"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-green-100 text-green-700";

                          return (
                            <div key={idx} className={`rounded-md px-2 py-1 text-[11px] font-semibold ${statusColor} leading-tight`}>
                              <div className="truncate">
                                {appointment.time} - {appointment.type.split("/")[0].trim()}
                              </div>
                            </div>
                          );
                        })}
                        {dayAppointments.length > 2 ? (
                          <div className="text-[10px] font-semibold text-[#8B1C1C]">
                            +{dayAppointments.length - 2} pendientes
                          </div>
                        ) : null}
                      </div>
                    </>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {selectedDateForDayView ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4"
          onClick={() => setSelectedDateForDayView(null)}
        >
          <div
            ref={dayViewRef}
            tabIndex={-1}
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar rounded-3xl border border-white/70 bg-white/95 p-6 shadow-2xl backdrop-blur"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-[#8B1C1C]">
                {new Date(`${selectedDateForDayView}T00:00`).toLocaleDateString("es-MX", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedDateForDayView(null)}
                className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-500 hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            {(() => {
              const dayAppointments = filteredAppointments.filter((item) => item.date === selectedDateForDayView);

              if (dayAppointments.length === 0) {
                return (
                  <div className="text-center py-8">
                    <p className="text-gray-500 text-sm mb-4">No hay citas agendadas para este día</p>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDateForDayView(null);
                        openNewModal(selectedDateForDayView!);
                      }}
                      className="rounded-2xl bg-[#8B1C1C] px-5 py-2 text-xs font-semibold text-white hover:bg-[#6B1515]"
                    >
                      Crear cita
                    </button>
                  </div>
                );
              }

              return (
                <div className="space-y-3 mb-6">
                  {dayAppointments.map((appointment) => (
                    <div
                      key={appointment.id}
                      className="rounded-2xl border border-[#8B1C1C]/20 bg-white p-4 hover:border-[#8B1C1C]/50 hover:bg-[#8B1C1C]/3 transition cursor-pointer hover:shadow-md"
                      onClick={() => {
                        setSelectedDateForDayView(null);
                        openEditModal(appointment);
                      }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span
                              className={`rounded-full px-2 py-1 text-[11px] font-bold ${
                                appointment.backendState === "programada"
                                  ? "bg-[#8B1C1C]/15 text-[#8B1C1C]"
                                  : appointment.backendState === "en_proceso"
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-green-100 text-green-700"
                              }`}
                            >
                              {appointment.backendState === "programada"
                                ? "Programada"
                                : appointment.backendState === "en_proceso"
                                  ? "En proceso"
                                  : "Completada"}
                            </span>
                            <span className={`text-[11px] font-semibold rounded px-2 py-1 ${typeStyles[appointment.type]}`}>
                              {appointment.type.split("/")[0].trim()}
                            </span>
                          </div>
                          <h4 className="font-bold text-[#8B1C1C] text-base mb-2">{appointment.title}</h4>
                          <div className="space-y-1 text-sm text-gray-700">
                            <div>
                              <span className="font-semibold text-[#8B1C1C]">Cliente:</span> {appointment.client}
                            </div>
                            {appointment.clientCode ? (
                              <div>
                                <span className="font-semibold text-[#8B1C1C]">Código:</span> {appointment.clientCode}
                              </div>
                            ) : null}
                            <div>
                              <span className="font-semibold text-[#8B1C1C]">Email:</span> {appointment.clientEmail}
                            </div>
                            <div>
                              <span className="font-semibold text-[#8B1C1C]">Teléfono:</span> {appointment.clientPhone}
                            </div>
                            {appointment.location ? (
                              <div>
                                <span className="font-semibold text-[#8B1C1C]">Ubicación:</span> {appointment.location}
                              </div>
                            ) : null}
                            <div>
                              <span className="font-semibold text-[#8B1C1C]">Hora:</span> {appointment.time}
                            </div>
                            {appointment.assignedTo ? (
                              <div>
                                <span className="font-semibold text-[#8B1C1C]">Asignado a:</span>{" "}
                                {teamMembers.find((member) => member.id === appointment.assignedTo)?.name || "Desconocido"}
                              </div>
                            ) : (
                              <div className="text-orange-600">
                                <span className="font-semibold">Asignado a:</span> Sin asignar
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <button
                            type="button"
                            className="text-[#8B1C1C]/40 hover:text-[#8B1C1C] text-2xl font-light"
                            title="Ver detalles"
                          >
                            →
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}

            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setSelectedDateForDayView(null)}
                className="flex-1 rounded-2xl border border-[#8B1C1C]/30 bg-white px-5 py-2 text-xs font-semibold text-[#8B1C1C] hover:bg-[#8B1C1C]/5"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedDateForDayView(null);
                  openNewModal(selectedDateForDayView!);
                }}
                className="flex-1 rounded-2xl bg-[#8B1C1C] px-5 py-2 text-xs font-semibold text-white hover:bg-[#6B1515]"
              >
                Crear nueva cita
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4" onClick={() => setIsModalOpen(false)}>
          <div
            ref={modalRef}
            tabIndex={-1}
            className="w-full max-w-xl max-h-[90vh] overflow-y-auto custom-scrollbar rounded-3xl border border-white/70 bg-white/95 p-6 shadow-2xl backdrop-blur"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{editingId ? "Editar visita" : "Agendar visita"}</h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-500"
              >
                Cerrar
              </button>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
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
                  onChange={(event) => setFormState((prev) => ({ ...prev, client: event.target.value }))}
                  placeholder="Ej. Mariana Fuentes"
                  className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none"
                />
              </label>
              <label className="text-xs font-semibold text-gray-500">
                Correo cliente
                <input
                  value={formState.clientEmail}
                  onChange={(event) => setFormState((prev) => ({ ...prev, clientEmail: event.target.value }))}
                  placeholder="cliente@email.com"
                  className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none"
                />
              </label>
              <label className="text-xs font-semibold text-gray-500">
                Teléfono cliente
                <input
                  value={formState.clientPhone}
                  onChange={(event) => setFormState((prev) => ({ ...prev, clientPhone: event.target.value }))}
                  placeholder="10 dígitos"
                  className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none"
                />
              </label>
              <label className="text-xs font-semibold text-gray-500 sm:col-span-2">
                Dirección / Ubicación
                <textarea
                  value={formState.location}
                  onChange={(event) => setFormState((prev) => ({ ...prev, location: event.target.value }))}
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
                  onChange={(event) => setFormState((prev) => ({ ...prev, type: event.target.value as AppointmentType }))}
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
                      assignedTo: event.target.value || null,
                      status: event.target.value ? "Confirmada" : "Pendiente",
                    }))
                  }
                  className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none"
                >
                  <option value="">Sin asignar</option>
                  {teamMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              {editingId ? (
                <button
                  type="button"
                  onClick={() => void handleDelete()}
                  disabled={isSaving}
                  className="rounded-2xl border border-rose-200 px-4 py-2 text-xs font-semibold text-rose-600 disabled:opacity-50"
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
                  onClick={() => void handleSave()}
                  disabled={isSaving}
                  className="rounded-2xl bg-[#8B1C1C] px-5 py-2 text-xs font-semibold text-white disabled:opacity-50"
                >
                  {editingId ? "Guardar cambios" : "Guardar cita"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
