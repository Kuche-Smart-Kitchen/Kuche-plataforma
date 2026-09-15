"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  obtenerElectrodomesticosLevantamiento,
  obtenerExtrasLevantamiento,
  obtenerHerrajesLevantamiento,
  obtenerMaterialesLevantamiento,
  type CatalogEquipment,
  type CatalogMaterial,
} from "@/lib/axios/catalogosApi";

type LevantamientoCatalogoContextValue = {
  materiales: CatalogMaterial[];
  herrajes: CatalogMaterial[];
  electrodomesticos: CatalogEquipment[];
  extras: CatalogEquipment[];
  loading: boolean;
  error: string | null;
  recargar: () => Promise<void>;
};

const LevantamientoCatalogoContext = createContext<LevantamientoCatalogoContextValue | undefined>(undefined);

export function LevantamientoCatalogoProvider({ children }: { children: ReactNode }) {
  const [materiales, setMateriales] = useState<CatalogMaterial[]>([]);
  const [herrajes, setHerrajes] = useState<CatalogMaterial[]>([]);
  const [electrodomesticos, setElectrodomesticos] = useState<CatalogEquipment[]>([]);
  const [extras, setExtras] = useState<CatalogEquipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const recargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [materialesResult, herrajesResult, electrodomesticosResult, extrasResult] = await Promise.allSettled([
      obtenerMaterialesLevantamiento(),
      obtenerHerrajesLevantamiento(),
      obtenerElectrodomesticosLevantamiento(),
      obtenerExtrasLevantamiento(),
    ]);

    if (materialesResult.status === "fulfilled") setMateriales(materialesResult.value);
    if (herrajesResult.status === "fulfilled") setHerrajes(herrajesResult.value);
    if (electrodomesticosResult.status === "fulfilled") setElectrodomesticos(electrodomesticosResult.value);
    if (extrasResult.status === "fulfilled") setExtras(extrasResult.value);

    const failed = [materialesResult, herrajesResult, electrodomesticosResult, extrasResult].find(
      (result) => result.status === "rejected",
    ) as PromiseRejectedResult | undefined;
    if (failed) {
      const reason = failed.reason;
      setError(reason instanceof Error ? reason.message : "No se pudo cargar parte del catalogo");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void recargar();
  }, [recargar]);

  const value = useMemo(
    () => ({ materiales, herrajes, electrodomesticos, extras, loading, error, recargar }),
    [materiales, herrajes, electrodomesticos, extras, loading, error, recargar],
  );
  return <LevantamientoCatalogoContext.Provider value={value}>{children}</LevantamientoCatalogoContext.Provider>;
}

export function useLevantamientoCatalogo() {
  const context = useContext(LevantamientoCatalogoContext);
  if (!context) throw new Error("useLevantamientoCatalogo debe usarse dentro de LevantamientoCatalogoProvider");
  return context;
}