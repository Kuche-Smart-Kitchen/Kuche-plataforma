import axiosInstance, { type ApiResponse } from "./axiosConfig";

export type KanbanItem = Record<string, unknown> & {
  _id?: string;
  id?: string;
  etapa?: string;
  estado?: string;
};

const getKanbanColumn = async (endpoint: string): Promise<ApiResponse<KanbanItem[]>> => {
  const response = await axiosInstance.get<ApiResponse<KanbanItem[]>>(endpoint, {
    headers: {
      Accept: "application/json",
    },
  });
  return response.data;
};

export const obtenerKanbanCitas = async (): Promise<ApiResponse<KanbanItem[]>> =>
  getKanbanColumn("/api/kanban/citas");

export const obtenerKanbanDisenos = async (): Promise<ApiResponse<KanbanItem[]>> =>
  getKanbanColumn("/api/kanban/disenos");

export const obtenerKanbanCotizacion = async (): Promise<ApiResponse<KanbanItem[]>> =>
  getKanbanColumn("/api/kanban/cotizacion");

export const obtenerKanbanContrato = async (): Promise<ApiResponse<KanbanItem[]>> =>
  getKanbanColumn("/api/kanban/contrato");