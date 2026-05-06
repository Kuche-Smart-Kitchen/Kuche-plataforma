"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

import { buildTaskUpdatePayload, type AdminWorkflowTask } from "@/lib/admin-workflow";
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
import type { TaskStage } from "@/lib/kanban";

type WorkflowTaskPatch = Partial<AdminWorkflowTask>;

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
      const patchKeys = Object.keys(patch);
      const isFollowUpOnlyPatch =
        patchKeys.length > 0 &&
        patchKeys.every((key) => key === "followUpStatus" || key === "status" || key === "followUpEnteredAt");

      const mergedTask: AdminWorkflowTask = {
        ...task,
        ...patch,
        visita: {
          fechaProgramada:
            patch.visita?.fechaProgramada ??
            patch.visitScheduledAt ??
            task.visita?.fechaProgramada ??
            task.visitScheduledAt,
          aprobadaPorAdmin:
            patch.visita?.aprobadaPorAdmin ??
            patch.designApprovedByAdmin ??
            task.visita?.aprobadaPorAdmin ??
            task.designApprovedByAdmin ??
            false,
          aprobadaPorCliente:
            patch.visita?.aprobadaPorCliente ??
            patch.designApprovedByClient ??
            task.visita?.aprobadaPorCliente ??
            task.designApprovedByClient ??
            false,
        },
      };

      if (task.backendSource === "cita") {
        if (mergedTask.stage !== "citas") {
          await moveTask(task, mergedTask.stage);
          return;
        }

        // For citas, prefer the edited title when present so it becomes cita.informacionAdicional.
        const titleFromPatch = typeof patch.title === "string" ? patch.title.trim() : "";
        const notesFromPatch = typeof patch.notes === "string" ? patch.notes.trim() : "";
        const citaInfo =
          titleFromPatch ||
          notesFromPatch ||
          mergedTask.notes?.trim() ||
          mergedTask.title?.trim() ||
          "";

        const estadoCita =
          mergedTask.status === "completada" || mergedTask.citaFinished
            ? "completada"
            : mergedTask.citaStarted || (mergedTask.assignedToIds?.length ?? 0) > 0
              ? "en_proceso"
              : "programada";

        const response = await actualizarTarjetaCita(task.sourceId, {
          cita: {
            nombreCliente: mergedTask.project,
            informacionAdicional: citaInfo,
            ubicacion: mergedTask.location,
          },
          ingenieroId: mergedTask.assignedToIds?.[0],
          estado: estadoCita,
        });

        if (!response.success) {
          throw new Error(getResponseMessage(response) || "No se pudo actualizar la cita");
        }
        await refresh();
        return;
      }

      // Algunos backends ignoran followUpStatus cuando llega en un payload "full".
      // Para confirmar/inactivar/reactivar, enviamos payload minimo y estable.
      if (isFollowUpOnlyPatch) {
        const followUp = typeof patch.followUpStatus === "string" ? patch.followUpStatus : undefined;
        const estado = typeof patch.status === "string" ? patch.status : undefined;
        const followUpEnteredAt =
          typeof patch.followUpEnteredAt === "number" ? patch.followUpEnteredAt : undefined;

        const basePayload: Record<string, unknown> = {};
        if (followUp) basePayload.followUpStatus = followUp;
        if (estado) basePayload.estado = estado;
        if (followUpEnteredAt !== undefined) basePayload.followUpEnteredAt = followUpEnteredAt;

        const candidatePayloads: Array<Record<string, unknown>> = [basePayload];
        if (followUp === "inactivo") {
          candidatePayloads.push({ ...basePayload, followUpStatus: "descartado" });
        }
        if (followUp) {
          candidatePayloads.push({ ...basePayload, seguimiento: followUp });
          candidatePayloads.push({ ...basePayload, estadoSeguimiento: followUp });
        }

        const seen = new Set<string>();
        const uniquePayloads = candidatePayloads.filter((candidate) => {
          const fingerprint = JSON.stringify(candidate);
          if (seen.has(fingerprint)) return false;
          seen.add(fingerprint);
          return true;
        });

        let lastErrorMessage = "No se pudo actualizar seguimiento de la tarea";
        let hadSuccessfulWrite = false;

        for (const candidate of uniquePayloads) {
          const response = await actualizarTarjetaTarea(task.sourceId, candidate as ActualizarTareaData);
          if (!response.success) {
            lastErrorMessage = getResponseMessage(response) || lastErrorMessage;
            continue;
          }

          hadSuccessfulWrite = true;

          const rawResponseData = (response as { data?: unknown }).data;
          const responseData =
            typeof rawResponseData === "object" && rawResponseData !== null
              ? (rawResponseData as Record<string, unknown>)
              : null;

          const followUpInResponse = responseData
            ? (responseData.followUpStatus ?? responseData.seguimiento ?? responseData.estadoSeguimiento)
            : undefined;

          if (followUp && typeof followUpInResponse === "string") {
            const normalized = followUpInResponse === "descartado" ? "inactivo" : followUpInResponse;
            if (normalized === followUp) {
              await refresh();
              return;
            }
          }

          const refreshed = await refresh();
          if (!followUp) return;

          const updated = refreshed.find(
            (item) => item.id === task.id || item.sourceId === task.sourceId,
          );
          if (updated?.followUpStatus === followUp) {
            return;
          }

          if (followUp === "inactivo" && updated?.followUpStatus === "inactivo") {
            return;
          }
        }

        if (hadSuccessfulWrite) {
          // Evita falso negativo cuando backend persiste pero no expone follow-up en el shape esperado.
          await refresh();
          return;
        }

        throw new Error(lastErrorMessage);
      }

      const payload = buildTaskUpdatePayload(mergedTask);
      const payloadForApi = { ...payload } as Record<string, unknown>;
      if (payloadForApi.sourceId == null) {
        delete payloadForApi.sourceId;
      }
      const response = await actualizarTarjetaTarea(task.sourceId, payloadForApi as ActualizarTareaData);
      if (!response.success) {
        throw new Error(getResponseMessage(response) || "No se pudo actualizar la tarea");
      }
      await refresh();
      } finally {
        setIsMutating(false);
      }
    },
    [moveTask, refresh],
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
    }),
    [createTask, deleteTask, error, isLoading, isMutating, markFollowUpAlerts, moveTask, reactivateTask, refresh, tasks, updateTask],
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