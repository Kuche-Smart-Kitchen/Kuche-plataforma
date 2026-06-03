"use client";

import React, { createContext, useContext, useState } from "react";
import { seguimientoApi } from "@/lib/axios";
import { mergeSeguimientoFromStorage } from "@/lib/seguimiento-project";
import type { SeguimientoProject } from "@/app/seguimiento/lib";

const MAX_FAILED_ATTEMPTS = 5;
const LOGIN_LOCK_MS = 5 * 60 * 1000;

interface SeguimientoAuthContextType {
  proyecto: SeguimientoProject | null;
  codigo: string;
  setCodigo: (code: string) => void;
  error: string | null;
  isLoading: boolean;
  isBlocked: boolean;
  blockTimeRemaining: number;
  login: (code: string) => Promise<void>;
  logout: () => void;
}

const SeguimientoAuthContext = createContext<SeguimientoAuthContextType | undefined>(undefined);

export function SeguimientoAuthProvider({ children }: { children: React.ReactNode }) {
  const [proyecto, setProyecto] = useState<SeguimientoProject | null>(null);
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockUntil, setLockUntil] = useState<number | null>(null);
  const [blockTimeRemaining, setBlockTimeRemaining] = useState(0);

  const isBlocked = lockUntil ? Date.now() < lockUntil : false;

  const updateBlockTime = (lockTime: number | null) => {
    if (lockTime && Date.now() < lockTime) {
      const remaining = Math.ceil((lockTime - Date.now()) / 1000);
      setBlockTimeRemaining(remaining);
    }
  };

  const login = async (code: string) => {
    if (isBlocked) {
      updateBlockTime(lockUntil);
      setError(`Acceso bloqueado. Intenta de nuevo en ${blockTimeRemaining}s.`);
      return;
    }

    const normalizedCode = code.replace(/[^a-zA-Z0-9\-]/g, "").toUpperCase().slice(0, 20);
    
    if (!normalizedCode) {
      setError("Ingresa un codigo valido.");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await seguimientoApi.autenticarSeguimientoCliente(normalizedCode);

      if (!response.success || !response.data) {
        throw new Error(response.message || "Codigo invalido.");
      }

      console.log("=== RESPUESTA COMPLETA DEL BACKEND ===");
      console.log("Response completo:", response);
      console.log("Response.data:", response.data);
      console.log("Response.success:", response.success);
      console.log("=====================================");

      // Backend devuelve: { token, expiresAt, project: snapshot }
      const data = response.data as Record<string, unknown>;
      console.log("Datos extraídos:", data);
      const projectData = data.project as Record<string, unknown> | null;
      console.log("Project data:", projectData);

      if (!projectData) {
        throw new Error("No se pudo cargar el proyecto.");
      }

      const normalizedProject = mergeSeguimientoFromStorage(projectData);
      setProyecto(normalizedProject as unknown as SeguimientoProject);
      setFailedAttempts(0);
      setLockUntil(null);
      setCodigo("");
    } catch (err) {
      const nextAttempts = failedAttempts + 1;
      setFailedAttempts(nextAttempts);

      if (nextAttempts >= MAX_FAILED_ATTEMPTS) {
        const blockedUntil = Date.now() + LOGIN_LOCK_MS;
        setLockUntil(blockedUntil);
        setError("Demasiados intentos. Bloqueado 5 minutos.");
      } else {
        setError(err instanceof Error ? err.message : "Error al validar.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setProyecto(null);
    setCodigo("");
    setError(null);
    setFailedAttempts(0);
    setLockUntil(null);
  };

  return (
    <SeguimientoAuthContext.Provider
      value={{
        proyecto,
        codigo,
        setCodigo,
        error,
        isLoading,
        isBlocked,
        blockTimeRemaining,
        login,
        logout,
      }}
    >
      {children}
    </SeguimientoAuthContext.Provider>
  );
}

export function useSeguimientoAuth() {
  const context = useContext(SeguimientoAuthContext);
  if (!context) {
    throw new Error("useSeguimientoAuth debe ser usado dentro de SeguimientoAuthProvider");
  }
  return context;
}
