"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

import { KanbanTablero } from "@/components/admin/KanbanTablero";
import { PublicStatusEditorModal } from "@/components/admin/PublicStatusEditorModal";
import { AsignarPendienteModal } from "@/components/kanban/AsignarPendienteModal";
import { useAuthContext } from "@/contexts/AuthContext";
import {
  getTasksFromLocalStorage,
  kanbanTasksUpdatedEventName,
  taskPublicCode,
  type KanbanTask,
} from "@/lib/kanban";
import { EMPLEADO_DASHBOARD_USER as CURRENT_USER } from "@/lib/empleado-dashboard-user";
import { fetchAssignableUsers } from "@/lib/axios/usuariosApi";
import {
  isTaskAssignedToEmpleado,
  loadKanbanTasksForEmpleadoView,
  taskIsConfirmado,
  taskIsEnProcesoPipeline,
  taskIsInactivo,
} from "@/lib/empleado-kanban-filters";

export default function EmpleadoDashboard() {
  const router = useRouter();
  const { user } = useAuthContext();
  const currentUserName = user?.nombre?.trim() || CURRENT_USER;
  const currentUserId = user?.id ?? user?._id ?? null;
  const empleadoMatch = useMemo(
    () => ({ nombre: currentUserName, userId: currentUserId }),
    [currentUserName, currentUserId],
  );
  const [teamMembers, setTeamMembers] = useState<{ id: string; name: string }[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isPublicEditorOpen, setIsPublicEditorOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [kanbanTasks, setKanbanTasks] = useState<KanbanTask[]>([]);
  const [selectedPublicTaskId, setSelectedPublicTaskId] = useState<string | null>(null);

  useEffect(() => {
    void fetchAssignableUsers()
      .then((users) => setTeamMembers(users.map((user) => ({ id: user.id ?? user._id ?? user.correo, name: user.nombre }))))
      .catch(() => setTeamMembers([]));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const load = async () => {
      const tasks = await loadKanbanTasksForEmpleadoView();
      setKanbanTasks(tasks);
    };

    void load();
  }, [refreshTrigger]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncDropdownFromKanban = () => {
      setKanbanTasks(getTasksFromLocalStorage());
    };

    window.addEventListener(kanbanTasksUpdatedEventName, syncDropdownFromKanban);
    return () => window.removeEventListener(kanbanTasksUpdatedEventName, syncDropdownFromKanban);
  }, []);

  /** Todas las tareas asignadas al empleado que tienen código (incluye confirmadas e inactivas). */
  const myTasksWithCode = useMemo(() => {
    return kanbanTasks.filter(
      (t) => Boolean(taskPublicCode(t)) && isTaskAssignedToEmpleado(t, empleadoMatch),
    );
  }, [empleadoMatch, kanbanTasks]);

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
        <button
          type="button"
          onClick={() => setIsAssignModalOpen(true)}
          className="flex shrink-0 items-center gap-2 self-start rounded-2xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 sm:self-center"
        >
          Asignar pendiente
        </button>
      </div>

      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-lg backdrop-blur-md"
      >
        <KanbanTablero
          filterByEmployee={currentUserName}
          filterByEmployeeUserId={currentUserId}
          pipelineFilter={taskIsEnProcesoPipeline}
          refreshTrigger={refreshTrigger}
          teamMembers={teamMembers}
          allowDeleteTask={false}
          allowFollowUpDecisions={false}
          disableKanbanMemoryTimer
          onKanbanTasksChange={setKanbanTasks}
        />
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
      >
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
              {selectedPublicTask && taskPublicCode(selectedPublicTask)
                ? `Cliente ${taskPublicCode(selectedPublicTask)} · ${selectedPublicTask.project ?? selectedPublicTask.title}`
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
                          {taskPublicCode(t)} · {t.project ?? t.title}
                        </option>
                      ))}
                    </optgroup>
                  ) : null}
                  {tasksConfirmados.length > 0 ? (
                    <optgroup label="Confirmados">
                      {tasksConfirmados.map((t) => (
                        <option key={t.id} value={t.id}>
                          {taskPublicCode(t)} · {t.project ?? t.title}
                        </option>
                      ))}
                    </optgroup>
                  ) : null}
                  {tasksInactivos.length > 0 ? (
                    <optgroup label="Inactivos/Descartados">
                      {tasksInactivos.map((t) => (
                        <option key={t.id} value={t.id}>
                          {taskPublicCode(t)} · {t.project ?? t.title}
                        </option>
                      ))}
                    </optgroup>
                  ) : null}
                </select>
              </label>
            ) : null}
            <button
              type="button"
              disabled={!selectedPublicTask || !taskPublicCode(selectedPublicTask)}
              onClick={() => setIsPublicEditorOpen(true)}
              className="rounded-2xl bg-primary px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Editar Estatus Público
            </button>
          </div>
        </div>
      </motion.section>

      {isPublicEditorOpen && selectedPublicTask && taskPublicCode(selectedPublicTask) ? (
        <PublicStatusEditorModal
          open
          onClose={() => setIsPublicEditorOpen(false)}
          role="employee"
          codigoProyecto={taskPublicCode(selectedPublicTask)}
          subtitle={`${selectedPublicTask.project ?? selectedPublicTask.title}`}
          onSaved={() => setRefreshTrigger((t) => t + 1)}
        />
      ) : null}

      <AsignarPendienteModal
        open={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        onCreated={() => setRefreshTrigger((tick) => tick + 1)}
        teamMembers={teamMembers}
        defaultAssigneeName={currentUserName}
        defaultAssigneeId={currentUserId}
      />
    </div>
  );
}
