import axiosInstance, { type ApiResponse } from "./axiosConfig";

export interface AsignarIngenierosCitaData {
  ingenieroIds: string[];
}

export const iniciarCita = async (
  id: string,
  data: Record<string, unknown> = {},
): Promise<ApiResponse<Record<string, unknown>>> => {
  const response = await axiosInstance.put<ApiResponse<Record<string, unknown>>>(`/api/citas/${id}/iniciar`, data);
  return response.data;
};

export const finalizarCita = async (
  id: string,
  data: Record<string, unknown> = {},
): Promise<ApiResponse<Record<string, unknown>>> => {
  const response = await axiosInstance.put<ApiResponse<Record<string, unknown>>>(`/api/citas/${id}/finalizar`, data);
  return response.data;
};

export const asignarIngenierosCita = async (
  id: string,
  data: AsignarIngenierosCitaData,
): Promise<ApiResponse<Record<string, unknown>>> => {
  const response = await axiosInstance.put<ApiResponse<Record<string, unknown>>>(
    `/api/citas/${id}/asignarIngenieros`,
    data,
  );
  return response.data;
};