import axiosInstance, { type ApiResponse } from "./axiosConfig";

export type KanbanItem = Record<string, unknown> & {
  _id?: string;
  id?: string;
  etapa?: string;
  estado?: string;
};

const normalizeKanbanPayload = (payload: unknown): KanbanItem[] => {
  if (Array.isArray(payload)) {
    return payload as KanbanItem[];
  }

  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    const candidates = [record.data, record.items, record.result, record.results, record.citas, record.disenos, record.cotizacion, record.contrato];

    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        return candidate as KanbanItem[];
      }
    }
  }

  return [];
};

const getKanbanColumn = async (endpoint: string): Promise<ApiResponse<KanbanItem[]>> => {
  try {
    const response = await axiosInstance.get<unknown>(endpoint, {
      headers: {
        Accept: "application/json",
      },
    });

    return {
      success: true,
      data: normalizeKanbanPayload(response.data),
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "No fue posible obtener datos del kanban",
    };
  }
};

const buildEndpointCandidates = (base: string): string[] => [
  base,
  base.replace(/\/kanban\//, "/"),
  base.replace(/\/kanban/, ""),
  `${base}/all`,
];

const getKanbanColumnWithFallbacks = async (baseEndpoint: string): Promise<ApiResponse<KanbanItem[]>> => {
  let lastMessage = "No fue posible obtener datos del kanban";

  for (const endpoint of buildEndpointCandidates(baseEndpoint)) {
    const response = await getKanbanColumn(endpoint);
    if (response.success) {
      return response;
    }
    lastMessage = response.message || lastMessage;
  }

  return { success: false, message: lastMessage };
};

export const obtenerKanbanCitas = async (): Promise<ApiResponse<KanbanItem[]>> =>
  getKanbanColumnWithFallbacks("/api/kanban/citas");

export const obtenerKanbanDisenos = async (): Promise<ApiResponse<KanbanItem[]>> =>
  getKanbanColumnWithFallbacks("/api/kanban/disenos");

export const obtenerKanbanCotizacion = async (): Promise<ApiResponse<KanbanItem[]>> =>
  getKanbanColumnWithFallbacks("/api/kanban/cotizacion");

export const obtenerKanbanContrato = async (): Promise<ApiResponse<KanbanItem[]>> =>
  getKanbanColumnWithFallbacks("/api/kanban/contrato");