 "use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, CheckCircle2, FileText, Image as ImageIcon, Loader2 } from "lucide-react";

import { useEscapeClose } from "@/hooks/useEscapeClose";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import type { CotizacionFormalData, PreliminarData } from "@/lib/kanban";
import { seguimientoApi } from "@/lib/axios";
import { mergeSeguimientoFromStorage } from "@/lib/seguimiento-project";

type SeguimientoArchivo = {
  id: string;
  name: string;
  type: "pdf" | "jpg";
  src: string;
  rawType?: string;
};

type SeguimientoPayment = {
  amount: number;
  date?: string;
  receiptLabel?: string;
  receiptImage?: string;
};

type SeguimientoProject = {
  codigo: string;
  clienteId?: string;
  clienteRef?: string;
  clienteMeta?: {
    nombre?: string;
    correo?: string;
    telefono?: string;
  };
  cliente: string;
  projectType?: string;
  location?: string;
  isProspect: boolean;
  estadoProyecto: string;
  stage?: "citas" | "disenos" | "cotizacion" | "contrato";
  status?: "pendiente" | "completada";
  sourceType?: "cita" | "diseno" | null;
  notes?: string;
  inversion: number;
  fechaInicio: string;
  fechaEntrega: string;
  garantiaInicio: string;
  cotizacionPreliminarImage: string;
  cotizacionFormalImage: string;
  etapaActual: string;
  cita?: {
    fechaAgendada?: string;
    nombreCliente?: string;
    correoCliente?: string;
    telefonoCliente?: string;
    ubicacion?: string;
    informacionAdicional?: string;
  };
  visita?: {
    fechaProgramada?: string;
    aprobadaPorAdmin?: boolean;
    aprobadaPorCliente?: boolean;
  };
  pagos: {
    anticipo: SeguimientoPayment;
    segundoPago: SeguimientoPayment;
    liquidacion: SeguimientoPayment;
  };
  archivos: SeguimientoArchivo[];
  preliminarData?: PreliminarData;
  cotizacionFormalData?: CotizacionFormalData;
  preliminarCotizaciones?: PreliminarData[];
  cotizacionesFormales?: CotizacionFormalData[];
};

const emptyPayment = (): SeguimientoPayment => ({
  amount: 0,
  date: "",
  receiptLabel: "Ver Recibo",
  receiptImage: "",
});

const emptyProject: SeguimientoProject = {
  codigo: "—",
  cliente: "Por definir",
  isProspect: true,
  estadoProyecto: "Por definir",
  stage: "citas",
  status: "pendiente",
  sourceType: null,
  notes: "",
  inversion: 0,
  fechaInicio: "Por definir",
  fechaEntrega: "Por definir",
  garantiaInicio: "",
  cotizacionPreliminarImage: "",
  cotizacionFormalImage: "",
  etapaActual: "Diseño Aprobado",
  cita: undefined,
  visita: undefined,
  pagos: {
    anticipo: emptyPayment(),
    segundoPago: emptyPayment(),
    liquidacion: emptyPayment(),
  },
  archivos: [],
};

const stageLabels: Record<NonNullable<SeguimientoProject["stage"]>, string> = {
  citas: "Citas / levantamiento",
  disenos: "Diseño",
  cotizacion: "Cotización",
  contrato: "Seguimiento / contrato",
};

const detailCardClass = "rounded-3xl border border-primary/10 bg-white/95 p-5 shadow-[0_20px_60px_-30px_rgba(43,26,22,0.35)] backdrop-blur";

const normalizeEmptyText = (value?: string | null) => (value && value.trim().length > 0 ? value : "Por definir");

const normalizeSearchText = (value?: string | null) =>
  (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : null;

const readString = (record: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length > 0) return value.trim();
  }
  return "";
};

const inferFileType = (url: string, rawType = "", name = ""): "pdf" | "jpg" => {
  const haystack = normalizeSearchText(`${rawType} ${name} ${url}`);
  if (haystack.includes("pdf") || /\.pdf(?:\?|$)/i.test(url)) return "pdf";
  if (/(jpg|jpeg|png|webp|gif|bmp|svg|image|foto|imagen|render)/i.test(haystack)) return "jpg";
  return "pdf";
};

const collectRelatedFilesFromPayload = (payload: Record<string, unknown>): SeguimientoArchivo[] => {
  const files: SeguimientoArchivo[] = [];
  const seen = new Set<string>();

  const pushFile = (file: SeguimientoArchivo) => {
    const key = file.src.trim().toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    files.push(file);
  };

  const pushFromUrl = (url: unknown, name: string, rawType = "") => {
    if (typeof url !== "string" || !url.trim()) return;
    const src = url.trim();
    pushFile({
      id: `url-${files.length + 1}`,
      name,
      src,
      rawType,
      type: inferFileType(src, rawType, name),
    });
  };

  const arrayCandidates: unknown[] = [
    payload.archivos,
    payload.files,
    payload.clientFiles,
    payload.archivosCliente,
    payload.clienteArchivos,
    payload.documentos,
  ];

  arrayCandidates.forEach((candidate) => {
    if (!Array.isArray(candidate)) return;
    candidate.forEach((entry, index) => {
      const raw = asRecord(entry);
      if (!raw) return;
      const src = readString(raw, ["src", "url", "archivoUrl", "fileUrl", "ruta", "href"]);
      if (!src) return;
      const name =
        readString(raw, ["nombre", "name", "fileName", "filename", "titulo", "title", "etiqueta"]) ||
        `Archivo ${index + 1}`;
      const rawType = readString(raw, ["tipo", "type", "mimeType", "extension"]);
      pushFile({
        id: readString(raw, ["id", "_id"]) || `file-${files.length + 1}`,
        name,
        src,
        rawType,
        type: inferFileType(src, rawType, name),
      });
    });
  });

  const preliminar = asRecord(payload.preliminarData);
  pushFromUrl(preliminar?.levantamientoPdfUrl, "PDF de levantamiento", "pdf");

  const formal = asRecord(payload.cotizacionFormalData);
  pushFromUrl(formal?.formalPdfUrl, "Cotización formal PDF", "pdf");
  pushFromUrl(formal?.workshopPdfUrl, "Hoja de taller", "pdf");

  if (Array.isArray(payload.preliminarCotizaciones)) {
    payload.preliminarCotizaciones.forEach((item, index) => {
      const entry = asRecord(item);
      if (!entry) return;
      const label = readString(entry, ["projectType", "tipoProyecto"]) || `Preliminar ${index + 1}`;
      pushFromUrl(entry.levantamientoPdfUrl, `${label} · Levantamiento`, "pdf");
      pushFromUrl(entry.preliminarPdfUrl, `${label} · Cotización preliminar`, "pdf");
    });
  }

  if (Array.isArray(payload.cotizacionesFormales)) {
    payload.cotizacionesFormales.forEach((item, index) => {
      const entry = asRecord(item);
      if (!entry) return;
      const label = readString(entry, ["projectType", "tipoProyecto"]) || `Formal ${index + 1}`;
      pushFromUrl(entry.formalPdfUrl, `${label} · Cotización formal`, "pdf");
      pushFromUrl(entry.workshopPdfUrl, `${label} · Hoja de taller`, "pdf");
    });
  }

  const pagos = asRecord(payload.pagos);
  if (pagos) {
    ["anticipo", "segundoPago", "liquidacion"].forEach((key, index) => {
      const pago = asRecord(pagos[key]);
      if (!pago) return;
      const receiptLabel = readString(pago, ["receiptLabel", "label", "nombre"]) || `Recibo ${index + 1}`;
      pushFromUrl(pago.receiptImage, receiptLabel, `recibo_${index + 1}`);
    });
  }

  pushFromUrl(payload.cotizacionPreliminarImage, "Vista previa levantamiento", "imagen");
  pushFromUrl(payload.cotizacionFormalImage, "Vista previa cotización formal", "imagen");

  return files;
};

const getTimelineIndexFromProject = (project: SeguimientoProject) => {
  const directIndex = timelineSteps.indexOf(project.etapaActual as (typeof timelineSteps)[number]);
  if (directIndex >= 0) {
    return directIndex;
  }

  const estadoText = normalizeSearchText(project.estadoProyecto);
  const etapaText = normalizeSearchText(project.etapaActual);
  const notesText = normalizeSearchText(project.notes);
  const stageText = project.stage ? normalizeSearchText(stageLabels[project.stage]) : "";
  const allText = `${estadoText} ${etapaText} ${notesText} ${stageText}`;

  if (/(instal|entreg|finaliz|terminad|completad)/.test(allText)) {
    return 4;
  }
  if (/(ensambl|armad|montaj)/.test(allText)) {
    return 3;
  }
  if (/(corte|cnc)/.test(allText)) {
    return 2;
  }
  if (/(material|taller)/.test(allText)) {
    return 1;
  }
  if (/(diseno aprobado|diseno|aprobado)/.test(allText)) {
    return 0;
  }

  switch (project.stage) {
    case "citas":
      return 0;
    case "disenos":
      return 1;
    case "cotizacion":
      return 2;
    case "contrato":
      return project.status === "completada" ? 4 : 3;
    default: {
      return 0;
    }
  }
};

const getTimelineStatusLabel = (project: SeguimientoProject) => {
  const index = getTimelineIndexFromProject(project);
  return timelineSteps[index] ?? normalizeEmptyText(project.etapaActual);
};

const getProjectDetailFields = (project: SeguimientoProject) => [
  { label: "Cliente", value: normalizeEmptyText(project.cliente) },
  { label: "Proyecto", value: normalizeEmptyText(project.projectType) },
  { label: "Ubicación", value: normalizeEmptyText(project.location || project.cita?.ubicacion) },
  { label: "Estado", value: normalizeEmptyText(project.estadoProyecto) },
  { label: "Fase actual", value: normalizeEmptyText(getTimelineStatusLabel(project)) },
  { label: "Código de seguimiento", value: normalizeEmptyText(project.codigo) },
  { label: "Fecha inicio", value: normalizeEmptyText(project.fechaInicio) },
  { label: "Entrega estimada", value: normalizeEmptyText(project.fechaEntrega) },
  { label: "Garantía", value: normalizeEmptyText(project.garantiaInicio) },
];

const renderValue = (value?: string, emphasize = false) => {
  const text = normalizeEmptyText(value);
  return (
    <span className={emphasize && text !== "Por definir" ? "font-semibold text-primary" : "text-secondary"}>
      {text}
    </span>
  );
};

const timelineSteps = [
  "Diseño Aprobado",
  "Materiales en Taller",
  "Corte CNC",
  "Ensamble",
  "Instalación Final",
];

const paymentAlerts = [
  {
    step: "Diseño Aprobado",
    label: "Anticipo",
    status: "paid" as const,
    tooltip: "Pago recibido. Gracias por impulsar tu proyecto.",
  },
  {
    step: "Corte CNC",
    label: "2do Pago",
    status: "pending" as const,
    tooltip: "Recordatorio: 2do pago pendiente. Tu proyecto sigue avanzando.",
  },
  {
    step: "Instalación Final",
    label: "Liquidación",
    status: "pending" as const,
    tooltip: "Recordatorio: liquidación pendiente. Tu proyecto sigue avanzando.",
  },
];

const paymentByStep = paymentAlerts.reduce<Record<string, (typeof paymentAlerts)[number]>>(
  (acc, alert) => {
    acc[alert.step] = alert;
    return acc;
  },
  {},
);

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);

const installments = [
  { key: "anticipo", label: "Anticipo" },
  { key: "segundoPago", label: "2do pago" },
  { key: "liquidacion", label: "Liquidación" },
] as const;

const MAX_FAILED_ATTEMPTS = 5;
const LOGIN_LOCK_MS = 5 * 60 * 1000;

const normalizeTrackingCode = (value: string) =>
  value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 6);

const formatPayment = (payment: { amount: number; date?: string }) => {
  const formatted = formatCurrency(payment.amount);
  return payment.date ? `${formatted} - ${payment.date}` : formatted;
};

const summarizeFileType = (file: SeguimientoArchivo) => (file.type === "pdf" ? "PDF" : "Imagen");

const receiptTypeMatchers: Record<(typeof installments)[number]["key"], string[]> = {
  anticipo: ["recibo_1", "recibo1", "anticipo", "pago_1", "pago1"],
  segundoPago: ["recibo_2", "recibo2", "segundo", "2do", "pago_2", "pago2"],
  liquidacion: ["recibo_3", "recibo3", "liquidacion", "finiquito", "pago_3", "pago3"],
};

const findReceiptFileByKey = (
  files: SeguimientoArchivo[],
  key: (typeof installments)[number]["key"],
) => {
  const matchers = receiptTypeMatchers[key];
  return files.find((file) => {
    const haystack = `${file.rawType ?? ""} ${file.name}`.toLowerCase();
    return matchers.some((matcher) => haystack.includes(matcher));
  });
};

const GarantiaCountdown = ({ startDate }: { startDate: string }) => {
  const msInDay = 1000 * 60 * 60 * 24;
  const daysLeft = useMemo(() => {
    const start = new Date(startDate);
    const today = new Date();
    const daysPassed = Math.floor((today.getTime() - start.getTime()) / msInDay);
    return Math.max(0, 365 - daysPassed);
  }, [startDate, msInDay]);

  return (
    <div className="rounded-3xl bg-gradient-to-br from-accent/10 via-white to-white p-6 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-secondary">Garantía activa</p>
          <h3 className="mt-2 text-2xl font-semibold text-primary">
            Te quedan {daysLeft} días de cobertura
          </h3>
          <p className="mt-2 text-sm text-secondary">
            Estamos contigo durante el primer año después de la entrega.
          </p>
        </div>
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent text-white shadow-lg">
          <span className="text-xl font-semibold">{daysLeft}</span>
        </div>
      </div>
    </div>
  );
};

export default function SeguimientoPage() {
  const [codigo, setCodigo] = useState("");
  const [hasAccess, setHasAccess] = useState(false);
  const [project, setProject] = useState<SeguimientoProject | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockUntil, setLockUntil] = useState<number | null>(null);
  const [selectedImage, setSelectedImage] = useState<null | { name: string; src: string }>(
    null,
  );
  const modalRef = useRef<HTMLDivElement | null>(null);

  useEscapeClose(Boolean(selectedImage), () => setSelectedImage(null));
  useFocusTrap(Boolean(selectedImage), modalRef);

  const currentProject = project ?? emptyProject;
  const isProspect = currentProject.isProspect;
  const currentIndex = useMemo(() => getTimelineIndexFromProject(currentProject), [currentProject]);
  const currentTimelineLabel = useMemo(() => getTimelineStatusLabel(currentProject), [currentProject]);
  const totalPagado =
    currentProject.pagos.anticipo.amount +
    currentProject.pagos.segundoPago.amount +
    currentProject.pagos.liquidacion.amount;
  const restante = Math.max(0, currentProject.inversion - totalPagado);
  const infoLockedText = "Esta información se activará una vez apruebes tu proyecto.";
  const levantamientoLinkedFiles = [
    currentProject.preliminarData?.levantamientoPdfUrl,
    currentProject.cotizacionPreliminarImage,
  ].filter((value): value is string => Boolean(value && value.trim()));
  const formalLinkedFiles = [
    currentProject.cotizacionFormalData?.formalPdfUrl,
    currentProject.cotizacionFormalData?.workshopPdfUrl,
    currentProject.cotizacionFormalImage,
  ].filter((value): value is string => Boolean(value && value.trim()));
  const clientFiles = useMemo(
    () => currentProject.archivos.filter((file) => typeof file.src === "string" && file.src.trim().length > 0),
    [currentProject.archivos],
  );
  const allRelatedFiles = useMemo(() => {
    const list = [...clientFiles];
    const seen = new Set(list.map((file) => file.src.trim().toLowerCase()));

    const pushUrl = (url?: string, name?: string, rawType = "") => {
      if (!url || !url.trim()) return;
      const src = url.trim();
      const key = src.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      list.push({
        id: `related-${list.length + 1}`,
        name: name || `Archivo ${list.length + 1}`,
        src,
        rawType,
        type: inferFileType(src, rawType, name || ""),
      });
    };

    levantamientoLinkedFiles.forEach((url, index) => pushUrl(url, `Levantamiento ${index + 1}`, "pdf"));
    formalLinkedFiles.forEach((url, index) => pushUrl(url, `Formal ${index + 1}`, "pdf"));
    installments.forEach((installment, index) => {
      const payment = currentProject.pagos[installment.key];
      pushUrl(payment.receiptImage, payment.receiptLabel || `Recibo ${index + 1}`, `recibo_${index + 1}`);
    });

    return list;
  }, [clientFiles, currentProject.pagos, formalLinkedFiles, levantamientoLinkedFiles]);
  const receiptFilesByKey = useMemo(
    () => ({
      anticipo: findReceiptFileByKey(allRelatedFiles, "anticipo"),
      segundoPago: findReceiptFileByKey(allRelatedFiles, "segundoPago"),
      liquidacion: findReceiptFileByKey(allRelatedFiles, "liquidacion"),
    }),
    [allRelatedFiles],
  );

  const lockRemainingSeconds = useMemo(() => {
    if (!lockUntil) return 0;
    return Math.max(0, Math.ceil((lockUntil - Date.now()) / 1000));
  }, [lockUntil]);

  useEffect(() => {
    if (!lockUntil) return;
    if (Date.now() >= lockUntil) {
      setLockUntil(null);
      return;
    }

    const timer = setInterval(() => {
      if (Date.now() >= lockUntil) {
        setLockUntil(null);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [lockUntil]);

  return (
    <main className="min-h-screen bg-background text-primary">
      <div className="mx-auto max-w-6xl px-4 py-10 md:py-14">
        <AnimatePresence mode="wait">
          {!hasAccess ? (
            <motion.div
              key="access"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.4 }}
              className="flex min-h-[70vh] items-center justify-center"
            >
              <div className="w-full max-w-lg rounded-3xl bg-white p-10 shadow-xl">
                <h1 className="text-2xl font-semibold">Rastrea tu Proyecto Küche</h1>
                <p className="mt-2 text-sm text-secondary">
                  Ingresa tu código único para ver el avance de tu cocina.
                </p>
                <form
                  onSubmit={async (event) => {
                    event.preventDefault();

                    if (lockUntil && Date.now() < lockUntil) {
                      setCodeError(`Acceso bloqueado temporalmente. Intenta de nuevo en ${lockRemainingSeconds}s.`);
                      return;
                    }

                    const normalizedInput = normalizeTrackingCode(codigo);
                    if (normalizedInput.length !== 6) {
                      setCodeError("Ingresa un codigo valido de 6 caracteres.");
                      return;
                    }

                    try {
                      setIsAuthenticating(true);
                      const response = await seguimientoApi.autenticarSeguimientoCliente(normalizedInput);

                      if (!response.success) {
                        throw new Error(response.message || "No encontramos un proyecto con ese codigo.");
                      }

                      const payload = response.data as Record<string, unknown>;
                      const trackingToken =
                        typeof payload.token === "string" && payload.token.trim().length > 0
                          ? payload.token
                          : null;

                      const maybeProject =
                        payload && typeof payload === "object"
                          ? (payload.proyecto ?? payload.project ?? payload)
                          : payload;

                      let backendProject: unknown = maybeProject;
                      if ((!backendProject || typeof backendProject !== "object") && trackingToken) {
                        const projectResponse = await seguimientoApi.obtenerProyectoSeguimiento(
                          trackingToken,
                          normalizedInput,
                        );

                        if (!projectResponse.success) {
                          throw new Error(projectResponse.message || "No se pudo cargar el proyecto de seguimiento.");
                        }

                        const projectPayload = projectResponse.data as Record<string, unknown>;
                        backendProject =
                          projectPayload && typeof projectPayload === "object"
                            ? (projectPayload.proyecto ?? projectPayload.project ?? projectPayload)
                            : projectPayload;
                      }

                      if (!backendProject || typeof backendProject !== "object") {
                        throw new Error("Respuesta de backend invalida para seguimiento.");
                      }

                      const normalizedProject = mergeSeguimientoFromStorage(
                        backendProject as Record<string, unknown>,
                      );

                      const expectedCode = normalizeTrackingCode(
                        normalizedProject.codigo || normalizedProject.clienteId || "",
                      );
                      if (normalizedInput !== expectedCode) {
                        throw new Error("Codigo invalido para este proyecto.");
                      }

                      const mappedArchivos = collectRelatedFilesFromPayload(backendProject as Record<string, unknown>);
                      const normalizedArchivos = collectRelatedFilesFromPayload(normalizedProject as unknown as Record<string, unknown>);
                      const mergedArchivos = [...mappedArchivos];
                      const existing = new Set(mappedArchivos.map((file) => file.src.trim().toLowerCase()));
                      normalizedArchivos.forEach((file) => {
                        const key = file.src.trim().toLowerCase();
                        if (!key || existing.has(key)) return;
                        existing.add(key);
                        mergedArchivos.push(file);
                      });

                      const mergedProject: SeguimientoProject = {
                        ...emptyProject,
                        codigo: expectedCode,
                        clienteId: normalizedProject.clienteId,
                        clienteRef: normalizedProject.clienteRef,
                        clienteMeta: normalizedProject.clienteMeta,
                        cliente: normalizedProject.cliente,
                        projectType:
                          typeof normalizedProject.preliminarData?.projectType === "string"
                            ? normalizedProject.preliminarData.projectType
                            : typeof normalizedProject.cotizacionFormalData?.projectType === "string"
                              ? normalizedProject.cotizacionFormalData.projectType
                              : "",
                        location:
                          typeof normalizedProject.preliminarData?.location === "string"
                            ? normalizedProject.preliminarData.location
                            : typeof normalizedProject.cotizacionFormalData?.location === "string"
                              ? normalizedProject.cotizacionFormalData.location
                              : "",
                        isProspect: normalizedProject.isProspect,
                        inversion: normalizedProject.inversion,
                        fechaInicio: normalizedProject.fechaInicio,
                        fechaEntrega: normalizedProject.fechaEntrega,
                        garantiaInicio: normalizedProject.garantiaInicio,
                        estadoProyecto: normalizedProject.estadoProyecto,
                        stage: normalizedProject.stage,
                        status: normalizedProject.status,
                        sourceType: normalizedProject.sourceType,
                        notes: normalizedProject.notes,
                        cita: normalizedProject.cita,
                        visita: normalizedProject.visita,
                        etapaActual: normalizedProject.etapaActual,
                        pagos: normalizedProject.pagos,
                        archivos: mergedArchivos,
                        preliminarData: normalizedProject.preliminarData,
                        cotizacionFormalData: normalizedProject.cotizacionFormalData,
                        preliminarCotizaciones: normalizedProject.preliminarCotizaciones,
                        cotizacionesFormales: normalizedProject.cotizacionesFormales,
                        cotizacionPreliminarImage: normalizedProject.cotizacionPreliminarImage || "",
                        cotizacionFormalImage: normalizedProject.cotizacionFormalImage || "",
                      };

                      setProject(mergedProject);
                      setHasAccess(true);
                      setCodeError(null);
                      setFailedAttempts(0);
                      setLockUntil(null);
                    } catch (error) {
                      const nextAttempts = failedAttempts + 1;
                      setFailedAttempts(nextAttempts);
                      const backendMessage =
                        error && typeof error === "object" && "response" in error
                          ? (() => {
                              const response = (error as { response?: { data?: unknown } }).response;
                              if (response && response.data && typeof response.data === "object") {
                                const data = response.data as Record<string, unknown>;
                                return typeof data.message === "string" ? data.message : null;
                              }
                              return null;
                            })()
                          : null;

                      if (nextAttempts >= MAX_FAILED_ATTEMPTS) {
                        const blockedUntil = Date.now() + LOGIN_LOCK_MS;
                        setLockUntil(blockedUntil);
                        setCodeError("Demasiados intentos fallidos. Acceso bloqueado por 5 minutos.");
                      } else {
                        setCodeError(
                          backendMessage ||
                            (error instanceof Error ? error.message : "No pudimos validar el codigo. Intenta de nuevo."),
                        );
                      }
                    } finally {
                      setIsAuthenticating(false);
                    }
                  }}
                >
                  <label className="mt-6 block text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
                    Ingresa tu Código de Proyecto
                    <input
                      value={codigo}
                      onChange={(event) => {
                        setCodigo(event.target.value);
                        setCodeError(null);
                      }}
                      placeholder="ABC123"
                      className="mt-3 w-full rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm outline-none"
                    />
                  </label>
                  {codeError ? <p className="mt-3 text-xs font-semibold text-red-600">{codeError}</p> : null}
                  <button
                    type="submit"
                    disabled={isAuthenticating || (lockUntil !== null && Date.now() < lockUntil)}
                    className="mt-6 w-full rounded-2xl bg-accent py-3 text-sm font-semibold text-white shadow-lg transition hover:brightness-110"
                  >
                    {isAuthenticating ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Validando codigo...
                      </span>
                    ) : lockUntil !== null && Date.now() < lockUntil ? (
                      `Bloqueado (${lockRemainingSeconds}s)`
                    ) : (
                      "Ver Progreso"
                    )}
                  </button>
                </form>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.4 }}
              className="space-y-8"
            >
              <section className="overflow-hidden rounded-[2rem] border border-primary/10 bg-[linear-gradient(135deg,rgba(251,246,243,0.98),rgba(255,255,255,0.96))] px-6 py-6 shadow-[0_30px_90px_-45px_rgba(43,26,22,0.45)] md:px-8 md:py-8">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-secondary">Seguimiento</p>
                    <h1 className="mt-2 text-3xl font-semibold md:text-4xl">
                      Proyecto Residencial {currentProject.cliente}
                    </h1>
                    <p className="mt-2 max-w-2xl text-sm text-secondary">
                      Consulta el estado real de tu proyecto, sus archivos, pagos y etapa actual.
                    </p>
                    <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#8B1C1C]">
                      Codigo de seguimiento: {currentProject.codigo}
                    </p>
                    {currentProject.clienteId && currentProject.clienteId !== currentProject.codigo ? (
                      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-secondary">
                        Codigo de cliente: {currentProject.clienteId}
                      </p>
                    ) : null}
                  </div>
                  <div className="rounded-3xl border border-primary/10 bg-white px-4 py-3 text-xs text-secondary shadow-sm">
                    <span className="block text-[10px] font-semibold uppercase tracking-[0.24em] text-secondary">
                      Estado actual
                    </span>
                    <span className="mt-2 block text-sm font-semibold text-primary">
                      {currentTimelineLabel}
                    </span>
                  </div>
                </div>

                <div className="mt-6 rounded-[1.75rem] border border-primary/10 bg-white/95 p-5 shadow-[0_22px_55px_-35px_rgba(43,26,22,0.45)]">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-secondary">Timeline</p>
                      <h2 className="mt-2 text-2xl font-semibold">Progreso de tu cocina</h2>
                    </div>
                    <span className="rounded-full bg-accent/10 px-4 py-2 text-xs font-semibold text-accent">
                      {currentTimelineLabel}
                    </span>
                  </div>
                  <div className="mt-6">
                    <div className="relative h-2 rounded-full bg-primary/10">
                      <div
                        className="absolute left-0 top-0 h-2 rounded-full bg-accent"
                        style={{ width: `${(currentIndex / (timelineSteps.length - 1)) * 100}%` }}
                      />
                    </div>
                    <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-5 text-center text-xs text-secondary">
                      {timelineSteps.map((step, index) => {
                        const isCompleted = index <= currentIndex;
                        const isActive = index === currentIndex;
                        const payment = paymentByStep[step];
                        return (
                          <div
                            key={step}
                            className={`flex flex-col items-center gap-3 rounded-2xl border px-3 py-4 ${
                              isActive ? "border-accent/30 bg-accent/5" : "border-transparent bg-primary/[0.02]"
                            }`}
                          >
                            <div className="relative flex h-5 w-5 items-center justify-center">
                              <span className={`h-3 w-3 rounded-full ${isCompleted ? "bg-accent" : "bg-primary/20"}`} />
                              {isActive ? (
                                <motion.span
                                  className="absolute h-5 w-5 rounded-full border border-accent"
                                  animate={{ scale: [1, 1.4, 1], opacity: [0.8, 0, 0.8] }}
                                  transition={{ duration: 1.6, repeat: Infinity }}
                                />
                              ) : null}
                            </div>
                            <span className={isActive ? "font-semibold text-primary" : ""}>{step}</span>
                            {payment ? (
                              <div
                                className={`group relative mt-1 flex items-center gap-2 rounded-full px-2 py-1 text-[10px] font-semibold ${
                                  payment.status === "pending"
                                    ? "animate-[pulse_3.5s_ease-in-out_infinite] bg-amber-50 text-amber-500"
                                    : "bg-accent/10 text-accent"
                                }`}
                                aria-label={payment.tooltip}
                                title={payment.tooltip}
                              >
                                {payment.status === "pending" ? (
                                  <Bell className="h-3.5 w-3.5" />
                                ) : (
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                )}
                                <span>{payment.label}</span>
                                {payment.status === "pending" ? (
                                  <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-primary px-3 py-1 text-[10px] font-medium text-white opacity-0 transition group-hover:opacity-100">
                                    {payment.tooltip}
                                  </span>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {getProjectDetailFields(currentProject).map((field) => (
                    <div key={field.label} className={detailCardClass}>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-secondary">
                        {field.label}
                      </p>
                      <p className="mt-3 text-sm">{renderValue(field.value, true)}</p>
                    </div>
                  ))}

                  <div className={detailCardClass}>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-secondary">
                      Levantamiento detallado
                    </p>
                    <div className="mt-3 space-y-3 text-sm text-secondary">
                      <p className="text-sm font-medium text-primary">Archivos ligados al cliente</p>
                      <div className="grid gap-2">
                        {currentProject.preliminarData?.levantamientoPdfUrl ? (
                          <button
                            type="button"
                            className="flex items-center justify-between rounded-2xl border border-primary/10 bg-primary/[0.02] px-4 py-3 text-left text-xs font-semibold text-primary transition hover:border-accent hover:bg-accent/5"
                            onClick={() => window.open(currentProject.preliminarData?.levantamientoPdfUrl, "_blank", "noopener,noreferrer")}
                          >
                            <span>PDF de levantamiento</span>
                            <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-secondary">PDF</span>
                          </button>
                        ) : null}
                        {currentProject.cotizacionPreliminarImage ? (
                          <button
                            type="button"
                            className="flex items-center justify-between rounded-2xl border border-primary/10 bg-primary/[0.02] px-4 py-3 text-left text-xs font-semibold text-primary transition hover:border-accent hover:bg-accent/5"
                            onClick={() => setSelectedImage({ name: "Levantamiento detallado", src: currentProject.cotizacionPreliminarImage })}
                          >
                            <span>Vista previa del levantamiento</span>
                            <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-secondary">Imagen</span>
                          </button>
                        ) : null}
                        {currentProject.archivos.length === 0 && !currentProject.preliminarData?.levantamientoPdfUrl && !currentProject.cotizacionPreliminarImage ? (
                          <div className="rounded-2xl border border-dashed border-primary/15 bg-primary/5 px-4 py-3 text-xs text-secondary">
                            Sin archivos ligados al cliente por ahora.
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className={detailCardClass}>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-secondary">
                      Cotización formal
                    </p>
                    <div className="mt-3 space-y-3 text-sm text-secondary">
                      <p className="text-sm font-medium text-primary">Archivos ligados al cliente</p>
                      <div className="grid gap-2">
                        {currentProject.cotizacionFormalData?.formalPdfUrl ? (
                          <button
                            type="button"
                            className="flex items-center justify-between rounded-2xl border border-primary/10 bg-primary/[0.02] px-4 py-3 text-left text-xs font-semibold text-primary transition hover:border-accent hover:bg-accent/5"
                            onClick={() => window.open(currentProject.cotizacionFormalData?.formalPdfUrl, "_blank", "noopener,noreferrer")}
                          >
                            <span>Cotización formal PDF</span>
                            <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-secondary">PDF</span>
                          </button>
                        ) : null}
                        {currentProject.cotizacionFormalData?.workshopPdfUrl ? (
                          <button
                            type="button"
                            className="flex items-center justify-between rounded-2xl border border-primary/10 bg-primary/[0.02] px-4 py-3 text-left text-xs font-semibold text-primary transition hover:border-accent hover:bg-accent/5"
                            onClick={() => window.open(currentProject.cotizacionFormalData?.workshopPdfUrl, "_blank", "noopener,noreferrer")}
                          >
                            <span>Hoja de taller</span>
                            <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-secondary">PDF</span>
                          </button>
                        ) : null}
                        {currentProject.cotizacionFormalImage ? (
                          <button
                            type="button"
                            className="flex items-center justify-between rounded-2xl border border-primary/10 bg-primary/[0.02] px-4 py-3 text-left text-xs font-semibold text-primary transition hover:border-accent hover:bg-accent/5"
                            onClick={() => setSelectedImage({ name: "Cotización formal", src: currentProject.cotizacionFormalImage })}
                          >
                            <span>Vista previa de la cotización</span>
                            <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-secondary">Imagen</span>
                          </button>
                        ) : null}
                        {currentProject.archivos.length === 0 && !currentProject.cotizacionFormalData?.formalPdfUrl && !currentProject.cotizacionFormalData?.workshopPdfUrl && !currentProject.cotizacionFormalImage ? (
                          <div className="rounded-2xl border border-dashed border-primary/15 bg-primary/5 px-4 py-3 text-xs text-secondary">
                            Sin archivos ligados al cliente por ahora.
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 rounded-[1.75rem] border border-primary/10 bg-white/95 p-5 shadow-[0_22px_55px_-35px_rgba(43,26,22,0.45)]">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-secondary">Archivos del cliente</p>
                      <h3 className="mt-2 text-xl font-semibold">Documentos de tu proyecto</h3>
                    </div>
                    <span className="rounded-full bg-primary/5 px-4 py-2 text-xs font-semibold text-secondary">
                      {allRelatedFiles.length} archivo{allRelatedFiles.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  {allRelatedFiles.length > 0 ? (
                    <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {allRelatedFiles.map((file) => (
                        <button
                          key={file.id}
                          type="button"
                          className="flex items-center justify-between gap-3 rounded-2xl border border-primary/10 bg-primary/[0.02] px-4 py-3 text-left text-xs font-semibold text-primary transition hover:border-accent hover:bg-accent/5"
                          onClick={() => {
                            if (file.type === "jpg") {
                              setSelectedImage({ name: file.name, src: file.src });
                              return;
                            }
                            window.open(file.src, "_blank", "noopener,noreferrer");
                          }}
                        >
                          <span className="truncate">{file.name}</span>
                          <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-secondary">
                            {summarizeFileType(file)}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-4 rounded-2xl border border-dashed border-primary/15 bg-primary/5 px-4 py-3 text-xs text-secondary">
                      Aún no hay archivos disponibles para tu proyecto.
                    </div>
                  )}
                </div>

                <div className="mt-6 rounded-[1.75rem] border border-primary/10 bg-white/95 p-5 shadow-[0_22px_55px_-35px_rgba(43,26,22,0.45)]">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-secondary">Recibos</p>
                      <h3 className="mt-2 text-xl font-semibold">Espacio para los tres comprobantes</h3>
                    </div>
                    <span className="rounded-full bg-primary/5 px-4 py-2 text-xs font-semibold text-secondary">
                      Recibo 1, 2 y 3
                    </span>
                  </div>
                  {!isProspect ? (
                    <div className="mt-5 grid gap-4 lg:grid-cols-3">
                      {installments.map((item, index) => {
                        const payment = currentProject.pagos[item.key];
                        const fallbackReceipt = receiptFilesByKey[item.key];
                        const effectiveReceiptSrc =
                          typeof payment.receiptImage === "string" && payment.receiptImage.trim().length > 0
                            ? payment.receiptImage
                            : fallbackReceipt?.src;
                        const effectiveReceiptLabel =
                          typeof payment.receiptLabel === "string" && payment.receiptLabel.trim().length > 0
                            ? payment.receiptLabel
                            : fallbackReceipt?.name ?? "Ver Recibo";
                        const isImageReceipt =
                          Boolean(effectiveReceiptSrc) &&
                          ((typeof payment.receiptImage === "string" && payment.receiptImage.trim().length > 0) || fallbackReceipt?.type === "jpg");
                        return (
                          <div
                            key={item.key}
                            className="overflow-hidden rounded-3xl border border-primary/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(251,246,243,0.95))] p-4 text-xs text-secondary shadow-[0_18px_45px_-32px_rgba(43,26,22,0.45)]"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-secondary">
                                Recibo {index + 1}
                              </p>
                              <span className="rounded-full bg-accent/10 px-3 py-1 text-[10px] font-semibold text-accent">
                                {item.label}
                              </span>
                            </div>
                            <p className="mt-2 text-sm font-semibold text-primary">{formatPayment(payment)}</p>
                            <div className="mt-4 rounded-3xl border border-dashed border-primary/15 bg-white px-4 py-4">
                              <div className="flex min-h-32 items-center justify-center rounded-2xl bg-primary/[0.02] text-center text-xs text-secondary">
                                {typeof effectiveReceiptSrc === "string" && effectiveReceiptSrc.trim().length > 0 ? (
                                  <button
                                    type="button"
                                    className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-2xl text-primary transition hover:text-accent"
                                    onClick={() => {
                                      if (isImageReceipt) {
                                        setSelectedImage({ name: `Recibo ${index + 1}`, src: effectiveReceiptSrc || "" });
                                        return;
                                      }
                                      window.open(effectiveReceiptSrc, "_blank", "noopener,noreferrer");
                                    }}
                                  >
                                    <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-secondary">
                                      Recibo {index + 1}
                                    </span>
                                    <span className="text-sm font-semibold">Ver comprobante</span>
                                    <span className="text-[10px] text-secondary">{effectiveReceiptLabel}</span>
                                  </button>
                                ) : (
                                  <div className="space-y-2">
                                    <span className="block text-[10px] font-semibold uppercase tracking-[0.24em] text-secondary">
                                      Recibo {index + 1}
                                    </span>
                                    <span className="block text-sm font-semibold text-primary">Espacio disponible</span>
                                    <span className="block text-[10px] text-secondary">
                                      Aquí aparecerá el comprobante cuando se cargue.
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="mt-4 rounded-2xl border border-primary/10 bg-primary/5 p-4 text-xs text-secondary">
                      Los pagos y sus recibos se activarán una vez apruebes el inicio de tu proyecto.
                    </div>
                  )}
                </div>
              </section>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {selectedImage ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div
            ref={modalRef}
            tabIndex={-1}
            className="w-full max-w-3xl rounded-3xl bg-white p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-lg font-semibold text-primary">{selectedImage.name}</h3>
              <button
                className="rounded-full border border-primary/10 px-3 py-1 text-xs font-semibold text-primary transition hover:border-accent hover:text-accent"
                onClick={() => setSelectedImage(null)}
              >
                Cerrar
              </button>
            </div>
            <div className="mt-4 overflow-hidden rounded-2xl bg-primary/5">
              <img
                src={selectedImage.src}
                alt={selectedImage.name}
                className="h-full w-full object-contain"
              />
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

