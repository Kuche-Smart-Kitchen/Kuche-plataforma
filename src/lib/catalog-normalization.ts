import {
  type CatalogProject,
  type CatalogProjectInput,
} from "@/lib/catalog-types";

const DEFAULT_HOTSPOT_DETAIL =
  "Detalle disponible durante la asesoria personalizada.";

export function normalizeCatalogProjects(
  projects: CatalogProjectInput[],
): CatalogProject[] {
  return projects.map((project) => ({
    ...project,
    images: project.images.map((image) => ({
      ...image,
      objectFit: image.objectFit ?? "cover",
      hotspots: (image.hotspots ?? []).map((hotspot) => ({
        ...hotspot,
        detail: hotspot.detail ?? DEFAULT_HOTSPOT_DETAIL,
        imageSrc: hotspot.imageSrc ?? image.src,
        imageAlt: hotspot.imageAlt ?? image.alt,
      })),
    })),
  }));
}
