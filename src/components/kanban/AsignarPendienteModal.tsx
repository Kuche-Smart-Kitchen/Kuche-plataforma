"use client";

import { useEffect, useRef, useState } from "react";

import Captcha, { type CaptchaRef } from "@/components/ui/Captcha";
import { DueDateInput } from "@/components/ui/DueDateInput";
import { useEscapeClose } from "@/hooks/useEscapeClose";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useAuthContext } from "@/contexts/AuthContext";
import { isLocalLoginCaptchaBypass, LOCAL_LOGIN_CAPTCHA_BYPASS } from "@/lib/login-captcha-bypass";
import { agendarCita, asignarIngenierosCita } from "@/lib/axios/citasApi";
import { asignarTrabajadoresTarea, crearTarea } from "@/lib/axios/tareasApi";
import {
  getTasksFromLocalStorage,
  kanbanColumns,
  mergeKanbanTaskLists,
  notifyKanbanTasksUpdated,
  taskPublicCode,
  withUnifiedProjectCode,
  type KanbanTask,
  type TaskPriority,
  type TaskStage,
} from "@/lib/kanban";
import { dueDateToSortTimestamp } from "@/lib/kanban-due-datetime";
import { generatePublicProjectCode, readPersistedPublicCode } from "@/lib/project-code";

export type AsignarPendienteMember = {
  id: string;
  name: string;
};

const OBJECT_ID_PATTERN = /^[a-fA-F0-9]{24}$/;

const readEntityId = (value: unknown): string => {
  if (!value || typeof value !== "object") return "";
  const record = value as Record<string, unknown>;
  for (const key of ["_id", "id"] as const) {
    const direct = record[key];
    if (typeof direct === "string" && direct.trim()) return direct.trim();
  }
  for (const key of ["tarea", "task", "cita", "data"] as const) {
    const nested = record[key];
    if (!nested || typeof nested !== "object") continue;
    const inner = nested as Record<string, unknown>;
    const nestedId = inner._id ?? inner.id;
    if (typeof nestedId === "string" && nestedId.trim()) return nestedId.trim();
  }
  return "";
};

const objectIdOf = (value: string | null | undefined): string => {
  const id = value?.trim() ?? "";
  return OBJECT_ID_PATTERN.test(id) ? id : "";
};

const assigneeObjectId = (member: AsignarPendienteMember | null | undefined): string => objectIdOf(member?.id);

const readSaveError = (caught: unknown, citaCreada: boolean): string => {
  const response = caught && typeof caught === "object" && "response" in caught
    ? (caught as { response?: { status?: number; data?: { message?: unknown } } }).response
    : undefined;
  if (response?.status === 400 && typeof response.data?.message === "string" && response.data.message.trim()) {
    return response.data.message.trim();
  }
  if (caught instanceof Error && caught.message.trim()) return caught.message;
  return citaCreada
    ? "La cita se creó, pero falló la asignación."
    : "No se pudo guardar el pendiente en backend.";
};

const publishAssignedTask = (task: KanbanTask) => {
  const sourceId = task.sourceId?.trim();
  const code = taskPublicCode(task);
  const withoutTwin = getTasksFromLocalStorage().filter((existing) => {
    if (existing.id === task.id) return false;
    if (sourceId && (existing.id === sourceId || existing.sourceId === sourceId)) return false;
    if (code && taskPublicCode(existing) === code) return false;
    return true;
  });
  notifyKanbanTasksUpdated(mergeKanbanTaskLists(withoutTwin, [task]));
};

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  teamMembers: AsignarPendienteMember[];
  /** Nombre con el que abre «Asignar a». En el tablero del empleado es quien inició sesión. */
  defaultAssigneeName?: string;
  defaultAssigneeId?: string | null;
};

export function AsignarPendienteModal({
  open,
  onClose,
  onCreated,
  teamMembers,
  defaultAssigneeName,
  defaultAssigneeId,
}: Props) {
  const { user } = useAuthContext();
  const isAdmin = user?.rol === "admin";
  const sessionUserId = objectIdOf(user?.id) || objectIdOf(user?._id) || objectIdOf(defaultAssigneeId);
  const sessionUserName = user?.nombre?.trim() || defaultAssigneeName?.trim() || "";
  const [project, setProject] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [stage, setStage] = useState<TaskStage>("citas");
  const [assignedTo, setAssignedTo] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("media");
  const [dueDate, setDueDate] = useState("");
  const [location, setLocation] = useState("");
  const [mapsUrl, setMapsUrl] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaMountKey, setCaptchaMountKey] = useState(0);
  const captchaRef = useRef<CaptchaRef | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);

  const selfMember: AsignarPendienteMember | null = sessionUserName || sessionUserId
    ? { id: sessionUserId, name: sessionUserName || "Tú" }
    : null;
  const assigneeOptions = isAdmin
    ? teamMembers
    : selfMember
      ? [selfMember]
      : [];

  const assigneeOptionsRef = useRef(assigneeOptions);
  assigneeOptionsRef.current = assigneeOptions;
  const defaultAssigneeNameRef = useRef(defaultAssigneeName);
  defaultAssigneeNameRef.current = defaultAssigneeName;
  const defaultAssigneeIdRef = useRef(defaultAssigneeId);
  defaultAssigneeIdRef.current = defaultAssigneeId;
  const isAdminRef = useRef(isAdmin);
  isAdminRef.current = isAdmin;
  const selfMemberRef = useRef(selfMember);
  selfMemberRef.current = selfMember;

  useEscapeClose(open, onClose);
  useFocusTrap(open, modalRef);

  useEffect(() => {
    if (!open) return;
    const options = assigneeOptionsRef.current;
    const lockedSelf = selfMemberRef.current;
    const preferredName = defaultAssigneeNameRef.current;
    const preferredId = defaultAssigneeIdRef.current?.trim();
    const byName = preferredName && options.some((member) => member.name === preferredName)
      ? preferredName
      : "";
    const byId = preferredId
      ? options.find((member) => member.id === preferredId)?.name ?? ""
      : "";
    const preferred = isAdminRef.current
      ? byName || byId || options[0]?.name || "Sin asignar"
      : lockedSelf?.name || byName || byId || "";
    setProject("");
    setEmail("");
    setPhone("");
    setStage("citas");
    setAssignedTo(preferred);
    setPriority("media");
    setDueDate("");
    setLocation("");
    setMapsUrl("");
    setError("");
    setCaptchaToken("");
  }, [open]);

  const handleAssignPending = async () => {
    const projectName = project.trim();
    if (!projectName) {
      setError("Completa proyecto/cliente.");
      return;
    }
    if (
      stage === "citas" &&
      (!phone.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
    ) {
      setError("Completa un correo válido y el teléfono para agendar la cita.");
      return;
    }
    const citaTimestamp = dueDateToSortTimestamp(dueDate, 0);
    if (stage === "citas" && (!dueDate.trim() || citaTimestamp <= Date.now() + 60 * 60 * 1000)) {
      setError("Selecciona fecha y hora de la cita (día hábil, 9:00-18:00, con al menos 1 hora de anticipación).");
      return;
    }
    let captchaTokenForRequest = captchaToken.trim();
    if (stage === "citas") {
      if (!captchaTokenForRequest && isLocalLoginCaptchaBypass()) {
        captchaTokenForRequest = LOCAL_LOGIN_CAPTCHA_BYPASS;
      }
      captchaRef.current?.reset();
      setCaptchaToken("");
      setCaptchaMountKey((current) => current + 1);
      if (!captchaTokenForRequest) {
        setError("Confirma el captcha para agendar la cita.");
        return;
      }
    }

    const selectedMember = isAdmin
      ? assigneeOptions.find((member) => member.name === assignedTo)
      : selfMember;
    const wantsAssignee = isAdmin
      ? Boolean(selectedMember && assignedTo !== "Sin asignar")
      : true;
    const assignedId = wantsAssignee
      ? assigneeObjectId(selectedMember) || sessionUserId
      : "";
    const assignedName = selectedMember?.name || sessionUserName;
    if (wantsAssignee && !assignedId) {
      setError("No se pudo identificar al integrante para asignar la tarjeta.");
      return;
    }

    const showOnBoard = (task: KanbanTask) => {
      publishAssignedTask(task);
      onCreated();
      onClose();
    };

    setSaving(true);
    setError("");
    let citaCreada = false;
    try {
      if (stage === "citas") {
        const response = await agendarCita({
          nombreCliente: projectName,
          correoCliente: email.trim(),
          telefonoCliente: phone.trim(),
          ubicacion: location.trim() || undefined,
          fechaAgendada: new Date(citaTimestamp).toISOString(),
          informacionAdicional: mapsUrl.trim()
            ? `Google Maps: ${mapsUrl.trim()}`
            : "Cita creada desde Operaciones",
          estado: "programada",
        }, captchaTokenForRequest);
        if (!response.success) {
          throw new Error(response.message || "No se pudo crear la cita");
        }
        citaCreada = true;

        const citaPayload = response.data;
        const citaId = readEntityId(citaPayload);
        if (wantsAssignee && !citaId) {
          throw new Error("La cita se creó, pero el backend no devolvió su identificador para asignarla.");
        }
        let trackingCode = readPersistedPublicCode(citaPayload) ?? "";
        if (citaId && assignedId) {
          const assignment = await asignarIngenierosCita(citaId, { ingenierosIds: [assignedId] });
          if (!assignment.success) {
            throw new Error(assignment.message || "La cita se creó, pero no se pudo asignar al integrante.");
          }
          trackingCode = readPersistedPublicCode(assignment.data) || trackingCode;
        }
        const cardId = citaId || `cita-${Date.now()}`;
        showOnBoard(withUnifiedProjectCode({
          id: cardId,
          sourceId: citaId || undefined,
          sourceType: "cita",
          title: projectName,
          project: projectName,
          stage: "citas",
          status: "pendiente",
          assignedTo: assignedName ? [assignedName] : ["Sin asignar"],
          assignedToIds: assignedId ? [assignedId] : [],
          clientEmail: email.trim() || undefined,
          clientPhone: phone.trim() || undefined,
          location: location.trim() || undefined,
          mapsUrl: mapsUrl.trim() || undefined,
          dueDate: dueDate.trim() || undefined,
          priority,
          notes: "",
          createdAt: Date.now(),
          followUpStatus: "pendiente",
        }, trackingCode));
      } else {
        const codigoProyecto = generatePublicProjectCode();
        const response = await crearTarea({
          nombreProyecto: projectName,
          etapa: stage,
          estado: "pendiente",
          asignadoA: assignedId ? [assignedId] : [],
          prioridad: priority,
          ubicacion: location.trim() || undefined,
          mapsUrl: mapsUrl.trim() || undefined,
          notas: "",
          codigoProyecto,
          clienteId: codigoProyecto,
          codigo: codigoProyecto,
          codigoCliente: codigoProyecto,
          fechaLimite: dueDate.trim() || undefined,
        });
        if (!response.success) {
          throw new Error(response.message || "No se pudo crear la tarea");
        }
        const taskId = readEntityId(response.data);
        if (isAdmin && assignedId) {
          if (!taskId) {
            throw new Error("La tarea se creó, pero el backend no devolvió su identificador para asignarla.");
          }
          const assignment = await asignarTrabajadoresTarea(taskId, [assignedId]);
          if (!assignment.success) {
            throw new Error(assignment.message || "La tarea se creó, pero no se pudo asignar al integrante.");
          }
        }
        const cardId = taskId || `task-${Date.now()}`;
        showOnBoard(withUnifiedProjectCode({
          id: cardId,
          sourceId: cardId,
          sourceType: "tarea",
          title: projectName,
          project: projectName,
          stage,
          status: "pendiente" as const,
          assignedTo: assignedName ? [assignedName] : ["Sin asignar"],
          assignedToIds: assignedId ? [assignedId] : [],
          location: location.trim() || undefined,
          mapsUrl: mapsUrl.trim() || undefined,
          dueDate: dueDate.trim() || undefined,
          priority,
          notes: "",
          createdAt: Date.now(),
          followUpStatus: "pendiente" as const,
        }, codigoProyecto));
      }
      return;
    } catch (caught) {
      onCreated();
      setError(readSaveError(caught, citaCreada));
      setCaptchaToken("");
      captchaRef.current?.reset();
      setCaptchaMountKey((current) => current + 1);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        ref={modalRef}
        tabIndex={-1}
        className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-3xl border border-white/70 bg-white shadow-2xl"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-primary/5 px-6 py-4">
          <h3 className="text-lg font-semibold text-gray-900">Asignar pendiente</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-primary/10 px-3 py-1 text-xs font-semibold text-secondary"
          >
            Cerrar
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-4">
            <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
              Proyecto / Cliente
              <input
                value={project}
                onChange={(e) => setProject(e.target.value)}
                placeholder="Ej. Residencial Vega"
                className="mt-2 w-full rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm outline-none"
              />
            </label>
            {stage === "citas" ? (
              <>
                <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
                  Correo
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="cliente@correo.com"
                    className="mt-2 w-full rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm outline-none"
                  />
                </label>
                <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
                  Teléfono
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Número de contacto"
                    className="mt-2 w-full rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm outline-none"
                  />
                </label>
                <div>
                  <Captcha
                    key={captchaMountKey}
                    ref={captchaRef}
                    onVerify={setCaptchaToken}
                    onExpire={() => setCaptchaToken("")}
                    onError={() => setCaptchaToken("")}
                  />
                </div>
              </>
            ) : null}
            <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
              Dirección / Localidad
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Ej. Av. Principal 123, Col. Centro, Monterrey"
                className="mt-2 w-full rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm outline-none"
              />
              <p className="mt-1 text-[10px] text-secondary">Opcional.</p>
            </label>
            <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
              Enlace de Google Maps (opcional)
              <input
                type="url"
                value={mapsUrl}
                onChange={(e) => setMapsUrl(e.target.value)}
                placeholder="https://maps.google.com/..."
                className="mt-2 w-full rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm outline-none"
              />
              <p className="mt-1 text-[10px] text-secondary">Pega el enlace de Maps.</p>
            </label>
            <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
              Etapa inicial
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value as TaskStage)}
                className="mt-2 w-full rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm outline-none"
              >
                {kanbanColumns.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
              Asignar a
              <select
                value={isAdmin ? (assignedTo || "Sin asignar") : (selfMember?.name || assignedTo)}
                onChange={(e) => setAssignedTo(e.target.value)}
                disabled={!isAdmin}
                className="mt-2 w-full rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm outline-none disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-secondary"
              >
                {isAdmin ? <option value="Sin asignar">Sin asignar</option> : null}
                {assigneeOptions.map((member) => (
                  <option key={member.id || member.name} value={member.name}>
                    {member.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
              Prioridad
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="mt-2 w-full rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm outline-none"
              >
                <option value="alta">Alta</option>
                <option value="media">Media</option>
                <option value="baja">Baja</option>
              </select>
            </label>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
              <span className="block">
                {stage === "citas"
                  ? "Fecha y hora de la cita (día hábil, 9:00-18:00)"
                  : "Fecha límite (opcional)"}
              </span>
              <DueDateInput
                value={dueDate}
                onChange={(next) => setDueDate(next ?? "")}
                className="mt-2"
              />
            </div>
          </div>
          {error ? (
            <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-600">
              {error}
            </p>
          ) : null}
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-primary/10 bg-white px-5 py-2 text-xs font-semibold text-secondary"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void handleAssignPending()}
              disabled={saving}
              className="rounded-2xl bg-primary px-5 py-2 text-xs font-semibold text-white disabled:cursor-wait disabled:opacity-60"
            >
              {saving ? "Guardando..." : "Guardar pendiente"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
