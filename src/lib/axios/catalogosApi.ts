/**
 * API de Catálogos
 * Endpoints para obtener catálogos de materiales, herrajes y otras opciones
 */

import axiosInstance, { ApiResponse } from './axiosConfig';

export const UNIDADES_MEDIDA = ['m2', 'm3', 'm', 'unidad', 'caja', 'paquete', 'placa', 'hoja', 'pies'] as const;
export type UnidadMedida = (typeof UNIDADES_MEDIDA)[number];

export const CATEGORIAS_CATALOGO = [
  'Madera',
  'Metal',
  'Piedra',
  'Granito',
  'Mármol',
  'Acero Inoxidable',
  'Pintura',
  'Herrajes',
  'Iluminación',
  'Adhesivos',
  'Otro',
] as const;
export type CategoriaCatalogo = (typeof CATEGORIAS_CATALOGO)[number];

export const SECCIONES_MATERIALES = [
  'cubierta',
  'estructura',
  'vistas',
  'espesor',
  'cajones_puertas',
  'accesorios_modulo',
  'extraibles_puertas_abatibles',
  'insumos_produccion',
  'otros',
  'gastos_fijos',
] as const;
export type SeccionMaterial = (typeof SECCIONES_MATERIALES)[number];

// Tipos de datos para Catálogos
export interface Material {
  _id: string;
  nombre: string;
  precioUnitario?: number;
  precioPorMetro?: number;
  precioMetroLineal?: number;
  idCotizador?: string;
  descripcion?: string;
  unidadMedida?: UnidadMedida;
  seccion?: SeccionMaterial;
  proveedor?: string;
  disponible?: boolean;
}

export interface MaterialPayload {
  nombre: string;
  unidadMedida: UnidadMedida;
  precioUnitario?: number;
  precioPorMetro?: number;
  precioMetroLineal?: number;
  idCotizador?: string;
  descripcion?: string;
  seccion?: SeccionMaterial;
  proveedor?: string;
  disponible?: boolean;
}

export interface Herraje {
  _id: string;
  nombre: string;
  precioUnitario?: number;
  precioPorMetro?: number;
  precioMetroLineal?: number;
  idCotizador?: string;
  descripcion?: string;
  categoria?: CategoriaCatalogo;
  unidadMedida?: UnidadMedida;
  seccion?: SeccionMaterial;
  proveedor?: string;
  disponible?: boolean;
}

export interface HerrajePayload {
  nombre: string;
  unidadMedida?: UnidadMedida;
  categoria?: CategoriaCatalogo;
  precioUnitario?: number;
  precioPorMetro?: number;
  precioMetroLineal?: number;
  idCotizador?: string;
  descripcion?: string;
  seccion?: SeccionMaterial;
  proveedor?: string;
  disponible?: boolean;
}

type CatalogQueryValue = string | number | boolean | null | undefined;

export interface MaterialFilters {
  seccion?: SeccionMaterial;
  secciones?: SeccionMaterial[];
  disponible?: boolean;
  proveedor?: string;
  q?: string;
}

export interface HerrajeFilters {
  seccion?: SeccionMaterial;
  secciones?: SeccionMaterial[];
  categoria?: CategoriaCatalogo | string;
  disponible?: boolean;
  proveedor?: string;
  q?: string;
}

const materialRoutes = {
  base: ['/api/catalogos/materiales', '/api/materiales', '/api/catalogo/materiales'],
};

const herrajeRoutes = {
  base: ['/api/catalogos/herrajes', '/api/herrajes', '/api/catalogo/herrajes'],
};

const getLastPathErrorMessage = (errors: unknown[]) => {
  const lastError = errors[errors.length - 1] as any;
  return lastError?.response?.data?.message || lastError?.message || 'No se pudo completar la operación de catálogo';
};

const getUniquePaths = (paths: string[]) => Array.from(new Set(paths));

const buildPathWithQuery = (path: string, query?: Record<string, CatalogQueryValue>) => {
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [key, rawValue] of Object.entries(query)) {
    if (rawValue === undefined || rawValue === null) continue;
    const value = String(rawValue).trim();
    if (!value) continue;
    params.append(key, value);
  }
  const queryString = params.toString();
  if (!queryString) return path;
  return `${path}${path.includes('?') ? '&' : '?'}${queryString}`;
};

const requestWithFallback = async <T>(
  method: 'get' | 'post' | 'patch' | 'delete',
  paths: string[],
  data?: unknown,
  query?: Record<string, CatalogQueryValue>,
): Promise<ApiResponse<T>> => {
  const errors: unknown[] = [];

  for (const path of getUniquePaths(paths)) {
    try {
      const response = await axiosInstance.request<ApiResponse<T>>({
        method,
        url: method === 'get' ? buildPathWithQuery(path, query) : path,
        data,
      });
      return response.data;
    } catch (error: any) {
      errors.push(error);
      const status = error?.response?.status;
      if (status !== 404) {
        const serverData = error?.response?.data;
        if (serverData && typeof serverData === 'object' && 'success' in serverData) {
          return serverData as ApiResponse<T>;
        }
        throw error;
      }
    }
  }

  return {
    success: false,
    message: getLastPathErrorMessage(errors),
  } as ApiResponse<T>;
};

const buildMaterialQuery = (filters: MaterialFilters = {}): Record<string, CatalogQueryValue> => ({
  seccion: filters.seccion,
  secciones: Array.isArray(filters.secciones) ? filters.secciones.join(',') : undefined,
  disponible: filters.disponible,
  proveedor: filters.proveedor,
  q: filters.q,
});

const buildHerrajeQuery = (filters: HerrajeFilters = {}): Record<string, CatalogQueryValue> => ({
  seccion: filters.seccion,
  secciones: Array.isArray(filters.secciones) ? filters.secciones.join(',') : undefined,
  categoria: filters.categoria,
  disponible: filters.disponible,
  proveedor: filters.proveedor,
  q: filters.q,
});

/**
 * Obtener catálogo de materiales base
 */
export const obtenerMateriales = async (filters: MaterialFilters = {}): Promise<ApiResponse<Material[]>> => {
  return requestWithFallback<Material[]>('get', materialRoutes.base, undefined, buildMaterialQuery(filters));
};

export const crearMaterial = async (data: MaterialPayload): Promise<ApiResponse<Material>> => {
  return requestWithFallback<Material>('post', materialRoutes.base, data);
};

export const actualizarMaterial = async (
  id: string,
  data: Partial<MaterialPayload>,
): Promise<ApiResponse<Material>> => {
  return requestWithFallback<Material>(
    'patch',
    materialRoutes.base.map((basePath) => `${basePath}/${id}`),
    data,
  );
};

export const eliminarMaterial = async (id: string): Promise<ApiResponse<void>> => {
  return requestWithFallback<void>('delete', materialRoutes.base.map((basePath) => `${basePath}/${id}`));
};

/**
 * Obtener catálogo de herrajes
 */
export const obtenerHerrajes = async (filters: HerrajeFilters = {}): Promise<ApiResponse<Herraje[]>> => {
  return requestWithFallback<Herraje[]>('get', herrajeRoutes.base, undefined, buildHerrajeQuery(filters));
};

export const crearHerraje = async (data: HerrajePayload): Promise<ApiResponse<Herraje>> => {
  return requestWithFallback<Herraje>('post', herrajeRoutes.base, data);
};

export const actualizarHerraje = async (
  id: string,
  data: Partial<HerrajePayload>,
): Promise<ApiResponse<Herraje>> => {
  return requestWithFallback<Herraje>(
    'patch',
    herrajeRoutes.base.map((basePath) => `${basePath}/${id}`),
    data,
  );
};

export const eliminarHerraje = async (id: string): Promise<ApiResponse<void>> => {
  return requestWithFallback<void>('delete', herrajeRoutes.base.map((basePath) => `${basePath}/${id}`));
};

/**
 * Obtener lista de colores/texturas disponibles
 */
export const obtenerColores = async (): Promise<ApiResponse<string[]>> => {
  const response = await axiosInstance.get<ApiResponse<string[]>>('/api/catalogos/colores');
  return response.data;
};

/**
 * Obtener tipos de proyecto disponibles
 */
export const obtenerTiposProyecto = async (): Promise<ApiResponse<string[]>> => {
  const response = await axiosInstance.get<ApiResponse<string[]>>('/api/catalogos/tipos-proyecto');
  return response.data;
};

/**
 * Obtener tipos de cubierta disponibles
 */
export const obtenerTiposCubierta = async (): Promise<ApiResponse<string[]>> => {
  const response = await axiosInstance.get<ApiResponse<string[]>>('/api/catalogos/tipos-cubierta');
  return response.data;
};
