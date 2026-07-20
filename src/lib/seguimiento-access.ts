import {
  kanbanStorageKey,
  seguimientoProjectStoragePrefix,
} from "@/lib/kanban";
import type { KanbanTask } from "@/lib/kanban";
import { computeIsProspectFromKanban } from "@/lib/seguimiento-project";

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

function codesMatch(a: string, b: string): boolean {
  return normalizePublicProjectCodeInput(a) === normalizePublicProjectCodeInput(b);
}

function parseStoredProject(storageKey: string): Record<string, unknown> | null {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return null;
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function findProjectInLocalStorage(codeInput: string): Record<string, unknown> | null {
  const normalized = normalizePublicProjectCodeInput(codeInput);
  if (!normalized) return null;

  const candidates = new Set<string>([
    codeInput.trim(),
    normalized,
    normalized.replace(/^K-/, ""),
  ]);

  for (const candidate of candidates) {
    const parsed = parseStoredProject(`${seguimientoProjectStoragePrefix}${candidate}`);
    if (parsed) return parsed;
  }

  for (let i = 0; i < window.localStorage.length; i += 1) {
    const storageKey = window.localStorage.key(i);
    if (!storageKey?.startsWith(seguimientoProjectStoragePrefix)) continue;
    const suffix = storageKey.slice(seguimientoProjectStoragePrefix.length);
    if (!codesMatch(suffix, normalized)) continue;
    const parsed = parseStoredProject(storageKey);
    if (parsed) return parsed;
  }

  return null;
}

function loadKanbanTasks(): KanbanTask[] {
  try {
    const raw = window.localStorage.getItem(kanbanStorageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as KanbanTask[]) : [];
  } catch {
    return [];
  }
}

function findKanbanTaskByCode(tasks: KanbanTask[], codeInput: string): KanbanTask | undefined {
  const normalized = normalizePublicProjectCodeInput(codeInput);
  if (!normalized) return undefined;
  return tasks.find((task) =>
    codesMatch(String(task.codigoProyecto ?? ""), normalized),
  );
}

/** Registro mínimo cuando existe la tarjeta en Kanban pero aún no hay `kuche_project_*`. */
export function buildSeguimientoFromKanbanTask(
  task: KanbanTask,
  code: string,
): Record<string, unknown> {
  return {
    codigo: normalizePublicProjectCodeInput(code),
    cliente: (task.project ?? task.title ?? "Cliente").trim() || "Cliente",
    kanbanStage: task.stage,
    kanbanFollowUpStatus: task.followUpStatus ?? "pendiente",
    isProspect: computeIsProspectFromKanban(task.stage, task.followUpStatus),
    inversion: 0,
    archivos: [],
    cotizacionPreliminarImage: "",
    cotizacionFormalImage: "",
  };
}

/**
 * Resuelve el proyecto del cliente por código: localStorage (`kuche_project_*`) o, en su defecto, Kanban.
 */
export function resolveSeguimientoProjectByCode(
  codeInput: string,
): Record<string, unknown> | null {
  if (typeof window === "undefined") return null;

  const fromStorage = findProjectInLocalStorage(codeInput);
  if (fromStorage) return fromStorage;

  const tasks = loadKanbanTasks();
  const task = findKanbanTaskByCode(tasks, codeInput);
  if (!task) return null;

  return buildSeguimientoFromKanbanTask(task, codeInput);
}
