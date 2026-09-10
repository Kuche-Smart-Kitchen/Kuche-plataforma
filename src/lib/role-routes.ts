import { authApi, type User, type UserRole } from "@/lib/axios";

export type AppRole = User["rol"] | null | undefined;

export const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/agendar",
  "/experiencia",
  "/aviso-de-privacidad",
  "/catalogo",
  "/dashboard",
  "/api/health/backend",
];

const ROUTE_POLICIES: Array<{
  prefix: string;
  allowedRoles: UserRole[];
}> = [
  { prefix: "/admin", allowedRoles: ["admin"] },
  {
    prefix: "/dashboard/empleado",
    allowedRoles: ["ingeniero", "arquitecto", "empleado", "empleado_general"],
  },
  {
    prefix: "/dashboard",
    allowedRoles: ["ingeniero", "arquitecto", "empleado", "empleado_general"],
  },
];

export const normalizePathname = (pathname: string): string => {
  return pathname.split("?")[0].split("#")[0].toLowerCase();
};

export const getDashboardRouteForRole = (role: AppRole): string => {
  if (role === "admin") return "/admin";
  if (role === "ingeniero" || role === "arquitecto" || role === "empleado" || role === "empleado_general") {
    return "/dashboard/empleado";
  }
  return "/login";
};

export const getLoginRedirectForUser = (user: Pick<User, "rol"> | null | undefined): string =>
  getDashboardRouteForRole(user?.rol);

export const getReturnRouteForLoggedUser = (): string => {
  return getDashboardRouteForRole(authApi.getUserFromStorage()?.rol);
};

export const resolveRouteAccess = ({
  role,
  pathname,
}: {
  role: AppRole;
  pathname: string;
}): { allowed: boolean; redirect: string | null } => {
  const normalizedPath = normalizePathname(pathname);

  if (!normalizedPath || PUBLIC_ROUTES.includes(normalizedPath)) {
    return { allowed: true, redirect: null };
  }

  if (!role) {
    return { allowed: false, redirect: "/login" };
  }

  const matchingPolicy = ROUTE_POLICIES.find(
    (policy) =>
      normalizedPath === policy.prefix || normalizedPath.startsWith(`${policy.prefix}/`),
  );

  if (!matchingPolicy) {
    return { allowed: true, redirect: null };
  }

  const currentRole = role as Exclude<AppRole, null | undefined>;

  if (!matchingPolicy.allowedRoles.includes(currentRole)) {
    return {
      allowed: false,
      redirect: getDashboardRouteForRole(role),
    };
  }

  return { allowed: true, redirect: null };
};