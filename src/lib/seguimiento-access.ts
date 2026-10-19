import {
  getTasksFromLocalStorage,
  taskPublicCode,
  type KanbanTask,
} from "@/lib/kanban";
import { ESTADO_PROYECTO, isClienteConfirmadoSegunKanban } from "@/lib/seguimiento-project";

/** Código de consulta: sin espacios y en mayúsculas. No agrega ni quita el prefijo `K-`. */
export function normalizeSeguimientoLookupCode(raw: string): string {
  return raw
    .trim()
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, "")
    .toUpperCase();
}

function samePublicCode(task: KanbanTask, code: string): boolean {
  const left = taskPublicCode(task).trim().toUpperCase().replace(/^K-/, "");
  const right = code.trim().toUpperCase().replace(/^K-/, "");
  return Boolean(left) && left === right;
}

function taskAmount(task: KanbanTask): number {
  if (typeof task.inversion === "number" && task.inversion > 0) return task.inversion;
  if (typeof task.presupuestoTotal === "number" && task.presupuestoTotal > 0) {
    return task.presupuestoTotal;
  }
  const formal = task.cotizacionesFormales?.[0]?.total ?? task.cotizacionFormalData?.total;
  if (typeof formal === "number" && formal > 0) return formal;
  const preliminar = task.preliminarCotizaciones?.[0]?.total ?? task.preliminarData?.total;
  if (typeof preliminar === "number" && preliminar > 0) return preliminar;
  return 0;
}

/** Arma la vista de seguimiento con la tarjeta local cuando el backend no tiene la ruta. */
export function seguimientoProjectFromLocalKanban(codeInput: string): Record<string, unknown> | null {
  const code = normalizeSeguimientoLookupCode(codeInput);
  if (!code) return null;

  const task = getTasksFromLocalStorage().find((item) => samePublicCode(item, code));
  if (!task) return null;

  const cliente = task.project?.trim() || task.title?.trim() || "Cliente";
  const confirmed = isClienteConfirmadoSegunKanban(task.stage, task.followUpStatus, task);
  return {
    codigo: taskPublicCode(task) || code.replace(/^K-/, ""),
    cliente,
    nombre: cliente,
    titulo: task.title,
    isProspect: !confirmed,
    kanbanStage: task.stage,
    kanbanFollowUpStatus: confirmed ? "confirmado" : (task.followUpStatus ?? "pendiente"),
    ...(confirmed
      ? {
          isConfirmed: true,
          confirmed: true,
          estadoProyecto: ESTADO_PROYECTO.CONFIRMADO,
        }
      : {}),
    inversion: taskAmount(task),
    preliminarData: task.preliminarData,
    preliminarCotizaciones: task.preliminarCotizaciones,
    cotizacionFormalData: task.cotizacionFormalData,
    cotizacionesFormales: task.cotizacionesFormales,
    archivos: (task.files ?? [])
      .filter((file) => Boolean(file.name || file.src))
      .map((file) => ({
        id: file.id,
        name: file.name,
        type: file.type,
        src: file.src,
      })),
  };
}

/** Quita espacios, caracteres invisibles y unifica mayúsculas para comparar códigos. */
export function normalizePublicProjectCodeInput(raw: string): string {
  const stripped = raw
    .trim()
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, "");
  if (!stripped) return "";
  const upper = stripped.toUpperCase();
  if (upper.startsWith("K-")) return upper;
  if (upper.startsWith("K") && upper.length > 1) return `K-${upper.slice(1)}`;
  return `K-${upper}`;
}

/** Sin persistencia: no busca en localStorage ni reconstruye desde Kanban, siempre entrega `null`. */
export function resolveSeguimientoProjectByCode(
  _codeInput: string,
): Record<string, unknown> | null {
  return null;
}

