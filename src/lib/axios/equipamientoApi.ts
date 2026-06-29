import axiosInstance, { ApiResponse } from "./axiosConfig";

export interface EquipamientoBase {
  _id: string;
  nombre: string;
  precio?: number;
  descripcion?: string;
  imagenUrl?: string;
  thumbnailUrl?: string;
  disponible?: boolean;
  categoria?: string;
  subtipo?: string;
}

export interface Electrodomestico extends EquipamientoBase {
  categoria: string;
}

export interface ElectrodomesticoPayload {
  nombre: string;
  precio?: number;
  descripcion?: string;
  imagenUrl?: string;
  thumbnailUrl?: string;
  disponible?: boolean;
  categoria: string;
  subtipo?: string;
}

export interface ElectroCategoria {
  _id: string;
  nombre: string;
  descripcion?: string;
  orden?: number;
  disponible?: boolean;
}

export interface ElectroCategoriaPayload {
  nombre: string;
  descripcion?: string;
  orden?: number;
  disponible?: boolean;
}

export interface ExtraCategoria {
  _id: string;
  nombre: string;
  descripcion?: string;
  orden?: number;
  disponible?: boolean;
}

export interface ExtraCategoriaPayload {
  nombre: string;
  descripcion?: string;
  orden?: number;
  disponible?: boolean;
}

export interface Extra extends EquipamientoBase {
  categoriaId?: string;
  categoria: string;
}

export interface ExtraPayload {
  nombre: string;
  precio?: number;
  descripcion?: string;
  imagenUrl?: string;
  thumbnailUrl?: string;
  disponible?: boolean;
  categoriaId?: string;
  categoria: string;
  subtipo?: string;
}

export interface EquipamientoFilters {
  q?: string;
  categoria?: string;
  categoriaId?: string;
  disponible?: boolean;
}

export interface CloudinaryUploadResponse {
  secureUrl: string;
  thumbnailUrl?: string;
  publicId?: string;
  width?: number;
  height?: number;
  format?: string;
}

type CatalogQueryValue = string | number | boolean | null | undefined;

const electroRoutes = {
  base: ["/api/electrodomesticos", "/api/catalogos/electrodomesticos"],
};

const extrasCategoriesRoutes = {
  base: ["/api/extras/categorias", "/api/extras-categorias", "/api/catalogos/extras-categorias"],
};

const electroCategoriesRoutes = {
  base: [
    "/api/electrodomesticos/categorias",
    "/api/electro-categorias",
    "/api/catalogos/electro-categorias",
  ],
};

const extrasRoutes = {
  base: ["/api/extras", "/api/catalogos/extras"],
};

const cloudinaryRoutes = {
  upload: ["/api/uploads/cloudinary", "/api/cloudinary/upload", "/api/media/cloudinary"],
};

const getLastPathErrorMessage = (errors: unknown[]) => {
  const lastError = errors[errors.length - 1] as any;
  const hasNetworkError = errors.some((currentError: any) => {
    return Boolean(currentError?.request) && !currentError?.response;
  });

  if (hasNetworkError) {
    const backendUrl =
      axiosInstance.defaults.baseURL
      || process.env.NEXT_PUBLIC_API_URL
      || (process.env.NODE_ENV === "production"
        ? "https://backend-cocinas-inteligentes.vercel.app"
        : "http://localhost:3001");
    return `No se pudo conectar con el backend (${backendUrl}). Verifica que el servidor API este iniciado.`;
  }

  return (
    lastError?.response?.data?.message ||
    lastError?.message ||
    "No se pudo completar la operacion de equipamiento"
  );
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
  return `${path}${path.includes("?") ? "&" : "?"}${queryString}`;
};

const requestWithFallback = async <T>(
  method: "get" | "post" | "patch" | "delete",
  paths: string[],
  data?: unknown,
  query?: Record<string, CatalogQueryValue>,
): Promise<ApiResponse<T>> => {
  const errors: unknown[] = [];

  for (const path of getUniquePaths(paths)) {
    try {
      const response = await axiosInstance.request<ApiResponse<T>>({
        method,
        url: method === "get" ? buildPathWithQuery(path, query) : path,
        data,
        skipNotFoundLog: true,
        skipNetworkLog: true,
      } as any);
      return response.data;
    } catch (error: any) {
      errors.push(error);
      const status = error?.response?.status;
      if (status && status !== 404) {
        const serverData = error?.response?.data;
        if (serverData && typeof serverData === "object" && "success" in serverData) {
          return serverData as ApiResponse<T>;
        }

        return {
          success: false,
          message: serverData?.message || error?.message || "Error en API de equipamiento",
        } as ApiResponse<T>;
      }
    }
  }

  return {
    success: false,
    message: getLastPathErrorMessage(errors),
  } as ApiResponse<T>;
};

const buildQuery = (filters: EquipamientoFilters = {}): Record<string, CatalogQueryValue> => ({
  q: filters.q,
  categoria: filters.categoria,
  categoriaId: filters.categoriaId,
  disponible: filters.disponible,
});

export const obtenerElectrodomesticos = async (
  filters: EquipamientoFilters = {},
): Promise<ApiResponse<Electrodomestico[]>> => {
  return requestWithFallback<Electrodomestico[]>("get", electroRoutes.base, undefined, buildQuery(filters));
};

export const crearElectrodomestico = async (
  data: ElectrodomesticoPayload,
): Promise<ApiResponse<Electrodomestico>> => {
  return requestWithFallback<Electrodomestico>("post", electroRoutes.base, data);
};

export const actualizarElectrodomestico = async (
  id: string,
  data: Partial<ElectrodomesticoPayload>,
): Promise<ApiResponse<Electrodomestico>> => {
  return requestWithFallback<Electrodomestico>(
    "patch",
    electroRoutes.base.map((basePath) => `${basePath}/${id}`),
    data,
  );
};

export const eliminarElectrodomestico = async (id: string): Promise<ApiResponse<void>> => {
  return requestWithFallback<void>(
    "delete",
    electroRoutes.base.map((basePath) => `${basePath}/${id}`),
  );
};

export const obtenerCategoriasElectrodomesticos = async (): Promise<ApiResponse<ElectroCategoria[]>> => {
  return requestWithFallback<ElectroCategoria[]>("get", electroCategoriesRoutes.base);
};

export const crearCategoriaElectrodomestico = async (
  data: ElectroCategoriaPayload,
): Promise<ApiResponse<ElectroCategoria>> => {
  return requestWithFallback<ElectroCategoria>("post", electroCategoriesRoutes.base, data);
};

export const actualizarCategoriaElectrodomestico = async (
  id: string,
  data: Partial<ElectroCategoriaPayload>,
): Promise<ApiResponse<ElectroCategoria>> => {
  return requestWithFallback<ElectroCategoria>(
    "patch",
    electroCategoriesRoutes.base.map((basePath) => `${basePath}/${id}`),
    data,
  );
};

export const eliminarCategoriaElectrodomestico = async (id: string): Promise<ApiResponse<void>> => {
  return requestWithFallback<void>(
    "delete",
    electroCategoriesRoutes.base.map((basePath) => `${basePath}/${id}`),
  );
};

export const obtenerCategoriasExtras = async (): Promise<ApiResponse<ExtraCategoria[]>> => {
  return requestWithFallback<ExtraCategoria[]>("get", extrasCategoriesRoutes.base);
};

export const crearCategoriaExtra = async (
  data: ExtraCategoriaPayload,
): Promise<ApiResponse<ExtraCategoria>> => {
  return requestWithFallback<ExtraCategoria>("post", extrasCategoriesRoutes.base, data);
};

export const actualizarCategoriaExtra = async (
  id: string,
  data: Partial<ExtraCategoriaPayload>,
): Promise<ApiResponse<ExtraCategoria>> => {
  return requestWithFallback<ExtraCategoria>(
    "patch",
    extrasCategoriesRoutes.base.map((basePath) => `${basePath}/${id}`),
    data,
  );
};

export const eliminarCategoriaExtra = async (id: string): Promise<ApiResponse<void>> => {
  return requestWithFallback<void>(
    "delete",
    extrasCategoriesRoutes.base.map((basePath) => `${basePath}/${id}`),
  );
};

export const obtenerExtras = async (
  filters: EquipamientoFilters = {},
): Promise<ApiResponse<Extra[]>> => {
  return requestWithFallback<Extra[]>("get", extrasRoutes.base, undefined, buildQuery(filters));
};

export const crearExtra = async (data: ExtraPayload): Promise<ApiResponse<Extra>> => {
  return requestWithFallback<Extra>("post", extrasRoutes.base, data);
};

export const actualizarExtra = async (
  id: string,
  data: Partial<ExtraPayload>,
): Promise<ApiResponse<Extra>> => {
  return requestWithFallback<Extra>(
    "patch",
    extrasRoutes.base.map((basePath) => `${basePath}/${id}`),
    data,
  );
};

export const eliminarExtra = async (id: string): Promise<ApiResponse<void>> => {
  return requestWithFallback<void>("delete", extrasRoutes.base.map((basePath) => `${basePath}/${id}`));
};

export const subirImagenCloudinary = async (
  file: File,
  folder = "kuche/equipamiento",
): Promise<ApiResponse<CloudinaryUploadResponse>> => {
  const errors: unknown[] = [];
  for (const path of getUniquePaths(cloudinaryRoutes.upload)) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", folder);

    try {
      const response = await axiosInstance.post<ApiResponse<CloudinaryUploadResponse>>(path, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        skipNotFoundLog: true,
        skipNetworkLog: true,
      } as any);
      return response.data;
    } catch (error: any) {
      errors.push(error);
      const status = error?.response?.status;
      if (status && status !== 404) {
        const serverData = error?.response?.data;
        if (serverData && typeof serverData === "object" && "success" in serverData) {
          return serverData as ApiResponse<CloudinaryUploadResponse>;
        }

        return {
          success: false,
          message: serverData?.message || error?.message || "Error al subir imagen",
        } as ApiResponse<CloudinaryUploadResponse>;
      }
    }
  }

  return {
    success: false,
    message: getLastPathErrorMessage(errors),
  } as ApiResponse<CloudinaryUploadResponse>;
};
