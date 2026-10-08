import axiosInstance, { type ApiResponse } from "./axiosConfig";

export const TIPOS_PROYECTO = ["Cocina", "Closet", "vestidor", "Mueble para el baño"] as const;

export type TipoProyecto = (typeof TIPOS_PROYECTO)[number];

/** Campos de `Proyecto` editables desde el expediente de Clientes confirmados. */
export type DatosContratoProyecto = {
  tipo?: TipoProyecto;
  /** `YYYY-MM-DD`; cadena vacía limpia el valor. */
  fechaContrato?: string;
  /** `YYYY-MM-DD`; cadena vacía limpia el valor. */
  fechaEntrega?: string;
};

export const actualizarDatosContratoProyecto = async (
  codigo: string,
  data: DatosContratoProyecto,
): Promise<ApiResponse<Record<string, unknown>>> => {
  const response = await axiosInstance.patch<ApiResponse<Record<string, unknown>>>(
    `/api/proyectos/${encodeURIComponent(codigo.trim())}/datos-contrato`,
    data,
  );
  return response.data;
};
