import axiosInstance from "./axiosConfig";
import type { User, UserRole } from "./authApi";

type UsersResponse =
  | User[]
  | { data?: User[] | { users?: User[]; usuarios?: User[] }; users?: User[]; usuarios?: User[] };

const getUsersFromResponse = (payload: UsersResponse): User[] => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.users)) return payload.users;
  if (Array.isArray(payload.usuarios)) return payload.usuarios;
  if (Array.isArray(payload.data)) return payload.data;
  if (payload.data && !Array.isArray(payload.data)) {
    return payload.data.users ?? payload.data.usuarios ?? [];
  }
  return [];
};

export type AssignableUser = Pick<User, "id" | "_id" | "nombre" | "correo" | "rol">;

const assignableRoles: UserRole[] = [
  "admin",
  "ingeniero",
  "arquitecto",
  "empleado",
  "empleado_general",
];

export const fetchAssignableUsers = async (): Promise<AssignableUser[]> => {
  const response = await axiosInstance.get<UsersResponse>("/api/usuarios");
  return getUsersFromResponse(response.data)
    .filter((user) => user.activo !== false && assignableRoles.includes(user.rol))
    .filter((user) => Boolean(user.nombre?.trim()))
    .map((user) => ({
      id: user.id ?? user._id ?? user.correo,
      _id: user._id,
      nombre: user.nombre.trim(),
      correo: user.correo,
      rol: user.rol,
    }));
};