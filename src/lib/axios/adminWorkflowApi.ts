import { fetchAdminWorkflowTasksSequentially, type AdminWorkflowTask, type AdminWorkflowLoadResult } from "@/lib/admin-workflow";
import axiosInstance from "@/lib/axios/axiosConfig";
import {
  actualizarCita,
  actualizarDatosCita,
  actualizarEstadoCita,
  eliminarCita,
  type ActualizarEstadoData,
  type ActualizarDatosCitaData,
  type CitaUpdate,
} from "@/lib/axios/citasApi";
import {
  actualizarTarea,
  cambiarEtapa,
  crearTarea,
  eliminarTarea,
  type ActualizarTareaData,
  type CrearTareaData,
  type EtapaTarea,
} from "@/lib/axios/tareasApi";
import type { TaskStage } from "@/lib/kanban";

const stageToEtapa = (stage: TaskStage): EtapaTarea => stage;

export const cargarTableroAdmin = async (): Promise<AdminWorkflowLoadResult> => {
  return fetchAdminWorkflowTasksSequentially();
};

export const obtenerAlertasSeguimiento = async (dias = 3): Promise<number> => {
  const response = await axiosInstance.get<{ success: boolean; data?: { count?: number } }>(
    "/api/kanban/seguimiento/alertas",
    { params: { dias } },
  );

  if (!response.data?.success) {
    return 0;
  }

  return Number(response.data?.data?.count ?? 0);
};

export const moverTarjetaTarea = async (taskId: string, stage: TaskStage) => {
  const etapa = stageToEtapa(stage);
  const stageResponse = await cambiarEtapa(taskId, etapa).catch(() => null);
  if (stageResponse?.success) return stageResponse;
  return actualizarTarea(taskId, { etapa });
};

export const crearTareaWorkflow = async (data: CrearTareaData) => {
  return crearTarea(data);
};

export const actualizarTarjetaTarea = async (taskId: string, data: ActualizarTareaData) => {
  return actualizarTarea(taskId, data);
};

export const eliminarTarjetaTarea = async (taskId: string) => {
  return eliminarTarea(taskId);
};

export const actualizarTarjetaCita = async (
  citaId: string,
  payload: {
    cita?: CitaUpdate;
    ingenieroId?: string;
    estado?: ActualizarEstadoData["estado"];
  },
) => {
  // DEBUG: log payload and citaId
  try {
    // eslint-disable-next-line no-console
    console.log('[adminWorkflowApi] actualizarTarjetaCita called', { citaId, payload });
  } catch (e) {
    // ignore
  }

  if (payload.cita) {
    try {
      // DEBUG: mostrar exactamente qué se enviará al backend para edición de cita
      // eslint-disable-next-line no-console
      console.log('[adminWorkflowApi] actualizarCita request payload:', { citaId, cita: payload.cita });

      const citaResponse = await actualizarCita(citaId, payload.cita);
      // eslint-disable-next-line no-console
      console.log('[adminWorkflowApi] actualizarCita response:', citaResponse);
      if (!citaResponse.success) return citaResponse;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[adminWorkflowApi] actualizarCita error:', error);
      throw error;
    }
  }

  if (payload.estado) {
    try {
      const estadoResp = await actualizarEstadoCita(citaId, { estado: payload.estado });
      // eslint-disable-next-line no-console
      console.log('[adminWorkflowApi] actualizarEstadoCita response:', estadoResp);
      return estadoResp;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[adminWorkflowApi] actualizarEstadoCita error:', error);
      throw error;
    }
  }

  return { success: true };
};

export const eliminarTarjetaCita = async (citaId: string) => {
  return eliminarCita(citaId);
};

export const promoverCitaATarea = async (task: AdminWorkflowTask, stageDestino: Exclude<TaskStage, "citas">) => {
  const sourceCitaId = task.sourceId ?? task.sourceCitaId;

  try {
    const promotedResponse = await axiosInstance.post<{ success: boolean; message?: string }>(
      `/api/workflow/citas/${sourceCitaId}/promover`,
      { etapaDestino: stageDestino },
    );

    if (promotedResponse.data?.success) {
      return promotedResponse.data;
    }
  } catch (error: unknown) {
    const status =
      typeof error === "object" &&
      error !== null &&
      "response" in error &&
      typeof (error as { response?: { status?: number } }).response?.status === "number"
        ? (error as { response?: { status?: number } }).response?.status
        : undefined;

    if (status !== 404) {
      throw error;
    }
  }

  const clientName = task.cita?.nombreCliente || task.project || task.title;

  const createResponse = await crearTarea({
    titulo: task.title || clientName,
    proyecto: clientName,
    nombreProyecto: clientName,
    etapa: stageDestino,
    estado: task.status,
    asignadoA: task.assignedToIds,
    notas: task.notes,
    prioridad: task.priority,
    fechaLimite: task.dueDate,
    ubicacion: task.location,
    mapsUrl: task.mapsUrl,
    followUpEnteredAt: task.followUpEnteredAt,
    followUpStatus: task.followUpStatus,
    citaStarted: task.citaStarted,
    citaFinished: true,
    designApprovedByAdmin: task.designApprovedByAdmin,
    designApprovedByClient: task.designApprovedByClient,
    preliminarData: task.preliminarData,
    cotizacionFormalData: task.cotizacionFormalData,
    preliminarCotizaciones: task.preliminarCotizaciones,
    cotizacionesFormales: task.cotizacionesFormales,
    codigoProyecto: task.codigoProyecto,
  });

  if (!createResponse.success) {
    return createResponse;
  }

  await actualizarEstadoCita(sourceCitaId, { estado: "completada" });
  return createResponse;
};