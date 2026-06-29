/**
 * Configuración base de Axios para toda la aplicación
 * Incluye interceptores para manejo de tokens y errores
 */

import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { runtimeStore } from '@/lib/runtime-store';

type AxiosInternalFlags = {
  skipAuthToken?: boolean;
  skipAuthRedirect?: boolean;
  skipNotFoundLog?: boolean;
  skipNetworkLog?: boolean;
};

const safeSerialize = (value: unknown) => {
  try {
    if (typeof value === 'string') return value;
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

const resolveBaseUrl = () => {
  const raw = (process.env.NEXT_PUBLIC_API_URL || '').trim();
  if (!raw) {
    return process.env.NODE_ENV === 'production'
      ? 'https://backend-cocinas-inteligentes.vercel.app'
      : 'http://localhost:3001';
  }

  const candidates = raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  if (!candidates.length) {
    return process.env.NODE_ENV === 'production'
      ? 'https://backend-cocinas-inteligentes.vercel.app'
      : 'http://localhost:3001';
  }
  if (candidates.length === 1) return candidates[0];

  if (process.env.NODE_ENV !== 'production') {
    const localCandidate = candidates.find(
      (value) => value.includes('localhost') || value.includes('127.0.0.1'),
    );
    if (localCandidate) return localCandidate;
  }

  return candidates[0];
};

// URL base del backend
const BASE_URL = resolveBaseUrl();

// Crear instancia de axios
const axiosInstance: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30000, // 30 segundos
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Para enviar cookies automáticamente
});

// Interceptor de request - Agrega el token JWT si existe
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const flags = config as InternalAxiosRequestConfig & AxiosInternalFlags;
    const skipAuthToken = flags.skipAuthToken === true;

    // Token en memoria de ejecucion (sin dependencia de localStorage)
    const token = runtimeStore.getItem('authToken');
    
    if (!skipAuthToken && token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Agregar timestamp a peticiones GET para evitar caché del navegador
    if (config.method === 'get') {
      const separator = config.url?.includes('?') ? '&' : '?';
      config.url = `${config.url}${separator}_t=${Date.now()}`;
    }

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Interceptor de response - Manejo de errores global
axiosInstance.interceptors.response.use(
  (response) => {
    // Respuesta exitosa, retornar data directamente
    // Incluye manejo de 304 Not Modified
    if (response.status === 304) {
      console.warn('Respuesta 304 - Usando datos en caché. Considera desactivar caché.');
    }

    return response;
  },
  (error: AxiosError<ApiErrorResponse>) => {
    // Manejo de errores común
    if (error.response) {
      const { status, data } = error.response;
      const flags = (error.config ?? {}) as AxiosInternalFlags;
      const skipAuthRedirect = flags.skipAuthRedirect === true;
      const skipNotFoundLog = flags.skipNotFoundLog === true;
      const isClientError = status >= 400 && status < 500;

      try {
        const logMethod = isClientError ? console.warn : console.error;
        logMethod('[axios error response]', {
          status,
          url: error.config?.baseURL ? `${error.config.baseURL}${error.config.url ?? ''}` : error.config?.url,
          method: error.config?.method,
          requestData: safeSerialize((error.config as any)?.data),
          params: safeSerialize((error.config as any)?.params),
          responseData: data,
        });
      } catch (e) {
        // ignore logging failures
      }
      
      // Token expirado o no autorizado
      if (status === 401 && !skipAuthRedirect) {
        runtimeStore.removeItem('authToken');
        runtimeStore.removeItem('user');
        
        // Redirigir a login si no estamos ya ahí
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
      
      // Forbidden
      if (status === 403) {
        console.error('Acceso prohibido:', data?.message || 'Sin permisos');
      }
      
      // Not found
      if (status === 404 && !skipNotFoundLog) {
        console.error('Recurso no encontrado:', data?.message || 'No encontrado');
      }
      
      // Error del servidor
      if (status >= 500) {
        console.error('Error del servidor:', data?.message || 'Error interno');
      }
    } else if (error.request) {
      // Request hecho pero no hay respuesta
      const flags = (error.config ?? {}) as AxiosInternalFlags;
      const skipNetworkLog = flags.skipNetworkLog === true;
      if (!skipNetworkLog) {
        try {
          console.warn('[axios network error]', {
            url: error.config?.baseURL ? `${error.config.baseURL}${error.config.url ?? ''}` : error.config?.url,
            method: error.config?.method,
            requestData: safeSerialize((error.config as any)?.data),
            params: safeSerialize((error.config as any)?.params),
          });
        } catch (e) {
          // ignore logging failures
        }
        console.error('No se recibio respuesta del servidor');
      }
    } else {
      // Error al configurar el request
      console.error('Error al configurar la petición:', error.message);
    }
    
    return Promise.reject(error);
  }
);

// Tipos de respuesta de la API
export interface ApiSuccessResponse<T = any> {
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

export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;

export default axiosInstance;
