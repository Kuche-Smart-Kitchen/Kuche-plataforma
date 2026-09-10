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
    try {
      const [nextMateriales, nextHerrajes, nextElectrodomesticos, nextExtras] = await Promise.all([
        obtenerMaterialesLevantamiento(),
        obtenerHerrajesLevantamiento(),
        obtenerElectrodomesticosLevantamiento(),
        obtenerExtrasLevantamiento(),
      ]);
      setMateriales(nextMateriales);
      setHerrajes(nextHerrajes);
      setElectrodomesticos(nextElectrodomesticos);
      setExtras(nextExtras);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "No se pudo cargar el catalogo");
    } finally {
      setLoading(false);
    }
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