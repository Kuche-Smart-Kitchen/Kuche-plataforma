import { AxiosError } from "axios";

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
  const response = await axiosInstance.patch<ApiResponse<{ project?: Record<string, unknown> }>>(
    `/api/seguimiento/proyectos/${encodeURIComponent(codigo.trim())}`,
    data,
  );
  return response.data;
};
