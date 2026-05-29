"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { enviarCita, type EnviarCitaPayload, type EnviarCitaResponse } from "@/lib/validaciones/enviarCita";

export interface AgendarCitaContextType {
  isLoading: boolean;
  error: string | null;
  success: boolean;
  citaId: string | null;
  enviar: (payload: EnviarCitaPayload) => Promise<EnviarCitaResponse>;
  limpiar: () => void;
}

const AgendarCitaContext = createContext<AgendarCitaContextType | undefined>(
  undefined
);

export function AgendarCitaProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [citaId, setCitaId] = useState<string | null>(null);

  const enviar = useCallback(
    async (payload: EnviarCitaPayload): Promise<EnviarCitaResponse> => {
      setIsLoading(true);
      setError(null);
      setSuccess(false);
      setCitaId(null);

      try {
        const response = await enviarCita(payload);

        if (response.success) {
          setSuccess(true);
          setCitaId(response.citaId || null);
        } else {
          setError(response.message);
        }

        return response;
      } catch (err) {
        const errorMessage = "Error inesperado al enviar la cita";
        setError(errorMessage);
        return {
          success: false,
          message: errorMessage,
        };
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const limpiar = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setSuccess(false);
    setCitaId(null);
  }, []);

  const value: AgendarCitaContextType = {
    isLoading,
    error,
    success,
    citaId,
    enviar,
    limpiar,
  };

  return (
    <AgendarCitaContext.Provider value={value}>
      {children}
    </AgendarCitaContext.Provider>
  );
}

export function useAgendarCita(): AgendarCitaContextType {
  const context = useContext(AgendarCitaContext);
  if (!context) {
    throw new Error(
      "useAgendarCita debe ser usado dentro de AgendarCitaProvider"
    );
  }
  return context;
}
