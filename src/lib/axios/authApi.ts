import axiosInstance, { type ApiResponse } from "./axiosConfig";
import { runtimeStore } from "@/lib/runtime-store";

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

const buildAuthSuccessResponse = (raw: LoginBackendResponse): ApiResponse<AuthResponse> => {
  const token = raw.data?.token ?? raw.data?.accessToken ?? raw.data?.access_token ?? raw.token ?? raw.accessToken ?? raw.access_token;
  const user = raw.data?.user ? normalizeUser(raw.data.user) : raw.user ? normalizeUser(raw.user) : null;

  if (raw.success === false || !token || !user) {
    return {
      success: false,
      message: raw.message || "Respuesta de autenticacion incompleta",
    };
  }

  return {
    success: true,
    message: raw.message,
    data: {
      token,
      user,
    },
  };
};

export const login = async (credentials: LoginCredentials): Promise<ApiResponse<AuthResponse>> => {
  const response = await axiosInstance.post<LoginBackendResponse>("/api/auth/login", credentials);
  const normalized = buildAuthSuccessResponse(response.data);

  if (normalized.success) {
    const { token, user } = normalized.data;
    runtimeStore.setItem("authToken", token);
    runtimeStore.setItem("user", JSON.stringify(user));
  }

  return normalized;
};

export const register = async (data: RegisterData): Promise<ApiResponse<AuthResponse>> => {
  const response = await axiosInstance.post<LoginBackendResponse>("/api/auth/register", data);
  const normalized = buildAuthSuccessResponse(response.data);

  if (normalized.success) {
    const { token, user } = normalized.data;
    runtimeStore.setItem("authToken", token);
    runtimeStore.setItem("user", JSON.stringify(user));
  }

  return normalized;
};

export const logout = async (): Promise<void> => {
  try {
    await axiosInstance.post("/api/auth/logout");
  } finally {
    runtimeStore.removeItem("authToken");
    runtimeStore.removeItem("user");
  }
};

export const getCurrentUser = async (): Promise<ApiResponse<User>> => {
  const response = await axiosInstance.get<CurrentUserBackendResponse>("/api/auth/me");
  const raw = response.data;
  const userPayload = raw && typeof raw === "object" && "data" in raw ? raw.data : raw;
  const user = userPayload && typeof userPayload === "object" && "user" in userPayload && userPayload.user
    ? normalizeUser(userPayload.user)
    : userPayload && typeof userPayload === "object" && ("_id" in userPayload || "id" in userPayload || "correo" in userPayload)
      ? normalizeUser(userPayload as User)
      : null;

  if (!raw?.success || !user) {
    return {
      success: false,
      message: raw?.message || "No fue posible obtener el usuario actual",
    };
  }

  runtimeStore.setItem("user", JSON.stringify(user));

  return {
    success: true,
    message: "Usuario actual obtenido",
    data: user,
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