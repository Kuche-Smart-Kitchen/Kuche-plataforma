"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle2, Plus } from "lucide-react";

import { useEscapeClose } from "@/hooks/useEscapeClose";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { DueDateInput } from "@/components/ui/DueDateInput";
import { KanbanTablero } from "@/components/admin/KanbanTablero";
import { PublicStatusEditorModal } from "@/components/admin/PublicStatusEditorModal";
import { useAuthContext } from "@/contexts/AuthContext";
import {
  kanbanColumns,
  getTasksFromLocalStorage,
  saveKanbanTasksToLocalStorage,
  type KanbanTask,
  type TaskPriority,
  type TaskStage,
} from "@/lib/kanban";
import { generatePublicProjectCode } from "@/lib/project-code";
import { EMPLEADO_DASHBOARD_USER as CURRENT_USER } from "@/lib/empleado-dashboard-user";

function isAssignedToCurrentUser(t: KanbanTask, currentUserName: string): boolean {
  return (t.assignedTo ?? []).some((n) => n === currentUserName);
}

/** Alineado con “clientes en proceso”: fuera del tablero activo si ya está confirmado o descartado en contrato. */
function taskIsEnProcesoPipeline(t: KanbanTask): boolean {
  if (
    t.stage === "contrato" &&
    (t.followUpStatus === "confirmado" || t.followUpStatus === "descartado")
  ) {
    return false;
  }
  return true;
}

function taskIsConfirmado(t: KanbanTask): boolean {
  return t.stage === "contrato" && t.followUpStatus === "confirmado";
}

/** Inactivos: descarte de seguimiento en Kanban (`followUpStatus === "descartado"`). */
function taskIsInactivo(t: KanbanTask): boolean {
  return t.followUpStatus === "descartado";
}

const defaultTeamMembers = [
  { id: "e1", name: "Valeria" },
  { id: "e2", name: "Luis" },
  { id: "e3", name: "Majo" },
  { id: "e4", name: "Carlos" },
];

function loadTeamMembers(): { id: string; name: string }[] {
  return defaultTeamMembers;
}

export default function EmpleadoDashboard() {
  const router = useRouter();
  const { user } = useAuthContext();
  const currentUserName = user?.nombre?.trim() || CURRENT_USER;
  const [teamMembers] = useState<{ id: string; name: string }[]>(() => loadTeamMembers());
  const [viewMode, setViewMode] = useState<"all" | "mine">("mine");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isPublicEditorOpen, setIsPublicEditorOpen] = useState(false);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [kanbanTasks, setKanbanTasks] = useState<KanbanTask[]>([]);
  const [selectedPublicTaskId, setSelectedPublicTaskId] = useState<string | null>(null);
  const [newTaskProject, setNewTaskProject] = useState("");
  const [newTaskStage, setNewTaskStage] = useState<TaskStage>("citas");
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>("media");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [newTaskLocation, setNewTaskLocation] = useState("");
  const [newTaskMapsUrl, setNewTaskMapsUrl] = useState("");
  const [taskError, setTaskError] = useState("");

  const newTaskModalRef = useRef<HTMLDivElement | null>(null);

  useEscapeClose(isNewTaskModalOpen, () => setIsNewTaskModalOpen(false));
  useFocusTrap(isNewTaskModalOpen, newTaskModalRef);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setKanbanTasks(getTasksFromLocalStorage());
  }, [refreshTrigger]);

  /** Todas las tareas asignadas al empleado que tienen código (incluye confirmadas e inactivas). */
  const myTasksWithCode = useMemo(() => {
    return kanbanTasks.filter((t) => Boolean(t.codigoProyecto?.trim()) && isAssignedToCurrentUser(t, currentUserName));
  }, [currentUserName, kanbanTasks]);

  const tasksProceso = useMemo(
    () => myTasksWithCode.filter(taskIsEnProcesoPipeline),
    [myTasksWithCode],
  );
  const tasksConfirmados = useMemo(
    () => myTasksWithCode.filter(taskIsConfirmado),
    [myTasksWithCode],
  );
  const tasksInactivos = useMemo(() => myTasksWithCode.filter(taskIsInactivo), [myTasksWithCode]);

  const selectedPublicTaskIdSafe = useMemo(() => {
    if (myTasksWithCode.length === 0) {
      return null;
    }

    if (!selectedPublicTaskId || !myTasksWithCode.some((t) => t.id === selectedPublicTaskId)) {
      return myTasksWithCode[0].id;
    }

    return selectedPublicTaskId;
  }, [myTasksWithCode, selectedPublicTaskId]);

  const selectedPublicTask = useMemo(
    () => myTasksWithCode.find((t) => t.id === selectedPublicTaskIdSafe) ?? null,
    [myTasksWithCode, selectedPublicTaskIdSafe],
  );

  const handleCreateTask = () => {
    const project = newTaskProject.trim();
    if (!project) {
      setTaskError("Escribe el proyecto o cliente.");
      return;
    }
    const now = Date.now();
    const newTask: KanbanTask = {
      id: `task-${now}`,
      title: project,
      stage: newTaskStage,
      status: "pendiente",
      assignedTo: [currentUserName],
      project,
      notes: "",
      files: [],
      priority: newTaskPriority,
      dueDate: newTaskDueDate.trim() || undefined,
      location: newTaskLocation.trim() || undefined,
      mapsUrl: newTaskMapsUrl.trim() || undefined,
      createdAt: now,
      codigoProyecto: generatePublicProjectCode(),
    };
    try {
      const current = getTasksFromLocalStorage();
      const next = [...current, newTask];
      if (!saveKanbanTasksToLocalStorage(next)) {
        setTaskError("No se pudo guardar la tarea.");
        return;
      }
      setRefreshTrigger((t) => t + 1);
      setIsNewTaskModalOpen(false);
      setNewTaskProject("");
      setNewTaskStage("citas");
      setNewTaskPriority("media");
      setNewTaskDueDate("");
      setNewTaskLocation("");
      setNewTaskMapsUrl("");
      setTaskError("");
    } catch {
      setTaskError("No se pudo guardar la tarea.");
    }
  };

  const openNewTaskModal = () => {
    setNewTaskProject("");
    setNewTaskStage("citas");
    setNewTaskPriority("media");
    setNewTaskDueDate("");
    setNewTaskLocation("");
    setNewTaskMapsUrl("");
    setTaskError("");
    setIsNewTaskModalOpen(true);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-secondary">Dashboard Empleado</p>
          <h1 className="mt-2 text-3xl font-semibold">Tablero general</h1>
          <p className="mt-2 text-sm text-secondary">
            Hola {currentUserName}, aquí está tu flujo de trabajo.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-2xl border border-primary/10 bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setViewMode("mine")}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                viewMode === "mine"
                  ? "bg-primary text-white"
                  : "text-secondary hover:bg-primary/5"
              }`}
            >
              Mis tareas
            </button>
            <button
              type="button"
              onClick={() => setViewMode("all")}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                viewMode === "all"
                  ? "bg-primary text-white"
                  : "text-secondary hover:bg-primary/5"
              }`}
            >
              Ver todo
            </button>
          </div>
          <button
            type="button"
            onClick={openNewTaskModal}
            className="flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Nueva tarea
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
          filterByEmployee={viewMode === "mine" ? currentUserName : null}
          pipelineFilter={taskIsEnProcesoPipeline}
          refreshTrigger={refreshTrigger}
          teamMembers={teamMembers}
          allowDeleteTask={false}
        />
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
      >
        <div className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-lg backdrop-blur-md">
          <p className="text-xs uppercase tracking-[0.3em] text-secondary">Salud del día</p>
          <h3 className="mt-2 text-xl font-semibold">Ritmo impecable</h3>
          <p className="mt-3 text-sm text-secondary">
            4 tareas completadas, 2 citas próximas y 1 diseño para validar.
          </p>
          <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-emerald-600">
            <CheckCircle2 className="h-4 w-4" />
            Todo en orden
          </div>
        </div>
        <div className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-lg backdrop-blur-md">
          <p className="text-xs uppercase tracking-[0.3em] text-secondary">Cotización</p>
          <h3 className="mt-2 text-xl font-semibold">Cotizador Pro</h3>
          <p className="mt-3 text-sm text-secondary">
            Genera estimaciones visuales y desglose técnico para taller.
          </p>
          <button
            onClick={() => router.push("/dashboard/cotizador")}
            className="mt-4 rounded-2xl bg-primary px-4 py-2 text-xs font-semibold text-white shadow"
          >
            Abrir cotizador
          </button>
        </div>
        <div className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-lg backdrop-blur-md">
          <p className="text-xs uppercase tracking-[0.3em] text-secondary">Cotización</p>
          <h3 className="mt-2 text-xl font-semibold">Levantamiento Detallado</h3>
          <p className="mt-3 text-sm text-secondary">
            Crea una estimación rápida para prospectos antes de formalizar.
          </p>
          <button
            onClick={() => router.push("/dashboard/Levantamiento-detallado")}
            className="mt-4 rounded-2xl border border-primary/20 bg-white px-4 py-2 text-xs font-semibold text-primary shadow-sm transition hover:border-primary/40"
          >
            Abrir levantamiento
          </button>
        </div>
        <div className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-lg backdrop-blur-md">
          <p className="text-xs uppercase tracking-[0.3em] text-secondary">Clientes</p>
          <h3 className="mt-2 text-xl font-semibold">Clientes en proceso</h3>
          <p className="mt-3 text-sm text-secondary">
            Ver tus clientes en proceso y los PDF de cotizaciones.
          </p>
          <button
            onClick={() => router.push("/dashboard/empleado/en-proceso")}
            className="mt-4 rounded-2xl border border-primary/20 bg-white px-4 py-2 text-xs font-semibold text-primary shadow-sm transition hover:border-primary/40"
          >
            Ver clientes
          </button>
        </div>
        <div className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-lg backdrop-blur-md">
          <p className="text-xs uppercase tracking-[0.3em] text-secondary">Clientes</p>
          <h3 className="mt-2 text-xl font-semibold">Clientes confirmados</h3>
          <p className="mt-3 text-sm text-secondary">
            Revisa proyectos confirmados y expedientes PDF en un solo lugar.
          </p>
          <button
            type="button"
            onClick={() => router.push("/dashboard/empleado/confirmados")}
            className="mt-4 rounded-2xl border border-primary/20 bg-white px-4 py-2 text-xs font-semibold text-primary shadow-sm transition hover:border-primary/40"
          >
            Ver confirmados
          </button>
        </div>
        <div className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-lg backdrop-blur-md">
          <p className="text-xs uppercase tracking-[0.3em] text-secondary">Clientes</p>
          <h3 className="mt-2 text-xl font-semibold">Proyectos inactivos</h3>
          <p className="mt-3 text-sm text-secondary">
            Consulta historial de proyectos que por ahora no continúan.
          </p>
          <button
            type="button"
            onClick={() => router.push("/dashboard/empleado/inactivos")}
            className="mt-4 rounded-2xl border border-primary/20 bg-white px-4 py-2 text-xs font-semibold text-primary shadow-sm transition hover:border-primary/40"
          >
            Ver inactivos
          </button>
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.08 }}
        className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-lg backdrop-blur-md"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-secondary">Detalles de proyecto</p>
            <h3 className="mt-2 text-xl font-semibold">
              {selectedPublicTask && selectedPublicTask.codigoProyecto
                ? `Cliente ${selectedPublicTask.codigoProyecto} · ${selectedPublicTask.project ?? selectedPublicTask.title}`
                : "Sin proyectos asignados con código"}
            </h3>
            <p className="mt-2 text-sm text-secondary">
              Actualiza el estatus público (/seguimiento) para cualquier proyecto tuyo con código
              (en proceso, confirmado o inactivo).
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:items-end">
            {myTasksWithCode.length > 0 ? (
              <label className="w-full text-xs font-semibold text-secondary sm:max-w-md">
                Proyecto
                <select
                  value={selectedPublicTaskId ?? ""}
                  onChange={(e) => setSelectedPublicTaskId(e.target.value || null)}
                  className="mt-2 w-full rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm outline-none"
                >
                  {tasksProceso.length > 0 ? (
                    <optgroup label="En Proceso">
                      {tasksProceso.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.codigoProyecto} · {t.project ?? t.title}
                        </option>
                      ))}
                    </optgroup>
                  ) : null}
                  {tasksConfirmados.length > 0 ? (
                    <optgroup label="Confirmados">
                      {tasksConfirmados.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.codigoProyecto} · {t.project ?? t.title}
                        </option>
                      ))}
                    </optgroup>
                  ) : null}
                  {tasksInactivos.length > 0 ? (
                    <optgroup label="Inactivos/Descartados">
                      {tasksInactivos.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.codigoProyecto} · {t.project ?? t.title}
                        </option>
                      ))}
                    </optgroup>
                  ) : null}
                </select>
              </label>
            ) : null}
            <button
              type="button"
              disabled={!selectedPublicTask?.codigoProyecto}
              onClick={() => setIsPublicEditorOpen(true)}
              className="rounded-2xl bg-primary px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Editar Estatus Público
            </button>
          </div>
        </div>
      </motion.section>

      {isPublicEditorOpen && selectedPublicTask?.codigoProyecto ? (
        <PublicStatusEditorModal
          open
          onClose={() => setIsPublicEditorOpen(false)}
          role="employee"
          codigoProyecto={selectedPublicTask.codigoProyecto}
          subtitle={`${selectedPublicTask.project ?? selectedPublicTask.title}`}
          onSaved={() => setRefreshTrigger((t) => t + 1)}
        />
      ) : null}

      {isNewTaskModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4 py-8">
          <motion.div
            ref={newTaskModalRef}
            tabIndex={-1}
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex max-h-[min(90dvh,calc(100dvh-2rem))] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-white/70 bg-white shadow-2xl"
          >
            <div className="shrink-0 border-b border-primary/5 px-6 pb-4 pt-6">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-gray-900">Nueva tarea</h3>
                <button
                  type="button"
                  onClick={() => setIsNewTaskModalOpen(false)}
                  className="shrink-0 rounded-full border border-primary/10 px-3 py-1 text-xs font-semibold text-secondary"
                >
                  Cerrar
                </button>
              </div>
              <p className="mt-2 text-sm text-secondary">
                La tarea será asignada automáticamente a ti ({currentUserName}).
              </p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4">
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
                Etapa
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
              <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
                Ubicación (opcional)
                <input
                  value={newTaskLocation}
                  onChange={(e) => setNewTaskLocation(e.target.value)}
                  placeholder="Ej. Col. Centro"
                  className="mt-2 w-full rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm outline-none"
                />
              </label>
              <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
                URL de Maps (opcional)
                <input
                  type="url"
                  value={newTaskMapsUrl}
                  onChange={(e) => setNewTaskMapsUrl(e.target.value)}
                  placeholder="https://maps.google.com/..."
                  className="mt-2 w-full rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm outline-none"
                />
              </label>
            </div>
            {taskError ? (
              <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-600">
                {taskError}
              </p>
            ) : null}
            </div>
            <div className="shrink-0 border-t border-primary/10 bg-white px-6 py-4">
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsNewTaskModalOpen(false)}
                  className="rounded-2xl border border-primary/10 bg-white px-5 py-2 text-xs font-semibold text-secondary"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleCreateTask}
                  className="rounded-2xl bg-primary px-5 py-2 text-xs font-semibold text-white"
                >
                  Crear tarea
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      ) : null}
    </div>
  );
}
