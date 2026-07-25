import { authApi, type User } from "@/lib/axios";

export type AppRole = User["rol"] | null | undefined;

export const getDashboardRouteForRole = (role: AppRole): string => {
  if (role === "admin") return "/admin";
  return "/dashboard/empleado";
};

export const getLoginRedirectForUser = (user: Pick<User, "rol"> | null | undefined): string =>
  getDashboardRouteForRole(user?.rol);

export const getReturnRouteForLoggedUser = (): string => {
  return getDashboardRouteForRole(authApi.getUserFromStorage()?.rol);
};