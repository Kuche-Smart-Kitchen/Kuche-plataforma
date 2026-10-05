/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Calculator, FileText, Pencil, Trash2, UserPlus } from "lucide-react";

import { DueDateInput } from "@/components/ui/DueDateInput";
import { KanbanTablero } from "@/components/admin/KanbanTablero";
import { PublicStatusEditorModal } from "@/components/admin/PublicStatusEditorModal";
import { useEscapeClose } from "@/hooks/useEscapeClose";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import {
  kanbanColumns,
  type KanbanTask,
  type TaskPriority,
  type TaskStage,
} from "@/lib/kanban";
import { generatePublicProjectCode } from "@/lib/project-code";
import { fetchBackendKanbanTasks } from "@/lib/admin-workflow";
import { crearTarea } from "@/lib/axios/tareasApi";
import {
  INTEGRANTE_ROL_OPTIONS,
  type IntegranteRolSelectable,
} from "@/lib/axios/usuariosApi";
import { useEquipoContext } from "@/contexts/EquipoContext";

const integranteRolLabel = (role: IntegranteRolSelectable) =>
  INTEGRANTE_ROL_OPTIONS.find((option) => option.value === role)?.label ?? role;

export default function OperacionesPage() {
  const router = useRouter();
  const { teamMembers, agregarIntegrante, actualizarIntegrante, eliminarIntegrante } =
    useEquipoContext();
  const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState<string>("Todos");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [newTaskProject, setNewTaskProject] = useState("");
  const [newTaskStage, setNewTaskStage] = useState<TaskStage>("citas");
  const [newTaskAssignedTo, setNewTaskAssignedTo] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>("media");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [newTaskLocation, setNewTaskLocation] = useState("");
  const [newTaskMapsUrl, setNewTaskMapsUrl] = useState("");
  const [assignError, setAssignError] = useState("");
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState<IntegranteRolSelectable>("empleado");
  const [newMemberPassword, setNewMemberPassword] = useState("");
  const [teamError, setTeamError] = useState("");
  const [teamSaving, setTeamSaving] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editingMemberName, setEditingMemberName] = useState("");
  const [editingMemberEmail, setEditingMemberEmail] = useState("");
  const [editingMemberRole, setEditingMemberRole] = useState<IntegranteRolSelectable>("empleado");
  const [editingMemberPassword, setEditingMemberPassword] = useState("");
  const [kanbanTasks, setKanbanTasks] = useState<KanbanTask[]>([]);
  const [selectedPublicTaskId, setSelectedPublicTaskId] = useState<string | null>(null);
  const [isPublicEditorOpen, setIsPublicEditorOpen] = useState(false);
  const assignModalRef = useRef<HTMLDivElement | null>(null);
  const teamModalRef = useRef<HTMLDivElement | null>(null);

  useEscapeClose(isAssignModalOpen, () => setIsAssignModalOpen(false));
  useEscapeClose(isTeamModalOpen, () => setIsTeamModalOpen(false));
  useFocusTrap(isAssignModalOpen, assignModalRef);
  useFocusTrap(isTeamModalOpen, teamModalRef);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let cancelled = false;
    const loadTasks = async () => {
      try {
        const backendTasks = await fetchBackendKanbanTasks();
        if (!cancelled) {
          setKanbanTasks(backendTasks);
        }
      } catch {
        if (!cancelled) {
          setKanbanTasks([]);
        }
      }
    };

    void loadTasks();
    return () => {
      cancelled = true;
    };
  }, [refreshTrigger]);

  const tasksWithProjectCode = useMemo(
    () => kanbanTasks.filter((t) => Boolean(t.codigoProyecto?.trim())),
    [kanbanTasks],
  );

  const selectedPublicTask = useMemo(
    () => tasksWithProjectCode.find((t) => t.id === selectedPublicTaskId) ?? null,
    [tasksWithProjectCode, selectedPublicTaskId],
  );

  useEffect(() => {
    if (tasksWithProjectCode.length === 0) {
      setSelectedPublicTaskId(null);
      return;
    }
    if (!selectedPublicTaskId || !tasksWithProjectCode.some((t) => t.id === selectedPublicTaskId)) {
      setSelectedPublicTaskId(tasksWithProjectCode[0].id);
    }
  }, [tasksWithProjectCode, selectedPublicTaskId]);

  useEffect(() => {
    if (teamMembers.length > 0 && !newTaskAssignedTo) {
      setNewTaskAssignedTo(teamMembers[0].name);
    }
  }, [teamMembers, newTaskAssignedTo]);

  const handleAssignPending = async () => {
    const project = newTaskProject.trim();
    if (!project) {
      setAssignError("Completa proyecto/cliente.");
      return;
    }

    const assignees =
      newTaskAssignedTo && newTaskAssignedTo !== "Sin asignar"
        ? [newTaskAssignedTo]
        : [];
    const codigoProyecto = generatePublicProjectCode();

    try {
      const response = await crearTarea({
        nombreProyecto: project,
        etapa: newTaskStage,
        estado: "pendiente",
        asignadoA: assignees,
        prioridad: newTaskPriority,
        ubicacion: newTaskLocation.trim() || undefined,
        mapsUrl: newTaskMapsUrl.trim() || undefined,
        notas: "",
        codigoProyecto,
        fechaLimite: newTaskDueDate.trim() || undefined,
      });

      if (!response.success) {
        throw new Error(response.message || "No se pudo crear la tarea");
      }

      setRefreshTrigger((t) => t + 1);
      setIsAssignModalOpen(false);
      setNewTaskProject("");
      setNewTaskStage("citas");
      setNewTaskAssignedTo(teamMembers[0]?.name ?? "Sin asignar");
      setNewTaskPriority("media");
      setNewTaskDueDate("");
      setNewTaskLocation("");
      setNewTaskMapsUrl("");
      setAssignError("");
    } catch {
      setAssignError("No se pudo guardar la tarea en backend.");
    }
  };

  const handleAddMember = async () => {
    const name = newMemberName.trim();
    const correo = newMemberEmail.trim();
    const password = newMemberPassword;
    if (!name || !correo) {
      setTeamError("Escribe el nombre y el correo del integrante.");
      return;
    }
    if (!password.trim()) {
      setTeamError("La contraseña inicial es obligatoria.");
      return;
    }
    if (password.length < 6) {
      setTeamError("La contraseña inicial debe tener al menos 6 caracteres.");
      return;
    }
    if (teamMembers.some((m) => m.name.toLowerCase() === name.toLowerCase())) {
      setTeamError("Ya existe un integrante con ese nombre.");
      return;
    }
    setTeamSaving(true);
    setTeamError("");
    try {
      await agregarIntegrante({ nombre: name, correo, rol: newMemberRole, password });
      setNewMemberName("");
      setNewMemberEmail("");
      setNewMemberRole("empleado");
      setNewMemberPassword("");
    } catch (err) {
      setTeamError(err instanceof Error ? err.message : "No se pudo agregar el integrante.");
    } finally {
      setTeamSaving(false);
    }
  };

  const openAssignModal = () => {
    setNewTaskProject("");
    setNewTaskStage("citas");
    setNewTaskAssignedTo(teamMembers[0]?.name ?? "Sin asignar");
    setNewTaskPriority("media");
    setNewTaskDueDate("");
    setNewTaskLocation("");
    setNewTaskMapsUrl("");
    setAssignError("");
    setIsAssignModalOpen(true);
  };

  const openTeamModal = () => {
    setNewMemberName("");
    setNewMemberEmail("");
    setNewMemberRole("empleado");
    setNewMemberPassword("");
    setEditingMemberId(null);
    setEditingMemberName("");
    setEditingMemberEmail("");
    setEditingMemberRole("empleado");
    setEditingMemberPassword("");
    setTeamError("");
    setIsTeamModalOpen(true);
  };

  const cancelMemberEdit = () => {
    setEditingMemberId(null);
    setEditingMemberName("");
    setEditingMemberEmail("");
    setEditingMemberRole("empleado");
    setEditingMemberPassword("");
    setTeamError("");
  };

  const handleSaveMemberEdit = async (id: string) => {
    const name = editingMemberName.trim();
    const email = editingMemberEmail.trim().toLowerCase();
    const password = editingMemberPassword.trim();
    if (!name) {
      setTeamError("Escribe el nombre del integrante.");
      return;
    }
    if (teamMembers.some((m) => m.id !== id && m.name.toLowerCase() === name.toLowerCase())) {
      setTeamError("Ya existe un integrante con ese nombre.");
      return;
    }
    setTeamSaving(true);
    setTeamError("");
    try {
      await actualizarIntegrante(id, {
        nombre: name,
        ...(email ? { correo: email } : {}),
        rol: editingMemberRole,
        ...(password ? { password } : {}),
      });
      cancelMemberEdit();
    } catch (err) {
      setTeamError(err instanceof Error ? err.message : "No se pudo actualizar el integrante.");
    } finally {
      setTeamSaving(false);
    }
  };

  const handleDeleteMember = async (id: string) => {
    const member = teamMembers.find((m) => m.id === id);
    if (!window.confirm(`¿Eliminar a ${member?.name ?? "este integrante"}?`)) return;
    setTeamSaving(true);
    setTeamError("");
    try {
      await eliminarIntegrante(id);
      if (editingMemberId === id) {
        cancelMemberEdit();
      }
    } catch (err) {
      setTeamError(err instanceof Error ? err.message : "No se pudo eliminar el integrante.");
    } finally {
      setTeamSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-secondary">
            Operaciones y taller
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-gray-900">
            Control de tareas y citas
          </h1>
          <p className="mt-2 text-sm text-secondary">
            Flujo: Citas → Diseño → Cotización formal → Seguimiento.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedEmployeeFilter}
            onChange={(e) => setSelectedEmployeeFilter(e.target.value)}
            className="rounded-2xl border border-primary/10 bg-white px-4 py-2.5 text-sm font-medium text-secondary shadow-sm outline-none"
          >
            <option value="Todos">Ver todo</option>
            {teamMembers.map((m) => (
              <option key={m.id} value={m.name}>
                {m.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={openTeamModal}
            className="flex items-center gap-2 rounded-2xl border border-primary/10 bg-white px-4 py-2.5 text-sm font-semibold text-secondary shadow-sm transition hover:bg-primary/5"
          >
            <UserPlus className="h-4 w-4" />
            Integrantes
          </button>
          <button
            type="button"
            onClick={openAssignModal}
            className="rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
          >
            Asignar pendiente
          </button>
        </div>
      </div>

      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-lg backdrop-blur-md"
      >
        <KanbanTablero
          filterByEmployee={selectedEmployeeFilter === "Todos" ? null : selectedEmployeeFilter}
          refreshTrigger={refreshTrigger}
          teamMembers={teamMembers}
          allowDeleteTask={true}
          allowDesignApproval={true}
        />
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-lg backdrop-blur-md"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-secondary">Seguimiento cliente</p>
            <h2 className="mt-2 text-xl font-semibold text-gray-900">Estatus público (/seguimiento)</h2>
            <p className="mt-2 text-sm text-secondary">
              Edita timeline, garantía, pagos y archivos visibles para cualquier proyecto con código.
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:max-w-md lg:w-auto lg:min-w-[280px]">
            {tasksWithProjectCode.length > 0 ? (
              <label className="text-xs font-semibold text-secondary">
                Proyecto
                <select
                  value={selectedPublicTaskId ?? ""}
                  onChange={(e) => setSelectedPublicTaskId(e.target.value || null)}
                  className="mt-2 w-full rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm font-medium text-gray-900 outline-none"
                >
                  {tasksWithProjectCode.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.codigoProyecto} · {t.project ?? t.title}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <p className="text-sm text-secondary">No hay tareas con código de proyecto en el tablero.</p>
            )}
            <button
              type="button"
              disabled={!selectedPublicTask?.codigoProyecto}
              onClick={() => setIsPublicEditorOpen(true)}
              className="rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Editar estatus público
            </button>
          </div>
        </div>
      </motion.section>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-lg backdrop-blur-md">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
              <Calculator className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-xs uppercase tracking-[0.3em] text-secondary">Cotizacion</p>
              <h3 className="mt-1 text-xl font-semibold">Cotizador Pro</h3>
              <p className="mt-2 text-sm text-secondary">
                Genera estimaciones detalladas con desglose tecnico completo para el taller.
              </p>
              <button
                type="button"
                onClick={() => router.push("/dashboard/cotizador")}
                className="mt-4 rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
              >
                Abrir Cotizador Pro
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-lg backdrop-blur-md">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10">
              <FileText className="h-6 w-6 text-accent" />
            </div>
            <div className="flex-1">
              <p className="text-xs uppercase tracking-[0.3em] text-secondary">Cotizacion</p>
              <h3 className="mt-1 text-xl font-semibold">Levantamiento Detallado</h3>
              <p className="mt-2 text-sm text-secondary">
                Crea una estimación rápida para prospectos antes de formalizar el proyecto.
              </p>
              <button
                type="button"
                onClick={() => router.push("/dashboard/Levantamiento-detallado")}
                className="mt-4 rounded-2xl border border-primary/20 bg-white px-5 py-2.5 text-sm font-semibold text-primary shadow-sm transition hover:border-primary/40"
              >
                Abrir Levantamiento
              </button>
            </div>
          </div>
        </div>
      </div>

      {isAssignModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            ref={assignModalRef}
            tabIndex={-1}
            className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-3xl border border-white/70 bg-white shadow-2xl"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-primary/5 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">Asignar pendiente</h3>
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
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
                  value={newTaskProject}
                  onChange={(e) => setNewTaskProject(e.target.value)}
                  placeholder="Ej. Residencial Vega"
                  className="mt-2 w-full rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm outline-none"
                />
              </label>
              <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
                Dirección / Localidad
                <input
                  value={newTaskLocation}
                  onChange={(e) => setNewTaskLocation(e.target.value)}
                  placeholder="Ej. Av. Principal 123, Col. Centro, Monterrey"
                  className="mt-2 w-full rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm outline-none"
                />
                <p className="mt-1 text-[10px] text-secondary">Opcional.</p>
              </label>
              <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
                Enlace de Google Maps (opcional)
                <input
                  type="url"
                  value={newTaskMapsUrl}
                  onChange={(e) => setNewTaskMapsUrl(e.target.value)}
                  placeholder="https://maps.google.com/..."
                  className="mt-2 w-full rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm outline-none"
                />
                <p className="mt-1 text-[10px] text-secondary">Pega el enlace de Maps.</p>
              </label>
              <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
                Etapa inicial
                <select
                  value={newTaskStage}
                  onChange={(e) => setNewTaskStage(e.target.value as TaskStage)}
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
                  value={newTaskAssignedTo || "Sin asignar"}
                  onChange={(e) => setNewTaskAssignedTo(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm outline-none"
                >
                  <option value="Sin asignar">Sin asignar</option>
                  {teamMembers.map((m) => (
                    <option key={m.id} value={m.name}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
                Prioridad
                <select
                  value={newTaskPriority}
                  onChange={(e) => setNewTaskPriority(e.target.value as TaskPriority)}
                  className="mt-2 w-full rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm outline-none"
                >
                  <option value="alta">Alta</option>
                  <option value="media">Media</option>
                  <option value="baja">Baja</option>
                </select>
              </label>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
                <span className="block">
                  {newTaskStage === "citas"
                    ? "Fecha de la cita (opcional)"
                    : "Fecha límite (opcional)"}
                </span>
                <DueDateInput
                  value={newTaskDueDate}
                  onChange={(next) => setNewTaskDueDate(next ?? "")}
                  className="mt-2"
                />
              </div>
            </div>
            {assignError ? (
              <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-600">
                {assignError}
              </p>
            ) : null}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="rounded-2xl border border-primary/10 bg-white px-5 py-2 text-xs font-semibold text-secondary"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleAssignPending}
                className="rounded-2xl bg-primary px-5 py-2 text-xs font-semibold text-white"
              >
                Guardar pendiente
              </button>
            </div>
            </div>
          </div>
        </div>
      ) : null}

      {isPublicEditorOpen && selectedPublicTask?.codigoProyecto ? (
        <PublicStatusEditorModal
          open
          onClose={() => setIsPublicEditorOpen(false)}
          role="admin"
          codigoProyecto={selectedPublicTask.codigoProyecto}
          subtitle={`${selectedPublicTask.project ?? selectedPublicTask.title}`}
          onSaved={() => setRefreshTrigger((t) => t + 1)}
        />
      ) : null}

      {isTeamModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4">
          <div
            ref={teamModalRef}
            tabIndex={-1}
            className="flex max-h-[90vh] w-full max-w-md flex-col rounded-3xl border border-white/70 bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Integrantes del equipo</h3>
              <button
                type="button"
                onClick={() => {
                  cancelMemberEdit();
                  setIsTeamModalOpen(false);
                }}
                className="rounded-full border border-primary/10 px-3 py-1 text-xs font-semibold text-secondary"
              >
                Cerrar
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="mt-4 space-y-2">
                <input
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  placeholder="Nombre del integrante"
                  className="w-full rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm outline-none"
                />
                <input
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  placeholder="Correo del integrante"
                  type="email"
                  className="w-full rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm outline-none"
                />
                <select
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value as IntegranteRolSelectable)}
                  className="w-full rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm outline-none"
                  disabled={teamSaving}
                >
                  {INTEGRANTE_ROL_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <input
                  type="password"
                  value={newMemberPassword}
                  onChange={(e) => setNewMemberPassword(e.target.value)}
                  placeholder="Contraseña inicial (mínimo 6 caracteres)"
                  className="w-full rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm outline-none"
                  disabled={teamSaving}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  disabled={teamSaving}
                  onClick={() => void handleAddMember()}
                  className="w-full rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {teamSaving ? "Agregando..." : "Agregar"}
                </button>
              </div>
              <div className="mt-4 space-y-2 rounded-2xl border border-primary/10 bg-white/50 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
                  Integrantes actuales
                </p>
                {teamMembers.map((m) => (
                  <div
                    key={m.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary/10 bg-white px-3 py-2"
                  >
                    {editingMemberId === m.id ? (
                      <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-end">
                        <div className="flex min-w-0 flex-1 flex-col gap-2">
                          <input
                            value={editingMemberName}
                            onChange={(e) => setEditingMemberName(e.target.value)}
                            className="w-full rounded-xl border border-primary/20 px-3 py-1.5 text-sm outline-none focus:border-primary"
                            placeholder="Nombre"
                            disabled={teamSaving}
                          />
                          <input
                            type="email"
                            value={editingMemberEmail}
                            onChange={(e) => setEditingMemberEmail(e.target.value)}
                            className="w-full rounded-xl border border-primary/20 px-3 py-1.5 text-sm outline-none focus:border-primary"
                            placeholder="Correo electrónico"
                            disabled={teamSaving}
                          />
                          <select
                            value={editingMemberRole}
                            onChange={(e) =>
                              setEditingMemberRole(e.target.value as IntegranteRolSelectable)
                            }
                            className="w-full rounded-xl border border-primary/20 px-3 py-1.5 text-sm outline-none focus:border-primary"
                            disabled={teamSaving}
                          >
                            {INTEGRANTE_ROL_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <input
                            type="password"
                            value={editingMemberPassword}
                            onChange={(e) => setEditingMemberPassword(e.target.value)}
                            className="w-full rounded-xl border border-primary/20 px-3 py-1.5 text-sm outline-none focus:border-primary"
                            placeholder="Nueva contraseña (opcional)"
                            disabled={teamSaving}
                            autoComplete="new-password"
                          />
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <button
                            type="button"
                            disabled={teamSaving}
                            onClick={cancelMemberEdit}
                            className="rounded-full border border-primary/10 px-3 py-1 text-[11px] font-semibold text-secondary"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            disabled={teamSaving}
                            onClick={() => void handleSaveMemberEdit(m.id)}
                            className="rounded-full bg-primary px-3 py-1 text-[11px] font-semibold text-white hover:bg-primary/90 disabled:opacity-60"
                          >
                            Guardar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900">{m.name}</p>
                          {m.email ? (
                            <p className="truncate text-xs text-secondary">{m.email}</p>
                          ) : null}
                          <p className="text-xs text-secondary/80">{integranteRolLabel(m.role)}</p>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <button
                            type="button"
                            disabled={teamSaving}
                            onClick={() => {
                              setEditingMemberId(m.id);
                              setEditingMemberName(m.name);
                              setEditingMemberEmail(m.email || "");
                              setEditingMemberRole(m.role);
                              setEditingMemberPassword("");
                              setTeamError("");
                            }}
                            className="inline-flex items-center gap-1 rounded-full border border-primary/10 px-3 py-1 text-[11px] font-semibold text-secondary hover:bg-primary/5"
                            title="Editar"
                          >
                            <Pencil className="h-3 w-3" />
                            Editar
                          </button>
                          <button
                            type="button"
                            disabled={teamSaving}
                            onClick={() => void handleDeleteMember(m.id)}
                            className="inline-flex items-center gap-1 rounded-full border border-rose-200 px-3 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50"
                            title="Eliminar"
                          >
                            <Trash2 className="h-3 w-3" />
                            Eliminar
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
                {teamMembers.length === 0 ? (
                  <p className="text-xs text-secondary">Sin integrantes. Agrega al menos uno.</p>
                ) : null}
              </div>
              {teamError ? (
                <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-600">
                  {teamError}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
