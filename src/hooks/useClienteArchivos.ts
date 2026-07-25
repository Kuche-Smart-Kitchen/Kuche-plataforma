"use client";

import { useEffect, useMemo, useState } from "react";

import { obtenerArchivosCliente, type ClienteArchivo } from "@/lib/axios/archivosClienteApi";

const clientFilesCache = new Map<string, ClienteArchivo[]>();
const clientFilesRequests = new Map<string, Promise<ClienteArchivo[]>>();

type UseClienteArchivosResult = {
  archivos: ClienteArchivo[];
  isLoading: boolean;
  error: string | null;
};

export const loadClienteArchivosCached = async (clienteId: string): Promise<ClienteArchivo[]> => {
  const normalizedClienteId = clienteId.trim();
  if (!normalizedClienteId) {
    return [];
  }

  const cached = clientFilesCache.get(normalizedClienteId);
  if (cached) {
    return cached;
  }

  const pending = clientFilesRequests.get(normalizedClienteId);
  if (pending) {
    return pending;
  }

  const request = (async () => {
    const response = await obtenerArchivosCliente(normalizedClienteId);
    if (!response.success) {
      throw new Error(response.message || "No se pudieron cargar los archivos del cliente");
    }

    const files = response.data ?? [];
    clientFilesCache.set(normalizedClienteId, files);
    return files;
  })();

  clientFilesRequests.set(normalizedClienteId, request);

  try {
    return await request;
  } finally {
    clientFilesRequests.delete(normalizedClienteId);
  }
};

export function useClienteArchivos(clienteId?: string | null, enabled = true): UseClienteArchivosResult {
  const normalizedClienteId = clienteId?.trim() ?? "";

  const [state, setState] = useState<UseClienteArchivosResult & { clienteId: string }>(() => {
    const cached = normalizedClienteId ? clientFilesCache.get(normalizedClienteId) : undefined;
    return {
      clienteId: normalizedClienteId,
      archivos: cached ?? [],
      isLoading: Boolean(enabled && normalizedClienteId && !cached),
      error: null,
    };
  });

  const cachedArchivos = useMemo(
    () => (normalizedClienteId ? clientFilesCache.get(normalizedClienteId) ?? null : null),
    [normalizedClienteId],
  );

  useEffect(() => {
    if (!enabled || !normalizedClienteId) {
      return;
    }

    let cancelled = false;

    void loadClienteArchivosCached(normalizedClienteId)
      .then((files) => {
        if (cancelled) return;
        setState({
          clienteId: normalizedClienteId,
          archivos: files,
          isLoading: false,
          error: null,
        });
      })
      .catch((loadError) => {
        if (cancelled) return;
        setState({
          clienteId: normalizedClienteId,
          archivos: [],
          isLoading: false,
          error:
            loadError instanceof Error ? loadError.message : "No se pudieron cargar los archivos del cliente",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [normalizedClienteId, enabled]);

  const isActive = enabled && Boolean(normalizedClienteId);
  const matchesCurrentClient = state.clienteId === normalizedClienteId;

  return {
    archivos: !isActive ? [] : cachedArchivos ?? (matchesCurrentClient ? state.archivos : []),
    isLoading: !isActive ? false : cachedArchivos ? false : !matchesCurrentClient || state.isLoading,
    error: !isActive ? null : matchesCurrentClient ? state.error : null,
  };
}
