"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Calendar, Download, FileText, Loader2, RotateCcw, User, X, XCircle } from "lucide-react";

import { useAdminWorkflow } from "@/contexts/AdminWorkflowContext";
import { getAssignedLabel, isTaskDiscarded, type AdminWorkflowTask } from "@/lib/admin-workflow";
import { getCotizacionesFormalesList, getPreliminarList } from "@/lib/kanban";
import { downloadFormalPdf, downloadPreliminarPdf } from "@/lib/pdf-preliminar";
import { useClienteArchivos } from "@/hooks/useClienteArchivos";

const stageLabel: Record<string, string> = {
	citas: "Citas",
	disenos: "Diseños",
	cotizacion: "Cotización",
	contrato: "Seguimiento",
};

const stageToneClass: Record<string, string> = {
	citas: "bg-sky-100 text-sky-700 border-sky-500",
	disenos: "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-500",
	cotizacion: "bg-indigo-100 text-indigo-700 border-indigo-500",
	contrato: "bg-emerald-100 text-emerald-700 border-emerald-500",
};

const formatDate = (timestamp: number | undefined): string => {
	if (!timestamp) return "Sin fecha";
	const date = new Date(timestamp);
	return date.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
};

const splitIntoColumns = <T,>(items: T[], columnCount: number): T[][] => {
	if (items.length === 0) return [];
	const count = Math.max(1, Math.min(columnCount, items.length));
	const columns = Array.from({ length: count }, () => [] as T[]);

	items.forEach((item, index) => {
		columns[index % count].push(item);
	});

	return columns;
};

export default function ProyectosInactivosPage() {
	const { refresh, reactivateTask } = useAdminWorkflow();
	const [tasks, setTasks] = useState<AdminWorkflowTask[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [savingTaskId, setSavingTaskId] = useState<string | null>(null);
	const [selectedTask, setSelectedTask] = useState<AdminWorkflowTask | null>(null);
	const selectedTaskClientFiles = useClienteArchivos(selectedTask?.clientId, Boolean(selectedTask));

	const load = async () => {
		try {
			const loadedTasks = await refresh();
			setTasks(loadedTasks.filter(isTaskDiscarded));
			setError(null);
		} catch (currentError) {
			setError(currentError instanceof Error ? currentError.message : "No se pudieron cargar proyectos inactivos");
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		void load();
	}, [refresh]);

	const taskColumns = useMemo(() => splitIntoColumns(tasks, 3), [tasks]);

	const handleReactivate = async (task: AdminWorkflowTask) => {
		setSavingTaskId(task.id);
		try {
			await reactivateTask(task);
			if (selectedTask?.id === task.id) {
				setSelectedTask(null);
			}
			await load();
		} catch (currentError) {
			setError(currentError instanceof Error ? currentError.message : "No se pudo reactivar el proyecto");
		} finally {
			setSavingTaskId(null);
		}
	};

	if (isLoading) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<Loader2 className="h-8 w-8 animate-spin text-primary" />
			</div>
		);
	}

	if (error) {
		return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>;
	}

	return (
		<div className="min-h-screen bg-background px-4 py-8 md:px-8">
			<div className="mx-auto max-w-6xl">
				<div className="mb-8">
					<Link href="/admin" className="inline-flex items-center gap-2 text-sm text-secondary hover:text-primary">
						<ArrowLeft className="h-4 w-4" />
						Volver al panel
					</Link>
				</div>

				<motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
					<div className="mb-2 flex items-center gap-3">
						<div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
							<XCircle className="h-6 w-6 text-primary" />
						</div>
						<div>
							<p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">Administración</p>
							<h1 className="text-2xl font-semibold text-primary">Proyectos inactivos</h1>
						</div>
					</div>
					<p className="mt-2 text-sm text-secondary">
						Proyectos que no continuaron, pero se conservan para seguimiento futuro.
					</p>
				</motion.div>

				<motion.div
					initial={{ opacity: 0, y: 16 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.4, delay: 0.1 }}
					className="mt-8"
				>
					{tasks.length === 0 ? (
						<div className="rounded-3xl border border-primary/10 bg-white p-12 text-center">
							<div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
								<User className="h-8 w-8 text-secondary" />
							</div>
							<p className="mt-4 text-lg font-medium text-primary">No hay proyectos inactivos</p>
							<p className="mt-2 text-sm text-secondary">Los proyectos que no continúen aparecerán aquí.</p>
						</div>
					) : (
						<div className="flex flex-col gap-4 md:flex-row md:items-start">
							{taskColumns.map((column, colIdx) => (
								<div key={colIdx} className="flex min-w-0 flex-1 flex-col gap-4">
									{column.map((task) => {
										const tone = stageToneClass[task.stage] ?? "bg-primary/10 text-primary border-primary";
										return (
											<div
												key={task.id}
												className={`min-w-0 rounded-2xl border border-primary/10 bg-white p-5 shadow-sm transition hover:shadow-md border-l-4 ${tone.split(" ")[2]}`}
											>
												<div className="flex items-start justify-between gap-3">
													<div className="flex min-w-0 flex-1 items-start gap-3">
														<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10">
															<XCircle className="h-5 w-5 text-primary" />
														</div>
														<div className="min-w-0">
															<p className="text-[10px] font-semibold uppercase tracking-wide text-secondary">Proyecto</p>
															<h3 className="break-words text-base font-semibold text-primary">{task.project}</h3>
															<p className="mt-0.5 text-sm text-secondary">{task.title}</p>
															{task.codigoProyecto ? (
																<p className="mt-2 break-all text-[11px] text-secondary">
																	Código: <span className="font-semibold text-primary">{task.codigoProyecto}</span>
																</p>
															) : null}
														</div>
													</div>
													<span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${tone}`}>
														{stageLabel[task.stage] ?? task.stage}
													</span>
												</div>

												<div className="mt-4 border-t border-primary/10 pt-4 text-xs text-secondary">
													<div>Asignado: {getAssignedLabel(task)}</div>
													<div className="mt-1 inline-flex items-center gap-1">
														<Calendar className="h-3.5 w-3.5" />
														{formatDate(task.createdAt)}
													</div>
												</div>

												<div className="mt-5 grid gap-2">
													<button
														type="button"
														onClick={() => setSelectedTask(task)}
														className="w-full rounded-xl bg-accent py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-95"
													>
														Abrir expediente
													</button>
													<button
														type="button"
														onClick={() => void handleReactivate(task)}
														disabled={savingTaskId === task.id}
														className="flex w-full items-center justify-center gap-2 rounded-xl border border-primary/10 bg-white py-3 text-sm font-semibold text-primary hover:bg-accent/10 disabled:opacity-50"
													>
														{savingTaskId === task.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
														Reactivar proyecto
													</button>
												</div>
											</div>
										);
									})}
								</div>
							))}
						</div>
					)}
				</motion.div>

				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ duration: 0.4, delay: 0.2 }}
					className="mt-8 rounded-2xl border border-primary/10 bg-primary/[0.04] px-6 py-4"
				>
					<p className="text-sm text-primary">
						<strong>Total de proyectos inactivos:</strong> {tasks.length}
					</p>
				</motion.div>
			</div>

			<AnimatePresence>
				{selectedTask ? (
					<motion.div
						key={selectedTask.id}
						className="fixed inset-0 z-[100] flex"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.2 }}
					>
						<button
							type="button"
							aria-label="Cerrar panel"
							className="h-full min-h-0 flex-1 cursor-default bg-black/50"
							onClick={() => setSelectedTask(null)}
						/>
						<motion.div
							role="dialog"
							aria-modal="true"
							aria-labelledby="inactivos-expediente-title"
							className="flex h-full w-full max-w-xl shrink-0 flex-col overflow-y-auto bg-white shadow-2xl"
							initial={{ x: "100%" }}
							animate={{ x: 0 }}
							exit={{ x: "100%" }}
							transition={{ type: "spring", damping: 25, stiffness: 200 }}
							onClick={(event) => event.stopPropagation()}
						>
							<div className="flex shrink-0 items-start justify-between gap-4 border-b border-primary/10 px-6 py-5">
								<div className="min-w-0">
									<p id="inactivos-expediente-title" className="text-lg font-semibold text-primary">
										Expediente
									</p>
									<p className="mt-1 break-words text-sm font-medium text-primary">{selectedTask.project}</p>
									<p className="text-xs text-secondary">{selectedTask.title}</p>
									{selectedTask.codigoProyecto ? (
										<p className="mt-2 break-all text-[11px] text-secondary">
											Código: <span className="font-semibold text-primary">{selectedTask.codigoProyecto}</span>
										</p>
									) : null}
								</div>
								<button
									type="button"
									onClick={() => setSelectedTask(null)}
									className="rounded-xl p-2 text-secondary hover:bg-primary/10 hover:text-primary"
									aria-label="Cerrar"
								>
									<X className="h-5 w-5" />
								</button>
							</div>

							<div className="min-h-0 flex-1 space-y-6 px-6 py-6">
								<div className="rounded-2xl bg-background p-4 text-sm text-secondary">
									<p><strong>Etapa:</strong> {stageLabel[selectedTask.stage] ?? selectedTask.stage}</p>
									<p className="mt-1"><strong>Asignado a:</strong> {getAssignedLabel(selectedTask)}</p>
									<p className="mt-1"><strong>Creado:</strong> {formatDate(selectedTask.createdAt)}</p>
								</div>

								{selectedTaskClientFiles.archivos.length > 0 ? (
									<div className="rounded-2xl border border-sky-100 bg-sky-50 p-4">
										<p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-800">Archivos del cliente</p>
										<div className="mt-3 space-y-2">
											{selectedTaskClientFiles.archivos.map((file) => (
												<a
													key={`client-file-${file.id}`}
													href={file.src}
													target="_blank"
													rel="noreferrer"
													className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-xs font-medium text-sky-900"
												>
													<span className="truncate">{file.name}</span>
													<span className="rounded-full bg-sky-100 px-2 py-1 uppercase">{file.type}</span>
												</a>
											))}
										</div>
									</div>
								) : null}

								{getPreliminarList(selectedTask).length > 0 ? (
									<div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
										<p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">Cotización preliminar</p>
										<div className="mt-3 space-y-2">
											{getPreliminarList(selectedTask).map((data, index) => (
												<div key={`preliminar-${index}`} className="flex items-center justify-between rounded-xl bg-white px-3 py-2">
													<span className="text-xs font-medium text-emerald-800">{data.projectType}</span>
													<button
														type="button"
														onClick={() =>
															downloadPreliminarPdf(
																data,
																`cotizacion-preliminar-${(data.projectType || "proyecto").replace(/\s+/g, "-")}-${selectedTask.project.replace(/\s+/g, "-")}.pdf`,
															)
														}
														className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 px-2.5 py-1.5 text-xs font-semibold text-emerald-800"
													>
														<Download className="h-3.5 w-3.5" />
														Descargar PDF
													</button>
												</div>
											))}
										</div>
									</div>
								) : null}

								{getCotizacionesFormalesList(selectedTask).length > 0 ? (
									<div className="rounded-2xl border border-violet-100 bg-violet-50 p-4">
										<p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-800">Cotización formal</p>
										<div className="mt-3 space-y-2">
											{getCotizacionesFormalesList(selectedTask).map((data, index) => (
												<div key={`formal-${index}`} className="flex items-center justify-between rounded-xl bg-white px-3 py-2">
													<span className="text-xs font-medium text-violet-800">{data.projectType}</span>
													<button
														type="button"
														onClick={() =>
															downloadFormalPdf(
																data,
																`cotizacion-formal-${(data.projectType || "proyecto").replace(/\s+/g, "-")}-${selectedTask.project.replace(/\s+/g, "-")}.pdf`,
															)
														}
														className="inline-flex items-center gap-1 rounded-lg bg-violet-100 px-2.5 py-1.5 text-xs font-semibold text-violet-800"
													>
														<Download className="h-3.5 w-3.5" />
														Descargar PDF
													</button>
												</div>
											))}
										</div>
									</div>
								) : null}

								{selectedTaskClientFiles.archivos.length === 0 && getPreliminarList(selectedTask).length === 0 && getCotizacionesFormalesList(selectedTask).length === 0 ? (
									<div className="rounded-2xl border border-dashed border-primary/15 bg-primary/5 px-4 py-3 text-xs text-secondary">
										<div className="flex items-center gap-2">
											<FileText className="h-4 w-4" />
											Sin archivos vinculados aún.
										</div>
									</div>
								) : null}

								<button
									type="button"
									onClick={() => void handleReactivate(selectedTask)}
									disabled={savingTaskId === selectedTask.id}
									className="flex w-full items-center justify-center gap-2 rounded-2xl border border-primary/10 bg-white py-3 text-sm font-semibold text-primary hover:bg-accent/10 disabled:opacity-50"
								>
									{savingTaskId === selectedTask.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
									Reactivar proyecto
								</button>
							</div>
						</motion.div>
					</motion.div>
				) : null}
			</AnimatePresence>
		</div>
	);
}
