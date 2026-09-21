"use client";

import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import {
  agendarVisita,
  obtenerDisponibilidadVisita,
  type AgendarVisitaPayload,
  type DisponibilidadVisitaResponse,
} from "@/lib/axios/visitasApi";
import type { ApiResponse } from "@/lib/axios/axiosConfig";

type VisitasContextValue = {
  agendar: (payload: AgendarVisitaPayload, captchaToken?: string) => Promise<ApiResponse<Record<string, unknown>>>;
  consultarDisponibilidad: (fecha: string) => Promise<DisponibilidadVisitaResponse>;
};

const VisitasContext = createContext<VisitasContextValue | undefined>(undefined);

export function VisitasProvider({ children }: { children: ReactNode }) {
  const agendar = useCallback(
    (payload: AgendarVisitaPayload, captchaToken?: string) => agendarVisita(payload, captchaToken),
    [],
  );
  const consultarDisponibilidad = useCallback(
    (fecha: string) => obtenerDisponibilidadVisita(fecha),
    [],
  );
  const value = useMemo(() => ({ agendar, consultarDisponibilidad }), [agendar, consultarDisponibilidad]);
  return <VisitasContext.Provider value={value}>{children}</VisitasContext.Provider>;
}

export function useVisitasContext() {
  const context = useContext(VisitasContext);
  if (!context) throw new Error("useVisitasContext debe usarse dentro de un VisitasProvider");
  return context;
}