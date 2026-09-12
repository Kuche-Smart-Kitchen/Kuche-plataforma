import axios from "axios";
import axiosInstance, { type ApiResponse } from "./axiosConfig";

export type UnidadMedidaMaterial =
  | "m2"
  | "m3"
  | "m"
  | "unidad"
  | "caja"
  | "paquete"
  | "placas"
  | "hoja"
  | "pies";

export type SeccionMaterial =
  | "cubierta"
  | "estructura"
  | "vistas"
  | "espesor"
  | "herrajes"
  | "cajones_puertas"
  | "accesorios_modulo"
  | "extraibles_puertas_abatibles"
  | "insumos_produccion"
  | "gastos_fijos"
  | "otros";

export type GamaMaterial = "Estandar" | "Tendencia" | "Premium";

export interface CatalogMaterial {
  _id: string;
  id?: string;
  idCotizador?: string;
  nombre: string;
  descripcion?: string;
  unidadMedida?: UnidadMedidaMaterial | string;
  precioUnitario?: number | null;
  precioPorMetro?: number | null;
  precioMetroLineal?: number | null;
  seccion?: SeccionMaterial | string;
  proveedor?: string;
  image?: string;
  gama?: GamaMaterial | string;
  tier?: GamaMaterial | string;
  disponible?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CrearMaterialPayload {
  nombre: string;
  unidadMedida: UnidadMedidaMaterial | string;
  precioUnitario?: number | null;
  precioPorMetro?: number | null;
  seccion?: SeccionMaterial | string;
  descripcion?: string;
  proveedor?: string;
  image?: string;
  gama?: GamaMaterial;
  idCotizador?: string;
  disponible?: boolean;
}

export interface ActualizarMaterialPayload extends Partial<CrearMaterialPayload> {}

export interface ActualizarPrecioPayload {
  nuevoPrecio?: number;
  precioUnitario?: number | null;
  precioPorMetro?: number | null;
}

export interface MaterialesFiltros {
  disponible?: boolean | string;
  seccion?: string;
  secciones?: string;
  proveedor?: string;
  q?: string;
}

export const SECCIONES_MATERIALES: Array<{ valor: SeccionMaterial; label: string }> = [
  { valor: "cubierta", label: "Cubierta" },
  { valor: "estructura", label: "Estructura" },
  { valor: "vistas", label: "Vistas" },
  { valor: "espesor", label: "Espesor" },
  { valor: "herrajes", label: "Herrajes" },
  { valor: "cajones_puertas", label: "Cajones y Puertas" },
  { valor: "accesorios_modulo", label: "Accesorios de Módulo" },
  { valor: "extraibles_puertas_abatibles", label: "Extraíbles y Puertas Abatibles" },
  { valor: "insumos_produccion", label: "Insumos de Producción" },
  { valor: "gastos_fijos", label: "Gastos Fijos" },
  { valor: "otros", label: "Otros" },
];

export const UNIDADES_MEDIDA: Array<{ valor: UnidadMedidaMaterial; label: string }> = [
  { valor: "unidad", label: "Unidad (pz)" },
  { valor: "m2", label: "Metro cuadrado (m²)" },
  { valor: "m", label: "Metro lineal (m)" },
  { valor: "placas", label: "Placas" },
  { valor: "hoja", label: "Hoja" },
  { valor: "paquete", label: "Paquete" },
  { valor: "caja", label: "Caja" },
  { valor: "pies", label: "Pies" },
  { valor: "m3", label: "Metro cúbico (m³)" },
];

export const normalizarUnidadMedida = (raw?: string): UnidadMedidaMaterial => {
  if (!raw) return "unidad";
  const clean = raw.trim().toLowerCase();
  if (["pz", "pza", "pieza", "piezas", "u", "unidades", "unidad"].includes(clean)) return "unidad";
  if (["m2", "mts2", "m²", "metro cuadrado", "metros cuadrados"].includes(clean)) return "m2";
  if (["m3", "mts3", "m³", "metro cubico", "metros cubicos"].includes(clean)) return "m3";
  if (["m", "ml", "mts", "metro", "metros", "metro lineal"].includes(clean)) return "m";
  if (["placa", "placas"].includes(clean)) return "placas";
  if (["hoja", "hojas"].includes(clean)) return "hoja";
  if (["paquete", "paquetes", "pq"].includes(clean)) return "paquete";
  if (["caja", "cajas"].includes(clean)) return "caja";
  if (["pie", "pies"].includes(clean)) return "pies";
  return "unidad";
};

export const normalizarSeccion = (raw?: string): SeccionMaterial => {
  if (!raw) return "otros";
  const clean = raw.trim().toLowerCase();
  if (clean.includes("cubierta")) return "cubierta";
  if (clean.includes("estructura")) return "estructura";
  if (clean.includes("vista")) return "vistas";
  if (clean.includes("espesor")) return "espesor";
  if (clean.includes("herraje")) return "herrajes";
  if (clean.includes("cajon") || clean.includes("puerta")) return "cajones_puertas";
  if (clean.includes("accesorio")) return "accesorios_modulo";
  if (clean.includes("extraible") || clean.includes("electrodomestico") || clean.includes("abatible"))
    return "extraibles_puertas_abatibles";
  if (clean.includes("insumo") || clean.includes("varios")) return "insumos_produccion";
  if (clean.includes("gasto") || clean.includes("fijo")) return "gastos_fijos";
  return "otros";
};

export function extractApiErrorMessage(error: unknown, fallbackMessage = "No fue posible procesar la solicitud"): string {
  if (axios.isAxiosError(error) && error.response?.data) {
    const data = error.response.data as {
      message?: string;
      error?: string;
      errors?: Array<{ field?: string; message?: string }>;
    };
    if (Array.isArray(data.errors) && data.errors.length > 0) {
      return data.errors.map((e) => (e.field ? `${e.field}: ${e.message}` : e.message)).filter(Boolean).join(". ");
    }
    if (data.message) return data.message;
    if (data.error) return data.error;
  }
  if (error instanceof Error) return error.message;
  return fallbackMessage;
}

type CollectionResponse<T> = ApiResponse<T[]> | T[] | { data?: T[] };

const unwrapList = <T>(payload: CollectionResponse<T>): T[] => {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object" && "success" in payload && payload.success === false) {
    throw new Error(payload.message || "No se pudo cargar la colección");
  }
  if (payload && typeof payload === "object" && "data" in payload && Array.isArray(payload.data)) {
    return payload.data;
  }
  return [];
};

const unwrapSingle = <T>(payload: ApiResponse<T> | T): T => {
  if (!payload) {
    throw new Error("Respuesta vacía del servidor");
  }
  if (typeof payload === "object" && payload !== null && "success" in payload) {
    if (payload.success && "data" in payload) {
      return payload.data as T;
    }
    throw new Error((payload as { message?: string }).message || "Operación no exitosa");
  }
  return payload as T;
};

/**
 * GET /api/materiales (Ruta canónica recomendada)
 */
export async function obtenerMateriales(filtros?: MaterialesFiltros): Promise<CatalogMaterial[]> {
  const params: Record<string, string> = {};
  if (filtros?.disponible !== undefined) params.disponible = String(filtros.disponible);
  if (filtros?.seccion) params.seccion = filtros.seccion;
  if (filtros?.secciones) params.secciones = filtros.secciones;
  if (filtros?.proveedor) params.proveedor = filtros.proveedor;
  if (filtros?.q) params.q = filtros.q;

  try {
    const res = await axiosInstance.get<CollectionResponse<CatalogMaterial>>("/api/materiales", { params });
    return unwrapList(res.data);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      const fallback = await axiosInstance.get<CollectionResponse<CatalogMaterial>>("/api/catalogos/materiales", { params });
      return unwrapList(fallback.data);
    }
    throw error;
  }
}

/**
 * GET /api/materiales/:id
 */
export async function obtenerMaterialPorId(id: string): Promise<CatalogMaterial> {
  const res = await axiosInstance.get<ApiResponse<CatalogMaterial> | CatalogMaterial>(`/api/materiales/${encodeURIComponent(id)}`);
  return unwrapSingle(res.data);
}

/**
 * GET /api/materiales/buscar?nombre=...
 */
export async function buscarMaterialPorNombre(nombre: string): Promise<CatalogMaterial | null> {
  try {
    const res = await axiosInstance.get<ApiResponse<CatalogMaterial>>(`/api/materiales/buscar?nombre=${encodeURIComponent(nombre)}`);
    if (res.data.success && "data" in res.data) {
      return res.data.data;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * POST /api/materiales (Ruta canónica para crear materiales - requiere rol admin)
 */
export async function crearMaterial(payload: CrearMaterialPayload): Promise<CatalogMaterial> {
  const body = {
    nombre: payload.nombre.trim(),
    unidadMedida: normalizarUnidadMedida(payload.unidadMedida),
    precioUnitario: payload.precioUnitario ?? null,
    precioPorMetro: payload.precioPorMetro ?? null,
    seccion: payload.seccion ? normalizarSeccion(payload.seccion) : undefined,
    descripcion: payload.descripcion?.trim() || "",
    proveedor: payload.proveedor?.trim() || "",
    image: payload.image?.trim() || "",
    gama: payload.gama || "Tendencia",
    idCotizador: payload.idCotizador?.trim() || undefined,
    disponible: payload.disponible ?? true,
  };

  try {
    const res = await axiosInstance.post<ApiResponse<CatalogMaterial>>("/api/materiales", body);
    return unwrapSingle(res.data);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      const fallback = await axiosInstance.post<ApiResponse<CatalogMaterial>>("/api/catalogos/materiales", body);
      return unwrapSingle(fallback.data);
    }
    throw error;
  }
}

/**
 * PATCH /api/materiales/:id (Ruta canónica para actualizar - requiere rol admin)
 */
export async function actualizarMaterial(id: string, payload: ActualizarMaterialPayload): Promise<CatalogMaterial> {
  const body: Record<string, unknown> = {};
  if (payload.nombre !== undefined) body.nombre = payload.nombre.trim();
  if (payload.unidadMedida !== undefined) body.unidadMedida = normalizarUnidadMedida(payload.unidadMedida);
  if (payload.precioUnitario !== undefined) body.precioUnitario = payload.precioUnitario;
  if (payload.precioPorMetro !== undefined) body.precioPorMetro = payload.precioPorMetro;
  if (payload.seccion !== undefined) body.seccion = normalizarSeccion(payload.seccion);
  if (payload.descripcion !== undefined) body.descripcion = payload.descripcion.trim();
  if (payload.proveedor !== undefined) body.proveedor = payload.proveedor.trim();
  if (payload.image !== undefined) body.image = payload.image.trim();
  if (payload.gama !== undefined) body.gama = payload.gama;
  if (payload.idCotizador !== undefined) body.idCotizador = payload.idCotizador.trim();
  if (payload.disponible !== undefined) body.disponible = payload.disponible;

  try {
    const res = await axiosInstance.patch<ApiResponse<CatalogMaterial>>(`/api/materiales/${encodeURIComponent(id)}`, body);
    return unwrapSingle(res.data);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      const fallback = await axiosInstance.patch<ApiResponse<CatalogMaterial>>(`/api/catalogos/materiales/${encodeURIComponent(id)}`, body);
      return unwrapSingle(fallback.data);
    }
    throw error;
  }
}

/**
 * PUT /api/materiales/actualizarPrecio/:id (Ruta puntual para actualizar precio - requiere rol admin)
 * NOTA: El controlador del backend solo lee 'nuevoPrecio' y actualiza 'precioUnitario'.
 * Si el material se cotiza por metro ('precioPorMetro'), se usa PATCH /api/materiales/:id automáticamente.
 */
export async function actualizarPrecioMaterial(id: string, payload: ActualizarPrecioPayload): Promise<CatalogMaterial> {
  // Si el cambio es sobre precioPorMetro, usamos PATCH directamente
  if (payload.precioPorMetro !== undefined && payload.precioPorMetro !== null) {
    return actualizarMaterial(id, { precioPorMetro: payload.precioPorMetro });
  }

  const numericPrice = payload.nuevoPrecio ?? payload.precioUnitario ?? 0;
  const body = {
    nuevoPrecio: Number(numericPrice),
  };

  try {
    const res = await axiosInstance.put<ApiResponse<CatalogMaterial>>(`/api/materiales/actualizarPrecio/${encodeURIComponent(id)}`, body);
    return unwrapSingle(res.data);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      // Fallback a PATCH si la ruta puntual no estuviese montada
      return actualizarMaterial(id, { precioUnitario: numericPrice });
    }
    throw error;
  }
}

/**
 * POST /api/herrajes o POST /api/catalogos/herrajes (Crear herraje - requiere rol admin)
 */
export async function crearHerraje(payload: Omit<CrearMaterialPayload, "seccion"> & { seccion?: SeccionMaterial | string }): Promise<CatalogMaterial> {
  return crearMaterial({
    ...payload,
    seccion: "herrajes",
    unidadMedida: payload.unidadMedida || "unidad",
  });
}

/**
 * DELETE /api/materiales/:id (Ruta canónica para eliminar - requiere rol admin)
 */
export async function eliminarMaterial(id: string): Promise<boolean> {
  try {
    const res = await axiosInstance.delete<ApiResponse<unknown>>(`/api/materiales/${encodeURIComponent(id)}`);
    return res.data.success ?? true;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      const fallback = await axiosInstance.delete<ApiResponse<unknown>>(`/api/catalogos/materiales/${encodeURIComponent(id)}`);
      return fallback.data.success ?? true;
    }
    throw error;
  }
}
