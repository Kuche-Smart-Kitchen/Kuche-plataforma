"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState, useEffect } from "react";
import { 
  X, 
  Calendar, 
  MapPin, 
  User, 
  Phone, 
  Mail, 
  Clock,
  FileText,
  CheckCircle2,
  AlertCircle,
  Save,
  Edit2,
  Users,
} from "lucide-react";
import { Cita, ActualizarDatosCitaData } from "@/lib/axios/citasApi";
import type { Usuario } from "@/lib/axios/usuariosApi";

interface CitaModalProps {
  cita: Cita | null;
  isOpen: boolean;
  onClose: () => void;
  onActualizarEstado?: (citaId: string, nuevoEstado: 'programada' | 'en_proceso' | 'completada' | 'cancelada') => Promise<void>;
  onActualizarDatos?: (citaId: string, datos: ActualizarDatosCitaData) => Promise<void>;
  onAsignarIngenieros?: (citaId: string, ingenieroIds: string[]) => Promise<void>;
  empleados?: Usuario[];
}

export default function CitaModal({ 
  cita, 
  isOpen, 
  onClose, 
  onActualizarEstado,
  onActualizarDatos,
  onAsignarIngenieros,
  empleados = [],
}: CitaModalProps) {
  const [isUpdatingEstado, setIsUpdatingEstado] = useState(false);
  const [isEditingDatos, setIsEditingDatos] = useState(false);
  const [isSavingDatos, setIsSavingDatos] = useState(false);
  const [isSavingAsignacion, setIsSavingAsignacion] = useState(false);

  // Formulario de edición de datos
  const [datosForm, setDatosForm] = useState({
    nombreCliente: "",
    correoCliente: "",
    telefonoCliente: "",
    ubicacion: "",
    informacionAdicional: ""
  });
  const [ingenieroIdsForm, setIngenieroIdsForm] = useState<string[]>([]);

  useEffect(() => {
    if (cita) {
      // Cargar datos del formulario
      setDatosForm({
        nombreCliente: cita.nombreCliente || "",
        correoCliente: cita.correoCliente || "",
        telefonoCliente: cita.telefonoCliente || "",
        ubicacion: cita.ubicacion || "",
        informacionAdicional: cita.informacionAdicional || ""
      });
      const assigned = Array.isArray(cita.ingenieroAsignado)
        ? cita.ingenieroAsignado
        : cita.ingenieroAsignado
          ? [cita.ingenieroAsignado]
          : [];

      setIngenieroIdsForm(
        assigned
          .map((item) => (typeof item === "string" ? item : item._id))
          .filter((item): item is string => Boolean(item && item.trim().length > 0)),
      );
    }
  }, [cita]);

  if (!cita) return null;

  const handleGuardarDatos = async () => {
    if (!onActualizarDatos) return;
    
    // Validar que hay cambios
    const cambios: ActualizarDatosCitaData = {};
    if (datosForm.nombreCliente !== cita.nombreCliente) cambios.nombreCliente = datosForm.nombreCliente;
    if (datosForm.correoCliente !== cita.correoCliente) cambios.correoCliente = datosForm.correoCliente;
    if (datosForm.telefonoCliente !== cita.telefonoCliente) cambios.telefonoCliente = datosForm.telefonoCliente;
    if (datosForm.ubicacion !== cita.ubicacion) cambios.ubicacion = datosForm.ubicacion;
    if (datosForm.informacionAdicional !== cita.informacionAdicional) cambios.informacionAdicional = datosForm.informacionAdicional;

    if (Object.keys(cambios).length === 0) {
      setIsEditingDatos(false);
      return;
    }

    setIsSavingDatos(true);
    try {
      await onActualizarDatos(cita._id, cambios);
      setIsEditingDatos(false);
    } catch (error) {
      console.error("Error al guardar datos:", error);
    } finally {
      setIsSavingDatos(false);
    }
  };

  const handleCambiarEstado = async (nuevoEstado: 'programada' | 'en_proceso' | 'completada' | 'cancelada') => {
    if (!onActualizarEstado) return;
    setIsUpdatingEstado(true);
    try {
      await onActualizarEstado(cita._id, nuevoEstado);
    } catch (error) {
      console.error("Error al actualizar estado:", error);
    } finally {
      setIsUpdatingEstado(false);
    }
  };

  const handleGuardarAsignacion = async () => {
    if (!onAsignarIngenieros) return;

    const idsSeleccionados = ingenieroIdsForm.filter((id) => id.trim().length > 0);
    const idsActuales = Array.isArray(cita.ingenieroAsignado)
      ? cita.ingenieroAsignado
      : cita.ingenieroAsignado
        ? [cita.ingenieroAsignado]
        : [];
    const idsActualesNormalizados = idsActuales
      .map((item) => (typeof item === "string" ? item : item._id))
      .filter((item): item is string => Boolean(item && item.trim().length > 0));

    const cambios =
      idsSeleccionados.length !== idsActualesNormalizados.length ||
      idsSeleccionados.some((id, index) => id !== idsActualesNormalizados[index]);

    if (!cambios) return;

    setIsSavingAsignacion(true);
    try {
      await onAsignarIngenieros(cita._id, idsSeleccionados);
    } catch (error) {
      console.error("Error al guardar asignación:", error);
    } finally {
      setIsSavingAsignacion(false);
    }
  };

  const getNombreEmpleado = (id: string) => {
    const empleado = empleados.find((item) => item._id === id);
    return empleado?.nombre || id;
  };

  const ingenierosAsignados = ingenieroIdsForm.length > 0
    ? ingenieroIdsForm.map(getNombreEmpleado)
    : [];

  const formatearFechaCompleta = (fecha: string) => {
    const date = new Date(fecha);
    return date.toLocaleDateString('es-MX', { 
      weekday: 'long',
      day: 'numeric', 
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'programada': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'en_proceso': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'completada': return 'bg-green-100 text-green-700 border-green-200';
      case 'cancelada': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getEstadoTexto = (estado: string) => {
    switch (estado) {
      case 'programada': return 'Programada';
      case 'en_proceso': return 'En Proceso';
      case 'completada': return 'Completada';
      case 'cancelada': return 'Cancelada';
      default: return estado;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-xl"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-gray-200 bg-white p-6 rounded-t-2xl">
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-primary">
                  Detalles de la Cita
                </h2>
                <p className="mt-1 text-sm text-secondary">
                  ID: {cita._id.slice(-8).toUpperCase()}
                </p>
              </div>
              <button
                onClick={onClose}
                className="rounded-full p-2 text-secondary transition hover:bg-gray-100 hover:text-primary"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Contenido */}
            <div className="p-6 space-y-6">
              {/* Estado */}
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium ${getEstadoColor(cita.estado)}`}>
                  {cita.estado === 'completada' ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  {getEstadoTexto(cita.estado)}
                </span>
              </div>

              {/* Información del Cliente - Con edición */}
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
                    <User className="h-4 w-4 text-accent" />
                    Información del Cliente
                  </h3>
                  {!isEditingDatos && (
                    <button
                      onClick={() => setIsEditingDatos(true)}
                      className="flex items-center gap-1 text-xs text-accent hover:text-accent/80 transition"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      Editar
                    </button>
                  )}
                </div>

                {isEditingDatos ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-secondary mb-1">Nombre completo</label>
                      <input
                        type="text"
                        value={datosForm.nombreCliente}
                        onChange={(e) => setDatosForm({...datosForm, nombreCliente: e.target.value})}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-secondary mb-1">Correo electrónico</label>
                      <input
                        type="email"
                        value={datosForm.correoCliente}
                        onChange={(e) => setDatosForm({...datosForm, correoCliente: e.target.value})}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-secondary mb-1">Teléfono</label>
                      <input
                        type="tel"
                        value={datosForm.telefonoCliente}
                        onChange={(e) => setDatosForm({...datosForm, telefonoCliente: e.target.value})}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-secondary mb-1">Ubicación</label>
                      <input
                        type="text"
                        value={datosForm.ubicacion}
                        onChange={(e) => setDatosForm({...datosForm, ubicacion: e.target.value})}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-secondary mb-1">Información adicional</label>
                      <textarea
                        value={datosForm.informacionAdicional}
                        onChange={(e) => setDatosForm({...datosForm, informacionAdicional: e.target.value})}
                        rows={3}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleGuardarDatos}
                        disabled={isSavingDatos}
                        className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent/90 disabled:opacity-50"
                      >
                        {isSavingDatos ? (
                          <>
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            Guardando...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4" />
                            Guardar
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => setIsEditingDatos(false)}
                        className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-secondary transition hover:border-gray-400"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-secondary">Nombre completo</p>
                      <p className="mt-1 text-sm font-medium text-primary">{datosForm.nombreCliente}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-secondary">Teléfono</p>
                        <div className="mt-1 flex items-center gap-2">
                          <Phone className="h-3 w-3 text-secondary" />
                          <p className="text-sm font-medium text-primary">{datosForm.telefonoCliente}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-secondary">Correo electrónico</p>
                        <div className="mt-1 flex items-center gap-2">
                          <Mail className="h-3 w-3 text-secondary" />
                          <p className="text-sm font-medium text-primary truncate">{datosForm.correoCliente}</p>
                        </div>
                      </div>
                    </div>
                    {datosForm.ubicacion && (
                      <div>
                        <p className="text-xs text-secondary">Ubicación</p>
                        <div className="mt-1 flex items-start gap-2">
                          <MapPin className="h-3 w-3 text-secondary mt-0.5 flex-shrink-0" />
                          <p className="text-sm font-medium text-primary">{datosForm.ubicacion}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Fechas */}
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <h3 className="mb-3 text-sm font-semibold text-primary flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-accent" />
                  Fechas
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-secondary">Fecha agendada</p>
                    <p className="mt-1 text-sm font-medium text-primary capitalize">
                      {formatearFechaCompleta(cita.fechaAgendada)}
                    </p>
                  </div>
                  {cita.fechaInicio && (
                    <div>
                      <p className="text-xs text-secondary">Fecha de inicio</p>
                      <p className="mt-1 text-sm font-medium text-primary capitalize">
                        {formatearFechaCompleta(cita.fechaInicio)}
                      </p>
                    </div>
                  )}
                  {cita.fechaTermino && (
                    <div>
                      <p className="text-xs text-secondary">Fecha de término</p>
                      <p className="mt-1 text-sm font-medium text-primary capitalize">
                        {formatearFechaCompleta(cita.fechaTermino)}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-secondary">Creada el</p>
                    <p className="mt-1 text-sm font-medium text-primary capitalize">
                      {formatearFechaCompleta(cita.createdAt)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Asignación de empleados */}
              {onAsignarIngenieros && (
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <h3 className="mb-3 text-sm font-semibold text-primary flex items-center gap-2">
                    <Users className="h-4 w-4 text-accent" />
                    Asignación de empleados
                  </h3>

                  {empleados.length > 0 ? (
                    <div className="space-y-3">
                      <div className="max-h-52 space-y-2 overflow-y-auto rounded-lg border border-gray-200 bg-white p-3">
                        {empleados.map((empleado) => {
                          const checked = ingenieroIdsForm.includes(empleado._id);

                          return (
                            <label
                              key={empleado._id}
                              className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm transition hover:bg-gray-50"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(event) => {
                                  setIngenieroIdsForm((current) =>
                                    event.target.checked
                                      ? Array.from(new Set([...current, empleado._id]))
                                      : current.filter((id) => id !== empleado._id),
                                  );
                                }}
                                className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent"
                              />
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-primary">{empleado.nombre}</p>
                                <p className="text-xs text-secondary truncate">{empleado.correo}</p>
                              </div>
                            </label>
                          );
                        })}
                      </div>

                      <div>
                        <p className="text-xs text-secondary">Seleccionados</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {ingenierosAsignados.length > 0 ? (
                            ingenierosAsignados.map((nombre, index) => (
                              <span
                                key={`${nombre}-${index}`}
                                className="inline-flex items-center rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent"
                              >
                                {nombre}
                              </span>
                            ))
                          ) : (
                            <span className="text-sm text-secondary">Sin asignar</span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={handleGuardarAsignacion}
                        disabled={isSavingAsignacion}
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent/90 disabled:opacity-50"
                      >
                        {isSavingAsignacion ? (
                          <>
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            Guardando asignación...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4" />
                            Guardar asignación
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-secondary">
                      No hay empleados disponibles para asignar.
                    </p>
                  )}
                </div>
              )}

              {/* Especificaciones */}
              {(cita.especificacionesInicio?.medidas || 
                cita.especificacionesInicio?.estilo || 
                cita.especificacionesInicio?.especificaciones ||
                cita.especificacionesInicio?.materialesPreferidos?.length) && (
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <h3 className="mb-3 text-sm font-semibold text-primary flex items-center gap-2">
                    <FileText className="h-4 w-4 text-accent" />
                    Especificaciones
                  </h3>
                  <div className="space-y-3">
                    {cita.especificacionesInicio.medidas && (
                      <div>
                        <p className="text-xs text-secondary">Medidas</p>
                        <p className="mt-1 text-sm font-medium text-primary">
                          {cita.especificacionesInicio.medidas}
                        </p>
                      </div>
                    )}
                    {cita.especificacionesInicio.estilo && (
                      <div>
                        <p className="text-xs text-secondary">Estilo</p>
                        <p className="mt-1 text-sm font-medium text-primary">
                          {cita.especificacionesInicio.estilo}
                        </p>
                      </div>
                    )}
                    {cita.especificacionesInicio.especificaciones && (
                      <div>
                        <p className="text-xs text-secondary">Detalles</p>
                        <p className="mt-1 text-sm font-medium text-primary">
                          {cita.especificacionesInicio.especificaciones}
                        </p>
                      </div>
                    )}
                    {cita.especificacionesInicio.materialesPreferidos && 
                     cita.especificacionesInicio.materialesPreferidos.length > 0 && (
                      <div>
                        <p className="text-xs text-secondary">Materiales preferidos</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {cita.especificacionesInicio.materialesPreferidos.map((material, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent"
                            >
                              {material}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 border-t border-gray-200 bg-white px-6 py-4 rounded-b-2xl space-y-3">
              {/* Botones de cambio de estado */}
              {onActualizarEstado && (
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleCambiarEstado('programada')}
                    disabled={isUpdatingEstado || cita.estado === 'programada'}
                    className="flex items-center justify-center gap-1.5 rounded-lg bg-yellow-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Clock className="h-3.5 w-3.5" />
                    Programada
                  </button>
                  <button
                    onClick={() => handleCambiarEstado('en_proceso')}
                    disabled={isUpdatingEstado || cita.estado === 'en_proceso'}
                    className="flex items-center justify-center gap-1.5 rounded-lg bg-blue-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <AlertCircle className="h-3.5 w-3.5" />
                    En Proceso
                  </button>
                  <button
                    onClick={() => handleCambiarEstado('completada')}
                    disabled={isUpdatingEstado || cita.estado === 'completada'}
                    className="flex items-center justify-center gap-1.5 rounded-lg bg-green-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Completada
                  </button>
                </div>
              )}
              
              <button
                onClick={onClose}
                className="w-full rounded-full bg-gray-100 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-200"
              >
                Cerrar
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
