"use client";

import { useEffect, useState } from "react";
import { Plus, Users, Loader2 } from "lucide-react";
import KanbanBoard from "@/components/admin/KanbanBoard";
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


export default function AgendaPage() {
  const [citas, setCitas] = useState<Cita[]>([]);
  const [empleados, setEmpleados] = useState<Usuario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCita, setSelectedCita] = useState<Cita | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCrearCitaModalOpen, setIsCrearCitaModalOpen] = useState(false);

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

  // Filtrar citas por estado
  const programadas = citas.filter(cita => cita.estado === 'programada');
  const enProceso = citas.filter(cita => cita.estado === 'en_proceso');
  const completadas = citas.filter(cita => cita.estado === 'completada');

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
