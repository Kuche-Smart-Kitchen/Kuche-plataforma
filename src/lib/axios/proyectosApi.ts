import axiosInstance, { type ApiResponse } from "./axiosConfig";

/** Valores históricos de `Proyecto.tipo`, usados solo como sugerencias de autocompletado (datalist).
 * El campo ahora es texto libre en el frontend; ver docs/AREA_CONTRATOS_Y_PROYECTOS_RUTAS.md para
 * el cambio de validación pendiente en backend. */
export const TIPOS_PROYECTO = ["Cocina", "Closet", "vestidor", "Mueble para el baño"] as const;

/** Campos de `Proyecto` editables desde el expediente de Clientes confirmados. */
export type DatosContratoProyecto = {
  /** Texto libre (antes limitado al enum `TIPOS_PROYECTO`; backend debe relajar su validación). */
  tipo?: string;
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
