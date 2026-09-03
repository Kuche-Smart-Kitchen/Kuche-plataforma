import { fechaAgendadaToKanbanDueDate } from "@/lib/cita-datetime";
import {
  getTasksFromLocalStorage,
  mergeKanbanTaskLists,
  notifyKanbanTasksUpdated,
  type KanbanTask,
} from "@/lib/kanban";

type CitaKanbanInput = {
  id?: string;
  nombreCliente: string;
  fechaAgendada: string;
  ubicacion?: string;
  notes?: string;
  assignedTo?: string[];
};

const resolveCitaId = (value?: string) => {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : `cita-local-${Date.now()}`;
};

/** Inserta o fusiona una cita en el tablero local y notifica a Kanban/Dashboard. */
export function notifyWorkflowOfCitaCreated(input: CitaKanbanInput): void {
  if (typeof window === "undefined") return;

  const id = resolveCitaId(input.id);
  const clientName = input.nombreCliente.trim() || "Cliente sin nombre";
  const assignedTo = (input.assignedTo ?? []).map((name) => name.trim()).filter(Boolean);

  const task: KanbanTask = {
    id,
    sourceId: input.id?.trim() || id,
    sourceType: "cita",
    title: clientName,
    project: clientName,
    stage: "citas",
    status: "pendiente",
    assignedTo: assignedTo.length > 0 ? assignedTo : ["Sin asignar"],
    location: input.ubicacion?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    dueDate: fechaAgendadaToKanbanDueDate(input.fechaAgendada),
    createdAt: Date.now(),
    citaStarted: false,
    citaFinished: false,
    followUpStatus: "pendiente",
  };

  const merged = mergeKanbanTaskLists(getTasksFromLocalStorage(), [task]);
  notifyKanbanTasksUpdated(merged);
}
