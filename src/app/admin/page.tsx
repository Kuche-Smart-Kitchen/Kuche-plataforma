"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Calendar,
  CalendarX,
  CheckCircle2,
  LayoutDashboard,
  Palette,
  Tags,
  XCircle,
} from "lucide-react";

import { dueDateToSortTimestamp } from "@/lib/kanban-due-datetime";
import { syncKanbanTasksFromBackend } from "@/lib/admin-workflow";
import {
  getTasksFromLocalStorage,
  isDesignPendingAdminApproval,
  kanbanTasksUpdatedEventName,
  type KanbanTask,
  type TaskFile,
} from "@/lib/kanban";
import { obtenerTodasLasCitas } from "@/lib/axios/citasApi";

type AppointmentLike = {
  status?: string;
  assignedTo?: string | null;
  date?: string;
  time?: string;
  type?: string;
  client?: string;
};

type CitaLike = {
  nombreCliente?: string;
  fechaAgendada?: string;
  estado?: string;
  ingenieroAsignado?: string | string[] | { nombre?: string } | Array<string | { nombre?: string }> | null;
};

const getStoredArray = <T,>(key: string): T[] => {
  if (typeof window === "undefined") return [];
  try {
    const stored = window.localStorage.getItem(key);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
};

const getStoredMateriales = (): unknown[] => getStoredArray<unknown>("kuche.catalogo.precios.v1");

const mapBackendCitaToAppointment = (cita: Record<string, unknown>): CitaLike => ({
  nombreCliente: typeof cita.nombreCliente === "string" ? cita.nombreCliente : undefined,
  fechaAgendada: typeof cita.fechaAgendada === "string" ? cita.fechaAgendada : undefined,
  estado: typeof cita.estado === "string" ? cita.estado : undefined,
  ingenieroAsignado: typeof cita.ingenieroAsignado === "string"
    ? cita.ingenieroAsignado
    : Array.isArray(cita.ingenieroAsignado)
      ? cita.ingenieroAsignado
      : typeof cita.ingenieroAsignado === "object" && cita.ingenieroAsignado !== null
        ? { nombre: typeof (cita.ingenieroAsignado as { nombre?: unknown }).nombre === "string" ? (cita.ingenieroAsignado as { nombre?: string }).nombre : undefined }
        : undefined,
});

const formatDateLabel = (date: Date) => {
  const formatted = new Intl.DateTimeFormat("es-MX", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
};

const getGreeting = (date: Date) => {
  const hour = date.getHours();
  if (hour < 12) {
    return "Buenos días";
  }
  if (hour < 19) {
    return "Buenas tardes";
  }
  return "Buenas noches";
};

const formatTime = (isoString: string) => {
  try {
    return new Intl.DateTimeFormat("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(isoString));
  } catch {
    return "--:--";
  }
};

const estadoToType: Record<string, string> = {
  programada: "Levantamiento / Medidas",
  en_proceso: "Cotización en sitio",
  completada: "Presentación de diseño",
  cancelada: "Cancelada",
};

const isTaskConfirmed = (task: { followUpStatus?: string }) => (task.followUpStatus ?? "").toLowerCase() === "confirmado";
const isTaskDiscarded = (task: { followUpStatus?: string }) => (task.followUpStatus ?? "").toLowerCase() === "descartado";

type DashboardTask = {
  id: string;
  title: string;
  project: string;
  stage: string;
  status: string;
  assignedTo?: string[];
  dueDate?: string;
  visitScheduledAt?: string;
  createdAt: number;
  followUpStatus?: string;
  followUpEnteredAt?: number;
  designApprovedByAdmin?: boolean;
  designApprovedByClient?: boolean;
  citaStarted?: boolean;
  citaFinished?: boolean;
  files?: TaskFile[];
};

const isActiveKanbanTask = (task: Pick<DashboardTask, "status" | "followUpStatus">) =>
  !isTaskDiscarded(task) && (task.status ?? "") !== "completada";

const isUnassignedKanbanTask = (task: Pick<DashboardTask, "assignedTo">) => {
  const assignees = task.assignedTo ?? [];
  return assignees.length === 0 || assignees.every((name) => !name?.trim() || name === "Sin asignar");
};

const countPendingCitasTasks = (tasks: DashboardTask[]) =>
  tasks.filter(
    (task) => task.stage === "citas" && isActiveKanbanTask(task) && !task.citaFinished,
  ).length;

const countDesignsPendingApproval = (tasks: DashboardTask[]) =>
  tasks.filter(isDesignPendingAdminApproval).length;

type AttentionItem = {
  id: string;
  label: string;
  href: string;
};

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

const mapKanbanToDashboardTasks = (workflowTasks: KanbanTask[]): DashboardTask[] =>
  workflowTasks.map((task) => ({
    id: task.id,
    title: task.title,
    project: task.project,
    stage: task.stage,
    status: task.status,
    assignedTo: task.assignedTo,
    dueDate: task.dueDate,
    visitScheduledAt: task.dueDate,
    createdAt: task.createdAt ?? Date.now(),
    followUpStatus: task.followUpStatus,
    followUpEnteredAt: task.followUpEnteredAt,
    designApprovedByAdmin: task.designApprovedByAdmin,
    designApprovedByClient: task.designApprovedByClient,
    citaStarted: task.citaStarted,
    citaFinished: task.citaFinished,
    files: task.files,
  }));

const resolveTaskAttentionHref = (task: DashboardTask): string => {
  if (task.stage === "disenos") return "/admin/disenos";
  if (task.stage === "citas") return "/admin/operaciones";
  if (task.stage === "cotizacion" || task.stage === "contrato") return "/admin/operaciones";
  return "/admin/operaciones";
};

const buildAttentionItems = (
  tasks: DashboardTask[],
): AttentionItem[] => {
  const pendingCitas = tasks
    .filter(
      (task) =>
        task.stage === "citas" &&
        isActiveKanbanTask(task) &&
        !task.citaFinished &&
        isUnassignedKanbanTask(task),
    )
    .map((task) => ({
      id: `cita-${task.id}`,
      label: `Cita sin asignar: ${task.project || task.title || "Cliente sin nombre"}`,
      href: "/admin/operaciones",
    }));

  const reviewDesigns = tasks
    .filter(isDesignPendingAdminApproval)
    .map((task) => ({
      id: `design-${task.id}`,
      label: `Diseño listo para aprobar: ${task.project || task.title || "Proyecto sin título"}`,
      href: "/admin/disenos",
    }));

  const pendingVisits = tasks
    .filter((task) => {
      return (
        (task.stage === "citas" || task.stage === "cotizacion") &&
        isActiveKanbanTask(task) &&
        !isTaskConfirmed(task) &&
        (!task.citaStarted || !task.citaFinished)
      );
    })
    .map((task) => ({
      id: `visit-${task.id}`,
      label: `Visita pendiente de gestión: ${task.project || task.title || "Proyecto sin título"}`,
      href: resolveTaskAttentionHref(task),
    }));

  const staleFollowUpTasks = tasks.filter((task) => {
    if ((task.followUpStatus ?? "").toLowerCase() !== "pendiente") return false;
    const enteredAt = task.followUpEnteredAt ?? task.createdAt;
    return Date.now() - enteredAt > THREE_DAYS_MS;
  });

  const staleFollowUp =
    staleFollowUpTasks.length > 0
      ? [
          {
            id: "seguimiento-stale",
            label: `${staleFollowUpTasks.length} proyecto(s) sin cambios por más de 3 días`,
            href: "/admin/clientes-en-proceso",
          },
        ]
      : [];

  return [...pendingCitas, ...reviewDesigns, ...pendingVisits, ...staleFollowUp].slice(0, 8);
};

type CalendarEntry = {
  id: string;
  key: string;
  title: string;
  subtitle: string;
  timeLabel: string;
  tone: string;
  sortTimestamp: number;
};

function citaToAppointment(cita: CitaLike): AppointmentLike {
  const assigned = Array.isArray(cita.ingenieroAsignado)
    ? cita.ingenieroAsignado
        .map((item) => (typeof item === "string" ? item : item.nombre))
        .filter((value) => Boolean(value))
        .join(", ")
    : typeof cita.ingenieroAsignado === "object" && cita.ingenieroAsignado !== null
      ? cita.ingenieroAsignado.nombre
      : typeof cita.ingenieroAsignado === "string"
        ? cita.ingenieroAsignado
        : null;

  return {
    client: cita.nombreCliente,
    date: cita.fechaAgendada ? cita.fechaAgendada.slice(0, 10) : undefined,
    time: cita.fechaAgendada ? formatTime(cita.fechaAgendada) : "--:--",
    type: cita.estado ? (estadoToType[cita.estado] ?? "Visita") : "Visita",
    status: cita.estado === "programada" || cita.estado === "en_proceso" ? "Pendiente" : cita.estado,
    assignedTo: assigned,
  };
}

export default function AdminPage() {
  const [tasks, setTasks] = useState<DashboardTask[]>([]);
  const [appointments, setAppointments] = useState<AppointmentLike[]>([]);
  const [totalMaterials, setTotalMaterials] = useState(0);
  const [confirmedClients, setConfirmedClients] = useState(0);
  const [discardedClients, setDiscardedClients] = useState(0);
  const [isHydrated, setIsHydrated] = useState(false);

  const applyDashboardTasks = useCallback((workflowTasks: KanbanTask[]) => {
    const dashboardTasks = mapKanbanToDashboardTasks(workflowTasks);
    setTasks(dashboardTasks);
    setConfirmedClients(dashboardTasks.filter(isTaskConfirmed).length);
    setDiscardedClients(dashboardTasks.filter(isTaskDiscarded).length);
  }, []);

  useEffect(() => {
    const load = async () => {
      const localTasks = getTasksFromLocalStorage() as KanbanTask[];
      if (localTasks.length > 0) {
        applyDashboardTasks(localTasks);
      }

      try {
        const [citasResponse, backendSync] = await Promise.all([
          obtenerTodasLasCitas(),
          syncKanbanTasksFromBackend(),
        ]);

        const citas = citasResponse.success && Array.isArray(citasResponse.data)
          ? citasResponse.data.map(mapBackendCitaToAppointment)
          : [];
        setAppointments(citas.map(citaToAppointment));

        const materiales = getStoredMateriales();
        setTotalMaterials(materiales.length);

        applyDashboardTasks((backendSync ?? getTasksFromLocalStorage()) as KanbanTask[]);
      } catch {
        applyDashboardTasks(getTasksFromLocalStorage() as KanbanTask[]);
      } finally {
        setIsHydrated(true);
      }
    };

    void load();
  }, [applyDashboardTasks]);

  useEffect(() => {
    const refreshTasksFromKanban = () => {
      applyDashboardTasks(getTasksFromLocalStorage() as KanbanTask[]);
    };

    window.addEventListener(kanbanTasksUpdatedEventName, refreshTasksFromKanban);
    return () => {
      window.removeEventListener(kanbanTasksUpdatedEventName, refreshTasksFromKanban);
    };
  }, [applyDashboardTasks]);

  const activeTasks = useMemo(
    () =>
      tasks.filter((task) => isActiveKanbanTask(task)).length,
    [tasks],
  );

  const designsPending = useMemo(() => countDesignsPendingApproval(tasks), [tasks]);

  const pendingAppointments = useMemo(() => countPendingCitasTasks(tasks), [tasks]);

  const today = useMemo(() => new Date(), []);
  const currentMonth = useMemo(() => new Date(today.getFullYear(), today.getMonth(), 1), [today]);
  const greeting = useMemo(() => getGreeting(today), [today]);
  const dateLabel = useMemo(() => formatDateLabel(today), [today]);
  const todayKey = useMemo(() => today.toISOString().slice(0, 10), [today]);
  const todayAppointments = useMemo(
    () => appointments.filter((appointment) => appointment.date === todayKey),
    [appointments, todayKey],
  );

  const weekDays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

  const daysInMonth = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: lastDay }, (_, index) => new Date(year, month, index + 1));
  }, [currentMonth]);

  const calendarCells = useMemo(() => {
    const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const startOffset = (firstDay.getDay() + 6) % 7;
    const totalCells = startOffset + daysInMonth.length;
    const trailing = (7 - (totalCells % 7)) % 7;
    return [
      ...Array.from({ length: startOffset }, () => null),
      ...daysInMonth,
      ...Array.from({ length: trailing }, () => null),
    ];
  }, [currentMonth, daysInMonth]);

  const calendarEntries = useMemo(() => {
    const appointmentEntries = appointments.map((appointment) => {
      const sortTimestamp = dueDateToSortTimestamp(appointment.date, Date.now());
      return {
        id: `agenda-${appointment.client ?? "sin-cliente"}-${appointment.date ?? "sin-fecha"}-${appointment.time ?? "sin-hora"}`,
        key: appointment.date ?? "sin-fecha",
        title: appointment.client ?? "Cliente sin nombre",
        subtitle: appointment.type ?? "Visita",
        timeLabel: appointment.time ?? "--:--",
        tone:
          appointment.type === "Cotización en sitio"
            ? "bg-emerald-100 text-emerald-700"
            : appointment.type === "Presentación de diseño"
              ? "bg-fuchsia-100 text-fuchsia-700"
              : "bg-sky-100 text-sky-700",
        sortTimestamp,
      }; 
    });

    const taskEntries = tasks
      .filter((task) => task.status !== "completada")
      .map((task) => {
        const rawDate = task.visitScheduledAt || task.dueDate;
        if (!rawDate) return null;

        const sortTimestamp = dueDateToSortTimestamp(rawDate, task.createdAt ?? Date.now());
        return {
          id: `task-${task.id}`,
          key: rawDate.slice(0, 10),
          title: task.project || task.title || "Tarea",
          subtitle: task.title || task.stage || "Pendiente",
          timeLabel: rawDate.includes("T")
            ? new Intl.DateTimeFormat("es-MX", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              }).format(new Date(sortTimestamp))
            : "--:--",
          tone:
            task.stage === "disenos"
              ? "bg-fuchsia-100 text-fuchsia-700"
              : task.stage === "cotizacion"
                ? "bg-amber-100 text-amber-700"
                : task.stage === "contrato"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-sky-100 text-sky-700",
          sortTimestamp,
        };
      })
      .filter((entry) => entry !== null);

    return [...appointmentEntries, ...taskEntries]
      .filter((entry) => {
        const entryDate = new Date(entry.sortTimestamp);
        return entryDate.getFullYear() === currentMonth.getFullYear() && entryDate.getMonth() === currentMonth.getMonth();
      })
      .sort((a, b) => a.sortTimestamp - b.sortTimestamp);
  }, [appointments, currentMonth, tasks]);

  const calendarEntriesByDay = useMemo(() => {
    const grouped = new Map<string, CalendarEntry[]>();
    for (const entry of calendarEntries) {
      const current = grouped.get(entry.key) ?? [];
      current.push(entry);
      grouped.set(entry.key, current);
    }
    return grouped;
  }, [calendarEntries]);

  const calendarMarkedDays = useMemo(() => new Set(calendarEntriesByDay.keys()), [calendarEntriesByDay]);

  const attentionItems = useMemo(() => buildAttentionItems(tasks), [tasks]);

  const overviewCards = [
    {
      title: "Tareas activas",
      value: isHydrated ? activeTasks.toString() : "—",
      href: "/admin/operaciones",
      icon: LayoutDashboard,
      accent: "from-slate-900 to-slate-700",
      tone: "bg-slate-100 text-slate-700",
    },
    {
      title: "Diseños por aprobar",
      value: isHydrated ? designsPending.toString() : "—",
      href: "/admin/disenos",
      icon: Palette,
      accent: "from-[#8B1C1C] to-[#6F1616]",
      tone: "bg-[#F6E7E7] text-[#8B1C1C]",
    },
    {
      title: "Citas pendientes",
      value: isHydrated ? pendingAppointments.toString() : "—",
      href: "/admin/operaciones",
      icon: Calendar,
      accent: "from-[#8B1C1C] to-[#A33B3B]",
      tone: "bg-[#F8EEEE] text-[#8B1C1C]",
      attention: pendingAppointments > 0,
    },
    {
      title: "Materiales registrados",
      value: isHydrated ? totalMaterials.toString() : "—",
      href: "/admin/precios",
      icon: Tags,
      accent: "from-slate-700 to-slate-500",
      tone: "bg-slate-100 text-slate-700",
    },
    {
      title: "Clientes confirmados",
      value: isHydrated ? confirmedClients.toString() : "—",
      href: "/admin/clientes-confirmados",
      icon: CheckCircle2,
      accent: "from-[#7A7A7A] to-[#4F4F4F]",
      tone: "bg-slate-100 text-slate-800",
    },
    {
      title: "Proyectos inactivos",
      value: isHydrated ? discardedClients.toString() : "—",
      href: "/admin/clientes-descartados",
      icon: XCircle,
      accent: "from-slate-700 to-slate-500",
      tone: "bg-slate-100 text-slate-700",
    },
  ];

  return (
    <div className="relative isolate min-h-[calc(100vh-5rem)] overflow-hidden rounded-[2rem] bg-slate-50 px-0 py-0 text-slate-900">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-24 top-0 h-80 w-80 rounded-full bg-rose-200/40 blur-3xl" />
        <div className="absolute right-0 top-20 h-96 w-96 rounded-full bg-amber-200/30 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-sky-200/30 blur-3xl" />
      </div>

      <div className="space-y-7">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="overflow-hidden rounded-[1.85rem] border border-white/70 bg-gradient-to-br from-[#8B1C1C] via-[#741717] to-[#561212] p-5 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.4)] backdrop-blur-md md:p-6"
        >
          <div className="flex flex-col gap-4 text-white">
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
              {greeting}, Admin.
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-white/88">
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 font-medium">
                {dateLabel}
              </span>
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 font-medium">
                {todayAppointments.length.toString().padStart(2, "")} pendientes hoy
              </span>
            </div>
          </div>
        </motion.section>

        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-6">
          {overviewCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: index * 0.04 }}
              >
                <Link
                  href={card.href}
                  className={`group relative block overflow-hidden rounded-[1.15rem] border border-slate-200/80 bg-white/92 p-3.5 shadow-[0_10px_28px_-24px_rgba(15,23,42,0.24)] backdrop-blur-md transition-transform duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_14px_34px_-20px_rgba(15,23,42,0.26)] ${
                    card.attention ? "ring-1 ring-[#8B1C1C]/20" : ""
                  }`}
                >
                  <div className={`absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r ${card.accent}`} />
                  {card.attention ? (
                    <span className="absolute right-3 top-3 flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#8B1C1C] opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-[#8B1C1C]" />
                    </span>
                  ) : null}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                        {card.title}
                      </p>
                      <p className="mt-2 text-[1.9rem] font-semibold tracking-tight text-slate-950">
                        {card.value}
                      </p>
                    </div>
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200/70 ${card.tone}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 text-[10px] font-medium text-slate-500">
                    <span className="truncate">Entrar al módulo</span>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 transition group-hover:translate-x-1" />
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.08 }}
            className="rounded-[1.75rem] border border-white/80 bg-white/85 p-6 shadow-[0_18px_55px_-35px_rgba(15,23,42,0.3)] backdrop-blur-md"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Agenda del mes
                </p>
                <h3 className="mt-2 text-xl font-semibold text-slate-950 capitalize">
                  {currentMonth.toLocaleDateString("es-MX", { month: "long", year: "numeric" })}
                </h3>
              </div>
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500">
                {calendarMarkedDays.size} marcados
              </span>
            </div>
            {calendarCells.length > 0 ? (
              <div className="mt-4">
                <div className="grid grid-cols-7 gap-1.5 px-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  {weekDays.map((day) => (
                    <div key={day} className="px-1 py-1 text-center">
                      {day}
                    </div>
                  ))}
                </div>
                <div className="mt-2 grid grid-cols-7 grid-rows-[repeat(6,minmax(74px,1fr))] gap-1.5">
                  {calendarCells.map((date, index) => {
                    if (!date) {
                      return <div key={`empty-${index}`} className="rounded-2xl border border-transparent bg-transparent" />;
                    }

                    const dateKey = date.toISOString().slice(0, 10);
                    const hasMark = calendarMarkedDays.has(dateKey);
                    const isToday = dateKey === today.toISOString().slice(0, 10);

                    return (
                      <Link
                        key={dateKey}
                        href={`/admin/agenda?date=${dateKey}`}
                        className={`group overflow-hidden rounded-2xl border p-2 text-left transition-colors ${
                          hasMark ? "border-[#8B1C1C]/20 bg-[#8B1C1C]/5 hover:bg-[#8B1C1C]/10" : "border-gray-100 bg-white hover:bg-slate-50"
                        }`}
                        aria-label={`Abrir agenda del ${date.toLocaleDateString("es-MX", {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                        })}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className={`text-xs font-bold ${isToday ? "text-[#8B1C1C]" : "text-slate-600"}`}>
                            {date.getDate()}
                          </div>
                          {hasMark ? <span className="mt-0.5 h-2.5 w-2.5 rounded-full bg-[#8B1C1C] shadow-sm" /> : null}
                        </div>
                        <div className="mt-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-300 group-hover:text-slate-400">
                          Ver agenda
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="mt-6 flex items-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-500">
                <CalendarX className="h-5 w-5 text-slate-400" />
                No hay eventos marcados para este mes.
              </div>
            )}
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.12 }}
            className="rounded-[1.75rem] border border-rose-100 bg-gradient-to-br from-white via-rose-50/60 to-amber-50/50 p-6 shadow-[0_18px_55px_-35px_rgba(15,23,42,0.3)] backdrop-blur-md"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-rose-700/70">
                  Requiere tu atención
                </p>
                <h3 className="mt-2 text-xl font-semibold text-slate-950">Pendientes críticos</h3>
              </div>
              <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 shadow-sm">
                {attentionItems.length} hallazgos
              </span>
            </div>
            <div className="mt-6 space-y-3">
              {attentionItems.length > 0 ? (
                attentionItems.map((item) => (
                  <div
                    key={item.id}
                    className="group flex items-center justify-between gap-4 rounded-2xl border border-white/80 bg-white/90 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                      <p className="mt-1 text-xs text-slate-500">Abre el módulo correspondiente para resolverlo.</p>
                    </div>
                    <Link
                      href={item.href}
                      className="shrink-0 rounded-full bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white transition group-hover:bg-rose-700"
                    >
                      Ir a resolver
                    </Link>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-500">
                  Todo está bajo control por ahora.
                </div>
              )}
            </div>
          </motion.section>
        </div>
      </div>
    </div>
  );
}