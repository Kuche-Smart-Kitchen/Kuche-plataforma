import { AxiosError } from "axios";

import axiosInstance, { type ApiResponse } from "./axiosConfig";

export interface AsignarIngenierosCitaData {
  ingenieroIds: string[];
}

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