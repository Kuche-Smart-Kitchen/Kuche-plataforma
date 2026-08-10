/* eslint-disable react-hooks/set-state-in-effect, react-hooks/preserve-manual-memoization */
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
  Minus,
  Plus,
  Search,
} from "lucide-react";
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
import { CatalogProjectTypeField } from "@/components/catalogo/CatalogProjectTypeField";
import {
  CATALOG_PROJECT_TYPES,
  isCocinasProjectTypeForConIsla,
} from "@/lib/catalog-project-types";
import {
  buildLevantamientoMetrics,
  type LevantamientoScenarioId,
} from "./logica_Levantamiento_y_cotizacion/calculos";
import {
  LEVANTAMIENTO_SCENARIO_OPTIONS,
  resolveScenarioReferenceCateo,
} from "./logica_Levantamiento_y_cotizacion/escenarios";
import {
  buildMaterialShowroomCatalog,
  buildShowroomSelectionSummary,
  type ShowroomMaterialOption as MaterialOption,
} from "./logica_Levantamiento_y_cotizacion/showroomCatalog";
import { getSectionAInitialValues } from "./logica_Levantamiento_y_cotizacion/sectionA";
import {
  APPLIANCE_CATEGORIAS,
  APPLIANCE_ITEMS,
  APPLIANCE_OTRO_STEP_INDEX,
  defaultLevantamientoDetalle,
  emptyMedidas,
  emptyOtro,
  emptyWallMeasuresForId,
  medidasCamposTieneValor,
  getApplianceCategoryProgress,
  getWallMeasureFieldDefs,
  computeLightingSelectedIds,
  defaultLightingQty,
  getLightingEffectiveQty,
  isWallSlotKey,
  LIGHTING_ITEMS,
  SPECIAL_ACCESSORIES_ITEMS,
  wallMeasuresTieneValor,
  WALL_SLOT_META_TYPE,
  WALL_SLOT_META_ALIAS,
  wallMeasureFieldFocusGroup,
  wallMeasureLetter,
  type WallDiagramFocusGroupId,
  wallSlotIsComplete,
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
import { formatDeliveryWeeksLabel } from "@/lib/delivery-weeks";
import { emptyWhenZeroIntString, emptyWhenZeroNumericString } from "@/lib/numeric-input-empty-zero";
import ApplianceTypeImage from "@/components/levantamiento/ApplianceTypeImage";
import HorizontalScrollStrip from "@/components/levantamiento/HorizontalScrollStrip";
import LightingTypeImage from "@/components/levantamiento/LightingTypeImage";
import { WallTypeIcon } from "@/components/levantamiento/WallTypeIcons";
import { InteractiveCroquis } from "@/components/levantamiento/InteractiveCroquis";
import Link from "next/link";
import { generatePublicProjectCode } from "@/lib/project-code";
import {
  defaultPagosForInversion,
  ESTADO_PROYECTO,
  formatSeguimientoDateLong,
  normalizeEtapaForStorage,
} from "@/lib/seguimiento-project";
import {
  createDefaultLevantamientoConfig,
  getLevantamientoConfig,
  resolvePrecioPorMetroForShowroomSelection,
  type LevantamientoConfig,
  DEFAULT_LEVANTAMIENTO_MATERIALES,
  type MaterialCategoria,
} from "@/lib/config-levantamiento";
import { DashboardBackButton } from "@/components/dashboard/DashboardBackButton";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);

const formatMeters = (value: number) =>
  new Intl.NumberFormat("es-MX", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);

/** Metros lineales asignados a un frente en la tarjeta del showroom (reparto igual entre seleccionados). */
function resolveShowroomFrenteMetrosForCard(
  largoLineal: number,
  selectedCount: number,
  isActive: boolean,
  splitLinearAmongSelections: boolean,
): number {
  if (!splitLinearAmongSelections || selectedCount <= 0) return largoLineal;
  if (isActive) return largoLineal / selectedCount;
  return largoLineal / (selectedCount + 1);
}

const WALL_COUNT_OPTIONS = [1, 2, 3, 4] as const;

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
    default:
      return svg(<line x1="4" y1="12" x2="20" y2="12" />);
  }
}

/** Campos de «Otro tipo de muro» reutilizados para el modo libre (texto + ancho / alto / fondo en m). */
const WALL_LIBRE_FIELD_DEFS = getWallMeasureFieldDefs("pared-otro");

type MaterialCategory = "cubiertas" | "frentes" | "herrajes";

/**
 * Fotos en `public/images/levantamiento/cubiertas/`, `frentes/`, `herrajes/` alineadas a los ids de `DEFAULT_LEVANTAMIENTO_MATERIALES`.
 * Si un material no figura aquí, se usan heurísticas por nombre o el fallback de categoría.
 */
const SHOWROOM_MATERIAL_IMAGE_BY_ID: Record<string, string> = {
  "cub-cuarcita": "/images/levantamiento/cubiertas/cuarcita.jpeg",
  "cub-formaica": "/images/levantamiento/cubiertas/formica.jpeg",
  "cub-granito": "/images/levantamiento/cubiertas/granito.jpeg",
  "cub-cuarzo": "/images/levantamiento/cubiertas/cuarzo.jpeg",
  "cub-cubierta-solida": "/images/levantamiento/cubiertas/cubierta-solida.jpeg",
  "cub-marmol": "/images/levantamiento/cubiertas/marmol.jpeg",
  "cub-piedra-sinterizada": "/images/levantamiento/cubiertas/piedra-sinterizada.jpeg",
  "fre-enchapados-naturales": "/images/levantamiento/frentes/enchapado-natural.jpeg",
  "fre-premium": "/images/levantamiento/frentes/premium.jpeg",
  "fre-melamina-1-estandar": "/images/levantamiento/frentes/melamina-estandar.jpeg",
  "fre-madera-solida": "/images/levantamiento/frentes/madera-solida.jpeg",
  "fre-melamina-2-tendencia": "/images/levantamiento/frentes/melamina-tendencia.jpeg",
  "fre-altos-brillos": "/images/levantamiento/frentes/altos-brillos.jpeg",
  "fre-supermates": "/images/levantamiento/frentes/supermates.jpeg",
  "her-basico": "/images/levantamiento/herrajes/estandar.jpg",
  "her-intermedio": "/images/levantamiento/herrajes/intermedio.jpg",
  "her-alta": "/images/levantamiento/herrajes/Alta.jpg",
  "her-premium": "/images/levantamiento/herrajes/premium.png",
};

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
  frentes: "/images/levantamiento/frentes/melamina-estandar.jpeg",
  herrajes: "/images/levantamiento/herrajes/intermedio.jpg",
};

const resolveMaterialImage = (id: string, name: string, category: MaterialCategory, fallback?: string) => {
  const fromAsset = SHOWROOM_MATERIAL_IMAGE_BY_ID[id];
  if (fromAsset) return fromAsset;
  const match = materialImageMap[category].find((entry) => entry.match.test(name));
  if (match) return match.src;
  /** Ignorar URLs externas (p. ej. pollinations): suelen fallar y el <img> cae en el placeholder. */
  if (fallback?.startsWith("/")) return fallback;
  return defaultCategoryImage[category];
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
/**
 * Fila de carrusel (fondo oscuro): el strip estira la celda a la altura del bloque más alto. `items-end` + bloque
 * más bajo (p. ej. «Otro») bajaba todo el póster; h-full + tramo de rango con `justify-end` mantiene el póster
 * alineado arriba y el índice al pie de su columna.
 */
const streamCatalogItemRowClass =
  "flex h-full min-h-0 w-max shrink-0 self-stretch gap-1 sm:gap-1";
const streamRankColumnClass =
  "flex w-[0.42em] min-w-[1.25rem] shrink-0 flex-col justify-end self-stretch pb-1 sm:min-w-[1.4rem]";
const streamRankNumberClass =
  "w-full text-center text-lg font-semibold tabular-nums leading-none text-zinc-500 sm:text-xl select-none";
const streamVerTodosClass =
  "shrink-0 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400 underline-offset-2 transition hover:text-zinc-100 hover:underline";
/** Póster del carrusel: 2:3 por defecto. Tarjas usan 3:2 y un ancho algo menor: las fotos suelen ser horizontales, así con `object-cover` se llena el marco sin tanta caja “alta” que obligue a un zoom extremo. */
const streamPosterClass = (selected: boolean, item?: ItemCatalogo) => {
  const ring = selected
    ? "ring-2 ring-white ring-offset-2 ring-offset-zinc-950"
    : "ring-1 ring-white/10 hover:ring-white/55";
  if (item?.id === "otro-tostadora" || item?.id === "otro-tarja-extra") {
    return `relative z-10 aspect-[2/3] w-[min(10.5rem,52vw)] shrink-0 overflow-hidden rounded-lg bg-white shadow-xl transition sm:w-[min(12.5rem,38vw)] lg:w-[min(13.5rem,32vw)] ${ring}`;
  }
  /* Estufas compactas y parrilla mixta: póster ancho (misma altura que 2:3). Parrilla dominó: un poco menos ancho que eso; se ajusta por % respecto a esa referencia. */
  if (item?.id === "estufa-compacta" || item?.id === "parrilla-mixta") {
    return `relative z-10 h-[calc(min(10.5rem,52vw)*3/2)] w-[min(20rem,92vw)] shrink-0 overflow-hidden rounded-lg bg-zinc-900 shadow-xl transition sm:h-[calc(min(12.5rem,38vw)*3/2)] sm:w-[min(21.5rem,80vw)] lg:h-[calc(min(13.5rem,32vw)*3/2)] lg:w-[min(22.5rem,58vw)] ${ring}`;
  }
  if (item?.id === "parrilla-domino") {
    return `relative z-10 h-[calc(min(10.5rem,52vw)*3/2)] w-[min(17.6rem,81vw)] shrink-0 overflow-hidden rounded-lg bg-zinc-900 shadow-xl transition sm:h-[calc(min(12.5rem,38vw)*3/2)] sm:w-[min(18.9rem,70vw)] lg:h-[calc(min(13.5rem,32vw)*3/2)] lg:w-[min(19.8rem,51vw)] ${ring}`;
  }
  if (item?.categoria === "Tarjas") {
    return `relative z-10 aspect-[3/2] w-[min(17.5rem,92vw)] shrink-0 overflow-hidden rounded-lg bg-zinc-900 shadow-xl transition sm:w-[min(19.5rem,68vw)] lg:w-[min(20.5rem,56vw)] ${ring}`;
  }
  /* Campanas: 40/39; imagen a `cover` rellenando el marco (fondo zinc, sin franjas blancas). */
  if (item?.categoria === "Campanas") {
    return `relative z-10 aspect-[40/39] w-[min(12.5rem,58vw)] shrink-0 overflow-hidden rounded-lg bg-zinc-900 shadow-xl transition sm:w-[min(15rem,42vw)] lg:w-[min(16.25rem,35vw)] ${ring}`;
  }
  return `relative z-10 aspect-[2/3] w-[min(10.5rem,52vw)] shrink-0 overflow-hidden rounded-lg bg-zinc-900 shadow-xl transition sm:w-[min(12.5rem,38vw)] lg:w-[min(13.5rem,32vw)] ${ring}`;
};

type WallFieldWithIndex = {
  field: ReturnType<typeof getWallMeasureFieldDefs>[number];
  index: number;
};

type WallFieldGroup = {
  id: WallDiagramFocusGroupId;
  title: string;
  hint: string;
  fields: WallFieldWithIndex[];
};

function groupWallFieldsByPriority(fields: WallFieldWithIndex[], wallId: string): WallFieldGroup[] {
  const grouped: Record<WallDiagramFocusGroupId, WallFieldWithIndex[]> = {
    general: [],
    vano: [],
    ubicacion: [],
  };
  for (const entry of fields) grouped[wallMeasureFieldFocusGroup(entry.field, wallId)].push(entry);
  const groups: WallFieldGroup[] = [
    {
      id: "general",
      title: "1) Cotas generales",
      hint: "Primero toma largo total y alturas principales.",
      fields: grouped.general,
    },
    {
      id: "vano",
      title: "2) Vano(s): puerta y/o ventana",
      hint: "Despues captura anchos y altos de cada hueco.",
      fields: grouped.vano,
    },
    {
      id: "ubicacion",
      title: "3) Ubicacion y separaciones",
      hint: "Al final posiciona los vanos y tramos libres.",
      fields: grouped.ubicacion,
    },
  ];
  return groups.filter((g) => g.fields.length > 0);
}
const streamPosterTitleOverlay =
  "pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent px-2 pb-2.5 pt-14";
const streamPosterLabelClass =
  "line-clamp-2 text-xs font-medium leading-snug text-white/95 sm:text-sm";
/** Miniaturas de carrusel: `cover` sin `object-center` aquí — el centro choca con `object-[…]` en iluminación. */
const streamCatalogThumbBase = "absolute inset-0 z-0 h-full w-full object-cover";
const streamCatalogThumbImageClass = `${streamCatalogThumbBase} object-center`;
/** Filas de tabla anchas (texto | foto): en póster 2:3 con `cover`, el centro cae en el texto; alinear a la derecha. */
function applianceStreamCatalogThumbClass(item: ItemCatalogo): string {
  if (item.categoria === "Campanas") {
    return `${streamCatalogThumbBase} object-[center_40%]`;
  }
  /* Estufa compacta y parrilla mixta: foto más chica, encuadre completo. Parrilla dominó: `cover` (sin tocar). */
  if (item.id === "estufa-compacta" || item.id === "parrilla-mixta") {
    return "absolute inset-0 z-0 box-border h-full w-full object-contain object-center p-3 sm:p-4";
  }
  if (item.id === "parrilla-domino") {
    return streamCatalogThumbImageClass;
  }
  if (item.id === "otro-tostadora" || item.id === "otro-tarja-extra") {
    return "absolute inset-0 z-0 h-full w-full object-contain object-center";
  }
  if (item.categoria === "Tarjas" && (item.id === "tarja-con-escurridor" || item.id === "tarja-doble")) {
    return `${streamCatalogThumbBase} object-right`;
  }
  return streamCatalogThumbImageClass;
}
/** Encuadre por ítem: `LightingTypeImage` aplica `object-position` inline (catálogo). */
const streamLightingThumbClass = `${streamCatalogThumbBase} object-center`;
const streamScrollClass =
  "flex min-w-0 flex-1 gap-3 overflow-x-auto scroll-smooth pb-2 pt-1 pl-0.5 [-ms-overflow-style:none] [scrollbar-color:rgba(255,255,255,0.2)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/25 sm:gap-4";

/** Carrusel horizontal del showroom (cubiertas / frentes / herrajes) sobre fondo claro. `@container` + cqw: el ancho visible del carril (4 tarjetas caben sin scroll en desktop). */
const materialShowroomScrollClass =
  "@container flex min-w-0 flex-1 gap-3 overflow-x-auto scroll-smooth pb-2 pt-1 pl-0.5 [-ms-overflow-style:none] [scrollbar-color:rgba(139,28,28,0.28)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-primary/25 sm:gap-4";

type MaterialGridProps = {
  title: string;
  options: MaterialOption[];
  category: MaterialCategory;
  largoLineal: number;
  materialSearch: string;
  /** Precio unitario $/m según catálogo de configuración (id/nombre). */
  unitPricePerM: (option: MaterialOption) => number;
  /** Frentes: reparte metros lineales entre opciones seleccionadas. */
  splitLinearAmongSelections?: boolean;
} & (
  | { multiSelect?: false; selectedId: string | null; onSelect: (id: string | null) => void }
  | { multiSelect: true; selectedIds: string[]; onToggle: (id: string) => void }
);

const MaterialGrid = ({
  title,
  options,
  category,
  largoLineal,
  materialSearch,
  unitPricePerM,
  splitLinearAmongSelections = false,
  ...rest
}: MaterialGridProps) => {
  const isMulti = rest.multiSelect === true;
  const selectedFrenteCount = isMulti ? rest.selectedIds.length : 0;
  const normalizedSearch = materialSearch.trim().toLowerCase();
  const filtered = options.filter((option) => {
    const matchesSearch = !normalizedSearch || option.name.toLowerCase().includes(normalizedSearch);
    return matchesSearch;
  });

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-secondary">{title}</p>
        {isMulti ? (
          <p className="mt-1 text-[11px] font-medium text-secondary/85">
            {splitLinearAmongSelections
              ? "Puedes elegir más de uno. Los metros lineales se reparten a partes iguales entre los frentes seleccionados. Toca de nuevo una opción para quitarla."
              : "Puedes elegir más de uno. Toca de nuevo una opción seleccionada para quitarla."}
          </p>
        ) : (
          <p className="mt-1 text-[11px] font-medium text-secondary/85">
            Toca de nuevo la opción seleccionada para dejarla sin elegir.
          </p>
        )}
      </div>
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-primary/10 bg-white px-4 py-3 text-xs text-secondary">
          No encontramos materiales con ese criterio.
        </div>
      ) : (
        <HorizontalScrollStrip scrollClassName={materialShowroomScrollClass} variant="light">
          {filtered.map((option) => {
            const isActive = isMulti
              ? rest.selectedIds.includes(option.id)
              : rest.selectedId !== null && option.id === rest.selectedId;
            const imageSrc = resolveMaterialImage(option.id, option.name, category, option.image);
            const pricePerM = unitPricePerM(option);
            const metrosAsignados = resolveShowroomFrenteMetrosForCard(
              largoLineal,
              selectedFrenteCount,
              isActive,
              splitLinearAmongSelections,
            );
            const optionPrice = Math.max(0, metrosAsignados * pricePerM);
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={isActive}
                onClick={() => {
                  if (isMulti) {
                    rest.onToggle(option.id);
                    return;
                  }
                  rest.onSelect(rest.selectedId === option.id ? null : option.id);
                }}
                className={`group shrink-0 touch-manipulation rounded-2xl border border-primary/10 bg-white p-2.5 text-left shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl sm:p-3 ${
                  /* 2 visibles en móvil; desde sm, 4 visibles en el ancho del carril (entre flechas) */
                  "w-[calc((100cqw-0.75rem)/2)] sm:w-[calc((100cqw-3*1rem)/4)]"
                } ${
                  isActive ? "ring-2 ring-[#8B1C1C] ring-offset-2 ring-offset-white" : ""
                }`}
              >
                <div className="relative overflow-hidden rounded-2xl">
                  <div className="relative aspect-[16/17] w-full overflow-hidden bg-primary/[0.04]">
                    <img
                      src={imageSrc}
                      alt={option.name}
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      onError={(event) => {
                        event.currentTarget.src = "/images/ui/hero-placeholder.svg";
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
                <p className="mt-3 line-clamp-2 text-xs font-medium text-secondary">{option.name}</p>
                <p className="mt-2 text-[11px] font-medium tabular-nums text-secondary">
                  {formatCurrency(pricePerM)} / m
                  {splitLinearAmongSelections && selectedFrenteCount > 0 ? (
                    <span className="text-secondary/75">
                      {" "}
                      · {formatMeters(metrosAsignados)} m
                      {isActive ? "" : " si lo agregas"}
                    </span>
                  ) : null}
                </p>
                <p className="mt-2 text-xs font-semibold text-[#8B1C1C]">
                  Estimado con tus medidas {formatCurrency(optionPrice)}
                </p>
              </button>
            );
          })}
        </HorizontalScrollStrip>
      )}
    </div>
  );
};

const materialCatalog = buildMaterialShowroomCatalog(DEFAULT_LEVANTAMIENTO_MATERIALES);
type AutoScenarioId = LevantamientoScenarioId;

export default function CotizadorPreliminarPage() {
  const router = useRouter();
  const [activeCitaTaskId, setActiveCitaTaskId] = useState<string | null>(null);
  const [activeCitaTask, setActiveCitaTask] = useState<KanbanTask | null>(null);
  const [clientName, setClientName] = useState("");
  const [projectType, setProjectType] = useState<string>(CATALOG_PROJECT_TYPES[0]);
  const [location, setLocation] = useState("");
  const [deliveryWeeksMin, setDeliveryWeeksMin] = useState("");
  const [deliveryWeeksMax, setDeliveryWeeksMax] = useState("");
  const [largo, setLargo] = useState("");
  const [alto, setAlto] = useState("");
  /** Sección D · showroom: sin selección por defecto; el usuario elige cubierta, frente(s) y herraje. */
  const [selectedCubierta, setSelectedCubierta] = useState<string | null>(null);
  const [selectedFrenteIds, setSelectedFrenteIds] = useState<string[]>([]);
  const [selectedHerraje, setSelectedHerraje] = useState<string | null>(null);
  const [levantamientoConfig, setLevantamientoConfig] = useState<LevantamientoConfig>(() =>
    createDefaultLevantamientoConfig(),
  );
  const [selectedScenario, setSelectedScenario] = useState<AutoScenarioId>("esencial");
  const [materialSearch, setMaterialSearch] = useState("");
  const [finishError, setFinishError] = useState<string | null>(null);
  const [levantamiento, setLevantamiento] = useState<LevantamientoDetalle>(() => defaultLevantamientoDetalle());
  /** Índice 0-based de la pared actual en el flujo dinámico (Sección B). */
  const [currentWallIndex, setCurrentWallIndex] = useState(0);
  /** Búsqueda en el catálogo de tipos de muro (Sección B). */
  const [wallSearch, setWallSearch] = useState("");
  /** Grupo de cotas enfocado en el formulario de pared (progressive disclosure en el diagrama). */
  const [focusedWallGroup, setFocusedWallGroup] = useState<WallDiagramFocusGroupId | null>(null);
  /** Diálogo in-app al cambiar cantidad de paredes (sustituye `window.confirm`). */
  const [confirmChangeWallCountOpen, setConfirmChangeWallCountOpen] = useState(false);
  /** Un paso por electrodoméstico (orden por categoría); el último índice es «Otro». */
  const [applianceStep, setApplianceStep] = useState(0);
  const [applianceSearch, setApplianceSearch] = useState("");
  /** true = carruseles; false = detalle en la misma página (sin modal). */
  const [applianceBrowseMode, setApplianceBrowseMode] = useState(true);
  const [lightingSearch, setLightingSearch] = useState("");
  const [lightingShowOtro, setLightingShowOtro] = useState(false);
  const [lightingBrowseMode, setLightingBrowseMode] = useState(true);
  /** id del luminario en vista detalle (cuando lightingBrowseMode es false). */
  const [lightingFocusedId, setLightingFocusedId] = useState<string | null>(null);
  const [specialAccessoriesBrowseMode, setSpecialAccessoriesBrowseMode] = useState(true);
  /** id del accesorio especial en vista detalle (cuando specialAccessoriesBrowseMode es false). */
  const [specialAccessoriesFocusedId, setSpecialAccessoriesFocusedId] = useState<string | null>(null);
  const applianceRowRefs = useRef<Record<string, HTMLDivElement | null>>({});
  /** Al pasar de carrusel → detalle el documento se acorta y el scroll absoluto deja la vista en la sección siguiente; se reencuadra la sección C. */
  const applianceSectionRef = useRef<HTMLDivElement | null>(null);
  const lightingSectionRef = useRef<HTMLDivElement | null>(null);
  const catalogScrollPositions = useRef({ appliance: 0, lighting: 0, specialAccessories: 0 });

  useEffect(() => {
    setFocusedWallGroup(null);
  }, [currentWallIndex]);

  const setSectionComment = (key: "a" | "b" | "c" | "d" | "e", value: string) => {
    setLevantamiento((prev) => ({
      ...prev,
      sectionComments: { ...prev.sectionComments, [key]: value },
    }));
  };

  const patchMedidasMap = (
    mapKey: "applianceMeasures" | "lightingMeasures" | "specialAccessoriesMeasures",
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
      for (const k of Object.keys(wm)) {
        if (isWallSlotKey(k)) delete wm[k];
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
    setSelectedFrenteIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
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
    const item = APPLIANCE_ITEMS[idx];
    if (!item) return;
    if (typeof window !== "undefined") {
      catalogScrollPositions.current.appliance = window.scrollY;
    }
    setApplianceStep(idx);
    setApplianceBrowseMode(false);
    setLevantamiento((prev) => ({
      ...prev,
      applianceDocumentIds: prev.applianceDocumentIds.includes(item.id)
        ? prev.applianceDocumentIds
        : [...prev.applianceDocumentIds, item.id],
    }));
    setTimeout(() => {
      if (typeof window !== "undefined" && applianceSectionRef.current) {
        const absoluteY = applianceSectionRef.current.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({ top: absoluteY - 80, behavior: "instant" as ScrollBehavior });
      }
    }, 10);
  }, []);

  const openApplianceOtroDetail = useCallback(() => {
    if (typeof window !== "undefined") {
      catalogScrollPositions.current.appliance = window.scrollY;
    }
    setApplianceStep(APPLIANCE_OTRO_STEP_INDEX);
    setApplianceBrowseMode(false);
    setLevantamiento((prev) => ({ ...prev, applianceOtroInDocument: true }));
    setTimeout(() => {
      if (typeof window !== "undefined" && applianceSectionRef.current) {
        const absoluteY = applianceSectionRef.current.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({ top: absoluteY - 80, behavior: "instant" as ScrollBehavior });
      }
    }, 10);
  }, []);

  const setLightingInDocument = useCallback((id: string, included: boolean) => {
    setLevantamiento((prev) => {
      const base = { ...defaultLightingQty(), ...(prev.lightingQty ?? {}) };
      base[id] = included ? Math.max(1, base[id] ?? 0) : 0;
      return {
        ...prev,
        lightingQty: base,
        lightingSelectedIds: computeLightingSelectedIds({
          lightingQty: base,
          lightingMeasures: prev.lightingMeasures,
        }),
      };
    });
  }, []);

  const toggleLightingSelected = useCallback((id: string) => {
    setLevantamiento((prev) => {
      const base = { ...defaultLightingQty(), ...(prev.lightingQty ?? {}) };
      const eff = getLightingEffectiveQty(prev, id);
      base[id] = eff > 0 ? 0 : 1;
      return {
        ...prev,
        lightingQty: base,
        lightingSelectedIds: computeLightingSelectedIds({
          lightingQty: base,
          lightingMeasures: prev.lightingMeasures,
        }),
      };
    });
  }, []);

  const updateLightingQty = useCallback((id: string, delta: number) => {
    setLevantamiento((prev) => {
      const base = { ...defaultLightingQty(), ...(prev.lightingQty ?? {}) };
      const cur = Math.max(0, Math.floor(Number(base[id]) || 0));
      if (delta < 0 && cur === 0 && getLightingEffectiveQty(prev, id) > 0) {
        const measures = { ...prev.lightingMeasures, [id]: emptyMedidas() };
        return {
          ...prev,
          lightingMeasures: measures,
          lightingSelectedIds: computeLightingSelectedIds({
            lightingQty: base,
            lightingMeasures: measures,
          }),
        };
      }
      const nextQty = Math.min(999, Math.max(0, cur + delta));
      base[id] = nextQty;
      const nextMeasures = { ...prev.lightingMeasures };
      return {
        ...prev,
        lightingQty: base,
        lightingMeasures: nextMeasures,
        lightingSelectedIds: computeLightingSelectedIds({
          lightingQty: base,
          lightingMeasures: nextMeasures,
        }),
      };
    });
  }, []);

  const updateSpecialAccessoryQty = useCallback((id: string, delta: number) => {
    setLevantamiento((prev) => {
      const map = { ...(prev.specialAccessoriesQty ?? {}) };
      const cur = Math.max(0, Math.floor(Number(map[id]) || 0));
      const nextQty = Math.min(999, Math.max(0, cur + delta));
      map[id] = nextQty;
      return { ...prev, specialAccessoriesQty: map };
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
    const taskId = window.localStorage.getItem(activeCitaTaskStorageKey);
    if (taskId) {
      setActiveCitaTaskId(taskId);
      const stored = window.localStorage.getItem(kanbanStorageKey);
      if (stored) {
        try {
          const tasks = JSON.parse(stored) as KanbanTask[];
          const task = tasks.find((t) => t.id === taskId);
          if (task) {
            setActiveCitaTask(task);
            const initialValues = getSectionAInitialValues(task);

            if (initialValues.clientName) setClientName(initialValues.clientName);
            if (initialValues.projectType) setProjectType(initialValues.projectType);
            if (initialValues.location) setLocation(initialValues.location);
            if (initialValues.largo) setLargo(initialValues.largo);
            if (initialValues.alto) setAlto(initialValues.alto);
            if (initialValues.deliveryWeeksMin) setDeliveryWeeksMin(initialValues.deliveryWeeksMin);
            if (initialValues.deliveryWeeksMax) setDeliveryWeeksMax(initialValues.deliveryWeeksMax);
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
      costoAccesoriosEspeciales: metrics.costoAccesoriosEspeciales,
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
    const stored = window.localStorage.getItem(kanbanStorageKey);

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
        const existing = window.localStorage.getItem(projectKey);
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
        estadoProyecto: ESTADO_PROYECTO.EN_PROCESO,
        pagos: defaultPagosForInversion(0),
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
        window.localStorage.setItem(projectKey, JSON.stringify(seguimientoProject));
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
    saveKanbanTasksToLocalStorage(updatedTasksWithStage);
    window.localStorage.removeItem(activeCitaTaskStorageKey);
    const returnUrl = window.localStorage.getItem(citaReturnUrlStorageKey);
    window.localStorage.removeItem(citaReturnUrlStorageKey);
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
    setSelectedCubierta(null);
    setSelectedFrenteIds([]);
    setSelectedHerraje(null);
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
  };

  const metrics = useMemo(() => {
    return buildLevantamientoMetrics({
      largo,
      selectedCubierta,
      selectedFrenteIds,
      selectedHerraje,
      materialCatalog,
      levantamientoConfig,
      levantamiento,
      selectedScenario,
    });
  }, [
    largo,
    selectedCubierta,
    selectedFrenteIds,
    selectedHerraje,
    levantamiento,
    selectedScenario,
    levantamientoConfig,
  ]);

  const selectedSummary = useMemo(() => {
    return buildShowroomSelectionSummary({
      largo,
      selectedCubierta,
      selectedFrenteIds,
      selectedHerraje,
      materialCatalog,
    });
  }, [largo, selectedCubierta, selectedFrenteIds, selectedHerraje]);

  const scenarioOptions = LEVANTAMIENTO_SCENARIO_OPTIONS;

  const scenarioRangeLabel = metrics.rangeLabel;

  const materialUnitPriceByCategory = useMemo(() => {
    const mats = levantamientoConfig.materiales;
    const mk =
      (categoria: MaterialCategoria) =>
      (option: MaterialOption): number =>
        resolvePrecioPorMetroForShowroomSelection(mats, categoria, {
          id: option.id,
          name: option.name,
        });
    return {
      cubiertas: mk("cubierta"),
      frentes: mk("frente"),
      herrajes: mk("herraje"),
    };
  }, [levantamientoConfig.materiales]);

  const handleGeneratePdf = () => {
    const data = buildPreliminarDataFromForm();
    downloadPreliminarPdf(data, "levantamiento-detallado.pdf");
  };

  const applianceStepMeta = useMemo(() => {
    const isOtro = applianceStep >= APPLIANCE_OTRO_STEP_INDEX;
    if (isOtro) return { isOtro: true as const, progress: null };
    return { isOtro: false as const, progress: getApplianceCategoryProgress(applianceStep) };
  }, [applianceStep]);

  const currentApplianceItem =
    applianceStep < APPLIANCE_OTRO_STEP_INDEX ? APPLIANCE_ITEMS[applianceStep] : null;

  const applianceSearchNorm = applianceSearch.trim().toLowerCase();
  const filteredApplianceMatches = useMemo(() => {
    if (!applianceSearchNorm) return null;
    return APPLIANCE_ITEMS.map((item, idx) => ({ item, idx })).filter(({ item }) => {
      const hay = `${item.label} ${item.hint ?? ""} ${item.categoria ?? ""}`.toLowerCase();
      return hay.includes(applianceSearchNorm);
    });
  }, [applianceSearchNorm]);

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
      const entries = APPLIANCE_ITEMS.map((item, idx) => ({ item, idx })).filter(({ item }) =>
        matchesSearch(item),
      );
      return entries.length ? [{ key: "busqueda", title: "Resultados de búsqueda", entries }] : [];
    }
    return APPLIANCE_CATEGORIAS.map((cat) => {
      const entries = APPLIANCE_ITEMS.map((item, idx) => ({ item, idx })).filter(
        ({ item }) => item.categoria === cat,
      );
      return { key: cat, title: cat, entries };
    }).filter((row) => row.entries.length > 0);
  }, [applianceSearchNorm]);

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

  const specialAccessoryDetailItem = useMemo(() => {
    if (!specialAccessoriesFocusedId) return null;
    return SPECIAL_ACCESSORIES_ITEMS.find((i) => i.id === specialAccessoriesFocusedId) ?? null;
  }, [specialAccessoriesFocusedId]);

  const specialAccessoryModalNavIds = useMemo(
    () => SPECIAL_ACCESSORIES_ITEMS.map((i) => i.id),
    [],
  );

  useEffect(() => {
    if (
      specialAccessoriesFocusedId &&
      !SPECIAL_ACCESSORIES_ITEMS.some((i) => i.id === specialAccessoriesFocusedId)
    ) {
      setSpecialAccessoriesFocusedId(null);
    }
  }, [specialAccessoriesFocusedId]);

  useEffect(() => {
    const n = levantamiento.wallSlotCount;
    if (n <= 0) return;
    setCurrentWallIndex((i) => (i >= n ? n - 1 : i));
  }, [levantamiento.wallSlotCount]);

  const allProjectWallsComplete = useMemo(() => {
    if (levantamiento.wallMedidasModoLibre === true) {
      const o = levantamiento.wallOtro;
      return o.descripcion.trim() !== "" && medidasCamposTieneValor(o);
    }
    const n = levantamiento.wallSlotCount;
    if (!n) return false;
    return Array.from({ length: n }, (_, i) => wallSlotIsComplete(levantamiento.wallMeasures[wallSlotKey(i)])).every(
      Boolean,
    );
  }, [
    levantamiento.wallMedidasModoLibre,
    levantamiento.wallOtro,
    levantamiento.wallSlotCount,
    levantamiento.wallMeasures,
  ]);

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
        <DashboardBackButton href="/admin" preferCitaReturnUrl />
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

        <SectionCard>
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
        </SectionCard>

        <SectionCard>
          <div className="space-y-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
                Sección B · Medidas de paredes
              </p>
              <p className="mt-2 text-sm text-secondary">
                Indica <strong className="font-semibold text-primary">cuántas paredes</strong> tiene el espacio (hasta
                cuatro) y usa el <strong className="font-semibold text-primary">croquis</strong> para elegir en cuál
                trabajas. Luego define el tipo (recta, ventana, etc.) y las{" "}
                <strong className="font-semibold text-primary">cotas</strong> del tipo elegido. Si la planta no se
                describe bien con hasta cuatro muros del catálogo, usa{" "}
                <strong className="font-semibold text-primary">«Otra situación de muros»</strong>: texto libre y medidas
                de referencia en metros. En obras, «<strong className="font-semibold text-primary">vano</strong>» es el{" "}
                <strong className="font-semibold text-primary">hueco</strong> de puerta o ventana.
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
                  Elige de 1 a 4 para el flujo por pared y croquis. Podrás cambiar después (se pedirá confirmación si ya
                  había datos). Si no aplica, elige «Otra situación de muros».
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
                    if (!allProjectWallsComplete) {
                      window.alert(
                        "Escribe una descripción de la situación y al menos una medida de referencia (ancho, alto o fondo) en metros.",
                      );
                      return;
                    }
                    document.getElementById("seccion-electrodomesticos")?.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    });
                  }}
                  className="w-full rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-emerald-700"
                >
                  {allProjectWallsComplete
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
                const wallFieldsWithIndex: WallFieldWithIndex[] = wallFields.map((field, index) => ({
                  field,
                  index,
                }));
                const wallFieldGroups = groupWallFieldsByPriority(
                  wallFieldsWithIndex,
                  item?.id ?? selectedTypeId,
                );
                const canGoNext = currentWallIndex < levantamiento.wallSlotCount - 1;
                const totalWallSlots = levantamiento.wallSlotCount;
                return (
                  <div className="space-y-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="rounded-full border border-primary/15 bg-primary/[0.05] px-4 py-2 text-sm font-semibold tabular-nums text-primary">
                        Pared {currentWallIndex + 1} de {totalWallSlots}
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

                    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Seleccionar pared">
                      {Array.from({ length: totalWallSlots }).map((_, index) => {
                        const wIndex = index + 1;
                        const isSelected = currentWallIndex === index;
                        const isComplete = wallSlotIsComplete(
                          levantamiento.wallMeasures[wallSlotKey(index)] ?? {},
                        );

                        return (
                          <button
                            key={wIndex}
                            type="button"
                            role="tab"
                            aria-selected={isSelected}
                            onClick={() => setCurrentWallIndex(index)}
                            className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition ${
                              isSelected
                                ? "bg-[#8B1C1C] text-white shadow-md"
                                : isComplete
                                  ? "border border-[#8B1C1C]/30 bg-[#8B1C1C]/5 text-[#8B1C1C] hover:bg-[#8B1C1C]/10"
                                  : "border border-primary/15 bg-white text-primary hover:border-primary/30 hover:bg-stone-50"
                            }`}
                          >
                            {isComplete ? (
                              <CheckCircle2
                                className={`h-4 w-4 shrink-0 ${isSelected ? "text-white" : "text-[#8B1C1C]"}`}
                                aria-hidden
                              />
                            ) : null}
                            Pared {wIndex}
                          </button>
                        );
                      })}
                    </div>

                    <InteractiveCroquis
                      wallCount={totalWallSlots}
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
                                  className="rounded-2xl border border-primary/10 bg-white text-left shadow-md transition hover:-translate-y-0.5 hover:border-[#8B1C1C]/35 hover:shadow-lg"
                                >
                                  <div className="relative flex min-h-[160px] items-center justify-center bg-primary/[0.05] p-4">
                                    <WallTypeIcon wallId={wItem.id} className="h-auto w-full max-h-[180px] text-primary" />
                                    <span className="pointer-events-none absolute bottom-3 left-3 z-[4] rounded-lg bg-black/55 px-2 py-1 text-[10px] font-semibold text-white">
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
                            <div className="relative min-h-[400px] w-full min-w-0 lg:max-w-none lg:min-h-[480px]">
                              <div className="relative flex h-full min-h-[inherit] items-center justify-center overflow-visible rounded-2xl border border-primary/10 bg-primary/5 p-6 lg:p-8">
                                <WallTypeIcon
                                  wallId={item.id}
                                  focusedGroup={focusedWallGroup}
                                  className="h-auto w-full max-h-[560px] shrink-0 text-primary"
                                />
                                <span className="pointer-events-none absolute bottom-4 left-4 z-[4] rounded-lg bg-black/55 px-2 py-1 text-[10px] font-semibold text-white">
                                  {item.label}
                                </span>
                              </div>
                            </div>
                            <div className="min-w-0 space-y-3">
                              {wallFieldGroups.map((group) => (
                                <div
                                  key={group.id}
                                  tabIndex={-1}
                                  onFocusCapture={() => setFocusedWallGroup(group.id)}
                                  onBlurCapture={(e) => {
                                    const next = e.relatedTarget as Node | null;
                                    if (next && e.currentTarget.contains(next)) return;
                                    setFocusedWallGroup(null);
                                  }}
                                  className="rounded-2xl border border-primary/10 bg-stone-50/70 p-2.5 outline-none ring-[#8B1C1C]/25 focus-within:ring-2"
                                >
                                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8B1C1C]">
                                    {group.title}
                                  </p>
                                  <p className="mt-0.5 text-[10px] text-secondary">{group.hint}</p>
                                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                                    {group.fields.map(({ field, index: fi }) => (
                                      <label
                                        key={field.key}
                                        className={`block text-[9px] font-semibold uppercase tracking-[0.1em] text-secondary ${
                                          item.id === "pared-otro" && field.key === "descripcion" ? "sm:col-span-2" : ""
                                        }`}
                                      >
                                        <span className="mb-0.5 block normal-case tracking-normal">
                                          <span className="font-bold text-primary">
                                            {field.acronimo ?? wallMeasureLetter(fi)}
                                          </span>
                                          <span> · {field.label}</span>
                                          {item.id === "pared-otro" && field.key === "descripcion" ? null : (
                                            <span className="font-normal text-secondary/80"> (m)</span>
                                          )}
                                        </span>
                                        {item.id === "pared-otro" && field.key === "descripcion" ? (
                                          <textarea
                                            value={m[field.key] ?? ""}
                                            onChange={(e) =>
                                              patchWallSlotField(currentWallIndex, field.key, e.target.value)
                                            }
                                            rows={3}
                                            className="mt-1 w-full resize-y rounded-xl border border-primary/10 bg-white px-2.5 py-1.5 text-sm font-normal outline-none placeholder:text-secondary/45"
                                          />
                                        ) : (
                                          <input
                                            value={m[field.key] ?? ""}
                                            onChange={(e) =>
                                              patchWallSlotField(currentWallIndex, field.key, e.target.value)
                                            }
                                            inputMode="decimal"
                                            className="mt-1 w-full rounded-xl border border-primary/10 bg-white px-2.5 py-1.5 text-sm outline-none"
                                          />
                                        )}
                                      </label>
                                    ))}
                                  </div>
                                </div>
                              ))}
                              {wallFieldGroups.length === 0 ? (
                                <div className="rounded-2xl border border-primary/10 bg-primary/5 px-3 py-2 text-xs text-secondary">
                                  Selecciona un tipo de pared para capturar cotas.
                                </div>
                              ) : null}
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
                Cada electrodoméstico muestra una{" "}
                <span className="font-medium text-primary/90">foto grande en vertical</span> con el nombre abajo.
                Pulsa la foto para ver la ficha. Marca si ese equipo debe{" "}
                <span className="font-medium text-primary/90">salir en el PDF</span> del levantamiento; las medidas en
                metros son opcionales pero ayudan mucho. El catálogo va en este orden: refrigeradores; estufas y tarjas;
                microondas, parrillas y campanas; y al final{" "}
                <span className="font-medium text-primary/90">Otros</span> (cafetera, lavavajillas, freidora de aire,
                horno de gas, tostadora, dispensador de agua, enfriador de vinos, tarja extra).
              </p>
            </div>
            {!applianceBrowseMode ? (
              <div className="space-y-5">
                <button
                  type="button"
                  onClick={() => {
                    setApplianceBrowseMode(true);
                    setTimeout(() => {
                      if (typeof window === "undefined") return;
                      window.scrollTo({
                        top: catalogScrollPositions.current.appliance,
                        behavior: "instant" as ScrollBehavior,
                      });
                    }, 0);
                  }}
                  className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-white px-4 py-2 text-sm font-semibold text-[#8B1C1C] transition hover:border-primary/30"
                >
                  <ChevronLeft className="h-4 w-4 shrink-0" />
                  Volver al catálogo
                </button>
                {currentApplianceItem ? (
                  <div
                    className={
                      currentApplianceItem.categoria === "Tarjas"
                        ? "grid gap-6 lg:grid-cols-[minmax(0,36rem)_1fr]"
                        : currentApplianceItem.id === "estufa-compacta" ||
                            currentApplianceItem.id === "parrilla-mixta"
                          ? "grid gap-6 lg:grid-cols-[minmax(0,36rem)_1fr]"
                          : currentApplianceItem.id === "parrilla-domino"
                            ? "grid gap-6 lg:grid-cols-[minmax(0,31.7rem)_1fr]"
                            : currentApplianceItem.categoria === "Campanas"
                            ? "grid gap-6 lg:grid-cols-[minmax(0,28rem)_1fr]"
                            : "grid gap-6 lg:grid-cols-[minmax(0,280px)_1fr]"
                    }
                  >
                    <div
                      className={
                        currentApplianceItem.categoria === "Tarjas"
                          ? "relative mx-auto aspect-[3/2] w-full max-w-[min(35rem,92vw)] overflow-hidden rounded-2xl border border-primary/10 bg-zinc-950 lg:mx-0"
                          : currentApplianceItem.id === "estufa-compacta" ||
                              currentApplianceItem.id === "parrilla-mixta"
                            ? "relative mx-auto h-[calc(min(20rem,92vw)*3/2)] w-full max-w-[min(34rem,96vw)] overflow-hidden rounded-2xl border border-primary/10 bg-zinc-950 lg:mx-0"
                            : currentApplianceItem.id === "parrilla-domino"
                              ? "relative mx-auto h-[calc(min(20rem,92vw)*3/2)] w-full max-w-[min(29.9rem,85vw)] overflow-hidden rounded-2xl border border-primary/10 bg-zinc-950 lg:mx-0"
                            : currentApplianceItem.categoria === "Campanas"
                              ? "relative mx-auto aspect-[40/39] w-full max-w-[min(26rem,92vw)] overflow-hidden rounded-2xl border border-primary/10 bg-zinc-950 lg:mx-0"
                              : "relative mx-auto aspect-[2/3] w-full max-w-[min(20rem,92vw)] overflow-hidden rounded-2xl border border-primary/10 bg-white lg:mx-0"
                      }
                    >
                      <ApplianceTypeImage
                        key={currentApplianceItem.id}
                        item={currentApplianceItem}
                        alt=""
                        className={
                          currentApplianceItem.categoria === "Tarjas"
                            ? "absolute inset-0 z-0 h-full w-full object-cover object-center"
                            : currentApplianceItem.id === "estufa-compacta" ||
                                currentApplianceItem.id === "parrilla-mixta"
                              ? "absolute inset-0 z-0 box-border h-full w-full object-contain object-center p-4 sm:p-8"
                              : currentApplianceItem.id === "parrilla-domino"
                                ? "absolute inset-0 z-0 h-full w-full object-cover object-center"
                                : currentApplianceItem.categoria === "Campanas"
                                ? "absolute inset-0 z-0 h-full w-full object-cover object-[center_40%]"
                                : "absolute inset-0 z-0 box-border h-full w-full object-contain object-center p-2"
                        }
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
                            title={`${item.categoria ?? ""} — ${item.label}`}
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
                        <HorizontalScrollStrip
                          scrollClassName={streamScrollClass}
                          scrollContainerRef={(el) => {
                            applianceRowRefs.current[row.key] = el;
                          }}
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
                                <div className={streamPosterClass(applianceStep === idx, item)}>
                                  <ApplianceTypeImage
                                    key={item.id}
                                    item={item}
                                    alt=""
                                    className={applianceStreamCatalogThumbClass(item)}
                                  />
                                  <div className={streamPosterTitleOverlay}>
                                    <p className={streamPosterLabelClass}>{item.label}</p>
                                  </div>
                                </div>
                              </button>
                            </div>
                          ))}
                        </HorizontalScrollStrip>
                      </div>
                    ))}
                    <div className={streamRowShell}>
                      <div className="mb-4">
                        <p className={streamRowHeading}>Otro</p>
                        <p className={streamRowHint}>No listado en catálogo</p>
                      </div>
                      <HorizontalScrollStrip scrollClassName={streamScrollClass}>
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
                      </HorizontalScrollStrip>
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
                    <HorizontalScrollStrip
                      scrollClassName={streamScrollClass}
                      scrollContainerRef={(el) => {
                        applianceRowRefs.current.busqueda = el;
                      }}
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
                            <div className={streamPosterClass(applianceStep === idx, item)}>
                              <ApplianceTypeImage
                                key={item.id}
                                item={item}
                                alt=""
                                className={applianceStreamCatalogThumbClass(item)}
                              />
                              <div className={streamPosterTitleOverlay}>
                                <p className={streamPosterLabelClass}>{item.label}</p>
                              </div>
                            </div>
                          </button>
                        </div>
                      ))}
                    </HorizontalScrollStrip>
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
            <div className="rounded-2xl border border-primary/10 bg-white/90 p-4">
              <input
                value={materialSearch}
                onChange={(event) => setMaterialSearch(event.target.value)}
                placeholder="Buscar material..."
                className="w-full rounded-2xl border border-primary/10 bg-white px-4 py-2.5 text-sm outline-none"
              />
            </div>
            <MaterialGrid
              title="Cubiertas"
              options={materialCatalog.cubiertas}
              selectedId={selectedCubierta}
              onSelect={setSelectedCubierta}
              category="cubiertas"
              largoLineal={metrics.largoValue}
              materialSearch={materialSearch}
              unitPricePerM={materialUnitPriceByCategory.cubiertas}
            />
            <MaterialGrid
              title="Frentes / Material base"
              options={materialCatalog.frentes}
              multiSelect
              selectedIds={selectedFrenteIds}
              onToggle={toggleFrente}
              category="frentes"
              largoLineal={metrics.largoValue}
              materialSearch={materialSearch}
              unitPricePerM={materialUnitPriceByCategory.frentes}
              splitLinearAmongSelections
            />
            <MaterialGrid
              title="Herrajes"
              options={materialCatalog.herrajes}
              selectedId={selectedHerraje}
              onSelect={setSelectedHerraje}
              category="herrajes"
              largoLineal={metrics.largoValue}
              materialSearch={materialSearch}
              unitPricePerM={materialUnitPriceByCategory.herrajes}
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
                Sección E · Extras
              </p>
              <p className="mt-2 text-sm text-secondary">
                Iluminación y accesorios especiales (Alexa, botelleros, etc.). Clic en el póster activa o anula (1
                unidad); usa + / − para varias unidades del mismo tipo. «Medidas opcionales» abre el detalle. Los
                importes de estos extras los define el equipo en configuración interna (no se muestran aquí al
                cliente).
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
                </div>
              </div>
            ) : !lightingBrowseMode && lightingDetailItem ? (
              <div className="space-y-5">
                <button
                  type="button"
                  onClick={() => {
                    setLightingBrowseMode(true);
                    setLightingFocusedId(null);
                    setTimeout(() => {
                      if (typeof window === "undefined") return;
                      window.scrollTo({
                        top: catalogScrollPositions.current.lighting,
                        behavior: "instant" as ScrollBehavior,
                      });
                    }, 0);
                  }}
                  className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-white px-4 py-2 text-sm font-semibold text-[#8B1C1C] transition hover:border-primary/30"
                >
                  <ChevronLeft className="h-4 w-4 shrink-0" />
                  Volver al catálogo
                </button>
                <div className="grid gap-6 lg:grid-cols-[minmax(0,240px)_1fr]">
                  <div className="relative mx-auto aspect-[2/3] w-full max-w-[min(20rem,92vw)] overflow-hidden rounded-2xl border border-primary/10 bg-white lg:mx-0">
                    <LightingTypeImage
                      key={lightingDetailItem.id}
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
                        checked={getLightingEffectiveQty(levantamiento, lightingDetailItem.id) > 0}
                        onChange={(e) => setLightingInDocument(lightingDetailItem.id, e.target.checked)}
                      />
                      <span>Incluir en documento (usa + / − para cantidad)</span>
                    </label>
                    <div className="flex items-center justify-between gap-1 rounded-xl border border-primary/10 bg-white px-1.5 py-1.5 shadow-inner">
                      <button
                        type="button"
                        aria-label={`Menos unidades · ${lightingDetailItem.label}`}
                        disabled={getLightingEffectiveQty(levantamiento, lightingDetailItem.id) <= 0}
                        onClick={() => updateLightingQty(lightingDetailItem.id, -1)}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/15 bg-white text-primary transition hover:bg-primary/[0.06] disabled:opacity-35"
                      >
                        <Minus className="h-4 w-4" strokeWidth={2.5} />
                      </button>
                      <span className="min-w-[2rem] text-center text-sm font-semibold tabular-nums text-primary">
                        {getLightingEffectiveQty(levantamiento, lightingDetailItem.id)}
                      </span>
                      <button
                        type="button"
                        aria-label={`Más unidades · ${lightingDetailItem.label}`}
                        disabled={getLightingEffectiveQty(levantamiento, lightingDetailItem.id) >= 999}
                        onClick={() => updateLightingQty(lightingDetailItem.id, 1)}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/15 bg-white text-primary transition hover:bg-primary/[0.06] disabled:opacity-35"
                      >
                        <Plus className="h-4 w-4" strokeWidth={2.5} />
                      </button>
                    </div>
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
                    <HorizontalScrollStrip
                      scrollClassName={streamScrollClass}
                      scrollContainerRef={(el) => {
                        lightingRowRefs.current.busqueda = el;
                      }}
                    >
                      {filteredLightingItems.map((item, rank) => (
                        <div key={item.id} className={streamCatalogItemRowClass}>
                          <div className={streamRankColumnClass} aria-hidden>
                            <span className={streamRankNumberClass}>{rank + 1}</span>
                          </div>
                          <div className="flex w-[min(10.5rem,52vw)] shrink-0 flex-col items-stretch gap-2 sm:w-[min(12.5rem,38vw)]">
                            <button
                              type="button"
                              onClick={() => toggleLightingSelected(item.id)}
                              className="text-left"
                              title="Clic para activar (1 u.) o anular · + / − para varios"
                            >
                              <div
                                className={streamPosterClass(
                                  getLightingEffectiveQty(levantamiento, item.id) > 0,
                                )}
                              >
                                <LightingTypeImage
                                  key={item.id}
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
                                if (typeof window !== "undefined") {
                                  catalogScrollPositions.current.lighting = window.scrollY;
                                }
                                setLightingFocusedId(item.id);
                                setLightingBrowseMode(false);
                                setTimeout(() => {
                                  if (typeof window !== "undefined" && lightingSectionRef.current) {
                                    const absoluteY =
                                      lightingSectionRef.current.getBoundingClientRect().top + window.scrollY;
                                    window.scrollTo({ top: absoluteY - 80, behavior: "instant" as ScrollBehavior });
                                  }
                                }, 10);
                              }}
                            >
                              Medidas opcionales
                            </button>
                            <div className="flex items-center justify-between gap-1 rounded-xl border border-white/10 bg-zinc-900/90 px-1.5 py-1.5 shadow-inner">
                              <button
                                type="button"
                                aria-label={`Menos ${item.label}`}
                                disabled={getLightingEffectiveQty(levantamiento, item.id) <= 0}
                                onClick={() => updateLightingQty(item.id, -1)}
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-zinc-800 text-zinc-100 transition hover:bg-zinc-700 disabled:opacity-35"
                              >
                                <Minus className="h-4 w-4" strokeWidth={2.5} />
                              </button>
                              <span className="min-w-[2rem] text-center text-sm font-semibold tabular-nums text-white">
                                {getLightingEffectiveQty(levantamiento, item.id)}
                              </span>
                              <button
                                type="button"
                                aria-label={`Más ${item.label}`}
                                disabled={getLightingEffectiveQty(levantamiento, item.id) >= 999}
                                onClick={() => updateLightingQty(item.id, 1)}
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-zinc-800 text-zinc-100 transition hover:bg-zinc-700 disabled:opacity-35"
                              >
                                <Plus className="h-4 w-4" strokeWidth={2.5} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </HorizontalScrollStrip>
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
                    <p className={streamRowHint}>+ / − para cantidad por tipo · importes solo en configuración interna</p>
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
                <HorizontalScrollStrip
                  scrollClassName={streamScrollClass}
                  scrollContainerRef={(el) => {
                    lightingRowRefs.current.catalogo = el;
                  }}
                >
                  {LIGHTING_ITEMS.map((item, rank) => (
                    <div key={item.id} className={streamCatalogItemRowClass}>
                      <div className={streamRankColumnClass} aria-hidden>
                        <span className={streamRankNumberClass}>{rank + 1}</span>
                      </div>
                      <div className="flex w-[min(10.5rem,52vw)] shrink-0 flex-col items-stretch gap-2 sm:w-[min(12.5rem,38vw)]">
                        <button
                          type="button"
                          onClick={() => toggleLightingSelected(item.id)}
                          className="text-left"
                          title="Clic para activar (1 u.) o anular · + / − para varios"
                        >
                          <div
                            className={streamPosterClass(
                              getLightingEffectiveQty(levantamiento, item.id) > 0,
                            )}
                          >
                            <LightingTypeImage
                              key={item.id}
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
                            if (typeof window !== "undefined") {
                              catalogScrollPositions.current.lighting = window.scrollY;
                            }
                            setLightingFocusedId(item.id);
                            setLightingBrowseMode(false);
                            setTimeout(() => {
                              if (typeof window !== "undefined" && lightingSectionRef.current) {
                                const absoluteY =
                                  lightingSectionRef.current.getBoundingClientRect().top + window.scrollY;
                                window.scrollTo({ top: absoluteY - 80, behavior: "instant" as ScrollBehavior });
                              }
                            }, 10);
                          }}
                        >
                          Medidas opcionales
                        </button>
                        <div className="flex items-center justify-between gap-1 rounded-xl border border-white/10 bg-zinc-900/90 px-1.5 py-1.5 shadow-inner">
                          <button
                            type="button"
                            aria-label={`Menos ${item.label}`}
                            disabled={getLightingEffectiveQty(levantamiento, item.id) <= 0}
                            onClick={() => updateLightingQty(item.id, -1)}
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-zinc-800 text-zinc-100 transition hover:bg-zinc-700 disabled:opacity-35"
                          >
                            <Minus className="h-4 w-4" strokeWidth={2.5} />
                          </button>
                          <span className="min-w-[2rem] text-center text-sm font-semibold tabular-nums text-white">
                            {getLightingEffectiveQty(levantamiento, item.id)}
                          </span>
                          <button
                            type="button"
                            aria-label={`Más ${item.label}`}
                            disabled={getLightingEffectiveQty(levantamiento, item.id) >= 999}
                            onClick={() => updateLightingQty(item.id, 1)}
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-zinc-800 text-zinc-100 transition hover:bg-zinc-700 disabled:opacity-35"
                          >
                            <Plus className="h-4 w-4" strokeWidth={2.5} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className={streamCatalogItemRowClass}>
                    <div className={streamRankColumnClass} aria-hidden>
                      <span className={streamRankNumberClass}>{LIGHTING_ITEMS.length + 1}</span>
                    </div>
                    <div className="flex w-[min(10.5rem,52vw)] shrink-0 flex-col items-stretch gap-2 sm:w-[min(12.5rem,38vw)]">
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
                </HorizontalScrollStrip>
              </div>
            )}
            {!specialAccessoriesBrowseMode && specialAccessoryDetailItem ? (
              <div className="space-y-5">
                <button
                  type="button"
                  onClick={() => {
                    setSpecialAccessoriesBrowseMode(true);
                    setSpecialAccessoriesFocusedId(null);
                    setTimeout(() => {
                      if (typeof window === "undefined") return;
                      window.scrollTo({
                        top: catalogScrollPositions.current.specialAccessories,
                        behavior: "instant" as ScrollBehavior,
                      });
                    }, 0);
                  }}
                  className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-white px-4 py-2 text-sm font-semibold text-[#8B1C1C] transition hover:border-primary/30"
                >
                  <ChevronLeft className="h-4 w-4 shrink-0" />
                  Volver al catálogo
                </button>
                <div className="grid gap-6 lg:grid-cols-[minmax(0,240px)_1fr]">
                  <div className="relative mx-auto aspect-[2/3] w-full max-w-[min(20rem,92vw)] overflow-hidden rounded-2xl border border-primary/10 bg-white lg:mx-0">
                    <img
                      src={specialAccessoryDetailItem.image}
                      alt=""
                      className="absolute inset-0 z-0 h-full w-full object-cover object-center"
                    />
                    <span className="pointer-events-none absolute bottom-2 left-2 z-10 rounded-lg bg-black/55 px-2 py-1 text-[10px] font-semibold text-white">
                      {specialAccessoryDetailItem.label}
                    </span>
                  </div>
                  <div className="space-y-3">
                    <p className="text-base font-semibold text-primary">{specialAccessoryDetailItem.label}</p>
                    <p className="text-xs text-secondary">
                      Cantidad con + / − · medidas opcionales para referencia en documentación.
                    </p>
                    <div className="flex items-center justify-between gap-1 rounded-xl border border-primary/10 bg-white px-1.5 py-1.5 shadow-inner">
                      <button
                        type="button"
                        aria-label={`Menos unidades · ${specialAccessoryDetailItem.label}`}
                        disabled={
                          Math.max(
                            0,
                            Math.floor(Number(levantamiento.specialAccessoriesQty?.[specialAccessoryDetailItem.id]) || 0),
                          ) <= 0
                        }
                        onClick={() => updateSpecialAccessoryQty(specialAccessoryDetailItem.id, -1)}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/15 bg-white text-primary transition hover:bg-primary/[0.06] disabled:opacity-35"
                      >
                        <Minus className="h-4 w-4" strokeWidth={2.5} />
                      </button>
                      <span className="min-w-[2rem] text-center text-sm font-semibold tabular-nums text-primary">
                        {Math.max(
                          0,
                          Math.floor(
                            Number(levantamiento.specialAccessoriesQty?.[specialAccessoryDetailItem.id]) || 0,
                          ),
                        )}
                      </span>
                      <button
                        type="button"
                        aria-label={`Más unidades · ${specialAccessoryDetailItem.label}`}
                        disabled={
                          Math.max(
                            0,
                            Math.floor(Number(levantamiento.specialAccessoriesQty?.[specialAccessoryDetailItem.id]) || 0),
                          ) >= 999
                        }
                        onClick={() => updateSpecialAccessoryQty(specialAccessoryDetailItem.id, 1)}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/15 bg-white text-primary transition hover:bg-primary/[0.06] disabled:opacity-35"
                      >
                        <Plus className="h-4 w-4" strokeWidth={2.5} />
                      </button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      {(["ancho", "alto", "fondo"] as const).map((field) => {
                        const m =
                          levantamiento.specialAccessoriesMeasures[specialAccessoryDetailItem.id] ?? {
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
                                patchMedidasMap(
                                  "specialAccessoriesMeasures",
                                  specialAccessoryDetailItem.id,
                                  field,
                                  e.target.value,
                                )
                              }
                              inputMode="decimal"
                              className="mt-1.5 w-full rounded-2xl border border-primary/10 bg-white px-3 py-2.5 text-sm outline-none"
                            />
                          </label>
                        );
                      })}
                    </div>
                    {specialAccessoryModalNavIds.length > 1 ? (
                      <div className="flex flex-wrap gap-2 border-t border-primary/10 pt-4">
                        <button
                          type="button"
                          onClick={() => {
                            const pos = specialAccessoryModalNavIds.indexOf(specialAccessoriesFocusedId!);
                            if (pos > 0) setSpecialAccessoriesFocusedId(specialAccessoryModalNavIds[pos - 1]!);
                          }}
                          disabled={
                            !specialAccessoriesFocusedId ||
                            specialAccessoryModalNavIds.indexOf(specialAccessoriesFocusedId) <= 0
                          }
                          className="inline-flex items-center gap-1 rounded-full border border-primary/15 px-3 py-2 text-xs font-semibold text-primary disabled:opacity-40"
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Anterior
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const pos = specialAccessoriesFocusedId
                              ? specialAccessoryModalNavIds.indexOf(specialAccessoriesFocusedId)
                              : -1;
                            if (pos < specialAccessoryModalNavIds.length - 1) {
                              setSpecialAccessoriesFocusedId(specialAccessoryModalNavIds[pos + 1]!);
                            }
                          }}
                          disabled={
                            !specialAccessoriesFocusedId ||
                            specialAccessoryModalNavIds.indexOf(specialAccessoriesFocusedId) >=
                              specialAccessoryModalNavIds.length - 1
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
            ) : (
              <div className={streamRowShell}>
                <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <p className={streamRowHeading}>Accesorios de Organización y Tecnología</p>
                    <p className={streamRowHint}>
                      Cantidades con + / − · precios unitarios solo en configuración (interno)
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const el = lightingRowRefs.current.accesoriosCatalogo;
                      if (el) el.scrollTo({ left: el.scrollWidth, behavior: "smooth" });
                    }}
                    className={streamVerTodosClass}
                  >
                    Ver todos
                  </button>
                </div>
                <HorizontalScrollStrip
                  scrollClassName={streamScrollClass}
                  scrollContainerRef={(el) => {
                    lightingRowRefs.current.accesoriosCatalogo = el;
                  }}
                >
                  {SPECIAL_ACCESSORIES_ITEMS.map((item, rank) => {
                    const qty = Math.max(
                      0,
                      Math.floor(Number(levantamiento.specialAccessoriesQty?.[item.id]) || 0),
                    );
                    return (
                      <div key={item.id} className="flex shrink-0 items-end gap-1">
                        <span className={streamRankClass} aria-hidden>
                          {rank + 1}
                        </span>
                        <div className="flex w-[min(10.5rem,52vw)] shrink-0 flex-col items-stretch gap-2 sm:w-[min(12.5rem,38vw)]">
                          <div
                            className={`relative z-10 aspect-[2/3] w-full shrink-0 overflow-hidden rounded-lg bg-zinc-900 shadow-xl ring-1 ring-white/10`}
                          >
                            <img
                              src={item.image}
                              alt=""
                              className="absolute inset-0 z-0 h-full w-full object-cover object-center"
                            />
                            <div className={streamPosterTitleOverlay}>
                              <p className={streamPosterLabelClass}>{item.label}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            className="text-[10px] font-semibold text-[#8B1C1C] underline-offset-2 hover:underline"
                            onClick={() => {
                              if (typeof window !== "undefined") {
                                catalogScrollPositions.current.specialAccessories = window.scrollY;
                              }
                              setSpecialAccessoriesFocusedId(item.id);
                              setSpecialAccessoriesBrowseMode(false);
                              setTimeout(() => {
                                if (typeof window !== "undefined" && lightingSectionRef.current) {
                                  const absoluteY =
                                    lightingSectionRef.current.getBoundingClientRect().top + window.scrollY;
                                  window.scrollTo({ top: absoluteY - 80, behavior: "instant" as ScrollBehavior });
                                }
                              }, 10);
                            }}
                          >
                            Medidas opcionales
                          </button>
                          <div className="flex items-center justify-between gap-1 rounded-xl border border-white/10 bg-zinc-900/90 px-1.5 py-1.5 shadow-inner">
                            <button
                              type="button"
                              aria-label={`Menos ${item.label}`}
                              disabled={qty <= 0}
                              onClick={() => updateSpecialAccessoryQty(item.id, -1)}
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-zinc-800 text-zinc-100 transition hover:bg-zinc-700 disabled:opacity-35"
                            >
                              <Minus className="h-4 w-4" strokeWidth={2.5} />
                            </button>
                            <span className="min-w-[2rem] text-center text-sm font-semibold tabular-nums text-white">
                              {qty}
                            </span>
                            <button
                              type="button"
                              aria-label={`Más ${item.label}`}
                              disabled={qty >= 999}
                              onClick={() => updateSpecialAccessoryQty(item.id, 1)}
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-zinc-800 text-zinc-100 transition hover:bg-zinc-700 disabled:opacity-35"
                            >
                              <Plus className="h-4 w-4" strokeWidth={2.5} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </HorizontalScrollStrip>
              </div>
            )}
            <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
              Comentarios de esta sección
              <textarea
                value={levantamiento.sectionComments.e ?? ""}
                onChange={(e) => setSectionComment("e", e.target.value)}
                rows={3}
                placeholder="Circuitos, dimmers, temperatura de color, accesorios…"
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
                necesitas. El importe del escenario es solo referencia (cateo); el total del cliente suma materiales
                reales de la configuración.
              </p>
            </div>
            <div className="grid gap-6 lg:grid-cols-3">
              {scenarioOptions.map((scenario) => {
                const referenciaCateo = resolveScenarioReferenceCateo(
                  scenario.id,
                  largo,
                  levantamientoConfig.scenarioPrices,
                );
                const isActive = selectedScenario === scenario.id;
                return (
                  <button
                    key={scenario.id}
                    type="button"
                    onClick={() => setSelectedScenario(scenario.id)}
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
                      <div className="rounded-2xl bg-primary/5 px-4 py-3 text-center">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-secondary/80">
                          Referencia (cateo)
                        </p>
                        <p className="mt-1 text-lg font-semibold tabular-nums text-[#8B1C1C]">
                          {formatCurrency(referenciaCateo)}
                        </p>
                        <p className="mt-1 text-[10px] text-secondary/90">
                          Precio escenario × largo · no es el subtotal del cliente
                        </p>
                      </div>
                      <p className="text-xs text-secondary">
                        Total y rango con IVA se calculan con materiales seleccionados (panel de cierre).
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
                    <span>Cubiertas</span>
                    <span className="shrink-0 text-primary/90">{formatCurrency(metrics.costoCubiertas)}</span>
                  </div>
                  <div className="flex justify-between gap-3 items-start">
                    <span className="min-w-0">
                      <span className="block">Carpintería</span>
                      {metrics.factorHastaTechoLegendText ? (
                        <span className="mt-0.5 block text-[10px] font-normal normal-case tracking-normal text-secondary/85">
                          {metrics.factorHastaTechoLegendText}
                        </span>
                      ) : null}
                    </span>
                    <span className="shrink-0 text-primary/90">
                      {formatCurrency(metrics.costoFrentes + metrics.costoHerrajes)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span>Extras</span>
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
                  Rango estimado (±{Math.round(metrics.marginPercent * 100)}% sobre total con IVA):{" "}
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
