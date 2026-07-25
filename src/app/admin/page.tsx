/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  Calendar,
  CalendarX,
  CheckCircle2,
  LayoutDashboard,
  Palette,
  Tags,
  XCircle,
} from "lucide-react";

type TaskLike = {
  status?: string;
  column?: string;
  type?: string;
  title?: string;
  client?: string;
  followUpStatus?: string;
};

type AppointmentLike = {
  status?: string;
  assignedTo?: string | null;
  date?: string;
  time?: string;
  type?: string;
  client?: string;
};

const safeParseArray = <T,>(value: string | null): T[] => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const getFirstStorageArray = <T,>(keys: string[]): T[] => {
  if (typeof window === "undefined") return [];
  for (const key of keys) {
    const parsed = safeParseArray<T>(window.localStorage.getItem(key));
    if (parsed.length > 0) return parsed;
  }
  return [];
};

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
  if (hour < 12) return "Buenos días";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
};

type AttentionRow = {
  id: string;
  label: string;
  href: string;
  status: "Pendiente" | "En revisión";
};

export default function AdminPage() {
  const [tasks, setTasks] = useState<TaskLike[]>([]);
  const [kanbanTasks, setKanbanTasks] = useState<TaskLike[]>([]);
  const [appointments, setAppointments] = useState<AppointmentLike[]>([]);
  const [catalogItems, setCatalogItems] = useState<unknown[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const loadDashboardStorage = () => {
      // Operaciones y seguimiento (nuevo + legado)
      const kanbanRows = getFirstStorageArray<TaskLike>([
        "kuche-kanban-tasks",
        "kuche_kanban_tasks",
      ]);
      // Agenda de admin (nuevo + legado booking público)
      const agendaRows = getFirstStorageArray<AppointmentLike>([
        "kuche_agenda_events",
        "kuche_appointments",
      ]);
      // Catálogo de precios (nuevo + legado)
      const catalogRows = getFirstStorageArray<unknown>([
        "kuche.catalogo.precios.v1",
        "kuche_catalogo_precios",
        "kuche.catalogoKuche.v1",
      ]);

      // `tasks` y `kanbanTasks` se alimentan del mismo origen de board
      setTasks(kanbanRows);
      setKanbanTasks(kanbanRows);
      setAppointments(agendaRows);
      setCatalogItems(catalogRows);
    };

    loadDashboardStorage();
    setIsHydrated(true);

    // Mantiene el dashboard en sync si cambian módulos/ventanas.
    const onStorage = () => loadDashboardStorage();
    const onFocus = () => loadDashboardStorage();
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  const activeTasks = useMemo(
    () =>
      tasks.filter((task) => {
        const rawStatus = task.status ?? task.column ?? "";
        const status = String(rawStatus).trim().toLowerCase();
        // Compatibilidad: datos nuevos (`completada`) y legados (`completado`)
        return status !== "completada" && status !== "completado";
      }).length,
    [tasks],
  );

  const designsPending = useMemo(
    () =>
      tasks.filter((task) => {
        const status = task.status ?? task.column ?? "";
        return status === "Revisión" || status === "En Diseño";
      }).length,
    [tasks],
  );

  const pendingAppointments = useMemo(
    () =>
      appointments.filter((appointment) => {
        const assigned = appointment.assignedTo ?? "";
        return appointment.status === "Pendiente" || !assigned;
      }).length,
    [appointments],
  );

  const totalMaterials = useMemo(() => catalogItems.length, [catalogItems]);

  const confirmedClients = useMemo(
    () => kanbanTasks.filter((task) => task.followUpStatus === "confirmado").length,
    [kanbanTasks],
  );

  const discardedClients = useMemo(
    () => kanbanTasks.filter((task) => task.followUpStatus === "descartado").length,
    [kanbanTasks],
  );
  const clientsInProcess = useMemo(
    () =>
      kanbanTasks.filter((task) => {
        const status = (task.followUpStatus ?? "").toLowerCase();
        return status !== "confirmado" && status !== "descartado";
      }).length,
    [kanbanTasks],
  );

  const today = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => today.toISOString().slice(0, 10), [today]);
  const greeting = useMemo(() => getGreeting(today), [today]);
  const dateLabel = useMemo(() => formatDateLabel(today), [today]);

  const typeDotStyles: Record<string, string> = {
    "Levantamiento / Medidas": "bg-sky-500",
    "Cotización en sitio": "bg-emerald-500",
    "Presentación de diseño": "bg-purple-500",
  };

  const todayAppointments = useMemo(
    () => appointments.filter((appointment) => appointment.date === todayKey),
    [appointments, todayKey],
  );

  const attentionItems = useMemo((): AttentionRow[] => {
    const pendingAgenda = appointments
      .filter((appointment) => appointment.status === "Pendiente" || !appointment.assignedTo)
      .map((appointment) => ({
        id: `agenda-${appointment.client ?? "sin-cliente"}-${appointment.time ?? ""}`,
        label: `Cita sin asignar: ${appointment.client ?? "Cliente sin nombre"}`,
        href: "/admin/agenda",
        status: "Pendiente" as const,
      }));

    const reviewDesigns = tasks
      .filter((task) => {
        const status = task.status ?? task.column ?? "";
        return task.type?.toLowerCase() === "diseño" && status === "Revisión";
      })
      .map((task) => ({
        id: `design-${task.title ?? "sin-titulo"}`,
        label: `Diseño listo para aprobar: ${task.title ?? "Proyecto sin título"}`,
        href: "/admin/disenos",
        status: "En revisión" as const,
      }));

    return [...pendingAgenda, ...reviewDesigns];
  }, [appointments, tasks]);

  const agendaRows = todayAppointments;
  const attentionRows = attentionItems;

  const cards = [
    {
      title: "Tareas del tablero",
      value: isHydrated ? activeTasks.toString() : "—",
      href: "/admin/operaciones",
      icon: LayoutDashboard,
      accent: "bg-stone-100 text-stone-700",
    },
    {
      title: "Diseños por aprobar",
      value: isHydrated ? designsPending.toString() : "—",
      href: "/admin/disenos",
      icon: Palette,
      accent: "bg-violet-100 text-violet-700",
    },
    {
      title: "Citas pendientes",
      value: isHydrated ? pendingAppointments.toString() : "—",
      href: "/admin/agenda",
      icon: Calendar,
      accent: "bg-[#8B1C1C]/10 text-[#8B1C1C]",
      attention: pendingAppointments > 0,
    },
    {
      title: "En proceso",
      value: isHydrated ? clientsInProcess.toString() : "—",
      href: "/admin/operaciones",
      icon: Tags,
      accent: "bg-[#8B1C1C]/10 text-[#8B1C1C]",
    },
    {
      title: "Confirmados",
      value: isHydrated ? confirmedClients.toString() : "—",
      href: "/admin/clientes-confirmados",
      icon: CheckCircle2,
      accent: "bg-green-100 text-green-700",
    },
    {
      title: "Inactivos",
      value: isHydrated ? discardedClients.toString() : "—",
      href: "/admin/clientes-descartados",
      icon: XCircle,
      accent: "bg-stone-200 text-stone-700",
    },
  ];

  /* Métricas analíticas (solo lectura; mismos datos que cards / appointments) */
  const totalClientesEmbudo = confirmedClients + discardedClients;
  const conversionPorcentaje =
    isHydrated && totalClientesEmbudo > 0
      ? Math.round((confirmedClients / totalClientesEmbudo) * 1000) / 10
      : 0;
  const conversionBarPct = Math.min(100, Math.max(0, conversionPorcentaje));

  const citasHoyCount = todayAppointments.length;
  const totalCitasSistema = appointments.length;
  const citaHoySobreAgendaPct =
    isHydrated && totalCitasSistema > 0
      ? Math.min(100, Math.round((citasHoyCount / totalCitasSistema) * 1000) / 10)
      : 0;
  const citaPendienteSobreAgendaPct =
    isHydrated && totalCitasSistema > 0
      ? Math.min(100, Math.round((pendingAppointments / totalCitasSistema) * 1000) / 10)
      : 0;
  const barHoyAncho = Math.min(100, Math.max(0, citaHoySobreAgendaPct));
  const barPendienteAncho = Math.min(100, Math.max(0, citaPendienteSobreAgendaPct));

  return (
    <main className="min-h-screen bg-[#F8F1EE]">
      <div className="bg-gradient-to-r from-[#8B1C1C] to-[#6A1515] px-0 pb-24 pt-6 text-white md:px-2 md:pb-32 md:pt-10">
        <h1 className="text-3xl font-semibold">{greeting}, Admin</h1>
        <p className="mt-1 text-sm tracking-wide text-white/80">{dateLabel}</p>
      </div>

      <section className="-mt-16 mb-12 grid grid-cols-1 gap-6 px-0 md:-mt-20 md:grid-cols-2 md:px-2 lg:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          const parsedValue = Number.parseFloat(card.value);
          const numericValue = Number.isFinite(parsedValue) ? parsedValue : 0;
          const barWidth = isHydrated
            ? card.title === "Confirmados"
              ? conversionBarPct
              : card.title === "Citas pendientes"
                ? barPendienteAncho
                : card.title === "Inactivos"
                  ? Math.min(100, Math.max(8, 100 - conversionBarPct))
                  : Math.min(100, Math.max(12, numericValue * 10))
            : 0;

          return (
            <Link
              key={card.title}
              href={card.href}
              className="rounded-2xl border border-stone-100 bg-white p-6 shadow-[0_8px_30px_rgba(139,28,28,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_34px_rgba(139,28,28,0.1)]"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-stone-500">{card.title}</p>
                <Icon className="h-4 w-4 text-[#8B1C1C]/60" />
              </div>
              <p className="mt-3 text-4xl font-bold text-stone-900">{card.value}</p>
              <div className="mt-4 h-1.5 w-full rounded-full bg-stone-100">
                <div
                  className="h-full rounded-full bg-[#8B1C1C] transition-[width] duration-500"
                  style={{ width: isHydrated ? `${barWidth}%` : "0%" }}
                />
              </div>
            </Link>
          );
        })}
      </section>

      <section className="grid grid-cols-1 gap-8 px-8 pb-10 lg:grid-cols-12">
        <article className="lg:col-span-8 rounded-3xl border border-stone-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-end justify-between">
            <h2 className="text-xl font-bold text-[#8B1C1C]">Agenda de Hoy</h2>
            <p className="text-xs text-stone-500">
              {isHydrated ? `${agendaRows.length} cita(s)` : "Cargando..."}
            </p>
          </div>

          {agendaRows.length > 0 ? (
            <div className="divide-y divide-stone-50">
              <div className="grid grid-cols-[90px_1.2fr_1fr_1fr] gap-4 border-b border-stone-100 pb-2 text-xs font-semibold uppercase tracking-wider text-stone-500">
                <p>Hora</p>
                <p>Cliente</p>
                <p>Tipo</p>
                <p>Estado</p>
              </div>
              {agendaRows.map((appointment, index) => {
                const initials = (appointment.client ?? "SN")
                  .split(" ")
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((part) => part[0]?.toUpperCase() ?? "")
                  .join("");
                return (
                  <div
                    key={`${appointment.client ?? "cita"}-${appointment.time ?? ""}-${index}`}
                    className="grid grid-cols-[90px_1.2fr_1fr_1fr] items-center gap-4 py-4 text-sm"
                  >
                    <p className="font-mono text-stone-700">{appointment.time ?? "--:--"}</p>
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#8B1C1C]/10 text-[11px] font-semibold text-[#8B1C1C]">
                        {initials || "SN"}
                      </span>
                      <p className="truncate font-medium text-stone-900">{appointment.client ?? "Cliente sin nombre"}</p>
                    </div>
                    <p className="text-stone-600">{appointment.type ?? "Visita"}</p>
                    <p className="text-stone-600">{appointment.status ?? "Pendiente"}</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex min-h-[180px] flex-col items-center justify-center text-center">
              <CalendarX className="h-10 w-10 text-stone-300" />
              <p className="mt-2 text-sm text-stone-400">No hay visitas programadas para hoy.</p>
            </div>
          )}
        </article>

        <article className="lg:col-span-4 rounded-3xl border border-stone-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-end justify-between">
            <h2 className="text-xl font-bold text-[#8B1C1C]">Requiere Atención</h2>
            <p className="text-xs text-stone-500">
              {isHydrated ? `${attentionRows.length} item(s)` : "Cargando..."}
            </p>
          </div>

          {attentionRows.length > 0 ? (
            <div className="divide-y divide-stone-50">
              {attentionRows.map((item) => (
                <div key={item.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex items-start gap-3">
                    <span className="mt-1.5 h-2 w-2 rounded-full bg-[#8B1C1C]/75" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-stone-900">{item.label}</p>
                      <p className="mt-1 text-xs text-[#8B1C1C]">{item.status}</p>
                    </div>
                    <Link
                      href={item.href}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#8B1C1C]/70 transition hover:bg-[#8B1C1C]/10 hover:text-[#8B1C1C]"
                      aria-label="Abrir detalle"
                      title="Abrir detalle"
                    >
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex min-h-[180px] flex-col items-center justify-center text-center">
              <CheckCircle2 className="h-10 w-10 text-stone-300" />
              <p className="mt-2 text-sm text-stone-400">Todo está bajo control por ahora.</p>
            </div>
          )}
        </article>
      </section>
    </main>
  );
}
