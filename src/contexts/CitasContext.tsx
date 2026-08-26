"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  agendarCita,
  obtenerTodasLasCitas,
  type AgendarCitaPayload,
} from "@/lib/axios/citasApi";
import type { ApiResponse } from "@/lib/axios/axiosConfig";

type CitasContextType = {
  citas: Record<string, unknown>[];
  loading: boolean;
  error: string | null;
  cargarCitas: () => Promise<void>;
  crearCita: (
    payload: AgendarCitaPayload,
    captchaToken?: string,
  ) => Promise<ApiResponse<Record<string, unknown>>>;
};

const CitasContext = createContext<CitasContextType | undefined>(undefined);

export function CitasProvider({ children }: { children: ReactNode }) {
  const [citas, setCitas] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargarCitas = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await obtenerTodasLasCitas();
      if (response.success) {
        setCitas(response.data ?? []);
      } else {
        setCitas([]);
        setError(response.message || "No se pudieron cargar las citas");
      }
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : "Error al cargar citas";
      setCitas([]);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const crearCita = useCallback(
    async (payload: AgendarCitaPayload, captchaToken?: string) => {
      const response = await agendarCita(payload, captchaToken);
      if (response.success) {
        await cargarCitas();
      }
      return response;
    },
    [cargarCitas],
  );

  useEffect(() => {
    void cargarCitas();
  }, [cargarCitas]);

  const value = useMemo<CitasContextType>(
    () => ({
      citas,
      loading,
      error,
      cargarCitas,
      crearCita,
    }),
    [citas, loading, error, cargarCitas, crearCita],
  );

  return <CitasContext.Provider value={value}>{children}</CitasContext.Provider>;
}

export function useCitasContext() {
  const context = useContext(CitasContext);
  if (!context) {
    throw new Error("useCitasContext debe usarse dentro de un CitasProvider");
  }
  return context;
}
