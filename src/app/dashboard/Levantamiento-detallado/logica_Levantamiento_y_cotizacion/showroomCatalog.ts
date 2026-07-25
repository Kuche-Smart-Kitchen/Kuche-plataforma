import type { MaterialCategoria, MaterialConfig } from "@/lib/config-levantamiento";

export type ShowroomMaterialOption = {
  id: string;
  name: string;
  image: string;
};

export type ShowroomMaterialCatalog = {
  cubiertas: ShowroomMaterialOption[];
  frentes: ShowroomMaterialOption[];
  herrajes: ShowroomMaterialOption[];
};

export type ShowroomSelectionSummary = {
  meters: number;
  label: string;
};

export function buildMaterialShowroomCatalog(materiales: MaterialConfig[]): ShowroomMaterialCatalog {
  const out: ShowroomMaterialCatalog = {
    cubiertas: [],
    frentes: [],
    herrajes: [],
  };

  const key: Record<MaterialCategoria, keyof ShowroomMaterialCatalog> = {
    cubierta: "cubiertas",
    frente: "frentes",
    herraje: "herrajes",
  };

  for (const material of materiales) {
    out[key[material.categoria]].push({
      id: material.id,
      name: material.nombre,
      image: "",
    });
  }

  return out;
}

export function buildShowroomSelectionSummary(input: {
  largo: string;
  selectedCubierta: string | null;
  selectedFrenteIds: string[];
  selectedHerraje: string | null;
  materialCatalog: ShowroomMaterialCatalog;
}): ShowroomSelectionSummary {
  const cubierta = input.materialCatalog.cubiertas.find((item) => item.id === input.selectedCubierta);
  const herraje = input.materialCatalog.herrajes.find((item) => item.id === input.selectedHerraje);
  const frenteNames = input.selectedFrenteIds
    .map((id) => input.materialCatalog.frentes.find((item) => item.id === id)?.name)
    .filter(Boolean);

  return {
    meters: Number.parseFloat(input.largo) || 0,
    label: [cubierta?.name, ...frenteNames, herraje?.name].filter(Boolean).join(" / "),
  };
}
