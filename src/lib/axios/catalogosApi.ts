import axiosInstance, { type ApiResponse } from "./axiosConfig";

export type CatalogMaterial = {
  _id: string;
  id?: string;
  idCotizador?: string;
  nombre: string;
  descripcion?: string;
  precioUnitario?: number;
  precioPorMetro?: number | null;
  precioMetroLineal?: number | null;
  seccion?: string;
  unidadMedida?: string;
  image?: string;
  gama?: string;
  tier?: string;
  disponible?: boolean;
};

export type CatalogEquipment = {
  _id: string;
  nombre: string;
  descripcion?: string;
  categoria?: string;
  categoriaId?: string;
  subtipo?: string;
  precio?: number;
  imagenUrl?: string;
  thumbnailUrl?: string;
  disponible?: boolean;
};

type CollectionResponse<T> = ApiResponse<T[]> | T[] | { data?: T[] };

const unwrap = <T>(payload: CollectionResponse<T>): T[] => {
  if (Array.isArray(payload)) return payload;
  if ("success" in payload && payload.success === false) {
    throw new Error(payload.message || "No se pudo cargar el catalogo");
  }
  return Array.isArray(payload.data) ? payload.data : [];
};

const getCollection = async <T>(url: string, params?: Record<string, string>): Promise<T[]> => {
  const response = await axiosInstance.get<CollectionResponse<T>>(url, { params });
  return unwrap(response.data);
};

export const obtenerMaterialesLevantamiento = async (): Promise<CatalogMaterial[]> =>
  getCollection<CatalogMaterial>("/api/materiales", { disponible: "true" });

export const obtenerHerrajesLevantamiento = async (): Promise<CatalogMaterial[]> =>
  getCollection<CatalogMaterial>("/api/herrajes", { disponible: "true" });

export const obtenerElectrodomesticosLevantamiento = async (): Promise<CatalogEquipment[]> =>
  getCollection<CatalogEquipment>("/api/electrodomesticos", { disponible: "true" });

export const obtenerExtrasLevantamiento = async (): Promise<CatalogEquipment[]> =>
  getCollection<CatalogEquipment>("/api/extras", { disponible: "true" });