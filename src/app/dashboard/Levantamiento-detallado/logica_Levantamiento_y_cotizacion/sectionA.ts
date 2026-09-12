import type { CotizacionFormalData, KanbanTask, PreliminarData } from "@/lib/kanban";
import { normalizeLegacyProjectTypeToCatalog } from "@/lib/catalog-project-types";
import { parseDeliveryWeeksRangeFromLabel } from "@/lib/delivery-weeks";

export type SectionAInitialValues = {
  clientName?: string;
  clientPhone?: string;
  clientEmail?: string;
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
  const cita =
    rawTask.cita && typeof rawTask.cita === "object"
      ? (rawTask.cita as Record<string, unknown>)
      : null;

  const lastFormal = getLastCotizacionFormal(task);
  const lastPre = getLastPreliminar(task);

  const parsedWeeks =
    (lastFormal?.date ? parseDeliveryWeeksRangeFromLabel(lastFormal.date) : null) ||
    (lastPre?.date ? parseDeliveryWeeksRangeFromLabel(lastPre.date) : null);

  const clientNameFromTask =
    (task.project?.trim() ? task.project.trim() : "") ||
    (task.title?.trim() ? task.title.trim() : "") ||
    (typeof cita?.nombreCliente === "string" && cita.nombreCliente.trim() ? cita.nombreCliente.trim() : "") ||
    (lastFormal?.client?.trim() ? lastFormal.client.trim() : "") ||
    (lastPre?.client?.trim() ? lastPre.client.trim() : "");

  const clientPhoneFromTask =
    (task.clientPhone?.trim() ? task.clientPhone.trim() : "") ||
    (typeof cita?.telefonoCliente === "string" && cita.telefonoCliente.trim() ? cita.telefonoCliente.trim() : "") ||
    (typeof cita?.telefono === "string" && cita.telefono.trim() ? cita.telefono.trim() : "") ||
    (typeof rawTask?.telefonoCliente === "string" && rawTask.telefonoCliente.trim() ? rawTask.telefonoCliente.trim() : "") ||
    (typeof rawTask?.telefono === "string" && rawTask.telefono.trim() ? rawTask.telefono.trim() : "");

  const clientEmailFromTask =
    (task.clientEmail?.trim() ? task.clientEmail.trim() : "") ||
    (typeof cita?.correoCliente === "string" && cita.correoCliente.trim() ? cita.correoCliente.trim() : "") ||
    (typeof cita?.email === "string" && cita.email.trim() ? cita.email.trim() : "") ||
    (typeof rawTask?.correoCliente === "string" && rawTask.correoCliente.trim() ? rawTask.correoCliente.trim() : "") ||
    (typeof rawTask?.email === "string" && rawTask.email.trim() ? rawTask.email.trim() : "");

  const projectTypeRaw =
    (lastFormal?.projectType?.trim() ? lastFormal.projectType.trim() : "") ||
    (lastPre?.projectType?.trim() ? lastPre.projectType.trim() : "") ||
    (typeof cita?.tipoProyecto === "string" && cita.tipoProyecto.trim() ? cita.tipoProyecto.trim() : "") ||
    (typeof rawTask?.tipoProyecto === "string" && rawTask.tipoProyecto.trim() ? rawTask.tipoProyecto.trim() : "") ||
    (typeof rawTask?.nombreProyecto === "string" && rawTask.nombreProyecto.trim() ? rawTask.nombreProyecto.trim() : "") ||
    (typeof task.projectTypeSummary === "string" && task.projectTypeSummary.trim() ? task.projectTypeSummary.trim() : "");

  const locationFromTask =
    (task.location?.trim() ? task.location.trim() : "") ||
    (lastFormal?.location?.trim() ? lastFormal.location.trim() : "") ||
    (lastPre?.location?.trim() ? lastPre.location.trim() : "") ||
    (typeof cita?.ubicacion === "string" && cita.ubicacion.trim() ? cita.ubicacion.trim() : "") ||
    (typeof rawTask?.ubicacion === "string" && rawTask.ubicacion.trim() ? rawTask.ubicacion.trim() : "");

  const largoFromTask =
    (typeof lastFormal?.largo === "string" && lastFormal.largo.trim() ? lastFormal.largo.trim() : "") ||
    (typeof lastPre?.largo === "string" && lastPre.largo.trim() ? lastPre.largo.trim() : "");

  const altoFromTask =
    (typeof lastFormal?.alto === "string" && lastFormal.alto.trim() ? lastFormal.alto.trim() : "") ||
    (typeof lastPre?.alto === "string" && lastPre.alto.trim() ? lastPre.alto.trim() : "");

  return {
    clientName: clientNameFromTask || undefined,
    clientPhone: clientPhoneFromTask || undefined,
    clientEmail: clientEmailFromTask || undefined,
    projectType: projectTypeRaw ? normalizeLegacyProjectTypeToCatalog(projectTypeRaw) : undefined,
    location: locationFromTask || undefined,
    largo: largoFromTask || undefined,
    alto: altoFromTask || undefined,
    deliveryWeeksMin: parsedWeeks ? String(parsedWeeks.min) : undefined,
    deliveryWeeksMax: parsedWeeks ? String(parsedWeeks.max) : undefined,
  };
}

function getLastPreliminar(task: KanbanTask): PreliminarData | null {
  const preliminares =
    task.preliminarCotizaciones && task.preliminarCotizaciones.length > 0
      ? task.preliminarCotizaciones
      : task.preliminarData
        ? [task.preliminarData]
        : [];

  return preliminares.at(-1) ?? null;
}

function getLastCotizacionFormal(task: KanbanTask): CotizacionFormalData | null {
  const formales =
    task.cotizacionesFormales && task.cotizacionesFormales.length > 0
      ? task.cotizacionesFormales
      : task.cotizacionFormalData
        ? [task.cotizacionFormalData]
        : [];

  return formales.at(-1) ?? null;
}

export type ClientDataOption = {
  name: string;
  phone: string;
  email: string;
  location?: string;
  projectType?: string;
  largo?: string;
  alto?: string;
  deliveryWeeksMin?: string;
  deliveryWeeksMax?: string;
  taskId?: string;
};

export function extractClientOptionsFromTasks(tasks: KanbanTask[]): ClientDataOption[] {
  const map = new Map<string, ClientDataOption>();
  for (const task of tasks) {
    const vals = getSectionAInitialValues(task);
    const name = vals.clientName?.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    const existing = map.get(key);
    map.set(key, {
      name,
      phone: vals.clientPhone || existing?.phone || "",
      email: vals.clientEmail || existing?.email || "",
      location: vals.location || existing?.location || "",
      projectType: vals.projectType || existing?.projectType || "",
      largo: vals.largo || existing?.largo || "",
      alto: vals.alto || existing?.alto || "",
      deliveryWeeksMin: vals.deliveryWeeksMin || existing?.deliveryWeeksMin || "",
      deliveryWeeksMax: vals.deliveryWeeksMax || existing?.deliveryWeeksMax || "",
      taskId: task.id || existing?.taskId,
    });
  }
  return Array.from(map.values());
}
