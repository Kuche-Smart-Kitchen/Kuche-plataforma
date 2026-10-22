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

const OBJECT_ID_PATTERN = /^[a-fA-F0-9]{24}$/;

const sameAssigneeName = (left: string, right: string) =>
  left.trim().toLowerCase() === right.trim().toLowerCase();

const isAssigneeLabel = (value: string) => {
  const trimmed = value.trim().toLowerCase();
  return trimmed.length > 0 && trimmed !== "sin asignar";
};

export function isTaskAssignedToEmpleado(task: KanbanTask, empleado: EmpleadoAssigneeMatch): boolean {
  const name = empleado.nombre.trim();
  const userId = empleado.userId?.trim();
  const ids = Array.isArray(task.assignedToIds) ? task.assignedToIds : [];
  const names = Array.isArray(task.assignedTo) ? task.assignedTo : [];

  if (userId && ids.some((id) => id === userId)) {
    return true;
  }

  if (name && names.some((assignee) => isAssigneeLabel(assignee) && sameAssigneeName(assignee, name))) {
    return true;
  }

  if (userId && names.some((assignee) => assignee === userId)) {
    return true;
  }

  if (
    name &&
    ids.some((id) => isAssigneeLabel(id) && !OBJECT_ID_PATTERN.test(id.trim()) && sameAssigneeName(id, name))
  ) {
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
  return task.followUpStatus === "confirmado";
}

export function taskIsInactivo(task: KanbanTask): boolean {
  return task.followUpStatus === "descartado";
}
