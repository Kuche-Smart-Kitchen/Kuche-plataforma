/**
 * API de Tareas
 * Endpoints para gestión del tablero Kanban de tareas
 * 
 * Backend URL: http://localhost:3001/api/tareas
 * Estado: ✅ Implementado y funcionando
 */

import axiosInstance, { ApiResponse } from './axiosConfig';

/* ========================================================================
   TYPES & INTERFACES
   ======================================================================== */

export interface ArchivoTarea {
  id: string;
  nombre: string;
  tipo:
    | "levantamiento_detallado"
    | "diseno"
    | "cotizacion_formal"
    | "hoja_taller"
    | "recibo_1"
    | "recibo_2"
    | "recibo_3"
    | "contrato"
    | "fotos_proyecto"
    | "pdf"
    | "render"
    | "otro"
    | string;
  url?: string;
  createdAt?: Date | string;
}

export type EtapaTarea = "citas" | "disenos" | "cotizacion" | "contrato";
export type EstadoTarea = "pendiente" | "completada";
export type PrioridadTarea = "alta" | "media" | "baja";
export type SeguimientoTarea = "pendiente" | "confirmado" | "inactivo";
export type SourceTypeTarea = "cita" | "diseno" | null;

export interface CitaTarea {
  fechaAgendada?: string;
  nombreCliente?: string;
  correoCliente?: string;
  telefonoCliente?: string;
  ubicacion?: string;
  informacionAdicional?: string;
}

export interface VisitaTarea {
  fechaProgramada?: string;
  aprobadaPorAdmin?: boolean;
  aprobadaPorCliente?: boolean;
}

export interface PreliminarCotizacionTarea {
  client: string;
  projectType: string;
  location: string;
  date: string;
  rangeLabel: string;
  cubierta: string;
  frente: string;
  herraje: string;
}

export interface CotizacionFormalTarea extends PreliminarCotizacionTarea {
  formalPdfKey?: string;
  pdfDataUrl?: string;
}

export interface Tarea {
  _id: string;
  titulo?: string;
  etapa: EtapaTarea;
  estado: EstadoTarea;
  asignadoA: string | string[];   // ID del usuario o IDs cuando hay múltiples responsables
  asignadoANombre: string | string[]; // Nombre(s) del usuario (populado por backend)
  proyecto?: string;              // ID del proyecto
  nombreProyecto: string;         // Nombre del proyecto (populado por backend)
  notas?: string;
  prioridad?: PrioridadTarea;
  fechaLimite?: string;
  ubicacion?: string;
  mapsUrl?: string;
  followUpEnteredAt?: number;
  followUpStatus?: SeguimientoTarea;
  citaStarted?: boolean;
  citaFinished?: boolean;
  designApprovedByAdmin?: boolean;
  designApprovedByClient?: boolean;
  preliminarData?: PreliminarCotizacionTarea;
  cotizacionFormalData?: CotizacionFormalTarea;
  preliminarCotizaciones?: PreliminarCotizacionTarea[];
  cotizacionesFormales?: CotizacionFormalTarea[];
  codigoProyecto?: string;
  sourceType?: SourceTypeTarea;
  sourceId?: string | null;
  sourceCitaId?: string;
  sourceDisenoId?: string;
  cita?: CitaTarea;
  visita?: VisitaTarea;
  archivos?: ArchivoTarea[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CrearTareaData {
  titulo?: string;
  etapa: EtapaTarea;
  estado?: EstadoTarea;
  asignadoA: string | string[];  // ID del usuario o usuarios
  proyecto?: string;  // ID del proyecto
  nombreProyecto?: string;
  notas?: string;
  prioridad?: PrioridadTarea;
  fechaLimite?: string;
  ubicacion?: string;
  mapsUrl?: string;
  followUpEnteredAt?: number;
  followUpStatus?: SeguimientoTarea;
  citaStarted?: boolean;
  citaFinished?: boolean;
  designApprovedByAdmin?: boolean;
  designApprovedByClient?: boolean;
  preliminarData?: PreliminarCotizacionTarea;
  cotizacionFormalData?: CotizacionFormalTarea;
  preliminarCotizaciones?: PreliminarCotizacionTarea[];
  cotizacionesFormales?: CotizacionFormalTarea[];
  codigoProyecto?: string;
  sourceType?: SourceTypeTarea;
  sourceId?: string;
  cita?: CitaTarea;
  visita?: VisitaTarea;
}

export interface ActualizarTareaData {
  titulo?: string;
  etapa?: EtapaTarea;
  estado?: EstadoTarea;
  asignadoA?: string | string[];
  nombreProyecto?: string;
  notas?: string;
  prioridad?: PrioridadTarea;
  fechaLimite?: string;
  ubicacion?: string;
  mapsUrl?: string;
  followUpEnteredAt?: number;
  followUpStatus?: SeguimientoTarea;
  citaStarted?: boolean;
  citaFinished?: boolean;
  designApprovedByAdmin?: boolean;
  designApprovedByClient?: boolean;
  scheduledAt?: string;
  visitScheduledAt?: string;
  preliminarData?: PreliminarCotizacionTarea;
  cotizacionFormalData?: CotizacionFormalTarea;
  preliminarCotizaciones?: PreliminarCotizacionTarea[];
  cotizacionesFormales?: CotizacionFormalTarea[];
  codigoProyecto?: string;
  sourceType?: SourceTypeTarea;
  sourceId?: string;
  sourceCitaId?: string;
  sourceDisenoId?: string;
  cita?: CitaTarea;
  visita?: VisitaTarea;
  pagos?: unknown;
  seguimientoNota?: string;
  notaSeguimiento?: string;
}

export interface FiltrosTareas {
  etapa?: string;
  stage?: string;
  estado?: string;
  asignadoA?: string;
  proyecto?: string;
  followUpStatus?: SeguimientoTarea;
  designApprovedByAdmin?: boolean;
  designApprovedByClient?: boolean;
}

/* ========================================================================
   API FUNCTIONS
   ======================================================================== */

/**
 * Obtener todas las tareas con filtros opcionales
 * @param filtros - Filtros opcionales (etapa, estado, asignadoA, proyecto)
 * @returns Promise con array de tareas
 */
export const obtenerTareas = async (
  filtros?: FiltrosTareas
): Promise<ApiResponse<Tarea[]>> => {
  const response = await axiosInstance.get<ApiResponse<Tarea[]>>('/api/tareas', {
    params: filtros,
  });
  return response.data;
};

/**
 * Obtener una tarea por ID
 * @param id - ID de la tarea
 * @returns Promise con la tarea
 */
export const obtenerTarea = async (id: string): Promise<ApiResponse<Tarea>> => {
  const response = await axiosInstance.get<ApiResponse<Tarea>>(`/api/tareas/${id}`);
  return response.data;
};

/**
 * Crear nueva tarea
 * @param data - Datos de la tarea a crear
 * @returns Promise con la tarea creada
 */
export const crearTarea = async (
  data: CrearTareaData
): Promise<ApiResponse<Tarea>> => {
  const response = await axiosInstance.post<ApiResponse<Tarea>>('/api/tareas', data);
  return response.data;
};

/**
 * Actualizar tarea completa
 * @param id - ID de la tarea
 * @param data - Datos a actualizar
 * @returns Promise con la tarea actualizada
 */
export const actualizarTarea = async (
  id: string,
  data: ActualizarTareaData
): Promise<ApiResponse<Tarea>> => {
  try {
    console.log("[tarea] 3 request tarea raw", { id, data });
    console.log("[tarea] 3 request tarea json", JSON.stringify(data, null, 2));
  } catch {}
  const response = await axiosInstance.patch<ApiResponse<Tarea>>(`/api/tareas/${id}`, data);
  try {
    console.log("[tarea] 4 response tarea", response.data);
  } catch {}
  return response.data;
};

/**
 * Asignar trabajadores a una tarea (flujo separado de edición de datos)
 * Endpoint: PUT /api/tareas/:id/asignar-trabajadores
 */
export const asignarTrabajadoresTarea = async (
  id: string,
  asignadoA: string[] | string,
): Promise<ApiResponse<Tarea>> => {
  const payload = { asignadoA };
  const response = await axiosInstance.put<ApiResponse<Tarea>>(
    `/api/tareas/${id}/asignar-trabajadores`,
    payload,
  );
  return response.data;
};

/**
 * Cambiar etapa de una tarea (para drag & drop en Kanban)
 * @param id - ID de la tarea
 * @param etapa - Nueva etapa
 * @returns Promise con la tarea actualizada
 */
export const cambiarEtapa = async (
  id: string,
  etapa: EtapaTarea
): Promise<ApiResponse<Tarea>> => {
  const response = await axiosInstance.patch<ApiResponse<Tarea>>(
    `/api/tareas/${id}/etapa`,
    { etapa }
  );
  return response.data;
};

/**
 * Cambiar estado de una tarea (pendiente/completada)
 * @param id - ID de la tarea
 * @param estado - Nuevo estado
 * @returns Promise con la tarea actualizada
 */
export const cambiarEstado = async (
  id: string,
  estado: EstadoTarea
): Promise<ApiResponse<Tarea>> => {
  const response = await axiosInstance.patch<ApiResponse<Tarea>>(
    `/api/tareas/${id}/estado`,
    { estado }
  );
  return response.data;
};

/**
 * Agregar archivos a una tarea
 * @param id - ID de la tarea
 * @param archivos - Array de archivos a agregar
 * @returns Promise con la tarea actualizada
 */
export const agregarArchivos = async (
  id: string,
  archivos: Array<{ nombre: string; tipo: string; url?: string }>
): Promise<ApiResponse<Tarea>> => {
  const archivosSanitizados = archivos.map((archivo) => {
    const payloadBase = {
      nombre: archivo.nombre,
      tipo: archivo.tipo,
    };
    const url = archivo.url?.trim();
    return url ? { ...payloadBase, url } : payloadBase;
  });

  try {
    const response = await axiosInstance.post<ApiResponse<Tarea>>(
      `/api/tareas/${id}/archivos`,
      { archivos: archivosSanitizados },
      ({ skipAuthRedirect: true } as any),
    );
    return response.data;
  } catch (error) {
    const maybeAxios = error as { response?: { status?: number; data?: unknown } };
    if (maybeAxios.response?.status === 400) {
      console.error("[agregarArchivos] 400 payload:", { id, archivos: archivosSanitizados });
      console.error("[agregarArchivos] 400 response:", maybeAxios.response.data);
    }
    throw error;
  }
};

/**
 * Eliminar tarea
 * @param id - ID de la tarea a eliminar
 * @returns Promise con respuesta de éxito
 */
export const eliminarTarea = async (id: string): Promise<ApiResponse<null>> => {
  const response = await axiosInstance.delete<ApiResponse<null>>(`/api/tareas/${id}`);
  return response.data;
};
