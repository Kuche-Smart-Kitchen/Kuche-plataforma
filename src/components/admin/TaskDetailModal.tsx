"use client";

import { useRef, type Dispatch, type SetStateAction } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { PencilLine, UserPlus } from "lucide-react";

import { useEscapeClose } from "@/hooks/useEscapeClose";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { getCotizacionesFormalesList, kanbanColumns, type TaskPriority, type TaskStage, type TaskStatus } from "@/lib/kanban";
import type { AdminWorkflowTask } from "@/lib/admin-workflow";
import type { Usuario } from "@/lib/axios/usuariosApi";

type TaskDraft = {
  title: string;
  project: string;
  assignedToIds: string[];
  notes: string;
  priority: TaskPriority;
  dueDate: string;
  location: string;
  mapsUrl: string;
  stage: TaskStage;
  status: TaskStatus;
};

type TaskDetailModalProps = {
  activeTask: AdminWorkflowTask | null;
  isOpen: boolean;
  isSaving: boolean;
  taskModalError: string | null;
  employees: Usuario[];
  taskDraft: TaskDraft;
  setTaskDraft: Dispatch<SetStateAction<TaskDraft>>;
  onClose: () => void;
  onAssignWorkers: () => Promise<void>;
  onSaveTask: () => Promise<void>;
  onTaskAction: (task: AdminWorkflowTask, action: string) => void | Promise<void>;
};

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

const buildTrackingCodeFromTask = (task: AdminWorkflowTask) => {
  const rawTask = task as unknown as Record<string, unknown>;
  const citaRecord = rawTask.cita && typeof rawTask.cita === "object"
    ? (rawTask.cita as Record<string, unknown>)
    : null;

  const clientIdFromCita = citaRecord?.cliente && typeof citaRecord.cliente === "object"
    ? ((citaRecord.cliente as Record<string, unknown>)._id as string | undefined)
    : undefined;

  const candidates = [
    task.clientId,
    clientIdFromCita,
    typeof citaRecord?.clienteId === "string" ? citaRecord.clienteId : undefined,
    task.sourceCitaId,
    task.sourceId,
    task.id,
  ];

  const base = candidates.find((value): value is string => Boolean(value && value.trim().length > 0)) ?? task.id;
  const cleaned = base.replace(/[^a-zA-Z0-9]/g, "");
  return (cleaned || base).slice(0, 6).toUpperCase();
};

export default function TaskDetailModal({
  activeTask,
  isOpen,
  isSaving,
  taskModalError,
  employees,
  taskDraft,
  setTaskDraft,
  onClose,
  onAssignWorkers,
  onSaveTask,
  onTaskAction,
}: TaskDetailModalProps) {
  const modalRef = useRef<HTMLDivElement | null>(null);

  useEscapeClose(Boolean(isOpen), onClose);
  useFocusTrap(Boolean(isOpen), modalRef);

  if (!isOpen || !activeTask) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/40"
        onClick={onClose}
      >
        <motion.aside
          ref={modalRef}
          tabIndex={-1}
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", stiffness: 260, damping: 30 }}
          className="absolute right-0 top-0 flex h-full w-full max-w-lg flex-col rounded-l-3xl border border-white/40 bg-white/95 shadow-2xl backdrop-blur-md"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-4 border-b border-primary/10 px-6 py-5">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-secondary">Detalle de tarea</p>
              <h3 className="mt-1 text-xl font-semibold text-gray-900">{activeTask.project}</h3>
              {activeTask.stage === "disenos" ? (
                <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8B1C1C]">
                  Codigo de seguimiento: {buildTrackingCodeFromTask(activeTask)}
                </p>
              ) : null}
              <p className="mt-0.5 text-sm text-secondary">{activeTask.title}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-full border border-primary/10 px-3 py-2 text-xs font-semibold text-secondary transition hover:bg-primary/5"
            >
              Cerrar
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="space-y-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">Configuracion</p>
                <div className="mt-3 grid grid-cols-3 gap-3">
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-secondary">
                    Etapa
                    <select
                      value={taskDraft.stage}
                      onChange={(event) =>
                        setTaskDraft((prev) => ({
                          ...prev,
                          stage: event.target.value as TaskStage,
                        }))
                      }
                      className="mt-1.5 w-full rounded-2xl border border-primary/10 bg-white px-3 py-2.5 text-xs outline-none"
                    >
                      {kanbanColumns.map((column) => (
                        <option key={column.id} value={column.id}>
                          {column.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-secondary">
                    Estado
                    <select
                      value={taskDraft.status}
                      onChange={(event) =>
                        setTaskDraft((prev) => ({
                          ...prev,
                          status: event.target.value as TaskStatus,
                        }))
                      }
                      className="mt-1.5 w-full rounded-2xl border border-primary/10 bg-white px-3 py-2.5 text-xs outline-none"
                    >
                      <option value="pendiente">Pendiente</option>
                      <option value="completada">Completada</option>
                    </select>
                  </label>
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-secondary">
                    Prioridad
                    <select
                      value={taskDraft.priority}
                      onChange={(event) =>
                        setTaskDraft((prev) => ({
                          ...prev,
                          priority: event.target.value as TaskPriority,
                        }))
                      }
                      className="mt-1.5 w-full rounded-2xl border border-primary/10 bg-white px-3 py-2.5 text-xs outline-none"
                    >
                      <option value="alta">Alta</option>
                      <option value="media">Media</option>
                      <option value="baja">Baja</option>
                    </select>
                  </label>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">Responsables</p>
                  <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">
                    {taskDraft.assignedToIds.length} seleccionado{taskDraft.assignedToIds.length === 1 ? "" : "s"}
                  </span>
                </div>

                <div className="mt-3 rounded-2xl border border-primary/10 bg-white p-3">
                  {taskDraft.assignedToIds.length === 0 ? (
                    <p className="text-xs text-secondary">Sin asignar</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {taskDraft.assignedToIds.map((employeeId) => {
                        const employeeName = employees.find((emp) => emp._id === employeeId)?.nombre ?? employeeId;
                        return (
                          <span key={employeeId} className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-2.5 py-1.5 text-sm text-gray-800">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-[10px] font-semibold text-primary shadow-sm">
                              {getInitials(employeeName)}
                            </span>
                            <span className="max-w-[10rem] truncate">{employeeName}</span>
                            <button
                              type="button"
                              onClick={() =>
                                setTaskDraft((prev) => ({
                                  ...prev,
                                  assignedToIds: prev.assignedToIds.filter((id) => id !== employeeId),
                                }))
                              }
                              className="rounded-full px-1.5 text-[11px] font-semibold text-secondary transition hover:bg-rose-100 hover:text-rose-700"
                              aria-label={`Quitar a ${employeeName}`}
                            >
                              ×
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="mt-3 max-h-48 space-y-2 overflow-y-auto rounded-2xl border border-primary/10 bg-gradient-to-b from-white to-slate-50 p-2.5">
                  {employees.length === 0 ? (
                    <p className="px-2 py-3 text-xs text-secondary">No hay integrantes disponibles.</p>
                  ) : (
                    employees.map((employee) => {
                      const checked = taskDraft.assignedToIds.includes(employee._id);
                      return (
                        <button
                          key={employee._id}
                          type="button"
                          onClick={() =>
                            setTaskDraft((prev) => ({
                              ...prev,
                              assignedToIds: checked
                                ? prev.assignedToIds.filter((id) => id !== employee._id)
                                : [...prev.assignedToIds, employee._id],
                            }))
                          }
                          className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left transition ${
                            checked
                              ? "border-primary/30 bg-primary/10"
                              : "border-primary/10 bg-white hover:border-primary/20 hover:bg-primary/[0.03]"
                          }`}
                        >
                          <span className="flex min-w-0 items-center gap-2.5">
                            <span className={`flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-semibold ${checked ? "bg-primary text-white" : "bg-primary/10 text-primary"}`}>
                              {getInitials(employee.nombre)}
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate text-xs font-semibold text-gray-900">{employee.nombre}</span>
                              <span className="block truncate text-[11px] text-secondary">{employee.correo ?? "Sin correo"}</span>
                            </span>
                          </span>
                          <span className={`ml-3 rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${checked ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                            {checked ? "Activo" : "Agregar"}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {activeTask.stage === "citas" && activeTask.status === "pendiente" ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">Flujo de cita</p>
                  <div className="mt-3 space-y-2">
                    <div className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${activeTask.citaStarted ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                      {activeTask.citaStarted ? <span className="h-4 w-4 rounded-full bg-emerald-600" /> : <span className="h-4 w-4 rounded-full border-2 border-gray-300" />}
                      <span>1. Iniciar cita</span>
                    </div>
                    <div className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${activeTask.citaFinished ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                      {activeTask.citaFinished ? <span className="h-4 w-4 rounded-full bg-emerald-600" /> : <span className="h-4 w-4 rounded-full border-2 border-gray-300" />}
                      <span>2. Terminar cita</span>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {!activeTask.citaStarted ? (
                      <button
                        type="button"
                        onClick={() => void onTaskAction(activeTask, "start-cita")}
                        className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white"
                        disabled={isSaving || (activeTask.assignedToIds?.length ?? 0) === 0}
                      >
                        {(activeTask.assignedToIds?.length ?? 0) === 0 ? "Asigna responsable" : "Iniciar cita"}
                      </button>
                    ) : !activeTask.citaFinished ? (
                      <button
                        type="button"
                        onClick={() => void onTaskAction(activeTask, "finish-cita")}
                        className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white"
                        disabled={isSaving}
                      >
                        Terminar cita
                      </button>
                    ) : (
                      <span className="text-sm font-medium text-emerald-600">Cita completada</span>
                    )}
                  </div>
                </div>
              ) : null}

              {activeTask.stage === "cotizacion" ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">Flujo de cotizacion formal</p>
                  <div className="mt-3 space-y-2">
                    <div className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${activeTask.citaStarted ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                      {activeTask.citaStarted ? <span className="h-4 w-4 rounded-full bg-emerald-600" /> : <span className="h-4 w-4 rounded-full border-2 border-gray-300" />}
                      <span>1. Iniciar cotizacion</span>
                    </div>
                    <div className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${activeTask.citaFinished ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                      {activeTask.citaFinished ? <span className="h-4 w-4 rounded-full bg-emerald-600" /> : <span className="h-4 w-4 rounded-full border-2 border-gray-300" />}
                      <span>2. Terminar cotizacion</span>
                    </div>
                    <div className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${getCotizacionesFormalesList(activeTask).length > 0 ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                      {getCotizacionesFormalesList(activeTask).length > 0 ? <span className="h-4 w-4 rounded-full bg-emerald-600" /> : <span className="h-4 w-4 rounded-full border-2 border-gray-300" />}
                      <span>3. Cotizacion formal lista para entregar</span>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {!activeTask.citaStarted ? (
                      <button
                        type="button"
                        onClick={() => void onTaskAction(activeTask, "start-cotizacion")}
                        className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white"
                        disabled={isSaving}
                      >
                        Iniciar cotizacion
                      </button>
                    ) : activeTask.citaStarted && !activeTask.citaFinished ? (
                      <button
                        type="button"
                        onClick={() => void onTaskAction(activeTask, "finish-cotizacion")}
                        className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white"
                        disabled={isSaving}
                      >
                        Terminar cotizacion
                      </button>
                    ) : getCotizacionesFormalesList(activeTask).length > 0 ? (
                      <button
                        type="button"
                        onClick={() => void onTaskAction(activeTask, "pass-to-seguimiento")}
                        className="min-h-[36px] rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold leading-tight text-white"
                        disabled={isSaving}
                      >
                        Pasar a seguimiento
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {activeTask.stage === "disenos" ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">Flujo de diseño</p>
                  <div className="mt-3 space-y-2">
                    <div className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${activeTask.designApprovedByAdmin ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                      {activeTask.designApprovedByAdmin ? <span className="h-4 w-4 rounded-full bg-emerald-600" /> : <span className="h-4 w-4 rounded-full border-2 border-gray-300" />}
                      <span>1. Aprobación de admin</span>
                    </div>
                    <div className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${activeTask.designApprovedByClient ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                      {activeTask.designApprovedByClient ? <span className="h-4 w-4 rounded-full bg-emerald-600" /> : <span className="h-4 w-4 rounded-full border-2 border-gray-300" />}
                      <span>2. Aprobación de cliente</span>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {!activeTask.designApprovedByAdmin ? (
                      <button
                        type="button"
                        onClick={() => void onTaskAction(activeTask, "approve-design-admin")}
                        className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white"
                        disabled={isSaving}
                      >
                        Aprobar diseño
                      </button>
                    ) : null}
                    {!activeTask.designApprovedByClient ? (
                      <button
                        type="button"
                        onClick={() => void onTaskAction(activeTask, "approve-design-client")}
                        className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white"
                        disabled={isSaving}
                      >
                        Marcar aprobación cliente
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {activeTask.stage === "contrato" ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">Seguimiento</p>
                  <p className="mt-2 text-sm text-secondary">Este bloque mantiene el seguimiento de la tarjeta y permite ajustar responsables, estado y detalles.</p>
                </div>
              ) : null}

              {activeTask.files?.length ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">Archivos</p>
                  <div className="mt-4 space-y-2">
                    {(activeTask.files ?? []).map((file) => (
                      <div key={file.id} className="flex items-center justify-between rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm">
                        <span className="truncate pr-3">{file.name}</span>
                        <span className="shrink-0 text-xs uppercase text-secondary">{file.type}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <label className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-secondary">
                Titulo
                <input
                  value={taskDraft.title}
                  onChange={(event) => setTaskDraft((prev) => ({ ...prev, title: event.target.value }))}
                  className="mt-1.5 w-full rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm outline-none"
                />
              </label>

              <label className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-secondary">
                Proyecto / Cliente
                <input
                  value={taskDraft.project}
                  onChange={(event) => setTaskDraft((prev) => ({ ...prev, project: event.target.value }))}
                  className="mt-1.5 w-full rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm outline-none"
                />
              </label>

              <div className="grid grid-cols-1 gap-3">
                <label className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-secondary">
                  Fecha limite
                  <input
                    type="date"
                    value={taskDraft.dueDate}
                    onChange={(event) => setTaskDraft((prev) => ({ ...prev, dueDate: event.target.value }))}
                    className="mt-1.5 w-full rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm outline-none"
                  />
                </label>
                <label className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-secondary">
                  Direccion / Localidad
                  <input
                    value={taskDraft.location}
                    onChange={(event) => setTaskDraft((prev) => ({ ...prev, location: event.target.value }))}
                    className="mt-1.5 w-full rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm outline-none"
                  />
                </label>
                <label className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-secondary">
                  Enlace Google Maps
                  <input
                    type="url"
                    value={taskDraft.mapsUrl}
                    onChange={(event) => setTaskDraft((prev) => ({ ...prev, mapsUrl: event.target.value }))}
                    className="mt-1.5 w-full rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm outline-none"
                  />
                </label>
              </div>

              <label className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-secondary">
                Notas
                <textarea
                  value={taskDraft.notes}
                  onChange={(event) => setTaskDraft((prev) => ({ ...prev, notes: event.target.value }))}
                  className="mt-1.5 min-h-[120px] w-full rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm outline-none"
                />
              </label>
            </div>
          </div>

          <div className="border-t border-primary/10 px-6 py-4">
            {taskModalError ? (
              <p className="mb-3 rounded-2xl bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-600">{taskModalError}</p>
            ) : null}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-2xl border border-primary/10 bg-white px-4 py-2.5 text-xs font-semibold text-secondary transition hover:bg-primary/5"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void onAssignWorkers()}
                disabled={isSaving}
                className="flex items-center gap-2 rounded-2xl border border-primary/10 bg-white px-4 py-2.5 text-xs font-semibold text-secondary transition hover:bg-primary/5 disabled:opacity-50"
              >
                <UserPlus className="h-3.5 w-3.5" />
                Asignar
              </button>
              <button
                type="button"
                onClick={() => void onSaveTask()}
                disabled={isSaving}
                className="flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              >
                <PencilLine className="h-3.5 w-3.5" />
                Guardar
              </button>
            </div>
          </div>
        </motion.aside>
      </motion.div>
    </AnimatePresence>
  );
}