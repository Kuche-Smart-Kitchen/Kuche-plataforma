import { AxiosError } from "axios";

import axiosInstance, { type ApiResponse } from "./axiosConfig";

export interface AsignarIngenierosCitaData {
  ingenieroIds: string[];
}

const normalizeCitaListResponse = (payload: unknown): Record<string, unknown>[] => {
  if (Array.isArray(payload)) {
    return payload as Record<string, unknown>[];
  }

  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    const candidates = [record.data, record.items, record.result, record.results, record.citas];
    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        return candidate as Record<string, unknown>[];
      }
    }
  }

  return [];
};

const shouldRetryWithFallback = (error: unknown): boolean => {
  return error instanceof AxiosError && [404, 405].includes(error.response?.status ?? 0);
};

const requestWithFallback = async <T>(
  endpoints: string[],
  method: "put" | "patch",
  data: Record<string, unknown>,
): Promise<ApiResponse<T>> => {
  let lastError: unknown;

  for (const endpoint of endpoints) {
    try {
      const response = await (method === "put"
        ? axiosInstance.put<ApiResponse<T>>(endpoint, data)
        : axiosInstance.patch<ApiResponse<T>>(endpoint, data));
      return response.data;
    } catch (error) {
      lastError = error;
      if (!shouldRetryWithFallback(error) || endpoint === endpoints[endpoints.length - 1]) {
        throw error;
      }
    }
  }

  throw lastError;
};

export const obtenerTodasLasCitas = async (): Promise<ApiResponse<Record<string, unknown>[]>> => {
  const endpoints = ["/api/citas/getAllCitas", "/api/citas", "/api/citas/all", "/api/citas/getAll"];
  let lastError: unknown;

  for (const endpoint of endpoints) {
    try {
      const response = await axiosInstance.get<unknown>(endpoint);
      const normalized = normalizeCitaListResponse(response.data);
      return {
        success: true,
        data: normalized,
      };
    } catch (error) {
      lastError = error;
    }
  }

  return {
    success: false,
    message: lastError instanceof Error ? lastError.message : "No fue posible obtener las citas",
  };
};

export const crearCita = async (
  data: Record<string, unknown>,
): Promise<ApiResponse<Record<string, unknown>>> => {
  const response = await axiosInstance.post<ApiResponse<Record<string, unknown>>>('/api/citas/agregarCita', data);
  return response.data;
};

export const actualizarCita = async (
  id: string,
  data: Record<string, unknown>,
): Promise<ApiResponse<Record<string, unknown>>> => {
  const endpoints = [`/api/citas/${id}/actualizarDatos`, `/api/citas/actualizarCita/${id}`, `/api/citas/${id}`];
  let lastError: unknown;

  for (const endpoint of endpoints) {
    try {
      const response = await axiosInstance.put<ApiResponse<Record<string, unknown>>>(endpoint, data);
      return response.data;
    } catch (error) {
      lastError = error;
      if (endpoint === endpoints[endpoints.length - 1]) {
        throw error;
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error("No fue posible actualizar la cita");
};

export const eliminarCita = async (
  id: string,
): Promise<ApiResponse<Record<string, unknown>>> => {
  const response = await axiosInstance.delete<ApiResponse<Record<string, unknown>>>(`/api/citas/eliminarCita/${id}`);
  return response.data;
};

export const iniciarCita = async (
  id: string,
  data: Record<string, unknown> = {},
): Promise<ApiResponse<Record<string, unknown>>> => {
  return requestWithFallback<Record<string, unknown>>(
    [`/api/citas/${id}/iniciar`, `/api/citas/${id}/start`],
    "put",
    data,
  );
};

export const finalizarCita = async (
  id: string,
  data: Record<string, unknown> = {},
): Promise<ApiResponse<Record<string, unknown>>> => {
  return requestWithFallback<Record<string, unknown>>(
    [`/api/citas/${id}/finalizar`, `/api/citas/${id}/finish`],
    "put",
    data,
  );
};

export const asignarIngenierosCita = async (
  id: string,
  data: AsignarIngenierosCitaData,
): Promise<ApiResponse<Record<string, unknown>>> => {
  return requestWithFallback<Record<string, unknown>>(
    [
      `/api/citas/${id}/asignarIngeniero`,
      `/api/citas/${id}/asignarIngenieros`,
      `/api/citas/${id}/asignar-ingenieros`,
    ],
    "put",
    data as unknown as Record<string, unknown>,
  );
};