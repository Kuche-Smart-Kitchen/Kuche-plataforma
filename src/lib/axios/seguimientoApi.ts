import { AxiosError } from "axios";

import { slimEstatusPublicoPayload } from "@/lib/seguimiento-media-payload";

import axiosInstance, { type ApiResponse } from "./axiosConfig";

type SeguimientoLoginPayload = {
  codigo?: string;
  code?: string;
  clienteId?: string;
};

export type SeguimientoLoginResponse = {
  token: string;
  expiresAt: string;
  project: Record<string, unknown>;
};

const publicTrackingConfig = (token: string) => ({
  headers: { Authorization: `Bearer ${token}` },
  skipAuthToken: true,
  skipAuthRedirect: true,
} as never);

const normalizeSeguimientoResponse = <T,>(data: unknown): ApiResponse<T> => {
  if (data && typeof data === "object" && "success" in data) {
    return data as ApiResponse<T>;
  }

  return {
    success: true,
    data: data as T,
  };
};

const isUnauthorized = (error: unknown) =>
  error instanceof AxiosError && error.response?.status === 401;

const postSeguimientoLogin = async (payload: SeguimientoLoginPayload) => {
  const endpoints = ["/api/seguimiento/login", "/api/seguimiento/auth", "/api/seguimiento/access"];

  let lastError: unknown;

  for (const endpoint of endpoints) {
    try {
      const response = await axiosInstance.post<ApiResponse<SeguimientoLoginResponse>>(
        endpoint,
        payload,
        ({
          skipAuthToken: true,
          skipAuthRedirect: true,
          withCredentials: false,
        } as never),
      );

      return normalizeSeguimientoResponse<SeguimientoLoginResponse>(response.data);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
};

export const autenticarSeguimientoCliente = async (
  codigo: string,
): Promise<ApiResponse<SeguimientoLoginResponse>> => {
  const normalized = codigo.trim().toUpperCase();
  if (!normalized) {
    return { success: false, message: "Ingresa un codigo valido." };
  }

  try {
    return await postSeguimientoLogin({ codigo: normalized });
  } catch (error) {
    if (!isUnauthorized(error)) throw error;
  }

  try {
    return await postSeguimientoLogin({ code: normalized });
  } catch (error) {
    if (!isUnauthorized(error)) throw error;
  }

  return postSeguimientoLogin({ clienteId: normalized });
};

/** Una sola consulta pública: sin reintentos a `/auth` ni `/access`. */
export const consultarSeguimientoPorCodigo = async (
  codigo: string,
): Promise<ApiResponse<SeguimientoLoginResponse>> => {
  const normalized = codigo
    .trim()
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, "")
    .toUpperCase();
  if (!normalized) {
    return { success: false, message: "Ingresa un codigo valido." };
  }

  const response = await axiosInstance.post<ApiResponse<SeguimientoLoginResponse>>(
    "/api/seguimiento/login",
    { codigo: normalized },
    ({
      skipAuthToken: true,
      skipAuthRedirect: true,
      withCredentials: false,
    } as never),
  );

  return normalizeSeguimientoResponse<SeguimientoLoginResponse>(response.data);
};

export const seguimientoHttpStatus = (error: unknown): number | undefined =>
  error instanceof AxiosError ? error.response?.status : undefined;

export const obtenerProyectoSeguimiento = async (token: string): Promise<ApiResponse<Record<string, unknown>>> => {
  const response = await axiosInstance.get<ApiResponse<Record<string, unknown>>>(
    "/api/seguimiento/proyecto",
    publicTrackingConfig(token),
  );
  return response.data;
};

export type SeguimientoArchivoRemoto = {
  id?: string;
  _id?: string;
  nombre: string;
  tipo?: string;
  url: string;
  key?: string;
  provider?: string;
  mimeType?: string;
  clienteId?: string;
  createdAt?: string;
};

export const obtenerArchivosSeguimiento = async (
  token: string,
): Promise<ApiResponse<SeguimientoArchivoRemoto[]>> => {
  const response = await axiosInstance.get<ApiResponse<SeguimientoArchivoRemoto[]>>(
    "/api/seguimiento/archivos",
    publicTrackingConfig(token),
  );
  return response.data;
};

export const obtenerPagosSeguimiento = async (
  token: string,
): Promise<ApiResponse<Record<string, unknown>>> => {
  const response = await axiosInstance.get<ApiResponse<Record<string, unknown>>>(
    "/api/seguimiento/pagos",
    publicTrackingConfig(token),
  );
  return response.data;
};

export const cerrarSesionSeguimiento = async (token: string): Promise<ApiResponse<unknown>> => {
  const response = await axiosInstance.post<ApiResponse<unknown>>(
    "/api/seguimiento/logout",
    undefined,
    publicTrackingConfig(token),
  );
  return response.data;
};

export const actualizarEstatusPublico = async (
  codigo: string,
  data: Record<string, unknown>,
): Promise<ApiResponse<{ project?: Record<string, unknown> }>> => {
  const codigoNormalizado = codigo.trim().toUpperCase();
  let payload = data;
  try {
    payload = await slimEstatusPublicoPayload(data);
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "No se pudieron preparar los archivos del estatus público.",
    };
  }
  const response = await axiosInstance.patch<
    ApiResponse<{ project?: Record<string, unknown> }> | Record<string, unknown>
  >(`/api/seguimiento/proyectos/${encodeURIComponent(codigoNormalizado)}`, payload);
  const body = response.data;
  if (body && typeof body === "object" && "success" in body) {
    return body as ApiResponse<{ project?: Record<string, unknown> }>;
  }
  if (response.status >= 200 && response.status < 300) {
    const project =
      body && typeof body === "object" && !Array.isArray(body)
        ? (body as Record<string, unknown>)
        : undefined;
    return { success: true, data: { project } };
  }
  return { success: false, message: "No se pudo actualizar el estatus público." };
};
