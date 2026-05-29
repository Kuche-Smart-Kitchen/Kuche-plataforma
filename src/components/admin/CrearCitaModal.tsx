"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState, useEffect } from "react";
import { X, Calendar, MapPin, User, Phone, Mail, AlertCircle, Loader2 } from "lucide-react";
import { crearCita, CitaCreate } from "@/lib/axios/citasApi";
import { renderTurnstile, obtenerTokenTurnstile, resetTurnstile, isTurnstileAvailable } from "@/lib/recaptcha";

interface CrearCitaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCitaCreada?: () => void;
}

export default function CrearCitaModal({ isOpen, onClose, onCitaCreada }: CrearCitaModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    nombreCliente: "",
    correoCliente: "",
    telefonoCliente: "",
    fechaAgendada: "",
    horaAgendada: "",
    ubicacion: "",
    informacionAdicional: "",
  });

  // Renderizar widget de Turnstile cuando el modal se abre
  useEffect(() => {
    if (isOpen && isTurnstileAvailable()) {
      renderTurnstile("turnstile-container");
    }
  }, [isOpen]);

  /**
   * Obtener la fecha mínima que se puede seleccionar (mañana a las 9:00 AM)
   */
  const getMinDate = (): string => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    return tomorrow.toISOString().split('T')[0];
  };

  /**
   * Obtener la hora mínima según la fecha seleccionada
   */
  const getMinHour = (): string => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const selectedDate = new Date(`${formData.fechaAgendada}T00:00:00`);
    selectedDate.setHours(0, 0, 0, 0);

    // Si la fecha seleccionada es hoy, calcular la hora mínima considerando la anticipación de 1 hora
    if (selectedDate.getTime() === today.getTime()) {
      const now = new Date();
      now.setHours(now.getHours() + 1, 0, 0, 0);
      const hours = String(now.getHours()).padStart(2, '0');
      return `${hours}:00`;
    }

    // Para otros días, la hora mínima es 09:00
    return "09:00";
  };

  /**
   * Generar array de horas disponibles para la fecha seleccionada
   */
  const getHorasDisponibles = (): string[] => {
    if (!formData.fechaAgendada) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const selectedDate = new Date(`${formData.fechaAgendada}T00:00:00`);
    selectedDate.setHours(0, 0, 0, 0);

    const horas: string[] = [];
    const now = new Date();

    // Rango de 9:00 a 18:00
    for (let hour = 9; hour < 18; hour++) {
      const horaStr = String(hour).padStart(2, '0');
      const horaValida = `${horaStr}:00`;

      // Si es hoy, verificar que sea al menos 1 hora desde ahora
      if (selectedDate.getTime() === today.getTime()) {
        const horaActual = now.getHours() + 1; // +1 hora de anticipación
        if (hour >= horaActual) {
          horas.push(horaValida);
        }
      } else {
        // Para otros días, todas las horas de 9-17 son válidas
        horas.push(horaValida);
      }
    }

    return horas;
  };

  /**
   * Validar que la fecha y hora sean válidas
   */
  const validateDateTime = (): string | null => {
    if (!formData.fechaAgendada) {
      return "La fecha de la cita es requerida";
    }

    if (!formData.horaAgendada) {
      return "La hora de la cita es requerida";
    }

    const now = new Date();
    const selectedDateTime = new Date(`${formData.fechaAgendada}T${formData.horaAgendada}:00`);

    // Verificar que sea futura (al menos 1 hora desde ahora)
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    if (selectedDateTime <= oneHourFromNow) {
      return "La cita debe ser con al menos 1 hora de anticipación";
    }

    // Verificar que sea lunes-viernes
    const dayOfWeek = selectedDateTime.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      const days = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
      return `Las citas solo pueden agendarse de lunes a viernes (seleccionaste ${days[dayOfWeek]})`;
    }

    // Verificar horario 9-18
    const hours = selectedDateTime.getHours();
    if (hours < 9 || hours >= 18) {
      return "Las citas solo pueden agendarse entre las 9:00 AM y las 6:00 PM";
    }

    return null;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = {
        ...prev,
        [name]: value
      };
      
      // Si cambia la fecha, limpiar la hora para evitar confusión
      if (name === "fechaAgendada") {
        updated.horaAgendada = "";
      }
      
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Validar que Turnstile esté disponible
      if (!isTurnstileAvailable()) {
        setError("Cloudflare Turnstile no está disponible. Por favor, recarga la página.");
        setIsLoading(false);
        return;
      }

      // Validar campos requeridos
      if (!formData.nombreCliente.trim()) {
        setError("El nombre del cliente es requerido");
        setIsLoading(false);
        return;
      }

      if (!formData.correoCliente.trim()) {
        setError("El correo del cliente es requerido");
        setIsLoading(false);
        return;
      }

      if (!formData.telefonoCliente.trim()) {
        setError("El teléfono del cliente es requerido");
        setIsLoading(false);
        return;
      }

      // Validar fecha y hora
      const dateTimeError = validateDateTime();
      if (dateTimeError) {
        setError(dateTimeError);
        setIsLoading(false);
        return;
      }

      // Obtener token de Turnstile
      const captchaToken = obtenerTokenTurnstile("turnstile-container");
      if (!captchaToken) {
        setError("Por favor, completa la verificación de Turnstile.");
        setIsLoading(false);
        return;
      }

      // Combinar fecha y hora
      const fechaHoraString = `${formData.fechaAgendada}T${formData.horaAgendada}:00`;
      const fechaAgendada = new Date(fechaHoraString).toISOString();

      const citaData: CitaCreate = {
        nombreCliente: formData.nombreCliente,
        correoCliente: formData.correoCliente,
        telefonoCliente: formData.telefonoCliente,
        fechaAgendada,
        ubicacion: formData.ubicacion || undefined,
        informacionAdicional: formData.informacionAdicional || undefined,
      };

      const response = await crearCita(citaData, captchaToken);

      if (response.success) {
        // Limpiar formulario
        setFormData({
          nombreCliente: "",
          correoCliente: "",
          telefonoCliente: "",
          fechaAgendada: "",
          horaAgendada: "",
          ubicacion: "",
          informacionAdicional: "",
        });
        
        // Resetear Turnstile
        resetTurnstile("turnstile-container");
        
        // Cerrar modal y notificar
        onClose();
        if (onCitaCreada) {
          onCitaCreada();
        }
      } else {
        setError(response.message || "Error al crear la cita");
      }
    } catch (err) {
      console.error("Error al crear cita:", err);
      setError("Error al crear la cita. Por favor, intenta de nuevo.");
    } finally {
      setIsLoading(false);
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
              <div>
                <h2 className="text-xl font-semibold text-primary">Nueva Cita</h2>
                <p className="mt-1 text-sm text-secondary">
                  Completa los datos para agendar una nueva cita
                </p>
              </div>
              <button
                onClick={onClose}
                disabled={isLoading}
                className="rounded-full p-2 text-secondary transition hover:bg-gray-100 hover:text-primary disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Contenido */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Error Message */}
              {error && (
                <div className="flex gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {/* Información del Cliente */}
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <h3 className="mb-4 text-sm font-semibold text-primary flex items-center gap-2">
                  <User className="h-4 w-4 text-accent" />
                  Información del Cliente
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-secondary">
                      Nombre completo *
                    </label>
                    <input
                      type="text"
                      name="nombreCliente"
                      value={formData.nombreCliente}
                      onChange={handleChange}
                      placeholder="Juan Pérez"
                      disabled={isLoading}
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-1 focus:ring-accent disabled:bg-gray-100"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-secondary">
                        Correo electrónico *
                      </label>
                      <input
                        type="email"
                        name="correoCliente"
                        value={formData.correoCliente}
                        onChange={handleChange}
                        placeholder="juan@example.com"
                        disabled={isLoading}
                        className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-1 focus:ring-accent disabled:bg-gray-100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-secondary">
                        Teléfono *
                      </label>
                      <input
                        type="tel"
                        name="telefonoCliente"
                        value={formData.telefonoCliente}
                        onChange={handleChange}
                        placeholder="+1 234 567 8900"
                        disabled={isLoading}
                        className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-1 focus:ring-accent disabled:bg-gray-100"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Detalles de la Cita */}
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <h3 className="mb-4 text-sm font-semibold text-primary flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-accent" />
                  Detalles de la Cita
                </h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-secondary">
                        Fecha *
                      </label>
                      <input
                        type="date"
                        name="fechaAgendada"
                        value={formData.fechaAgendada}
                        onChange={handleChange}
                        min={getMinDate()}
                        disabled={isLoading}
                        className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-1 focus:ring-accent disabled:bg-gray-100"
                      />
                      <p className="mt-1 text-xs text-secondary">Mínimo: mañana</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-secondary">
                        Hora *
                      </label>
                      <select
                        name="horaAgendada"
                        value={formData.horaAgendada}
                        onChange={handleChange}
                        disabled={isLoading || !formData.fechaAgendada}
                        className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-1 focus:ring-accent disabled:bg-gray-100"
                      >
                        <option value="">
                          {formData.fechaAgendada ? "Selecciona una hora" : "Selecciona fecha primero"}
                        </option>
                        {getHorasDisponibles().map((hora) => (
                          <option key={hora} value={hora}>
                            {hora}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-secondary">
                        {formData.fechaAgendada && getHorasDisponibles().length === 0
                          ? "No hay horas disponibles para este día"
                          : formData.fechaAgendada
                            ? `${getHorasDisponibles().length} horarios disponibles`
                            : ""}
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-secondary">
                      Ubicación
                    </label>
                    <input
                      type="text"
                      name="ubicacion"
                      value={formData.ubicacion}
                      onChange={handleChange}
                      placeholder="Dirección del cliente"
                      disabled={isLoading}
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-1 focus:ring-accent disabled:bg-gray-100"
                    />
                  </div>
                </div>
              </div>

              {/* Información Adicional */}
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <h3 className="mb-4 text-sm font-semibold text-primary flex items-center gap-2">
                  <Mail className="h-4 w-4 text-accent" />
                  Información Adicional
                </h3>
                <div>
                  <label className="block text-xs font-medium text-secondary">
                    Notas
                  </label>
                  <textarea
                    name="informacionAdicional"
                    value={formData.informacionAdicional}
                    onChange={handleChange}
                    placeholder="Cualquier información adicional sobre la cita..."
                    disabled={isLoading}
                    rows={3}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-1 focus:ring-accent disabled:bg-gray-100"
                  />
                </div>
              </div>

              {/* Cloudflare Turnstile */}
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <h3 className="mb-4 text-sm font-semibold text-primary">
                  Verificación de Seguridad
                </h3>
                <div
                  id="turnstile-container"
                  className="flex justify-center"
                />
              </div>

              {/* Botones */}
              <div className="flex gap-3 border-t border-gray-200 pt-6">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isLoading}
                  className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-primary transition hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent/90 disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creando...
                    </>
                  ) : (
                    <>
                      <Calendar className="h-4 w-4" />
                      Crear Cita
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
