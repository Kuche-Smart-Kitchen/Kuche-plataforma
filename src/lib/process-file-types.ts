export type ProcesoArchivoTipoCanonico =
  | "levantamiento_detallado"
  | "diseno"
  | "cotizacion_formal"
  | "hoja_taller"
  | "recibo_1"
  | "recibo_2"
  | "recibo_3"
  | "contrato"
  | "fotos_proyecto";

export type ProcesoArchivoTipoAlias =
  | "diseno_preliminar"
  | "diseno_final"
  | "render"
  | "sketchup"
  | "modelo_3d"
  | "recibo"
  | "recibo1"
  | "recibo2"
  | "recibo3"
  | "foto_proyecto"
  | "fotosproyecto";

export type ProcesoArchivoTipo = ProcesoArchivoTipoCanonico | ProcesoArchivoTipoAlias;

const ALIAS_TO_CANONICO: Record<ProcesoArchivoTipoAlias, ProcesoArchivoTipoCanonico> = {
  diseno_preliminar: "diseno",
  diseno_final: "diseno",
  render: "diseno",
  sketchup: "diseno",
  modelo_3d: "diseno",
  recibo: "recibo_1",
  recibo1: "recibo_1",
  recibo2: "recibo_2",
  recibo3: "recibo_3",
  foto_proyecto: "fotos_proyecto",
  fotosproyecto: "fotos_proyecto",
};

export const normalizarTipoProcesoArchivo = (tipo: string): ProcesoArchivoTipoCanonico | null => {
  const normalized = tipo.trim().toLowerCase() as ProcesoArchivoTipo;
  if (!normalized) return null;

  if (normalized in ALIAS_TO_CANONICO) {
    return ALIAS_TO_CANONICO[normalized as ProcesoArchivoTipoAlias];
  }

  const canonicos: ProcesoArchivoTipoCanonico[] = [
    "levantamiento_detallado",
    "diseno",
    "cotizacion_formal",
    "hoja_taller",
    "recibo_1",
    "recibo_2",
    "recibo_3",
    "contrato",
    "fotos_proyecto",
  ];

  return canonicos.includes(normalized as ProcesoArchivoTipoCanonico)
    ? (normalized as ProcesoArchivoTipoCanonico)
    : null;
};