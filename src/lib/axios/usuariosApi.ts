/**
 * API de Usuarios/Empleados
 * Endpoints para gestión de usuarios y empleados del sistema
 */

import axiosInstance, { ApiResponse } from './axiosConfig';

let employeesRequest: Promise<ApiResponse<Usuario[]>> | null = null;

// Tipos de datos para Usuario
export interface Usuario {
  _id: string;
  nombre: string;
  correo: string;
  rol: 'admin' | 'arquitecto' | 'empleado';
  activo: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CrearUsuarioPayload {
  nombre: string;
  correo: string;
  rol: 'admin' | 'arquitecto' | 'empleado';
  password?: string;
}

/**
 * Listar todos los usuarios activos
 */
export const listarUsuarios = async (): Promise<ApiResponse<Usuario[]>> => {
  const response = await axiosInstance.get<ApiResponse<Usuario[]>>('/api/usuarios');
  return response.data;
};

/**
 * Listar empleados activos (alias para asignación)
 */
export const listarEmpleados = async (): Promise<ApiResponse<Usuario[]>> => {
  if (employeesRequest) {
    return employeesRequest;
  }

  employeesRequest = (async () => {
    try {
      const response = await axiosInstance.get<ApiResponse<Usuario[]>>('/api/usuarios/empleados');
      return response.data;
    } catch (error) {
      return {
        success: false,
        message: 'Error al listar empleados',
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    } finally {
      employeesRequest = null;
    }
  })();

  return employeesRequest;
};

/**
 * Obtener usuario por ID
 */
export const obtenerUsuario = async (id: string): Promise<ApiResponse<Usuario>> => {
  const response = await axiosInstance.get<ApiResponse<Usuario>>(`/api/usuarios/${id}`);
  return response.data;
};

/**
 * Crear nuevo usuario/empleado para asignaciones operativas
 */
export const crearUsuario = async (payload: CrearUsuarioPayload): Promise<ApiResponse<Usuario>> => {
  const response = await axiosInstance.post<ApiResponse<Usuario>>('/api/usuarios', payload);
  return response.data;
};
