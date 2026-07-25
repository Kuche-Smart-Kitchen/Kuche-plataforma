export type CatalogHotspotInput = {
  id: string;
  label: string;
  detail?: string;
  top: string;
  left: string;
  imageSrc?: string;
  imageAlt?: string;
};

export type CatalogImageInput = {
  src: string;
  alt: string;
  hotspots?: CatalogHotspotInput[];
  objectFit?: "cover" | "contain";
};

export type CatalogProjectDetail = {
  label: string;
  value: string;
};

export type CatalogProjectInput = {
  id: string;
  title: string;
  description: string;
  category: string;
  mainCategory: string;
  subCategory: string;
  details: CatalogProjectDetail[];
  images: CatalogImageInput[];
};

export type CatalogHotspot = {
  id: string;
  label: string;
  detail: string;
  top: string;
  left: string;
  imageSrc: string;
  imageAlt: string;
};

export type CatalogImage = {
  src: string;
  alt: string;
  hotspots: CatalogHotspot[];
  objectFit: "cover" | "contain";
};

export type CatalogProject = {
  id: string;
  title: string;
  description: string;
  category: string;
  mainCategory: string;
  subCategory: string;
  details: CatalogProjectDetail[];
  images: CatalogImage[];
};
