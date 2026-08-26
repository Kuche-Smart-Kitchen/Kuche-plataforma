import { AxiosError, type AxiosRequestConfig } from "axios";

import axiosInstance, { type ApiResponse } from "./axiosConfig";

export interface AsignarIngenierosCitaData {
  ingenieroIds: string[];
}

export interface AgendarCitaPayload {
  fechaAgendada: string;
  nombreCliente: string;
  correoCliente: string;
  telefonoCliente: string;
  ubicacion?: string;
  diseno?: string;
  informacionAdicional?: string;
  estado?: string;
}

export interface DisponibilidadDiaResponse {
  success: boolean;
  fecha?: string;
  horariosOcupados?: string[];
  message?: string;
}

const publicCitaRequestConfig: AxiosRequestConfig = {
  skipAuthToken: true,
  skipAuthRedirect: true,
} as AxiosRequestConfig;

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
  const response = await axiosInstance.get<unknown>("/api/citas/admin/getAllCitas");
  const normalized = normalizeCitaListResponse(response.data);

  return {
    success: true,
    data: normalized,
  };
};

export const agendarCita = async (
  data: AgendarCitaPayload,
  captchaToken?: string,
): Promise<ApiResponse<Record<string, unknown>>> => {
  const response = await axiosInstance.post<ApiResponse<Record<string, unknown>>>('/api/citas/agregarCita', data, {
    ...publicCitaRequestConfig,
    headers: captchaToken
      ? {
          "captcha-token": captchaToken.trim(),
        }
      : undefined,
  });

  return response.data;
};

export const crearCita = async (
  data: Record<string, unknown>,
): Promise<ApiResponse<Record<string, unknown>>> => {
  const response = await axiosInstance.post<ApiResponse<Record<string, unknown>>>('/api/citas/agregarCita', data, {
    ...publicCitaRequestConfig,
  });
  return response.data as ApiResponse<Record<string, unknown>>;
};

export const obtenerDisponibilidadDia = async (
  fecha: string,
): Promise<DisponibilidadDiaResponse> => {
  const response = await axiosInstance.get<unknown>(`/api/citas/disponibilidad?fecha=${encodeURIComponent(fecha)}`, publicCitaRequestConfig);

  const payload = response.data as Record<string, unknown>;
  const horariosOcupados = Array.isArray(payload?.horariosOcupados)
    ? payload.horariosOcupados.filter((item): item is string => typeof item === 'string')
    : Array.isArray(payload?.data)
      ? payload.data.filter((item): item is string => typeof item === 'string')
      : [];

  return {
    success: payload?.success !== false,
    fecha: typeof payload?.fecha === 'string' ? payload.fecha : fecha,
    horariosOcupados,
    message: typeof payload?.message === 'string' ? payload.message : undefined,
  };
};

export const obtenerHorariosOcupados = async (): Promise<string[]> => {
  const response = await axiosInstance.get<unknown>('/api/citas/horarios-ocupados', publicCitaRequestConfig);

  if (Array.isArray(response.data)) {
    return response.data.filter((value): value is string => typeof value === 'string');
  }

  const payload = response.data as Record<string, unknown>;
  if (Array.isArray(payload?.data)) {
    return payload.data.filter((value): value is string => typeof value === 'string');
  }

  return [];
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