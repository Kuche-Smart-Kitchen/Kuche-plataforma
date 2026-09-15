import axiosInstance, { type ApiResponse } from "./axiosConfig";
import axios from "axios";
import type { CatalogMaterial } from "./materialesApi";
export * from "./materialesApi";

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

const getCollection = async <T>(url: string, params?: Record<string, string>, fallbackUrl?: string): Promise<T[]> => {
  try {
    const response = await axiosInstance.get<CollectionResponse<T>>(url, { params });
    return unwrap(response.data);
  } catch (error) {
    if (fallbackUrl && axios.isAxiosError(error) && error.response?.status === 404) {
      const fallback = await axiosInstance.get<CollectionResponse<T>>(fallbackUrl, { params });
      return unwrap(fallback.data);
    }
    throw error;
  }
};

export const obtenerMaterialesLevantamiento = async (): Promise<CatalogMaterial[]> =>
  getCollection<CatalogMaterial>("/api/materiales", { disponible: "true" }, "/api/catalogos/materiales");

export const obtenerHerrajesLevantamiento = async (): Promise<CatalogMaterial[]> =>
  getCollection<CatalogMaterial>("/api/herrajes", { disponible: "true" }, "/api/catalogos/herrajes");

export const obtenerElectrodomesticosLevantamiento = async (): Promise<CatalogEquipment[]> =>
  getCollection<CatalogEquipment>("/api/electrodomesticos", { disponible: "true" }, "/api/catalogos/electrodomesticos");

export const obtenerExtrasLevantamiento = async (): Promise<CatalogEquipment[]> =>
  getCollection<CatalogEquipment>("/api/extras", { disponible: "true" }, "/api/catalogos/extras");