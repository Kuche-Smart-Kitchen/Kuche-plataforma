export { default as axiosInstance } from "./axiosConfig";
export type { ApiErrorResponse, ApiResponse, ApiSuccessResponse } from "./axiosConfig";

export * as authApi from "./authApi";
export type { AuthResponse, LoginCredentials, RegisterData, User, UserRole } from "./authApi";

export * as seguimientoApi from "./seguimientoApi";

export * from "./archivosClienteApi";
export * from "./materialesApi";
export * from "./catalogosApi";