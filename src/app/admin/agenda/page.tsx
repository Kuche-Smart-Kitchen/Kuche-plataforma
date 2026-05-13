"use client";

import { useEffect, useState } from "react";
import { Plus, Users, Loader2, X, Clock } from "lucide-react";
import KanbanBoard from "@/components/admin/KanbanBoard";
import CitaModal from "@/components/admin/CitaModal";
import { 
  Cita, 
  obtenerTodasLasCitas, 
  asignarIngeniero, 
  actualizarEstadoCita,
  crearCita,
  actualizarCita,
  eliminarCita
} from "@/lib/axios/citasApi";
import { Usuario, listarEmpleados } from "@/lib/axios/usuariosApi";


export default function AgendaPage() {
  const [citas, setCitas] = useState<Cita[]>([]);
  const [empleados, setEmpleados] = useState<Usuario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCita, setSelectedCita] = useState<Cita | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreatingCita, setIsCreatingCita] = useState(false);
  const [editingCitaId, setEditingCitaId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nombreCliente: "",
    correoCliente: "",
    telefonoCliente: "",
    ubicacion: "",
    informacionAdicional: "",
    fecha: "",
    hora: "",
  });

  // Cargar citas y empleados al montar el componente
  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Cargar citas y empleados en paralelo
      const [citasResponse, empleadosResponse] = await Promise.all([
        obtenerTodasLasCitas(),
        listarEmpleados()
      ]);

      if (citasResponse.success && citasResponse.data) {
        setCitas(citasResponse.data);
      } else {
        setError(citasResponse.message || "Error al cargar las citas");
      }

      if (empleadosResponse.success && empleadosResponse.data) {
        setEmpleados(empleadosResponse.data);
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

  const handleMoverCita = async (citaId: string, nuevoEstado: 'programada' | 'en_proceso' | 'completada') => {
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
      } else {
        alert(response.message || "Error al actualizar el estado");
      }
    } catch (err) {
      console.error("Error al mover cita:", err);
      alert("Error al actualizar el estado de la cita");
    }
  };

  const handleAsignarIngeniero = async (citaId: string, ingenieroId: string | null) => {
    try {
      const response = await asignarIngeniero(citaId, { 
        ingenieroId: ingenieroId || undefined 
      });

      if (response.success && response.data) {
        // Actualizar la cita en el estado local
        const citaActualizada = response.data.cita;
        setCitas(prevCitas => 
          prevCitas.map(cita => 
            cita._id === citaId ? citaActualizada : cita
          )
        );
        
        // Actualizar la cita seleccionada en el modal
        if (selectedCita?._id === citaId) {
          setSelectedCita(citaActualizada);
        }

        alert(response.data.message || "Ingeniero asignado correctamente");
      } else {
        alert(response.message || "Error al asignar ingeniero");
      }
    } catch (err) {
      console.error("Error al asignar ingeniero:", err);
      alert("Error al asignar el ingeniero");
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

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCita(null);
  };

  // Obtener las horas deshabilitadas para una fecha específica
  const getDisabledHours = (fecha: string): number[] => {
    const disabledHours = new Set<number>();
    
    citas.forEach(cita => {
      const citaDate = new Date(cita.fechaAgendada).toISOString().split('T')[0];
      if (citaDate === fecha && editingCitaId !== cita._id) {
        const citaHour = new Date(cita.fechaAgendada).getHours();
        // Deshabilitar 1 hora antes, durante y 1 hora después
        disabledHours.add(citaHour - 1);
        disabledHours.add(citaHour);
        disabledHours.add(citaHour + 1);
      }
    });

    return Array.from(disabledHours).sort((a, b) => a - b);
  };

  const openNewCitaModal = () => {
    setEditingCitaId(null);
    setFormData({
      nombreCliente: "",
      correoCliente: "",
      telefonoCliente: "",
      ubicacion: "",
      informacionAdicional: "",
      fecha: new Date().toISOString().split('T')[0],
      hora: "09:00",
    });
    setIsCreatingCita(true);
  };

  const closeNewCitaModal = () => {
    setIsCreatingCita(false);
    setEditingCitaId(null);
    setFormData({
      nombreCliente: "",
      correoCliente: "",
      telefonoCliente: "",
      ubicacion: "",
      informacionAdicional: "",
      fecha: "",
      hora: "",
    });
  };

  const handleSaveCita = async () => {
    if (!formData.nombreCliente.trim() || !formData.correoCliente.trim() || !formData.telefonoCliente.trim() || !formData.fecha || !formData.hora) {
      alert("Por favor completa todos los campos requeridos");
      return;
    }

    try {
      const fechaAgendada = `${formData.fecha}T${formData.hora}:00`;
      
      if (editingCitaId) {
        // Actualizar cita existente
        const response = await actualizarCita(editingCitaId, {
          nombreCliente: formData.nombreCliente.trim(),
          correoCliente: formData.correoCliente.trim(),
          telefonoCliente: formData.telefonoCliente.trim(),
          ubicacion: formData.ubicacion.trim() || undefined,
          informacionAdicional: formData.informacionAdicional.trim(),
          fechaAgendada: new Date(fechaAgendada).toISOString(),
        });

        if (!response.success) {
          alert(response.message || "Error al actualizar la cita");
          return;
        }
      } else {
        // Crear nueva cita
        const response = await crearCita({
          nombreCliente: formData.nombreCliente.trim(),
          correoCliente: formData.correoCliente.trim(),
          telefonoCliente: formData.telefonoCliente.trim(),
          ubicacion: formData.ubicacion.trim() || undefined,
          informacionAdicional: formData.informacionAdicional.trim(),
          fechaAgendada: new Date(fechaAgendada).toISOString(),
        }, "");

        if (!response.success) {
          alert(response.message || "Error al crear la cita");
          return;
        }
      }

      alert(editingCitaId ? "Cita actualizada correctamente" : "Cita creada correctamente");
      closeNewCitaModal();
      await cargarDatos();
    } catch (err) {
      console.error("Error al guardar cita:", err);
      alert("Error al guardar la cita");
    }
  };

  const handleDeleteCita = async () => {
    if (!editingCitaId) return;
    
    if (!confirm("¿Estás seguro de que deseas eliminar esta cita?")) {
      return;
    }

    try {
      const response = await eliminarCita(editingCitaId);
      if (!response.success) {
        alert(response.message || "Error al eliminar la cita");
        return;
      }

      alert("Cita eliminada correctamente");
      closeNewCitaModal();
      await cargarDatos();
    } catch (err) {
      console.error("Error al eliminar cita:", err);
      alert("Error al eliminar la cita");
    }
  };

  // Filtrar citas por estado
  const programadas = citas.filter(cita => cita.estado === 'programada');
  const enProceso = citas.filter(cita => cita.estado === 'en_proceso');
  const completadas = citas.filter(cita => cita.estado === 'completada');

  // Estadísticas
  const sinAsignar = citas.filter(cita => !cita.ingenieroAsignado).length;
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
            Gestiona las citas de levantamiento y asigna ingenieros
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={openNewCitaModal}
            className="rounded-full bg-[#8B1C1C] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#6B1515]"
          >
            <Plus className="mr-2 inline-block h-4 w-4" />
            Agendar Cita
          </button>
          <button
            onClick={cargarDatos}
            className="rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-accent/90"
          >
            <Plus className="mr-2 inline-block h-4 w-4" />
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
              <p className="mt-1 text-2xl font-bold text-yellow-600">{programadas.length}</p>
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
              <p className="mt-1 text-2xl font-bold text-blue-600">{enProceso.length}</p>
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

      {/* Kanban Board */}
      <KanbanBoard
        programadas={programadas}
        enProceso={enProceso}
        completadas={completadas}
        onCitaClick={handleCitaClick}
        onMoverCita={handleMoverCita}
      />

      {/* Modal de Detalles */}
      <CitaModal
        cita={selectedCita}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        empleados={empleados}
        onAsignarIngeniero={handleAsignarIngeniero}
        onActualizarEstado={handleActualizarEstado}
      />

      {/* Modal de Crear/Editar Cita */}
      {isCreatingCita && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-xl">
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white p-6">
              <h2 className="text-xl font-semibold text-primary">
                {editingCitaId ? "Editar Cita" : "Agendar Nueva Cita"}
              </h2>
              <button
                onClick={closeNewCitaModal}
                className="rounded-full p-2 text-secondary transition hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Contenido */}
            <div className="p-6 space-y-4">
              {/* Cliente */}
              <div>
                <label className="block text-xs font-semibold text-secondary mb-2">
                  Nombre del Cliente *
                </label>
                <input
                  type="text"
                  value={formData.nombreCliente}
                  onChange={(e) => setFormData({ ...formData, nombreCliente: e.target.value })}
                  placeholder="Ej. Juan Pérez"
                  className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* Correo */}
              <div>
                <label className="block text-xs font-semibold text-secondary mb-2">
                  Correo Electrónico *
                </label>
                <input
                  type="email"
                  value={formData.correoCliente}
                  onChange={(e) => setFormData({ ...formData, correoCliente: e.target.value })}
                  placeholder="cliente@email.com"
                  className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* Teléfono */}
              <div>
                <label className="block text-xs font-semibold text-secondary mb-2">
                  Teléfono *
                </label>
                <input
                  type="tel"
                  value={formData.telefonoCliente}
                  onChange={(e) => setFormData({ ...formData, telefonoCliente: e.target.value })}
                  placeholder="10 dígitos"
                  className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* Ubicación */}
              <div>
                <label className="block text-xs font-semibold text-secondary mb-2">
                  Ubicación
                </label>
                <textarea
                  value={formData.ubicacion}
                  onChange={(e) => setFormData({ ...formData, ubicacion: e.target.value })}
                  placeholder="Dirección completa"
                  rows={2}
                  className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* Información Adicional */}
              <div>
                <label className="block text-xs font-semibold text-secondary mb-2">
                  Información Adicional
                </label>
                <input
                  type="text"
                  value={formData.informacionAdicional}
                  onChange={(e) => setFormData({ ...formData, informacionAdicional: e.target.value })}
                  placeholder="Ej. Levantamiento / Medidas"
                  className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* Fecha */}
              <div>
                <label className="block text-xs font-semibold text-secondary mb-2">
                  Fecha *
                </label>
                <input
                  type="date"
                  value={formData.fecha}
                  onChange={(e) => setFormData({ ...formData, fecha: e.target.value, hora: "09:00" })}
                  className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* Horas disponibles */}
              {formData.fecha && (
                <div>
                  <label className="block text-xs font-semibold text-secondary mb-3">
                    <Clock className="inline h-3 w-3 mr-1" />
                    Selecciona una hora (9 AM - 5 PM) *
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {Array.from({ length: 9 }, (_, i) => {
                      const hour = 9 + i;
                      const hourStr = String(hour).padStart(2, "0") + ":00";
                      const isDisabled = getDisabledHours(formData.fecha).includes(hour);
                      const isSelected = formData.hora === hourStr;

                      return (
                        <button
                          key={hour}
                          type="button"
                          onClick={() => {
                            if (!isDisabled) {
                              setFormData({ ...formData, hora: hourStr });
                            }
                          }}
                          disabled={isDisabled}
                          className={`py-2 px-3 rounded-lg text-sm font-semibold transition ${
                            isDisabled
                              ? "bg-gray-100 text-gray-400 cursor-not-allowed opacity-50"
                              : isSelected
                              ? "bg-[#8B1C1C] text-white"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                          title={isDisabled ? "Hora no disponible" : ""}
                        >
                          {hour > 12 ? hour - 12 : hour}{hour >= 12 ? " PM" : " AM"}
                        </button>
                      );
                    })}
                  </div>
                  {getDisabledHours(formData.fecha).length > 0 && (
                    <p className="mt-2 text-xs text-orange-600">
                      ⚠️ Las horas deshabilitadas incluyen citas existentes y 1 hora antes/después
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 bg-gray-50 p-6 flex flex-wrap items-center justify-between gap-3">
              {editingCitaId && (
                <button
                  onClick={handleDeleteCita}
                  className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                >
                  Eliminar Cita
                </button>
              )}
              <div className="flex gap-3 ml-auto">
                <button
                  onClick={closeNewCitaModal}
                  className="rounded-lg border border-gray-200 px-6 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-100"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveCita}
                  className="rounded-lg bg-[#8B1C1C] px-6 py-2 text-sm font-semibold text-white transition hover:bg-[#6B1515]"
                >
                  {editingCitaId ? "Actualizar" : "Crear"} Cita
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
