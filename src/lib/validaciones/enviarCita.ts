import { crearCita } from "@/lib/axios/citasApi";
import type { CitaCreate } from "@/lib/axios/citasApi";

export interface EnviarCitaPayload {
  nombreCliente: string;
  correoCliente: string;
  telefonoCliente: string;
  fechaAgendada: Date;
  horaAgendada: string;
  ubicacion: string;
  informacionAdicional?: string;
  captchaToken: string;
}

export interface EnviarCitaResponse {
  success: boolean;
  message: string;
  citaId?: string;
}

/**
 * Convertir payload de formulario a formato ISO y llamar al API
 */
export const enviarCita = async (
  payload: EnviarCitaPayload
): Promise<EnviarCitaResponse> => {
  try {
    // Validar campos requeridos
    if (!payload.nombreCliente?.trim()) {
      return {
        success: false,
        message: "Nombre del cliente es requerido",
      };
    }

    if (!payload.correoCliente?.trim()) {
      return {
        success: false,
        message: "Correo del cliente es requerido",
      };
    }

    if (!payload.telefonoCliente?.trim()) {
      return {
        success: false,
        message: "Teléfono del cliente es requerido",
      };
    }

    if (!payload.captchaToken) {
      return {
        success: false,
        message: "Token de CAPTCHA es requerido",
      };
    }

    // Combinar fecha y hora en ISO string
    const fechaHoraString = `${payload.fechaAgendada.toISOString().split('T')[0]}T${payload.horaAgendada}:00`;
    const fechaAgendada = new Date(fechaHoraString).toISOString();

    // Preparar datos para el API
    const citaData: CitaCreate = {
      nombreCliente: payload.nombreCliente,
      correoCliente: payload.correoCliente,
      telefonoCliente: payload.telefonoCliente,
      fechaAgendada,
      ubicacion: payload.ubicacion || undefined,
      informacionAdicional: payload.informacionAdicional || undefined,
    };

    // Llamar al API
    const response = await crearCita(citaData, payload.captchaToken);

    if (response.success && response.data) {
      return {
        success: true,
        message: "Cita registrada correctamente",
        citaId: response.data._id,
      };
    } else {
      return {
        success: false,
        message: response.message || "Error al registrar la cita",
      };
    }
  } catch (error) {
    console.error("Error al enviar cita:", error);
    return {
      success: false,
      message: "Error al conectar con el servidor",
    };
  }
};
