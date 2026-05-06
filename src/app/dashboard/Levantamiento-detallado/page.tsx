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
import { Check, CheckCircle2, ChevronLeft, ChevronRight, Search } from "lucide-react";
import {
  activeCitaTaskStorageKey,
  kanbanStorageKey,
  citaReturnUrlStorageKey,
  getPreliminarList,
  saveKanbanTasksToLocalStorage,
  seguimientoProjectStoragePrefix,
  type KanbanTask,
  type PreliminarData,
} from "@/lib/kanban";
import { CatalogProjectTypeField } from "@/components/CatalogProjectTypeField";
import {
  CATALOG_PROJECT_TYPES,
  isCocinasProjectTypeForConIsla,
  normalizeLegacyProjectTypeToCatalog,
} from "@/lib/catalog-project-types";
import {
  APPLIANCE_ITEMS,
  cotizacionAccesoriosEspecialesTotal,
  defaultLevantamientoDetalle,
  emptyWallMeasuresForId,
  getWallMeasureFieldDefs,
  cotizacionIluminacionTotal,
  isWallSlotKey,
  LIGHTING_ITEMS,
  wallMeasuresTieneValor,
  WALL_SLOT_META_TYPE,
  WALL_SLOT_META_ALIAS,
  wallMeasureLetter,
  wallSlotKey,
  type MedidasCampos,
  WALL_ITEMS,
  type ItemCatalogo,
  type LevantamientoDetalle,
} from "@/lib/levantamiento-catalog";
import {
  buildPreliminarPdfDataUrl,
  downloadPreliminarPdf,
} from "@/lib/pdf-preliminar";
import { createPreliminarSeguimientoPdfKey, saveFormalPdf } from "@/lib/formal-pdf-storage";
import { agregarArchivos } from "@/lib/axios/tareasApi";
import { subirPdfGeneradoConMetadata } from "@/lib/axios/uploadsApi";
import {
  buildFormalUploadMetadata,
  getRequiredClientIdForFormalUpload,
} from "@/lib/upload-formal-metadata";
import { formatDeliveryWeeksLabel } from "@/lib/delivery-weeks";
import ApplianceTypeImage from "@/components/levantamiento/ApplianceTypeImage";
import LightingTypeImage from "@/components/levantamiento/LightingTypeImage";
import { WallTypeIcon } from "@/components/levantamiento/WallTypeIcons";
import { InteractiveCroquis } from "@/components/levantamiento/InteractiveCroquis";
import Link from "next/link";
import { generatePublicProjectCode } from "@/lib/project-code";
import { runtimeStore } from "@/lib/runtime-store";
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
import {
  obtenerHerrajes,
  obtenerMateriales,
  type Herraje,
  type Material,
} from "@/lib/axios/catalogosApi";
import {
  obtenerElectrodomesticos,
  obtenerExtras,
  type Electrodomestico,
  type Extra,
} from "@/lib/axios/equipamientoApi";
import { useAdminWorkflow } from "@/contexts/AdminWorkflowContext";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);

const parseMeasure = (raw: string | undefined): number | null => {
  if (!raw) return null;
  const v = Number.parseFloat(raw.replace(",", "."));
  return Number.isFinite(v) ? v : null;
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

const WALL_COUNT_OPTIONS = [1, 2, 3, 4] as const;
const WALL_COUNT_EXTRA_OPTIONS = [5, 6, 7, 8] as const;

const wallCountSvgProps = {
  viewBox: "0 0 24 24",
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 2.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/** Pictogramas estilo planta arquitectónica 2D (vista superior): trazos ortogonales que sugieren el perímetro o la secuencia de muros según la cantidad seleccionada. */
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

type MaterialOption = {
  id: string;
  name: string;
  tier: "Estandar" | "Tendencia" | "Premium";
  image: string;
  pricePerUnit?: number;
};

type ShowroomCatalog = {
  cubiertas: MaterialOption[];
  frentes: MaterialOption[];
  herrajes: MaterialOption[];
};

type MaterialCategory = "cubiertas" | "frentes" | "herrajes";
type MaterialTierFilter = "Todos" | MaterialOption["tier"];

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

const defaultCategoryImage: Record<MaterialCategory, string> = {
  cubiertas: "/images/materiales/stone_texture.jpg",
  frentes: "/images/materiales/dark_wood_background.jpg",
  herrajes: "/images/materiales/cabinet_hinge.jpg",
};

const resolveMaterialImage = (name: string, category: MaterialCategory, fallback?: string) => {
  const match = materialImageMap[category].find((entry) => entry.match.test(name));
  if (match) return match.src;
  /** Ignorar URLs externas (p. ej. pollinations): suelen fallar y el <img> cae en el placeholder. */
  if (fallback?.startsWith("/")) return fallback;
  return defaultCategoryImage[category];
};

const normalizeEquipName = (value: unknown, fallback: string) => {
  if (typeof value === "string" && value.trim()) return value.trim();
  return fallback;
};

const normalizeEquipPrice = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

const isEspesorField = (field: { key: string; label: string }) => {
  const joined = `${field.key} ${field.label}`.toLowerCase();
  return joined.includes("espesor");
};

const mapElectroToCatalogItem = (item: Electrodomestico, index: number): ItemCatalogo => ({
  id: `electro-${item._id}`,
  label: normalizeEquipName(item.nombre, `Electrodoméstico ${index + 1}`),
  categoria: normalizeEquipName(item.categoria, "Electrodomésticos"),
  hint: typeof item.descripcion === "string" ? item.descripcion.trim() : undefined,
  image: (item.thumbnailUrl || item.imagenUrl || "/images/hero-placeholder.svg").trim(),
});

const mapExtraToCatalogItem = (item: Extra, index: number): ItemCatalogo => ({
  id: `extra-${item._id}`,
  label: normalizeEquipName(item.nombre, `Extra ${index + 1}`),
  categoria: normalizeEquipName(item.categoria, "Extras"),
  hint: typeof item.descripcion === "string" ? item.descripcion.trim() : undefined,
  image: (item.thumbnailUrl || item.imagenUrl || "/images/hero-placeholder.svg").trim(),
});

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
const streamPosterClass = (selected: boolean) =>
  `relative z-10 aspect-[2/3] w-[min(10.5rem,52vw)] shrink-0 overflow-hidden rounded-lg bg-zinc-900 shadow-xl transition sm:w-[min(12.5rem,38vw)] lg:w-[min(13.5rem,32vw)] ${
    selected ? "ring-2 ring-white ring-offset-2 ring-offset-zinc-950" : "ring-1 ring-white/10 hover:ring-white/55"
  }`;
const streamPosterTitleOverlay =
  "pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent px-2 pb-2.5 pt-14";
const streamPosterLabelClass =
  "line-clamp-2 text-xs font-medium leading-snug text-white/95 sm:text-sm";
/** Miniaturas de carrusel: `cover` sin `object-center` aquí  -  el centro choca con `object-[...]` en iluminación. */
const streamCatalogThumbBase = "absolute inset-0 z-0 h-full w-full object-cover";
const streamCatalogThumbImageClass = `${streamCatalogThumbBase} object-center`;
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
  const pageSize = 4;
  const normalizedSearch = materialSearch.trim().toLowerCase();
  const filtered = options.filter((option) => {
    const matchesSearch = !normalizedSearch || option.name.toLowerCase().includes(normalizedSearch);
    const matchesTier = tierFilter === "Todos" || option.tier === tierFilter;
    return matchesSearch && matchesTier;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const paginated = filtered.slice(start, start + pageSize);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-secondary">{title}</p>
        {isMulti ? (
          <p className="mt-1 text-[11px] font-medium text-secondary/85">Puedes elegir más de uno.</p>
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
        {paginated.map((option) => {
          const isActive = isMulti ? rest.selectedIds.includes(option.id) : option.id === rest.selectedId;
          const imageSrc = resolveMaterialImage(option.name, category, option.image);
          const pricePerM = option.pricePerUnit ?? tierPriceByTier[option.tier];
          const optionPrice = Math.max(0, largoLineal * pricePerM);
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => (isMulti ? rest.onToggle(option.id) : rest.onSelect(option.id))}
              className={`group w-full rounded-2xl border border-primary/10 bg-white p-3 text-left shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl ${
                isActive ? "ring-2 ring-[#8B1C1C] ring-offset-2 ring-offset-white" : ""
              }`}
            >
              <div className="relative overflow-hidden rounded-2xl">
                <div className="relative aspect-square w-full overflow-hidden bg-primary/[0.04]">
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
                </div>
                <div className="pointer-events-none absolute left-3 top-3 z-[1] max-w-[calc(100%-1.5rem)] truncate rounded-full bg-white/70 px-3 py-1 text-[11px] font-semibold text-primary shadow-md backdrop-blur">
                  {option.name}
                </div>
                {isActive ? (
                  <span className="absolute right-3 top-3 z-[1] rounded-full bg-[#8B1C1C] p-1 text-white shadow-md">
                    <Check className="h-3 w-3" />
                  </span>
                ) : null}
              </div>
              <p className="mt-3 text-xs font-medium text-secondary">{option.name}</p>
              <span className="mt-2 inline-flex w-fit rounded-full bg-primary/5 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-secondary">
                {option.tier}
              </span>
              <p className="mt-2 text-xs font-semibold text-[#8B1C1C]">
                Estimado con tus medidas {formatCurrency(optionPrice)}
              </p>
            </button>
          );
        })}
      </div>
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-primary/10 bg-white px-4 py-3 text-xs text-secondary">
          No encontramos materiales con ese criterio.
        </div>
      ) : null}
      {totalPages > 1 ? (
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-secondary">
          {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
            <button
              key={`${title}-${pageNumber}`}
              type="button"
              onClick={() => onPageChange(pageNumber)}
              className={`h-8 w-8 rounded-full transition ${
                safePage === pageNumber
                  ? "bg-[#8B1C1C] text-white"
                  : "border border-primary/10 bg-white hover:border-primary/30"
              }`}
            >
              {pageNumber}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
};

const DEFAULT_MATERIAL_CATALOG = {
  cubiertas: [
    {
      id: "cuarzo-calacatta",
      name: "Cuarzo Calacatta",
      tier: "Premium",
      image:
        "https://image.pollinations.ai/prompt/white%20calacatta%20quartz%20texture?width=500&height=500&nologo=true",
    },
    {
      id: "granito-negro",
      name: "Granito Negro",
      tier: "Tendencia",
      image:
        "https://image.pollinations.ai/prompt/black%20granite%20texture?width=500&height=500&nologo=true",
    },
    {
      id: "laminado-blanco",
      name: "Laminado Blanco",
      tier: "Estandar",
      image:
        "https://image.pollinations.ai/prompt/white%20laminate%20texture?width=500&height=500&nologo=true",
    },
    {
      id: "cuarzo-marfil",
      name: "Cuarzo Marfil",
      tier: "Tendencia",
      image:
        "https://image.pollinations.ai/prompt/ivory%20quartz%20texture?width=500&height=500&nologo=true",
    },
    {
      id: "granito-ivory",
      name: "Granito Ivory",
      tier: "Estandar",
      image:
        "https://image.pollinations.ai/prompt/ivory%20granite%20texture?width=500&height=500&nologo=true",
    },
    {
      id: "sinterizada-nieve",
      name: "Piedra Sinterizada Nieve",
      tier: "Premium",
      image:
        "https://image.pollinations.ai/prompt/pure%20white%20sintered%20stone%20texture?width=500&height=500&nologo=true",
    },
    {
      id: "cuarzo-marbella",
      name: "Cuarzo Marbella",
      tier: "Tendencia",
      image:
        "https://image.pollinations.ai/prompt/beige%20marbella%20quartz%20texture?width=500&height=500&nologo=true",
    },
    {
      id: "cuarzo-gris-humo",
      name: "Cuarzo Gris Humo",
      tier: "Estandar",
      image:
        "https://image.pollinations.ai/prompt/smoky%20grey%20quartz%20texture?width=500&height=500&nologo=true",
    },
    {
      id: "granito-verde",
      name: "Granito Verde Selva",
      tier: "Tendencia",
      image:
        "https://image.pollinations.ai/prompt/jungle%20green%20granite%20texture?width=500&height=500&nologo=true",
    },
    {
      id: "granito-azul",
      name: "Granito Azul Profundo",
      tier: "Premium",
      image:
        "https://image.pollinations.ai/prompt/deep%20blue%20granite%20texture?width=500&height=500&nologo=true",
    },
    {
      id: "cuarzo-onix",
      name: "Cuarzo ?nix",
      tier: "Premium",
      image:
        "https://image.pollinations.ai/prompt/onyx%20quartz%20texture?width=500&height=500&nologo=true",
    },
    {
      id: "sinterizada-grafito",
      name: "Sinterizada Grafito",
      tier: "Tendencia",
      image:
        "https://image.pollinations.ai/prompt/graphite%20sintered%20stone%20texture?width=500&height=500&nologo=true",
    },
    {
      id: "porcelanato-marfil",
      name: "Porcelanato Marfil",
      tier: "Estandar",
      image:
        "https://image.pollinations.ai/prompt/ivory%20porcelain%20texture?width=500&height=500&nologo=true",
    },
    {
      id: "granito-cobre",
      name: "Granito Cobre",
      tier: "Tendencia",
      image:
        "https://image.pollinations.ai/prompt/copper%20granite%20texture?width=500&height=500&nologo=true",
    },
    {
      id: "cuarzo-nieve",
      name: "Cuarzo Nieve",
      tier: "Estandar",
      image:
        "https://image.pollinations.ai/prompt/snow%20white%20quartz%20texture?width=500&height=500&nologo=true",
    },
    {
      id: "sinterizada-arena",
      name: "Sinterizada Arena",
      tier: "Tendencia",
      image:
        "https://image.pollinations.ai/prompt/sand%20sintered%20stone%20texture?width=500&height=500&nologo=true",
    },
    {
      id: "granito-perla",
      name: "Granito Perla",
      tier: "Estandar",
      image:
        "https://image.pollinations.ai/prompt/pearl%20granite%20texture?width=500&height=500&nologo=true",
    },
    {
      id: "cuarzo-negro-zen",
      name: "Cuarzo Negro Zen",
      tier: "Premium",
      image:
        "https://image.pollinations.ai/prompt/zen%20black%20quartz%20texture?width=500&height=500&nologo=true",
    },
  ] satisfies MaterialOption[],
  frentes: [
    {
      id: "melamina-premium",
      name: "Melamina Premium",
      tier: "Estandar",
      image:
        "https://image.pollinations.ai/prompt/premium%20wood%20melamine%20texture?width=500&height=500&nologo=true",
    },
    {
      id: "mdf-laca",
      name: "MDF Laca Mate",
      tier: "Tendencia",
      image:
        "https://image.pollinations.ai/prompt/matte%20lacquer%20mdf%20texture?width=500&height=500&nologo=true",
    },
    {
      id: "chapa-natural",
      name: "Chapa Natural",
      tier: "Premium",
      image:
        "https://image.pollinations.ai/prompt/natural%20wood%20veneer%20texture?width=500&height=500&nologo=true",
    },
    {
      id: "melamina-texturizada",
      name: "Melamina Texturizada",
      tier: "Estandar",
      image:
        "https://image.pollinations.ai/prompt/textured%20grey%20melamine%20surface?width=500&height=500&nologo=true",
    },
    {
      id: "laca-brillo",
      name: "Laca Alto Brillo",
      tier: "Tendencia",
      image:
        "https://image.pollinations.ai/prompt/high%20gloss%20lacquer%20cabinet%20texture?width=500&height=500&nologo=true",
    },
    {
      id: "madera-nogal",
      name: "Madera Nogal",
      tier: "Premium",
      image:
        "https://image.pollinations.ai/prompt/walnut%20wood%20texture?width=500&height=500&nologo=true",
    },
    {
      id: "melamina-blanca",
      name: "Melamina Blanca",
      tier: "Estandar",
      image:
        "https://image.pollinations.ai/prompt/white%20melamine%20board%20texture?width=500&height=500&nologo=true",
    },
    {
      id: "melamina-ceniza",
      name: "Melamina Ceniza",
      tier: "Estandar",
      image:
        "https://image.pollinations.ai/prompt/ash%20wood%20melamine%20texture?width=500&height=500&nologo=true",
    },
    {
      id: "melamina-grafito",
      name: "Melamina Grafito",
      tier: "Tendencia",
      image:
        "https://image.pollinations.ai/prompt/graphite%20grey%20melamine%20texture?width=500&height=500&nologo=true",
    },
    {
      id: "melamina-olmo",
      name: "Melamina Olmo",
      tier: "Tendencia",
      image:
        "https://image.pollinations.ai/prompt/elm%20wood%20melamine%20texture?width=500&height=500&nologo=true",
    },
    {
      id: "laca-satinada",
      name: "Laca Satinada",
      tier: "Tendencia",
      image:
        "https://image.pollinations.ai/prompt/satin%20lacquer%20cabinet%20surface?width=500&height=500&nologo=true",
    },
    {
      id: "laca-metalica",
      name: "Laca Met?lica",
      tier: "Premium",
      image:
        "https://image.pollinations.ai/prompt/metallic%20lacquer%20surface%20texture?width=500&height=500&nologo=true",
    },
    {
      id: "chapa-encino",
      name: "Chapa Encino",
      tier: "Tendencia",
      image:
        "https://image.pollinations.ai/prompt/oak%20wood%20veneer%20texture?width=500&height=500&nologo=true",
    },
    {
      id: "chapa-cedro",
      name: "Chapa Cedro",
      tier: "Premium",
      image:
        "https://image.pollinations.ai/prompt/cedar%20wood%20veneer%20texture?width=500&height=500&nologo=true",
    },
    {
      id: "madera-parota",
      name: "Madera Parota",
      tier: "Premium",
      image:
        "https://image.pollinations.ai/prompt/parota%20wood%20texture?width=500&height=500&nologo=true",
    },
    {
      id: "mdf-textura",
      name: "MDF Texturizado",
      tier: "Estandar",
      image:
        "https://image.pollinations.ai/prompt/beige%20textured%20mdf%20surface?width=500&height=500&nologo=true",
    },
    {
      id: "mdf-grafito",
      name: "MDF Grafito",
      tier: "Tendencia",
      image:
        "https://image.pollinations.ai/prompt/dark%20graphite%20mdf%20texture?width=500&height=500&nologo=true",
    },
    {
      id: "melamina-menta",
      name: "Melamina Menta",
      tier: "Estandar",
      image:
        "https://image.pollinations.ai/prompt/mint%20green%20melamine%20texture?width=500&height=500&nologo=true",
    },
  ] satisfies MaterialOption[],
  herrajes: [
    {
      id: "soft-close",
      name: "Soft Close",
      tier: "Estandar",
      image:
        "https://image.pollinations.ai/prompt/soft%20close%20cabinet%20hinge%20hardware?width=500&height=500&nologo=true",
    },
    {
      id: "blum-aventoz",
      name: "Blum Aventos",
      tier: "Tendencia",
      image:
        "https://image.pollinations.ai/prompt/blum%20aventos%20lift%20system%20hardware?width=500&height=500&nologo=true",
    },
    {
      id: "premium-tech",
      name: "Premium Tech",
      tier: "Premium",
      image:
        "https://image.pollinations.ai/prompt/modern%20premium%20cabinet%20drawer%20slide%20hardware?width=500&height=500&nologo=true",
    },
    {
      id: "push-to-open",
      name: "Push to Open",
      tier: "Tendencia",
      image:
        "https://image.pollinations.ai/prompt/push%20to%20open%20cabinet%20mechanism?width=500&height=500&nologo=true",
    },
    {
      id: "herrajes-inox",
      name: "Herrajes Inox",
      tier: "Premium",
      image:
        "https://image.pollinations.ai/prompt/stainless%20steel%20cabinet%20hardware%20hinge?width=500&height=500&nologo=true",
    },
    {
      id: "soft-basic",
      name: "Soft Basic",
      tier: "Estandar",
      image:
        "https://image.pollinations.ai/prompt/basic%20metal%20cabinet%20hinge?width=500&height=500&nologo=true",
    },
    {
      id: "soft-plus",
      name: "Soft Plus",
      tier: "Tendencia",
      image:
        "https://image.pollinations.ai/prompt/high%20quality%20metal%20cabinet%20hinge?width=500&height=500&nologo=true",
    },
    {
      id: "soft-pro",
      name: "Soft Pro",
      tier: "Premium",
      image:
        "https://image.pollinations.ai/prompt/professional%20cabinet%20hinge%20mechanism?width=500&height=500&nologo=true",
    },
    {
      id: "inox-premium",
      name: "Inox Premium",
      tier: "Tendencia",
      image:
        "https://image.pollinations.ai/prompt/brushed%20stainless%20steel%20cabinet%20hinge?width=500&height=500&nologo=true",
    },
    {
      id: "grafito-matte",
      name: "Grafito Matte",
      tier: "Estandar",
      image:
        "https://image.pollinations.ai/prompt/matte%20graphite%20black%20cabinet%20hinge?width=500&height=500&nologo=true",
    },
    {
      id: "cierre-suave",
      name: "Cierre Suave",
      tier: "Estandar",
      image:
        "https://image.pollinations.ai/prompt/soft%20close%20drawer%20slide%20metal?width=500&height=500&nologo=true",
    },
    {
      id: "push-premium",
      name: "Push Premium",
      tier: "Tendencia",
      image:
        "https://image.pollinations.ai/prompt/premium%20push%20to%20open%20drawer%20hardware?width=500&height=500&nologo=true",
    },
    {
      id: "push-lujo",
      name: "Push Lujo",
      tier: "Premium",
      image:
        "https://image.pollinations.ai/prompt/luxury%20push%20open%20cabinet%20hardware?width=500&height=500&nologo=true",
    },
    {
      id: "amortiguado",
      name: "Amortiguado",
      tier: "Estandar",
      image:
        "https://image.pollinations.ai/prompt/cabinet%20hinge%20with%20damper%20mechanism?width=500&height=500&nologo=true",
    },
    {
      id: "hidraulico",
      name: "Hidr?ulico",
      tier: "Tendencia",
      image:
        "https://image.pollinations.ai/prompt/hydraulic%20cabinet%20hinge%20piston?width=500&height=500&nologo=true",
    },
    {
      id: "lux-autom",
      name: "Lux Autom?tico",
      tier: "Premium",
      image:
        "https://image.pollinations.ai/prompt/motorized%20automatic%20cabinet%20drawer%20hardware?width=500&height=500&nologo=true",
    },
    {
      id: "smart-close",
      name: "Smart Close",
      tier: "Tendencia",
      image:
        "https://image.pollinations.ai/prompt/smart%20close%20cabinet%20hardware%20system?width=500&height=500&nologo=true",
    },
    {
      id: "soft-basic-plus",
      name: "Soft Basic Plus",
      tier: "Estandar",
      image:
        "https://image.pollinations.ai/prompt/standard%20cabinet%20drawer%20slide%20metal?width=500&height=500&nologo=true",
    },
  ] satisfies MaterialOption[],
} satisfies ShowroomCatalog;

const extractCatalogList = <T,>(input: unknown, keys: string[]): T[] => {
  if (Array.isArray(input)) return input as T[];
  if (input && typeof input === "object") {
    const record = input as Record<string, unknown>;
    for (const key of keys) {
      const value = record[key];
      if (Array.isArray(value)) return value as T[];
    }
  }
  return [];
};

const normalizeShowroomTier = (value: unknown): MaterialOption["tier"] => {
  const normalized = String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
  if (normalized.includes("premium")) return "Premium";
  if (normalized.includes("estandar") || normalized.includes("standard") || normalized.includes("basic")) {
    return "Estandar";
  }
  return "Tendencia";
};

const normalizeMaterialSeccion = (value: unknown) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

const normalizeMaterialPrecio = (raw: Record<string, unknown>) => {
  const candidates = [raw.precioUnitario, raw.precioPorMetro, raw.precioMetroLineal, raw.precio];
  for (const candidate of candidates) {
    if (typeof candidate === "number" && Number.isFinite(candidate)) return candidate;
    if (typeof candidate === "string") {
      const parsed = Number.parseFloat(candidate.replace(/,/g, "").trim());
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return undefined;
};

const toMaterialOption = (raw: Record<string, unknown>, fallbackIdPrefix: string): MaterialOption => {
  const idFromApi =
    (typeof raw.idCotizador === "string" && raw.idCotizador.trim()) ||
    (typeof raw._id === "string" && raw._id.trim()) ||
    (typeof raw.id === "string" && raw.id.trim()) ||
    "";
  const name = typeof raw.nombre === "string" && raw.nombre.trim() ? raw.nombre.trim() : "Sin nombre";
  return {
    id: idFromApi || `${fallbackIdPrefix}-${name.toLowerCase().replace(/[^a-z0-9]+/gi, "-")}`,
    name,
    tier: normalizeShowroomTier(raw.gama ?? raw.tier),
    image: typeof raw.image === "string" ? raw.image : "",
    pricePerUnit: normalizeMaterialPrecio(raw),
  };
};

type ShowroomMaterialTier = MaterialOption["tier"];
type AutoScenarioId = "esencial" | "tendencia" | "premium";

/** Material -> escenario de inversión ($/m). */
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

/** Moda de gamas; empates o tres distintos -> Tendencia (regla de negocio). */
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
  catalog: ShowroomCatalog,
  cubiertaId: string,
  frenteIds: string[],
  herrajeId: string,
): AutoScenarioId {
  const tierC =
    catalog.cubiertas.find((item) => item.id === cubiertaId)?.tier ?? "Estandar";
  const tiersF =
    frenteIds.length === 0
      ? ([] as ShowroomMaterialTier[])
      : frenteIds.map(
          (id) => catalog.frentes.find((item) => item.id === id)?.tier ?? "Estandar",
        );
  const tierF = tiersF.length === 0 ? "Estandar" : predominantShowroomTier(tiersF);
  const tierH = catalog.herrajes.find((item) => item.id === herrajeId)?.tier ?? "Estandar";
  const winner = predominantShowroomTier([tierC, tierF, tierH]);
  return tierToScenario(winner);
}

export default function CotizadorPreliminarPage() {
  const router = useRouter();
  const { tasks, refresh, updateTask } = useAdminWorkflow();
  const [activeCitaTaskId, setActiveCitaTaskId] = useState<string | null>(null);
  const [activeCitaTask, setActiveCitaTask] = useState<KanbanTask | null>(null);
  const [clientName, setClientName] = useState("");
  const [projectType, setProjectType] = useState<string>(CATALOG_PROJECT_TYPES[0]);
  const [location, setLocation] = useState("");
  const [deliveryWeeksMin, setDeliveryWeeksMin] = useState("");
  const [deliveryWeeksMax, setDeliveryWeeksMax] = useState("");
  const [largo, setLargo] = useState("");
  const [alto, setAlto] = useState("");
  const [materialCatalog, setMaterialCatalog] = useState<ShowroomCatalog>(DEFAULT_MATERIAL_CATALOG);
  const [materialCatalogError, setMaterialCatalogError] = useState<string | null>(null);
  /** Sección D · showroom: materiales y escenario de inversión (derivado + ajuste manual opcional). */
  const [selectedCubierta, setSelectedCubierta] = useState(DEFAULT_MATERIAL_CATALOG.cubiertas[0].id);
  const [selectedFrenteIds, setSelectedFrenteIds] = useState<string[]>(() => [DEFAULT_MATERIAL_CATALOG.frentes[0].id]);
  const [selectedHerraje, setSelectedHerraje] = useState(DEFAULT_MATERIAL_CATALOG.herrajes[0].id);
  const [levantamientoConfig, setLevantamientoConfig] = useState<LevantamientoConfig>(() =>
    createDefaultLevantamientoConfig(),
  );
  const [selectedScenario, setSelectedScenario] = useState<AutoScenarioId>(() =>
    autoScenarioFromShowroom(
      DEFAULT_MATERIAL_CATALOG,
      DEFAULT_MATERIAL_CATALOG.cubiertas[0].id,
      [DEFAULT_MATERIAL_CATALOG.frentes[0].id],
      DEFAULT_MATERIAL_CATALOG.herrajes[0].id,
    ),
  );
  const [materialSearch, setMaterialSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<"Todos" | "Estandar" | "Tendencia" | "Premium">(
    "Todos",
  );
  const [pages, setPages] = useState({ cubiertas: 1, frentes: 1, herrajes: 1 });
  const [finishError, setFinishError] = useState<string | null>(null);
  const [isFinishing, setIsFinishing] = useState(false);
  const [levantamiento, setLevantamiento] = useState<LevantamientoDetalle>(() => defaultLevantamientoDetalle());
  /** Índice 0-based de la pared actual en el flujo dinámico (Sección B). */
  const [currentWallIndex, setCurrentWallIndex] = useState(0);
  /** Búsqueda en el catálogo de tipos de muro (Sección B). */
  const [wallSearch, setWallSearch] = useState("");
  /** Diálogo in-app al cambiar cantidad de paredes (sustituye `window.confirm`). */
  const [confirmChangeWallCountOpen, setConfirmChangeWallCountOpen] = useState(false);
  /** Un paso por electrodoméstico (orden por categoría); el último índice es "Otro". */
  const [applianceStep, setApplianceStep] = useState(0);
  const [showMoreWallCounts, setShowMoreWallCounts] = useState(false);
  const [equipamientoCatalogError, setEquipamientoCatalogError] = useState<string | null>(null);
  const [applianceCatalogItems, setApplianceCatalogItems] = useState<ItemCatalogo[]>(APPLIANCE_ITEMS);
  const [equipamientoPriceById, setEquipamientoPriceById] = useState<Record<string, number>>({});
  const [applianceSearch, setApplianceSearch] = useState("");
  /** true = carruseles; false = detalle en la misma página (sin modal). */
  const [applianceBrowseMode, setApplianceBrowseMode] = useState(true);
  const [lightingSearch, setLightingSearch] = useState("");
  const [lightingShowOtro, setLightingShowOtro] = useState(false);
  const [lightingBrowseMode, setLightingBrowseMode] = useState(true);
  /** id del luminario en vista detalle (cuando lightingBrowseMode es false). */
  const [lightingFocusedId, setLightingFocusedId] = useState<string | null>(null);
  const applianceRowRefs = useRef<Record<string, HTMLDivElement | null>>({});
  /** Al pasar de carrusel -> detalle el documento se acorta y el scroll absoluto deja la vista en la sección siguiente; se reencuadra la sección C. */
  const applianceSectionRef = useRef<HTMLDivElement | null>(null);
  const lightingSectionRef = useRef<HTMLDivElement | null>(null);

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
      return { ...prev, wallSlotCount: n, wallMeasures: wm };
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
      return { ...prev, wallSlotCount: 0, wallMeasures: wm };
    });
    setCurrentWallIndex(0);
  };

  useEffect(() => {
    setLevantamientoConfig(getLevantamientoConfig());
    const onUpdate = () => setLevantamientoConfig(getLevantamientoConfig());
    window.addEventListener("kuche:levantamiento-config-updated", onUpdate);
    return () => window.removeEventListener("kuche:levantamiento-config-updated", onUpdate);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadEquipamientoCatalog = async () => {
      try {
        const [electroRes, extrasRes] = await Promise.all([
          obtenerElectrodomesticos({ disponible: true }),
          obtenerExtras({ disponible: true }),
        ]);

        const electroData = electroRes.success && Array.isArray(electroRes.data) ? electroRes.data : [];
        const extrasData = extrasRes.success && Array.isArray(extrasRes.data) ? extrasRes.data : [];

        // Mapear electrodomésticos y extras por separado para mantener categorización
        const electroItems = electroData.map(mapElectroToCatalogItem);
        const extraItems = extrasData.map(mapExtraToCatalogItem);
        
        // Combinar manteniendo orden: electrodomésticos primero, luego extras
        const fromApi = [...electroItems, ...extraItems];
        
        // Construir mapa de precios
        const priceMap: Record<string, number> = {};
        for (const row of electroData) {
          priceMap[`electro-${row._id}`] = normalizeEquipPrice(row.precio);
        }
        for (const row of extrasData) {
          priceMap[`extra-${row._id}`] = normalizeEquipPrice(row.precio);
        }

        if (cancelled) return;

        // Mostrar lo del backend incluso si hay datos parciales (solo electro, solo extras, o ambos)
        if (electroData.length > 0 || extrasData.length > 0) {
          setApplianceCatalogItems(fromApi);
          setEquipamientoPriceById(priceMap);
          setEquipamientoCatalogError(null);
          return;
        }

        // Solo usar fallback si AMBOS están vacíos
        setApplianceCatalogItems(APPLIANCE_ITEMS);
        setEquipamientoPriceById({});
        setEquipamientoCatalogError(
          "No hay electrodomésticos ni extras en el catálogo del backend. Se muestra catálogo base.",
        );
      } catch (error) {
        if (cancelled) return;
        setApplianceCatalogItems(APPLIANCE_ITEMS);
        setEquipamientoPriceById({});
        setEquipamientoCatalogError(
          error instanceof Error
            ? error.message
            : "Error al cargar equipamiento. Se muestra catálogo base.",
        );
      }
    };

    void loadEquipamientoCatalog();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let isCancelled = false;

    const loadDynamicShowroomCatalog = async () => {
      try {
        const [cubiertasResponse, frentesResponse, herrajesResponse] = await Promise.all([
          obtenerMateriales({ seccion: "cubierta", disponible: true }),
          obtenerMateriales({ secciones: ["vistas", "estructura", "cajones_puertas"], disponible: true }),
          obtenerHerrajes({ disponible: true }),
        ]);

        const cubiertasRaw =
          cubiertasResponse.success && cubiertasResponse.data
            ? extractCatalogList<Material>(cubiertasResponse.data, ["materiales", "items", "data", "results"])
            : [];
        const frentesRaw =
          frentesResponse.success && frentesResponse.data
            ? extractCatalogList<Material>(frentesResponse.data, ["materiales", "items", "data", "results"])
            : [];
        const herrajesRaw =
          herrajesResponse.success && herrajesResponse.data
            ? extractCatalogList<Herraje>(herrajesResponse.data, ["herrajes", "items", "data", "results"])
            : [];

        const cubiertas = cubiertasRaw
          .map((m) => m as unknown as Record<string, unknown>)
          // fallback defensivo si backend ignora filtro
          .filter((m) => normalizeMaterialSeccion(m.seccion) === "cubierta")
          .map((m) => toMaterialOption(m, "cubierta"));

        const frentes = frentesRaw
          .map((m) => m as unknown as Record<string, unknown>)
          // fallback defensivo si backend ignora filtro
          .filter((m) => {
            const sec = normalizeMaterialSeccion(m.seccion);
            return sec === "vistas" || sec === "estructura" || sec === "cajones_puertas";
          })
          .map((m) => toMaterialOption(m, "frente"));

        const herrajes = herrajesRaw
          .map((h) => h as unknown as Record<string, unknown>)
          .map((h) => toMaterialOption(h, "herraje"));

        if (isCancelled) return;

        const nextCatalog: ShowroomCatalog = {
          cubiertas: cubiertas.length > 0 ? cubiertas : DEFAULT_MATERIAL_CATALOG.cubiertas,
          frentes: frentes.length > 0 ? frentes : DEFAULT_MATERIAL_CATALOG.frentes,
          herrajes: herrajes.length > 0 ? herrajes : DEFAULT_MATERIAL_CATALOG.herrajes,
        };

        setMaterialCatalog(nextCatalog);

        const hasAnyApiData = cubiertas.length > 0 || frentes.length > 0 || herrajes.length > 0;
        if (!hasAnyApiData) {
          setMaterialCatalogError("No se pudo cargar catálogo dinámico. Se muestran opciones base de respaldo.");
        } else {
          setMaterialCatalogError(null);
        }
      } catch {
        if (isCancelled) return;
        setMaterialCatalog(DEFAULT_MATERIAL_CATALOG);
        setMaterialCatalogError("No se pudo cargar catálogo dinámico. Se muestran opciones base de respaldo.");
      }
    };

    void loadDynamicShowroomCatalog();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    const cubiertaValida = materialCatalog.cubiertas.some((item) => item.id === selectedCubierta);
    if (!cubiertaValida && materialCatalog.cubiertas.length > 0) {
      setSelectedCubierta(materialCatalog.cubiertas[0].id);
    }

    const herrajeValido = materialCatalog.herrajes.some((item) => item.id === selectedHerraje);
    if (!herrajeValido && materialCatalog.herrajes.length > 0) {
      setSelectedHerraje(materialCatalog.herrajes[0].id);
    }

    const frentesValidos = selectedFrenteIds.filter((id) => materialCatalog.frentes.some((item) => item.id === id));
    if (frentesValidos.length === 0 && materialCatalog.frentes.length > 0) {
      setSelectedFrenteIds([materialCatalog.frentes[0].id]);
    } else if (frentesValidos.length !== selectedFrenteIds.length) {
      setSelectedFrenteIds(frentesValidos);
    }
  }, [materialCatalog, selectedCubierta, selectedFrenteIds, selectedHerraje]);

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

  const openApplianceDetailByIndex = useCallback((idx: number) => {
    const item = applianceCatalogItems[idx];
    if (!item) return;
    setApplianceStep(idx);
    setApplianceBrowseMode(false);
    setLevantamiento((prev) => ({
      ...prev,
      applianceDocumentIds: prev.applianceDocumentIds.includes(item.id)
        ? prev.applianceDocumentIds
        : [...prev.applianceDocumentIds, item.id],
    }));
  }, [applianceCatalogItems]);

  const openApplianceOtroDetail = useCallback(() => {
    setApplianceStep(applianceCatalogItems.length);
    setApplianceBrowseMode(false);
    setLevantamiento((prev) => ({ ...prev, applianceOtroInDocument: true }));
  }, [applianceCatalogItems.length]);

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
    void refresh();
  }, [refresh]);

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

  useEffect(() => {
    if (!activeCitaTaskId) return;
    const task = tasks.find((t) => t.id === activeCitaTaskId);
    if (!task) return;

    setActiveCitaTask(task);
    setClientName((prev) => prev.trim() || task.project || task.cita?.nombreCliente || "");
    setLocation((prev) => prev.trim() || task.location || task.cita?.ubicacion || "");

    const lastPre = getPreliminarList(task).at(-1);
    if (lastPre?.projectType?.trim()) {
      setProjectType(normalizeLegacyProjectTypeToCatalog(lastPre.projectType));
    }
  }, [activeCitaTaskId, tasks]);

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
      costoEquipamiento: metrics.costoEquipamiento,
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
    preliminarData?: PreliminarData;
    seguimientoPdf?: { key: string; fileLabel: string; remoteUrl?: string };
  }): { codigoProyecto: string | undefined; updatedTasks: KanbanTask[] } | null => {
    if (!activeCitaTaskId || !activeCitaTask) return null;
    const err = validatePreliminarSections();
    if (err) {
      setFinishError(err);
      return null;
    }
    const newPreliminar = options?.preliminarData ?? buildPreliminarDataFromForm();
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
      saveKanbanTasksToLocalStorage(updatedTasks);
    } catch {
      // Si por alguna razón no podemos escribir en localStorage (cuota, modo incógnito, etc.),
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
            ...(options.seguimientoPdf.remoteUrl ? { url: options.seguimientoPdf.remoteUrl } : {}),
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

  const uploadLevantamientoArtifact = async (
    relatedTaskId: string,
    clientId: string,
    filename: string,
    dataUrl: string,
  ) => {
    const upload = await subirPdfGeneradoConMetadata(
      dataUrl,
      filename,
      buildFormalUploadMetadata("levantamiento_detallado", clientId, relatedTaskId),
    );

    const needsFallbackTaskSync = !alreadyRelatedToTask(
      relatedTaskId,
      upload.relacionadoA,
      upload.relacionadoId,
      upload.tareasId,
    );

    if (needsFallbackTaskSync) {
      try {
        const syncResponse = await agregarArchivos(relatedTaskId, [
          {
            nombre: filename,
            tipo: "levantamiento_detallado",
            url: upload.url,
          },
        ]);

        if (!syncResponse.success) {
          throw new Error("No se pudo registrar el levantamiento en la tarea.");
        }
      } catch (error) {
        // ClienteArchivo es la fuente de verdad. Si el fallback legado falla, no bloqueamos el cierre.
        console.warn("[levantamiento] fallback de sync en tarea omitido:", error);
      }
    }

    return upload.url;
  };

  const handleFinishCita = async () => {
    if (isFinishing) return;
    setIsFinishing(true);
    setFinishError(null);
    if (!activeCitaTaskId || !activeCitaTask) {
      setIsFinishing(false);
      return;
    }
    const err = validatePreliminarSections();
    if (err) {
      setFinishError(err);
      setIsFinishing(false);
      return;
    }
    const newPreliminar = buildPreliminarDataFromForm();
    const existingCount = getPreliminarList(activeCitaTask).length;
    const preliminarPdfKey = createPreliminarSeguimientoPdfKey(activeCitaTaskId, existingCount);
    const relatedTaskId = activeCitaTask.id?.trim() || activeCitaTaskId;
    const filename = `levantamiento-detallado-${relatedTaskId}.pdf`;
    let dataUrl: string;
    try {
      dataUrl = await buildPreliminarPdfDataUrl(newPreliminar);
    } catch {
      setFinishError("No se pudo generar el PDF para seguimiento. Intenta de nuevo.");
      setIsFinishing(false);
      return;
    }
    try {
      await saveFormalPdf(preliminarPdfKey, dataUrl);
    } catch {
      setFinishError("No se pudo guardar el PDF. Intenta de nuevo.");
      setIsFinishing(false);
      return;
    }

    let clientId: string;
    try {
      clientId = getRequiredClientIdForFormalUpload(activeCitaTask as unknown, "levantamiento detallado");
    } catch (error) {
      setFinishError(error instanceof Error ? error.message : "No se encontro clienteId para levantamiento detallado.");
      setIsFinishing(false);
      return;
    }

    try {
      downloadPreliminarPdf(newPreliminar, filename);
      const uploadedPdfUrl = await uploadLevantamientoArtifact(relatedTaskId, clientId, filename, dataUrl);
      newPreliminar.levantamientoPdfUrl = uploadedPdfUrl;
    } catch {
      setFinishError("No se pudo subir o sincronizar el PDF de levantamiento. Intenta de nuevo.");
      setIsFinishing(false);
      return;
    }

    const fileLabel = `Levantamiento detallado  -  ${newPreliminar.projectType}.pdf`;
    const result = savePreliminarAndGetNextTasks({
      preliminarData: newPreliminar,
      seguimientoPdf: { key: preliminarPdfKey, fileLabel, remoteUrl: newPreliminar.levantamientoPdfUrl },
    });
    if (!result) {
      setIsFinishing(false);
      return;
    }

    try {
      const latestTasks = await refresh();
      const latestTask = latestTasks.find((task) => task.id === activeCitaTaskId);
      if (!latestTask) {
        setFinishError("No se encontro la tarea activa para completar la cita.");
        setIsFinishing(false);
        return;
      }

      await updateTask(latestTask, {
        stage: "disenos",
        status: "pendiente",
        citaStarted: true,
        citaFinished: true,
      });

      runtimeStore.removeItem(activeCitaTaskStorageKey);
      setActiveCitaTaskId(null);
      const returnUrl = runtimeStore.getItem(citaReturnUrlStorageKey) || "/dashboard/empleado";
      runtimeStore.removeItem(citaReturnUrlStorageKey);
      const safeNext = returnUrl.startsWith("/") ? returnUrl : "/dashboard/empleado";
      router.replace(`/dashboard/levantamiento/finalizando?next=${encodeURIComponent(safeNext)}`);
    } catch {
      setFinishError("No se pudo completar la cita. Intenta de nuevo.");
      setIsFinishing(false);
    }
  };

  const handleFinishAndContinue = async () => {
    if (isFinishing) return;
    setIsFinishing(true);
    setFinishError(null);
    if (!activeCitaTaskId || !activeCitaTask) {
      setIsFinishing(false);
      return;
    }
    const err = validatePreliminarSections();
    if (err) {
      setFinishError(err);
      setIsFinishing(false);
      return;
    }
    const newPreliminar = buildPreliminarDataFromForm();
    const existingCount = getPreliminarList(activeCitaTask).length;
    const preliminarPdfKey = createPreliminarSeguimientoPdfKey(activeCitaTaskId, existingCount);
    const relatedTaskId = activeCitaTask.id?.trim() || activeCitaTaskId;
    const filename = `levantamiento-detallado-${relatedTaskId}.pdf`;
    let dataUrl: string;
    try {
      dataUrl = await buildPreliminarPdfDataUrl(newPreliminar);
    } catch {
      setFinishError("No se pudo generar el PDF para seguimiento. Intenta de nuevo.");
      setIsFinishing(false);
      return;
    }
    try {
      await saveFormalPdf(preliminarPdfKey, dataUrl);
    } catch {
      setFinishError("No se pudo guardar el PDF. Intenta de nuevo.");
      setIsFinishing(false);
      return;
    }

    let clientId: string;
    try {
      clientId = getRequiredClientIdForFormalUpload(activeCitaTask as unknown, "levantamiento detallado");
    } catch (error) {
      setFinishError(error instanceof Error ? error.message : "No se encontro clienteId para levantamiento detallado.");
      setIsFinishing(false);
      return;
    }

    try {
      downloadPreliminarPdf(newPreliminar, filename);
      const uploadedPdfUrl = await uploadLevantamientoArtifact(relatedTaskId, clientId, filename, dataUrl);
      newPreliminar.levantamientoPdfUrl = uploadedPdfUrl;
    } catch {
      setFinishError("No se pudo subir o sincronizar el PDF de levantamiento. Intenta de nuevo.");
      setIsFinishing(false);
      return;
    }

    const fileLabel = `Levantamiento detallado  -  ${newPreliminar.projectType}.pdf`;
    const result = savePreliminarAndGetNextTasks({
      preliminarData: newPreliminar,
      seguimientoPdf: { key: preliminarPdfKey, fileLabel, remoteUrl: newPreliminar.levantamientoPdfUrl },
    });
    if (!result) {
      setIsFinishing(false);
      return;
    }
    setProjectType(CATALOG_PROJECT_TYPES[0]);
    setLocation("");
    setDeliveryWeeksMin("");
    setDeliveryWeeksMax("");
    setLargo("");
    setAlto("");
    setSelectedCubierta(materialCatalog.cubiertas[0]?.id ?? DEFAULT_MATERIAL_CATALOG.cubiertas[0].id);
    setSelectedFrenteIds([
      materialCatalog.frentes[0]?.id ?? DEFAULT_MATERIAL_CATALOG.frentes[0].id,
    ]);
    setSelectedHerraje(materialCatalog.herrajes[0]?.id ?? DEFAULT_MATERIAL_CATALOG.herrajes[0].id);
    setLevantamiento(defaultLevantamientoDetalle());
    setCurrentWallIndex(0);
    setWallSearch("");
    setApplianceStep(0);
    setApplianceSearch("");
    setApplianceBrowseMode(true);
    setLightingShowOtro(false);
    setLightingBrowseMode(true);
    setLightingFocusedId(null);
    setLightingSearch("");
    setIsFinishing(false);
  };

  const metrics = useMemo(() => {
    const largoValue = Math.max(0, Number.parseFloat(largo) || 0);
    const cubierta = materialCatalog.cubiertas.find((item) => item.id === selectedCubierta);
    const herraje = materialCatalog.herrajes.find((item) => item.id === selectedHerraje);
    const tierC = (cubierta?.tier ?? "Estandar") as MaterialGama;
    const tierH = (herraje?.tier ?? "Estandar") as MaterialGama;
    const mats = levantamientoConfig.materiales;
    const avgCubiertaByTier = getAveragePriceByTier(mats, "cubierta", tierC);
    const avgHerrajeByTier = getAveragePriceByTier(mats, "herraje", tierH);
    const priceCubierta = cubierta?.pricePerUnit ?? avgCubiertaByTier;
    const priceHerraje = herraje?.pricePerUnit ?? avgHerrajeByTier;
    const sumPrecioFrentePorM = selectedFrenteIds.reduce((acc, fid) => {
      const f = materialCatalog.frentes.find((item) => item.id === fid);
      const tierF = (f?.tier ?? "Estandar") as MaterialGama;
      const avgFrenteByTier = getAveragePriceByTier(mats, "frente", tierF);
      return acc + (f?.pricePerUnit ?? avgFrenteByTier);
    }, 0);
    const recargoHastaTecho = Math.min(1, Math.max(0, Number(levantamientoConfig.factorHastaTecho) || 0));
    const factorActivo = levantamiento.medidasGenerales?.hastaTecho ? 1 + recargoHastaTecho : 1;

    const costoCubiertas = largoValue * priceCubierta;
    const costoFrentes = largoValue * sumPrecioFrentePorM * factorActivo;
    const costoHerrajes = largoValue * priceHerraje * factorActivo;
    const costoMateriales = costoCubiertas + costoFrentes + costoHerrajes;

    const costoIluminacion = cotizacionIluminacionTotal(
      levantamiento,
      levantamientoConfig.extrasPrecios?.iluminacion,
    );
    const accesoriosFallbackPrecios = Object.fromEntries(
      Object.entries(equipamientoPriceById).filter(([id]) => id.startsWith("extra-")),
    );
    const costoAccesoriosEspeciales = cotizacionAccesoriosEspecialesTotal(
      levantamiento,
      {
        ...accesoriosFallbackPrecios,
        ...(levantamientoConfig.extrasPrecios?.accesoriosEspeciales ?? {}),
      },
    );

    // Costo de electrodomésticos seleccionados
    const costoElectrodomesticos = levantamiento.applianceDocumentIds.reduce((acc, applianceId) => {
      const price = equipamientoPriceById[`electro-${applianceId}`] ?? 0;
      return acc + price;
    }, 0);

    // Costo de luminarias seleccionadas (extras tipo iluminación)
    const costoLuminariaSeleccionadas = levantamiento.lightingSelectedIds.reduce((acc, lightingId) => {
      const price = equipamientoPriceById[`extra-${lightingId}`] ?? 0;
      return acc + price;
    }, 0);

    const costoExtras = costoIluminacion + costoAccesoriosEspeciales + costoElectrodomesticos + costoLuminariaSeleccionadas;

    const precioEscenario = levantamientoConfig.scenarioPrices[selectedScenario] ?? 5000;
    const costoReferenciaEscenario = largoValue * precioEscenario;
    const subtotal = costoMateriales + costoExtras;
    const iva = subtotal * levantamientoConfig.ivaPercent;
    const total = subtotal + iva;
    const m = levantamientoConfig.marginPercent;
    const rangeMin = total * (1 - m);
    const rangeMax = total * (1 + m);

    return {
      largoValue,
      costoBase: costoReferenciaEscenario,
      costoReferenciaEscenario,
      costoCubiertas,
      costoFrentes,
      costoHerrajes,
      costoMateriales,
      costoEquipamiento: costoAccesoriosEspeciales,
      costoAccesoriosEspeciales,
      costoElectrodomesticos,
      costoLuminariaSeleccionadas,
      costoExtras,
      costoIluminacion,
      factorHastaTechoAplicado: factorActivo,
      subtotal,
      iva,
      total,
      rangeMin,
      rangeMax,
      rangeLabel: `${formatCurrency(rangeMin)} - ${formatCurrency(rangeMax)}`,
      marginPercent: m,
    };
  }, [
    materialCatalog,
    largo,
    alto,
    selectedCubierta,
    selectedFrenteIds,
    selectedHerraje,
    levantamiento,
    equipamientoPriceById,
    selectedScenario,
    levantamientoConfig,
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
  }, [materialCatalog, largo, selectedCubierta, selectedFrenteIds, selectedHerraje]);

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

  /** Rango por tarjeta de escenario como referencia visual (cateo), no como total final. */
  const scenarioCardRanges = useMemo(() => {
    const largoValue = Math.max(0, Number.parseFloat(largo) || 0);
    const m = levantamientoConfig.marginPercent;
    const def = createDefaultLevantamientoConfig().scenarioPrices;
    return scenarioOptions.map((s) => {
      const costoReferencia = largoValue * (levantamientoConfig.scenarioPrices[s.id as keyof typeof def] ?? def.esencial);
      return { id: s.id, min: costoReferencia * (1 - m), max: costoReferencia * (1 + m) };
    });
  }, [
    largo,
    scenarioOptions,
    levantamientoConfig,
  ]);

  const materialTierAverages = useMemo(() => {
    const m = levantamientoConfig.materiales;
    const row = (c: "cubierta" | "frente" | "herraje") =>
      ({
        Estandar: getAveragePriceByTier(m, c, "Estandar"),
        Tendencia: getAveragePriceByTier(m, c, "Tendencia"),
        Premium: getAveragePriceByTier(m, c, "Premium"),
      }) satisfies Record<MaterialOption["tier"], number>;
    return {
      cubiertas: row("cubierta"),
      frentes: row("frente"),
      herrajes: row("herraje"),
    };
  }, [levantamientoConfig.materiales]);

  /** Auto-escenario según moda de gamas en showroom; el usuario puede corregir con las tarjetas (se respeta hasta el próximo cambio de material). */
  useEffect(() => {
    setSelectedScenario(
      autoScenarioFromShowroom(materialCatalog, selectedCubierta, selectedFrenteIds, selectedHerraje),
    );
  }, [materialCatalog, selectedCubierta, selectedFrenteIds, selectedHerraje]);

  useEffect(() => {
    setPages({ cubiertas: 1, frentes: 1, herrajes: 1 });
  }, [materialSearch, tierFilter]);

  const handleGeneratePdf = () => {
    const data = buildPreliminarDataFromForm();
    downloadPreliminarPdf(data, "levantamiento-detallado.pdf");
  };

  const applianceOtroStepIndex = applianceCatalogItems.length;

  const applianceStepMeta = useMemo(() => {
    const isOtro = applianceStep >= applianceOtroStepIndex;
    if (isOtro) return { isOtro: true as const, progress: null };
    const item = applianceCatalogItems[applianceStep];
    const categoria = item?.categoria ?? "Electrodomésticos";
    const totalInCategory = applianceCatalogItems.filter((x) => x.categoria === categoria).length;
    const indexInCategory = applianceCatalogItems
      .slice(0, applianceStep + 1)
      .filter((x) => x.categoria === categoria).length;
    return {
      isOtro: false as const,
      progress: {
        categoria,
        indexInCategory,
        totalInCategory,
      },
    };
  }, [applianceCatalogItems, applianceOtroStepIndex, applianceStep]);

  const currentApplianceItem =
    applianceStep < applianceOtroStepIndex ? applianceCatalogItems[applianceStep] : null;

  const applianceSearchNorm = applianceSearch.trim().toLowerCase();
  const filteredApplianceMatches = useMemo(() => {
    if (!applianceSearchNorm) return null;
    return applianceCatalogItems.map((item, idx) => ({ item, idx })).filter(({ item }) => {
      const hay = `${item.label} ${item.hint ?? ""} ${item.categoria ?? ""}`.toLowerCase();
      return hay.includes(applianceSearchNorm);
    });
  }, [applianceCatalogItems, applianceSearchNorm]);

  const applianceCategorias = useMemo(() => {
    const ordered = applianceCatalogItems.map((item) => item.categoria?.trim() || "Electrodomésticos");
    return Array.from(new Set(ordered));
  }, [applianceCatalogItems]);

  const lightingSearchNorm = lightingSearch.trim().toLowerCase();
  const filteredLightingItems = useMemo(() => {
    if (!lightingSearchNorm) return null;
    return LIGHTING_ITEMS.filter((item) => {
      const hay = `${item.label} ${item.id} ${item.hint ?? ""}`.toLowerCase();
      return hay.includes(lightingSearchNorm);
    });
  }, [lightingSearchNorm]);

  const applianceCarouselRows = useMemo(() => {
    const norm = applianceSearchNorm;
    const matchesSearch = (item: ItemCatalogo) => {
      if (!norm) return true;
      const hay = `${item.label} ${item.hint ?? ""} ${item.categoria ?? ""}`.toLowerCase();
      return hay.includes(norm);
    };
    if (norm) {
      const entries = applianceCatalogItems.map((item, idx) => ({ item, idx })).filter(({ item }) =>
        matchesSearch(item),
      );
      return entries.length ? [{ key: "busqueda", title: "Resultados de búsqueda", entries }] : [];
    }
    return applianceCategorias.map((cat) => {
      const entries = applianceCatalogItems.map((item, idx) => ({ item, idx })).filter(
        ({ item }) => item.categoria === cat,
      );
      return { key: cat, title: cat, entries };
    }).filter((row) => row.entries.length > 0);
  }, [applianceCatalogItems, applianceCategorias, applianceSearchNorm]);

  const applianceIndicesInCurrentCategory = useMemo(() => {
    if (applianceStep >= applianceOtroStepIndex) return [] as number[];
    const cat = applianceCatalogItems[applianceStep]?.categoria;
    if (!cat) return [];
    return applianceCatalogItems.map((item, i) => (item.categoria === cat ? i : -1)).filter((i) => i >= 0);
  }, [applianceCatalogItems, applianceOtroStepIndex, applianceStep]);

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

  const wallSlotIsCompleteForUi = useCallback((slot: Record<string, string> | undefined) => {
    if (!slot) return false;
    const selectedTypeId = (slot[WALL_SLOT_META_TYPE] ?? "").trim();
    if (!selectedTypeId) return false;
    const visibleDefs = getWallMeasureFieldDefs(selectedTypeId).filter((field) => !isEspesorField(field));
    return visibleDefs.every((field) => (slot[field.key] ?? "").trim() !== "");
  }, []);

  const allProjectWallsComplete = useMemo(() => {
    const n = levantamiento.wallSlotCount;
    if (!n) return false;
    return Array.from({ length: n }, (_, i) => wallSlotIsCompleteForUi(levantamiento.wallMeasures[wallSlotKey(i)])).every(
      Boolean,
    );
  }, [levantamiento.wallMeasures, levantamiento.wallSlotCount, wallSlotIsCompleteForUi]);

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
    if (!wallSlotIsCompleteForUi(slot)) {
      window.alert(
        "Completa el tipo de pared y las medidas de todas las cotas antes de guardar esta pared.",
      );
      return;
    }
    for (let step = 1; step <= n; step++) {
      const j = (currentWallIndex + step) % n;
      const s = levantamiento.wallMeasures[wallSlotKey(j)] ?? {};
      if (!wallSlotIsCompleteForUi(s)) {
        setCurrentWallIndex(j);
        return;
      }
    }
    document.getElementById("seccion-electrodomesticos")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [currentWallIndex, levantamiento.wallMeasures, levantamiento.wallSlotCount, wallSlotIsCompleteForUi]);

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
          <div className="mt-4">
            <Link
              href="/dashboard/configuracion-levantamiento"
              className="inline-flex items-center rounded-full border border-primary/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary transition hover:bg-primary hover:text-white"
            >
              Configurar precios y porcentajes
            </Link>
          </div>
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
                        placeholder="Categoría..."
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
                    placeholder="CDMX, GDL, MTY..."
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
                formulario. En obras, "
                <strong className="font-semibold text-primary">vano</strong>" es el{" "}
                <strong className="font-semibold text-primary">hueco</strong> de puerta o ventana. Unidades en metros. Si
                nada encaja en el catálogo, elige el tipo{" "}
                <strong className="font-semibold text-primary">"Otro tipo de muro o situación especial"</strong> en esa
                pared.
              </p>
              <Link
                href="/dashboard/referencia-tipos-pared"
                className="mt-2 inline-block text-sm font-semibold text-[#8B1C1C] underline-offset-2 hover:underline"
              >
                Ver catálogo de referencia (imágenes por tipo de muro)
              </Link>
            </div>

            {!levantamiento.wallSlotCount ? (
              <div className="space-y-5">
                <p className="text-lg font-semibold text-primary">¿Cuántas paredes tiene el proyecto?</p>
                <p className="text-sm text-secondary">
                  Elige un número para comenzar. Podrás cambiarlo después (se pedirá confirmación si ya había datos).
                </p>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-3">
                  {WALL_COUNT_OPTIONS.map((count) => {
                    return (
                      <button
                        key={count}
                        type="button"
                        onClick={() => applyWallSlotCount(count)}
                        className="group flex flex-col items-center justify-center gap-3 rounded-3xl border border-primary/10 bg-white p-6 text-center shadow-md transition duration-300 ease-out hover:-translate-y-0.5 hover:border-[#8B1C1C]/30 hover:shadow-lg"
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
                    );
                  })}
                </div>
                {!showMoreWallCounts ? (
                  <button
                    type="button"
                    onClick={() => setShowMoreWallCounts(true)}
                    className="rounded-2xl border border-primary/15 bg-white px-4 py-2 text-sm font-semibold text-[#8B1C1C] transition hover:border-primary/30"
                  >
                    Más paredes
                  </button>
                ) : null}
                {showMoreWallCounts ? (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-primary">Opciones adicionales</p>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-3">
                      {WALL_COUNT_EXTRA_OPTIONS.map((count) => (
                        <button
                          key={count}
                          type="button"
                          onClick={() => applyWallSlotCount(count)}
                          className="group flex flex-col items-center justify-center gap-3 rounded-3xl border border-primary/10 bg-white p-6 text-center shadow-md transition duration-300 ease-out hover:-translate-y-0.5 hover:border-[#8B1C1C]/30 hover:shadow-lg"
                        >
                          <div className="flex h-24 w-full max-w-[8.5rem] items-center justify-center rounded-2xl bg-primary/[0.06] text-primary transition duration-300 group-hover:bg-primary/10">
                            <WallCountIcon count={count} className="h-11 w-11 shrink-0" />
                          </div>
                          <div>
                            <span className="text-3xl font-bold tabular-nums text-[#8B1C1C]">{count}</span>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-secondary">
                              paredes
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
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
                        wallSlotIsCompleteForUi(levantamiento.wallMeasures[wallSlotKey(i)] ?? {})
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
                          B, C... Unidades en metros.
                        </p>
                      </div>

                      <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
                        Referencia / Alias de esta pared (Opcional)
                        <input
                          type="text"
                          value={slotData[WALL_SLOT_META_ALIAS] ?? ""}
                          onChange={(e) => patchWallSlotAlias(currentWallIndex, e.target.value)}
                          placeholder="Ej. Pared de la ventana, Pared del fondo, Muro del refri..."
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
                                placeholder="Ej. ventana, puerta, dos ventanas..."
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
                                {wallFields
                                  .filter((field) => !isEspesorField(field))
                                  .map((field, fi) => (
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
                                            Sobre el vano (techo a alto vano):{" "}
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
                                            Sobre el vano (techo a (antepecho + alto vano)):{" "}
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
                              ? "Listo: todas las paredes completas  -  ir a la siguiente sección"
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
                placeholder="Detalles adicionales sobre muros..."
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
                horno de gas, tostadora, dispensador de agua, enfriador de vinos, tarja extra).
              </p>
              {equipamientoCatalogError ? (
                <p className="mt-2 text-xs font-semibold text-amber-700">{equipamientoCatalogError}</p>
              ) : null}
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
                      <ApplianceTypeImage
                        item={currentApplianceItem}
                        alt=""
                        className="absolute inset-0 z-0 box-border h-full w-full object-contain object-center p-2"
                      />
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
              <>
                <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
                  Buscar electrodoméstico
                  <span className="relative mt-2 block">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary/70" />
                    <input
                      value={applianceSearch}
                      onChange={(e) => setApplianceSearch(e.target.value)}
                      placeholder="Nombre, categoría o palabra del tipo..."
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
                      {filteredApplianceMatches.map(({ item, idx }) => {
                        const isCurrent = applianceStep === idx && !applianceStepMeta.isOtro;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => openApplianceDetailByIndex(idx)}
                            className={`max-w-full truncate rounded-full px-3 py-1.5 text-left text-xs font-semibold transition ${
                              isCurrent
                                ? "bg-[#8B1C1C] text-white"
                                : "border border-primary/15 bg-white text-primary hover:border-primary/35"
                            }`}
                            title={`${item.categoria ?? ""}  -  ${item.label}`}
                          >
                            <span className="text-secondary/80">{item.categoria ?? ""}: </span>
                            {item.label}
                          </button>
                        );
                      })}
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
                          {row.entries.map(({ item, idx }, rank) => (
                            <div key={item.id} className="flex shrink-0 items-end gap-1">
                              <span className={streamRankClass} aria-hidden>
                                {rank + 1}
                              </span>
                              <button
                                type="button"
                                onClick={() => openApplianceDetailByIndex(idx)}
                                className="text-left"
                              >
                                <div className={streamPosterClass(applianceStep === idx)}>
                                  <ApplianceTypeImage
                                    item={item}
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
                          <span className={`${streamRankClass} pb-2 font-semibold text-zinc-500`} aria-hidden title="Otro">
                            +
                          </span>
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
                ) : applianceSearchNorm && applianceCarouselRows.length > 0 ? (
                  <div className={streamRowShell}>
                    <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                      <div>
                        <p className={streamRowHeading}>Resultados de búsqueda</p>
                        <p className={streamRowHint}>Electrodomésticos</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const el = applianceRowRefs.current.busqueda;
                          if (el) el.scrollTo({ left: el.scrollWidth, behavior: "smooth" });
                        }}
                        className={streamVerTodosClass}
                      >
                        Ver todos
                      </button>
                    </div>
                    <div
                      ref={(el) => {
                        applianceRowRefs.current.busqueda = el;
                      }}
                      className={streamScrollClass}
                    >
                      {applianceCarouselRows[0]?.entries.map(({ item, idx }, rank) => (
                        <div key={item.id} className="flex shrink-0 items-end gap-1">
                          <span className={streamRankClass} aria-hidden>
                            {rank + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => openApplianceDetailByIndex(idx)}
                            className="text-left"
                          >
                            <div className={streamPosterClass(applianceStep === idx)}>
                              <ApplianceTypeImage
                                item={item}
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
                ) : null}
              </>
            )}
            <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
              Comentarios de esta sección
              <textarea
                value={levantamiento.sectionComments.c ?? ""}
                onChange={(e) => setSectionComment("c", e.target.value)}
                rows={3}
                placeholder="Marcas, modelos, voltajes..."
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
              {materialCatalogError ? (
                <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
                  {materialCatalogError}
                </p>
              ) : null}
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
                marcar varios). "Medidas opcionales" abre el detalle si necesitas anotar medidas. La lista definitiva la
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
                  placeholder="Ej. LED, spot, colgante, indirecta..."
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
                    Ir a "Otro" (luminario no listado)
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
                placeholder="Circuitos, dimmers, temperatura de color..."
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
                    <span>Referencia escenario (no incluida)</span>
                    <span className="shrink-0 text-primary/90">{formatCurrency(metrics.costoReferenciaEscenario)}</span>
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
                    <span>Luminarias</span>
                    <span className="shrink-0 text-primary/90">{formatCurrency(metrics.costoLuminariaSeleccionadas)}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span>Extras accesorios especiales</span>
                    <span className="shrink-0 text-primary/90">{formatCurrency(metrics.costoAccesoriosEspeciales)}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span>Iluminación</span>
                    <span className="shrink-0 text-primary/90">{formatCurrency(metrics.costoIluminacion)}</span>
                  </div>
                  <div className="flex justify-between gap-3 border-t border-primary/10 pt-1.5">
                    <span>Extras totales</span>
                    <span className="shrink-0 text-primary/90">{formatCurrency(metrics.costoExtras)}</span>
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
              reinicia para otro espacio. Al terminar, el PDF se descarga automáticamente y también queda
              vinculado en la tarjeta del cliente. También puedes generarlo manualmente con{" "}
              <span className="font-semibold text-emerald-800">Generar estimación en PDF</span>.
            </p>
            <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
              <button
                type="button"
                onClick={handleFinishCita}
                disabled={isFinishing}
                className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
              >
                <CheckCircle2 className="h-4 w-4" />
                {isFinishing ? "Procesando..." : "Terminar"}
              </button>
              <button
                type="button"
                onClick={handleFinishAndContinue}
                disabled={isFinishing}
                className="flex items-center justify-center gap-2 rounded-2xl border-2 border-emerald-600 bg-white px-5 py-2.5 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:border-emerald-300 disabled:text-emerald-300"
              >
                {isFinishing ? "Guardando..." : "Terminar y continuar"}
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

