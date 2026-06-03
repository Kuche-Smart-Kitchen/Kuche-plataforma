"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, Plus, Users } from "lucide-react";
import CitaModal from "@/components/admin/CitaModal";
import CrearCitaModal from "@/components/admin/CrearCitaModal";
import { 
  Cita, 
  obtenerTodasLasCitas, 
  actualizarDatosCita,
  actualizarEstadoCita,
  asignarIngenierosCita,
  type ActualizarDatosCitaData
} from "@/lib/axios/citasApi";
import { listarEmpleados, type Usuario } from "@/lib/axios/usuariosApi";

const WEEK_DAYS = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];

const formatLocalDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatLocalDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { dateKey: "", timeLabel: "--:--" };
  }

  return {
    dateKey: formatLocalDateKey(date),
    timeLabel: new Intl.DateTimeFormat("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date),
  };
};

const estadoStyles: Record<Cita["estado"], string> = {
  programada: "bg-amber-100 text-amber-700",
  en_proceso: "bg-sky-100 text-sky-700",
  completada: "bg-emerald-100 text-emerald-700",
  cancelada: "bg-rose-100 text-rose-700",
};

const estadoLabel: Record<Cita["estado"], string> = {
  programada: "Programada",
  en_proceso: "En proceso",
  completada: "Completada",
  cancelada: "Cancelada",
};

const getCitaAssignedLabel = (cita: Cita) => {
  const assigned = cita.ingenieroAsignado;
  if (!assigned) return "Sin asignar";
  if (Array.isArray(assigned)) {
    const labels = assigned
      .map((item) => (typeof item === "string" ? item : item.nombre))
      .filter(Boolean);
    return labels.length > 0 ? labels.join(", ") : "Sin asignar";
  }
  return typeof assigned === "string" ? assigned : assigned.nombre;
};


export default function AgendaPage() {
  const [citas, setCitas] = useState<Cita[]>([]);
  const [empleados, setEmpleados] = useState<Usuario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCita, setSelectedCita] = useState<Cita | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCrearCitaModalOpen, setIsCrearCitaModalOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDateKey, setSelectedDateKey] = useState(() => formatLocalDateKey(new Date()));

  // Cargar citas al montar el componente
  useEffect(() => {
    cargarDatos();
  }, []);

  useEffect(() => {
    const cargarEmpleados = async () => {
      const response = await listarEmpleados().catch(() => null);
      if (response?.success && response.data) {
        setEmpleados(response.data.filter((empleado) => empleado.activo !== false));
      }
    };

    void cargarEmpleados();
  }, []);

  const cargarDatos = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const citasResponse = await obtenerTodasLasCitas();

      if (citasResponse.success && citasResponse.data) {
        setCitas(citasResponse.data);
      } else {
        setError(citasResponse.message || "Error al cargar las citas");
      }
    } catch (err) {
      console.error("Error al cargar datos:", err);
      setError("Error al conectar con el servidor");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCitaClick = (cita: Cita) => {
    setSelectedCita(cita);
    setIsModalOpen(true);
  };

  const handleActualizarDatos = async (citaId: string, datos: ActualizarDatosCitaData) => {
    try {
      const response = await actualizarDatosCita(citaId, datos);

      if (response.success && response.data) {
        const citaActualizada = response.data.cita;
        setCitas(prevCitas => 
          prevCitas.map(cita => 
            cita._id === citaId ? citaActualizada : cita
          )
        );
        
        if (selectedCita?._id === citaId) {
          setSelectedCita(citaActualizada);
        }

        alert(response.data.message || "Datos actualizados correctamente");
      } else {
        alert(response.message || "Error al actualizar datos");
      }
    } catch (err) {
      console.error("Error al actualizar datos:", err);
      alert("Error al actualizar los datos de la cita");
    }
  };

  const handleActualizarEstado = async (citaId: string, nuevoEstado: 'programada' | 'en_proceso' | 'completada' | 'cancelada') => {
    try {
      const response = await actualizarEstadoCita(citaId, { 
        estado: nuevoEstado,
        ...(nuevoEstado === 'completada' ? { fechaTermino: new Date().toISOString() } : {})
      });

      if (response.success && response.data) {
        // Actualizar la cita en el estado local
        setCitas(prevCitas => 
          prevCitas.map(cita => 
            cita._id === citaId ? response.data! : cita
          )
        );
        
        // Actualizar la cita seleccionada en el modal
        if (selectedCita?._id === citaId) {
          setSelectedCita(response.data);
        }
      } else {
        alert(response.message || "Error al actualizar el estado");
      }
    } catch (err) {
      console.error("Error al actualizar estado:", err);
      alert("Error al actualizar el estado de la cita");
    }
  };

  const handleAsignarIngenieros = async (citaId: string, ingenieroIds: string[]) => {
    try {
      const response = await asignarIngenierosCita(citaId, { ingenieroIds });

      if (response.success && response.data) {
        const citaActualizada = response.data.cita;
        setCitas((prevCitas) =>
          prevCitas.map((cita) =>
            cita._id === citaId ? citaActualizada : cita,
          ),
        );

        if (selectedCita?._id === citaId) {
          setSelectedCita(citaActualizada);
        }

        alert(response.data.message || "Asignación actualizada correctamente");
      } else {
        alert(response.message || "Error al asignar empleados");
      }
    } catch (err) {
      console.error("Error al asignar empleados:", err);
      alert("Error al actualizar la asignación de la cita");
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCita(null);
  };

  const todayDateKey = useMemo(() => formatLocalDateKey(new Date()), []);

  const citasByDate = useMemo(() => {
    const grouped = new Map<string, Cita[]>();
    for (const cita of citas) {
      const { dateKey } = formatLocalDateTime(cita.fechaAgendada);
      if (!dateKey) continue;
      const items = grouped.get(dateKey) ?? [];
      items.push(cita);
      grouped.set(dateKey, items);
    }

    for (const [key, value] of grouped.entries()) {
      value.sort((a, b) => new Date(a.fechaAgendada).getTime() - new Date(b.fechaAgendada).getTime());
      grouped.set(key, value);
    }

    return grouped;
  }, [citas]);

  const selectedDateCitas = useMemo(() => citasByDate.get(selectedDateKey) ?? [], [citasByDate, selectedDateKey]);

  const selectedDateLabel = useMemo(() => {
    const date = new Date(`${selectedDateKey}T00:00:00`);
    if (Number.isNaN(date.getTime())) {
      return "Fecha invalida";
    }

    const formatted = new Intl.DateTimeFormat("es-MX", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(date);
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }, [selectedDateKey]);

  const daysInCurrentMonth = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const total = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: total }, (_, index) => new Date(year, month, index + 1));
  }, [currentMonth]);

  const calendarCells = useMemo(() => {
    const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const startOffset = (firstDay.getDay() + 6) % 7;
    const total = startOffset + daysInCurrentMonth.length;
    const trailing = (7 - (total % 7)) % 7;
    return [
      ...Array.from({ length: startOffset }, () => null),
      ...daysInCurrentMonth,
      ...Array.from({ length: trailing }, () => null),
    ];
  }, [currentMonth, daysInCurrentMonth]);

  const changeMonth = (offset: number) => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  };

  const programadasCount = useMemo(
    () => citas.filter((cita) => cita.estado === "programada").length,
    [citas],
  );

  const enProcesoCount = useMemo(
    () => citas.filter((cita) => cita.estado === "en_proceso").length,
    [citas],
  );

  // Estadísticas
  const sinAsignar = citas.filter((cita) => {
    if (!cita.ingenieroAsignado) return true;
    if (Array.isArray(cita.ingenieroAsignado)) return cita.ingenieroAsignado.length === 0;
    return false;
  }).length;
  const totalCitas = citas.length;

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-200px)] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-accent" />
          <p className="mt-4 text-sm text-secondary">Cargando citas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[calc(100vh-200px)] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <span className="text-2xl">⚠️</span>
          </div>
          <h3 className="mt-4 text-lg font-semibold text-primary">Error al cargar</h3>
          <p className="mt-2 text-sm text-secondary">{error}</p>
          <button
            onClick={cargarDatos}
            className="mt-4 rounded-full bg-accent px-6 py-2 text-sm font-semibold text-white transition hover:bg-accent/90"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-primary">
            Agenda de Citas
          </h1>
          <p className="mt-2 text-sm text-secondary">
            Gestiona las citas de levantamiento
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsCrearCitaModalOpen(true)}
            className="rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-accent/90"
          >
            <Plus className="mr-2 inline-block h-4 w-4" />
            Nueva Cita
          </button>
          <button
            onClick={cargarDatos}
            className="rounded-full bg-gray-200 px-6 py-2.5 text-sm font-semibold text-primary transition hover:bg-gray-300"
          >
            Recargar
          </button>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-secondary">Total</p>
              <p className="mt-1 text-2xl font-bold text-primary">{totalCitas}</p>
            </div>
            <div className="rounded-lg bg-blue-100 p-2">
              <span className="text-xl">📋</span>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-secondary">Programadas</p>
              <p className="mt-1 text-2xl font-bold text-yellow-600">{programadasCount}</p>
            </div>
            <div className="rounded-lg bg-yellow-100 p-2">
              <span className="text-xl">📅</span>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-secondary">En Proceso</p>
              <p className="mt-1 text-2xl font-bold text-blue-600">{enProcesoCount}</p>
            </div>
            <div className="rounded-lg bg-blue-100 p-2">
              <span className="text-xl">🔄</span>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-secondary">Sin Asignar</p>
              <p className="mt-1 text-2xl font-bold text-red-600">{sinAsignar}</p>
            </div>
            <div className="rounded-lg bg-red-100 p-2">
              <Users className="h-5 w-5 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Vista calendario</p>
              <h2 className="mt-1 text-2xl font-semibold text-primary capitalize">
                {currentMonth.toLocaleDateString("es-MX", { month: "long", year: "numeric" })}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => changeMonth(-1)}
                className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-100"
                aria-label="Mes anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1));
                  setSelectedDateKey(formatLocalDateKey(now));
                }}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Hoy
              </button>
              <button
                type="button"
                onClick={() => changeMonth(1)}
                className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-100"
                aria-label="Mes siguiente"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            {WEEK_DAYS.map((day) => (
              <div key={day} className="py-1">{day}</div>
            ))}
          </div>

          <div className="mt-2 grid grid-cols-7 gap-2">
            {calendarCells.map((date, index) => {
              if (!date) {
                return <div key={`empty-${index}`} className="min-h-[115px] rounded-2xl border border-transparent bg-transparent" />;
              }

              const dateKey = formatLocalDateKey(date);
              const isToday = dateKey === todayDateKey;
              const isSelected = dateKey === selectedDateKey;
              const dayItems = citasByDate.get(dateKey) ?? [];

              return (
                <button
                  key={dateKey}
                  type="button"
                  onClick={() => setSelectedDateKey(dateKey)}
                  className={`min-h-[115px] rounded-2xl border p-2 text-left transition ${
                    isSelected
                      ? "border-[#8B1C1C]/40 bg-[#8B1C1C]/5"
                      : dayItems.length > 0
                        ? "border-slate-200 bg-slate-50 hover:bg-slate-100"
                        : "border-slate-100 bg-white hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className={`text-sm font-semibold ${isToday ? "text-[#8B1C1C]" : "text-slate-700"}`}>{date.getDate()}</span>
                    {dayItems.length > 0 ? (
                      <span className="rounded-full bg-[#8B1C1C]/10 px-2 py-0.5 text-[10px] font-semibold text-[#8B1C1C]">
                        {dayItems.length}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-2 space-y-1">
                    {dayItems.slice(0, 2).map((cita) => {
                      const { timeLabel } = formatLocalDateTime(cita.fechaAgendada);
                      return (
                        <div key={cita._id} className="truncate rounded-lg bg-white px-2 py-1 text-[10px] font-medium text-slate-600 shadow-sm">
                          {timeLabel} {cita.nombreCliente}
                        </div>
                      );
                    })}
                    {dayItems.length > 2 ? (
                      <div className="text-[10px] font-semibold text-slate-400">+{dayItems.length - 2} mas</div>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Detalle del dia</p>
              <h3 className="mt-1 text-lg font-semibold text-primary">{selectedDateLabel}</h3>
            </div>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
              {selectedDateCitas.length} cita(s)
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {selectedDateCitas.length > 0 ? (
              selectedDateCitas.map((cita) => {
                const { timeLabel } = formatLocalDateTime(cita.fechaAgendada);
                return (
                  <button
                    key={cita._id}
                    type="button"
                    onClick={() => handleCitaClick(cita)}
                    className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-slate-300 hover:shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-primary">{cita.nombreCliente}</p>
                        <p className="mt-1 text-xs text-secondary">{timeLabel} hrs</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${estadoStyles[cita.estado]}`}>
                        {estadoLabel[cita.estado]}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">{getCitaAssignedLabel(cita)}</p>
                  </button>
                );
              })
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                No hay citas para este dia.
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Modal de Detalles */}
      <CitaModal
        cita={selectedCita}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onActualizarEstado={handleActualizarEstado}
        onActualizarDatos={handleActualizarDatos}
        onAsignarIngenieros={handleAsignarIngenieros}
        empleados={empleados}
      />

      {/* Modal para Crear Nueva Cita */}
      <CrearCitaModal
        isOpen={isCrearCitaModalOpen}
        onClose={() => setIsCrearCitaModalOpen(false)}
        onCitaCreada={() => {
          setIsCrearCitaModalOpen(false);
          cargarDatos();
        }}
      />
    </div>
  );
}
