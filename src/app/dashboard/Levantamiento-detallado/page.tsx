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
  normalizeLegacyProjectTypeToCatalog,
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
  getAveragePriceByTier,
  getLevantamientoConfig,
  type LevantamientoConfig,
  type MaterialGama,
} from "@/lib/config-levantamiento";
import { formatDeliveryWeeksLabel } from "@/lib/delivery-weeks";
import { buildPreliminarPdfDataUrl, downloadPreliminarPdf } from "@/lib/pdf-preliminar";
import { createPreliminarSeguimientoPdfKey, saveFormalPdf } from "@/lib/formal-pdf-storage";
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

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);

const parseMeasure = (raw: string | undefined): number | null => {
  if (!raw) return null;
  const value = Number.parseFloat(raw.replace(",", "."));
  return Number.isFinite(value) ? value : null;
};

const normalizeCatalogText = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const buildSearchText = (...parts: Array<string | undefined>) => normalizeCatalogText(parts.filter(Boolean).join(" "));

type MaterialOption = {
  id: string;
  name: string;
  tier: "Estandar" | "Tendencia" | "Premium";
  image: string;
  pricePerM?: number;
};

type MaterialCategory = "cubiertas" | "frentes" | "herrajes";
type MaterialTierFilter = "Todos" | MaterialOption["tier"];
type MaterialCatalogState = Record<MaterialCategory, MaterialOption[]>;

const materialImageMap: Record<MaterialCategory, { match: RegExp; src: string }[]> = {
  cubiertas: [
    { match: /calacatta|m?rmol|marble/i, src: "/images/materiales/calaccata_marble.jpg" },
    { match: /granito negro/i, src: "/images/materiales/black_granite.jpg" },
    { match: /cuarzo/i, src: "/images/materiales/quartz_texture.jpg" },
    { match: /sinterizada/i, src: "/images/materiales/smooth_stone.jpg" },
    { match: /porcelanato|terrazzo|terrazo/i, src: "/images/materiales/terazzo_texture.jpg" },
    { match: /laminado|blanco|nieve/i, src: "/images/materiales/white_seamless_texture.jpg" },
    { match: /granito/i, src: "/images/materiales/stone_texture.jpg" },
  ],
  frentes: [
    { match: /nogal|parota|cedro|encino|madera|chapa/i, src: "/images/materiales/walnut_wood_texture.jpg" },
    { match: /melamina blanca|blanca/i, src: "/images/materiales/white_seamless_texture.jpg" },
    { match: /melamina|mdf/i, src: "/images/materiales/plywood_texture.jpg" },
    { match: /laca met?lica|metalica/i, src: "/images/materiales/metalic_textures.jpg" },
    { match: /laca/i, src: "/images/materiales/white_marble_texture.jpg" },
  ],
  herrajes: [
    { match: /inox|stainless/i, src: "/images/materiales/stainless_steel_hinge.jpg" },
    { match: /cierre|drawer|slide|push/i, src: "/images/materiales/drawer_slide.jpg" },
    { match: /soft|hinge|amortiguado|hidr?ulico|smart|lux/i, src: "/images/materiales/cabinet_hinge.jpg" },
  ],
};

const emptyMaterialCatalog: MaterialCatalogState = {
  cubiertas: [],
  frentes: [],
  herrajes: [],
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

const readCatalogNumber = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const parsed = Number.parseFloat(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return 0;
};

type BackendCatalogRecord = {
  _id?: string;
  nombre?: string;
  categoria?: string;
  descripcion?: string;
  imagenUrl?: string;
  thumbnailUrl?: string;
  precio?: number;
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

const resolveBackendCatalogMatch = (item: ItemCatalogo, records: BackendCatalogRecord[]) => {
  if (records.length === 0) return null;
  const itemText = buildSearchText(item.id, item.label, item.categoria, item.hint);
  const keywords = applianceKeywordMap[item.id] ?? [];

  const exact = records.find((record) => normalizeCatalogText(record.nombre ?? "") === itemText);
  if (exact) return exact;

  const keywordMatch = records.find((record) => {
    const recordText = buildSearchText(record.nombre, record.categoria, record.descripcion);
    return keywords.some((keyword) => recordText.includes(normalizeCatalogText(keyword)));
  });
  if (keywordMatch) return keywordMatch;

  const categoryMatch = records.find(
    (record) => normalizeCatalogText(record.categoria ?? "") === normalizeCatalogText(item.categoria ?? ""),
  );
  if (categoryMatch) return categoryMatch;

  return records.find((record) => buildSearchText(record.nombre, record.descripcion).includes(itemText)) ?? null;
};

const resolveBackendImage = (record: { thumbnailUrl?: unknown; imagenUrl?: unknown } | null | undefined) =>
  (typeof record?.thumbnailUrl === "string" && record.thumbnailUrl) ||
  (typeof record?.imagenUrl === "string" && record.imagenUrl) ||
  undefined;

const inferCatalogTier = (price: number, minPrice: number, maxPrice: number): MaterialOption["tier"] => {
  if (maxPrice <= minPrice) return "Tendencia";
  const ratio = (price - minPrice) / (maxPrice - minPrice);
  if (ratio < 0.34) return "Estandar";
  if (ratio < 0.67) return "Tendencia";
  return "Premium";
};

const inferCatalogCategory = (item: Record<string, unknown>, kind: "material" | "herraje"): MaterialCategory | null => {
  if (kind === "herraje") return "herrajes";

  const seccion = typeof item.seccion === "string" ? item.seccion.trim().toLowerCase() : "";
  const categoria = typeof item.categoria === "string" ? item.categoria.trim().toLowerCase() : "";
  const nombre = typeof item.nombre === "string" ? item.nombre.trim().toLowerCase() : "";

  if (seccion === "cubierta" || categoria.includes("cubierta") || nombre.includes("cubierta")) return "cubiertas";
  if (seccion === "vistas" || seccion === "cajones_puertas" || categoria.includes("frente") || nombre.includes("frente")) {
    return "frentes";
  }
  if (
    seccion === "accesorios_modulo" ||
    seccion === "extraibles_puertas_abatibles" ||
    seccion === "herrajes" ||
    categoria.includes("herraje") ||
    nombre.includes("herraje")
  ) {
    return "herrajes";
  }

  return null;
};

const resolveMaterialImage = (name: string, category: MaterialCategory, fallback?: string) => {
  const match = materialImageMap[category].find((entry) => entry.match.test(name));
  if (match) return match.src;
  if (fallback?.startsWith("/")) return fallback;
  return {
    cubiertas: "/images/materiales/stone_texture.jpg",
    frentes: "/images/materiales/dark_wood_background.jpg",
    herrajes: "/images/materiales/cabinet_hinge.jpg",
  }[category];
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

const mapCatalogItem = (
  item: Material | Herraje,
  kind: "material" | "herraje",
  minPrice: number,
  maxPrice: number,
): MaterialOption | null => {
  const raw = item as unknown as Record<string, unknown>;
  const category = inferCatalogCategory(raw, kind);
  if (!category) return null;

  const pricePerM = readCatalogNumber(raw.precioUnitario, raw.precioPorMetro, raw.precioMetroLineal);
  const name = typeof raw.nombre === "string" && raw.nombre.trim() ? raw.nombre.trim() : "Material";

  return {
    id:
      (typeof raw.idCotizador === "string" && raw.idCotizador.trim()) ||
      (typeof raw._id === "string" && raw._id.trim()) ||
      name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    name,
    tier: inferCatalogTier(pricePerM, minPrice, maxPrice),
    image: resolveMaterialImage(name, category),
    pricePerM,
  };
};

const buildMaterialCatalogFromBackend = (materiales: Material[], herrajes: Herraje[]): MaterialCatalogState => {
  const materialRecords = materiales.map((item) => ({ item, kind: "material" as const }));
  const herrajeRecords = herrajes.map((item) => ({ item, kind: "herraje" as const }));
  const allPrices = [...materialRecords, ...herrajeRecords].map(({ item }) => {
    const raw = item as unknown as Record<string, unknown>;
    return readCatalogNumber(raw.precioUnitario, raw.precioPorMetro, raw.precioMetroLineal);
  });
  const minPrice = allPrices.length > 0 ? Math.min(...allPrices) : 0;
  const maxPrice = allPrices.length > 0 ? Math.max(...allPrices) : 0;

  const nextCatalog: MaterialCatalogState = { cubiertas: [], frentes: [], herrajes: [] };

  for (const { item, kind } of [...materialRecords, ...herrajeRecords]) {
    const mapped = mapCatalogItem(item, kind, minPrice, maxPrice);
    if (!mapped) continue;
    const category = inferCatalogCategory(item as unknown as Record<string, unknown>, kind);
    if (!category) continue;
    nextCatalog[category].push(mapped);
  }

  for (const key of Object.keys(nextCatalog) as MaterialCategory[]) {
    nextCatalog[key].sort((a, b) => a.name.localeCompare(b.name, "es"));
  }

  return nextCatalog;
};

const defaultCategoryImage: Record<MaterialCategory, string> = {
  cubiertas: "/images/materiales/stone_texture.jpg",
  frentes: "/images/materiales/dark_wood_background.jpg",
  herrajes: "/images/materiales/cabinet_hinge.jpg",
};

const SectionCard = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-lg backdrop-blur-md">
    {children}
  </div>
);

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
          const imageSrc = resolveMaterialImage(option.name, category, option.image);
          const pricePerM = option.pricePerM || tierPriceByTier[option.tier];
          const optionPrice = Math.max(0, largoLineal * pricePerM);
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
                <img
                  src={imageSrc}
                  alt={option.name}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  onError={(event) => {
                    event.currentTarget.src = "/images/hero-placeholder.svg";
                  }}
                />
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
                <p className="text-xs font-medium text-secondary">Estimado con tus medidas</p>
                <p className="text-xs font-semibold text-[#8B1C1C]">{formatCurrency(optionPrice)}</p>
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

type ShowroomMaterialTier = MaterialOption["tier"];
type AutoScenarioId = "esencial" | "tendencia" | "premium";

/** Material → escenario de inversión ($/m). */
function tierToScenario(tier: ShowroomMaterialTier): AutoScenarioId {
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
function predominantShowroomTier(votes: ShowroomMaterialTier[]): ShowroomMaterialTier {
  if (votes.length === 0) return "Tendencia";
  const c = { Estandar: 0, Tendencia: 0, Premium: 0 };
  for (const v of votes) c[v]++;
  const max = Math.max(c.Estandar, c.Tendencia, c.Premium);
  const winners = (["Estandar", "Tendencia", "Premium"] as const).filter((k) => c[k] === max);
  if (winners.length !== 1) return "Tendencia";
  return winners[0]!;
}

/**
 * Escenario automático a partir de Sección D (cubierta, frentes, herraje).
 * Frentes: moda entre los seleccionados; luego moda entre las tres familias.
 */
function autoScenarioFromShowroom(
  cubiertaId: string,
  frenteIds: string[],
  herrajeId: string,
  catalog: MaterialCatalogState = emptyMaterialCatalog,
): AutoScenarioId {
  const tierC = catalog.cubiertas.find((item: MaterialOption) => item.id === cubiertaId)?.tier ?? "Estandar";
  const tiersF =
    frenteIds.length === 0
      ? ([] as ShowroomMaterialTier[])
      : frenteIds.map((id) => catalog.frentes.find((item: MaterialOption) => item.id === id)?.tier ?? "Estandar");
  const tierF = tiersF.length === 0 ? "Estandar" : predominantShowroomTier(tiersF);
  const tierH = catalog.herrajes.find((item: MaterialOption) => item.id === herrajeId)?.tier ?? "Estandar";
  const winner = predominantShowroomTier([tierC, tierF, tierH]);
  return tierToScenario(winner);
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
      const stored = runtimeStore.getItem(kanbanStorageKey);
      if (stored) {
        try {
          const tasks = JSON.parse(stored) as KanbanTask[];
          const task = tasks.find((t) => t.id === taskId);
          if (task) {
            setActiveCitaTask(task);
            if (task.project) setClientName(task.project);
            const lastPre = getPreliminarList(task).at(-1);
            if (lastPre?.projectType?.trim()) {
              setProjectType(normalizeLegacyProjectTypeToCatalog(lastPre.projectType));
            }
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
    seguimientoPdf?: { key: string; fileLabel: string };
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
      if (options?.seguimientoPdf) {
        const prevArchivos = Array.isArray(existingParsed.archivos)
          ? [...(existingParsed.archivos as object[])]
          : [];
        seguimientoProject.archivos = [
          ...prevArchivos,
          {
            id: `seg-preliminar-${options.seguimientoPdf.key}`,
            name: options.seguimientoPdf.fileLabel,
            type: "pdf",
            indexedPdfKey: options.seguimientoPdf.key,
          },
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
    let dataUrl: string;
    try {
      dataUrl = await buildPreliminarPdfDataUrl(newPreliminar);
    } catch {
      setFinishError("No se pudo generar el PDF para seguimiento. Intenta de nuevo.");
      return;
    }
    try {
      await saveFormalPdf(preliminarPdfKey, dataUrl);
    } catch {
      setFinishError("No se pudo guardar el PDF. Intenta de nuevo.");
      return;
    }
    const fileLabel = `Levantamiento detallado — ${newPreliminar.projectType}.pdf`;
    const result = savePreliminarAndGetNextTasks({
      seguimientoPdf: { key: preliminarPdfKey, fileLabel },
    });
    if (!result) return;
    const updatedTasksWithStage = result.updatedTasks.map((task) =>
      task.id === activeCitaTaskId
        ? { ...task, stage: "disenos" as const, status: "pendiente" as const }
        : task,
    );
    const kanbanStr = JSON.stringify(updatedTasksWithStage);
    runtimeStore.setItem(kanbanStorageKey, kanbanStr);
    runtimeStore.removeItem(activeCitaTaskStorageKey);
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
    let dataUrl: string;
    try {
      dataUrl = await buildPreliminarPdfDataUrl(newPreliminar);
    } catch {
      setFinishError("No se pudo generar el PDF para seguimiento. Intenta de nuevo.");
      return;
    }
    try {
      await saveFormalPdf(preliminarPdfKey, dataUrl);
    } catch {
      setFinishError("No se pudo guardar el PDF. Intenta de nuevo.");
      return;
    }
    const fileLabel = `Levantamiento detallado — ${newPreliminar.projectType}.pdf`;
    const result = savePreliminarAndGetNextTasks({
      seguimientoPdf: { key: preliminarPdfKey, fileLabel },
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

  const metrics = useMemo(() => {
    const largoValue = Math.max(0, Number.parseFloat(largo) || 0);
    const cubierta = materialCatalog.cubiertas.find((item) => item.id === selectedCubierta);
    const herraje = materialCatalog.herrajes.find((item) => item.id === selectedHerraje);
    const sumPrecioFrentePorM = selectedFrenteIds.reduce((acc, fid) => {
      const f = materialCatalog.frentes.find((item) => item.id === fid);
      return acc + (f?.pricePerM ?? 0);
    }, 0);
    const avgCubierta = cubierta?.pricePerM ?? 0;
    const avgHerraje = herraje?.pricePerM ?? 0;
    const costoMateriales = largoValue * (avgCubierta + sumPrecioFrentePorM + avgHerraje);
    const costoElectrodomesticos = applianceCatalogTotal;
    const costoAccesorios = accessoryCatalogTotal;
    const costoIluminacion = cotizacionIluminacionTotal(levantamiento);
    const precioEscenario =
      levantamientoConfig.scenarioPrices[selectedScenario] ?? 5000;
    const costoBase = largoValue * precioEscenario;
    const subtotal = costoBase + costoMateriales + costoElectrodomesticos + costoAccesorios + costoIluminacion;
    const iva = subtotal * levantamientoConfig.ivaPercent;
    const total = subtotal + iva;
    const m = levantamientoConfig.marginPercent;
    const rangeMin = total * (1 - m);
    const rangeMax = total * (1 + m);

    return {
      largoValue,
      costoBase,
      costoMateriales,
      costoElectrodomesticos,
      costoAccesorios,
      costoIluminacion,
      subtotal,
      iva,
      total,
      rangeMin,
      rangeMax,
      rangeLabel: `${formatCurrency(rangeMin)} - ${formatCurrency(rangeMax)}`,
      marginPercent: m,
    };
  }, [
    largo,
    selectedCubierta,
    selectedFrenteIds,
    selectedHerraje,
    levantamiento,
    selectedScenario,
    levantamientoConfig,
    applianceCatalogTotal,
    accessoryCatalogTotal,
  ]);

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

  const scenarioOptions = useMemo(
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
  const scenarioCardRanges = useMemo(() => {
    const largoValue = Math.max(0, Number.parseFloat(largo) || 0);
    const cubierta = materialCatalog.cubiertas.find((item) => item.id === selectedCubierta);
    const herraje = materialCatalog.herrajes.find((item) => item.id === selectedHerraje);
    const sumPrecioFrentePorM = selectedFrenteIds.reduce((acc, fid) => {
      const f = materialCatalog.frentes.find((item) => item.id === fid);
      return acc + (f?.pricePerM ?? 0);
    }, 0);
    const costoMateriales =
      largoValue *
      ((cubierta?.pricePerM ?? 0) + sumPrecioFrentePorM + (herraje?.pricePerM ?? 0));
    const costoElectrodomesticos = applianceCatalogTotal;
    const costoIluminacion = cotizacionIluminacionTotal(levantamiento);
    const ivaP = levantamientoConfig.ivaPercent;
    const m = levantamientoConfig.marginPercent;
    const def = createDefaultLevantamientoConfig().scenarioPrices;
    return scenarioOptions.map((s) => {
      const costoBaseS = largoValue * (levantamientoConfig.scenarioPrices[s.id as keyof typeof def] ?? def.esencial);
      const sub = costoBaseS + costoMateriales + costoElectrodomesticos + costoIluminacion;
      const tot = sub + sub * ivaP;
      return { id: s.id, min: tot * (1 - m), max: tot * (1 + m) };
    });
  }, [
    largo,
    selectedCubierta,
    selectedFrenteIds,
    selectedHerraje,
    levantamiento,
    scenarioOptions,
    levantamientoConfig,
    applianceCatalogTotal,
  ]);

  const materialTierAverages = useMemo(() => {
    const row = (items: MaterialOption[]) => {
      const grouped: Record<MaterialOption["tier"], number[]> = { Estandar: [], Tendencia: [], Premium: [] };
      for (const item of items) grouped[item.tier].push(item.pricePerM ?? 0);
      return {
        Estandar: grouped.Estandar.length ? grouped.Estandar.reduce((acc, value) => acc + value, 0) / grouped.Estandar.length : 0,
        Tendencia: grouped.Tendencia.length ? grouped.Tendencia.reduce((acc, value) => acc + value, 0) / grouped.Tendencia.length : 0,
        Premium: grouped.Premium.length ? grouped.Premium.reduce((acc, value) => acc + value, 0) / grouped.Premium.length : 0,
      } satisfies Record<MaterialOption["tier"], number>;
    };
    return {
      cubiertas: row(materialCatalog.cubiertas),
      frentes: row(materialCatalog.frentes),
      herrajes: row(materialCatalog.herrajes),
    };
  }, [materialCatalog]);

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

        <div className="rounded-2xl border-2 border-accent bg-white p-4 shadow-md ring-1 ring-accent/20">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold text-primary">
              ¿Precios del rango, escenarios o materiales por gama? Configúralos aquí (admin).
            </p>
            <Link
              href="/dashboard/configuracion-levantamiento"
              className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-2xl bg-accent px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 sm:w-auto"
            >
              Abrir configuración de levantamiento
            </Link>
          </div>
        </div>

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

        <SectionCard>
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
              Sección A · Datos del proyecto
            </p>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-secondary">
                Datos del proyecto
              </p>
              <div className="mt-4 grid grid-cols-1 items-end gap-x-4 gap-y-5 md:grid-cols-12">
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
                            setLevantamiento((prev) => ({ ...prev, conIsla: "" }));
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

                {/* Fila md: ¿Con isla? | Medidas | Tiempo (3+5+4) */}
                {isCocinasProjectTypeForConIsla(projectType) ? (
                  <div className="col-span-12 md:col-span-3">
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
                ) : null}

                <div
                  className="col-span-12 md:col-span-5"
                  role="group"
                  aria-label="Medidas generales en metros"
                >
                  <p className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.15em] text-secondary">
                    Medidas generales (m)
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
                        value={largo}
                        onChange={(event) => {
                          const nextValue = event.target.value;
                          lastEditedFieldRef.current = "largo";
                          caretPositionsRef.current.largo = event.target.selectionStart ?? null;
                          setLargo(nextValue);
                        }}
                        inputMode="decimal"
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
                        value={alto}
                        onChange={(event) => {
                          const nextValue = event.target.value;
                          lastEditedFieldRef.current = "alto";
                          caretPositionsRef.current.alto = event.target.selectionStart ?? null;
                          setAlto(nextValue);
                        }}
                        inputMode="decimal"
                        className="w-full rounded-xl border border-primary/10 bg-white/90 px-3 py-2 text-sm outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="col-span-12 md:col-span-4" role="group" aria-label="Tiempo de entrega en semanas">
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
                        value={deliveryWeeksMin}
                        onChange={(event) => {
                          const nextValue = event.target.value;
                          lastEditedFieldRef.current = "deliveryWeeksMin";
                          caretPositionsRef.current.deliveryWeeksMin = event.target.selectionStart ?? null;
                          setDeliveryWeeksMin(nextValue);
                        }}
                        type="number"
                        min={1}
                        step={1}
                        placeholder="ej. 8"
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
                        value={deliveryWeeksMax}
                        onChange={(event) => {
                          const nextValue = event.target.value;
                          lastEditedFieldRef.current = "deliveryWeeksMax";
                          caretPositionsRef.current.deliveryWeeksMax = event.target.selectionStart ?? null;
                          setDeliveryWeeksMax(nextValue);
                        }}
                        type="number"
                        min={1}
                        step={1}
                        placeholder="ej. 9"
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
        </SectionCard>

        <SectionCard>
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
        </SectionCard>

        <SectionCard>
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
                        {applianceBackendIndex[currentApplianceItem.id]?.price != null ? (
                          <p className="mt-1 text-xs font-semibold text-[#8B1C1C]">
                            Precio catálogo {formatCurrency(applianceBackendIndex[currentApplianceItem.id]!.price!)}
                          </p>
                        ) : null}
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
                    <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
                      Precio estimado (MXN)
                      <input
                        value={
                          levantamiento.applianceOtro.precioEstimado == null || levantamiento.applianceOtro.precioEstimado === 0
                            ? ""
                            : String(levantamiento.applianceOtro.precioEstimado)
                        }
                        onChange={(e) => {
                          const raw = e.target.value.trim();
                          const nextValue = raw === "" ? undefined : Math.max(0, Number.parseFloat(raw.replace(",", ".")) || 0);
                          setLevantamiento((prev) => ({
                            ...prev,
                            applianceOtro: { ...prev.applianceOtro, precioEstimado: nextValue },
                          }));
                        }}
                        inputMode="decimal"
                        placeholder="0"
                        className="mt-2 w-full rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm outline-none"
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
                              {applianceBackendIndex[item.id]?.price != null ? (
                                <p className="max-w-[11rem] text-[10px] font-semibold text-[#8B1C1C]">
                                  {formatCurrency(applianceBackendIndex[item.id]!.price!)}
                                </p>
                              ) : null}
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
                              <p className="max-w-[11rem] text-[10px] font-semibold text-[#8B1C1C]">
                                {pricing?.price != null ? formatCurrency(pricing.price) : "Precio por definir"}
                              </p>
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
        </SectionCard>

        <SectionCard>
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
        </SectionCard>

        <SectionCard>
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
        </SectionCard>

        <SectionCard>
          <div className="space-y-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
                Estimación visual
              </p>
              <h2 className="mt-2 text-2xl font-semibold">Selecciona el nivel de acabados</h2>
              <p className="mt-2 text-sm text-secondary">
                Presentación rápida para ayudar al cliente a imaginar el resultado.
              </p>
              <p className="mt-2 text-xs text-secondary/90">
                El escenario se alinea al cambiar cubierta, frentes u herrajes; puedes elegir otro nivel aquí si lo
                necesitas.
              </p>
            </div>
            <div className="grid gap-6 lg:grid-cols-3">
              {scenarioOptions.map((scenario) => {
                const cardRange = scenarioCardRanges.find((r) => r.id === scenario.id);
                const min = cardRange?.min ?? 0;
                const max = cardRange?.max ?? 0;
                const isActive = selectedScenario === scenario.id;
                return (
                  <button
                    key={scenario.id}
                    type="button"
                    onClick={() => setSelectedScenario(scenario.id as AutoScenarioId)}
                    className={`group overflow-hidden rounded-3xl border text-left shadow-lg transition hover:-translate-y-1 ${
                      isActive
                        ? "border-[#8B1C1C] bg-white ring-4 ring-[#8B1C1C]"
                        : "border-primary/10 bg-white/80 hover:border-primary/30"
                    }`}
                  >
                    <div className="h-44 w-full overflow-hidden">
                      <img
                        src={scenario.image}
                        alt={scenario.title}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                      />
                    </div>
                    <div className="space-y-3 p-6">
                      <p className="text-xs uppercase tracking-[0.3em] text-secondary">
                        {scenario.title}
                      </p>
                      <h3 className="text-lg font-semibold">{scenario.subtitle}</h3>
                      <div className="rounded-2xl bg-primary/5 px-4 py-3 text-center text-lg font-semibold text-[#8B1C1C]">
                        {formatCurrency(min)} - {formatCurrency(max)}
                      </div>
                      <p className="text-xs text-secondary">
                        Basado en medidas generales y selección del showroom.
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </SectionCard>

        <SectionCard>
          <div className="grid gap-6 md:grid-cols-[1.2fr_1fr]">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
                Cierre y estimación
              </p>
              <p className="text-sm text-secondary">
                Presenta el rango estimado y genera un PDF preliminar para el cliente.
              </p>
              <button
                onClick={handleGeneratePdf}
                className="mt-4 inline-flex items-center justify-center rounded-2xl bg-[#8B1C1C] px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:brightness-110"
              >
                Generar Estimación en PDF
              </button>
              <p className="mt-3 text-xs text-secondary">
                El PDF incluye portada (datos, materiales, rango) y anexo con comentarios y medidas del
                levantamiento cuando hay información capturada.
              </p>
              <div className="mt-4 max-w-md rounded-lg border border-primary/10 bg-white/80 px-3 py-2.5 text-xs text-secondary/90">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-secondary/70">
                  Desglose técnico
                </p>
                <div className="mt-2 space-y-1.5 tabular-nums">
                  <div className="flex justify-between gap-3">
                    <span>Costo base (escenario)</span>
                    <span className="shrink-0 text-primary/90">{formatCurrency(metrics.costoBase)}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span>Materiales</span>
                    <span className="shrink-0 text-primary/90">{formatCurrency(metrics.costoMateriales)}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span>Electrodomésticos</span>
                    <span className="shrink-0 text-primary/90">{formatCurrency(metrics.costoElectrodomesticos)}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span>Accesorios de organización y tecnología</span>
                    <span className="shrink-0 text-primary/90">{formatCurrency(metrics.costoAccesorios)}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span>Iluminación</span>
                    <span className="shrink-0 text-primary/90">{formatCurrency(metrics.costoIluminacion)}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="min-w-0 rounded-2xl border border-primary/10 bg-primary/5 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
                Estimación preliminar
              </p>
              <div className="mt-4 space-y-5">
                <div className="space-y-3 text-right">
                  <div className="flex justify-end gap-4 text-sm text-secondary sm:gap-6">
                    <span className="min-w-0 shrink">Subtotal</span>
                    <span className="min-w-0 shrink-0 font-semibold tabular-nums text-primary">
                      {formatCurrency(metrics.subtotal)}
                    </span>
                  </div>
                  <div className="flex justify-end gap-4 text-sm text-secondary sm:gap-6">
                    <span className="min-w-0 shrink">
                      IVA ({Math.round(levantamientoConfig.ivaPercent * 100)}%)
                    </span>
                    <span className="min-w-0 shrink-0 font-semibold tabular-nums text-primary">
                      {formatCurrency(metrics.iva)}
                    </span>
                  </div>
                  <div className="flex justify-end gap-4 border-t border-primary/15 pt-2 text-sm text-secondary sm:gap-6">
                    <span className="min-w-0 shrink self-center font-medium">Total</span>
                    <span className="min-w-0 shrink-0 text-2xl font-bold tabular-nums text-[#8B1C1C] sm:text-3xl">
                      {formatCurrency(metrics.total)}
                    </span>
                  </div>
                </div>
                <div className="border-t border-primary/10 pt-3 text-xs text-secondary sm:text-right">
                  Rango estimado (±{Math.round(metrics.marginPercent * 100)}% sobre total):{" "}
                  <span className="font-semibold text-[#8B1C1C]">{scenarioRangeLabel}</span>
                </div>
              </div>
            </div>
          </div>
        </SectionCard>
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
