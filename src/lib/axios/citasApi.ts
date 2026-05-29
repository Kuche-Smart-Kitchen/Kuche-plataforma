/**
 * API de Citas
 * Endpoints para gestión de citas de levantamiento
 */

import axiosInstance, { ApiResponse } from './axiosConfig';

let allCitasRequest: Promise<ApiResponse<Cita[]>> | null = null;

// Tipos de datos para Citas
export interface ClienteCita {
  nombre: string;
  correo: string;
  telefono: string;
  clienteId?: string;
  clienteRef?: string;
}

export interface EspecificacionesInicio {
  medidas?: string;
  estilo?: string;
  especificaciones?: string;
  materialesPreferidos?: string[];
}

export interface CitaCreate {
  fechaAgendada: Date | string | number;
  nombreCliente: string;
  correoCliente: string;
  telefonoCliente: string;
  clienteId?: string;
  clienteRef?: string;
  ubicacion?: string;
  diseno?: string;
  informacionAdicional?: string;
}

export interface Cita {
  _id: string;
  fechaAgendada: string;
  fechaInicio?: string;
  fechaTermino?: string;
  nombreCliente: string;
  correoCliente: string;
  telefonoCliente: string;
  clienteId?: string;
  clienteRef?: string;
  cliente?: ClienteCita;
  ubicacion?: string;
  diseno?: {
    _id: string;
    nombre: string;
    descripcion?: string;
    imagenes?: string[];
  };
  informacionAdicional?: string;
  estado: 'programada' | 'en_proceso' | 'completada' | 'cancelada';
  ingenieroAsignado?: {
    _id: string;
    nombre: string;
    correo: string;
    telefono?: string;
    rol: string;
  } | string | ({
    _id: string;
    nombre: string;
    correo: string;
    telefono?: string;
    rol: string;
  } | string)[];
  especificacionesInicio: EspecificacionesInicio;
  createdAt: string;
  updatedAt: string;
}

export interface CitaUpdate {
  fechaAgendada?: Date | string | number;
  fechaInicio?: Date | string | number;
  fechaTermino?: Date | string | number;
  nombreCliente?: string;
  correoCliente?: string;
  telefonoCliente?: string;
  ubicacion?: string;
  mapsUrl?: string;
  informacionAdicional?: string;
  estado?: 'programada' | 'en_proceso' | 'completada' | 'cancelada';
  diseno?: string;
  ingenieroAsignado?: string;
}

/**
 * Interfaz para actualizar datos de la cita
 */
export interface ActualizarDatosCitaData {
  nombreCliente?: string;
  correoCliente?: string;
  telefonoCliente?: string;
  ubicacion?: string;
  mapsUrl?: string;
  informacionAdicional?: string;
}

export interface AsignarIngenierosCitaData {
  ingenieroIds: string[];
}

export interface IniciarCitaData {
  medidas?: string;
  estilo?: string;
  especificaciones?: string;
  materialesPreferidos?: string[];
}

export interface FinalizarCitaData {
  ingenieroId?: string;
  fechaEstimadaFinalizacion?: Date | string;
  notasInternas?: string;
}

export interface ActualizarEstadoData {
  estado: 'programada' | 'en_proceso' | 'completada' | 'cancelada';
  fechaTermino?: Date | string;
}

/**
 * Interfaz para horario ocupado de cita pública
 * Solo contiene fecha y hora, sin información del cliente
 */
export interface HorarioOcupadoPublico {
  fecha: string; // Formato "YYYY-MM-DD"
  hora: string;  // Formato "HH:00"
}

export interface HorarioOcupado {
  hora: string; // Formato "HH:mm"
}

export interface DisponibilidadDia {
  fecha: string; // Fecha en formato ISO
  horariosOcupados: string[]; // Array de horas ocupadas en formato "HH:mm"
}

/**
 * Obtener horarios ocupados de un día específico (PÚBLICA - No requiere autenticación)
 * Solo devuelve las horas ocupadas, sin información sensible del cliente
 */
export const obtenerDisponibilidadDia = async (fecha: string): Promise<ApiResponse<DisponibilidadDia>> => {
  try {
    const response = await axiosInstance.get('/api/citas/disponibilidad', {
      params: { fecha },
      skipAuthToken: true,
    } as any);
    
    // Si la respuesta tiene la estructura esperada
    if (response.data && 'horariosOcupados' in response.data) {
      return {
        success: true,
        data: response.data
      };
    }
    
    // Si ya viene con el formato ApiResponse
    return response.data;
  } catch (error) {
    console.error('Error en obtenerDisponibilidadDia:', error);
    return {
      success: false,
      message: 'Error al obtener disponibilidad',
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
};

/**
 * Obtener TODOS los horarios ocupados (PÚBLICA - No requiere autenticación)
 * Devuelve SOLO fecha y hora de todas las citas sin información sensible
 * Endpoint: GET /api/citas/horarios-ocupados
 */
export const obtenerHorariosOcupados = async (): Promise<ApiResponse<HorarioOcupadoPublico[]>> => {
  try {
    const response = await axiosInstance.get('/api/citas/horarios-ocupados', {
      skipAuthToken: true,
    } as any);
    
    // Si la respuesta es directamente un array (respuesta del backend)
    if (Array.isArray(response.data)) {
      return {
        success: true,
        data: response.data
      };
    }
    
    // Si ya viene con el formato ApiResponse
    return response.data;
  } catch (error) {
    console.error('Error en obtenerHorariosOcupados:', error);
    // Retornar respuesta de error en formato correcto
    return {
      success: false,
      message: 'Error al obtener horarios ocupados',
      error: error instanceof Error ? error.message : 'Error desconocido'
    } as ApiResponse<HorarioOcupadoPublico[]>;
  }
};

/**
 * Crear nueva cita (PÚBLICA - No requiere autenticación)
 * @param data - Datos de la cita a crear
 * @param captchaToken - Token reCAPTCHA para validación de seguridad
 */
export const crearCita = async (
  data: CitaCreate,
  captchaToken: string = ''
): Promise<ApiResponse<Cita> & { citasOcupadas?: string[] }> => {
  try {
    const response = await axiosInstance.post<ApiResponse<Cita> | Cita>(
      '/api/citas/agregarCita',
      data,
      {
        headers: {
          'captcha-token': captchaToken,
        },
        skipAuthToken: true,
      } as any
    );

    // Si la respuesta es un objeto con estructura ApiResponse
    if ('success' in response.data) {
      return response.data as ApiResponse<Cita>;
    }

    // Si el backend devuelve directamente la Cita (objeto sin estructura ApiResponse)
    if (response.data && '_id' in response.data) {
      return {
        success: true,
        data: response.data as Cita,
        message: 'Cita creada exitosamente',
      };
    }

    // Si es un array o estructura inesperada
    return {
      success: true,
      data: response.data as Cita,
      message: 'Cita creada exitosamente',
    };
  } catch (error: any) {
    console.error('Error en crearCita:', error);

    // Si el backend devolvió un error con mensaje
    if (error.response?.data) {
      const errorData = error.response.data;
      return {
        success: false,
        message: errorData.message || 'Error al crear la cita',
        error: errorData.error || 'Error desconocido',
        citasOcupadas: errorData.citasOcupadas || [],
      };
    }

    // Error de red o servidor no disponible
    if (error.request && !error.response) {
      return {
        success: false,
        message: 'No se pudo conectar con el servidor. Verifica tu conexión o intenta más tarde.',
        error: 'Error de conexión',
      };
    }

    // Otro tipo de error
    return {
      success: false,
      message: 'Error al crear la cita. Por favor, intenta nuevamente.',
      error: error.message || 'Error desconocido',
    };
  }
};

/**
 * Obtener todas las citas (Admin)
 */
export const obtenerTodasLasCitas = async (): Promise<ApiResponse<Cita[]>> => {
  if (allCitasRequest) {
    return allCitasRequest;
  }

  allCitasRequest = (async () => {
    try {
      const response = await axiosInstance.get('/api/citas/getAllCitas');

      // Si la respuesta es directamente un array (respuesta del backend)
      if (Array.isArray(response.data)) {
        return {
          success: true,
          data: response.data,
        };
      }

      // Si ya viene con el formato ApiResponse
      return response.data;
    } catch (error) {
      console.error('Error en obtenerTodasLasCitas:', error);
      return {
        success: false,
        message: 'Error al obtener las citas',
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    } finally {
      allCitasRequest = null;
    }
  })();

  return allCitasRequest;
};

/**
 * Obtener citas del usuario autenticado
 */
export const obtenerCitas = async (): Promise<ApiResponse<Cita[]>> => {
  try {
    const response = await axiosInstance.get('/api/citas/verCitas');
    
    // Si la respuesta es directamente un array
    if (Array.isArray(response.data)) {
      return {
        success: true,
        data: response.data
      };
    }
    
    // Si ya viene con el formato ApiResponse
    return response.data;
  } catch (error) {
    console.error('Error en obtenerCitas:', error);
    return {
      success: false,
      message: 'Error al obtener las citas',
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
};

/**
 * Obtener citas asignadas al ingeniero autenticado
 */
export const obtenerCitasIngeniero = async (): Promise<ApiResponse<{ message: string; total: number; citas: Cita[] }>> => {
  try {
    const response = await axiosInstance.get('/api/citas/misCitas');
    
    // Si la respuesta tiene la estructura esperada
    if (response.data && typeof response.data === 'object' && 'citas' in response.data) {
      return {
        success: true,
        data: response.data
      };
    }
    
    // Si ya viene con el formato ApiResponse
    return response.data;
  } catch (error) {
    console.error('Error en obtenerCitasIngeniero:', error);
    return {
      success: false,
      message: 'Error al obtener las citas del ingeniero',
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
};

/**
 * Obtener citas por correo del cliente
 */
export const obtenerCitasPorCliente = async (correo: string): Promise<ApiResponse<Cita[]>> => {
  try {
    const response = await axiosInstance.get('/api/citas/porCliente', {
      params: { correo }
    });
    
    // Si la respuesta es directamente un array
    if (Array.isArray(response.data)) {
      return {
        success: true,
        data: response.data
      };
    }
    
    // Si ya viene con el formato ApiResponse
    return response.data;
  } catch (error) {
    console.error('Error en obtenerCitasPorCliente:', error);
    return {
      success: false,
      message: 'Error al obtener las citas del cliente',
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
};

/**
 * Obtener cita por ID
 */
export const obtenerCita = async (id: string): Promise<ApiResponse<Cita>> => {
  try {
    const response = await axiosInstance.get(`/api/citas/verCita/${id}`);
    
    // Si la respuesta es directamente una cita
    if (response.data && response.data._id) {
      return {
        success: true,
        data: response.data
      };
    }
    
    // Si ya viene con el formato ApiResponse
    return response.data;
  } catch (error) {
    console.error('Error en obtenerCita:', error);
    return {
      success: false,
      message: 'Error al obtener la cita',
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
};

/**
 * Actualizar cita
 */
export const actualizarCita = async (id: string, data: CitaUpdate): Promise<ApiResponse<Cita>> => {
  try {
    const response = await axiosInstance.put(`/api/citas/actualizarCita/${id}`, data);
    
    // Si la respuesta es directamente una cita
    if (response.data && response.data._id) {
      return {
        success: true,
        data: response.data
      };
    }
    
    // Si ya viene con el formato ApiResponse
    return response.data;
  } catch (error) {
    console.error('Error en actualizarCita:', error);
    return {
      success: false,
      message: 'Error al actualizar la cita',
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
};

/**
 * Actualizar datos de una cita (cliente, ubicación, etc.)
 */
export const actualizarDatosCita = async (
  id: string,
  data: ActualizarDatosCitaData
): Promise<ApiResponse<{ message: string; cita: Cita }>> => {
  try {
    const response = await axiosInstance.put<ApiResponse<{ message: string; cita: Cita }>>(
      `/api/citas/${id}/actualizarDatos`,
      data
    );
    return response.data;
  } catch (error: any) {
    console.error('Error al actualizar datos de la cita:', error);
    return {
      success: false,
      message: error.response?.data?.message || 'Error al actualizar datos',
      error: error.message
    };
  }
};

/**
 * Cancelar cita
 */
export const cancelarCita = async (id: string): Promise<ApiResponse<{ message: string; cita: Cita }>> => {
  const response = await axiosInstance.post<ApiResponse<{ message: string; cita: Cita }>>(
    `/api/citas/${id}/cancel`
  );
  return response.data;
};

/**
 * Iniciar cita (cambia estado a en_proceso)
 */
export const iniciarCita = async (
  id: string,
  data?: IniciarCitaData
): Promise<ApiResponse<{ message: string; cita: Cita }>> => {
  const response = await axiosInstance.put<ApiResponse<{ message: string; cita: Cita }>>(
    `/api/citas/${id}/iniciar`,
    data || {}
  );
  return response.data;
};

/**
 * Actualizar especificaciones de una cita (solo ingeniero asignado)
 */
export const actualizarEspecificaciones = async (
  id: string,
  data: IniciarCitaData
): Promise<ApiResponse<{ message: string; cita: Cita }>> => {
  const response = await axiosInstance.put<ApiResponse<{ message: string; cita: Cita }>>(
    `/api/citas/${id}/especificaciones`,
    data
  );
  return response.data;
};

/**
 * Finalizar cita (cambia estado a completada y crea orden de trabajo)
 */
export const finalizarCita = async (
  id: string,
  data?: FinalizarCitaData
): Promise<ApiResponse<{ message: string; cita: Cita; ordenTrabajo: any }>> => {
  const response = await axiosInstance.put<ApiResponse<{ message: string; cita: Cita; ordenTrabajo: any }>>(
    `/api/citas/${id}/finalizar`,
    data || {}
  );
  return response.data;
};

/**
 * Actualizar estado de cita
 */
export const actualizarEstadoCita = async (
  id: string,
  data: ActualizarEstadoData
): Promise<ApiResponse<Cita>> => {
  try {
    const response = await axiosInstance.put<ApiResponse<Cita>>(`/api/citas/updateEstado/${id}`, data);
    return response.data;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[citasApi] actualizarEstadoCita error:', error);
    throw error;
  }
};

/**
 * Asignar uno o varios ingenieros a una cita
 */
export const asignarIngenierosCita = async (
  id: string,
  data: AsignarIngenierosCitaData,
): Promise<ApiResponse<{ message: string; cita: Cita }>> => {
  try {
    const response = await axiosInstance.put<ApiResponse<{ message: string; cita: Cita }>>(
      `/api/citas/${id}/asignarIngenieros`,
      data,
    );
    return response.data;
  } catch (error: any) {
    console.error('Error al asignar ingenieros a la cita:', error);
    return {
      success: false,
      message: error.response?.data?.message || 'Error al asignar ingenieros',
      error: error.message,
    };
  }
};

/**
 * Eliminar cita
 */
export const eliminarCita = async (id: string): Promise<ApiResponse<{ message: string }>> => {
  const response = await axiosInstance.delete<ApiResponse<{ message: string }>>(
    `/api/citas/eliminarCita/${id}`
  );
  return response.data;
};
