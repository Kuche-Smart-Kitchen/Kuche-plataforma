"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  actualizarIntegrante,
  crearIntegrante,
  eliminarIntegrante,
  fetchAssignableUsers,
  type ActualizarIntegrantePayload,
  type AssignableUser,
  type CrearIntegrantePayload,
} from "@/lib/axios/usuariosApi";

export type TeamMember = { id: string; name: string };

type EquipoContextValue = {
  teamMembers: TeamMember[];
  loading: boolean;
  error: string | null;
  recargar: () => Promise<void>;
  agregarIntegrante: (payload: CrearIntegrantePayload) => Promise<TeamMember>;
  actualizarIntegrante: (id: string, payload: ActualizarIntegrantePayload) => Promise<TeamMember>;
  eliminarIntegrante: (id: string) => Promise<void>;
};

const EquipoContext = createContext<EquipoContextValue | undefined>(undefined);

const toTeamMember = (user: AssignableUser): TeamMember => ({
  id: user.id ?? user._id ?? user.correo,
  name: user.nombre,
});

export function EquipoProvider({ children }: { children: ReactNode }) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const recargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const users = await fetchAssignableUsers();
      setTeamMembers(users.map(toTeamMember));
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "No se pudieron cargar los integrantes");
      setTeamMembers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void recargar();
  }, [recargar]);

  const agregarIntegrante = useCallback(async (payload: CrearIntegrantePayload) => {
    const user = await crearIntegrante(payload);
    const member = toTeamMember({
      id: user.id,
      _id: user._id,
      nombre: user.nombre,
      correo: user.correo,
      rol: user.rol,
    });
    setTeamMembers((prev) => [...prev, member]);
    return member;
  }, []);

  const actualizarIntegranteEnEquipo = useCallback(
    async (id: string, payload: ActualizarIntegrantePayload) => {
      const user = await actualizarIntegrante(id, payload);
      const member = toTeamMember({
        id: user.id,
        _id: user._id,
        nombre: user.nombre,
        correo: user.correo,
        rol: user.rol,
      });
      setTeamMembers((prev) => prev.map((item) => (item.id === id ? member : item)));
      await recargar();
      return member;
    },
    [recargar],
  );

  const eliminarIntegranteDelEquipo = useCallback(
    async (id: string) => {
      await eliminarIntegrante(id);
      setTeamMembers((prev) => prev.filter((item) => item.id !== id));
      await recargar();
    },
    [recargar],
  );

  const value = useMemo(
    () => ({
      teamMembers,
      loading,
      error,
      recargar,
      agregarIntegrante,
      actualizarIntegrante: actualizarIntegranteEnEquipo,
      eliminarIntegrante: eliminarIntegranteDelEquipo,
    }),
    [
      teamMembers,
      loading,
      error,
      recargar,
      agregarIntegrante,
      actualizarIntegranteEnEquipo,
      eliminarIntegranteDelEquipo,
    ],
  );
  return <EquipoContext.Provider value={value}>{children}</EquipoContext.Provider>;
}

export function useEquipoContext() {
  const context = useContext(EquipoContext);
  if (!context) throw new Error("useEquipoContext debe usarse dentro de un EquipoProvider");
  return context;
}
