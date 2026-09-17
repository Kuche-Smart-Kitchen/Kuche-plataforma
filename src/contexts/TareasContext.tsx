"use client";

import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { finalizarCita } from "@/lib/axios/citasApi";
import { actualizarTarea, asignarTrabajadoresTarea } from "@/lib/axios/tareasApi";
import type { KanbanTask } from "@/lib/kanban";

type TareasContextType = {
  actualizar: (task: KanbanTask, patch?: Partial<KanbanTask>) => Promise<void>;
  asignarTrabajadores: (taskId: string, assignedIds: string[]) => Promise<void>;
  terminarCita: (task: KanbanTask) => Promise<void>;
};

const TareasContext = createContext<TareasContextType | undefined>(undefined);

export function TareasProvider({ children }: { children: ReactNode }) {
  const actualizar = useCallback(async (task: KanbanTask, patch: Partial<KanbanTask> = {}) => {
    const snapshot = { ...task, ...patch };
    const data: Record<string, unknown> = {};
    if (patch.title !== undefined) data.titulo = snapshot.title;
    if (patch.stage !== undefined) data.etapa = snapshot.stage;
    if (patch.status !== undefined) data.estado = snapshot.status;
    if (patch.notes !== undefined) data.notas = snapshot.notes;
    if (patch.location !== undefined) data.ubicacion = snapshot.location;
    if (patch.mapsUrl !== undefined) data.mapsUrl = snapshot.mapsUrl;
    if (patch.dueDate !== undefined) data.fechaLimite = snapshot.dueDate;
    if (patch.priority !== undefined) data.prioridad = snapshot.priority;
    if (patch.followUpStatus !== undefined) data.followUpStatus = snapshot.followUpStatus;
    // followUpEnteredAt es propiedad exclusiva del backend/cron (GUIA_FRONTEND_CRON_SEGUIMIENTO_EMAIL.md): nunca se envía.
    if (patch.citaStarted !== undefined) data.citaStarted = snapshot.citaStarted;
    if (patch.citaFinished !== undefined) data.citaFinished = snapshot.citaFinished;
    if (patch.designApprovedByAdmin !== undefined) data.designApprovedByAdmin = snapshot.designApprovedByAdmin;
    if (patch.designApprovedByClient !== undefined) data.designApprovedByClient = snapshot.designApprovedByClient;
    if (patch.codigoProyecto !== undefined) data.codigoProyecto = snapshot.codigoProyecto;
    if (Object.keys(data).length === 0) return;

    const response = await actualizarTarea(task.id, data);
    if (!response.success) throw new Error(response.message || "No se pudo actualizar la tarea");
  }, []);

  const asignarTrabajadores = useCallback(async (taskId: string, assignedIds: string[]) => {
    const response = await asignarTrabajadoresTarea(taskId, assignedIds);
    if (!response.success) throw new Error(response.message || "No se pudieron asignar trabajadores");
  }, []);

  const terminarCita = useCallback(async (task: KanbanTask) => {
    const citaId = task.sourceId?.trim();
    if (task.sourceType?.toLowerCase() !== "cita" || !citaId) {
      throw new Error("No se encontró el identificador de la cita");
    }
    const response = await finalizarCita(citaId);
    if (!response.success) throw new Error(response.message || "No se pudo terminar la cita");
  }, []);

  const value = useMemo(
    () => ({ actualizar, asignarTrabajadores, terminarCita }),
    [actualizar, asignarTrabajadores, terminarCita],
  );
  return <TareasContext.Provider value={value}>{children}</TareasContext.Provider>;
}

export function useTareasContext() {
  const context = useContext(TareasContext);
  if (!context) throw new Error("useTareasContext debe usarse dentro de un TareasProvider");
  return context;
}