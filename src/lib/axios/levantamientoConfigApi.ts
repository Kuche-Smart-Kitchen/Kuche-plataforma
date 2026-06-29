import axiosInstance, { ApiResponse } from "./axiosConfig";
import { type LevantamientoConfig } from "@/lib/config-levantamiento";

type RequestMethod = "get" | "post" | "put" | "patch";

const configBasePaths = [
  "/api/levantamientos/configuracion",
  "/api/levantamientos/configuracion-general",
  "/api/configuracion/levantamiento",
  "/api/levantamiento/configuracion",
  "/api/cotizador/levantamiento-config",
];

const getUniquePaths = (paths: string[]) => Array.from(new Set(paths));

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
    return `No se pudo conectar con el backend (${backendUrl}).`;
  }

  return (
    lastError?.response?.data?.message ||
    lastError?.message ||
    "No se pudo completar la operacion de configuracion de levantamiento"
  );
};

const requestWithFallback = async <T>(
  methods: RequestMethod[],
  paths: string[],
  data?: unknown,
): Promise<ApiResponse<T>> => {
  const errors: unknown[] = [];

  for (const path of getUniquePaths(paths)) {
    for (const method of methods) {
      try {
        const response = await axiosInstance.request<ApiResponse<T>>({
          method,
          url: path,
          data,
          skipNotFoundLog: true,
          skipNetworkLog: true,
        } as any);
        return response.data;
      } catch (error: any) {
        errors.push(error);
        const status = error?.response?.status;
        if (status && status !== 404 && status !== 405) {
          const serverData = error?.response?.data;
          if (serverData && typeof serverData === "object" && "success" in serverData) {
            return serverData as ApiResponse<T>;
          }
          return {
            success: false,
            message: serverData?.message || error?.message || "Error en API de configuracion de levantamiento",
          } as ApiResponse<T>;
        }
      }
    }
  }

  return {
    success: false,
    message: getLastPathErrorMessage(errors),
  } as ApiResponse<T>;
};

export const obtenerConfiguracionLevantamiento = async (): Promise<ApiResponse<LevantamientoConfig>> => {
  return requestWithFallback<LevantamientoConfig>(["get"], configBasePaths);
};

export const guardarConfiguracionLevantamiento = async (
  config: LevantamientoConfig,
): Promise<ApiResponse<LevantamientoConfig>> => {
  return requestWithFallback<LevantamientoConfig>(["put", "patch", "post"], configBasePaths, config);
};
