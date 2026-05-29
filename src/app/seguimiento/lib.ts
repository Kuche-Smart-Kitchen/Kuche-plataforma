export interface SeguimientoPago {
  amount?: number;
  date?: string;
  receiptLabel?: string;
  receiptImage?: string;
}

export interface SeguimientoPagos {
  anticipo?: SeguimientoPago;
  segundoPago?: SeguimientoPago;
  liquidacion?: SeguimientoPago;
}

export interface SeguimientoProject {
  codigo: string;
  cliente: string;
  isProspect: boolean;
  inversion: number;
  fechaInicio?: string;
  fechaEntrega?: string;
  garantiaInicio?: string;
  estadoProyecto?: string;
  etapaActual?: string;
  pagos?: SeguimientoPagos;
  seguimientoNota?: string;
  archivos?: Array<{ id: string; nombre: string; tipo: string; url: string }>;
  cotizacionPreliminarImage?: string;
  cotizacionFormalImage?: string;
  projectId?: string;
  taskId?: string;
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(value);
}
