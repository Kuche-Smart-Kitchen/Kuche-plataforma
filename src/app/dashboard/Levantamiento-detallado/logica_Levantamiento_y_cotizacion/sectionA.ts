import type { KanbanTask, PreliminarData } from "@/lib/kanban";
import { normalizeLegacyProjectTypeToCatalog } from "@/lib/catalog-project-types";
import { parseDeliveryWeeksRangeFromLabel } from "@/lib/delivery-weeks";

export type SectionAInitialValues = {
  clientName?: string;
  projectType?: string;
  location?: string;
  largo?: string;
  alto?: string;
  deliveryWeeksMin?: string;
  deliveryWeeksMax?: string;
};

export function getSectionAInitialValues(task: KanbanTask | null): SectionAInitialValues {
  if (!task) return {};
  const rawTask = task as unknown as Record<string, unknown>;
  const cita = rawTask.cita && typeof rawTask.cita === "object"
    ? (rawTask.cita as Record<string, unknown>)
    : null;
  const lastPre = getLastPreliminar(task);
  const parsedWeeks = lastPre?.date ? parseDeliveryWeeksRangeFromLabel(lastPre.date) : null;
  const clientNameFromTask =
    (typeof cita?.nombreCliente === "string" && cita.nombreCliente.trim() ? cita.nombreCliente.trim() : "") ||
    (task.project?.trim() ? task.project.trim() : "") ||
    (task.title?.trim() ? task.title.trim() : "") ||
    (lastPre?.client?.trim() ? lastPre.client.trim() : "");
  const projectTypeRaw =
    (typeof cita?.tipoProyecto === "string" && cita.tipoProyecto.trim() ? cita.tipoProyecto.trim() : "") ||
    (typeof rawTask.tipoProyecto === "string" && rawTask.tipoProyecto.trim() ? rawTask.tipoProyecto.trim() : "") ||
    (typeof rawTask.nombreProyecto === "string" && rawTask.nombreProyecto.trim() ? rawTask.nombreProyecto.trim() : "") ||
    (lastPre?.projectType?.trim() ? lastPre.projectType.trim() : "");
  const locationFromTask =
    (typeof cita?.ubicacion === "string" && cita.ubicacion.trim() ? cita.ubicacion.trim() : "") ||
    (task.location?.trim() ? task.location.trim() : "") ||
    (lastPre?.location?.trim() ? lastPre.location.trim() : "");

  return {
    clientName: clientNameFromTask || undefined,
    projectType: projectTypeRaw ? normalizeLegacyProjectTypeToCatalog(projectTypeRaw) : undefined,
    location: locationFromTask || undefined,
    largo: typeof lastPre?.largo === "string" && lastPre.largo.trim() ? lastPre.largo : undefined,
    alto: typeof lastPre?.alto === "string" && lastPre.alto.trim() ? lastPre.alto : undefined,
    deliveryWeeksMin: parsedWeeks ? String(parsedWeeks.min) : undefined,
    deliveryWeeksMax: parsedWeeks ? String(parsedWeeks.max) : undefined,
  };
}

function getLastPreliminar(task: KanbanTask): PreliminarData | null {
  const preliminares = task.preliminarCotizaciones && task.preliminarCotizaciones.length > 0
    ? task.preliminarCotizaciones
    : task.preliminarData
      ? [task.preliminarData]
      : [];
  return preliminares.at(-1) ?? null;
}
