"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

import { type AdminWorkflowTask } from "@/lib/admin-workflow";
import {
  actualizarTarjetaCita,
  actualizarTarjetaTarea,
  cargarTableroAdmin,
  crearTareaWorkflow,
  eliminarTarjetaCita,
  eliminarTarjetaTarea,
  moverTarjetaTarea,
  obtenerAlertasSeguimiento,
  promoverCitaATarea,
} from "@/lib/axios/adminWorkflowApi";
import type { ActualizarTareaData, CrearTareaData } from "@/lib/axios/tareasApi";
import { asignarTrabajadoresTarea } from "@/lib/axios/tareasApi";
import { asignarIngenierosCita } from "@/lib/axios/citasApi";
import type { TaskStage } from "@/lib/kanban";

type WorkflowTaskPatch = Partial<AdminWorkflowTask> & {
  notaSeguimiento?: string;
};

type CitaUpdatePayload = Parameters<typeof actualizarTarjetaCita>[1];

type AdminWorkflowContextValue = {
  tasks: AdminWorkflowTask[];
  isLoading: boolean;
  isMutating: boolean;
  error: string | null;
  refresh: () => Promise<AdminWorkflowTask[]>;
  moveTask: (task: AdminWorkflowTask, stage: TaskStage) => Promise<void>;
  updateTask: (task: AdminWorkflowTask, patch: WorkflowTaskPatch) => Promise<void>;
  createTask: (data: CrearTareaData) => Promise<void>;
  deleteTask: (task: AdminWorkflowTask) => Promise<void>;
  reactivateTask: (task: AdminWorkflowTask) => Promise<void>;
  markFollowUpAlerts: (daysWithoutChanges?: number) => Promise<number>;
  assignWorkers: (task: AdminWorkflowTask, assignedToIds: string[]) => Promise<void>;
};

const AdminWorkflowContext = createContext<AdminWorkflowContextValue | null>(null);

const DAY_MS = 24 * 60 * 60 * 1000;

const getResponseMessage = (response: unknown): string | undefined => {
  if (
    typeof response === "object" &&
    response !== null &&
    "message" in response &&
    typeof (response as { message?: unknown }).message === "string"
  ) {
    return (response as { message: string }).message;
  }
  return undefined;
};

const buildTaskUpdatePayload = (patch: WorkflowTaskPatch): ActualizarTareaData => {
  const payload: ActualizarTareaData = {};
  const assignedToIds = Array.isArray(patch.assignedToIds)
    ? patch.assignedToIds.filter((id): id is string => typeof id === "string" && id.trim().length > 0)
    : [];

  if (patch.title !== undefined) payload.titulo = patch.title;
  if (patch.stage !== undefined) payload.etapa = patch.stage;
  if (patch.status !== undefined) payload.estado = patch.status;
  // NOTE: assignment of workers is intentionally handled by a separate endpoint
  // per DOCUMENTACION_SEPARACION_EDICION_Y_ASIGNACION_TAREAS.md. Do not include
  // `asignadoA` in the general edit payload.
  if (patch.project !== undefined) payload.nombreProyecto = patch.project;
  if (patch.notes !== undefined) payload.notas = patch.notes;
  if (patch.priority !== undefined) payload.prioridad = patch.priority;
  if (patch.dueDate !== undefined) payload.fechaLimite = patch.dueDate;
  if (patch.location !== undefined) payload.ubicacion = patch.location;
  if (patch.mapsUrl !== undefined) payload.mapsUrl = patch.mapsUrl;
  if (patch.followUpEnteredAt !== undefined) payload.followUpEnteredAt = patch.followUpEnteredAt;
  if (patch.followUpStatus !== undefined) payload.followUpStatus = patch.followUpStatus;
  if (patch.citaStarted !== undefined) payload.citaStarted = patch.citaStarted;
  if (patch.citaFinished !== undefined) payload.citaFinished = patch.citaFinished;
  if (patch.designApprovedByAdmin !== undefined) payload.designApprovedByAdmin = patch.designApprovedByAdmin;
  if (patch.designApprovedByClient !== undefined) payload.designApprovedByClient = patch.designApprovedByClient;
  if (patch.visitScheduledAt !== undefined) payload.visitScheduledAt = patch.visitScheduledAt;
  if (patch.scheduledAt !== undefined) payload.scheduledAt = patch.scheduledAt;
  if (patch.sourceType !== undefined) payload.sourceType = patch.sourceType;
  if (patch.sourceId !== undefined) payload.sourceId = patch.sourceId;
  if (patch.sourceCitaId !== undefined) payload.sourceCitaId = patch.sourceCitaId;
  if (patch.sourceDisenoId !== undefined) payload.sourceDisenoId = patch.sourceDisenoId;
  if (patch.preliminarData !== undefined) payload.preliminarData = patch.preliminarData;
  if (patch.cotizacionFormalData !== undefined) payload.cotizacionFormalData = patch.cotizacionFormalData;
  if (patch.preliminarCotizaciones !== undefined) payload.preliminarCotizaciones = patch.preliminarCotizaciones;
  if (patch.cotizacionesFormales !== undefined) payload.cotizacionesFormales = patch.cotizacionesFormales;
  if (patch.codigoProyecto !== undefined) payload.codigoProyecto = patch.codigoProyecto;
  if (patch.cita !== undefined) payload.cita = patch.cita;
  if (patch.visita !== undefined) payload.visita = patch.visita;
  if (patch.pagos !== undefined) (payload as Record<string, unknown>).pagos = patch.pagos;
  if (patch.seguimientoNota !== undefined) (payload as Record<string, unknown>).seguimientoNota = patch.seguimientoNota;
  if (patch.notaSeguimiento !== undefined) (payload as Record<string, unknown>).notaSeguimiento = patch.notaSeguimiento;

  return payload;
};

const buildCitaUpdatePayload = (patch: WorkflowTaskPatch): CitaUpdatePayload => {
  const payload: CitaUpdatePayload = {};
  const cita: NonNullable<CitaUpdatePayload["cita"]> = {};

  if (patch.project !== undefined) cita.nombreCliente = patch.project;
  if (patch.location !== undefined) cita.ubicacion = patch.location;
  if (patch.mapsUrl !== undefined) cita.mapsUrl = patch.mapsUrl;
  if (patch.notes !== undefined || patch.title !== undefined) {
    cita.informacionAdicional = patch.notes ?? patch.title;
  }
  if (patch.dueDate !== undefined) cita.fechaAgendada = patch.dueDate;

  if (Object.keys(cita).length > 0) {
    payload.cita = cita;
  }

  if (patch.status !== undefined) {
    payload.estado = patch.status === "completada" ? "completada" : "programada";
  }
  if (patch.citaStarted === true) {
    payload.estado = "en_proceso";
  }
  if (patch.citaFinished === true) {
    payload.estado = "completada";
  }

  return payload;
};

export function AdminWorkflowProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<AdminWorkflowTask[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const response = await cargarTableroAdmin();
    setTasks(response.tasks);
    if (response.errors.length > 0 && response.tasks.length === 0) {
      setError(response.errors[0]);
    }
    setIsLoading(false);
    return response.tasks;
  }, []);

  const moveTask = useCallback(
    async (task: AdminWorkflowTask, stage: TaskStage) => {
      setIsMutating(true);
      try {
      if (task.stage === stage) return;

      if (task.stage === "disenos" && stage !== "disenos") {
        const approvedByAdmin = task.designApprovedByAdmin ?? task.visita?.aprobadaPorAdmin ?? false;
        const approvedByClient = task.designApprovedByClient ?? task.visita?.aprobadaPorCliente ?? false;
        if (!approvedByAdmin || !approvedByClient) {
          throw new Error("No se puede avanzar la tarea: el diseño debe estar aprobado por admin y por cliente.");
        }
      }

      if (task.backendSource === "cita") {
        if (stage === "citas") {
          const estado = task.citaFinished ? "completada" : task.citaStarted ? "en_proceso" : "programada";
          const response = await actualizarTarjetaCita(task.sourceId, { estado });
          if (!response.success) {
            throw new Error(getResponseMessage(response) || "No se pudo actualizar la cita");
          }
          await refresh();
          return;
        }

        const promoted = await promoverCitaATarea(task, stage);
        if (!promoted.success) {
          throw new Error(promoted.message || "No se pudo mover la cita al tablero de tareas");
        }
        await refresh();
        return;
      }

      const response = await moverTarjetaTarea(task.sourceId, stage);
      if (!response.success) {
        throw new Error(getResponseMessage(response) || "No se pudo mover la tarea");
      }
      await refresh();
      } finally {
        setIsMutating(false);
      }
    },
    [refresh],
  );

  const updateTask = useCallback(
    async (task: AdminWorkflowTask, patch: WorkflowTaskPatch) => {
      setIsMutating(true);
      try {
        const backendTaskId = task.sourceId?.trim() || task.id?.trim();
        if (!backendTaskId) {
          throw new Error("No se encontro un id valido para guardar la tarjeta.");
        }

        if (task.backendSource === "cita") {
          const payload = buildCitaUpdatePayload(patch);
          if (Object.keys(payload).length === 0 || (payload.cita && Object.keys(payload.cita).length === 0 && !payload.estado && !payload.ingenieroId)) {
            await refresh();
            return;
          }

          const response = await actualizarTarjetaCita(backendTaskId, payload);
          if (!response.success) {
            throw new Error(getResponseMessage(response) || "No se pudo actualizar la cita");
          }

          await refresh();
          return;
        }

        const payload = buildTaskUpdatePayload(patch);
        if (Object.keys(payload).length === 0) {
          await refresh();
          return;
        }

        const response = await actualizarTarjetaTarea(backendTaskId, payload);
        if (!response.success) {
          throw new Error(getResponseMessage(response) || "No se pudo actualizar la tarea");
        }

        await refresh();
      } finally {
        setIsMutating(false);
      }
    },
    [refresh],
  );

  const assignWorkers = useCallback(
    async (task: AdminWorkflowTask, assignedToIds: string[]) => {
      setIsMutating(true);
      try {
        const backendTaskId = task.sourceId?.trim() || task.id?.trim();
        if (!backendTaskId) throw new Error("No se encontro un id valido para asignar trabajadores.");

        if (task.backendSource === "cita") {
          // For cita-sourced items, delegate to the citas API assignment endpoint
          const response = await asignarIngenierosCita(backendTaskId, { ingenieroIds: assignedToIds });
          if (!response.success) throw new Error(response.message || "No se pudo asignar ingenieros a la cita");
          await refresh();
          return;
        }

        // Default: tarea backend
        const resp = await asignarTrabajadoresTarea(backendTaskId, assignedToIds);
        if (!resp.success) throw new Error(resp.message || "No se pudo asignar trabajadores a la tarea");
        await refresh();
      } finally {
        setIsMutating(false);
      }
    },
    [refresh],
  );

  const createTask = useCallback(
    async (data: CrearTareaData) => {
      setIsMutating(true);
      try {
      const response = await crearTareaWorkflow(data);
      if (!response.success) {
        throw new Error(getResponseMessage(response) || "No se pudo crear la tarea");
      }
      await refresh();
      } finally {
        setIsMutating(false);
      }
    },
    [refresh],
  );

  const deleteTask = useCallback(
    async (task: AdminWorkflowTask) => {
      setIsMutating(true);
      try {
      const response = task.backendSource === "cita"
        ? await eliminarTarjetaCita(task.sourceId)
        : await eliminarTarjetaTarea(task.sourceId);

      if (!response.success) {
        throw new Error(getResponseMessage(response) || "No se pudo eliminar la tarjeta");
      }
      await refresh();
      } finally {
        setIsMutating(false);
      }
    },
    [refresh],
  );

  const reactivateTask = useCallback(
    async (task: AdminWorkflowTask) => {
      await updateTask(task, {
        followUpStatus: "pendiente",
        followUpEnteredAt: Date.now(),
        status: "pendiente",
      });
    },
    [updateTask],
  );

  const markFollowUpAlerts = useCallback(
    async (daysWithoutChanges = 3) => {
      try {
        return await obtenerAlertasSeguimiento(daysWithoutChanges);
      } catch {
      }

      const now = Date.now();
      const threshold = daysWithoutChanges * DAY_MS;
      const candidates = tasks.filter((task) => task.stage === "contrato" && task.backendSource === "tarea");
      let alerts = 0;

      for (const task of candidates) {
        const reference = task.followUpEnteredAt ?? task.createdAt ?? now;
        if (now - reference >= threshold) {
          alerts += 1;
        }
      }

      return alerts;
    },
    [tasks],
  );

  const value = useMemo<AdminWorkflowContextValue>(
    () => ({
      tasks,
      isLoading,
      isMutating,
      error,
      refresh,
      moveTask,
      updateTask,
      createTask,
      deleteTask,
      reactivateTask,
      markFollowUpAlerts,
      assignWorkers,
    }),
    [createTask, deleteTask, error, isLoading, isMutating, markFollowUpAlerts, moveTask, reactivateTask, refresh, tasks, updateTask, assignWorkers],
  );

  return <AdminWorkflowContext.Provider value={value}>{children}</AdminWorkflowContext.Provider>;
}

export function useAdminWorkflow() {
  const context = useContext(AdminWorkflowContext);
  if (!context) {
    throw new Error("useAdminWorkflow debe usarse dentro de AdminWorkflowProvider");
  }
  return context;
}