import type { Herraje, Material } from "@/lib/axios/catalogosApi";
import type { ItemCatalogo } from "@/lib/levantamiento-catalog";

export type MaterialOption = {
  id: string;
  name: string;
  tier: "Estandar" | "Tendencia" | "Premium";
  image: string;
  pricePerM?: number;
};

export type MaterialCategory = "cubiertas" | "frentes" | "herrajes";
export type MaterialTierFilter = "Todos" | MaterialOption["tier"];
export type MaterialCatalogState = Record<MaterialCategory, MaterialOption[]>;

export const normalizeCatalogText = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export const buildSearchText = (...parts: Array<string | undefined>) => normalizeCatalogText(parts.filter(Boolean).join(" "));

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

const resolveMaterialImage = (_name: string, _category: MaterialCategory, fallback?: string) => {
  if (!fallback) return "";
  const src = fallback.trim();
  if (!src) return "";
  if (src.startsWith("/images/")) return "";
  return src;
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

export type BackendCatalogRecord = {
  _id?: string;
  nombre?: string;
  categoria?: string;
  descripcion?: string;
  imagenUrl?: string;
  thumbnailUrl?: string;
  precio?: number;
};

export const emptyMaterialCatalog: MaterialCatalogState = {
  cubiertas: [],
  frentes: [],
  herrajes: [],
};

export const buildMaterialCatalogFromBackend = (materiales: Material[], herrajes: Herraje[]): MaterialCatalogState => {
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
    image: resolveMaterialImage(name, category, resolveBackendImage(raw)),
    pricePerM,
  };
};

export function autoScenarioFromShowroom(
  cubiertaId: string,
  frenteIds: string[],
  herrajeId: string,
  catalog: MaterialCatalogState = emptyMaterialCatalog,
): "esencial" | "tendencia" | "premium" {
  const tierC = catalog.cubiertas.find((item) => item.id === cubiertaId)?.tier ?? "Estandar";
  const tiersF =
    frenteIds.length === 0
      ? ([] as MaterialOption["tier"][])
      : frenteIds.map((id) => catalog.frentes.find((item) => item.id === id)?.tier ?? "Estandar");
  const tierF = tiersF.length === 0 ? "Estandar" : predominantShowroomTier(tiersF);
  const tierH = catalog.herrajes.find((item) => item.id === herrajeId)?.tier ?? "Estandar";
  const winner = predominantShowroomTier([tierC, tierF, tierH]);
  return tierToScenario(winner);
}

function tierToScenario(tier: MaterialOption["tier"]): "esencial" | "tendencia" | "premium" {
  switch (tier) {
    case "Estandar":
      return "esencial";
    case "Tendencia":
      return "tendencia";
    case "Premium":
      return "premium";
  }
}

function predominantShowroomTier(votes: MaterialOption["tier"][]): MaterialOption["tier"] {
  if (votes.length === 0) return "Tendencia";
  const c = { Estandar: 0, Tendencia: 0, Premium: 0 };
  for (const v of votes) c[v]++;
  const max = Math.max(c.Estandar, c.Tendencia, c.Premium);
  const winners = (["Estandar", "Tendencia", "Premium"] as const).filter((k) => c[k] === max);
  if (winners.length !== 1) return "Tendencia";
  return winners[0]!;
}

function readCatalogNumber(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const parsed = Number.parseFloat(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return 0;
}

export { resolveBackendImage, resolveBackendCatalogMatch, resolveMaterialImage, inferCatalogCategory, inferCatalogTier };
