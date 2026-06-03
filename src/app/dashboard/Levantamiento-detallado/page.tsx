"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FilePenLine,
  Search,
} from "lucide-react";
import { useCatalogEquipamiento } from "@/contexts/CatalogEquipamientoContext";
import {
  activeCitaTaskStorageKey,
  activeCitaTaskSnapshotStorageKey,
  kanbanStorageKey,
  citaReturnUrlStorageKey,
  getPreliminarList,
  seguimientoProjectStoragePrefix,
  type KanbanTask,
  type PreliminarData,
} from "@/lib/kanban";
import { runtimeStore } from "@/lib/runtime-store";
import { CatalogProjectTypeField } from "@/components/CatalogProjectTypeField";
import {
  CATALOG_PROJECT_TYPES,
  isCocinasProjectTypeForConIsla,
} from "@/lib/catalog-project-types";
import Link from "next/link";
import { generatePublicProjectCode } from "@/lib/project-code";
import {
  defaultPagosForInversion,
  formatSeguimientoDateLong,
  normalizeEtapaForStorage,
} from "@/lib/seguimiento-project";
import {
  createDefaultLevantamientoConfig,
  getLevantamientoConfig,
  type LevantamientoConfig,
  type MaterialGama,
} from "@/lib/config-levantamiento";
import { formatDeliveryWeeksLabel } from "@/lib/delivery-weeks";
import { buildPreliminarPdfDataUrl, downloadPreliminarPdf } from "@/lib/pdf-preliminar";
import {
  createPreliminarSeguimientoPdfKey,
  createPreliminarSeguimientoWorkshopPdfKey,
  saveFormalPdf,
} from "@/lib/formal-pdf-storage";
import {
  buildLevantamientoWorkshopPdfDataUrl,
  downloadPdfDataUrl,
} from "@/lib/levantamiento-workshop-pdf";
import {
  actualizarTarjetaTarea,
  moverTarjetaTarea,
  promoverCitaATarea,
} from "@/lib/axios/adminWorkflowApi";
import type { AdminWorkflowTask } from "@/lib/admin-workflow";
import ApplianceTypeImage from "@/components/levantamiento/ApplianceTypeImage";
import LightingTypeImage from "@/components/levantamiento/LightingTypeImage";
import { WallTypeIcon } from "@/components/levantamiento/WallTypeIcons";
import { InteractiveCroquis } from "@/components/levantamiento/InteractiveCroquis";
import {
  APPLIANCE_CATEGORIAS,
  APPLIANCE_ITEMS,
  applianceFirstIndexForCategory,
  APPLIANCE_OTRO_STEP_INDEX,
  defaultLevantamientoDetalle,
  emptyOtro,
  emptyWallMeasuresForId,
  getWallMeasureFieldDefs,
  cotizacionIluminacionTotal,
  isWallSlotKey,
  LIGHTING_ITEMS,
  medidasCamposTieneValor,
  wallMeasuresTieneValor,
  WALL_SLOT_META_TYPE,
  WALL_SLOT_META_ALIAS,
  wallMeasureLetter,
  wallSlotIsComplete,
  wallSlotKey,
  type MedidasCampos,
  WALL_ITEMS,
  type ItemCatalogo,
  type LevantamientoDetalle,
} from "@/lib/levantamiento-catalog";
import { obtenerHerrajes, obtenerMateriales, type Herraje, type Material } from "@/lib/axios/catalogosApi";
import { getSectionAInitialValues } from "./logica_Levantamiento_y_cotizacion/sectionA";
import {
  buildLevantamientoMetrics,
  buildMaterialTierAverages,
  buildScenarioCardRanges,
} from "./logica_Levantamiento_y_cotizacion/calculos";
import {
  LevantamientoResumen,
  type ScenarioOption,
} from "@/components/levantamiento/LevantamientoResumen";
import {
  LevantamientoSectionA,
  LevantamientoSectionB,
  LevantamientoSectionC,
  LevantamientoSectionD,
  LevantamientoSectionE,
} from "@/components/levantamiento/sections/LevantamientoSections";
import {
  buildMaterialCatalogFromBackend,
  emptyMaterialCatalog,
  type MaterialOption,
  type MaterialCategory,
  type MaterialTierFilter,
  type MaterialCatalogState,
  autoScenarioFromShowroom,
  resolveMaterialImage,
  resolveBackendCatalogMatch,
  resolveBackendImage,
  type BackendCatalogRecord,
} from "./logica_Levantamiento_y_cotizacion/showroomCatalog";

const parseMeasure = (raw: string | undefined): number | null => {
  if (!raw) return null;
  const value = Number.parseFloat(raw.replace(",", "."));
  return Number.isFinite(value) ? value : null;
};

const emptyWhenZeroNumericString = (value: string) => {
  if (!value.trim()) return "";
  const n = Number.parseFloat(value);
  return Number.isFinite(n) && n === 0 ? "" : value;
};

const emptyWhenZeroIntString = (value: string) => {
  if (!value.trim()) return "";
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n === 0 ? "" : value;
};

const sectionCommentLabels: Record<"a" | "b" | "c" | "d" | "e", string> = {
  a: "A",
  b: "B",
  c: "C",
  d: "D",
  e: "E",
};

const extractCatalogList = <T,>(input: unknown): T[] => {
  if (Array.isArray(input)) return input as T[];
  if (input && typeof input === "object") {
    const record = input as Record<string, unknown>;
    for (const key of ["materiales", "herrajes", "items", "data", "results"]) {
      const value = record[key];
      if (Array.isArray(value)) return value as T[];
    }
  }
  return [];
};

const MATERIAL_EXAMPLE_IMAGE_BY_CATEGORY: Record<MaterialCategory, string> = {
  cubiertas: "/images/materiales/white_marble_texture.jpg",
  frentes: "/images/materiales/walnut_wood_texture.jpg",
  herrajes: "/images/materiales/stainless_steel_hinge.jpg",
};

const applianceKeywordMap: Record<string, string[]> = {
  "micro-sobremesa": ["sobremesa", "libre instalacion", "libre instalacion", "encimera"],
  "micro-empotrable": ["empotrable", "integracion", "integrado"],
  "micro-campana": ["campana", "extractora"],
  "estufa-gas": ["estufa de gas", "gas", "lp", "natural"],
  "estufa-electrica": ["estufa electrica", "electrica", "vitroceramica", "induccion"],
  "estufa-piso-material": ["piso", "material", "inox", "porcelanizada"],
  "estufa-compacta": ["compacta", "puesto", "pequena"],
  "refri-top-mount": ["top mount", "congelador superior", "superior"],
  "refri-bottom-mount": ["bottom mount", "congelador inferior", "inferior"],
  "refri-side-side": ["side by side", "duplex"],
  "refri-french-door": ["french door", "puerta francesa"],
  "refri-frigobar": ["frigobar", "compacto"],
  "parrilla-gas": ["parrilla de gas", "gas"],
  "parrilla-induccion": ["induccion"],
  "parrilla-electrica-vitro": ["electrica", "vitroceramica"],
  "parrilla-mixta": ["mixta"],
  "parrilla-domino": ["domino"],
  "tarja-simple": ["tarja simple", "seno unico", "cubeta unica"],
  "tarja-doble": ["tarja doble", "doble taza"],
  "tarja-farmhouse": ["farmhouse", "granja", "apron front"],
  "tarja-trabajo": ["estacion de trabajo", "gran formato", "trabajo"],
  "campana-telescopica": ["telescopica", "extraible", "extraible"],
  "campana-decorativa-pared": ["decorativa", "pared"],
  "campana-isla": ["isla", "colgante"],
  "campana-integrada": ["integrada", "empotrable", "mueble"],
  "otro-cafetera": ["cafetera"],
  "otro-lavavajillas": ["lavavajillas"],
  "otro-freidora-aire": ["freidora de aire", "air fryer"],
  "otro-horno-gas": ["horno de gas", "horno"],
  "otro-tostadora": ["tostadora"],
  "otro-dispensador-agua": ["dispensador de agua", "agua"],
  "otro-enfriador-vinos": ["enfriador de vinos", "vino"],
  "otro-tarja-extra": ["tarja extra", "segunda tarja"],
};

const WALL_COUNT_OPTIONS = [1, 2, 3, 4] as const;

const WALL_LIBRE_FIELD_DEFS = getWallMeasureFieldDefs("pared-otro");

const wallCountSvgProps = {
  viewBox: "0 0 24 24",
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 2.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function WallCountIcon({ count, className }: { count: number; className?: string }) {
  const svg = (children: ReactNode) => (
    <svg className={className} aria-hidden {...wallCountSvgProps}>
      {children}
    </svg>
  );
  switch (count) {
    case 1:
      return svg(<line x1="4" y1="12" x2="20" y2="12" />);
    case 2:
      return svg(<path d="M 6 6 L 6 18 L 18 18" />);
    case 3:
      return svg(<path d="M 6 5 L 6 19 L 18 19 L 18 5" />);
    case 4:
      return svg(<path d="M 6 6 L 18 6 L 18 18 L 6 18 Z" />);
    case 5:
      return svg(<path d="M 5 5 L 5 19 L 19 19 L 19 10 L 13 10 L 13 5" />);
    case 6:
      return svg(<path d="M 4 4 L 4 13 L 12 13 L 12 8 L 20 8 L 20 18" />);
    case 7:
      return svg(<path d="M 3 6 L 3 18 L 11 18 L 11 10 L 17 10 L 17 18 L 21 18 L 21 6" />);
    case 8:
      return svg(<path d="M 3 5 L 3 16 L 9 16 L 9 9 L 15 9 L 15 17 L 21 17 L 21 8 L 14 8" />);
    default:
      return svg(<line x1="4" y1="12" x2="20" y2="12" />);
  }
}

/** Carrusel: póster grande 2:3; título en overlay sobre la imagen. Encabezados de fila = estilo Küche (como el resto del formulario). */
const streamRowShell = "rounded-2xl bg-zinc-950 px-2 py-4 shadow-inner ring-1 ring-white/10 sm:px-4 sm:py-5";
const streamRowHeading = "text-xs font-semibold uppercase tracking-[0.28em] text-zinc-100";
const streamRowHint = "mt-1 text-sm font-medium tracking-wide text-zinc-500";
const streamRankClass =
  "w-[0.42em] min-w-[1.25rem] shrink-0 select-none self-end pb-1 text-center text-lg font-semibold tabular-nums leading-none text-zinc-500 sm:min-w-[1.4rem] sm:text-xl";
const streamVerTodosClass =
  "shrink-0 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400 underline-offset-2 transition hover:text-zinc-100 hover:underline";
const streamPosterClass = (selected: boolean, item?: ItemCatalogo) => {
  const ring = selected
    ? "ring-2 ring-white ring-offset-2 ring-offset-zinc-950"
    : "ring-1 ring-white/10 hover:ring-white/55";
  if (item?.id === "otro-tostadora" || item?.id === "otro-tarja-extra") {
    return `relative z-10 aspect-[2/3] w-[min(10.5rem,52vw)] shrink-0 overflow-hidden rounded-lg bg-white shadow-xl transition sm:w-[min(12.5rem,38vw)] lg:w-[min(13.5rem,32vw)] ${ring}`;
  }
  if (item?.id === "estufa-compacta" || item?.id === "parrilla-mixta") {
    return `relative z-10 h-[calc(min(10.5rem,52vw)*3/2)] w-[min(20rem,92vw)] shrink-0 overflow-hidden rounded-lg bg-zinc-900 shadow-xl transition sm:h-[calc(min(12.5rem,38vw)*3/2)] sm:w-[min(21.5rem,80vw)] lg:h-[calc(min(13.5rem,32vw)*3/2)] lg:w-[min(22.5rem,58vw)] ${ring}`;
  }
  if (item?.id === "parrilla-domino") {
    return `relative z-10 h-[calc(min(10.5rem,52vw)*3/2)] w-[min(17.6rem,81vw)] shrink-0 overflow-hidden rounded-lg bg-zinc-900 shadow-xl transition sm:h-[calc(min(12.5rem,38vw)*3/2)] sm:w-[min(18.9rem,70vw)] lg:h-[calc(min(13.5rem,32vw)*3/2)] lg:w-[min(19.8rem,51vw)] ${ring}`;
  }
  if (item?.categoria === "Tarjas") {
    return `relative z-10 aspect-[3/2] w-[min(17.5rem,92vw)] shrink-0 overflow-hidden rounded-lg bg-zinc-900 shadow-xl transition sm:w-[min(19.5rem,68vw)] lg:w-[min(20.5rem,56vw)] ${ring}`;
  }
  if (item?.categoria === "Campanas") {
    return `relative z-10 aspect-[40/39] w-[min(12.5rem,58vw)] shrink-0 overflow-hidden rounded-lg bg-zinc-900 shadow-xl transition sm:w-[min(15rem,42vw)] lg:w-[min(16.25rem,35vw)] ${ring}`;
  }
  return `relative z-10 aspect-[2/3] w-[min(10.5rem,52vw)] shrink-0 overflow-hidden rounded-lg bg-zinc-900 shadow-xl transition sm:w-[min(12.5rem,38vw)] lg:w-[min(13.5rem,32vw)] ${ring}`;
};
const streamPosterTitleOverlay =
  "pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent px-2 pb-2.5 pt-14";
const streamPosterLabelClass =
  "line-clamp-2 text-xs font-medium leading-snug text-white/95 sm:text-sm";
/** Miniaturas de carrusel: `cover` sin `object-center` aquí — el centro choca con `object-[…]` en iluminación. */
const streamCatalogThumbBase = "absolute inset-0 z-0 h-full w-full object-cover";
const streamCatalogThumbImageClass = `${streamCatalogThumbBase} object-center`;
function applianceStreamCatalogThumbClass(item: ItemCatalogo): string {
  if (item.categoria === "Campanas") {
    return `${streamCatalogThumbBase} object-[center_40%]`;
  }
  if (item.id === "estufa-compacta" || item.id === "parrilla-mixta") {
    return "absolute inset-0 z-0 box-border h-full w-full object-contain object-center p-3 sm:p-4";
  }
  if (item.id === "parrilla-domino") {
    return streamCatalogThumbImageClass;
  }
  if (item.id === "otro-tostadora" || item.id === "otro-tarja-extra") {
    return "absolute inset-0 z-0 h-full w-full object-contain object-center";
  }
  return streamCatalogThumbImageClass;
}
/** Encuadre por ítem: `LightingTypeImage` aplica `object-position` inline (catálogo). */
const streamLightingThumbClass = `${streamCatalogThumbBase} object-center`;
const streamScrollClass =
  "flex gap-3 overflow-x-auto pb-2 pt-1 pl-0.5 [-ms-overflow-style:none] [scrollbar-color:rgba(255,255,255,0.2)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/25 sm:gap-4";

type MaterialGridProps = {
  title: string;
  options: MaterialOption[];
  page: number;
  onPageChange: (page: number) => void;
  category: MaterialCategory;
  largoLineal: number;
  materialSearch: string;
  tierFilter: MaterialTierFilter;
  /** Promedios $/m por gama (desde configuración de levantamiento). */
  tierPriceByTier: Record<MaterialOption["tier"], number>;
} & (
  | { multiSelect?: false; selectedId: string; onSelect: (id: string) => void }
  | { multiSelect: true; selectedIds: string[]; onToggle: (id: string) => void }
);

const MaterialGrid = ({
  title,
  options,
  page,
  onPageChange,
  category,
  largoLineal,
  materialSearch,
  tierFilter,
  tierPriceByTier,
  ...rest
}: MaterialGridProps) => {
  const isMulti = rest.multiSelect === true;
  const normalizedSearch = materialSearch.trim().toLowerCase();
  const filtered = options.filter((option) => {
    const matchesSearch = !normalizedSearch || option.name.toLowerCase().includes(normalizedSearch);
    const matchesTier = tierFilter === "Todos" || option.tier === tierFilter;
    return matchesSearch && matchesTier;
  });

  return (
    <div className="space-y-4 rounded-3xl border border-primary/10 bg-white/90 px-4 py-4 shadow-inner sm:px-5 sm:py-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-secondary">{title}</p>
          {isMulti ? <p className="mt-1 text-[11px] font-medium text-secondary/85">Puedes elegir más de uno.</p> : null}
        </div>
        <button
          type="button"
          onClick={() => {
            const row = document.getElementById(`material-row-${category}`);
            if (row) row.scrollTo({ left: row.scrollWidth, behavior: "smooth" });
          }}
          className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.18em] text-secondary underline-offset-2 transition hover:text-primary hover:underline"
        >
          Ver todos
        </button>
      </div>
      <div
        id={`material-row-${category}`}
        className="flex gap-3 overflow-x-auto pb-2 pt-1 pl-0.5 [-ms-overflow-style:none] [scrollbar-color:rgba(139,28,28,0.25)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#8B1C1C]/20 sm:gap-4"
      >
        {filtered.map((option, idx) => {
          const isActive = isMulti ? rest.selectedIds.includes(option.id) : option.id === rest.selectedId;
          const imageSrc = resolveMaterialImage(option.name, category, option.image) || MATERIAL_EXAMPLE_IMAGE_BY_CATEGORY[category];
          const fallbackSrc = MATERIAL_EXAMPLE_IMAGE_BY_CATEGORY[category];
          return (
            <button
              key={`${category}-${option.id ?? option.name}-${idx}`}
              type="button"
              onClick={() => (isMulti ? rest.onToggle(option.id) : rest.onSelect(option.id))}
              className={`group flex shrink-0 w-[min(10.75rem,52vw)] flex-col overflow-hidden rounded-2xl border bg-white text-left shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl sm:w-[min(12.5rem,34vw)] lg:w-[min(13rem,28vw)] ${
                isActive ? "border-[#8B1C1C]/50 ring-2 ring-[#8B1C1C] ring-offset-2 ring-offset-white" : "border-primary/10"
              }`}
            >
              <div className="relative aspect-[4/5] w-full overflow-hidden bg-primary/[0.04]">
                {imageSrc ? (
                  <img
                    src={imageSrc}
                    alt={option.name}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onError={(event) => {
                      if (event.currentTarget.src.endsWith(fallbackSrc)) {
                        return;
                      }
                      event.currentTarget.src = fallbackSrc;
                    }}
                  />
                ) : null}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/88 via-black/30 to-transparent px-2 pb-2.5 pt-14">
                  <p className="line-clamp-2 text-xs font-medium leading-snug text-white/95 sm:text-sm">{option.name}</p>
                </div>
                {isActive ? (
                  <span className="absolute right-2 top-2 z-[1] rounded-full bg-[#8B1C1C] p-1 text-white shadow-md">
                    <Check className="h-3 w-3" />
                  </span>
                ) : null}
              </div>
              <div className="flex flex-1 flex-col gap-2 px-3 py-3">
                <span className="inline-flex w-fit rounded-full bg-primary/5 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-secondary">
                  {option.tier}
                </span>
                <p className="text-xs font-medium text-secondary">Selección para estimación automática</p>
              </div>
            </button>
          );
        })}
      </div>
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-primary/10 bg-white px-4 py-3 text-xs text-secondary">
          No encontramos materiales con ese criterio.
        </div>
      ) : null}
    </div>
  );
};

type AutoScenarioId = "esencial" | "tendencia" | "premium";

/** Material → escenario de inversión ($/m). */
function tierToScenario(tier: MaterialOption["tier"]): AutoScenarioId {
  switch (tier) {
    case "Estandar":
      return "esencial";
    case "Tendencia":
      return "tendencia";
    case "Premium":
      return "premium";
  }
}

/** Moda de gamas; empates o tres distintos → Tendencia (regla de negocio). */
function predominantShowroomTier(votes: MaterialOption["tier"][]): MaterialOption["tier"] {
  if (votes.length === 0) return "Tendencia";
  const c = { Estandar: 0, Tendencia: 0, Premium: 0 };
  for (const v of votes) c[v]++;
  const max = Math.max(c.Estandar, c.Tendencia, c.Premium);
  const winners = (["Estandar", "Tendencia", "Premium"] as const).filter((k) => c[k] === max);
  if (winners.length !== 1) return "Tendencia";
  return winners[0]!;
}

export default function CotizadorPreliminarPage() {
  const router = useRouter();
  const { electrodomesticos, extras } = useCatalogEquipamiento();
  const [activeCitaTaskId, setActiveCitaTaskId] = useState<string | null>(null);
  const [activeCitaTask, setActiveCitaTask] = useState<KanbanTask | null>(null);
  const [clientName, setClientName] = useState("");
  const [projectType, setProjectType] = useState<string>(CATALOG_PROJECT_TYPES[0]);
  const [location, setLocation] = useState("");
  const [deliveryWeeksMin, setDeliveryWeeksMin] = useState("");
  const [deliveryWeeksMax, setDeliveryWeeksMax] = useState("");
  const [largo, setLargo] = useState("");
  const [alto, setAlto] = useState("");
  /** Sección D · showroom: materiales y escenario de inversión (derivado + ajuste manual opcional). */
  const [materialCatalog, setMaterialCatalog] = useState<MaterialCatalogState>(emptyMaterialCatalog);
  const [selectedCubierta, setSelectedCubierta] = useState("");
  const [selectedFrenteIds, setSelectedFrenteIds] = useState<string[]>([]);
  const [selectedHerraje, setSelectedHerraje] = useState("");
  const [levantamientoConfig, setLevantamientoConfig] = useState<LevantamientoConfig>(() =>
    createDefaultLevantamientoConfig(),
  );
  const [selectedScenario, setSelectedScenario] = useState<AutoScenarioId>(() =>
    autoScenarioFromShowroom(
      "",
      [],
      "",
    ),
  );
  const [materialSearch, setMaterialSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<"Todos" | "Estandar" | "Tendencia" | "Premium">(
    "Todos",
  );
  const [pages, setPages] = useState({ cubiertas: 1, frentes: 1, herrajes: 1 });
  const [finishError, setFinishError] = useState<string | null>(null);
  const [levantamiento, setLevantamiento] = useState<LevantamientoDetalle>(() => defaultLevantamientoDetalle());
  /** Índice 0-based de la pared actual en el flujo dinámico (Sección B). */
  const [currentWallIndex, setCurrentWallIndex] = useState(0);
  /** Búsqueda en el catálogo de tipos de muro (Sección B). */
  const [wallSearch, setWallSearch] = useState("");
  /** Diálogo in-app al cambiar cantidad de paredes (sustituye `window.confirm`). */
  const [confirmChangeWallCountOpen, setConfirmChangeWallCountOpen] = useState(false);
  /** Un paso por electrodoméstico (orden por categoría); el último índice es «Otro». */
  const [applianceStep, setApplianceStep] = useState(0);
  const [applianceSearch, setApplianceSearch] = useState("");
  const [applianceCategory, setApplianceCategory] = useState<string>(APPLIANCE_CATEGORIAS[0] ?? "Microondas");
  /** true = carruseles; false = detalle en la misma página (sin modal). */
  const [applianceBrowseMode, setApplianceBrowseMode] = useState(true);
  const [accessorySearch, setAccessorySearch] = useState("");
  const [lightingSearch, setLightingSearch] = useState("");
  const [lightingShowOtro, setLightingShowOtro] = useState(false);
  const [lightingBrowseMode, setLightingBrowseMode] = useState(true);
  /** id del luminario en vista detalle (cuando lightingBrowseMode es false). */
  const [lightingFocusedId, setLightingFocusedId] = useState<string | null>(null);
  /** Al pasar de carrusel → detalle el documento se acorta y el scroll absoluto deja la vista en la sección siguiente; se reencuadra la sección C. */
  const applianceSectionRef = useRef<HTMLDivElement | null>(null);
  const lightingSectionRef = useRef<HTMLDivElement | null>(null);
  const applianceRowRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const accessoryRowRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    let cancelled = false;

    const loadMaterialCatalog = async () => {
      const [materialesResponse, herrajesResponse] = await Promise.all([obtenerMateriales(), obtenerHerrajes()]);
      if (cancelled) return;

      const materiales = materialesResponse.success && materialesResponse.data ? extractCatalogList<Material>(materialesResponse.data) : [];
      const herrajes = herrajesResponse.success && herrajesResponse.data ? extractCatalogList<Herraje>(herrajesResponse.data) : [];
      setMaterialCatalog(buildMaterialCatalogFromBackend(materiales, herrajes));
    };

    void loadMaterialCatalog();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (materialCatalog.cubiertas.length > 0 && !materialCatalog.cubiertas.some((item) => item.id === selectedCubierta)) {
      setSelectedCubierta(materialCatalog.cubiertas[0]?.id ?? "");
    }
    if (materialCatalog.frentes.length > 0) {
      setSelectedFrenteIds((current) => {
        const filtered = current.filter((id) => materialCatalog.frentes.some((item) => item.id === id));
        return filtered.length > 0 ? filtered : [materialCatalog.frentes[0]?.id ?? ""].filter(Boolean);
      });
    }
    if (materialCatalog.herrajes.length > 0 && !materialCatalog.herrajes.some((item) => item.id === selectedHerraje)) {
      setSelectedHerraje(materialCatalog.herrajes[0]?.id ?? "");
    }
  }, [materialCatalog, selectedCubierta, selectedHerraje]);

  const applianceBackendIndex = useMemo(() => {
    const records = [...electrodomesticos, ...extras] as BackendCatalogRecord[];
    const index: Record<string, { image?: string; price?: number; name?: string }> = {};

    for (const item of APPLIANCE_ITEMS) {
      const matched = resolveBackendCatalogMatch(item, records);
      index[item.id] = {
        image: resolveBackendImage(matched),
        price: typeof matched?.precio === "number" ? matched.precio : undefined,
        name: matched?.nombre,
      };
    }

    return index;
  }, [electrodomesticos, extras]);

  const applianceCatalogTotal = useMemo(() => {
    const selectedIds = levantamiento.applianceDocumentIds ?? [];
    const selectedTotal = selectedIds.reduce((acc, id) => acc + (applianceBackendIndex[id]?.price ?? 0), 0);
    const otroPrice = levantamiento.applianceOtroInDocument ? levantamiento.applianceOtro.precioEstimado ?? 0 : 0;
    return selectedTotal + otroPrice;
  }, [applianceBackendIndex, levantamiento.applianceDocumentIds, levantamiento.applianceOtro.precioEstimado, levantamiento.applianceOtroInDocument]);

  const accessoryBackendIndex = useMemo(() => {
    const index: Record<string, { image?: string; price?: number; name?: string; categoria?: string }> = {};
    for (const item of extras) {
      index[item._id] = {
        image: resolveBackendImage(item),
        price: typeof item.precio === "number" ? item.precio : undefined,
        name: item.nombre,
        categoria: item.categoria,
      };
    }
    return index;
  }, [extras]);

  const accessoryCatalogTotal = useMemo(() => {
    const selectedIds = levantamiento.accessoryDocumentIds ?? [];
    const selectedTotal = selectedIds.reduce((acc, id) => acc + (accessoryBackendIndex[id]?.price ?? 0), 0);
    const otroPrice = levantamiento.accessoryOtroInDocument ? levantamiento.accessoryOtro.precioEstimado ?? 0 : 0;
    return selectedTotal + otroPrice;
  }, [accessoryBackendIndex, levantamiento.accessoryDocumentIds, levantamiento.accessoryOtro.precioEstimado, levantamiento.accessoryOtroInDocument]);

  const applianceSearchNorm = applianceSearch.trim().toLowerCase();
  const filteredApplianceMatches = useMemo(() => {
    if (!applianceSearchNorm) return null;
    return APPLIANCE_ITEMS.map((item, idx) => ({ item, idx })).filter(({ item }) => {
      const hay = `${item.label} ${item.hint ?? ""} ${item.categoria ?? ""}`.toLowerCase();
      return hay.includes(applianceSearchNorm);
    });
  }, [applianceSearchNorm]);

  const applianceCarouselRows = useMemo(() => {
    if (applianceSearchNorm) {
      const entries = APPLIANCE_ITEMS.map((item, idx) => ({ item, idx })).filter(({ item }) => {
        const hay = `${item.label} ${item.hint ?? ""} ${item.categoria ?? ""}`.toLowerCase();
        return hay.includes(applianceSearchNorm);
      });
      return entries.length ? [{ key: "busqueda", title: "Resultados de búsqueda", entries }] : [];
    }

    return APPLIANCE_CATEGORIAS.map((cat) => ({
      key: cat,
      title: cat,
      entries: APPLIANCE_ITEMS.map((item, idx) => ({ item, idx })).filter(({ item }) => item.categoria === cat),
    })).filter((row) => row.entries.length > 0);
  }, [applianceSearchNorm]);

  const accessorySearchNorm = accessorySearch.trim().toLowerCase();
  const accessoryCarouselRows = useMemo(() => {
    const entries = extras
      .filter((item) => {
        if (!accessorySearchNorm) return true;
        const hay = `${item.nombre} ${item.categoria ?? ""} ${item.descripcion ?? ""}`.toLowerCase();
        return hay.includes(accessorySearchNorm);
      })
      .map((item) => ({ item, id: item._id }));

    if (accessorySearchNorm) {
      return entries.length
        ? [{ key: "busqueda", title: "Resultados de búsqueda", entries }]
        : [];
    }

    // Mostrar todos los extras en un único slide (sin separación por categoría)
    return entries.length ? [{ key: "extras", title: "Extras", entries }] : [];
  }, [accessorySearchNorm, extras]);

  const setSectionComment = (key: "a" | "b" | "c" | "d" | "e", value: string) => {
    setLevantamiento((prev) => ({
      ...prev,
      sectionComments: { ...prev.sectionComments, [key]: value },
    }));
  };

  const patchMedidasMap = (
    mapKey: "applianceMeasures" | "lightingMeasures",
    id: string,
    field: keyof MedidasCampos,
    value: string,
  ) => {
    setLevantamiento((prev) => {
      const current = prev[mapKey][id] ?? { ancho: "", alto: "", fondo: "" };
      return {
        ...prev,
        [mapKey]: { ...prev[mapKey], [id]: { ...current, [field]: value } },
      };
    });
  };

  const applyWallSlotCount = (n: number) => {
    setWallSearch("");
    setLevantamiento((prev) => {
      const wm = { ...prev.wallMeasures };
      for (let i = 0; i < n; i++) {
        const k = wallSlotKey(i);
        if (!(k in wm)) wm[k] = { [WALL_SLOT_META_TYPE]: "" };
      }
      for (const key of Object.keys(wm)) {
        if (!isWallSlotKey(key)) continue;
        const idx = Number(key.slice(5));
        if (Number.isFinite(idx) && idx >= n) delete wm[key];
      }
      return {
        ...prev,
        wallSlotCount: n,
        wallMeasures: wm,
        wallMedidasModoLibre: false,
        wallOtro: emptyOtro(),
      };
    });
    setCurrentWallIndex(0);
  };

  const clearWallFlowAndSlots = () => {
    setWallSearch("");
    setLevantamiento((prev) => {
      const wm = { ...prev.wallMeasures };
      for (const key of Object.keys(wm)) {
        if (isWallSlotKey(key)) delete wm[key];
      }
      return {
        ...prev,
        wallSlotCount: 0,
        wallMeasures: wm,
        wallMedidasModoLibre: false,
        wallOtro: emptyOtro(),
      };
    });
    setCurrentWallIndex(0);
  };

  const startWallMedidasLibre = () => {
    setWallSearch("");
    setLevantamiento((prev) => {
      const wm = { ...prev.wallMeasures };
      for (const key of Object.keys(wm)) {
        if (isWallSlotKey(key)) delete wm[key];
      }
      return {
        ...prev,
        wallSlotCount: 0,
        wallMeasures: wm,
        wallMedidasModoLibre: true,
        wallOtro: emptyOtro(),
      };
    });
    setCurrentWallIndex(0);
  };

  const volverAElegirCantidadParedes = () => {
    setWallSearch("");
    setLevantamiento((prev) => ({
      ...prev,
      wallMedidasModoLibre: false,
      wallOtro: emptyOtro(),
    }));
  };

  useEffect(() => {
    setLevantamientoConfig(getLevantamientoConfig());
    const onUpdate = () => setLevantamientoConfig(getLevantamientoConfig());
    window.addEventListener("kuche:levantamiento-config-updated", onUpdate);
    return () => window.removeEventListener("kuche:levantamiento-config-updated", onUpdate);
  }, []);

  useEffect(() => {
    if (!confirmChangeWallCountOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setConfirmChangeWallCountOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [confirmChangeWallCountOpen]);

  /** Por pared: `wallMeasures[wall-i]` = tipo en `__typeId` + campos de cota planos (mismo esquema que el PDF). */
  const setWallSlotType = (slotIndex: number, typeId: string) => {
    setLevantamiento((prev) => {
      const k = wallSlotKey(slotIndex);
      const prevSlot = prev.wallMeasures[k] ?? {};
      const alias = (prevSlot[WALL_SLOT_META_ALIAS] ?? "").trim();
      return {
        ...prev,
        wallMeasures: {
          ...prev.wallMeasures,
          [k]: {
            [WALL_SLOT_META_TYPE]: typeId,
            ...emptyWallMeasuresForId(typeId),
            ...(alias ? { [WALL_SLOT_META_ALIAS]: prevSlot[WALL_SLOT_META_ALIAS] ?? "" } : {}),
          },
        },
      };
    });
  };

  const patchWallSlotAlias = (slotIndex: number, value: string) => {
    setLevantamiento((prev) => {
      const k = wallSlotKey(slotIndex);
      const cur = prev.wallMeasures[k] ?? { [WALL_SLOT_META_TYPE]: "" };
      return {
        ...prev,
        wallMeasures: {
          ...prev.wallMeasures,
          [k]: { ...cur, [WALL_SLOT_META_ALIAS]: value },
        },
      };
    });
  };

  const patchWallSlotField = (slotIndex: number, fieldKey: string, value: string) => {
    setLevantamiento((prev) => {
      const k = wallSlotKey(slotIndex);
      const cur = prev.wallMeasures[k] ?? { [WALL_SLOT_META_TYPE]: "" };
      const typeId = (cur[WALL_SLOT_META_TYPE] ?? "").trim();
      if (!typeId) return prev;
      return {
        ...prev,
        wallMeasures: {
          ...prev.wallMeasures,
          [k]: { ...cur, [fieldKey]: value },
        },
      };
    });
  };

  const clearWallSlotType = (slotIndex: number) => {
    setLevantamiento((prev) => {
      const k = wallSlotKey(slotIndex);
      const prevSlot = prev.wallMeasures[k] ?? {};
      const alias = prevSlot[WALL_SLOT_META_ALIAS] ?? "";
      return {
        ...prev,
        wallMeasures: {
          ...prev.wallMeasures,
          [k]: {
            [WALL_SLOT_META_TYPE]: "",
            ...(alias.trim() ? { [WALL_SLOT_META_ALIAS]: alias } : {}),
          },
        },
      };
    });
  };

  const toggleFrente = useCallback((id: string) => {
    setSelectedFrenteIds((prev) => {
      if (prev.includes(id)) {
        if (prev.length <= 1) return prev;
        return prev.filter((x) => x !== id);
      }
      return [...prev, id];
    });
  }, []);

  const patchOtro = (
    otroKey: "wallOtro" | "applianceOtro" | "lightingOtro",
    field: keyof LevantamientoDetalle["wallOtro"],
    value: string,
  ) => {
    setLevantamiento((prev) => ({
      ...prev,
      [otroKey]: { ...prev[otroKey], [field]: value },
    }));
  };

  const setApplianceInDocument = useCallback((id: string, included: boolean) => {
    setLevantamiento((prev) => {
      const next = new Set(prev.applianceDocumentIds);
      if (included) next.add(id);
      else next.delete(id);
      return { ...prev, applianceDocumentIds: [...next] };
    });
  }, []);

  const setAccessoryInDocument = useCallback((id: string, included: boolean) => {
    setLevantamiento((prev) => {
      const next = new Set(prev.accessoryDocumentIds ?? []);
      if (included) next.add(id);
      else next.delete(id);
      return { ...prev, accessoryDocumentIds: [...next] };
    });
  }, []);

  const openApplianceDetailByIndex = useCallback((idx: number) => {
    const item = APPLIANCE_ITEMS[idx];
    if (!item) return;
    setApplianceStep(idx);
    setApplianceBrowseMode(false);
    setLevantamiento((prev) => ({
      ...prev,
      applianceDocumentIds: prev.applianceDocumentIds.includes(item.id)
        ? prev.applianceDocumentIds
        : [...prev.applianceDocumentIds, item.id],
    }));
  }, []);

  const openApplianceOtroDetail = useCallback(() => {
    setApplianceStep(APPLIANCE_OTRO_STEP_INDEX);
    setApplianceBrowseMode(false);
    setLevantamiento((prev) => ({ ...prev, applianceOtroInDocument: true }));
  }, []);

  const setLightingInDocument = useCallback((id: string, included: boolean) => {
    setLevantamiento((prev) => {
      const next = new Set(prev.lightingSelectedIds ?? []);
      if (included) next.add(id);
      else next.delete(id);
      return { ...prev, lightingSelectedIds: [...next] };
    });
  }, []);

  const toggleLightingSelected = useCallback((id: string) => {
    setLevantamiento((prev) => {
      const next = new Set(prev.lightingSelectedIds ?? []);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { ...prev, lightingSelectedIds: [...next] };
    });
  }, []);

  type EditableFieldId =
    | "clientName"
    | "location"
    | "deliveryWeeksMin"
    | "deliveryWeeksMax"
    | "largo"
    | "alto";

  const clientNameInputRef = useRef<HTMLInputElement | null>(null);
  const locationInputRef = useRef<HTMLInputElement | null>(null);
  const deliveryWeeksMinInputRef = useRef<HTMLInputElement | null>(null);
  const deliveryWeeksMaxInputRef = useRef<HTMLInputElement | null>(null);
  const largoInputRef = useRef<HTMLInputElement | null>(null);
  const altoInputRef = useRef<HTMLInputElement | null>(null);

  const lastEditedFieldRef = useRef<EditableFieldId | null>(null);
  const caretPositionsRef = useRef<Record<EditableFieldId, number | null>>({
    clientName: null,
    location: null,
    deliveryWeeksMin: null,
    deliveryWeeksMax: null,
    largo: null,
    alto: null,
  });

  useLayoutEffect(() => {
    const lastEdited = lastEditedFieldRef.current;
    if (!lastEdited) return;

    const caretPos = caretPositionsRef.current[lastEdited];
    let inputEl: HTMLInputElement | null = null;

    if (lastEdited === "clientName") inputEl = clientNameInputRef.current;
    if (lastEdited === "location") inputEl = locationInputRef.current;
    if (lastEdited === "deliveryWeeksMin") inputEl = deliveryWeeksMinInputRef.current;
    if (lastEdited === "deliveryWeeksMax") inputEl = deliveryWeeksMaxInputRef.current;
    if (lastEdited === "largo") inputEl = largoInputRef.current;
    if (lastEdited === "alto") inputEl = altoInputRef.current;

    if (!inputEl) return;

    // Para la mayoría de campos (medidas y datos) reforzamos el foco,
    // restauramos el foco para que la edición sea consistente.
    inputEl.focus();

    if (caretPos !== null) {
      try {
        inputEl.setSelectionRange(caretPos, caretPos);
      } catch {
        // Ignorar navegadores/contextos donde no se pueda ajustar la selección
      }
    }
  }, [clientName, location, deliveryWeeksMin, deliveryWeeksMax, largo, alto]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const taskId = runtimeStore.getItem(activeCitaTaskStorageKey);
    if (taskId) {
      setActiveCitaTaskId(taskId);
      const snapshotRaw = runtimeStore.getItem(activeCitaTaskSnapshotStorageKey);
      if (snapshotRaw) {
        try {
          const snapshotTask = JSON.parse(snapshotRaw) as KanbanTask;
          if (!snapshotTask.id || snapshotTask.id === taskId) {
            setActiveCitaTask(snapshotTask);
            const sectionAValues = getSectionAInitialValues(snapshotTask);
            if (sectionAValues.clientName) setClientName(sectionAValues.clientName);
            if (sectionAValues.projectType) setProjectType(sectionAValues.projectType);
            if (sectionAValues.location) setLocation(sectionAValues.location);
            if (sectionAValues.largo) setLargo(sectionAValues.largo);
            if (sectionAValues.alto) setAlto(sectionAValues.alto);
            if (sectionAValues.deliveryWeeksMin) setDeliveryWeeksMin(sectionAValues.deliveryWeeksMin);
            if (sectionAValues.deliveryWeeksMax) setDeliveryWeeksMax(sectionAValues.deliveryWeeksMax);
          }
        } catch {
          // ignore
        }
      }
      const stored = runtimeStore.getItem(kanbanStorageKey);
      if (stored) {
        try {
          const tasks = JSON.parse(stored) as KanbanTask[];
          const task = tasks.find((t) => t.id === taskId);
          if (task) {
            setActiveCitaTask(task);
            const sectionAValues = getSectionAInitialValues(task);
            console.log("[Levantamiento] Datos cliente (cita activa)", {
              cliente: sectionAValues.clientName ?? "",
              tipoProyecto: sectionAValues.projectType ?? "",
              ubicacion: sectionAValues.location ?? "",
              taskId: task.id,
            });
            if (sectionAValues.clientName) setClientName(sectionAValues.clientName);
            if (sectionAValues.projectType) setProjectType(sectionAValues.projectType);
            if (sectionAValues.location) setLocation(sectionAValues.location);
            if (sectionAValues.largo) setLargo(sectionAValues.largo);
            if (sectionAValues.alto) setAlto(sectionAValues.alto);
            if (sectionAValues.deliveryWeeksMin) setDeliveryWeeksMin(sectionAValues.deliveryWeeksMin);
            if (sectionAValues.deliveryWeeksMax) setDeliveryWeeksMax(sectionAValues.deliveryWeeksMax);
          }
        } catch {
          // ignore
        }
      }

    }
  }, []);

  const validatePreliminarSections = (): string | null => {
    const hasDatos =
      clientName.trim() !== "" ||
      location.trim() !== "" ||
      deliveryWeeksMin.trim() !== "" ||
      deliveryWeeksMax.trim() !== "";
    const hasMedidas =
      (Number.parseFloat(largo) || 0) > 0 || (Number.parseFloat(alto) || 0) > 0;
    if (!hasDatos)
      return "Completa al menos un campo de Datos del proyecto (cliente, ubicación o semanas de entrega).";
    if (!hasMedidas) return "Completa al menos una medida (largo o alto mayor a 0).";
    return null;
  };

  const buildPreliminarDataFromForm = (): PreliminarData => {
    const cubierta = materialCatalog.cubiertas.find((item) => item.id === selectedCubierta);
    const herraje = materialCatalog.herrajes.find((item) => item.id === selectedHerraje);
    const frenteLabel = selectedFrenteIds
      .map((id) => materialCatalog.frentes.find((item) => item.id === id)?.name)
      .filter(Boolean)
      .join(", ");
    return {
      client: clientName || "Sin nombre",
      projectType,
      location: location || "Por definir",
      date: formatDeliveryWeeksLabel(deliveryWeeksMin, deliveryWeeksMax) || "Por definir",
      rangeLabel: scenarioRangeLabel,
      largo: largo.trim() || undefined,
      alto: alto.trim() || undefined,
      cubierta: cubierta?.name ?? "Sin definir",
      frente: frenteLabel || "Sin definir",
      herraje: herraje?.name ?? "Sin definir",
      costoBase: metrics.costoBase,
      costoMateriales: metrics.costoMateriales,
      costoIluminacion: metrics.costoIluminacion,
      subtotal: metrics.subtotal,
      iva: metrics.iva,
      total: metrics.total,
      levantamiento: {
        ...levantamiento,
        largo: largo.trim() || undefined,
        alto: alto.trim() || undefined,
      },
    };
  };

  const savePreliminarAndGetNextTasks = (options?: {
    seguimientoPdfs?: Array<{ key: string; fileLabel: string; fileIdPrefix: string }>;
  }): { codigoProyecto: string | undefined; updatedTasks: KanbanTask[] } | null => {
    if (!activeCitaTaskId || !activeCitaTask) return null;
    const err = validatePreliminarSections();
    if (err) {
      setFinishError(err);
      return null;
    }
    const newPreliminar = buildPreliminarDataFromForm();
    const stored = runtimeStore.getItem(kanbanStorageKey);

    let tasks: KanbanTask[];
    try {
      tasks = stored ? (JSON.parse(stored) as KanbanTask[]) : [];
    } catch {
      // Si el JSON está corrupto, al menos conservamos la tarea activa en un arreglo nuevo.
      tasks = [];
    }

    // Aseguramos que la tarea activa exista en la lista a actualizar.
    const hasActiveTask = tasks.some((t) => t.id === activeCitaTaskId);
    const baseTasks = hasActiveTask ? tasks : [...tasks, activeCitaTask];

    let codigoProyecto: string | undefined;
    const updatedTasks = baseTasks.map((task) => {
      if (task.id !== activeCitaTaskId) return task;
      const existingList = getPreliminarList(task);
      const preliminarCotizaciones = [...existingList, newPreliminar];
      codigoProyecto = task.codigoProyecto ?? generatePublicProjectCode();
      return {
        ...task,
        codigoProyecto,
        preliminarCotizaciones,
        preliminarData: newPreliminar,
        citaFinished: true,
        stage: task.stage,
        status: task.status,
      };
    });

    try {
      const kanbanStr = JSON.stringify(updatedTasks);
      runtimeStore.setItem(kanbanStorageKey, kanbanStr);
    } catch {
      // Si por alguna razón no podemos escribir en runtimeStore (cuota, modo incógnito, etc.),
      // evitamos bloquear el flujo de la cita. Los datos de esta sesión podrían no persistir,
      // pero el usuario puede continuar trabajando.
    }

    if (codigoProyecto) {
      const projectKey = `${seguimientoProjectStoragePrefix}${codigoProyecto}`;
      let existingParsed: Record<string, unknown> = {};
      try {
        const existing = runtimeStore.getItem(projectKey);
        if (existing) existingParsed = JSON.parse(existing) as Record<string, unknown>;
      } catch {
        // ignore
      }
      const preliminarCotizaciones = getPreliminarList(
        updatedTasks.find((t) => t.id === activeCitaTaskId) ?? activeCitaTask,
      );
      const estimatedInversion = Math.round(metrics.total);
      const taskAfter = updatedTasks.find((t) => t.id === activeCitaTaskId);
      const seguimientoProject: Record<string, unknown> = {
        ...existingParsed,
        codigo: codigoProyecto,
        cliente: activeCitaTask.project ?? clientName ?? "Cliente",
        kanbanStage: taskAfter?.stage ?? activeCitaTask.stage,
        kanbanFollowUpStatus: taskAfter?.followUpStatus ?? activeCitaTask.followUpStatus ?? "pendiente",
        preliminarCotizaciones,
        inversion: estimatedInversion,
        fechaInicio: formatSeguimientoDateLong(),
        fechaEntrega: newPreliminar.date || "Por definir",
        etapaActual: normalizeEtapaForStorage(existingParsed.etapaActual),
        estadoProyecto: "Prospecto",
        pagos: defaultPagosForInversion(estimatedInversion),
        garantiaInicio: "",
        cotizacionPreliminarImage: "",
        cotizacionFormalImage: "",
      };
      if (options?.seguimientoPdfs && options.seguimientoPdfs.length > 0) {
        const prevArchivos = Array.isArray(existingParsed.archivos)
          ? [...(existingParsed.archivos as object[])]
          : [];
        seguimientoProject.archivos = [
          ...prevArchivos,
          ...options.seguimientoPdfs.map((pdf) => ({
            id: `${pdf.fileIdPrefix}-${pdf.key}`,
            name: pdf.fileLabel,
            type: "pdf",
            indexedPdfKey: pdf.key,
          })),
        ];
      }
      try {
        runtimeStore.setItem(projectKey, JSON.stringify(seguimientoProject));
      } catch {
        // Mismo criterio: no bloqueamos el flujo si esta escritura falla.
      }
    }

    return { codigoProyecto, updatedTasks };
  };

  const buildWorkshopPdfForCurrentState = async (newPreliminar: PreliminarData): Promise<string> => {
    const wallRows = Array.from({ length: levantamiento.wallSlotCount }, (_, index) => {
      const key = wallSlotKey(index);
      if (!isWallSlotKey(key)) return null;
      const wallData = levantamiento.wallMeasures[key] ?? {};
      const typeId = String(wallData[WALL_SLOT_META_TYPE] ?? "").trim();
      const alias = String(wallData[WALL_SLOT_META_ALIAS] ?? wallMeasureLetter(index)).trim();
      const typeLabel = WALL_ITEMS.find((item) => item.id === typeId)?.label ?? "Sin tipo";
      const measureParts = getWallMeasureFieldDefs(typeId)
        .map((def) => {
          const raw = wallData[def.key];
          if (typeof raw !== "string" || !raw.trim()) return null;
          return `${def.label}: ${raw.trim()}${def.isMetric === false ? "" : " m"}`;
        })
        .filter((value): value is string => Boolean(value));
      if (!typeId && measureParts.length === 0) return null;
      return {
        wall: `Muro ${index + 1}`,
        alias: alias || wallMeasureLetter(index),
        type: typeLabel,
        measures: measureParts.join(" | ") || "Sin medidas capturadas",
      };
    }).filter((row): row is { wall: string; alias: string; type: string; measures: string } => Boolean(row));

    if (levantamiento.wallMedidasModoLibre && medidasCamposTieneValor(levantamiento.wallOtro)) {
      const libre = [
        levantamiento.wallOtro.ancho.trim() ? `Ancho: ${levantamiento.wallOtro.ancho.trim()} m` : "",
        levantamiento.wallOtro.alto.trim() ? `Alto: ${levantamiento.wallOtro.alto.trim()} m` : "",
        levantamiento.wallOtro.fondo.trim() ? `Fondo: ${levantamiento.wallOtro.fondo.trim()} m` : "",
      ]
        .filter(Boolean)
        .join(" | ");
      wallRows.push({
        wall: "Modo libre",
        alias: "N/A",
        type: "Otro tipo de muro",
        measures: libre || "Sin medidas capturadas",
      });
    }

    const selectedItems: Array<{ category: string; item: string; measures: string; notes?: string }> = [];
    const formatMeasureParts = (m?: MedidasCampos) =>
      [
        m?.ancho?.trim() ? `Ancho: ${m.ancho.trim()} m` : "",
        m?.alto?.trim() ? `Alto: ${m.alto.trim()} m` : "",
        m?.fondo?.trim() ? `Fondo: ${m.fondo.trim()} m` : "",
      ]
        .filter(Boolean)
        .join(" | ") || "Sin medidas capturadas";

    for (const id of levantamiento.applianceDocumentIds ?? []) {
      const appliance = APPLIANCE_ITEMS.find((item) => item.id === id);
      selectedItems.push({
        category: "Electrodomesticos",
        item: appliance?.label ?? id,
        measures: formatMeasureParts(levantamiento.applianceMeasures[id]),
        notes: applianceBackendIndex[id]?.name,
      });
    }
    if (levantamiento.applianceOtroInDocument) {
      selectedItems.push({
        category: "Electrodomesticos",
        item: "Otro",
        measures: formatMeasureParts(levantamiento.applianceOtro),
        notes: levantamiento.applianceOtro.descripcion || undefined,
      });
    }

    for (const id of levantamiento.accessoryDocumentIds ?? []) {
      const accessory = extras.find((item) => item._id === id);
      selectedItems.push({
        category: "Accesorios",
        item: accessory?.nombre ?? id,
        measures: formatMeasureParts(levantamiento.accessoryMeasures[id]),
        notes: accessory?.categoria,
      });
    }
    if (levantamiento.accessoryOtroInDocument) {
      selectedItems.push({
        category: "Accesorios",
        item: "Otro",
        measures: formatMeasureParts(levantamiento.accessoryOtro),
        notes: levantamiento.accessoryOtro.descripcion || undefined,
      });
    }

    for (const id of levantamiento.lightingSelectedIds ?? []) {
      const lighting = LIGHTING_ITEMS.find((item) => item.id === id);
      selectedItems.push({
        category: "Iluminacion",
        item: lighting?.label ?? id,
        measures: formatMeasureParts(levantamiento.lightingMeasures[id]),
      });
    }
    if (levantamiento.lightingOtroInDocument) {
      selectedItems.push({
        category: "Iluminacion",
        item: "Otro",
        measures: formatMeasureParts(levantamiento.lightingOtro),
        notes: levantamiento.lightingOtro.descripcion || undefined,
      });
    }

    const notes = (Object.entries(levantamiento.sectionComments) as Array<["a" | "b" | "c" | "d" | "e", string]>)
      .filter(([, note]) => Boolean(note?.trim()))
      .map(([section, note]) => ({
        section: `Seccion ${sectionCommentLabels[section]}`,
        note: note.trim(),
      }));

    return buildLevantamientoWorkshopPdfDataUrl({
      client: newPreliminar.client,
      projectType: newPreliminar.projectType,
      location: newPreliminar.location,
      generatedAtLabel: new Date().toLocaleString("es-MX"),
      deliveryWeeksLabel: newPreliminar.date,
      largo: largo.trim() || undefined,
      alto: alto.trim() || undefined,
      conIsla:
        levantamiento.conIsla === "si" ? "Si" : levantamiento.conIsla === "no" ? "No" : "Sin definir",
      hastaTecho:
        levantamiento.medidasGenerales?.hastaTecho === true
          ? "Si"
          : levantamiento.medidasGenerales?.hastaTecho === false
            ? "No"
            : "Sin definir",
      walls: wallRows,
      items: selectedItems,
      notes,
    });
  };

  const syncBackendTransitionToDisenos = async (task: KanbanTask, newPreliminar: PreliminarData) => {
    const rawTask = task as KanbanTask & {
      sourceId?: string;
      sourceType?: "cita" | "diseno" | null;
      sourceCitaId?: string;
      backendSource?: "tarea" | "cita";
      assignedToIds?: string[];
    };
    const sourceId = rawTask.sourceId?.trim() || task.id;
    const preliminarCotizaciones = [...getPreliminarList(task), newPreliminar];

    if (rawTask.backendSource === "cita" || rawTask.sourceType === "cita") {
      const citaTask: AdminWorkflowTask = {
        ...(task as unknown as AdminWorkflowTask),
        sourceId,
        backendSource: "cita",
        sourceType: "cita",
        sourceCitaId: rawTask.sourceCitaId ?? sourceId,
        assignedToIds: Array.isArray(rawTask.assignedToIds) ? rawTask.assignedToIds : [],
        stage: "citas",
        status: "pendiente",
        preliminarData: newPreliminar,
        preliminarCotizaciones,
        citaStarted: true,
        citaFinished: true,
      };
      const promoted = await promoverCitaATarea(citaTask, "disenos");
      if (!promoted.success) {
        throw new Error(promoted.message || "No se pudo mover la cita a Diseños en backend.");
      }
      return;
    }

    const updateResponse = await actualizarTarjetaTarea(sourceId, {
      etapa: "disenos",
      estado: "pendiente",
      citaFinished: true,
      citaStarted: false,
      preliminarData: newPreliminar,
      preliminarCotizaciones,
    });

    if (updateResponse.success) return;

    const moveResponse = await moverTarjetaTarea(sourceId, "disenos");
    if (!moveResponse.success) {
      throw new Error(
        updateResponse.message || moveResponse.message || "No se pudo mover la tarea a Diseños en backend.",
      );
    }
  };

  const handleFinishCita = async () => {
    setFinishError(null);
    if (!activeCitaTaskId || !activeCitaTask) return;
    const err = validatePreliminarSections();
    if (err) {
      setFinishError(err);
      return;
    }
    const newPreliminar = buildPreliminarDataFromForm();
    const existingCount = getPreliminarList(activeCitaTask).length;
    const preliminarPdfKey = createPreliminarSeguimientoPdfKey(activeCitaTaskId, existingCount);
    const workshopPdfKey = createPreliminarSeguimientoWorkshopPdfKey(activeCitaTaskId, existingCount);
    let dataUrl: string;
    let workshopDataUrl: string;
    try {
      dataUrl = await buildPreliminarPdfDataUrl(newPreliminar);
    } catch {
      setFinishError("No se pudo generar el PDF para seguimiento. Intenta de nuevo.");
      return;
    }
    try {
      workshopDataUrl = await buildWorkshopPdfForCurrentState(newPreliminar);
    } catch {
      setFinishError("No se pudo generar la hoja de taller en PDF. Intenta de nuevo.");
      return;
    }
    try {
      await saveFormalPdf(preliminarPdfKey, dataUrl);
      await saveFormalPdf(workshopPdfKey, workshopDataUrl);
    } catch {
      setFinishError("No se pudo guardar el PDF. Intenta de nuevo.");
      return;
    }
    const fileLabel = `Levantamiento detallado — ${newPreliminar.projectType}.pdf`;
    const workshopFileLabel = `Hoja de taller — ${newPreliminar.projectType}.pdf`;
    downloadPdfDataUrl(
      workshopDataUrl,
      `hoja-taller-${newPreliminar.client.replace(/\s+/g, "-").toLowerCase()}.pdf`,
    );
    const result = savePreliminarAndGetNextTasks({
      seguimientoPdfs: [
        { key: preliminarPdfKey, fileLabel, fileIdPrefix: "seg-preliminar" },
        { key: workshopPdfKey, fileLabel: workshopFileLabel, fileIdPrefix: "seg-workshop" },
      ],
    });
    if (!result) return;
    try {
      await syncBackendTransitionToDisenos(activeCitaTask, newPreliminar);
    } catch (error) {
      setFinishError(
        error instanceof Error
          ? error.message
          : "No se pudo actualizar el estado en backend. Intenta de nuevo.",
      );
      return;
    }
    const updatedTasksWithStage = result.updatedTasks.map((task) =>
      task.id === activeCitaTaskId
        ? { ...task, stage: "disenos" as const, status: "pendiente" as const }
        : task,
    );
    const kanbanStr = JSON.stringify(updatedTasksWithStage);
    runtimeStore.setItem(kanbanStorageKey, kanbanStr);
    runtimeStore.removeItem(activeCitaTaskStorageKey);
    runtimeStore.removeItem(activeCitaTaskSnapshotStorageKey);
    const returnUrl = runtimeStore.getItem(citaReturnUrlStorageKey);
    runtimeStore.removeItem(citaReturnUrlStorageKey);
    router.push(returnUrl || "/dashboard/empleado");
  };

  const handleFinishAndContinue = async () => {
    setFinishError(null);
    if (!activeCitaTaskId || !activeCitaTask) return;
    const err = validatePreliminarSections();
    if (err) {
      setFinishError(err);
      return;
    }
    const newPreliminar = buildPreliminarDataFromForm();
    const existingCount = getPreliminarList(activeCitaTask).length;
    const preliminarPdfKey = createPreliminarSeguimientoPdfKey(activeCitaTaskId, existingCount);
    const workshopPdfKey = createPreliminarSeguimientoWorkshopPdfKey(activeCitaTaskId, existingCount);
    let dataUrl: string;
    let workshopDataUrl: string;
    try {
      dataUrl = await buildPreliminarPdfDataUrl(newPreliminar);
    } catch {
      setFinishError("No se pudo generar el PDF para seguimiento. Intenta de nuevo.");
      return;
    }
    try {
      workshopDataUrl = await buildWorkshopPdfForCurrentState(newPreliminar);
    } catch {
      setFinishError("No se pudo generar la hoja de taller en PDF. Intenta de nuevo.");
      return;
    }
    try {
      await saveFormalPdf(preliminarPdfKey, dataUrl);
      await saveFormalPdf(workshopPdfKey, workshopDataUrl);
    } catch {
      setFinishError("No se pudo guardar el PDF. Intenta de nuevo.");
      return;
    }
    const fileLabel = `Levantamiento detallado — ${newPreliminar.projectType}.pdf`;
    const workshopFileLabel = `Hoja de taller — ${newPreliminar.projectType}.pdf`;
    downloadPdfDataUrl(
      workshopDataUrl,
      `hoja-taller-${newPreliminar.client.replace(/\s+/g, "-").toLowerCase()}.pdf`,
    );
    const result = savePreliminarAndGetNextTasks({
      seguimientoPdfs: [
        { key: preliminarPdfKey, fileLabel, fileIdPrefix: "seg-preliminar" },
        { key: workshopPdfKey, fileLabel: workshopFileLabel, fileIdPrefix: "seg-workshop" },
      ],
    });
    if (!result) return;
    setProjectType(CATALOG_PROJECT_TYPES[0]);
    setLocation("");
    setDeliveryWeeksMin("");
    setDeliveryWeeksMax("");
    setLargo("");
    setAlto("");
    setSelectedCubierta(materialCatalog.cubiertas[0].id);
    setSelectedFrenteIds([materialCatalog.frentes[0].id]);
    setSelectedHerraje(materialCatalog.herrajes[0].id);
    setLevantamiento(defaultLevantamientoDetalle());
    setCurrentWallIndex(0);
    setWallSearch("");
    setApplianceStep(0);
    setApplianceCategory(APPLIANCE_CATEGORIAS[0] ?? "Microondas");
    setApplianceBrowseMode(true);
    setAccessorySearch("");
    setLightingShowOtro(false);
    setLightingBrowseMode(true);
    setLightingFocusedId(null);
    setLightingSearch("");
  };

  const metrics = buildLevantamientoMetrics({
    largo,
    selectedCubierta,
    selectedFrenteIds,
    selectedHerraje,
    materialCatalog,
    levantamiento,
    selectedScenario,
    levantamientoConfig,
    applianceCatalogTotal,
    accessoryCatalogTotal,
  });

  const selectedSummary = useMemo(() => {
    const cubierta = materialCatalog.cubiertas.find((item) => item.id === selectedCubierta);
    const herraje = materialCatalog.herrajes.find((item) => item.id === selectedHerraje);
    const frenteNames = selectedFrenteIds
      .map((id) => materialCatalog.frentes.find((item) => item.id === id)?.name)
      .filter(Boolean);
    const largoValue = Number.parseFloat(largo) || 0;
    return {
      meters: largoValue,
      label: [cubierta?.name, ...frenteNames, herraje?.name].filter(Boolean).join(" / "),
    };
  }, [largo, selectedCubierta, selectedFrenteIds, selectedHerraje]);

  const scenarioOptions = useMemo<ScenarioOption[]>(
    () => [
      {
        id: "esencial",
        title: "Estandar",
        subtitle: "Funcional y accesible",
        image: "/images/cocina1.jpg",
      },
      {
        id: "tendencia",
        title: "Tendencia",
        subtitle: "Balance moderno",
        image: "/images/cocina6.jpg",
      },
      {
        id: "premium",
        title: "Premium",
        subtitle: "Detalles superiores",
        image: "/images/render3.jpg",
      },
    ],
    [],
  );

  const scenarioRangeLabel = metrics.rangeLabel;

  /** Rango por tarjeta de escenario (mismo largo, materiales e iluminación; cambia solo $/m del escenario). */
  const scenarioCardRanges = buildScenarioCardRanges({
    largo,
    selectedCubierta,
    selectedFrenteIds,
    selectedHerraje,
    materialCatalog,
    levantamiento,
    selectedScenario,
    levantamientoConfig,
    applianceCatalogTotal,
    accessoryCatalogTotal,
    scenarioOptions,
  });

  const materialTierAverages = buildMaterialTierAverages(materialCatalog);

  /** Auto-escenario según moda de gamas en showroom; el usuario puede corregir con las tarjetas (se respeta hasta el próximo cambio de material). */
  useEffect(() => {
    setSelectedScenario(
      autoScenarioFromShowroom(selectedCubierta, selectedFrenteIds, selectedHerraje),
    );
  }, [selectedCubierta, selectedFrenteIds, selectedHerraje]);

  useEffect(() => {
    setPages({ cubiertas: 1, frentes: 1, herrajes: 1 });
  }, [materialSearch, tierFilter]);

  const handleGeneratePdf = () => {
    const data = buildPreliminarDataFromForm();
    downloadPreliminarPdf(data, "levantamiento-detallado.pdf");
  };

  const currentApplianceItem =
    applianceStep < APPLIANCE_OTRO_STEP_INDEX ? APPLIANCE_ITEMS[applianceStep] : null;

  const lightingSearchNorm = lightingSearch.trim().toLowerCase();
  const filteredLightingItems = useMemo(() => {
    if (!lightingSearchNorm) return null;
    return LIGHTING_ITEMS.filter((item) => {
      const hay = `${item.label} ${item.id} ${item.hint ?? ""}`.toLowerCase();
      return hay.includes(lightingSearchNorm);
    });
  }, [lightingSearchNorm]);

  const applianceCategoryEntries = useMemo(
    () =>
      APPLIANCE_ITEMS.map((item, idx) => ({ item, idx })).filter(
        ({ item }) => item.categoria === applianceCategory,
      ),
    [applianceCategory],
  );

  const applianceIndicesInCurrentCategory = useMemo(() => {
    if (applianceStep >= APPLIANCE_OTRO_STEP_INDEX) return [] as number[];
    const cat = APPLIANCE_ITEMS[applianceStep]?.categoria;
    if (!cat) return [];
    return APPLIANCE_ITEMS.map((item, i) => (item.categoria === cat ? i : -1)).filter((i) => i >= 0);
  }, [applianceStep]);

  useEffect(() => {
    setLightingFocusedId(null);
    setLightingBrowseMode(true);
  }, [lightingSearch, lightingShowOtro]);

  const lightingDetailItem = useMemo(() => {
    if (!lightingFocusedId) return null;
    return LIGHTING_ITEMS.find((i) => i.id === lightingFocusedId) ?? null;
  }, [lightingFocusedId]);

  const lightingModalNavIds = useMemo(() => {
    if (!lightingFocusedId) return [] as string[];
    if (lightingSearchNorm && filteredLightingItems && filteredLightingItems.length > 0) {
      return filteredLightingItems.map((i) => i.id);
    }
    return LIGHTING_ITEMS.map((i) => i.id);
  }, [lightingFocusedId, lightingSearchNorm, filteredLightingItems]);

  const lightingRowRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (lightingFocusedId && !LIGHTING_ITEMS.some((i) => i.id === lightingFocusedId)) {
      setLightingFocusedId(null);
    }
  }, [lightingFocusedId]);

  useLayoutEffect(() => {
    if (!applianceBrowseMode) {
      applianceSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [applianceBrowseMode]);

  useLayoutEffect(() => {
    if (!lightingBrowseMode && lightingFocusedId) {
      lightingSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [lightingBrowseMode, lightingFocusedId]);

  useEffect(() => {
    const n = levantamiento.wallSlotCount;
    if (n <= 0) return;
    setCurrentWallIndex((i) => (i >= n ? n - 1 : i));
  }, [levantamiento.wallSlotCount]);

  const allProjectWallsComplete = useMemo(() => {
    const n = levantamiento.wallSlotCount;
    if (!n) return false;
    return Array.from({ length: n }, (_, i) => wallSlotIsComplete(levantamiento.wallMeasures[wallSlotKey(i)])).every(
      Boolean,
    );
  }, [levantamiento.wallSlotCount, levantamiento.wallMeasures]);

  const wallCatalogItems = useMemo(() => {
    const norm = wallSearch.trim().toLowerCase();
    if (!norm) return WALL_ITEMS;
    return WALL_ITEMS.filter((item) => {
      const hay = `${item.label} ${item.hint ?? ""}`.toLowerCase();
      return hay.includes(norm);
    });
  }, [wallSearch]);

  const goToNextPendingWallAfterSave = useCallback(() => {
    const n = levantamiento.wallSlotCount;
    const slot = levantamiento.wallMeasures[wallSlotKey(currentWallIndex)] ?? {};
    if (!wallSlotIsComplete(slot)) {
      window.alert(
        "Completa el tipo de pared y las medidas de todas las cotas antes de guardar esta pared.",
      );
      return;
    }
    for (let step = 1; step <= n; step++) {
      const j = (currentWallIndex + step) % n;
      const s = levantamiento.wallMeasures[wallSlotKey(j)] ?? {};
      if (!wallSlotIsComplete(s)) {
        setCurrentWallIndex(j);
        return;
      }
    }
    document.getElementById("seccion-electrodomesticos")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [currentWallIndex, levantamiento.wallMeasures, levantamiento.wallSlotCount]);

  return (
    <main
      className={`min-h-screen bg-background px-4 py-10 text-primary ${activeCitaTask ? "pb-36 sm:pb-32" : "pb-10"}`}
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header>
          <p className="text-xs uppercase tracking-[0.3em] text-secondary">Levantamiento</p>
          <h1 className="mt-2 text-3xl font-semibold">Levantamiento Detallado</h1>
          <p className="mt-3 text-sm text-secondary">
            Estimación rápida para prospectos. No sustituye una cotización formal.
          </p>
        </header>

        {activeCitaTask ? (
          <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-emerald-800">
                  Cita activa: {activeCitaTask.project}
                </p>
                <p className="text-xs text-emerald-600">
                  Completa el formulario; al pie tienes <strong>Terminar</strong> y{" "}
                  <strong>Terminar y continuar</strong>. La estimación se guarda en la tarjeta; descarga el PDF
                  desde Clientes en proceso o las listas del panel admin cuando la necesites (o con{" "}
                  <strong>Generar estimación en PDF</strong> arriba).
                </p>
              </div>
            </div>
          </div>
        ) : null}

        <LevantamientoSectionA>
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
              Sección A · Datos del proyecto
            </p>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-secondary">
                Datos del proyecto
              </p>
              <div className="mt-4 grid grid-cols-1 items-start gap-x-4 gap-y-5 md:grid-cols-12 md:items-center">
                {/* Fila md: Cliente | Tipo | Ubicación (4+4+4) */}
                <div className="col-span-12 md:col-span-4">
                  <label
                    htmlFor="levantamiento-cliente"
                    className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.15em] text-secondary"
                  >
                    Cliente
                  </label>
                  <input
                    id="levantamiento-cliente"
                    ref={clientNameInputRef}
                    value={clientName}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      lastEditedFieldRef.current = "clientName";
                      caretPositionsRef.current.clientName = event.target.selectionStart ?? null;
                      setClientName(nextValue);
                    }}
                    placeholder="Nombre del cliente"
                    className="w-full rounded-xl border border-primary/10 bg-white/90 px-3 py-2 text-sm outline-none"
                  />
                </div>

                <div className="col-span-12 flex flex-col md:col-span-4">
                  <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.15em] text-secondary">
                    Tipo de proyecto
                  </span>
                  <div className="flex w-full gap-2">
                    <div className="min-w-0 flex-1">
                      <CatalogProjectTypeField
                        value={projectType}
                        onChange={(next) => {
                          setProjectType(next);
                          if (!isCocinasProjectTypeForConIsla(next)) {
                            setLevantamiento((prev) => ({
                              ...prev,
                              conIsla: "",
                              medidasGenerales: { ...prev.medidasGenerales, hastaTecho: false },
                            }));
                          }
                        }}
                        placeholder="Categoría…"
                        innerRowClassName="flex w-full gap-2"
                        buttonClassName="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-white text-secondary shadow-sm transition hover:border-primary/30 hover:bg-primary/[0.04]"
                        inputClassName="w-full min-w-0 rounded-xl border border-primary/10 bg-white/90 px-3 py-2 text-sm outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="col-span-12 md:col-span-4">
                  <label
                    htmlFor="levantamiento-ubicacion"
                    className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.15em] text-secondary"
                  >
                    Ubicación
                  </label>
                  <input
                    id="levantamiento-ubicacion"
                    ref={locationInputRef}
                    value={location}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      lastEditedFieldRef.current = "location";
                      caretPositionsRef.current.location = event.target.selectionStart ?? null;
                      setLocation(nextValue);
                    }}
                    placeholder="CDMX, GDL, MTY…"
                    className="w-full rounded-xl border border-primary/10 bg-white/90 px-3 py-2 text-sm outline-none"
                  />
                </div>

                {/* Fila md: Cocina (isla + techo) | Medidas | Tiempo (3+5+4) */}
                {isCocinasProjectTypeForConIsla(projectType) ? (
                  <div className="col-span-12 flex flex-col gap-4 md:col-span-3">
                    <div>
                      <p className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.15em] text-secondary">
                        ¿Con isla?
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setLevantamiento((prev) => ({ ...prev, conIsla: "si" }))}
                          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                            levantamiento.conIsla === "si"
                              ? "bg-[#8B1C1C] text-white shadow-sm"
                              : "border border-primary/15 bg-white text-secondary hover:border-primary/35"
                          }`}
                        >
                          Sí
                        </button>
                        <button
                          type="button"
                          onClick={() => setLevantamiento((prev) => ({ ...prev, conIsla: "no" }))}
                          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                            levantamiento.conIsla === "no"
                              ? "bg-[#8B1C1C] text-white shadow-sm"
                              : "border border-primary/15 bg-white text-secondary hover:border-primary/35"
                          }`}
                        >
                          No
                        </button>
                      </div>
                    </div>
                    <div>
                      <p className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.15em] text-secondary">
                        ¿Hasta el techo?
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setLevantamiento((prev) => ({
                              ...prev,
                              medidasGenerales: { ...prev.medidasGenerales, hastaTecho: true },
                            }))
                          }
                          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                            levantamiento.medidasGenerales?.hastaTecho === true
                              ? "bg-[#8B1C1C] text-white shadow-sm"
                              : "border border-primary/15 bg-white text-secondary hover:border-primary/35"
                          }`}
                        >
                          Sí
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setLevantamiento((prev) => ({
                              ...prev,
                              medidasGenerales: { ...prev.medidasGenerales, hastaTecho: false },
                            }))
                          }
                          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                            levantamiento.medidasGenerales?.hastaTecho === false
                              ? "bg-[#8B1C1C] text-white shadow-sm"
                              : "border border-primary/15 bg-white text-secondary hover:border-primary/35"
                          }`}
                        >
                          No
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div
                  className={`col-span-12 md:col-span-5 ${
                    isCocinasProjectTypeForConIsla(projectType) ? "md:-translate-y-4" : ""
                  }`}
                  role="group"
                  aria-label="Metros lineales totales en metros"
                >
                  <p className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.15em] text-secondary">
                    Metros lineales totales (m)
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="levantamiento-largo"
                        className="mb-1 block text-[10px] font-medium uppercase tracking-[0.12em] text-secondary/70"
                      >
                        Largo
                      </label>
                      <input
                        id="levantamiento-largo"
                        ref={largoInputRef}
                        value={emptyWhenZeroNumericString(largo)}
                        onChange={(event) => {
                          const val = event.target.value;
                          lastEditedFieldRef.current = "largo";
                          caretPositionsRef.current.largo = event.target.selectionStart ?? null;
                          if (val === "") {
                            setLargo("");
                            return;
                          }
                          const parsed = Number.parseFloat(val);
                          if (!Number.isNaN(parsed)) {
                            setLargo(val);
                          }
                        }}
                        inputMode="decimal"
                        type="number"
                        min="0"
                        step="0.1"
                        placeholder="0"
                        className="w-full rounded-xl border border-primary/10 bg-white/90 px-3 py-2 text-sm outline-none"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="levantamiento-alto"
                        className="mb-1 block text-[10px] font-medium uppercase tracking-[0.12em] text-secondary/70"
                      >
                        Alto
                      </label>
                      <input
                        id="levantamiento-alto"
                        ref={altoInputRef}
                        value={emptyWhenZeroNumericString(alto)}
                        onChange={(event) => {
                          const val = event.target.value;
                          lastEditedFieldRef.current = "alto";
                          caretPositionsRef.current.alto = event.target.selectionStart ?? null;
                          if (val === "") {
                            setAlto("");
                            return;
                          }
                          const parsed = Number.parseFloat(val);
                          if (!Number.isNaN(parsed)) {
                            setAlto(val);
                          }
                        }}
                        inputMode="decimal"
                        type="number"
                        min="0"
                        step="0.1"
                        placeholder="0"
                        className="w-full rounded-xl border border-primary/10 bg-white/90 px-3 py-2 text-sm outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div
                  className={`col-span-12 md:col-span-4 ${
                    isCocinasProjectTypeForConIsla(projectType) ? "md:-translate-y-4" : ""
                  }`}
                  role="group"
                  aria-label="Tiempo de entrega en semanas"
                >
                  <p className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.15em] text-secondary">
                    Tiempo de entrega (sem)
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="levantamiento-semanas-min"
                        className="mb-1 block text-[10px] font-medium uppercase tracking-[0.12em] text-secondary/70"
                      >
                        Mín.
                      </label>
                      <input
                        id="levantamiento-semanas-min"
                        ref={deliveryWeeksMinInputRef}
                        value={emptyWhenZeroIntString(deliveryWeeksMin)}
                        onChange={(event) => {
                          const val = event.target.value;
                          lastEditedFieldRef.current = "deliveryWeeksMin";
                          caretPositionsRef.current.deliveryWeeksMin = event.target.selectionStart ?? null;
                          if (val === "") {
                            setDeliveryWeeksMin("");
                            return;
                          }
                          const parsed = Number.parseInt(val, 10);
                          if (!Number.isNaN(parsed)) {
                            setDeliveryWeeksMin(String(parsed));
                          }
                        }}
                        type="number"
                        min={1}
                        step={1}
                        placeholder="0"
                        className="w-full rounded-xl border border-primary/10 bg-white/90 px-3 py-2 text-sm outline-none"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="levantamiento-semanas-max"
                        className="mb-1 block text-[10px] font-medium uppercase tracking-[0.12em] text-secondary/70"
                      >
                        Máx.
                      </label>
                      <input
                        id="levantamiento-semanas-max"
                        ref={deliveryWeeksMaxInputRef}
                        value={emptyWhenZeroIntString(deliveryWeeksMax)}
                        onChange={(event) => {
                          const val = event.target.value;
                          lastEditedFieldRef.current = "deliveryWeeksMax";
                          caretPositionsRef.current.deliveryWeeksMax = event.target.selectionStart ?? null;
                          if (val === "") {
                            setDeliveryWeeksMax("");
                            return;
                          }
                          const parsed = Number.parseInt(val, 10);
                          if (!Number.isNaN(parsed)) {
                            setDeliveryWeeksMax(String(parsed));
                          }
                        }}
                        type="number"
                        min={1}
                        step={1}
                        placeholder="0"
                        className="w-full rounded-xl border border-primary/10 bg-white/90 px-3 py-2 text-sm outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="col-span-12">
                  <label
                    htmlFor="levantamiento-comentarios-a"
                    className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.15em] text-secondary"
                  >
                    Comentarios de esta sección
                  </label>
                  <textarea
                    id="levantamiento-comentarios-a"
                    value={levantamiento.sectionComments.a ?? ""}
                    onChange={(e) => setSectionComment("a", e.target.value)}
                    rows={3}
                    placeholder="Notas del levantamiento (accesos, muros load-bearing, etc.)"
                    className="w-full resize-y rounded-xl border border-primary/10 bg-white/90 px-3 py-2 text-sm outline-none placeholder:text-secondary/50"
                  />
                </div>
              </div>
            </div>
          </div>
        </LevantamientoSectionA>

        <LevantamientoSectionB>
          <div className="space-y-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
                Sección B · Medidas de paredes
              </p>
              <p className="mt-2 text-sm text-secondary">
                Indica <strong className="font-semibold text-primary">cuántas paredes</strong> tiene el espacio y usa el{" "}
                <strong className="font-semibold text-primary">croquis</strong> para elegir en cuál trabajas. Luego define
                el tipo (recta, L, ventana, etc.) y las medidas; las{" "}
                <strong className="font-semibold text-primary">cotas</strong> del tipo elegido coinciden con las letras del
                formulario. En obras, «
                <strong className="font-semibold text-primary">vano</strong>» es el{" "}
                <strong className="font-semibold text-primary">hueco</strong> de puerta o ventana. Unidades en metros. Si
                nada encaja en el catálogo, elige el tipo{" "}
                <strong className="font-semibold text-primary">«Otro tipo de muro o situación especial»</strong> en esa
                pared.
              </p>
              <Link
                href="/dashboard/referencia-tipos-pared"
                className="mt-2 inline-block text-sm font-semibold text-[#8B1C1C] underline-offset-2 hover:underline"
              >
                Ver catálogo de referencia (imágenes por tipo de muro)
              </Link>
            </div>

            {!levantamiento.wallSlotCount && !levantamiento.wallMedidasModoLibre ? (
              <div className="space-y-5">
                <p className="text-lg font-semibold text-primary">¿Cuántas paredes tiene el proyecto?</p>
                <p className="text-sm text-secondary">
                  Elige un número para comenzar. Podrás cambiarlo después (se pedirá confirmación si ya había datos).
                </p>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                  {WALL_COUNT_OPTIONS.map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => applyWallSlotCount(count)}
                      className="group flex min-h-[140px] flex-col items-center justify-center gap-3 rounded-3xl border border-primary/10 bg-white p-6 text-center shadow-md transition duration-300 ease-out hover:-translate-y-0.5 hover:border-[#8B1C1C]/30 hover:shadow-lg"
                    >
                      <div className="flex h-24 w-full max-w-[8.5rem] items-center justify-center rounded-2xl bg-primary/[0.06] text-primary transition duration-300 group-hover:bg-primary/10">
                        <WallCountIcon count={count} className="h-11 w-11 shrink-0" />
                      </div>
                      <div>
                        <span className="text-3xl font-bold tabular-nums text-[#8B1C1C]">{count}</span>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-secondary">
                          {count === 1 ? "pared" : "paredes"}
                        </p>
                      </div>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={startWallMedidasLibre}
                    className="flex min-h-[140px] flex-col items-center justify-center gap-1.5 rounded-3xl border border-dashed border-primary/25 bg-stone-50 p-5 text-center transition-colors hover:border-[#8B1C1C]/40 hover:bg-[#8B1C1C]/[0.04]"
                  >
                    <FilePenLine className="h-8 w-8 shrink-0 text-[#8B1C1C]" aria-hidden />
                    <span className="text-sm font-bold text-primary">Otra situación de muros</span>
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-secondary">
                      Texto + medidas
                    </span>
                    <span className="mt-1 max-w-[12rem] text-[11px] leading-snug text-secondary">
                      Más de cuatro muros, planta irregular o caso que no encaja en el flujo por pared.
                    </span>
                  </button>
                </div>
              </div>
            ) : levantamiento.wallMedidasModoLibre ? (
              <div className="space-y-6 rounded-3xl border border-primary/15 bg-white/90 p-6 shadow-md">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-lg font-semibold text-primary">Otra situación de muros</p>
                    <p className="mt-2 text-sm text-secondary">
                      Describe con claridad la configuración real (cantidad de tramos, vanos, ángulos, etc.) y registra
                      medidas de referencia en metros. Esto sustituye el flujo por pared 1–4 para este proyecto.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={volverAElegirCantidadParedes}
                    className="shrink-0 rounded-2xl border border-primary/15 bg-white px-4 py-2 text-xs font-semibold text-[#8B1C1C] transition hover:border-primary/30"
                  >
                    Volver a 1–4 paredes
                  </button>
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  {WALL_LIBRE_FIELD_DEFS.map((field) => {
                    const fk = field.key as keyof LevantamientoDetalle["wallOtro"];
                    const rawVal = levantamiento.wallOtro[fk];
                    const value = typeof rawVal === "string" ? rawVal : "";
                    return (
                      <label
                        key={field.key}
                        className={`text-xs font-semibold uppercase tracking-[0.2em] text-secondary ${field.key === "descripcion" ? "sm:col-span-2" : ""}`}
                      >
                        {field.label}
                        {field.verifyHint ? (
                          <span className="mt-1 block text-[10px] font-normal normal-case tracking-normal text-secondary/80">
                            {field.verifyHint}
                          </span>
                        ) : null}
                        {field.key === "descripcion" ? (
                          <textarea
                            value={value}
                            onChange={(e) => patchOtro("wallOtro", fk, e.target.value)}
                            rows={4}
                            className="mt-2 w-full resize-y rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm font-normal normal-case tracking-normal outline-none placeholder:text-secondary/45"
                            placeholder="Ej. Seis tramos en L con muro cortina, dos tabiques nuevos…"
                          />
                        ) : (
                          <input
                            value={value}
                            onChange={(e) => patchOtro("wallOtro", fk, e.target.value)}
                            inputMode="decimal"
                            placeholder="Metros"
                            className="mt-2 w-full rounded-2xl border border-primary/10 bg-white px-4 py-2.5 text-sm font-normal normal-case tracking-normal outline-none"
                          />
                        )}
                      </label>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!medidasCamposTieneValor(levantamiento.wallOtro) || levantamiento.wallOtro.descripcion.trim() === "") {
                      window.alert("Escribe una descripción de la situación y al menos una medida de referencia en metros.");
                      return;
                    }
                    document.getElementById("seccion-electrodomesticos")?.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    });
                  }}
                  className="w-full rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-emerald-700"
                >
                  {medidasCamposTieneValor(levantamiento.wallOtro) && levantamiento.wallOtro.descripcion.trim() !== ""
                    ? "Listo — ir a la siguiente sección"
                    : "Completa descripción y medidas para continuar"}
                </button>
              </div>
            ) : (
              (() => {
                const slotKeyCur = wallSlotKey(currentWallIndex);
                const slotData = levantamiento.wallMeasures[slotKeyCur] ?? { [WALL_SLOT_META_TYPE]: "" };
                const selectedTypeId = (slotData[WALL_SLOT_META_TYPE] ?? "").trim();
                const item = selectedTypeId ? (WALL_ITEMS.find((w) => w.id === selectedTypeId) ?? null) : null;
                const m = item
                  ? { ...emptyWallMeasuresForId(item.id), ...slotData }
                  : slotData;
                const wallFields = item ? getWallMeasureFieldDefs(item.id) : [];
                const canGoNext = currentWallIndex < levantamiento.wallSlotCount - 1;
                return (
                  <div className="space-y-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="rounded-full border border-primary/15 bg-primary/[0.05] px-4 py-2 text-sm font-semibold tabular-nums text-primary">
                        Pared {currentWallIndex + 1} de {levantamiento.wallSlotCount}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          const hasSlotData = Object.keys(levantamiento.wallMeasures).some(
                            (k) => isWallSlotKey(k) && wallMeasuresTieneValor(levantamiento.wallMeasures[k]!),
                          );
                          if (!hasSlotData) {
                            clearWallFlowAndSlots();
                            return;
                          }
                          setConfirmChangeWallCountOpen(true);
                        }}
                        className="text-xs font-semibold text-secondary underline-offset-2 transition hover:text-[#8B1C1C] hover:underline"
                      >
                        Cambiar cantidad de paredes
                      </button>
                    </div>

                    <InteractiveCroquis
                      wallCount={levantamiento.wallSlotCount}
                      activeWallIndex={currentWallIndex}
                      onSelectWall={setCurrentWallIndex}
                      isWallComplete={(i) =>
                        wallSlotIsComplete(levantamiento.wallMeasures[wallSlotKey(i)] ?? {})
                      }
                    />

                    <div
                      key={`${currentWallIndex}-${selectedTypeId || "pick"}`}
                      className="space-y-5 rounded-3xl border border-white/60 bg-white/80 p-5 shadow-lg backdrop-blur-md transition-opacity duration-300 ease-out"
                    >
                      <div>
                        <p className="text-base font-semibold text-primary">
                          Ingresando medidas para: Pared {currentWallIndex + 1}
                        </p>
                        <p className="mt-1 text-xs text-secondary">
                          Usa el croquis para cambiar de pared. Aquí eliges el tipo (recta, ventana, etc.) y las cotas A,
                          B, C… Unidades en metros.
                        </p>
                      </div>

                      <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
                        Referencia / Alias de esta pared (Opcional)
                        <input
                          type="text"
                          value={slotData[WALL_SLOT_META_ALIAS] ?? ""}
                          onChange={(e) => patchWallSlotAlias(currentWallIndex, e.target.value)}
                          placeholder="Ej. Pared de la ventana, Pared del fondo, Muro del refri…"
                          className="mt-2 w-full rounded-2xl border border-primary/10 bg-white px-4 py-2.5 text-sm font-normal normal-case tracking-normal outline-none placeholder:text-secondary/45"
                        />
                      </label>

                      {!selectedTypeId || !item ? (
                        <div className="space-y-4">
                          <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
                            Buscar tipo de muro
                            <span className="relative mt-2 block">
                              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary/70" />
                              <input
                                value={wallSearch}
                                onChange={(e) => setWallSearch(e.target.value)}
                                placeholder="Ej. ventana, puerta, dos ventanas…"
                                className="w-full rounded-2xl border border-primary/10 bg-white py-2.5 pl-10 pr-4 text-sm outline-none placeholder:text-secondary/45"
                              />
                            </span>
                          </label>
                          {wallCatalogItems.length === 0 ? (
                            <div className="rounded-2xl border border-primary/10 bg-primary/5 px-4 py-3 text-sm text-secondary">
                              No hay tipos que coincidan. Prueba otra palabra o borra la búsqueda.
                            </div>
                          ) : (
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                              {wallCatalogItems.map((wItem) => (
                                <button
                                  key={wItem.id}
                                  type="button"
                                  onClick={() => setWallSlotType(currentWallIndex, wItem.id)}
                                  className="overflow-hidden rounded-2xl border border-primary/10 bg-white text-left shadow-md transition hover:-translate-y-0.5 hover:border-[#8B1C1C]/35 hover:shadow-lg"
                                >
                                  <div className="relative aspect-[4/3] w-full bg-primary/[0.05]">
                                    <WallTypeIcon wallId={wItem.id} className="h-full w-full" />
                                    <span className="absolute bottom-2 left-2 z-[4] rounded-lg bg-black/55 px-2 py-1 text-[10px] font-semibold text-white">
                                      {wItem.label}
                                    </span>
                                  </div>
                                  <div className="p-3">
                                    <p className="text-sm font-semibold text-primary">{wItem.label}</p>
                                    {wItem.hint ? (
                                      <p className="mt-1 line-clamp-2 text-xs text-secondary">{wItem.hint}</p>
                                    ) : null}
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                          {wallSearch.trim() ? (
                            <button
                              type="button"
                              onClick={() => setWallSearch("")}
                              className="text-xs font-semibold text-[#8B1C1C] underline-offset-2 hover:underline"
                            >
                              Limpiar búsqueda
                            </button>
                          ) : null}
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-primary">{item.label}</p>
                            <button
                              type="button"
                              onClick={() => clearWallSlotType(currentWallIndex)}
                              className="text-xs font-semibold text-[#8B1C1C] underline-offset-2 hover:underline"
                            >
                              Cambiar tipo de pared
                            </button>
                          </div>
                          {item.hint ? <p className="text-xs text-secondary">{item.hint}</p> : null}
                          <div className="grid gap-4 lg:grid-cols-[60%_40%] lg:items-start lg:gap-6">
                            <div className="relative aspect-[4/3] w-full min-w-0 lg:max-w-none lg:aspect-auto lg:h-[360px]">
                              <div className="absolute inset-0 overflow-hidden rounded-2xl border border-primary/10 bg-primary/5">
                                <WallTypeIcon wallId={item.id} className="h-full w-full" />
                                <span className="absolute bottom-2 left-2 z-[4] rounded-lg bg-black/55 px-2 py-1 text-[10px] font-semibold text-white">
                                  {item.label}
                                </span>
                              </div>
                            </div>
                            <div className="min-w-0 space-y-2">
                              <div className="grid gap-2 sm:grid-cols-2">
                                {wallFields.map((field, fi) => (
                                  <label
                                    key={field.key}
                                    className={`block text-[9px] font-semibold uppercase tracking-[0.1em] text-secondary ${
                                      item.id === "pared-otro" && field.key === "descripcion" ? "sm:col-span-2" : ""
                                    }`}
                                  >
                                    <span className="mb-0.5 block normal-case tracking-normal">
                                      <span className="font-bold text-primary">{wallMeasureLetter(fi)}</span>
                                      <span> · {field.label}</span>
                                      {item.id === "pared-otro" && field.key === "descripcion" ? null : (
                                        <span className="font-normal text-secondary/80"> (m)</span>
                                      )}
                                    </span>
                                    {item.id === "pared-puerta" && field.key === "altura-techo" ? (
                                      (() => {
                                        const alt = parseMeasure(m["altura-techo"]);
                                        const vano = parseMeasure(m["alto-vano"]);
                                        if (alt === null || vano === null) return null;
                                        const sobreVano = Math.max(0, alt - vano);
                                        return (
                                          <span className="mb-0.5 block text-[9px] font-semibold normal-case leading-snug text-secondary/90">
                                            Sobre el vano (techo − alto vano):{" "}
                                            <span className="font-bold text-primary">{sobreVano.toFixed(2)} m</span>
                                          </span>
                                        );
                                      })()
                                    ) : null}
                                    {item.id === "pared-ventana" && field.key === "altura-techo" ? (
                                      (() => {
                                        const alt = parseMeasure(m["altura-techo"]);
                                        const vano = parseMeasure(m["alto-vano"]);
                                        const antepecho = parseMeasure(m["antepecho"]);
                                        if (alt === null || vano === null || antepecho === null) return null;
                                        const sobreVano = Math.max(0, alt - (antepecho + vano));
                                        return (
                                          <span className="mb-0.5 block text-[9px] font-semibold normal-case leading-snug text-secondary/90">
                                            Sobre el vano (techo − (antepecho + alto vano)):{" "}
                                            <span className="font-bold text-primary">{sobreVano.toFixed(2)} m</span>
                                          </span>
                                        );
                                      })()
                                    ) : null}
                                    {item.id === "pared-otro" && field.key === "descripcion" ? (
                                      <textarea
                                        value={m[field.key] ?? ""}
                                        onChange={(e) => patchWallSlotField(currentWallIndex, field.key, e.target.value)}
                                        rows={3}
                                        className="mt-1 w-full resize-y rounded-xl border border-primary/10 bg-white px-2.5 py-1.5 text-sm font-normal outline-none placeholder:text-secondary/45"
                                      />
                                    ) : (
                                      <input
                                        value={m[field.key] ?? ""}
                                        onChange={(e) => patchWallSlotField(currentWallIndex, field.key, e.target.value)}
                                        inputMode="decimal"
                                        className="mt-1 w-full rounded-xl border border-primary/10 bg-white px-2.5 py-1.5 text-sm outline-none"
                                      />
                                    )}
                                  </label>
                                ))}
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={goToNextPendingWallAfterSave}
                            className="w-full rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-emerald-700"
                          >
                            {allProjectWallsComplete
                              ? "Listo: todas las paredes completas — ir a la siguiente sección"
                              : "Guardar pared y pasar a la siguiente pendiente"}
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 border-t border-primary/10 pt-4">
                      <button
                        type="button"
                        disabled={currentWallIndex <= 0}
                        onClick={() => setCurrentWallIndex((i) => Math.max(0, i - 1))}
                        className="inline-flex items-center gap-1 rounded-full border border-primary/15 bg-white px-4 py-2 text-xs font-semibold text-primary transition hover:border-primary/30 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <ChevronLeft className="h-4 w-4 shrink-0" />
                        Pared anterior
                      </button>
                      <button
                        type="button"
                        disabled={!canGoNext}
                        onClick={() => setCurrentWallIndex((i) => i + 1)}
                        className="inline-flex items-center gap-1 rounded-full border border-primary/15 bg-white px-4 py-2 text-xs font-semibold text-primary transition hover:border-primary/30 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Siguiente pared
                        <ChevronRight className="h-4 w-4 shrink-0" />
                      </button>
                    </div>
                  </div>
                );
              })()
            )}

            <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
              Comentarios de esta sección
              <textarea
                value={levantamiento.sectionComments.b ?? ""}
                onChange={(e) => setSectionComment("b", e.target.value)}
                rows={3}
                placeholder="Detalles adicionales sobre muros…"
                className="mt-2 w-full resize-y rounded-2xl border border-primary/10 bg-white/90 px-4 py-3 text-sm outline-none placeholder:text-secondary/50"
              />
            </label>
          </div>
        </LevantamientoSectionB>

        <LevantamientoSectionC>
          <div
            id="seccion-electrodomesticos"
            ref={applianceSectionRef}
            className="scroll-mt-6 space-y-6"
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
                Sección C · Electrodomésticos
              </p>
              <p className="mt-2 text-sm text-secondary">
                Pósters grandes (2:3); el nombre va en la parte baja de la foto. Clic abre el detalle en la página.
                Indica si el ítem entra al PDF; las medidas en metros son útiles pero opcionales. Incluye filas por
                microondas, estufa, refrigeración, parrilla,{" "}
                <span className="font-medium text-primary/90">tarjas</span>,{" "}
                <span className="font-medium text-primary/90">campanas</span> y una fila{" "}
                <span className="font-medium text-primary/90">Otros</span> (cafetera, lavavajillas, freidora de aire,
                horno de gas, tostadora, dispensador de agua, enfriador de vinos).
              </p>
            </div>
            {!applianceBrowseMode ? (
              <div className="space-y-5">
                <button
                  type="button"
                  onClick={() => setApplianceBrowseMode(true)}
                  className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-white px-4 py-2 text-sm font-semibold text-[#8B1C1C] transition hover:border-primary/30"
                >
                  <ChevronLeft className="h-4 w-4 shrink-0" />
                  Volver al catálogo
                </button>
                {currentApplianceItem ? (
                  <div className="grid gap-6 lg:grid-cols-[minmax(0,280px)_1fr]">
                    <div className="relative mx-auto aspect-[2/3] w-full max-w-[min(20rem,92vw)] overflow-hidden rounded-2xl border border-primary/10 bg-white lg:mx-0">
                      {(() => {
                        const pricing = applianceBackendIndex[currentApplianceItem.id];
                        return (
                          <ApplianceTypeImage
                            item={currentApplianceItem}
                            alt=""
                            preferredSrcs={[pricing?.image]}
                            className="absolute inset-0 z-0 box-border h-full w-full object-contain object-center p-2"
                          />
                        );
                      })()}
                      <span className="pointer-events-none absolute left-2 top-2 z-10 rounded-lg bg-black/55 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                        {currentApplianceItem.categoria ?? "Electrodoméstico"}
                      </span>
                      <span className="pointer-events-none absolute bottom-2 left-2 right-2 z-10 rounded-lg bg-black/55 px-2 py-1 text-[10px] font-semibold leading-snug text-white">
                        {currentApplianceItem.label}
                      </span>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8B1C1C]">
                          {currentApplianceItem.categoria}
                        </p>
                        <p className="text-base font-semibold text-primary">{currentApplianceItem.label}</p>
                        {currentApplianceItem.hint ? (
                          <p className="mt-2 text-sm text-secondary">{currentApplianceItem.hint}</p>
                        ) : null}
                      </div>
                      <label className="flex cursor-pointer items-center gap-2.5 rounded-2xl border border-primary/10 bg-primary/[0.04] px-3 py-2.5 text-sm text-primary">
                        <input
                          type="checkbox"
                          className="h-4 w-4 shrink-0 rounded border-primary/30 accent-[#8B1C1C]"
                          checked={levantamiento.applianceDocumentIds.includes(currentApplianceItem.id)}
                          onChange={(e) => setApplianceInDocument(currentApplianceItem.id, e.target.checked)}
                        />
                        <span>Seleccionar (medidas opcionales)</span>
                      </label>
                      <div className="grid gap-3 sm:grid-cols-3">
                        {(["ancho", "alto", "fondo"] as const).map((field) => {
                          const m =
                            levantamiento.applianceMeasures[currentApplianceItem.id] ?? {
                              ancho: "",
                              alto: "",
                              fondo: "",
                            };
                          return (
                            <label
                              key={field}
                              className="text-[10px] font-semibold uppercase tracking-[0.15em] text-secondary"
                            >
                              {field} (m)
                              <input
                                value={m[field]}
                                onChange={(e) =>
                                  patchMedidasMap("applianceMeasures", currentApplianceItem.id, field, e.target.value)
                                }
                                inputMode="decimal"
                                className="mt-1.5 w-full rounded-2xl border border-primary/10 bg-white px-3 py-2.5 text-sm outline-none"
                              />
                            </label>
                          );
                        })}
                      </div>
                      {applianceIndicesInCurrentCategory.length > 1 ? (
                        <div className="flex flex-wrap gap-2 border-t border-primary/10 pt-4">
                          <button
                            type="button"
                            onClick={() => {
                              const pos = applianceIndicesInCurrentCategory.indexOf(applianceStep);
                              if (pos > 0)
                                openApplianceDetailByIndex(applianceIndicesInCurrentCategory[pos - 1]!);
                            }}
                            disabled={applianceIndicesInCurrentCategory.indexOf(applianceStep) <= 0}
                            className="inline-flex items-center gap-1 rounded-full border border-primary/15 px-3 py-2 text-xs font-semibold text-primary disabled:opacity-40"
                          >
                            <ChevronLeft className="h-4 w-4" />
                            Anterior en categoría
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const pos = applianceIndicesInCurrentCategory.indexOf(applianceStep);
                              const list = applianceIndicesInCurrentCategory;
                              if (pos < list.length - 1) openApplianceDetailByIndex(list[pos + 1]!);
                            }}
                            disabled={
                              applianceIndicesInCurrentCategory.indexOf(applianceStep) >=
                              applianceIndicesInCurrentCategory.length - 1
                            }
                            className="inline-flex items-center gap-1 rounded-full border border-primary/15 px-3 py-2 text-xs font-semibold text-primary disabled:opacity-40"
                          >
                            Siguiente en categoría
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 rounded-2xl border border-dashed border-primary/20 bg-primary/[0.03] p-5">
                    <p className="text-sm font-semibold text-primary">Otro electrodoméstico</p>
                    <label className="flex cursor-pointer items-center gap-2.5 rounded-2xl border border-primary/10 bg-white px-3 py-2.5 text-sm text-primary">
                      <input
                        type="checkbox"
                        className="h-4 w-4 shrink-0 rounded border-primary/30 accent-[#8B1C1C]"
                        checked={levantamiento.applianceOtroInDocument}
                        onChange={(e) =>
                          setLevantamiento((prev) => ({ ...prev, applianceOtroInDocument: e.target.checked }))
                        }
                      />
                      <span>Seleccionar (medidas opcionales)</span>
                    </label>
                    <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
                      Descripción
                      <textarea
                        value={levantamiento.applianceOtro.descripcion}
                        onChange={(e) => patchOtro("applianceOtro", "descripcion", e.target.value)}
                        rows={3}
                        className="mt-2 w-full resize-y rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm outline-none"
                      />
                    </label>
                    <div className="grid gap-3 sm:grid-cols-3">
                      {(["ancho", "alto", "fondo"] as const).map((field) => (
                        <label
                          key={field}
                          className="text-[10px] font-semibold uppercase tracking-[0.15em] text-secondary"
                        >
                          {field} (m)
                          <input
                            value={levantamiento.applianceOtro[field]}
                            onChange={(e) => patchOtro("applianceOtro", field, e.target.value)}
                            inputMode="decimal"
                            className="mt-1.5 w-full rounded-2xl border border-primary/10 bg-white px-3 py-2.5 text-sm outline-none"
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
                  Buscar electrodoméstico
                  <span className="relative mt-2 block">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary/70" />
                    <input
                      value={applianceSearch}
                      onChange={(e) => setApplianceSearch(e.target.value)}
                      placeholder="Nombre, categoría o palabra del tipo…"
                      className="w-full rounded-2xl border border-primary/10 bg-white py-2.5 pl-10 pr-4 text-sm outline-none placeholder:text-secondary/45"
                    />
                  </span>
                </label>
                {filteredApplianceMatches !== null && filteredApplianceMatches.length > 0 ? (
                  <div className="rounded-2xl border border-primary/10 bg-primary/[0.04] p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-secondary">
                      Resultados ({filteredApplianceMatches.length}) · clic para ir al detalle
                    </p>
                    <div className="mt-3 flex max-h-40 flex-wrap gap-2 overflow-y-auto">
                      {filteredApplianceMatches.map(({ item, idx }) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => openApplianceDetailByIndex(idx)}
                          className="max-w-full truncate rounded-full border border-primary/15 bg-white px-3 py-1.5 text-left text-xs font-semibold text-primary transition hover:border-primary/35"
                          title={`${item.categoria ?? ""} — ${item.label}`}
                        >
                          {item.categoria ?? ""}: {item.label}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => setApplianceSearch("")}
                      className="mt-3 text-xs font-semibold text-[#8B1C1C] underline-offset-2 hover:underline"
                    >
                      Limpiar búsqueda
                    </button>
                  </div>
                ) : filteredApplianceMatches !== null && filteredApplianceMatches.length === 0 ? (
                  <div className="rounded-2xl border border-primary/10 bg-primary/5 px-4 py-3 text-sm text-secondary">
                    Sin coincidencias. Prueba otro término o borra el texto del buscador.
                  </div>
                ) : null}

                {!applianceSearchNorm && applianceCarouselRows.length > 0 ? (
                  <div className="space-y-8">
                    {applianceCarouselRows.map((row) => (
                      <div key={row.key} className={streamRowShell}>
                        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                          <div>
                            <p className={streamRowHeading}>{row.title}</p>
                            <p className={streamRowHint}>Electrodomésticos</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const el = applianceRowRefs.current[row.key];
                              if (el) el.scrollTo({ left: el.scrollWidth, behavior: "smooth" });
                            }}
                            className={streamVerTodosClass}
                          >
                            Ver todos
                          </button>
                        </div>
                        <div
                          ref={(el) => {
                            applianceRowRefs.current[row.key] = el;
                          }}
                          className={streamScrollClass}
                        >
                          {row.entries.map(({ item, idx }) => (
                            <div key={item.id} className="flex shrink-0 flex-col gap-2">
                              <button
                                type="button"
                                onClick={() => openApplianceDetailByIndex(idx)}
                                className="text-left"
                              >
                                <div className={streamPosterClass(applianceStep === idx)}>
                                  <ApplianceTypeImage
                                    item={item}
                                    preferredSrcs={[applianceBackendIndex[item.id]?.image]}
                                    alt=""
                                    className={streamCatalogThumbImageClass}
                                  />
                                  <div className={streamPosterTitleOverlay}>
                                    <p className={streamPosterLabelClass}>{item.label}</p>
                                  </div>
                                </div>
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    <div className={streamRowShell}>
                      <div className="mb-4">
                        <p className={streamRowHeading}>Otro</p>
                        <p className={streamRowHint}>No listado en catálogo</p>
                      </div>
                      <div className={streamScrollClass}>
                        <div className="flex shrink-0 items-end gap-1">
                          <button type="button" onClick={openApplianceOtroDetail} className="text-left">
                            <div
                              className={`${streamPosterClass(false)} flex flex-col items-center justify-end border-2 border-dashed border-white/25 bg-zinc-900/80 pb-3 pt-10`}
                            >
                              <span className="px-2 text-center text-[10px] font-semibold uppercase tracking-wide text-zinc-300">
                                Otro
                              </span>
                              <span className="mt-1 px-2 text-center text-xs text-zinc-500">No en catálogo</span>
                            </div>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
            <div className="space-y-4 rounded-3xl border border-primary/10 bg-primary/[0.03] p-4 sm:p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
                  Accesorios de Organización y Tecnología
                </p>
                <p className="mt-2 text-sm text-secondary">
                  Selecciona accesorios desde el catálogo del backend. El acomodo es en slide, igual que en los
                  electrodomésticos, pero con una superficie más clara.
                </p>
              </div>
              <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
                Buscar accesorio
                <span className="relative mt-2 block">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary/70" />
                  <input
                    value={accessorySearch}
                    onChange={(e) => setAccessorySearch(e.target.value)}
                    placeholder="Organización, tecnología, categoría o nombre…"
                    className="w-full rounded-2xl border border-primary/10 bg-white py-2.5 pl-10 pr-4 text-sm outline-none placeholder:text-secondary/45"
                  />
                </span>
              </label>
              {accessoryCarouselRows.length > 0 ? (
                <div className="space-y-6">
                  {accessoryCarouselRows.map((row) => (
                    <div key={row.key} className="rounded-3xl bg-white/90 px-3 py-4 shadow-inner ring-1 ring-primary/10 sm:px-4 sm:py-5">
                      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/90">{row.title}</p>
                          <p className="mt-1 text-sm font-medium tracking-wide text-secondary">Catálogo de backend</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const el = accessoryRowRefs.current[row.key];
                            if (el) el.scrollTo({ left: el.scrollWidth, behavior: "smooth" });
                          }}
                          className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.18em] text-secondary underline-offset-2 transition hover:text-primary hover:underline"
                        >
                          Ver todos
                        </button>
                      </div>
                      <div
                        ref={(el) => {
                          accessoryRowRefs.current[row.key] = el;
                        }}
                        className="flex gap-3 overflow-x-auto pb-2 pt-1 pl-0.5 [-ms-overflow-style:none] [scrollbar-color:rgba(139,28,28,0.25)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#8B1C1C]/20 sm:gap-4"
                      >
                        {row.entries.map(({ item }) => {
                          const pricing = accessoryBackendIndex[item._id];
                          const selected = levantamiento.accessoryDocumentIds.includes(item._id);
                          const previewItem: ItemCatalogo = {
                            id: item._id,
                            label: item.nombre,
                            categoria: item.categoria,
                            hint: item.descripcion ?? undefined,
                            image: "",
                            allowFallbackImage: false,
                          };
                          return (
                            <div key={item._id} className="flex shrink-0 flex-col gap-2">
                              <button
                                type="button"
                                onClick={() => setAccessoryInDocument(item._id, !selected)}
                                className="text-left"
                              >
                                <div className={`relative z-10 aspect-[2/3] w-[min(10.5rem,52vw)] shrink-0 overflow-hidden rounded-lg bg-white shadow-xl transition sm:w-[min(12.25rem,36vw)] lg:w-[min(13rem,30vw)] ${selected ? "ring-2 ring-[#8B1C1C] ring-offset-2 ring-offset-white" : "ring-1 ring-[#8B1C1C]/10 hover:ring-[#8B1C1C]/40"}`}>
                                  <ApplianceTypeImage
                                    item={previewItem}
                                    preferredSrcs={[pricing?.image]}
                                    alt=""
                                    className="absolute inset-0 z-0 h-full w-full object-cover"
                                  />
                                  <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/88 via-black/30 to-transparent px-2 pb-2.5 pt-14">
                                    <p className="line-clamp-2 text-xs font-medium leading-snug text-white/95 sm:text-sm">
                                      {item.nombre}
                                    </p>
                                  </div>
                                  {selected ? (
                                    <span className="absolute right-2 top-2 z-[1] rounded-full bg-[#8B1C1C] p-1 text-white shadow-md">
                                      <Check className="h-3 w-3" />
                                    </span>
                                  ) : null}
                                </div>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-primary/20 bg-white px-4 py-3 text-sm text-secondary">
                  No hay accesorios disponibles con ese criterio.
                </div>
              )}
            </div>
            <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
              Comentarios de esta sección
              <textarea
                value={levantamiento.sectionComments.c ?? ""}
                onChange={(e) => setSectionComment("c", e.target.value)}
                rows={3}
                placeholder="Marcas, modelos, voltajes…"
                className="mt-2 w-full resize-y rounded-2xl border border-primary/10 bg-white/90 px-4 py-3 text-sm outline-none placeholder:text-secondary/50"
              />
            </label>
          </div>
        </LevantamientoSectionC>

        <LevantamientoSectionD>
          <div className="space-y-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
                Sección D · Showroom digital
              </p>
              <h2 className="mt-2 text-2xl font-semibold">Cubiertas / frentes / herrajes</h2>
              <p className="mt-2 text-sm text-secondary">Personaliza el look con el catálogo digital.</p>
            </div>
            <div className="flex flex-col gap-3 rounded-2xl border border-primary/10 bg-white/90 p-4 md:flex-row md:items-center md:justify-between">
              <div className="flex-1">
                <input
                  value={materialSearch}
                  onChange={(event) => setMaterialSearch(event.target.value)}
                  placeholder="Buscar material..."
                  className="w-full rounded-2xl border border-primary/10 bg-white px-4 py-2.5 text-sm outline-none"
                />
              </div>
              <div className="flex flex-wrap gap-2 text-xs font-semibold">
                {(["Todos", "Estandar", "Tendencia", "Premium"] as const).map((tier) => (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => setTierFilter(tier)}
                    className={`rounded-full px-4 py-2 transition ${
                      tierFilter === tier
                        ? "bg-[#8B1C1C] text-white"
                        : "border border-primary/10 bg-white text-secondary hover:border-primary/30"
                    }`}
                  >
                    {tier}
                  </button>
                ))}
              </div>
            </div>
            <MaterialGrid
              title="Cubiertas"
              options={materialCatalog.cubiertas}
              selectedId={selectedCubierta}
              onSelect={setSelectedCubierta}
              page={pages.cubiertas}
              onPageChange={(page) => setPages((prev) => ({ ...prev, cubiertas: page }))}
              category="cubiertas"
              largoLineal={metrics.largoValue}
              materialSearch={materialSearch}
              tierFilter={tierFilter}
              tierPriceByTier={materialTierAverages.cubiertas}
            />
            <MaterialGrid
              title="Frentes / Material base"
              options={materialCatalog.frentes}
              multiSelect
              selectedIds={selectedFrenteIds}
              onToggle={toggleFrente}
              page={pages.frentes}
              onPageChange={(page) => setPages((prev) => ({ ...prev, frentes: page }))}
              category="frentes"
              largoLineal={metrics.largoValue}
              materialSearch={materialSearch}
              tierFilter={tierFilter}
              tierPriceByTier={materialTierAverages.frentes}
            />
            <MaterialGrid
              title="Herrajes"
              options={materialCatalog.herrajes}
              selectedId={selectedHerraje}
              onSelect={setSelectedHerraje}
              page={pages.herrajes}
              onPageChange={(page) => setPages((prev) => ({ ...prev, herrajes: page }))}
              category="herrajes"
              largoLineal={metrics.largoValue}
              materialSearch={materialSearch}
              tierFilter={tierFilter}
              tierPriceByTier={materialTierAverages.herrajes}
            />
            <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
              Comentarios de esta sección
              <textarea
                value={levantamiento.sectionComments.d ?? ""}
                onChange={(e) => setSectionComment("d", e.target.value)}
                rows={3}
                placeholder="Preferencias de acabado, referencias, etc."
                className="mt-2 w-full resize-y rounded-2xl border border-primary/10 bg-white/90 px-4 py-3 text-sm outline-none placeholder:text-secondary/50"
              />
            </label>
          </div>
        </LevantamientoSectionD>

        <LevantamientoSectionE>
          <div ref={lightingSectionRef} className="scroll-mt-6 space-y-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
                Sección E · Iluminación
              </p>
              <p className="mt-2 text-sm text-secondary">
                Pósters grandes; título sobre la imagen. Clic en el póster para elegir o quitar luminarios (puedes
                marcar varios). «Medidas opcionales» abre el detalle si necesitas anotar medidas. La lista definitiva la
                confirma la empresa.
              </p>
            </div>
            <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
              Buscar tipo de iluminación
              <span className="relative mt-2 block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary/70" />
                <input
                  value={lightingSearch}
                  onChange={(e) => setLightingSearch(e.target.value)}
                  placeholder="Ej. LED, spot, colgante, indirecta…"
                  className="w-full rounded-2xl border border-primary/10 bg-white py-2.5 pl-10 pr-4 text-sm outline-none placeholder:text-secondary/45"
                />
              </span>
            </label>
            {lightingShowOtro ? (
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => setLightingShowOtro(false)}
                  className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-white px-4 py-2 text-sm font-semibold text-[#8B1C1C] transition hover:border-primary/30"
                >
                  <ChevronLeft className="h-4 w-4 shrink-0" />
                  Volver al catálogo
                </button>
                <div className="space-y-4 rounded-2xl border border-dashed border-primary/20 bg-primary/[0.03] p-5">
                  <p className="text-sm font-semibold text-primary">Otro luminario o esquema</p>
                  <label className="flex cursor-pointer items-center gap-2.5 rounded-2xl border border-primary/10 bg-white px-3 py-2.5 text-sm text-primary">
                    <input
                      type="checkbox"
                      className="h-4 w-4 shrink-0 rounded border-primary/30 accent-[#8B1C1C]"
                      checked={levantamiento.lightingOtroInDocument}
                      onChange={(e) =>
                        setLevantamiento((prev) => ({ ...prev, lightingOtroInDocument: e.target.checked }))
                      }
                    />
                    <span>Seleccionar (medidas opcionales)</span>
                  </label>
                  <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
                    Descripción
                    <textarea
                      value={levantamiento.lightingOtro.descripcion}
                      onChange={(e) => patchOtro("lightingOtro", "descripcion", e.target.value)}
                      rows={3}
                      className="mt-2 w-full resize-y rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm outline-none"
                    />
                  </label>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {(["ancho", "alto", "fondo"] as const).map((field) => (
                      <label
                        key={field}
                        className="text-[10px] font-semibold uppercase tracking-[0.15em] text-secondary"
                      >
                        {field} (m)
                        <input
                          value={levantamiento.lightingOtro[field]}
                          onChange={(e) => patchOtro("lightingOtro", field, e.target.value)}
                          inputMode="decimal"
                          className="mt-1.5 w-full rounded-2xl border border-primary/10 bg-white px-3 py-2.5 text-sm outline-none"
                        />
                      </label>
                    ))}
                  </div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
                    Precio estimado (MXN, cotización)
                    <input
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      placeholder="Opcional"
                      value={
                        levantamiento.lightingOtro.precioEstimado == null ||
                        levantamiento.lightingOtro.precioEstimado === 0
                          ? ""
                          : String(levantamiento.lightingOtro.precioEstimado)
                      }
                      onChange={(e) => {
                        const raw = e.target.value.trim();
                        if (raw === "") {
                          setLevantamiento((prev) => ({
                            ...prev,
                            lightingOtro: { ...prev.lightingOtro, precioEstimado: undefined },
                          }));
                          return;
                        }
                        const n = Number.parseFloat(raw.replace(",", "."));
                        if (!Number.isFinite(n)) return;
                        setLevantamiento((prev) => ({
                          ...prev,
                          lightingOtro: {
                            ...prev.lightingOtro,
                            precioEstimado: Math.max(0, n),
                          },
                        }));
                      }}
                      className="mt-2 w-full rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm outline-none"
                    />
                  </label>
                </div>
              </div>
            ) : !lightingBrowseMode && lightingDetailItem ? (
              <div className="space-y-5">
                <button
                  type="button"
                  onClick={() => {
                    setLightingBrowseMode(true);
                    setLightingFocusedId(null);
                  }}
                  className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-white px-4 py-2 text-sm font-semibold text-[#8B1C1C] transition hover:border-primary/30"
                >
                  <ChevronLeft className="h-4 w-4 shrink-0" />
                  Volver al catálogo
                </button>
                <div className="grid gap-6 lg:grid-cols-[minmax(0,240px)_1fr]">
                  <div className="relative mx-auto aspect-[2/3] w-full max-w-[min(20rem,92vw)] overflow-hidden rounded-2xl border border-primary/10 bg-white lg:mx-0">
                    <LightingTypeImage
                      item={lightingDetailItem}
                      alt=""
                      className="absolute inset-0 z-0 box-border h-full w-full object-contain object-center p-2"
                    />
                    <span className="pointer-events-none absolute bottom-2 left-2 z-10 rounded-lg bg-black/55 px-2 py-1 text-[10px] font-semibold text-white">
                      {lightingDetailItem.label}
                    </span>
                  </div>
                  <div className="space-y-3">
                    <p className="text-base font-semibold text-primary">{lightingDetailItem.label}</p>
                    <label className="flex cursor-pointer items-center gap-2.5 rounded-2xl border border-primary/10 bg-primary/[0.04] px-3 py-2.5 text-sm text-primary">
                      <input
                        type="checkbox"
                        className="h-4 w-4 shrink-0 rounded border-primary/30 accent-[#8B1C1C]"
                        checked={levantamiento.lightingSelectedIds.includes(lightingDetailItem.id)}
                        onChange={(e) => setLightingInDocument(lightingDetailItem.id, e.target.checked)}
                      />
                      <span>Seleccionar (medidas opcionales)</span>
                    </label>
                    <div className="grid gap-3 sm:grid-cols-3">
                      {(["ancho", "alto", "fondo"] as const).map((field) => {
                        const m =
                          levantamiento.lightingMeasures[lightingDetailItem.id] ?? {
                            ancho: "",
                            alto: "",
                            fondo: "",
                          };
                        return (
                          <label
                            key={field}
                            className="text-[10px] font-semibold uppercase tracking-[0.15em] text-secondary"
                          >
                            {field} (m)
                            <input
                              value={m[field]}
                              onChange={(e) =>
                                patchMedidasMap("lightingMeasures", lightingDetailItem.id, field, e.target.value)
                              }
                              inputMode="decimal"
                              className="mt-1.5 w-full rounded-2xl border border-primary/10 bg-white px-3 py-2.5 text-sm outline-none"
                            />
                          </label>
                        );
                      })}
                    </div>
                    {lightingModalNavIds.length > 1 ? (
                      <div className="flex flex-wrap gap-2 border-t border-primary/10 pt-4">
                        <button
                          type="button"
                          onClick={() => {
                            const pos = lightingModalNavIds.indexOf(lightingFocusedId!);
                            if (pos > 0) setLightingFocusedId(lightingModalNavIds[pos - 1]!);
                          }}
                          disabled={!lightingFocusedId || lightingModalNavIds.indexOf(lightingFocusedId) <= 0}
                          className="inline-flex items-center gap-1 rounded-full border border-primary/15 px-3 py-2 text-xs font-semibold text-primary disabled:opacity-40"
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Anterior
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const pos = lightingFocusedId ? lightingModalNavIds.indexOf(lightingFocusedId) : -1;
                            if (pos < lightingModalNavIds.length - 1) {
                              setLightingFocusedId(lightingModalNavIds[pos + 1]!);
                            }
                          }}
                          disabled={
                            !lightingFocusedId ||
                            lightingModalNavIds.indexOf(lightingFocusedId) >= lightingModalNavIds.length - 1
                          }
                          className="inline-flex items-center gap-1 rounded-full border border-primary/15 px-3 py-2 text-xs font-semibold text-primary disabled:opacity-40"
                        >
                          Siguiente
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : filteredLightingItems !== null ? (
              <div className="space-y-4">
                {filteredLightingItems.length === 0 ? (
                  <div className="rounded-2xl border border-primary/10 bg-primary/5 px-4 py-3 text-sm text-secondary">
                    No hay tipos que coincidan. Prueba otra palabra o borra la búsqueda para ver el catálogo por filas.
                  </div>
                ) : (
                  <div className={streamRowShell}>
                    <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                      <div>
                        <p className={streamRowHeading}>Resultados de búsqueda</p>
                        <p className={streamRowHint}>
                          Iluminación · {filteredLightingItems.length} tipo
                          {filteredLightingItems.length === 1 ? "" : "s"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const el = lightingRowRefs.current.busqueda;
                          if (el) el.scrollTo({ left: el.scrollWidth, behavior: "smooth" });
                        }}
                        className={streamVerTodosClass}
                      >
                        Ver todos
                      </button>
                    </div>
                    <div
                      ref={(el) => {
                        lightingRowRefs.current.busqueda = el;
                      }}
                      className={streamScrollClass}
                    >
                      {filteredLightingItems.map((item, rank) => (
                        <div key={item.id} className="flex shrink-0 items-end gap-1">
                          <span className={streamRankClass} aria-hidden>
                            {rank + 1}
                          </span>
                          <div className="flex flex-col items-start gap-1">
                            <button
                              type="button"
                              onClick={() => toggleLightingSelected(item.id)}
                              className="text-left"
                              title="Clic para seleccionar o quitar"
                            >
                              <div
                                className={streamPosterClass(levantamiento.lightingSelectedIds.includes(item.id))}
                              >
                                <LightingTypeImage
                                  item={item}
                                  alt=""
                                  className={streamLightingThumbClass}
                                />
                                <div className={streamPosterTitleOverlay}>
                                  <p className={streamPosterLabelClass}>{item.label}</p>
                                </div>
                              </div>
                            </button>
                            <button
                              type="button"
                              className="text-[10px] font-semibold text-[#8B1C1C] underline-offset-2 hover:underline"
                              onClick={() => {
                                setLightingFocusedId(item.id);
                                setLightingBrowseMode(false);
                              }}
                            >
                              Medidas opcionales
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setLightingSearch("")}
                    className="rounded-full border border-primary/15 bg-white px-4 py-2 text-xs font-semibold text-secondary transition hover:border-primary/35"
                  >
                    Limpiar búsqueda y ver carruseles
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLightingSearch("");
                      setLightingShowOtro(true);
                      setLevantamiento((prev) => ({ ...prev, lightingOtroInDocument: true }));
                    }}
                    className="rounded-full border border-dashed border-primary/25 bg-white px-4 py-2 text-xs font-semibold text-secondary transition hover:border-primary/35"
                  >
                    Ir a «Otro» (luminario no listado)
                  </button>
                </div>
              </div>
            ) : (
              <div className={streamRowShell}>
                <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <p className={streamRowHeading}>Iluminación</p>
                    <p className={streamRowHint}>Catálogo de referencia</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const el = lightingRowRefs.current.catalogo;
                      if (el) el.scrollTo({ left: el.scrollWidth, behavior: "smooth" });
                    }}
                    className={streamVerTodosClass}
                  >
                    Ver todos
                  </button>
                </div>
                <div
                  ref={(el) => {
                    lightingRowRefs.current.catalogo = el;
                  }}
                  className={streamScrollClass}
                >
                  {LIGHTING_ITEMS.map((item, rank) => (
                    <div key={item.id} className="flex shrink-0 items-end gap-1">
                      <span className={streamRankClass} aria-hidden>
                        {rank + 1}
                      </span>
                      <div className="flex flex-col items-start gap-1">
                        <button
                          type="button"
                          onClick={() => toggleLightingSelected(item.id)}
                          className="text-left"
                          title="Clic para seleccionar o quitar"
                        >
                          <div
                            className={streamPosterClass(levantamiento.lightingSelectedIds.includes(item.id))}
                          >
                            <LightingTypeImage
                              item={item}
                              alt=""
                              className={streamLightingThumbClass}
                            />
                            <div className={streamPosterTitleOverlay}>
                              <p className={streamPosterLabelClass}>{item.label}</p>
                            </div>
                          </div>
                        </button>
                        <button
                          type="button"
                          className="text-[10px] font-semibold text-[#8B1C1C] underline-offset-2 hover:underline"
                          onClick={() => {
                            setLightingFocusedId(item.id);
                            setLightingBrowseMode(false);
                          }}
                        >
                          Medidas opcionales
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="flex shrink-0 items-end gap-1">
                    <span className={streamRankClass} aria-hidden>
                      {LIGHTING_ITEMS.length + 1}
                    </span>
                    <div className="flex flex-col items-start gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setLightingShowOtro(true);
                          setLevantamiento((prev) => ({ ...prev, lightingOtroInDocument: true }));
                        }}
                        className="text-left"
                        title="Luminario no listado"
                      >
                        <div
                          className={`${streamPosterClass(levantamiento.lightingOtroInDocument)} flex flex-col items-center justify-center border-2 border-dashed border-white/25 bg-zinc-900/80 px-2 py-3`}
                        >
                          <span className="text-center text-[10px] font-semibold uppercase tracking-wide text-zinc-300">
                            Otro
                          </span>
                          <span className="mt-1 text-center text-xs text-zinc-500">No en catálogo</span>
                        </div>
                      </button>
                      <button
                        type="button"
                        className="text-[10px] font-semibold text-[#8B1C1C] underline-offset-2 hover:underline"
                        onClick={() => {
                          setLightingShowOtro(true);
                          setLevantamiento((prev) => ({ ...prev, lightingOtroInDocument: true }));
                        }}
                      >
                        Medidas opcionales
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
              Comentarios de esta sección
              <textarea
                value={levantamiento.sectionComments.e ?? ""}
                onChange={(e) => setSectionComment("e", e.target.value)}
                rows={3}
                placeholder="Circuitos, dimmers, temperatura de color…"
                className="mt-2 w-full resize-y rounded-2xl border border-primary/10 bg-white/90 px-4 py-3 text-sm outline-none placeholder:text-secondary/50"
              />
            </label>
          </div>
        </LevantamientoSectionE>

        <LevantamientoResumen
          scenarioOptions={scenarioOptions}
          scenarioCardRanges={scenarioCardRanges}
          selectedScenario={selectedScenario}
          scenarioRangeLabel={scenarioRangeLabel}
          metrics={metrics}
          selectedSummary={selectedSummary}
          levantamientoConfig={levantamientoConfig}
          dockToBottom={Boolean(activeCitaTask)}
          onSelectScenario={(scenarioId) => setSelectedScenario(scenarioId as AutoScenarioId)}
          onGeneratePdf={handleGeneratePdf}
        />
      </div>
      {activeCitaTask ? (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-emerald-200/90 bg-white/95 px-4 py-3 shadow-[0_-6px_24px_rgba(0,0,0,0.07)] backdrop-blur-md">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-xl text-xs text-secondary">
              Cierra la cita y guarda la estimación en la tarjeta del cliente. Con{" "}
              <span className="font-semibold text-emerald-800">Terminar y continuar</span> el formulario se
              reinicia para otro espacio. El PDF no se descarga solo: úsalo desde la vista de clientes o con{" "}
              <span className="font-semibold text-emerald-800">Generar estimación en PDF</span>.
            </p>
            <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
              <button
                type="button"
                onClick={handleFinishCita}
                className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-emerald-700"
              >
                <CheckCircle2 className="h-4 w-4" />
                Terminar
              </button>
              <button
                type="button"
                onClick={handleFinishAndContinue}
                className="flex items-center justify-center gap-2 rounded-2xl border-2 border-emerald-600 bg-white px-5 py-2.5 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-50"
              >
                Terminar y continuar
              </button>
            </div>
          </div>
          {finishError ? (
            <p className="mx-auto mt-2 max-w-6xl text-sm text-rose-600">{finishError}</p>
          ) : null}
        </div>
      ) : null}
      <div
        className={`fixed right-6 z-40 w-[min(260px,calc(100vw-2rem))] rounded-3xl border border-white/70 bg-white/90 p-4 shadow-2xl backdrop-blur-md ${
          activeCitaTask ? "bottom-28" : "top-24"
        }`}
      >
        <p className="text-xs uppercase tracking-[0.25em] text-secondary">Rango estimado</p>
        <p className="mt-2 text-xl font-semibold text-[#8B1C1C]">
          {scenarioRangeLabel}
        </p>
        <p className="mt-2 text-[11px] text-secondary">
          {selectedSummary.meters} m lineales / {selectedSummary.label || "Selección en curso"}
        </p>
      </div>

      {confirmChangeWallCountOpen ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-change-wall-count-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
            aria-label="Cerrar diálogo"
            onClick={() => setConfirmChangeWallCountOpen(false)}
          />
          <div className="relative z-10 w-full max-w-md rounded-3xl border border-white/60 bg-white/95 p-6 shadow-2xl backdrop-blur-md">
            <h2 id="confirm-change-wall-count-title" className="text-lg font-semibold text-primary">
              ¿Cambiar la cantidad de paredes?
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-secondary">
              Se borrarán las medidas capturadas en el flujo por pared. Esta acción no se puede deshacer desde aquí.
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmChangeWallCountOpen(false)}
                className="rounded-2xl border border-primary/15 bg-white px-5 py-2.5 text-sm font-semibold text-primary transition hover:border-primary/30"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmChangeWallCountOpen(false);
                  clearWallFlowAndSlots();
                }}
                className="rounded-2xl bg-[#8B1C1C] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
              >
                Sí, cambiar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
