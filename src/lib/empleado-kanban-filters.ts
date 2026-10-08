import { getTasksFromLocalStorage, type KanbanTask } from "@/lib/kanban";
import { syncKanbanTasksFromBackend } from "@/lib/admin-workflow";

export type EmpleadoAssigneeMatch = {
  nombre: string;
  userId?: string | null;
};

/** Carga kanban desde backend; si falla la sync, conserva la copia en memoria previa. */
export async function loadKanbanTasksForEmpleadoView(): Promise<KanbanTask[]> {
  const fallback = getTasksFromLocalStorage();
  try {
    const synced = await syncKanbanTasksFromBackend();
    if (synced !== null) {
      return synced;
    }
  } catch {
    // conservar fallback
  }
  return fallback;
}

export function isTaskAssignedToEmpleado(task: KanbanTask, empleado: EmpleadoAssigneeMatch): boolean {
  const name = empleado.nombre.trim();
  const userId = empleado.userId?.trim();

  if (userId && Array.isArray(task.assignedToIds) && task.assignedToIds.some((id) => id === userId)) {
    return true;
  }

  if (!Array.isArray(task.assignedTo)) {
    return false;
  }

  if (name && task.assignedTo.some((assignee) => assignee === name)) {
    return true;
  }

  if (userId && task.assignedTo.some((assignee) => assignee === userId)) {
    return true;
  }

  return false;
}

/** Fuera del tablero activo si seguimiento ya está confirmado o descartado. */
export function taskIsEnProcesoPipeline(task: KanbanTask): boolean {
  if (
    task.stage === "contrato" &&
    (task.followUpStatus === "confirmado" || task.followUpStatus === "descartado")
  ) {
    return false;
  }
  return true;
}

export function taskIsConfirmado(task: KanbanTask): boolean {
  return task.stage === "contrato" && task.followUpStatus === "confirmado";
}

export function taskIsInactivo(task: KanbanTask): boolean {
  return task.followUpStatus === "descartado";
}
