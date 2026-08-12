import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from "axios";
import { runtimeStore } from "@/lib/runtime-store";
import { env } from "@/lib/env";

type AxiosInternalFlags = {
  skipAuthToken?: boolean;
  skipAuthRedirect?: boolean;
  skipNotFoundLog?: boolean;
  skipNetworkLog?: boolean;
};

const safeSerialize = (value: unknown) => {
  try {
    if (typeof value === "string") return value;
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

const resolveBaseUrl = () => {
  if (typeof window !== "undefined") {
    return "/api/proxy";
  }

  const raw = env.apiUrl.trim();
  if (!raw) return "http://localhost:3001";

  // Allows local-first fallback such as: "http://localhost:3001,https://backend..."
  const candidates = raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (!candidates.length) return "http://localhost:3001";
  if (candidates.length === 1) return candidates[0];

  const localhostCandidates = candidates.filter(
    (value) => value.includes("localhost") || value.includes("127.0.0.1") || value.includes("0.0.0.0"),
  );

  if (env.nodeEnv !== "production") {
    const localCandidate = localhostCandidates[0] ?? candidates[0];
    if (localCandidate) return localCandidate;
  }

  const remoteCandidate = candidates.find((value) => !localhostCandidates.includes(value));
  return remoteCandidate ?? candidates[0];
};

const BASE_URL = resolveBaseUrl();

const axiosInstance: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const flags = config as InternalAxiosRequestConfig & AxiosInternalFlags;
    const skipAuthToken = flags.skipAuthToken === true;
    const token = runtimeStore.getItem("authToken");

    if (!skipAuthToken && token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (config.method === "get") {
      const separator = config.url?.includes("?") ? "&" : "?";
      config.url = `${config.url}${separator}_t=${Date.now()}`;
    }

    return config;
  },
  (error: AxiosError) => Promise.reject(error),
);

axiosInstance.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorResponse>) => {
    if (error.response) {
      const { status, data } = error.response;
      const flags = (error.config ?? {}) as AxiosInternalFlags;
      const skipAuthRedirect = flags.skipAuthRedirect === true;
      const skipNotFoundLog = flags.skipNotFoundLog === true;
      const isClientError = status >= 400 && status < 500;

      try {
        const logMethod = isClientError ? console.warn : console.error;
        logMethod("[axios error response]", {
          status,
          url: error.config?.baseURL ? `${error.config.baseURL}${error.config.url ?? ""}` : error.config?.url,
          method: error.config?.method,
          requestData: safeSerialize((error.config as { data?: unknown } | undefined)?.data),
          params: safeSerialize((error.config as { params?: unknown } | undefined)?.params),
          responseData: data,
        });
      } catch {}

      if (status === 401 && !skipAuthRedirect) {
        runtimeStore.removeItem("authToken");
        runtimeStore.removeItem("user");

        if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
          window.location.href = "/login";
        }
      }

      if (status === 403) {
        console.error("Acceso prohibido:", data?.message || "Sin permisos");
      }

      if (status === 404 && !skipNotFoundLog) {
        console.error("Recurso no encontrado:", data?.message || "No encontrado");
      }

      if (status >= 500) {
        console.error("Error del servidor:", data?.message || "Error interno");
      }
    } else if (error.request) {
      const flags = (error.config ?? {}) as AxiosInternalFlags;
      const skipNetworkLog = flags.skipNetworkLog === true;
      if (!skipNetworkLog) {
        try {
          console.warn("[axios network error]", {
            url: error.config?.baseURL ? `${error.config.baseURL}${error.config.url ?? ""}` : error.config?.url,
            method: error.config?.method,
            requestData: safeSerialize((error.config as { data?: unknown } | undefined)?.data),
            params: safeSerialize((error.config as { params?: unknown } | undefined)?.params),
          });
        } catch {}
        console.error("No se recibio respuesta del servidor");
      }
    } else {
      console.error("Error al configurar la peticion:", error.message);
    }

    return Promise.reject(error);
  },
);

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  message?: string;
  pagination?: {
    total: number;
    page: number;
    pages: number;
    limit: number;
  };
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  error?: string;
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

export default axiosInstance;