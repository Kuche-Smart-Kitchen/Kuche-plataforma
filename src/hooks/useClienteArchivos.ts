"use client";

import { useEffect, useState } from "react";

import { obtenerArchivosCliente, type ClienteArchivo } from "@/lib/axios/archivosClienteApi";
import type { TaskFile } from "@/lib/kanban";

const clientFilesCache = new Map<string, ClienteArchivo[]>();
const clientFilesRequests = new Map<string, Promise<ClienteArchivo[]>>();

type UseClienteArchivosResult = {
  archivos: TaskFile[];
  isLoading: boolean;
  error: string | null;
};

const mapClienteArchivoToTaskFile = (archivo: ClienteArchivo): TaskFile => {
  const normalizedType = (archivo.tipo ?? "").toLowerCase();
  const type: TaskFile["type"] = normalizedType.includes("pdf") || archivo.nombre.toLowerCase().endsWith(".pdf")
    ? "pdf"
    : normalizedType.includes("render") || normalizedType.includes("imagen") || normalizedType.includes("foto")
      ? "render"
      : "otro";

  return {
    id: archivo._id,
    name: archivo.nombre,
    type,
    src: archivo.url,
  };
};

export const loadClienteArchivosCached = async (clienteId: string): Promise<TaskFile[]> => {
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

    const files = (response.data ?? []).map(mapClienteArchivoToTaskFile);
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
  const [archivos, setArchivos] = useState<ClienteArchivo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const normalizedClienteId = clienteId?.trim() ?? "";

    if (!enabled || !normalizedClienteId) {
      setArchivos([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    const cached = clientFilesCache.get(normalizedClienteId);
    if (cached) {
      setArchivos(cached);
      setError(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const load = loadClienteArchivosCached(normalizedClienteId);

    setIsLoading(true);
    setError(null);

    void load
      .then((files) => {
        if (cancelled) return;
        clientFilesCache.set(normalizedClienteId, files);
        setArchivos(files);
      })
      .catch((loadError) => {
        if (cancelled) return;
        setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar los archivos del cliente");
        setArchivos([]);
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [clienteId, enabled]);

  return { archivos, isLoading, error };
}
