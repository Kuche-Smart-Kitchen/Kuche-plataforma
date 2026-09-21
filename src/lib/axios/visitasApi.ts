import axios, { type AxiosRequestConfig } from "axios";
import axiosInstance, { type ApiResponse } from "./axiosConfig";

export interface AgendarVisitaPayload {
  fechaProgramada: string;
  nombreCliente: string;
  correoCliente: string;
  telefonoCliente: string;
  ubicacion?: string;
  informacionAdicional?: string;
  estado?: "solicitada" | "programada" | "confirmada" | "cancelada";
}

export interface DisponibilidadVisitaResponse {
  success: boolean;
  fecha?: string;
  horariosOcupados?: string[];
  message?: string;
}

const publicVisitRequestConfig = {
  skipAuthToken: true,
  skipAuthRedirect: true,
} as AxiosRequestConfig;

const visitCreateRoutes = ["/api/visitas", "/api/visitas/agendarVisita"];
const visitAvailabilityRoutes = ["/api/visitas/disponibilidad", "/api/visitas/horarios-ocupados"];

const canTryNextRoute = (error: unknown) =>
  axios.isAxiosError(error) && [404, 405].includes(error.response?.status ?? 0);

export const agendarVisita = async (
  payload: AgendarVisitaPayload,
  captchaToken?: string,
): Promise<ApiResponse<Record<string, unknown>>> => {
  let lastError: unknown;
  for (const route of visitCreateRoutes) {
    try {
      const response = await axiosInstance.post<ApiResponse<Record<string, unknown>>>(route, payload, {
        ...publicVisitRequestConfig,
        headers: captchaToken ? { "captcha-token": captchaToken.trim() } : undefined,
      });
      return response.data;
    } catch (error) {
      lastError = error;
      if (!canTryNextRoute(error) || route === visitCreateRoutes[visitCreateRoutes.length - 1]) throw error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("No se pudo registrar la visita");
};

export const obtenerDisponibilidadVisita = async (fecha: string): Promise<DisponibilidadVisitaResponse> => {
  let lastError: unknown;
  for (const route of visitAvailabilityRoutes) {
    try {
      const suffix = route.includes("disponibilidad") ? `?fecha=${encodeURIComponent(fecha)}` : `?fecha=${encodeURIComponent(fecha)}`;
      const response = await axiosInstance.get<DisponibilidadVisitaResponse>(`${route}${suffix}`, publicVisitRequestConfig);
      const data = response.data;
      return {
        success: data.success !== false,
        fecha: data.fecha ?? fecha,
        horariosOcupados: Array.isArray(data.horariosOcupados) ? data.horariosOcupados : [],
        message: data.message,
      };
    } catch (error) {
      lastError = error;
      if (!canTryNextRoute(error) || route === visitAvailabilityRoutes[visitAvailabilityRoutes.length - 1]) throw error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("No se pudo consultar disponibilidad de visitas");
};

export const obtenerVisitas = async (): Promise<ApiResponse<Record<string, unknown>[]>> => {
  const response = await axiosInstance.get<ApiResponse<Record<string, unknown>[]>>("/api/visitas");
  return response.data;
};

export const actualizarVisita = async (
  id: string,
  payload: AgendarVisitaPayload,
): Promise<ApiResponse<Record<string, unknown>>> => {
  const response = await axiosInstance.patch<ApiResponse<Record<string, unknown>>>(
    `/api/visitas/${encodeURIComponent(id)}`,
    payload,
  );
  return response.data;
};

export const eliminarVisita = async (id: string): Promise<ApiResponse<Record<string, unknown>>> => {
  const response = await axiosInstance.delete<ApiResponse<Record<string, unknown>>>(
    `/api/visitas/${encodeURIComponent(id)}`,
  );
  return response.data;
};