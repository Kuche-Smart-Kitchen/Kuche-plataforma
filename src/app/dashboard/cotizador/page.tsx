 "use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Heart, Minus, Plus } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

import { useEscapeClose } from "@/hooks/useEscapeClose";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useAdminWorkflow } from "@/contexts/AdminWorkflowContext";
import { getReturnRouteForLoggedUser } from "@/lib/role-routes";
import { agregarArchivos } from "@/lib/axios/tareasApi";
import {
  activeCitaTaskStorageKey,
  activeCotizacionFormalTaskStorageKey,
  citaReturnUrlStorageKey,
  getPreliminarList,
  getCotizacionesFormalesList,
  type CotizacionFormalData,
} from "@/lib/kanban";
import { runtimeStore } from "@/lib/runtime-store";
import { buildWorkshopPdfDataUrl, type WorkshopPdfBuildInput } from "@/lib/cotizacion-workshop-pdf";
import { createFormalPdfKey, createWorkshopPdfKey, saveFormalPdf } from "@/lib/formal-pdf-storage";
import { formatDeliveryWeeksLabel } from "@/lib/delivery-weeks";
import { generatePublicProjectCode } from "@/lib/project-code";
import { subirPdfGeneradoConMetadata } from "@/lib/axios/uploadsApi";
import {
  buildFormalUploadMetadata,
  getRequiredClientIdForFormalUpload,
} from "@/lib/upload-formal-metadata";
import {
  actualizarHerraje,
  actualizarMaterial,
  crearHerraje,
  crearMaterial,
  eliminarHerraje,
  eliminarMaterial,
  obtenerHerrajes,
  obtenerMateriales,
  type Herraje,
  type Material,
  type UnidadMedida,
} from "@/lib/axios/catalogosApi";
import { CatalogProjectTypeField } from "@/components/CatalogProjectTypeField";

const projectTypes = ["Cocina", "Clóset", "TV Unit"];

const downloadDataUrlFile = (dataUrl: string, filename: string) => {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  link.click();
};

const alreadyRelatedToTask = (
  relatedTaskId: string,
  relacionadoA?: "tarea" | "proyecto" | "cotizacion" | "cliente",
  relacionadoId?: string,
  tareasId?: string,
) => {
  const normalizedTaskId = relatedTaskId.trim();
  if (relacionadoA === "tarea" && relacionadoId?.trim() === normalizedTaskId) {
    return true;
  }
  return tareasId?.trim() === normalizedTaskId;
};
/** Precio por metro lineal para material base (según ítem de ESTRUCTURA seleccionado). */
const MATERIAL_BASE_PRICE_PER_METER: Record<string, number> = {
  est_mdf_natural: 6500,
  est_mel_blanca: 7800,
  est_mel_negro: 9800,
  est_mel_gris: 9800,
  est_madera: 7000,
  est_cintilla_ng: 6500,
  est_cintilla_bf: 6500,
};
const DEFAULT_PRICE_PER_METER = 6500;
/** Factor por espesor (id de ítem ESPESOR -> factor). */
const THICKNESS_FACTORS: Record<string, number> = {
  "15": 0.97,
  "16": 1,
  "18": 1.05,
  "19": 1.08,
};

/** Ítem del catálogo de materiales (precio por `unitType`, ej. pieza, metro lineal, m²). */
export type CatalogoItem = {
  id: string;
  label: string;
  unitPrice: number;
  unitType?: string;
  backendId?: string;
  sourceKind?: "material" | "herraje";
};

type CatalogoCategoria = {
  category: string;
  items: CatalogoItem[];
};

/** Sugerencias para el campo «tipo de unidad» al dar de alta materiales. */
const CATALOGO_UNIT_TYPE_SUGGESTIONS = [
  "pieza",
  "pie",
  "metro lineal",
  "m²",
  "m2",
  "placa",
  "hoja",
  "juego",
  "par",
  "rollo",
  "bolsa",
  "bote",
  "paquete",
  "semana",
  "mm",
];

const initialCatalogoKuche: CatalogoCategoria[] = [
  {
    category: "CUBIERTA",
    items: [
      { id: "cub_formica", label: "Cubierta Formica (pies)", unitPrice: 173, unitType: "pie" },
      { id: "cub_granito", label: "Granito (placas)", unitPrice: 12000, unitType: "placa" },
      { id: "cub_cuarzo", label: "Cuarzo (placas)", unitPrice: 16000, unitType: "placa" },
      { id: "mo_fabricacion", label: "Mano de obra fabricación (mts2)", unitPrice: 1400, unitType: "m²" },
    ],
  },
  {
    category: "ESTRUCTURA",
    items: [
      { id: "est_mdf_natural", label: "MDF Natural 15mm (hojas)", unitPrice: 335, unitType: "hoja" },
      { id: "est_mel_blanca", label: "MDF Melamina Blanco (hojas)", unitPrice: 600, unitType: "hoja" },
      { id: "est_mel_negro", label: "MDF Melamina Negro (hojas)", unitPrice: 1000, unitType: "hoja" },
      { id: "est_mel_gris", label: "MDF Melamina Gris OX (hojas)", unitPrice: 1000, unitType: "hoja" },
      { id: "est_madera", label: "Madera (pza)", unitPrice: 250, unitType: "pieza" },
      {
        id: "est_cintilla_ng",
        label: "Cintilla Negro o Gris 19x1 (mts)",
        unitPrice: 12,
        unitType: "metro lineal",
      },
      {
        id: "est_cintilla_bf",
        label: "Cintilla Blanco Frosty 19x1 (mts)",
        unitPrice: 9,
        unitType: "metro lineal",
      },
    ],
  },
  {
    category: "VISTAS",
    items: [
      { id: "vis_mdf_brillo", label: "MDF Alto Brillo (hojas)", unitPrice: 3200, unitType: "hoja" },
      { id: "vis_mel_color1", label: "MDF Melamina de Color 1 (hojas)", unitPrice: 1000, unitType: "hoja" },
      { id: "vis_mel_color2", label: "MDF Melamina de Color 2 (hojas)", unitPrice: 1000, unitType: "hoja" },
      {
        id: "vis_cubrecanto_brillo",
        label: "Cubrecanto Alto Brillo (mts)",
        unitPrice: 17,
        unitType: "metro lineal",
      },
      {
        id: "vis_cubrecanto_c1",
        label: "Cubrecanto Color 1 (mts)",
        unitPrice: 12,
        unitType: "metro lineal",
      },
      {
        id: "vis_cubrecanto_c2",
        label: "Cubrecanto Color 2 (mts)",
        unitPrice: 12,
        unitType: "metro lineal",
      },
    ],
  },
  {
    category: "ESPESOR",
    items: [
      { id: "15", label: "15 mm", unitPrice: 0, unitType: "mm" },
      { id: "16", label: "16 mm", unitPrice: 0, unitType: "mm" },
      { id: "18", label: "18 mm", unitPrice: 0, unitType: "mm" },
      { id: "19", label: "19 mm", unitPrice: 0, unitType: "mm" },
    ],
  },
  {
    category: "CAJONES Y PUERTAS",
    items: [
      { id: "cajon_sen", label: "Cajón sencillo", unitPrice: 120, unitType: "pieza" },
      { id: "cajon_cierre_lento", label: "Cajón Cierre lento", unitPrice: 450, unitType: "pieza" },
      { id: "cajon_push", label: "Cajón Sistema Push", unitPrice: 350, unitType: "pieza" },
      { id: "cajon_blum_tandem", label: "Cajón BLUM tandem", unitPrice: 700, unitType: "pieza" },
      { id: "cajon_blum_movento", label: "Cajón Blum Movento", unitPrice: 1300, unitType: "pieza" },
      { id: "bisagra_blumotion", label: "Bisagra tip on - blumotion", unitPrice: 120, unitType: "pieza" },
      { id: "puerta_cierre_push", label: "Puerta Cierre lento/Push", unitPrice: 550, unitType: "pieza" },
      { id: "puerta_bisagra", label: "Puertas Bisagras sencilla", unitPrice: 30, unitType: "pieza" },
    ],
  },
  {
    category: "ACCESORIOS DE MÓDULO",
    items: [
      { id: "acc_patas", label: "Patas y clips", unitPrice: 17, unitType: "pieza" },
      { id: "acc_push_tipon", label: "Push - TIPON", unitPrice: 150, unitType: "pieza" },
      { id: "acc_jaladeras", label: "Jaladeras", unitPrice: 500, unitType: "pieza" },
      { id: "acc_zoclo", label: "Zoclo (mts)", unitPrice: 180, unitType: "metro lineal" },
      { id: "acc_puerta_esq", label: "Puertas Esquinera", unitPrice: 200, unitType: "pieza" },
    ],
  },
  {
    category: "EXTRAÍBLES Y PUERTAS ABATIBLES",
    items: [
      { id: "ext_alacena", label: "Alacena doble", unitPrice: 3000, unitType: "juego" },
      { id: "ext_especiero", label: "Especiero", unitPrice: 1800, unitType: "juego" },
      { id: "ext_magic_corner", label: "Magic Corner", unitPrice: 6200, unitType: "juego" },
      { id: "ext_esquinero", label: "Esquinero Cacerolero", unitPrice: 3600, unitType: "juego" },
      { id: "ext_avento_hf", label: "Avento HF (Premium)", unitPrice: 3500, unitType: "juego" },
      { id: "ext_avento_hk", label: "Avento HK-XS", unitPrice: 400, unitType: "juego" },
      { id: "ext_piston_gen", label: "Pistón Genérico", unitPrice: 100, unitType: "pieza" },
      { id: "ext_luz_led", label: "Luz LED", unitPrice: 1500, unitType: "pieza" },
      { id: "ext_servo", label: "Servo drive", unitPrice: 18000, unitType: "pieza" },
    ],
  },
  {
    category: "INSUMOS DE PRODUCCIÓN",
    items: [
      { id: "insum_pegamento", label: "Pegamento", unitPrice: 250, unitType: "bote" },
      { id: "insum_silicon", label: "Silicones", unitPrice: 1500, unitType: "pieza" },
    ],
  },
  {
    category: "EXTRAS",
    items: [
      { id: "extra_lambrin", label: "Lambrín Interior 2.9 x .16", unitPrice: 472, unitType: "pieza" },
      {
        id: "extra_silicon_tornillos",
        label: "Silicon, tornillos, tapas, resistol",
        unitPrice: 2000,
        unitType: "paquete",
      },
    ],
  },
  {
    category: "GASTOS FIJOS",
    items: [
      {
        id: "fijo_mo_semana",
        label: "Mano obra 1 equipo (semana)",
        unitPrice: 6000,
        unitType: "semana",
      },
      {
        id: "fijo_admin_semana",
        label: "Gastos admin (semana)",
        unitPrice: 7000,
        unitType: "semana",
      },
    ],
  },
];

const emptyCatalogoTemplate: CatalogoCategoria[] = initialCatalogoKuche.map((category) => ({
  category: category.category,
  items: [],
}));

const DISPLAY_TO_SECTION: Record<string, string> = {
  CUBIERTA: "cubierta",
  ESTRUCTURA: "estructura",
  VISTAS: "vistas",
  ESPESOR: "espesor",
  "CAJONES Y PUERTAS": "cajones_puertas",
  "ACCESORIOS DE MÓDULO": "accesorios_modulo",
  "EXTRAÍBLES Y PUERTAS ABATIBLES": "extraibles_puertas_abatibles",
  "INSUMOS DE PRODUCCIÓN": "insumos_produccion",
  EXTRAS: "extras",
  "GASTOS FIJOS": "gastos_fijos",
};

const SECTION_TO_DISPLAY: Record<string, string> = {
  cubierta: "CUBIERTA",
  estructura: "ESTRUCTURA",
  vistas: "VISTAS",
  espesor: "ESPESOR",
  cajones_puertas: "CAJONES Y PUERTAS",
  accesorios_modulo: "ACCESORIOS DE MÓDULO",
  extraibles_puertas_abatibles: "EXTRAÍBLES Y PUERTAS ABATIBLES",
  insumos_produccion: "INSUMOS DE PRODUCCIÓN",
  extras: "EXTRAS",
  gastos_fijos: "GASTOS FIJOS",
};

function catalogItemUnitLabel(item: { unitType?: string }): string {
  const u = item.unitType?.trim();
  return u || "pieza";
}

const parseNumericValue = (value: unknown): number => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value.replace(/,/g, "."));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

function extractList<T>(input: unknown, keys: string[]): T[] {
  if (Array.isArray(input)) return input as T[];
  if (input && typeof input === "object") {
    const record = input as Record<string, unknown>;
    for (const key of keys) {
      const value = record[key];
      if (Array.isArray(value)) return value as T[];
    }
  }
  return [];
}

const getDisplayCategoryFromApi = (raw: Record<string, unknown>) => {
  const seccionRaw = typeof raw.seccion === "string" ? raw.seccion.trim().toLowerCase() : "";
  if (seccionRaw && SECTION_TO_DISPLAY[seccionRaw]) return SECTION_TO_DISPLAY[seccionRaw];
  const categoriaRaw = typeof raw.categoria === "string" ? raw.categoria.trim().toLowerCase() : "";
  if (categoriaRaw === "herrajes") return "ACCESORIOS DE MÓDULO";
  return "EXTRAS";
};

const inferItemKindFromDisplayCategory = (displayCategory: string): "material" | "herraje" => {
  if (
    displayCategory === "CAJONES Y PUERTAS" ||
    displayCategory === "ACCESORIOS DE MÓDULO" ||
    displayCategory === "EXTRAÍBLES Y PUERTAS ABATIBLES"
  ) {
    return "herraje";
  }
  return "material";
};

const normalizeUnitToApi = (unitType: string): UnidadMedida => {
  const raw = unitType.trim().toLowerCase();
  if (raw === "m2" || raw === "m²") return "m²";
  if (raw === "m3" || raw === "m³") return "m³";
  if (
    raw === "m" ||
    raw === "metro" ||
    raw === "metros" ||
    raw === "metro lineal" ||
    raw === "mts"
  ) {
    return "m";
  }
  if (raw === "caja") return "caja";
  if (raw === "paquete") return "paquete";
  return "unidad";
};

function normalizeStoredCatalog(
  parsed: Array<{ category?: string; items?: unknown[] }>,
): CatalogoCategoria[] {
  return parsed
    .filter(
      (category) =>
        category && typeof category.category === "string" && Array.isArray(category.items),
    )
    .map((category) => ({
      category: category.category as string,
      items: (category.items as Record<string, unknown>[]).map((item) => {
        const unitTypeRaw = item.unitType;
        const unitType =
          typeof unitTypeRaw === "string" && unitTypeRaw.trim() ? unitTypeRaw.trim() : undefined;
        return {
          id: String(item.id ?? ""),
          label: String(item.label ?? ""),
          unitPrice: Number(item.unitPrice) || 0,
          ...(unitType ? { unitType } : {}),
        };
      }),
    }));
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);

function getDefaultMaterialBaseItemId(): string {
  const cat = initialCatalogoKuche.find((c) => c.category === "ESTRUCTURA");
  return cat?.items?.[0]?.id ?? "";
}
function getDefaultColorItemId(): string {
  const cat = initialCatalogoKuche.find((c) => c.category === "VISTAS");
  return cat?.items?.[0]?.id ?? "";
}
function getDefaultThicknessItemId(): string {
  const cat = initialCatalogoKuche.find((c) => c.category === "ESPESOR");
  return cat?.items?.[0]?.id ?? "16";
}

function FormalCotizacionBanner({ projectName }: { projectName: string }) {
  return (
    <div className="rounded-3xl border border-emerald-200 bg-emerald-50/80 p-5 shadow-md backdrop-blur-md">
      <p className="text-xs uppercase tracking-[0.3em] text-emerald-700">Cotización formal</p>
      <p className="mt-2 text-sm text-emerald-800">
        Cotización formal para <strong>{projectName}</strong>. Completa las secciones; al pie están{" "}
        <strong>Terminar</strong> (pasa a seguimiento) y <strong>Terminar y continuar</strong> (otro espacio).
        Al terminar se guardan en la tarjeta la <strong>cotización formal</strong> y la{" "}
        <strong>hoja de taller</strong> (mismo par en todas las vistas de cliente). También puedes previsualizar la
        hoja con <strong>Generar Hoja de Taller</strong> en la sección de cierre.
      </p>
    </div>
  );
}

export default function CotizadorPage() {
  const router = useRouter();
  const { tasks, refresh, updateTask } = useAdminWorkflow();
  const [clients, setClients] = useState([
    { name: "Mariana Fuentes", phone: "", email: "" },
    { name: "Arquitectura F4 Studio", phone: "", email: "" },
    { name: "Eduardo Pardo", phone: "", email: "" },
  ]);
  const [catalogoKuche, setCatalogoKuche] = useState(emptyCatalogoTemplate);
  const [client, setClient] = useState("");
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");
  const [projectType, setProjectType] = useState(projectTypes[0]);
  const [location, setLocation] = useState("");
  const [deliveryWeeksMin, setDeliveryWeeksMin] = useState("");
  const [deliveryWeeksMax, setDeliveryWeeksMax] = useState("");
  const [largo, setLargo] = useState("4.2");
  const [alto, setAlto] = useState("2.4");
  const [fondo, setFondo] = useState("0.6");
  const [materialBaseItemId, setMaterialBaseItemId] = useState(getDefaultMaterialBaseItemId);
  const [colorItemId, setColorItemId] = useState(getDefaultColorItemId);
  const [thicknessItemId, setThicknessItemId] = useState(getDefaultThicknessItemId);
  const [activeTab, setActiveTab] = useState(emptyCatalogoTemplate[0]?.category ?? "");
  const [materialSearch, setMaterialSearch] = useState("");

  const [utilidadPct, setUtilidadPct] = useState(30);
  const [fletePct, setFletePct] = useState(2);

  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const openMenuRef = useRef<HTMLDivElement | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [newItemUnitType, setNewItemUnitType] = useState("pieza");
  const [newItemCategory, setNewItemCategory] = useState(emptyCatalogoTemplate[0]?.category ?? "");
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [isCatalogSaving, setIsCatalogSaving] = useState(false);
  const [activeCitaTaskId, setActiveCitaTaskId] = useState<string | null>(null);
  const [activeCotizacionFormalTaskId, setActiveCotizacionFormalTaskId] = useState<string | null>(null);
  const [finishFormalError, setFinishFormalError] = useState("");
  const [preliminarCarryOverSubtotal, setPreliminarCarryOverSubtotal] = useState(0);
  const [highlightedMaterialIds, setHighlightedMaterialIds] = useState<string[]>([]);
  const [referenceImages, setReferenceImages] = useState<
    Array<{ id: string; name: string; dataUrl: string }>
  >([]);
  const [excelImportSummary, setExcelImportSummary] = useState<{
    imported: number;
    skipped: number;
    errors: string[];
    fileName: string;
  } | null>(null);
  const [isExcelViewActive, setIsExcelViewActive] = useState(false);
  const [excelPreviewLines, setExcelPreviewLines] = useState<
    Array<{
      id: string;
      categoria: string;
      descripcion: string;
      cantidad: number;
      precioUnitario: number;
      total: number;
    }>
  >([]);
  const clientModalRef = useRef<HTMLDivElement | null>(null);
  const addItemModalRef = useRef<HTMLDivElement | null>(null);
  const hydratedFromTaskRef = useRef<string | null>(null);
  const hydratedHighlightsFromTaskRef = useRef<string | null>(null);

  useEscapeClose(isClientModalOpen, () => setIsClientModalOpen(false));
  useEscapeClose(isAddModalOpen, () => {
    setIsAddModalOpen(false);
    setEditingItemId(null);
    setNewItemUnitType("pieza");
  });
  useFocusTrap(isClientModalOpen, clientModalRef);
  useFocusTrap(isAddModalOpen, addItemModalRef);

  const activeCitaTask = useMemo(
    () => tasks.find((task) => task.id === activeCitaTaskId) ?? null,
    [activeCitaTaskId, tasks],
  );

  const activeCotizacionFormalTask = useMemo(
    () => tasks.find((task) => task.id === activeCotizacionFormalTaskId) ?? null,
    [activeCotizacionFormalTaskId, tasks],
  );

  useEffect(() => {
    void refresh();
    setActiveCitaTaskId(runtimeStore.getItem(activeCitaTaskStorageKey));
    setActiveCotizacionFormalTaskId(runtimeStore.getItem(activeCotizacionFormalTaskStorageKey));
  }, [refresh]);

  useEffect(() => {
    if (activeCotizacionFormalTask?.project) {
      setClient(activeCotizacionFormalTask.project);
    }
  }, [activeCotizacionFormalTask?.project]);

  useEffect(() => {
    if (!activeCotizacionFormalTask) return;
    if (hydratedHighlightsFromTaskRef.current === activeCotizacionFormalTask.id) return;

    const latestFormal = getCotizacionesFormalesList(activeCotizacionFormalTask).at(-1) as Record<string, unknown> | undefined;
    const highlightedFromTask = Array.isArray(latestFormal?.destacadosPdf)
      ? latestFormal.destacadosPdf.filter((entry): entry is string => typeof entry === "string")
      : [];

    setHighlightedMaterialIds(highlightedFromTask);
    hydratedHighlightsFromTaskRef.current = activeCotizacionFormalTask.id;
  }, [activeCotizacionFormalTask]);

  useEffect(() => {
    if (!activeCotizacionFormalTask || catalogoKuche.length === 0) return;
    if (hydratedFromTaskRef.current === activeCotizacionFormalTask.id) return;

    const lastPreliminar = getPreliminarList(activeCotizacionFormalTask).at(-1);
    if (!lastPreliminar) {
      hydratedFromTaskRef.current = activeCotizacionFormalTask.id;
      return;
    }

    const rawPreliminar = lastPreliminar as Record<string, unknown>;
    const rawLevantamiento =
      rawPreliminar.levantamiento && typeof rawPreliminar.levantamiento === "object"
        ? (rawPreliminar.levantamiento as Record<string, unknown>)
        : null;

    if (!client.trim() && typeof lastPreliminar.client === "string") {
      setClient(lastPreliminar.client);
    }

    if (
      (projectType === projectTypes[0] || !projectType.trim())
      && typeof lastPreliminar.projectType === "string"
      && lastPreliminar.projectType.trim()
    ) {
      setProjectType(lastPreliminar.projectType.trim());
    }

    if (!location.trim() && typeof lastPreliminar.location === "string") {
      setLocation(lastPreliminar.location);
    }

    const preliminarLargo = parseNumericValue(rawPreliminar.largo);
    const preliminarAlto = parseNumericValue(rawPreliminar.alto);
    if (preliminarLargo > 0) setLargo(preliminarLargo.toString());
    if (preliminarAlto > 0) setAlto(preliminarAlto.toString());

    const qtySeed: Record<string, number> = {};
    const normalizedLabel = (value: string) =>
      value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();

    const addByLabel = (label: string) => {
      const normalized = normalizedLabel(label);
      if (!normalized) return;

      const found = catalogoKuche
        .flatMap((category) => category.items)
        .find((item) => {
          const itemLabel = normalizedLabel(item.label);
          return itemLabel.includes(normalized) || normalized.includes(itemLabel);
        });

      if (found) {
        qtySeed[found.id] = Math.max(1, qtySeed[found.id] ?? 0);
      }
    };

    if (typeof lastPreliminar.cubierta === "string") addByLabel(lastPreliminar.cubierta);
    if (typeof lastPreliminar.herraje === "string") addByLabel(lastPreliminar.herraje);
    if (typeof lastPreliminar.frente === "string") {
      lastPreliminar.frente
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean)
        .forEach(addByLabel);
    }

    const preloadIdGroups = [
      rawLevantamiento?.applianceDocumentIds,
      rawLevantamiento?.lightingSelectedIds,
      rawLevantamiento?.extrasSelectedIds,
    ];
    for (const group of preloadIdGroups) {
      if (!Array.isArray(group)) continue;
      for (const id of group) {
        if (typeof id !== "string") continue;
        const match = catalogoKuche.flatMap((category) => category.items).find((item) => item.id === id);
        if (match) qtySeed[match.id] = Math.max(1, qtySeed[match.id] ?? 0);
      }
    }

    if (Object.keys(qtySeed).length > 0) {
      setQuantities((prev) => ({ ...qtySeed, ...prev }));
    }

    const seededSubtotal = Object.entries(qtySeed).reduce((acc, [id, qty]) => {
      const item = catalogoKuche.flatMap((category) => category.items).find((candidate) => candidate.id === id);
      if (!item) return acc;
      return acc + item.unitPrice * qty;
    }, 0);

    const preliminarSubtotal = parseNumericValue(rawPreliminar.subtotal);
    const carryOver = Math.max(0, preliminarSubtotal - seededSubtotal);
    setPreliminarCarryOverSubtotal(carryOver);
    hydratedFromTaskRef.current = activeCotizacionFormalTask.id;
  }, [
    activeCotizacionFormalTask,
    catalogoKuche,
    client,
    location,
    projectType,
  ]);

  const loadCatalogoFromBackend = useCallback(async () => {
    try {
      setCatalogError(null);
      const [materialesResponse, herrajesResponse] = await Promise.all([obtenerMateriales(), obtenerHerrajes()]);
      const backendItems: CatalogoItem[] = [];

      if (materialesResponse.success && materialesResponse.data) {
        const materiales = extractList<Material>(materialesResponse.data, ["materiales", "items", "data", "results"]);
        for (const material of materiales) {
          const raw = material as unknown as Record<string, unknown>;
          const displayCategory = getDisplayCategoryFromApi(raw);
          const id =
            (typeof raw.idCotizador === "string" && raw.idCotizador.trim()) ||
            (typeof raw._id === "string" && raw._id.trim()) ||
            `mat-${Date.now()}`;
          const price =
            (typeof raw.precioUnitario === "number" ? raw.precioUnitario : Number(raw.precioUnitario)) ||
            (typeof raw.precioPorMetro === "number" ? raw.precioPorMetro : Number(raw.precioPorMetro)) ||
            (typeof raw.precioMetroLineal === "number" ? raw.precioMetroLineal : Number(raw.precioMetroLineal)) ||
            0;
          backendItems.push({
            id,
            label: typeof raw.nombre === "string" ? raw.nombre : "Material",
            unitPrice: Number.isFinite(price) ? price : 0,
            unitType: typeof raw.unidadMedida === "string" ? raw.unidadMedida : "unidad",
            backendId: typeof raw._id === "string" ? raw._id : undefined,
            sourceKind: "material",
            category: displayCategory,
          } as CatalogoItem & { category: string });
        }
      }

      if (herrajesResponse.success && herrajesResponse.data) {
        const herrajes = extractList<Herraje>(herrajesResponse.data, ["herrajes", "items", "data", "results"]);
        for (const herraje of herrajes) {
          const raw = herraje as unknown as Record<string, unknown>;
          const displayCategory = getDisplayCategoryFromApi(raw);
          const id =
            (typeof raw.idCotizador === "string" && raw.idCotizador.trim()) ||
            (typeof raw._id === "string" && raw._id.trim()) ||
            `her-${Date.now()}`;
          const price =
            (typeof raw.precioUnitario === "number" ? raw.precioUnitario : Number(raw.precioUnitario)) ||
            (typeof raw.precioPorMetro === "number" ? raw.precioPorMetro : Number(raw.precioPorMetro)) ||
            (typeof raw.precioMetroLineal === "number" ? raw.precioMetroLineal : Number(raw.precioMetroLineal)) ||
            0;
          backendItems.push({
            id,
            label: typeof raw.nombre === "string" ? raw.nombre : "Herraje",
            unitPrice: Number.isFinite(price) ? price : 0,
            unitType: typeof raw.unidadMedida === "string" ? raw.unidadMedida : "unidad",
            backendId: typeof raw._id === "string" ? raw._id : undefined,
            sourceKind: "herraje",
            category: displayCategory,
          } as CatalogoItem & { category: string });
        }
      }

      if (!materialesResponse.success && !herrajesResponse.success) {
        setCatalogoKuche(emptyCatalogoTemplate.map((category) => ({ ...category, items: [] })));
        return;
      }

      const nextCatalog = emptyCatalogoTemplate.map((category) => ({
        ...category,
        items: [] as CatalogoItem[],
      }));
      const byCategory = new Map(nextCatalog.map((category) => [category.category, category]));

      for (const backendItem of backendItems as Array<CatalogoItem & { category: string }>) {
        const targetCategory = byCategory.get(backendItem.category);
        if (!targetCategory) continue;
        const duplicate = targetCategory.items.some(
          (item) =>
            item.id === backendItem.id ||
            (backendItem.backendId && item.backendId === backendItem.backendId),
        );
        if (!duplicate) {
          targetCategory.items.push(backendItem);
        }
      }

      setCatalogoKuche(nextCatalog);
    } catch {
      setCatalogoKuche(emptyCatalogoTemplate.map((category) => ({ ...category, items: [] })));
      setCatalogError("No se pudo sincronizar el catálogo del backend. Se mostrarán los datos locales de respaldo.");
    }
  }, []);

  useEffect(() => {
    void loadCatalogoFromBackend();
  }, [loadCatalogoFromBackend]);

  const metrosValue = Number.parseFloat(largo) || 0;
  const estructuraItems = catalogoKuche.find((c) => c.category === "ESTRUCTURA")?.items ?? [];
  const vistasItems = catalogoKuche.find((c) => c.category === "VISTAS")?.items ?? [];
  const espesorItems = catalogoKuche.find((c) => c.category === "ESPESOR")?.items ?? [];

  const { effectiveMaterialBaseId, effectiveColorId, effectiveThicknessId } = useMemo(() => {
    const q = (id: string) => Math.max(quantities[id] ?? 0, 0);
    const fromCategory = (
      items: { id: string }[],
      fallbackId: string,
    ): string => {
      if (!items.length) return fallbackId;
      const withQty = items
        .map((item) => ({ id: item.id, qty: q(item.id) }))
        .filter((x) => x.qty > 0);
      if (withQty.length === 0) return fallbackId;
      const best = withQty.reduce((a, b) => (b.qty > a.qty ? b : a));
      return best.id;
    };
    return {
      effectiveMaterialBaseId: fromCategory(estructuraItems, materialBaseItemId),
      effectiveColorId: fromCategory(vistasItems, colorItemId),
      effectiveThicknessId: fromCategory(espesorItems, thicknessItemId),
    };
  }, [
    quantities,
    estructuraItems,
    vistasItems,
    espesorItems,
    materialBaseItemId,
    colorItemId,
    thicknessItemId,
  ]);

  const materialBaseItem =
    estructuraItems.find((i) => i.id === effectiveMaterialBaseId) ?? estructuraItems[0];
  const colorItem = vistasItems.find((i) => i.id === effectiveColorId) ?? vistasItems[0];
  const thicknessItem =
    espesorItems.find((i) => i.id === effectiveThicknessId) ?? espesorItems[0];
  const baseMaterialLabel = materialBaseItem?.label ?? "Material base";
  const colorLabel = colorItem?.label ?? "Color";
  const thicknessMm = thicknessItem?.id ?? "16";
  const pricePerMeter = effectiveMaterialBaseId
    ? (MATERIAL_BASE_PRICE_PER_METER[effectiveMaterialBaseId] ?? DEFAULT_PRICE_PER_METER)
    : DEFAULT_PRICE_PER_METER;
  const thicknessFactor = THICKNESS_FACTORS[effectiveThicknessId] ?? 1;

  const materialSubtotal = metrosValue * pricePerMeter * thicknessFactor;

  const baseCost = useMemo(() => {
    return catalogoKuche.reduce((acc, category) => {
      const categoryTotal = category.items.reduce((itemsAcc, item) => {
        const qty = Math.max(quantities[item.id] ?? 0, 0);
        return itemsAcc + item.unitPrice * qty;
      }, 0);
      return acc + categoryTotal;
    }, 0);
  }, [catalogoKuche, quantities]);

  const totales = useMemo(() => {
    // Referencia técnica por metro (materialSubtotal) no se cobra en el total comercial.
    const costoBaseDirecto = baseCost + preliminarCarryOverSubtotal;
    const montoUtilidad = costoBaseDirecto * (utilidadPct / 100);
    const montoFlete = costoBaseDirecto * (fletePct / 100);
    const subtotalComercial = costoBaseDirecto + montoUtilidad + montoFlete;
    const montoIva = subtotalComercial * 0.16;
    const totalNeto = subtotalComercial + montoIva;

    return {
      costoBaseDirecto,
      montoUtilidad,
      montoFlete,
      subtotalComercial,
      montoIva,
      totalNeto,
      materialSubtotalReferencia: materialSubtotal,
    };
  }, [baseCost, materialSubtotal, preliminarCarryOverSubtotal, utilidadPct, fletePct]);

  const precioTotalSinIva = totales.subtotalComercial;
  const montoIva = totales.montoIva;
  const totalNeto = totales.totalNeto;

  const collectWorkshopPdfBuildInput = useCallback((): WorkshopPdfBuildInput => {
    const lines: WorkshopPdfBuildInput["lines"] = [];
    for (const category of catalogoKuche) {
      for (const item of category.items) {
        const qty = quantities[item.id] ?? 0;
        if (!qty) continue;
        lines.push({
          label: item.label,
          category: category.category,
          unit: catalogItemUnitLabel(item),
          qty,
          unitPrice: item.unitPrice,
          lineTotal: item.unitPrice * qty,
        });
      }
    }
    return {
      client: client.trim() || "Cliente sin nombre",
      projectType: projectType || "—",
      location: location.trim() || "Ubicación sin definir",
      deliveryWeeksLabel: formatDeliveryWeeksLabel(deliveryWeeksMin, deliveryWeeksMax) || "Por definir",
      precioTotalSinIva,
      montoIva,
      totalNeto,
      lines,
    };
  }, [
    catalogoKuche,
    quantities,
    client,
    projectType,
    location,
    deliveryWeeksMin,
    deliveryWeeksMax,
    precioTotalSinIva,
    montoIva,
    totalNeto,
  ]);

  const handleQuantityChange = (id: string, value: number) => {
    setQuantities((prev) => ({
      ...prev,
      [id]: Math.max(value, 0),
    }));
  };

  const toggleHighlightForPdf = (itemId: string, qty: number) => {
    const isHighlighted = highlightedMaterialIds.includes(itemId);
    if (!isHighlighted && qty <= 0) {
      handleQuantityChange(itemId, 1);
    }
    setHighlightedMaterialIds((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId],
    );
  };

  const selectedCatalogLines = useMemo(
    () =>
      catalogoKuche.flatMap((category) =>
        category.items
          .map((item) => {
            const qty = Math.max(quantities[item.id] ?? 0, 0);
            if (!qty) return null;
            return {
              id: item.id,
              category: category.category,
              label: item.label,
              qty,
              total: item.unitPrice * qty,
            };
          })
          .filter(
            (line): line is { id: string; category: string; label: string; qty: number; total: number } =>
              line !== null,
          ),
      ),
    [catalogoKuche, quantities],
  );

  const selectedItemsByCategory = useMemo(() => {
    const grouped = new Map<string, Array<{ id: string; label: string; qty: number }>>();
    selectedCatalogLines.forEach((line) => {
      const current = grouped.get(line.category) ?? [];
      current.push({ id: line.id, label: line.label, qty: line.qty });
      grouped.set(line.category, current);
    });
    return Array.from(grouped.entries()).map(([category, items]) => ({ category, items }));
  }, [selectedCatalogLines]);

  useEffect(() => {
    const validIds = new Set(selectedCatalogLines.map((line) => line.id));
    setHighlightedMaterialIds((prev) => prev.filter((id) => validIds.has(id)));
  }, [selectedCatalogLines]);

  const activeCategory =
    catalogoKuche.find((category) => category.category === activeTab) ?? catalogoKuche[0];

  useEffect(() => {
    const estructura = catalogoKuche.find((c) => c.category === "ESTRUCTURA");
    const vistas = catalogoKuche.find((c) => c.category === "VISTAS");
    const espesor = catalogoKuche.find((c) => c.category === "ESPESOR");
    const estructuraIds = new Set(estructura?.items?.map((i) => i.id) ?? []);
    const vistasIds = new Set(vistas?.items?.map((i) => i.id) ?? []);
    const espesorIds = new Set(espesor?.items?.map((i) => i.id) ?? []);
    if (estructura?.items?.length && !estructuraIds.has(materialBaseItemId)) {
      setMaterialBaseItemId(estructura.items[0].id);
    }
    if (vistas?.items?.length && !vistasIds.has(colorItemId)) {
      setColorItemId(vistas.items[0].id);
    }
    if (espesor?.items?.length && !espesorIds.has(thicknessItemId)) {
      setThicknessItemId(espesor.items[0].id);
    }
  }, [catalogoKuche]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (openMenuRef.current && event.target instanceof Node) {
        if (openMenuRef.current.contains(event.target)) {
          return;
        }
      }
      setOpenMenuId(null);
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  const toCatalogId = (value: string) =>
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 32);

  const normalizeText = (value: string) =>
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  const clampPct = (value: number) => Math.min(100, Math.max(0, value));

  const normalizedSearch = normalizeText(materialSearch.trim());

  const visibleItems = useMemo(() => {
    if (!normalizedSearch) {
      return (activeCategory?.items ?? []).map((item) => ({
        item,
        category: activeCategory?.category ?? "",
      }));
    }
    return catalogoKuche.flatMap((category) =>
      category.items
        .filter((item) => normalizeText(item.label).includes(normalizedSearch))
        .map((item) => ({ item, category: category.category })),
    );
  }, [activeCategory, catalogoKuche, normalizedSearch]);

  const resetCatalogToDefault = () => {
    setCatalogoKuche(emptyCatalogoTemplate.map((category) => ({ ...category, items: [] })));
    setQuantities({});
    setExcelImportSummary(null);
    setExcelPreviewLines([]);
    setIsExcelViewActive(false);
    setMaterialSearch("");
    setActiveTab(emptyCatalogoTemplate[0]?.category ?? "");
    setMaterialBaseItemId(getDefaultMaterialBaseItemId());
    setColorItemId(getDefaultColorItemId());
    setThicknessItemId(getDefaultThicknessItemId());
    void loadCatalogoFromBackend();
  };

  const handleExcelImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const [file] = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!file) {
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const [firstSheetName] = workbook.SheetNames;
      const sheet = workbook.Sheets[firstSheetName];
      if (!sheet) {
        setExcelPreviewLines([]);
        setExcelImportSummary({
          imported: 0,
          skipped: 0,
          errors: ["El archivo no contiene hojas válidas."],
          fileName: file.name,
        });
        return;
      }

      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        defval: null,
      });

      let imported = 0;
      let skipped = 0;
      const errors: string[] = [];
      const previewLines: Array<{
        id: string;
        categoria: string;
        descripcion: string;
        cantidad: number;
        precioUnitario: number;
        total: number;
      }> = [];

      const headerKeys = {
        categoria: ["Categoria", "CATEGORIA", "category", "CATEGORY"],
        codigo: ["Codigo", "CÓDIGO", "CODIGO", "code", "CODE"],
        descripcion: ["Descripcion", "Descripción", "DESCRIPCION", "DESCRIPCIÓN", "description"],
        cantidad: ["Cantidad", "CANTIDAD", "qty", "QTY"],
        precioUnitario: [
          "PrecioUnitario",
          "PRECIOUNITARIO",
          "Precio_Unitario",
          "PRECIO_UNITARIO",
          "unitPrice",
        ],
      };

      const getCell = (row: Record<string, unknown>, keys: string[]) => {
        for (const key of keys) {
          if (key in row && row[key] != null && row[key] !== "") {
            return row[key];
          }
        }
        return null;
      };

      rows.forEach((row: Record<string, unknown>, index: number) => {
        const rowNumber = index + 2;
        const rawDescripcion = getCell(row, headerKeys.descripcion);
        const rawCantidad = getCell(row, headerKeys.cantidad);
        const rawCategoria = getCell(row, headerKeys.categoria);
        const rawPrecio = getCell(row, headerKeys.precioUnitario);
        const rawCodigo = getCell(row, headerKeys.codigo);

        const descripcion = rawDescripcion ? String(rawDescripcion).trim() : "";
        if (!descripcion) {
          skipped += 1;
          errors.push(`Fila ${rowNumber}: sin descripción, se omitió.`);
          return;
        }

        const cantidadValue = Number(rawCantidad);
        if (!Number.isFinite(cantidadValue) || cantidadValue <= 0) {
          skipped += 1;
          errors.push(`Fila ${rowNumber}: cantidad inválida, se omitió.`);
          return;
        }

        const precioValueRaw = rawPrecio != null ? Number(rawPrecio) : NaN;
        const precioUnitario = Number.isFinite(precioValueRaw) && precioValueRaw >= 0 ? precioValueRaw : 0;
        if (!Number.isFinite(precioValueRaw)) {
          errors.push(
            `Fila ${rowNumber}: precio unitario vacío o inválido, se tomó 0 como valor temporal.`,
          );
        }

        const categoriaName = rawCategoria
          ? String(rawCategoria).toUpperCase().trim()
          : "SIN CATEGORIA";
        const id = `excel-${index}-${toCatalogId(descripcion)}`;
        const total = precioUnitario * cantidadValue;

        previewLines.push({
          id,
          categoria: categoriaName,
          descripcion,
          cantidad: cantidadValue,
          precioUnitario,
          total,
        });

        imported += 1;
      });

      setExcelPreviewLines(previewLines);
      setExcelImportSummary({
        imported,
        skipped,
        errors,
        fileName: file.name,
      });
      setIsExcelViewActive(true);
    } catch (error) {
      console.error(error);
      setExcelPreviewLines([]);
      setExcelImportSummary({
        imported: 0,
        skipped: 0,
        errors: ["No se pudo leer el archivo. Verifica que sea un Excel válido."],
        fileName: file.name,
      });
    }
  };

  const handleAddMaterial = async () => {
    const trimmedName = newItemName.trim();
    const parsedPrice = Number.parseFloat(newItemPrice);
    if (!trimmedName || Number.isNaN(parsedPrice)) {
      return;
    }

    try {
      setIsCatalogSaving(true);
      setCatalogError(null);
      const kind = inferItemKindFromDisplayCategory(newItemCategory);
      const section = DISPLAY_TO_SECTION[newItemCategory];
      const categoriaValue: "Herrajes" | "Otro" = kind === "herraje" ? "Herrajes" : "Otro";
      const basePayload: any = {
        nombre: trimmedName,
        idCotizador: toCatalogId(trimmedName),
        precioUnitario: parsedPrice,
        unidadMedida: normalizeUnitToApi(newItemUnitType),
        seccion: section as any,
        disponible: true,
      };

      const response =
        kind === "herraje"
          ? await crearHerraje({ ...basePayload, categoria: categoriaValue })
          : await crearMaterial(basePayload);
      if (!response.success) {
        setCatalogError(response.message || "No se pudo crear el material en backend.");
        return;
      }

      await loadCatalogoFromBackend();
      setNewItemName("");
      setNewItemPrice("");
      setNewItemUnitType("pieza");
      setEditingItemId(null);
      setIsAddModalOpen(false);
    } finally {
      setIsCatalogSaving(false);
    }
  };

  const handleAddClient = () => {
    const trimmedName = newClientName.trim();
    if (!trimmedName) {
      return;
    }
    setClients((prev) =>
      prev.some((entry) => entry.name === trimmedName)
        ? prev
        : [
            ...prev,
            {
              name: trimmedName,
              phone: newClientPhone.trim(),
              email: newClientEmail.trim(),
            },
          ],
    );
    setClient(trimmedName);
    setNewClientName("");
    setNewClientPhone("");
    setNewClientEmail("");
    setIsClientModalOpen(false);
  };

  const handleEditMaterial = (itemId: string) => {
    const categoryMatch = catalogoKuche.find((category) =>
      category.items.some((item) => item.id === itemId),
    );
    const itemMatch = categoryMatch?.items.find((item) => item.id === itemId);
    if (!categoryMatch || !itemMatch) {
      return;
    }
    setEditingItemId(itemId);
    setNewItemName(itemMatch.label);
    setNewItemPrice(String(itemMatch.unitPrice));
    setNewItemUnitType(catalogItemUnitLabel(itemMatch));
    setNewItemCategory(categoryMatch.category);
    setIsAddModalOpen(true);
  };

  const handleSaveMaterial = async () => {
    const trimmedName = newItemName.trim();
    const parsedPrice = Number.parseFloat(newItemPrice);
    if (!trimmedName || Number.isNaN(parsedPrice)) {
      return;
    }

    if (!editingItemId) {
      await handleAddMaterial();
      return;
    }

    const selected = catalogoKuche
      .flatMap((category) => category.items)
      .find((item) => item.id === editingItemId || item.backendId === editingItemId);

    if (!selected?.backendId || !selected.sourceKind) {
      setCatalogError("Solo se pueden editar desde backend los materiales sincronizados.");
      return;
    }

    try {
      setIsCatalogSaving(true);
      setCatalogError(null);
      const kind = inferItemKindFromDisplayCategory(newItemCategory);
      const section = DISPLAY_TO_SECTION[newItemCategory];
      const categoriaValue: "Herrajes" | "Otro" = kind === "herraje" ? "Herrajes" : "Otro";
      const basePayload: any = {
        nombre: trimmedName,
        idCotizador: toCatalogId(trimmedName),
        precioUnitario: parsedPrice,
        unidadMedida: normalizeUnitToApi(newItemUnitType),
        seccion: section as any,
        disponible: true,
      };

      const response =
        selected.sourceKind === "herraje"
          ? await actualizarHerraje(selected.backendId, { ...basePayload, categoria: categoriaValue })
          : await actualizarMaterial(selected.backendId, basePayload);
      if (!response.success) {
        setCatalogError(response.message || "No se pudo actualizar el material en backend.");
        return;
      }

      await loadCatalogoFromBackend();
      setNewItemName("");
      setNewItemPrice("");
      setNewItemUnitType("pieza");
      setEditingItemId(null);
      setIsAddModalOpen(false);
    } finally {
      setIsCatalogSaving(false);
    }
  };

  const handleReferenceImagesUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) {
      return;
    }
    const loaded = await Promise.all(
      files.map(
        (file) =>
          new Promise<{ id: string; name: string; dataUrl: string } | null>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              if (typeof reader.result !== "string") {
                resolve(null);
                return;
              }
              resolve({
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                name: file.name,
                dataUrl: reader.result,
              });
            };
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(file);
          }),
      ),
    );
    setReferenceImages((prev) => [
      ...prev,
      ...(loaded.filter(Boolean) as Array<{ id: string; name: string; dataUrl: string }>),
    ].slice(0, 6));
    event.target.value = "";
  };

  const handleRemoveReferenceImage = (imageId: string) => {
    setReferenceImages((prev) => prev.filter((image) => image.id !== imageId));
  };

  const handleDeleteMaterial = async (itemId: string) => {
    const selected = catalogoKuche
      .flatMap((category) => category.items)
      .find((item) => item.id === itemId);

    if (!selected?.backendId || !selected.sourceKind) {
      setCatalogError("Solo se pueden eliminar desde backend los materiales sincronizados.");
      return;
    }

    try {
      setIsCatalogSaving(true);
      setCatalogError(null);
      const response =
        selected.sourceKind === "herraje"
          ? await eliminarHerraje(selected.backendId)
          : await eliminarMaterial(selected.backendId);
      if (!response.success) {
        setCatalogError(response.message || "No se pudo eliminar el material en backend.");
        return;
      }

      await loadCatalogoFromBackend();
      setQuantities((prev) => {
        if (!(itemId in prev)) {
          return prev;
        }
        const next = { ...prev };
        delete next[itemId];
        return next;
      });
    } finally {
      setIsCatalogSaving(false);
    }
  };

  const handleFinishCita = async () => {
    if (!activeCitaTask) {
      router.push(getReturnRouteForLoggedUser());
      return;
    }

    try {
      await updateTask(activeCitaTask, {
        stage: "disenos",
        status: "pendiente",
        citaStarted: true,
        citaFinished: true,
      });
      runtimeStore.removeItem(activeCitaTaskStorageKey);
      setActiveCitaTaskId(null);
      router.push(getReturnRouteForLoggedUser());
    } catch {
      setFinishFormalError("No se pudo completar la cita. Intenta de nuevo.");
    }
  };

  const validateFormalSections = (): boolean => {
    const hasProject =
      client.trim() !== "" ||
      projectType !== "" ||
      location.trim() !== "" ||
      deliveryWeeksMin.trim() !== "" ||
      deliveryWeeksMax.trim() !== "";
    const largoN = Number.parseFloat(largo) || 0;
    const altoN = Number.parseFloat(alto) || 0;
    const fondoN = Number.parseFloat(fondo) || 0;
    const hasMeasures = largoN > 0 || altoN > 0 || fondoN > 0;
    const hasCatalog = Object.values(quantities).some((q) => q > 0);
    return !!(hasProject && hasMeasures && hasCatalog);
  };

  const buildCotizacionFormalDataFromForm = (): CotizacionFormalData => ({
    client: client.trim() || "—",
    ...(activeCotizacionFormalTask?.clientId ? { clienteId: activeCotizacionFormalTask.clientId } : {}),
    projectType: projectType || "—",
    location: location.trim() || "—",
    date: formatDeliveryWeeksLabel(deliveryWeeksMin, deliveryWeeksMax) || "—",
    rangeLabel: "Cotización formal",
    cubierta: baseMaterialLabel || "—",
    frente: colorLabel || "—",
    herraje: "—",
    destacadosPdf: highlightedMaterialIds,
  });

  const saveFormalInActiveTask = async (data: CotizacionFormalData) => {
    if (!activeCotizacionFormalTask) return null;
    if (!validateFormalSections()) {
      setFinishFormalError("Completa al menos un dato en cada sección: datos del proyecto, medidas y al menos un ítem en el catálogo.");
      return null;
    }

    const codigoProyecto = activeCotizacionFormalTask.codigoProyecto ?? generatePublicProjectCode();
    const cotizacionesFormales = [...getCotizacionesFormalesList(activeCotizacionFormalTask), data];

    await updateTask(activeCotizacionFormalTask, {
      codigoProyecto,
      cotizacionesFormales,
      cotizacionFormalData: data,
      citaFinished: true,
    });

    return { codigoProyecto };
  };

  const uploadFormalArtifacts = async (
    relatedTaskId: string,
    clientId: string,
    formalFilename: string,
    workshopFilename: string,
    formalDataUrl: string,
    workshopDataUrl: string,
  ) => {
    const formalUpload = await subirPdfGeneradoConMetadata(
      formalDataUrl,
      formalFilename,
      buildFormalUploadMetadata("cotizacion_formal", clientId, relatedTaskId),
    );

    const workshopUpload = await subirPdfGeneradoConMetadata(
      workshopDataUrl,
      workshopFilename,
      buildFormalUploadMetadata("hoja_taller", clientId, relatedTaskId),
    );

    const needsFallbackTaskSync =
      !alreadyRelatedToTask(relatedTaskId, formalUpload.relacionadoA, formalUpload.relacionadoId, formalUpload.tareasId) ||
      !alreadyRelatedToTask(relatedTaskId, workshopUpload.relacionadoA, workshopUpload.relacionadoId, workshopUpload.tareasId);

    if (needsFallbackTaskSync) {
      try {
        const syncResponse = await agregarArchivos(relatedTaskId, [
          {
            nombre: formalFilename,
            tipo: "cotizacion_formal",
            url: formalUpload.url,
          },
          {
            nombre: workshopFilename,
            tipo: "hoja_taller",
            url: workshopUpload.url,
          },
        ]);

        if (!syncResponse.success) {
          throw new Error("No se pudo registrar la cotizacion formal en la tarea.");
        }
      } catch (error) {
        // ClienteArchivo es la fuente de verdad. Si el fallback legado falla, no bloqueamos el cierre.
        console.warn("[cotizador] fallback de sync en tarea omitido:", error);
      }
    }

    return {
      formalPdfUrl: formalUpload.url,
      workshopPdfUrl: workshopUpload.url,
    };
  };

  const handleTerminarCotizacion = async () => {
    setFinishFormalError("");
    if (!activeCotizacionFormalTaskId || !activeCotizacionFormalTask) {
      router.push(getReturnRouteForLoggedUser());
      return;
    }
    if (!validateFormalSections()) {
      setFinishFormalError("Completa al menos un dato en cada sección: datos del proyecto, medidas y al menos un ítem en el catálogo.");
      return;
    }

    let dataUrl: string;
    try {
      dataUrl = await buildFormalPdfDataUrl();
    } catch {
      setFinishFormalError("No se pudo generar el PDF. Intenta de nuevo.");
      return;
    }

    let workshopUrl: string;
    try {
      const logoDataUrl = await getImageDataUrl(
        new URL("/images/kuche-logo.png", window.location.origin).toString(),
      );
      workshopUrl = await buildWorkshopPdfDataUrl(collectWorkshopPdfBuildInput(), logoDataUrl);
    } catch {
      setFinishFormalError("No se pudo generar la hoja de taller. Intenta de nuevo.");
      return;
    }

    const data = buildCotizacionFormalDataFromForm();
    const existingCount = getCotizacionesFormalesList(activeCotizacionFormalTask).length;
    const formalPdfKey = createFormalPdfKey(activeCotizacionFormalTaskId, existingCount);
    const workshopPdfKey = createWorkshopPdfKey(activeCotizacionFormalTaskId, existingCount);
    const relatedTaskId =
      activeCotizacionFormalTask.sourceId?.trim() ||
      activeCotizacionFormalTask.id?.trim() ||
      activeCotizacionFormalTaskId;
    const formalFilename = `cotizacion-formal-${relatedTaskId}.pdf`;
    const workshopFilename = `hoja-taller-${relatedTaskId}.pdf`;
    let clientId: string;
    try {
      clientId = getRequiredClientIdForFormalUpload(
        activeCotizacionFormalTask,
        "cotizacion formal",
      );
    } catch (error) {
      setFinishFormalError(error instanceof Error ? error.message : "No se encontro clienteId para cotizacion formal.");
      return;
    }

    let formalPdfUrl: string;
    let workshopPdfUrl: string;

    try {
      downloadDataUrlFile(dataUrl, formalFilename);
      downloadDataUrlFile(workshopUrl, workshopFilename);
      const uploadedArtifacts = await uploadFormalArtifacts(
        relatedTaskId,
        clientId,
        formalFilename,
        workshopFilename,
        dataUrl,
        workshopUrl,
      );
      formalPdfUrl = uploadedArtifacts.formalPdfUrl;
      workshopPdfUrl = uploadedArtifacts.workshopPdfUrl;
    } catch {
      setFinishFormalError("No se pudieron subir o sincronizar los PDFs en backend. Intenta de nuevo.");
      return;
    }

    try {
      await saveFormalPdf(formalPdfKey, dataUrl);
      await saveFormalPdf(workshopPdfKey, workshopUrl);
    } catch {
      setFinishFormalError("No se pudo guardar los PDFs. Intenta de nuevo.");
      return;
    }

    data.formalPdfKey = formalPdfKey;
    data.workshopPdfKey = workshopPdfKey;
    data.formalPdfUrl = formalPdfUrl;
    data.workshopPdfUrl = workshopPdfUrl;

    try {
      const result = await saveFormalInActiveTask(data);
      if (!result) return;

      await updateTask(activeCotizacionFormalTask, {
        stage: "contrato",
        status: "pendiente",
        followUpEnteredAt: Date.now(),
        followUpStatus: "pendiente",
      });

      runtimeStore.removeItem(activeCotizacionFormalTaskStorageKey);
      setActiveCotizacionFormalTaskId(null);
      const returnUrl = runtimeStore.getItem(citaReturnUrlStorageKey) || getReturnRouteForLoggedUser();
      runtimeStore.removeItem(citaReturnUrlStorageKey);
      router.push(returnUrl);
    } catch {
      setFinishFormalError("No se pudo guardar la cotización formal en backend. Intenta de nuevo.");
    }
  };

  const handleTerminarYContinuar = async () => {
    setFinishFormalError("");
    if (!activeCotizacionFormalTaskId || !activeCotizacionFormalTask) return;
    if (!validateFormalSections()) {
      setFinishFormalError("Completa al menos un dato en cada sección: datos del proyecto, medidas y al menos un ítem en el catálogo.");
      return;
    }

    let dataUrl: string;
    try {
      dataUrl = await buildFormalPdfDataUrl();
    } catch {
      setFinishFormalError("No se pudo generar el PDF. Intenta de nuevo.");
      return;
    }

    let workshopUrl: string;
    try {
      const logoDataUrl = await getImageDataUrl(
        new URL("/images/kuche-logo.png", window.location.origin).toString(),
      );
      workshopUrl = await buildWorkshopPdfDataUrl(collectWorkshopPdfBuildInput(), logoDataUrl);
    } catch {
      setFinishFormalError("No se pudo generar la hoja de taller. Intenta de nuevo.");
      return;
    }

    const data = buildCotizacionFormalDataFromForm();
    const existingCount = getCotizacionesFormalesList(activeCotizacionFormalTask).length;
    const formalPdfKey = createFormalPdfKey(activeCotizacionFormalTaskId, existingCount);
    const workshopPdfKey = createWorkshopPdfKey(activeCotizacionFormalTaskId, existingCount);
    const relatedTaskId =
      activeCotizacionFormalTask.sourceId?.trim() ||
      activeCotizacionFormalTask.id?.trim() ||
      activeCotizacionFormalTaskId;
    const formalFilename = `cotizacion-formal-${relatedTaskId}.pdf`;
    const workshopFilename = `hoja-taller-${relatedTaskId}.pdf`;
    let clientId: string;
    try {
      clientId = getRequiredClientIdForFormalUpload(
        activeCotizacionFormalTask,
        "cotizacion formal",
      );
    } catch (error) {
      setFinishFormalError(error instanceof Error ? error.message : "No se encontro clienteId para cotizacion formal.");
      return;
    }

    let formalPdfUrl: string;
    let workshopPdfUrl: string;

    try {
      downloadDataUrlFile(dataUrl, formalFilename);
      downloadDataUrlFile(workshopUrl, workshopFilename);
      const uploadedArtifacts = await uploadFormalArtifacts(
        relatedTaskId,
        clientId,
        formalFilename,
        workshopFilename,
        dataUrl,
        workshopUrl,
      );
      formalPdfUrl = uploadedArtifacts.formalPdfUrl;
      workshopPdfUrl = uploadedArtifacts.workshopPdfUrl;
    } catch {
      setFinishFormalError("No se pudieron subir o sincronizar los PDFs en backend. Intenta de nuevo.");
      return;
    }

    try {
      await saveFormalPdf(formalPdfKey, dataUrl);
      await saveFormalPdf(workshopPdfKey, workshopUrl);
      data.formalPdfUrl = formalPdfUrl;
      data.workshopPdfUrl = workshopPdfUrl;
      data.formalPdfKey = formalPdfKey;
      data.workshopPdfKey = workshopPdfKey;
      const result = await saveFormalInActiveTask(data);
      if (!result) return;
    } catch {
      setFinishFormalError("No se pudo guardar la cotización formal. Intenta de nuevo.");
      return;
    }

    setProjectType(projectTypes[0]);
    setLocation("");
    setDeliveryWeeksMin("");
    setDeliveryWeeksMax("");
    setLargo("4.2");
    setAlto("2.4");
    setFondo("0.6");
    setQuantities({});
    setHighlightedMaterialIds([]);
    setMaterialBaseItemId(getDefaultMaterialBaseItemId);
    setColorItemId(getDefaultColorItemId);
    setThicknessItemId(getDefaultThicknessItemId);
  };

  const getImageDataUrl = async (imageUrl: string) => {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      return null;
    }
    const blob = await response.blob();
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(typeof reader.result === "string" ? reader.result : null);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  };

  const normalizeImageForPdf = async (dataUrl: string) => {
    return await new Promise<string | null>((resolve) => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = image.width;
        canvas.height = image.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 0, 0);
        resolve(canvas.toDataURL("image/jpeg", 0.9));
      };
      image.onerror = () => resolve(null);
      image.src = dataUrl;
    });
  };

  const handleGenerateClientPdf = async (returnDataUrl?: boolean): Promise<string | void> => {
    if (typeof window === "undefined") {
      return;
    }

    const doc = new jsPDF({ unit: "pt", format: "letter" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 42;
    const contentWidth = pageWidth - marginX * 2;
    const brandColor: [number, number, number] = [97, 28, 28];
    const accentColor: [number, number, number] = [17, 24, 39];
    const darkColor: [number, number, number] = [31, 41, 55];
    const mutedColor: [number, number, number] = [100, 116, 139];
    const softFill: [number, number, number] = [248, 250, 252];
    const lightBorder: [number, number, number] = [226, 232, 240];
    const dateLabel = new Date().toLocaleDateString("es-MX");
    const deliveryWeeksStr = formatDeliveryWeeksLabel(deliveryWeeksMin, deliveryWeeksMax);

    const normalizedType = projectType.toLowerCase();
    const formalProjectType = normalizedType.includes("cocina")
      ? "COCINA"
      : normalizedType.includes("cl") || normalizedType.includes("vest")
        ? "VESTIDOR O CLÓSET"
        : normalizedType.includes("bañ") || normalizedType.includes("ban")
          ? "BAÑOS"
          : normalizedType.includes("tv")
            ? "TV UNIT"
            : projectType.toUpperCase();

    const selectedLines = catalogoKuche.flatMap((category) =>
      category.items
        .map((item) => {
          const qty = Math.max(quantities[item.id] ?? 0, 0);
          if (!qty) {
            return null;
          }
          return {
            id: item.id,
            category: category.category,
            label: item.label,
            unit: catalogItemUnitLabel(item),
            qty,
            total: item.unitPrice * qty,
          };
        })
        .filter(
          (line): line is { id: string; category: string; label: string; unit: string; qty: number; total: number } =>
            line !== null,
        ),
    );

    const highlightedLines = selectedLines.filter((line) => highlightedMaterialIds.includes(line.id));
    const summaryLines = highlightedLines.length > 0 ? highlightedLines : selectedLines.slice(0, 4);

    const toHumanUnit = (unitRaw: string, qty: number) => {
      const unit = unitRaw.trim().toLowerCase();
      if (qty === 1) return unitRaw;
      if (unit === "pie") return "pies";
      if (unit === "metro lineal") return "metros lineales";
      if (unit === "m²" || unit === "m2" || unit === "mm") return unitRaw;
      if (unit.endsWith("s")) return unitRaw;
      return `${unitRaw}s`;
    };

    const drawersQty = selectedLines
      .filter((line) => /caj[oó]n/i.test(line.label))
      .reduce((acc, line) => acc + line.qty, 0);
    const zocloQty = selectedLines
      .filter((line) => /zoclo/i.test(line.label))
      .reduce((acc, line) => acc + line.qty, 0);
    const spotsQty = selectedLines
      .filter((line) => /spot/i.test(line.label))
      .reduce((acc, line) => acc + line.qty, 0);
    const highlightedSpecLines = summaryLines
      .map((line) => `Este proyecto cuenta con ${line.qty} ${toHumanUnit(line.unit, line.qty)} de ${line.label}.`);
    const hasElectroCategorySelections = selectedLines.some((line) =>
      /extra[ií]bles|electrodom/i.test(line.category),
    );

    const largoValue = Number.parseFloat(largo) || 0;
    const altoValue = Number.parseFloat(alto) || 0;
    const fondoValue = Number.parseFloat(fondo) || 0;
    const metrosLinealesForDescription = largoValue;
    const basePrice = Math.round(precioTotalSinIva);
    const projectPrice = Math.round(totalNeto);
    const anticipo = Math.round(projectPrice * 0.5);
    const primerDia = Math.round(projectPrice * 0.25);
    const finiquito = projectPrice - anticipo - primerDia;
    const ivaEstimado = Math.round(montoIva);

    const projectDescription =
      `Proyecto de ${formalProjectType} fabricado en ${baseMaterialLabel} (${thicknessMm}mm), ` +
      `tono ${colorLabel.toLowerCase()}, con medidas generales de ` +
      `${largoValue.toFixed(1)}m de largo, ${altoValue.toFixed(1)}m de alto y ${fondoValue.toFixed(1)}m de fondo, ` +
      `considerando ${metrosLinealesForDescription.toFixed(1)} m lineales. ` +
      "Incluye fabricación e instalación de módulos y componentes seleccionados.";

    const specs = [
      `Este proyecto cuenta con ${drawersQty} cajones seleccionados.`,
      "Todas las puertas en este proyecto consideran cierre suave.",
      `Este proyecto cuenta con ${zocloQty} elementos de zoclo.`,
      spotsQty
        ? `Este proyecto considera ${spotsQty} spots de iluminación.`
        : "Este proyecto no considera spots de iluminación.",
      ...(highlightedSpecLines.length > 0
        ? highlightedSpecLines
        : ["Accesorios y conceptos principales por definir en visita técnica."]),
    ];

    const legalNotes = [
      "Se requiere el 50% como anticipo, un 25% al iniciar la instalación y el 25% restante al finalizar la instalación.",
      hasElectroCategorySelections
        ? "La presente propuesta sí incluye conceptos de la categoría Extraíbles y electrodomésticos según la selección del cliente."
        : "La cotización no incluye ningún electrodoméstico salvo que se indique por separado.",
      "Las medidas de los muebles pueden variar dependiendo de las medidas finales del espacio.",
      `Tiempo de entrega estimado: ${deliveryWeeksStr || "Por definir"}.`,
      `Precio base sin IVA: ${formatCurrency(basePrice)}. IVA estimado: ${formatCurrency(ivaEstimado)}.`,
      "Vigencia de la cotización: 15 días naturales.",
    ];

    const getTableFinalY = () =>
      (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? 0;
    const ensureSpace = (currentY: number, requiredHeight: number) => {
      if (currentY + requiredHeight <= pageHeight - 52) {
        return currentY;
      }
      doc.addPage();
      return 56;
    };
    const drawSectionTitle = (title: string, y: number) => {
      doc.setDrawColor(lightBorder[0], lightBorder[1], lightBorder[2]);
      doc.line(marginX, y + 4, marginX + contentWidth, y + 4);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(brandColor[0], brandColor[1], brandColor[2]);
      doc.text(title, marginX, y);
    };

    const logoDataUrl = await getImageDataUrl(new URL("/images/kuche-logo.png", window.location.origin).toString());

    doc.setFillColor(brandColor[0], brandColor[1], brandColor[2]);
    doc.roundedRect(marginX, 28, contentWidth, 78, 10, 10, "F");
    doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.roundedRect(marginX + contentWidth - 180, 28, 180, 78, 10, 10, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(17);
    if (logoDataUrl) {
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(marginX + 12, 38, 112, 58, 6, 6, "F");
      doc.addImage(logoDataUrl, "PNG", marginX + 18, 44, 100, 44, undefined, "FAST");
    }
    doc.text("KUCHE", marginX + 132, 54);
    doc.setFontSize(13);
    doc.text("COTIZACIÓN FORMAL", marginX + 132, 75);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.text("Mobiliario residencial a medida", marginX + 132, 91);

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    const rightInfoLabelX = marginX + contentWidth - 164;
    const rightInfoValueX = marginX + contentWidth - 16;
    doc.text("FECHA", rightInfoLabelX, 53);
    doc.text("TIPO DE PROYECTO", rightInfoLabelX, 79);
    doc.setFont("helvetica", "normal");
    doc.text(dateLabel, rightInfoValueX, 53, { align: "right" });
    const wrappedProjectType = doc.splitTextToSize(formalProjectType, 84);
    wrappedProjectType.forEach((line: string, index: number) => {
      doc.text(line, rightInfoValueX, 79 + index * 9, { align: "right" });
    });

    autoTable(doc, {
      startY: 122,
      body: [
        ["CLIENTE", client || "Pendiente de definir"],
        ["DIRECCIÓN", location || "Pendiente de definir"],
        ["FECHA", dateLabel],
        ["TIPO DE PROYECTO", formalProjectType],
        ["TIEMPO DE ENTREGA (SEMANAS APROX.)", deliveryWeeksStr || "Por definir"],
      ],
      theme: "grid",
      styles: {
        fontSize: 9,
        textColor: darkColor,
        lineColor: lightBorder,
        lineWidth: 0.5,
        cellPadding: 6,
      },
      columnStyles: {
        0: { cellWidth: 150, fontStyle: "bold", fillColor: softFill },
        1: { cellWidth: contentWidth - 150 },
      },
      margin: { left: marginX, right: marginX },
    });

    const baseInfoY = getTableFinalY() + 18;
    drawSectionTitle("APARTADO Y DESCRIPCIÓN", baseInfoY);

    autoTable(doc, {
      startY: baseInfoY + 8,
      head: [["APARTADO", "DESCRIPCIÓN", "PRECIO"]],
      body: [["C-1", projectDescription, formatCurrency(projectPrice)]],
      theme: "grid",
      styles: {
        fontSize: 9,
        textColor: darkColor,
        lineColor: lightBorder,
        lineWidth: 0.5,
        cellPadding: 6,
      },
      headStyles: { fillColor: softFill, textColor: darkColor, fontStyle: "bold" },
      columnStyles: {
        0: { cellWidth: 76, halign: "center", fontStyle: "bold" },
        1: { cellWidth: contentWidth - 214 },
        2: { cellWidth: 138, halign: "right", fontStyle: "bold" },
      },
      margin: { left: marginX, right: marginX },
    });

    let cursorY = getTableFinalY() + 18;
    cursorY = ensureSpace(cursorY, 150);
    drawSectionTitle("DETALLES DE PROYECTO", cursorY);
    cursorY += 16;

    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.text("ESPECIFICACIONES DE PROYECTO", marginX + 4, cursorY);
    cursorY += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    specs.forEach((line) => {
      const wrapped = doc.splitTextToSize(`• ${line}`, contentWidth - 8);
      doc.text(wrapped, marginX + 4, cursorY);
      cursorY += wrapped.length * 10.5 + 3;
    });

    cursorY += 4;
    const pdfReferenceImages = await Promise.all(
      referenceImages.slice(0, 4).map(async (image) => ({
        ...image,
        pdfDataUrl: await normalizeImageForPdf(image.dataUrl),
      })),
    );
    const imageRows = Math.max(1, Math.ceil(pdfReferenceImages.length / 2));
    const imageAreaHeight = pdfReferenceImages.length ? imageRows * 94 + 12 : 56;
    cursorY = ensureSpace(cursorY, imageAreaHeight + 24);
    drawSectionTitle("IMÁGENES DE REFERENCIA", cursorY);
    cursorY += 10;
    doc.setDrawColor(lightBorder[0], lightBorder[1], lightBorder[2]);
    doc.roundedRect(marginX, cursorY, contentWidth, imageAreaHeight, 8, 8, "S");
    if (!pdfReferenceImages.length) {
      doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8.5);
      doc.text(
        "Espacio reservado para renders o imágenes aprobadas en visita comercial.",
        marginX + 10,
        cursorY + 33,
      );
    } else {
      const gridPadding = 8;
      const cellGap = 10;
      const cellWidth = (contentWidth - gridPadding * 2 - cellGap) / 2;
      const cellHeight = 84;
      pdfReferenceImages.forEach((image, index) => {
        const col = index % 2;
        const row = Math.floor(index / 2);
        const cellX = marginX + gridPadding + col * (cellWidth + cellGap);
        const cellY = cursorY + gridPadding + row * 94;
        doc.roundedRect(cellX, cellY, cellWidth, cellHeight, 6, 6, "S");
        try {
          if (!image.pdfDataUrl) {
            throw new Error("invalid-image");
          }
          doc.addImage(
            image.pdfDataUrl,
            "JPEG",
            cellX + 2,
            cellY + 2,
            cellWidth - 4,
            cellHeight - 4,
            undefined,
            "FAST",
          );
        } catch {
          doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          doc.text("No se pudo renderizar imagen", cellX + 8, cellY + 18);
        }
      });
    }

    cursorY += imageAreaHeight + 20;
    cursorY = ensureSpace(cursorY, 180);
    drawSectionTitle("CONDICIONES Y FORMA DE PAGO", cursorY);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
    let notesCursor = cursorY + 18;
    legalNotes.forEach((note) => {
      const wrapped = doc.splitTextToSize(`• ${note}`, contentWidth - 6);
      doc.text(wrapped, marginX + 3, notesCursor);
      notesCursor += wrapped.length * 9.5 + 2;
    });

    autoTable(doc, {
      startY: notesCursor + 6,
      head: [["CONCEPTO", "%", "MONTO"]],
      body: [
        ["PAGO INICIAL DE CONTRATO", "50%", formatCurrency(anticipo)],
        ["PRIMER DÍA DE INSTALACIÓN", "25%", formatCurrency(primerDia)],
        ["FINIQUITO", "25%", formatCurrency(finiquito)],
        ["TOTAL", "100%", formatCurrency(projectPrice)],
      ],
      theme: "grid",
      styles: {
        fontSize: 9,
        textColor: darkColor,
        lineColor: lightBorder,
        lineWidth: 0.5,
        cellPadding: 6,
      },
      headStyles: { fillColor: softFill, textColor: darkColor, fontStyle: "bold" },
      columnStyles: {
        0: { cellWidth: contentWidth - 198, fontStyle: "bold" },
        1: { cellWidth: 60, halign: "center" },
        2: { cellWidth: 138, halign: "right", fontStyle: "bold" },
      },
      margin: { left: marginX, right: marginX },
    });

    const footerY = pageHeight - 36;
    doc.setDrawColor(lightBorder[0], lightBorder[1], lightBorder[2]);
    doc.line(marginX, footerY - 18, marginX + contentWidth, footerY - 18);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
    doc.setFontSize(8);
    doc.text("Copal No. 303 Fracc. Vista Hermosa · Tel. 618 101 7363", marginX, footerY - 2);
    doc.text("cocinasinteligentesdgo@gmail.com", marginX, footerY + 10);

    const filename = `cotizacion-formal-${(client || "cliente").replace(/\s+/g, "-").toLowerCase()}.pdf`;
    if (returnDataUrl) {
      const blob = doc.output("blob");
      return new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.onerror = reject;
        r.readAsDataURL(blob);
      });
    }
    doc.save(filename);
  };

  /** Genera el PDF formal actual y lo devuelve como data URL (para guardar en la tarjeta). */
  const buildFormalPdfDataUrl = (): Promise<string> =>
    handleGenerateClientPdf(true) as Promise<string>;

  const handleGenerateWorkshopPdf = async () => {
    if (typeof window === "undefined") return;
    setFinishFormalError("");
    try {
      const logoDataUrl = await getImageDataUrl(
        new URL("/images/kuche-logo.png", window.location.origin).toString(),
      );
      const url = await buildWorkshopPdfDataUrl(collectWorkshopPdfBuildInput(), logoDataUrl);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      setFinishFormalError("No se pudo generar la hoja de taller. Intenta de nuevo.");
    }
  };

  const showCotizadorBottomBar = Boolean(activeCotizacionFormalTaskId || activeCitaTaskId);

  return (
    <div className={`space-y-8 ${showCotizadorBottomBar ? "pb-32" : "pb-24"}`}>
      <div className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-lg backdrop-blur-md">
        <p className="text-xs uppercase tracking-[0.3em] text-secondary">COTIZADOR PRO</p>
        <h1 className="mt-2 text-3xl font-semibold">Perfil del proyecto</h1>
        <p className="mt-2 max-w-2xl text-sm text-secondary">
          Fusiona una experiencia visual con un desglose técnico riguroso para el taller.
        </p>
      </div>
      {activeCitaTaskId ? (
        <div className="rounded-3xl border border-primary/10 bg-white/80 p-5 shadow-md backdrop-blur-md">
          <p className="text-xs uppercase tracking-[0.3em] text-secondary">Cita en curso</p>
          <p className="mt-2 text-sm text-secondary">
            Al terminar la cita se marcará como completada en el tablero. Usa el botón fijo al pie de la
            pantalla.
          </p>
        </div>
      ) : null}
      {activeCotizacionFormalTaskId ? (
        <FormalCotizacionBanner projectName={activeCotizacionFormalTask?.project ?? "Proyecto"} />
      ) : null}

      <section className="space-y-6 rounded-3xl border border-white/70 bg-white/80 p-8 shadow-xl backdrop-blur-md">
        <div>
          <h2 className="text-2xl font-semibold">Sección A · Datos del proyecto</h2>
          <p className="mt-2 text-sm text-secondary">Información base para abrir el expediente.</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-secondary">
            Datos del cliente y del proyecto
          </p>
          <div className="mt-4 grid grid-cols-1 items-end gap-x-4 gap-y-5 md:grid-cols-12">
            <div className="col-span-12 md:col-span-4">
              <label
                htmlFor="cotizador-cliente"
                className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.15em] text-secondary"
              >
                Cliente
              </label>
              <div className="flex gap-2">
                <input
                  id="cotizador-cliente"
                  value={client}
                  onChange={(event) => setClient(event.target.value)}
                  list="clientes-sugeridos"
                  placeholder="Buscar o escribir nuevo"
                  className="min-w-0 flex-1 rounded-xl border border-primary/10 bg-white px-3 py-2 text-sm outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    setNewClientName("");
                    setNewClientPhone("");
                    setNewClientEmail("");
                    setIsClientModalOpen(true);
                  }}
                  className="shrink-0 rounded-xl border border-primary/10 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-secondary transition hover:border-primary/25"
                >
                  Nuevo
                </button>
              </div>
              <datalist id="clientes-sugeridos">
                {clients.map((entry) => (
                  <option key={entry.name} value={entry.name} />
                ))}
              </datalist>
            </div>

            <div className="col-span-12 flex flex-col md:col-span-4">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.15em] text-secondary">
                Tipo de proyecto
              </span>
              <div className="min-w-0 flex-1">
                <CatalogProjectTypeField
                  value={projectType}
                  onChange={setProjectType}
                  placeholder="Cocinas, Baños, comedor, consultorio..."
                  innerRowClassName="flex w-full gap-2"
                  buttonClassName="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-white text-secondary shadow-sm transition hover:border-primary/30 hover:bg-primary/[0.04]"
                  inputClassName="w-full min-w-0 rounded-xl border border-primary/10 bg-white px-3 py-2 text-sm outline-none"
                />
              </div>
            </div>

            <div className="col-span-12 md:col-span-4">
              <label
                htmlFor="cotizador-ubicacion"
                className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.15em] text-secondary"
              >
                Ubicación
              </label>
              <input
                id="cotizador-ubicacion"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="Ciudad / Estado"
                className="w-full rounded-xl border border-primary/10 bg-white px-3 py-2 text-sm outline-none"
              />
            </div>

            <div className="col-span-12 md:col-span-4" role="group" aria-label="Tiempo de entrega en semanas">
              <p className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.15em] text-secondary">
                Tiempo de entrega (sem)
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="cotizador-semanas-min"
                    className="mb-1 block text-[10px] font-medium uppercase tracking-[0.12em] text-secondary/70"
                  >
                    Mín.
                  </label>
                  <input
                    id="cotizador-semanas-min"
                    value={deliveryWeeksMin}
                    onChange={(event) => setDeliveryWeeksMin(event.target.value)}
                    type="number"
                    min={1}
                    step={1}
                    placeholder="ej. 8"
                    className="w-full rounded-xl border border-primary/10 bg-white px-3 py-2 text-sm outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="cotizador-semanas-max"
                    className="mb-1 block text-[10px] font-medium uppercase tracking-[0.12em] text-secondary/70"
                  >
                    Máx.
                  </label>
                  <input
                    id="cotizador-semanas-max"
                    value={deliveryWeeksMax}
                    onChange={(event) => setDeliveryWeeksMax(event.target.value)}
                    type="number"
                    min={1}
                    step={1}
                    placeholder="ej. 9"
                    className="w-full rounded-xl border border-primary/10 bg-white px-3 py-2 text-sm outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="col-span-12 md:col-span-8" role="group" aria-label="Medidas generales en metros">
              <p className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.15em] text-secondary">
                Medidas generales (m)
              </p>
              <span className="sr-only">Largo y alto del espacio general en metros.</span>
              <div className="grid grid-cols-2 gap-4 sm:max-w-md">
                <div>
                  <label
                    htmlFor="cotizador-largo"
                    className="mb-1 block text-[10px] font-medium uppercase tracking-[0.12em] text-secondary/70"
                  >
                    Largo
                  </label>
                  <input
                    id="cotizador-largo"
                    value={largo}
                    onChange={(event) => setLargo(event.target.value)}
                    type="number"
                    min="0"
                    step="0.1"
                    className="w-full rounded-xl border border-primary/10 bg-white px-3 py-2 text-sm outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="cotizador-alto"
                    className="mb-1 block text-[10px] font-medium uppercase tracking-[0.12em] text-secondary/70"
                  >
                    Alto
                  </label>
                  <input
                    id="cotizador-alto"
                    value={alto}
                    onChange={(event) => setAlto(event.target.value)}
                    type="number"
                    min="0"
                    step="0.1"
                    className="w-full rounded-xl border border-primary/10 bg-white px-3 py-2 text-sm outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <motion.section
        key="section-b"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-6 rounded-3xl border border-white/70 bg-white/80 p-8 shadow-xl backdrop-blur-md"
      >
        <div>
          <h2 className="text-2xl font-semibold">Sección B · Refinamiento y especificaciones</h2>
          <p className="mt-2 text-sm text-secondary">
            Ajusta materiales, herrajes y extras. El precio final se actualiza en tiempo real.
          </p>
        </div>

        <div className="rounded-3xl border border-dashed border-primary/20 bg-white p-6">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-secondary">Importar</p>
              <h3 className="mt-2 text-lg font-semibold">Subir Excel desde app de diseños</h3>
              <p className="mt-1 text-[11px] text-secondary">
                Sube un archivo Excel con columnas como{" "}
                <span className="font-semibold">Categoria, Descripcion, Cantidad, PrecioUnitario</span>.
              </p>
            </div>
            <label className="ml-auto inline-flex cursor-pointer items-center rounded-2xl bg-accent px-4 py-2 text-xs font-semibold text-white">
              Subir Excel de materiales
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleExcelImport}
                className="hidden"
              />
            </label>
            <button
              type="button"
              onClick={resetCatalogToDefault}
              className="rounded-2xl border border-primary/10 bg-white px-4 py-2 text-xs font-semibold text-secondary hover:border-primary/30"
            >
              Restablecer catálogo base
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
            <span className="rounded-full border border-primary/10 bg-primary/5 px-3 py-1 text-secondary">
              Vista actual:{" "}
              <span className="font-semibold">
                {isExcelViewActive ? "Excel importado" : "Catálogo manual"}
              </span>
            </span>
            {excelImportSummary ? (
              <button
                type="button"
                className="rounded-full border border-primary/10 px-3 py-1 text-[11px] font-semibold text-secondary hover:border-primary/30"
                onClick={() => setIsExcelViewActive((prev) => !prev)}
              >
                Cambiar a vista {isExcelViewActive ? "catálogo" : "Excel"}
              </button>
            ) : null}
          </div>
          {excelImportSummary ? (
            <div className="mt-4 space-y-2 rounded-2xl border border-primary/10 bg-primary/5 p-4 text-[11px] text-secondary">
              <p className="font-semibold text-primary">
                {excelImportSummary.fileName}: {excelImportSummary.imported} filas importadas,
                {` `}
                {excelImportSummary.skipped} filas omitidas.
              </p>
              {excelImportSummary.errors.length ? (
                <ul className="list-disc space-y-1 pl-4">
                  {excelImportSummary.errors.slice(0, 5).map((message, index) => (
                    <li key={index}>{message}</li>
                  ))}
                  {excelImportSummary.errors.length > 5 ? (
                    <li>… {excelImportSummary.errors.length - 5} detalles adicionales.</li>
                  ) : null}
                </ul>
              ) : null}
            </div>
          ) : null}
        </div>

        {isExcelViewActive && excelImportSummary && (
          <div className="rounded-3xl border border-primary/10 bg-white p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-secondary">Vista Excel</p>
                <h3 className="mt-2 text-lg font-semibold">Resumen de materiales importados</h3>
                <p className="mt-1 text-[11px] text-secondary">
                  Tabla generada a partir del archivo Excel. El catálogo base no se modifica.
                </p>
              </div>
            </div>
            <div className="mt-4 max-h-[360px] overflow-auto rounded-2xl border border-primary/10">
              <table className="min-w-full text-left text-[11px] text-secondary">
                <thead className="bg-primary/5 text-[10px] uppercase tracking-[0.18em] text-secondary">
                  <tr>
                    <th className="px-3 py-2">Categoría</th>
                    <th className="px-3 py-2">Material</th>
                    <th className="px-3 py-2 text-right">Cantidad</th>
                    <th className="px-3 py-2 text-right">Precio unitario</th>
                    <th className="px-3 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {excelPreviewLines.map((line) => (
                    <tr key={line.id} className="border-t border-primary/5">
                      <td className="px-3 py-2 align-top text-[11px] font-semibold">
                        {line.categoria}
                      </td>
                      <td className="px-3 py-2 align-top text-[11px]">{line.descripcion}</td>
                      <td className="px-3 py-2 align-top text-right text-[11px]">
                        {line.cantidad}
                      </td>
                      <td className="px-3 py-2 align-top text-right text-[11px]">
                        {formatCurrency(line.precioUnitario)}
                      </td>
                      <td className="px-3 py-2 align-top text-right text-[11px]">
                        {formatCurrency(line.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!isExcelViewActive && (
          <>
        <div className="flex flex-wrap gap-3">
          {catalogoKuche.map((category) => (
            <button
              key={category.category}
              onClick={() => {
                setActiveTab(category.category);
                setNewItemCategory(category.category);
              }}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                activeTab === category.category
                  ? "bg-accent text-white"
                  : "border border-primary/10 bg-white text-secondary"
              }`}
            >
              {category.category}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex w-full max-w-xs items-center gap-2 rounded-2xl border border-primary/10 bg-white px-3 py-1.5 text-xs font-semibold text-secondary">
            <span>Buscar</span>
            <input
              value={materialSearch}
              onChange={(event) => setMaterialSearch(event.target.value)}
              placeholder="Ej. melamina, cajón, bisagra"
              className="w-full bg-transparent text-[13px] font-normal text-gray-700 outline-none"
            />
          </label>
          {materialSearch ? (
            <button
              type="button"
              onClick={() => setMaterialSearch("")}
              className="rounded-full border border-primary/10 px-3 py-2 text-xs font-semibold text-secondary"
            >
              Limpiar
            </button>
          ) : null}
          {normalizedSearch ? (
            <span className="text-xs text-secondary">
              {visibleItems.length} resultado{visibleItems.length === 1 ? "" : "s"}
            </span>
          ) : null}
        </div>

        <div className="rounded-3xl border border-primary/10 bg-white p-6">
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {visibleItems.map(({ item, category }) => {
              const qty = quantities[item.id] ?? 0;
              const isHighlighted = highlightedMaterialIds.includes(item.id);
              return (
                <div
                  key={item.id}
                  className="flex h-full flex-col gap-2 rounded-2xl border border-primary/10 bg-white px-2.5 py-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="leading-tight">
                      <p className="text-[12px] font-semibold">{item.label}</p>
                      {normalizedSearch ? (
                        <p className="text-[10px] text-secondary">{category}</p>
                      ) : null}
                      <p className="text-[10px] text-secondary">
                        {formatCurrency(item.unitPrice)}/{catalogItemUnitLabel(item)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleHighlightForPdf(item.id, qty);
                        }}
                        className={`flex h-7 w-7 items-center justify-center rounded-full border transition ${
                          isHighlighted
                            ? "border-rose-300 bg-rose-50 text-rose-600"
                            : "border-primary/10 text-secondary hover:border-primary/30"
                        }`}
                        title={isHighlighted ? "Quitar destacado del PDF" : "Destacar en PDF"}
                        aria-label={isHighlighted ? "Quitar destacado del PDF" : "Destacar en PDF"}
                      >
                        <Heart className={`h-3.5 w-3.5 ${isHighlighted ? "fill-current" : ""}`} />
                      </button>
                      <div className="relative" ref={openMenuId === item.id ? openMenuRef : null}>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setOpenMenuId((prev) => (prev === item.id ? null : item.id));
                        }}
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-primary/10 text-sm font-semibold text-secondary transition hover:border-primary/30"
                      >
                        +
                      </button>
                      {openMenuId === item.id ? (
                        <div
                          className="absolute right-0 top-full z-10 mt-2 w-32 rounded-2xl border border-primary/10 bg-white p-2 shadow-lg"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              handleEditMaterial(item.id);
                              setOpenMenuId(null);
                            }}
                            className="w-full rounded-xl px-3 py-2 text-left text-[11px] font-semibold text-secondary transition hover:bg-primary/5"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              handleDeleteMaterial(item.id);
                              setOpenMenuId(null);
                            }}
                            className="mt-1 w-full rounded-xl px-3 py-2 text-left text-[11px] font-semibold text-rose-600 transition hover:bg-rose-50"
                          >
                            Eliminar
                          </button>
                        </div>
                      ) : null}
                    </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleQuantityChange(item.id, qty - 1)}
                      className="h-7 w-7 rounded-full border border-primary/10 text-sm font-semibold text-secondary transition hover:border-primary/30"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="0"
                      value={qty}
                      onChange={(event) =>
                        handleQuantityChange(
                          item.id,
                          Number.parseInt(event.target.value, 10) || 0,
                        )
                      }
                      className="w-12 rounded-2xl border border-primary/10 bg-white px-2 py-1 text-center text-[11px] outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleQuantityChange(item.id, qty + 1)}
                      className="h-7 w-7 rounded-full border border-primary/10 text-sm font-semibold text-secondary transition hover:border-primary/30"
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
            {normalizedSearch && visibleItems.length === 0 ? (
              <div className="col-span-full rounded-2xl border border-dashed border-primary/20 bg-primary/5 px-4 py-8 text-center text-xs font-semibold text-secondary">
                No hay materiales que coincidan con la búsqueda.
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => {
                setNewItemCategory(activeCategory?.category ?? catalogoKuche[0]?.category ?? "");
                setNewItemName("");
                setNewItemPrice("");
                setNewItemUnitType("pieza");
                setEditingItemId(null);
                setIsAddModalOpen(true);
              }}
              className="flex w-full items-center justify-center rounded-2xl border-2 border-dashed border-primary/20 bg-primary/5 px-4 py-4 text-xs font-semibold uppercase tracking-[0.2em] text-secondary transition hover:border-primary/40 hover:bg-primary/10"
            >
              + Agregar material
            </button>
          </div>
          {activeCategory?.category === "GASTOS FIJOS" ? (
            <div className="mt-6 space-y-4 border-t border-gray-200 pt-6">
              <div className="group flex items-center justify-between">
                <label className="text-sm font-medium text-gray-500">
                  Coeficiente de Operación (CO)
                </label>
                <div className="flex items-center space-x-2">
                  <span className="mr-2 text-xs text-gray-400">
                    {formatCurrency(totales.montoUtilidad)}
                  </span>
                  <div className="flex items-center bg-transparent">
                    <button
                      type="button"
                      onClick={() => setUtilidadPct((prev) => clampPct(prev - 5))}
                      className="p-2 text-gray-200 transition-colors hover:text-gray-400 focus:outline-none"
                      aria-label="Disminuir"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <div className="flex w-12 items-center justify-center">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={utilidadPct}
                        onFocus={(event) => event.currentTarget.select()}
                        onChange={(event) =>
                          setUtilidadPct(
                            clampPct(Number.parseInt(event.target.value, 10) || 0),
                          )
                        }
                        className="w-full appearance-none bg-transparent text-center text-sm font-medium text-gray-700 focus:outline-none"
                      />
                      <span className="text-sm font-medium text-gray-700">%</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setUtilidadPct((prev) => clampPct(prev + 5))}
                      className="p-2 text-gray-200 transition-colors hover:text-gray-400 focus:outline-none"
                      aria-label="Aumentar"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
              <div className="group flex items-center justify-between">
                <label className="text-sm font-medium text-gray-500">
                  Flete / Logística y Maniobras
                </label>
                <div className="flex items-center space-x-2">
                  <span className="mr-2 text-xs text-gray-400">
                    {formatCurrency(totales.montoFlete)}
                  </span>
                  <div className="flex items-center bg-transparent">
                    <button
                      type="button"
                      onClick={() => setFletePct((prev) => clampPct(prev - 5))}
                      className="p-2 text-gray-200 transition-colors hover:text-gray-400 focus:outline-none"
                      aria-label="Disminuir"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <div className="flex w-12 items-center justify-center">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={fletePct}
                        onFocus={(event) => event.currentTarget.select()}
                        onChange={(event) =>
                          setFletePct(
                            clampPct(Number.parseInt(event.target.value, 10) || 0),
                          )
                        }
                        className="w-full appearance-none bg-transparent text-center text-sm font-medium text-gray-700 focus:outline-none"
                      />
                      <span className="text-sm font-medium text-gray-700">%</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFletePct((prev) => clampPct(prev + 5))}
                      className="p-2 text-gray-200 transition-colors hover:text-gray-400 focus:outline-none"
                      aria-label="Aumentar"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-500">IVA (16%)</label>
                <span className="text-xs text-gray-400">{formatCurrency(totales.montoIva)}</span>
              </div>
            </div>
          ) : null}
        </div>
          </>
        )}
      </motion.section>

      {selectedItemsByCategory.length > 0 ? (
        <section className="space-y-6 rounded-3xl border border-primary/10 bg-white p-8 shadow-xl">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-secondary">RESUMEN</p>
            <h2 className="mt-2 text-2xl font-semibold">Selección actual</h2>
            <p className="mt-2 text-sm text-secondary">
              Marca los materiales que quieres destacar explícitamente dentro del PDF formal.
            </p>
          </div>
          <div className="space-y-6">
            {selectedItemsByCategory.map((catGroup) => (
              <div key={catGroup.category}>
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-secondary/80">
                  {catGroup.category}
                </p>
                <div className="mt-3 flex flex-wrap gap-3">
                  {catGroup.items.map((item) => {
                    const isHighlighted = highlightedMaterialIds.includes(item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() =>
                          setHighlightedMaterialIds((prev) =>
                            prev.includes(item.id) ? prev.filter((id) => id !== item.id) : [...prev, item.id],
                          )
                        }
                        className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                          isHighlighted
                            ? "border-accent bg-accent/10 text-accent"
                            : "border-primary/10 bg-primary/5 text-secondary hover:border-primary/30"
                        }`}
                        title={isHighlighted ? "Quitar de destacados PDF" : "Destacar en PDF"}
                      >
                        {isHighlighted ? "Destacado" : "Normal"} - {item.qty} {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-6 rounded-3xl border border-white/70 bg-white/80 p-8 shadow-xl backdrop-blur-md">
        <div>
          <h2 className="text-2xl font-semibold">Sección C · Imágenes de referencia</h2>
          <p className="mt-2 text-sm text-secondary">
            Sube renders o fotos relacionadas al proyecto para incluirlas en la cotización formal.
          </p>
        </div>
        <div className="rounded-3xl border border-dashed border-primary/20 bg-white p-6">
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex cursor-pointer items-center rounded-2xl bg-accent px-4 py-2 text-xs font-semibold text-white">
              Subir imágenes
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleReferenceImagesUpload}
                className="hidden"
              />
            </label>
            <p className="text-xs text-secondary">
              Puedes cargar hasta 6 imágenes. El PDF mostrará las primeras 4.
            </p>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {referenceImages.map((image) => (
              <div
                key={image.id}
                className="overflow-hidden rounded-2xl border border-primary/10 bg-white shadow-sm"
              >
                <img src={image.dataUrl} alt={image.name} className="h-40 w-full object-cover" />
                <div className="flex items-center justify-between gap-2 p-3">
                  <p className="truncate text-xs text-secondary">{image.name}</p>
                  <button
                    type="button"
                    onClick={() => handleRemoveReferenceImage(image.id)}
                    className="rounded-xl border border-rose-200 px-2 py-1 text-[11px] font-semibold text-rose-600"
                  >
                    Quitar
                  </button>
                </div>
              </div>
            ))}
            {!referenceImages.length ? (
              <div className="col-span-full rounded-2xl border border-dashed border-primary/20 bg-primary/5 px-4 py-8 text-center text-xs font-semibold text-secondary">
                Aún no has subido imágenes de referencia.
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {isClientModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <div
            ref={clientModalRef}
            tabIndex={-1}
            className="w-full max-w-md rounded-3xl border border-white/70 bg-white/95 p-6 shadow-2xl backdrop-blur"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Agregar cliente</h3>
              <button
                type="button"
                onClick={() => {
                  setIsClientModalOpen(false);
                  setNewClientName("");
                  setNewClientPhone("");
                  setNewClientEmail("");
                }}
                className="rounded-full border border-primary/10 px-3 py-1 text-xs font-semibold text-secondary"
              >
                Cerrar
              </button>
            </div>
            <div className="mt-4 space-y-4">
              <label className="text-xs font-semibold text-secondary">
                Nombre del cliente
                <input
                  value={newClientName}
                  onChange={(event) => setNewClientName(event.target.value)}
                  placeholder="Ej. Paulina Gómez"
                  className="mt-2 w-full rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm outline-none"
                />
              </label>
              <label className="text-xs font-semibold text-secondary">
                Teléfono
                <input
                  value={newClientPhone}
                  onChange={(event) => setNewClientPhone(event.target.value)}
                  placeholder="Ej. 555 123 4567"
                  className="mt-2 w-full rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm outline-none"
                />
              </label>
              <label className="text-xs font-semibold text-secondary">
                Correo electrónico
                <input
                  value={newClientEmail}
                  onChange={(event) => setNewClientEmail(event.target.value)}
                  type="email"
                  placeholder="Ej. correo@dominio.com"
                  className="mt-2 w-full rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm outline-none"
                />
              </label>
            </div>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsClientModalOpen(false);
                  setNewClientName("");
                  setNewClientPhone("");
                  setNewClientEmail("");
                }}
                className="rounded-2xl border border-primary/10 bg-white px-5 py-2 text-xs font-semibold text-secondary"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleAddClient}
                className="rounded-2xl bg-accent px-5 py-2 text-xs font-semibold text-white"
              >
                Guardar cliente
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isAddModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <div
            ref={addItemModalRef}
            tabIndex={-1}
            className="w-full max-w-md rounded-3xl border border-white/70 bg-white/95 p-6 shadow-2xl backdrop-blur"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {editingItemId ? "Editar material" : "Agregar material"}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingItemId(null);
                  setNewItemUnitType("pieza");
                }}
                className="rounded-full border border-primary/10 px-3 py-1 text-xs font-semibold text-secondary"
              >
                Cerrar
              </button>
            </div>
            <div className="mt-4 space-y-4">
              <label className="text-xs font-semibold text-secondary">
                Categoría
                <select
                  value={newItemCategory}
                  onChange={(event) => setNewItemCategory(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm outline-none"
                >
                  {catalogoKuche.map((category) => (
                    <option key={category.category} value={category.category}>
                      {category.category}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-semibold text-secondary">
                Nombre del material
                <input
                  value={newItemName}
                  onChange={(event) => setNewItemName(event.target.value)}
                  placeholder="Ej. Tablero especial"
                  className="mt-2 w-full rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm outline-none"
                />
              </label>
              <label className="text-xs font-semibold text-secondary">
                Precio unitario
                <input
                  value={newItemPrice}
                  onChange={(event) => setNewItemPrice(event.target.value)}
                  type="number"
                  min="0"
                  placeholder="0"
                  className="mt-2 w-full rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm outline-none"
                />
              </label>
              <label className="text-xs font-semibold text-secondary">
                Tipo de unidad
                <input
                  value={newItemUnitType}
                  onChange={(event) => setNewItemUnitType(event.target.value)}
                  list="catalogo-unit-type-suggestions"
                  placeholder="Ej. pieza, metro lineal, m²"
                  className="mt-2 w-full rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm outline-none"
                />
                <datalist id="catalogo-unit-type-suggestions">
                  {CATALOGO_UNIT_TYPE_SUGGESTIONS.map((opt) => (
                    <option key={opt} value={opt} />
                  ))}
                </datalist>
              </label>
            </div>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingItemId(null);
                  setNewItemUnitType("pieza");
                }}
                className="rounded-2xl border border-primary/10 bg-white px-5 py-2 text-xs font-semibold text-secondary"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveMaterial}
                className="rounded-2xl bg-accent px-5 py-2 text-xs font-semibold text-white"
              >
                {editingItemId ? "Guardar cambios" : "Guardar material"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <section className="space-y-6 rounded-3xl border border-white/70 bg-white/80 p-8 shadow-xl backdrop-blur-md">
        <div>
          <h2 className="text-2xl font-semibold">Sección D · Cierre y documentación</h2>
          <p className="mt-2 text-sm text-secondary">
            Resumen ejecutivo y generación de documentos para cliente y taller.
          </p>
        </div>

        <div className="mx-auto w-full max-w-2xl rounded-3xl bg-white p-8 shadow-lg">
          <div className="flex items-center justify-between text-gray-600">
            <span className="text-sm font-semibold">Total</span>
            <span className="text-sm font-semibold">{formatCurrency(precioTotalSinIva)}</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-gray-500">
            <span className="text-sm font-semibold">IVA (16%)</span>
            <span className="text-sm font-semibold">{formatCurrency(montoIva)}</span>
          </div>
          <hr className="my-4 border-gray-200" />
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-600">Total Neto</span>
            <span className="text-3xl font-bold text-[#8B1C1C]">
              {formatCurrency(totalNeto)}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button className="rounded-2xl border border-primary/10 bg-white px-5 py-3 text-xs font-semibold text-secondary">
            Guardar Borrador
          </button>
          <button
            type="button"
            onClick={() => handleGenerateClientPdf()}
            className="rounded-2xl bg-[#8B1C1C] px-5 py-3 text-xs font-semibold text-white"
          >
            Generar PDF Cliente
          </button>
          <button
            type="button"
            onClick={handleGenerateWorkshopPdf}
            className="rounded-2xl bg-slate-900 px-5 py-3 text-xs font-semibold text-white"
          >
            Generar Hoja de Taller
          </button>
        </div>
      </section>

      {activeCotizacionFormalTaskId ? (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-emerald-200/90 bg-white/95 px-4 py-3 shadow-[0_-6px_24px_rgba(0,0,0,0.07)] backdrop-blur-md">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-xl text-xs text-secondary">
              Guarda la cotización formal en la tarjeta y continúa en el tablero. Al terminar se descargan
              automáticamente la cotización formal y la hoja de taller, y también quedan vinculadas en backend.
              Puedes volver a generarlas con{" "}
              <span className="font-semibold text-gray-700">Generar PDF Cliente</span>.
            </p>
            <div className="flex shrink-0 flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={handleTerminarCotizacion}
                className="rounded-2xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-emerald-700"
              >
                Terminar
              </button>
              <button
                type="button"
                onClick={handleTerminarYContinuar}
                className="rounded-2xl border-2 border-emerald-600 bg-white px-5 py-2.5 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-50"
              >
                Terminar y continuar
              </button>
            </div>
          </div>
          {finishFormalError ? (
            <p className="mx-auto mt-2 max-w-6xl text-sm text-rose-600">{finishFormalError}</p>
          ) : null}
        </div>
      ) : activeCitaTaskId ? (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-primary/15 bg-white/95 px-4 py-3 shadow-[0_-6px_24px_rgba(0,0,0,0.07)] backdrop-blur-md">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={handleFinishCita}
              className="rounded-2xl bg-accent px-6 py-2.5 text-sm font-semibold text-white shadow-md transition hover:opacity-95"
            >
              Terminar cita
            </button>
          </div>
        </div>
      ) : null}

      <div
        className={`fixed right-6 z-40 w-[260px] rounded-3xl border border-white/70 bg-white/90 p-4 shadow-2xl backdrop-blur-md ${
          showCotizadorBottomBar ? "bottom-28" : "bottom-6"
        }`}
      >
        <p className="text-xs uppercase tracking-[0.25em] text-secondary">Total Neto</p>
        <p className="mt-2 text-2xl font-semibold text-accent">{formatCurrency(totalNeto)}</p>
        <p className="mt-2 text-[11px] text-secondary">
          {metrosValue} m lineales · {baseMaterialLabel} · {colorLabel} · {thicknessMm} mm
        </p>
      </div>
    </div>
  );
}
