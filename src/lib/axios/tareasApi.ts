import { AxiosError } from "axios";

import axiosInstance, { type ApiResponse } from "./axiosConfig";

export type EtapaTarea = "citas" | "disenos" | "cotizacion" | "contrato";

const shouldRetryWithFallback = (error: unknown): boolean => {
  return error instanceof AxiosError && [404, 405].includes(error.response?.status ?? 0);
};

const requestWithFallback = async <T>(
  endpoints: string[],
  method: "put" | "patch" | "post",
  data: Record<string, unknown>,
): Promise<ApiResponse<T>> => {
  let lastError: unknown;

  for (const endpoint of endpoints) {
    try {
      const response = await (method === "put"
        ? axiosInstance.put<ApiResponse<T>>(endpoint, data)
        : method === "patch"
          ? axiosInstance.patch<ApiResponse<T>>(endpoint, data)
          : axiosInstance.post<ApiResponse<T>>(endpoint, data));
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

export const cambiarEtapa = async (
  id: string,
  etapa: EtapaTarea,
): Promise<ApiResponse<Record<string, unknown>>> => {
  return requestWithFallback<Record<string, unknown>>(
    [`/api/tareas/${id}/etapa`, `/api/tareas/${id}/stage`, `/api/tareas/${id}/cambiar-etapa`],
    "put",
    { etapa },
  );
};

export const asignarTrabajadoresTarea = async (
  id: string,
  asignadoA: string[] | string,
): Promise<ApiResponse<Record<string, unknown>>> => {
  return requestWithFallback<Record<string, unknown>>(
    [
      `/api/tareas/${id}/asignar-trabajadores`,
      `/api/tareas/${id}/asignarTrabajadores`,
      `/api/tareas/${id}/assign-workers`,
    ],
    "put",
    { asignadoA },
  );
};

export const actualizarTarea = async (
  id: string,
  data: Record<string, unknown>,
): Promise<ApiResponse<Record<string, unknown>>> => {
  return requestWithFallback<Record<string, unknown>>(
    [`/api/tareas/${id}`, `/api/tareas/${id}/update`, `/api/tareas/${id}/actualizar`],
    "patch",
    data,
  );
};

export const crearTarea = async (
  data: Record<string, unknown>,
): Promise<ApiResponse<Record<string, unknown>>> => {
  return requestWithFallback<Record<string, unknown>>(
    ["/api/tareas", "/api/tareas/crear", "/api/tareas/create"],
    "post",
    data,
  );
};