import axiosInstance, { type ApiResponse } from "./axiosConfig";
import { runtimeStore } from "@/lib/runtime-store";

const SESSION_ROUTE = "/api/auth/session";

const setSessionCookie = async (token: string, user: User) => {
  try {
    await fetch(SESSION_ROUTE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ token, user }),
    });
  } catch {
    // ignore cookie write errors; the in-memory store still handles the current session
  }
};

const clearSessionCookie = async () => {
  try {
    await fetch(SESSION_ROUTE, {
      method: "DELETE",
      credentials: "include",
    });
  } catch {
    // ignore cookie removal errors
  }
};

export const restoreSession = async (): Promise<ApiResponse<AuthResponse>> => {
  try {
    const response = await fetch(SESSION_ROUTE, {
      method: "GET",
      credentials: "include",
    });

    if (!response.ok) {
      return {
        success: false,
        message: "No hay sesión activa",
      };
    }

    const payload = (await response.json()) as { success?: boolean; data?: { token?: string; user?: User } };
    const token = payload?.data?.token;
    const user = payload?.data?.user;

    if (!payload.success || !token || !user) {
      return {
        success: false,
        message: "No hay sesión activa",
      };
    }

    runtimeStore.setItem("authToken", token);
    runtimeStore.setItem("user", JSON.stringify(user));

    return {
      success: true,
      message: "Sesión restaurada",
      data: {
        token,
        user,
      },
    };
  } catch {
    return {
      success: false,
      message: "No se pudo restaurar la sesión",
    };
  }
};

const loginEndpoints = ["/api/auth/login", "/api/login", "/api/auth/signin", "/api/auth/sign-in"];
const currentUserEndpoints = ["/api/auth/me", "/api/me", "/api/auth/profile", "/api/user/me"];

export interface LoginCredentials {
  correo: string;
  password: string;
}

export interface RegisterData {
  nombre: string;
  correo: string;
  password: string;
  rol?: "admin" | "arquitecto" | "empleado";
}

export interface User {
  _id?: string;
  id?: string;
  nombre: string;
  correo: string;
  rol: "admin" | "arquitecto" | "empleado";
  activo?: boolean;
  telefono?: string;
  createdAt?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

type LoginBackendResponse = {
  success?: boolean;
  message?: string;
  token?: string;
  accessToken?: string;
  access_token?: string;
  user?: User;
  data?: {
    token?: string;
    accessToken?: string;
    access_token?: string;
    user?: User;
  };
};

type CurrentUserBackendResponse =
  | ApiResponse<User>
  | {
      success?: boolean;
      message?: string;
      data?: User | { user?: User };
      user?: User;
    };

const normalizeUser = (user: User): User => ({
  ...user,
  _id: user._id ?? user.id,
  id: user.id ?? user._id,
});

const buildAuthSuccessResponse = (
  raw: LoginBackendResponse,
  fallbackEmail?: string,
): ApiResponse<AuthResponse> => {
  const token = raw.data?.token ?? raw.data?.accessToken ?? raw.data?.access_token ?? raw.token ?? raw.accessToken ?? raw.access_token;
  const user = raw.data?.user ? normalizeUser(raw.data.user) : raw.user ? normalizeUser(raw.user) : null;

  if (raw.success === false || !token) {
    return {
      success: false,
      message: raw.message || "Respuesta de autenticacion incompleta",
    };
  }

  const finalUser = user ?? {
    nombre: fallbackEmail?.split("@")[0] || "Usuario",
    correo: fallbackEmail || "",
    rol: "empleado" as const,
  };

  return {
    success: true,
    message: raw.message,
    data: {
      token,
      user: normalizeUser(finalUser),
    },
  };
};

export const login = async (
  credentials: LoginCredentials,
  captchaToken?: string,
): Promise<ApiResponse<AuthResponse>> => {
  const payloadCandidates = [
    { correo: credentials.correo, password: credentials.password },
    { email: credentials.correo, password: credentials.password },
    { username: credentials.correo, password: credentials.password },
    { correo: credentials.correo, contrasena: credentials.password },
    { email: credentials.correo, contrasena: credentials.password },
  ];

  const token = captchaToken?.trim();
  const requestConfig = token
    ? {
        headers: {
          "captcha-token": token,
        },
      }
    : undefined;

  let lastError: unknown;

  for (const endpoint of loginEndpoints) {
    for (const payload of payloadCandidates) {
      try {
        const response = await axiosInstance.post<LoginBackendResponse>(
          endpoint,
          payload,
          requestConfig,
        );
        const normalized = buildAuthSuccessResponse(response.data, credentials.correo);

        if (normalized.success) {
          const { token, user } = normalized.data;
          runtimeStore.setItem("authToken", token);
          runtimeStore.setItem("user", JSON.stringify(user));
          await setSessionCookie(token, user);
        }

        return normalized;
      } catch (error) {
        lastError = error;
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error("No se pudo iniciar sesion");
};

export const register = async (data: RegisterData): Promise<ApiResponse<AuthResponse>> => {
  const response = await axiosInstance.post<LoginBackendResponse>("/api/auth/register", data);
  const normalized = buildAuthSuccessResponse(response.data);

  if (normalized.success) {
    const { token, user } = normalized.data;
    runtimeStore.setItem("authToken", token);
    runtimeStore.setItem("user", JSON.stringify(user));
    await setSessionCookie(token, user);
  }

  return normalized;
};

export const logout = async (): Promise<void> => {
  try {
    await axiosInstance.post("/api/auth/logout");
  } catch {
    // continue cleanup even if the server endpoint is unavailable
  } finally {
    await clearSessionCookie();
    runtimeStore.removeItem("authToken");
    runtimeStore.removeItem("user");
  }
};

export const getCurrentUser = async (): Promise<ApiResponse<User>> => {
  let lastError: unknown;

  for (const endpoint of currentUserEndpoints) {
    try {
      const response = await axiosInstance.get<CurrentUserBackendResponse>(endpoint);
      const raw = response.data;
      const userPayload = raw && typeof raw === "object" && "data" in raw ? raw.data : raw;
      const user = userPayload && typeof userPayload === "object" && "user" in userPayload && userPayload.user
        ? normalizeUser(userPayload.user)
        : userPayload && typeof userPayload === "object" && ("_id" in userPayload || "id" in userPayload || "correo" in userPayload)
          ? normalizeUser(userPayload as User)
          : null;

      if (raw?.success !== false && user) {
        runtimeStore.setItem("user", JSON.stringify(user));
        return {
          success: true,
          message: "Usuario actual obtenido",
          data: user,
        };
      }

      lastError = new Error(raw?.message || "No fue posible obtener el usuario actual");
    } catch (error) {
      lastError = error;
    }
  }

  return {
    success: false,
    message: lastError instanceof Error ? lastError.message : "No fue posible obtener el usuario actual",
  };
};

export const isAuthenticated = (): boolean => {
  return !!runtimeStore.getItem("authToken");
};

export const getUserFromStorage = (): User | null => {
  const userStr = runtimeStore.getItem("user");
  if (!userStr) return null;

  try {
    return JSON.parse(userStr) as User;
  } catch {
    return null;
  }
};

export const updatePassword = async (oldPassword: string, newPassword: string): Promise<ApiResponse<void>> => {
  const response = await axiosInstance.patch<ApiResponse<void>>("/api/auth/password", {
    oldPassword,
    newPassword,
  });
  return response.data;
};

export const requestPasswordReset = async (correo: string): Promise<ApiResponse<void>> => {
  const response = await axiosInstance.post<ApiResponse<void>>("/api/auth/forgot-password", { correo });
  return response.data;
};

export const resetPassword = async (token: string, newPassword: string): Promise<ApiResponse<void>> => {
  const response = await axiosInstance.post<ApiResponse<void>>("/api/auth/reset-password", {
    token,
    newPassword,
  });
  return response.data;
};