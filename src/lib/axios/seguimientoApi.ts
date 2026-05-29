import axiosInstance, { type ApiResponse } from "./axiosConfig";
import { AxiosError } from "axios";

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

export type SeguimientoProyectoResponse = Record<string, unknown>;

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
  const response = await axiosInstance.post<ApiResponse<SeguimientoLoginResponse>>(
    "/api/seguimiento/login",
    payload,
    ({
      skipAuthToken: true,
      skipAuthRedirect: true,
      withCredentials: false,
    } as any),
  );

  return normalizeSeguimientoResponse<SeguimientoLoginResponse>(response.data);
};

/**
 * Login publico para seguimiento por codigo de proyecto.
 * El backend debe validar la coincidencia contra los primeros 6 caracteres del ID real.
 */
export const autenticarSeguimientoCliente = async (
  codigo: string,
): Promise<ApiResponse<SeguimientoLoginResponse>> => {
  const normalized = codigo.trim().toUpperCase();

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

/**
 * Obtiene el proyecto de seguimiento con token emitido por login publico.
 */
export const obtenerProyectoSeguimiento = async (
  token: string,
  codigo?: string,
): Promise<ApiResponse<SeguimientoProyectoResponse>> => {
  const response = await axiosInstance.get<ApiResponse<SeguimientoProyectoResponse>>(
    "/api/seguimiento/proyecto",
    ({
      params: codigo ? { codigo } : undefined,
      headers: {
        Authorization: `Bearer ${token}`,
      },
      skipAuthToken: true,
      skipAuthRedirect: true,
      withCredentials: false,
    } as any),
  );

  return normalizeSeguimientoResponse<SeguimientoProyectoResponse>(response.data);
};
