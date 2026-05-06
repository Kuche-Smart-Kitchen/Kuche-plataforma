"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { authApi } from "@/lib/axios";
import {
  actualizarCategoriaElectrodomestico,
  actualizarCategoriaExtra,
  actualizarElectrodomestico,
  actualizarExtra,
  crearCategoriaElectrodomestico,
  crearCategoriaExtra,
  crearElectrodomestico,
  crearExtra,
  eliminarCategoriaElectrodomestico,
  eliminarCategoriaExtra,
  eliminarElectrodomestico,
  eliminarExtra,
  obtenerCategoriasElectrodomesticos,
  obtenerCategoriasExtras,
  obtenerElectrodomesticos,
  obtenerExtras,
  subirImagenCloudinary,
  type CloudinaryUploadResponse,
  type ElectroCategoria,
  type ElectroCategoriaPayload,
  type Electrodomestico,
  type ElectrodomesticoPayload,
  type Extra,
  type ExtraCategoria,
  type ExtraCategoriaPayload,
  type ExtraPayload,
} from "@/lib/axios/equipamientoApi";

type CatalogEquipamientoContextValue = {
  electrodomesticos: Electrodomestico[];
  electroCategorias: ElectroCategoria[];
  extrasCategorias: ExtraCategoria[];
  extras: Extra[];
  loading: boolean;
  isMutating: boolean;
  error: string | null;
  canMutate: boolean;
  canDelete: boolean;
  loadAll: () => Promise<void>;
  uploadImage: (file: File) => Promise<CloudinaryUploadResponse | null>;
  createElectrodomestico: (payload: ElectrodomesticoPayload) => Promise<boolean>;
  updateElectrodomestico: (id: string, payload: Partial<ElectrodomesticoPayload>) => Promise<boolean>;
  removeElectrodomestico: (id: string) => Promise<boolean>;
  createElectroCategoria: (payload: ElectroCategoriaPayload) => Promise<boolean>;
  updateElectroCategoria: (id: string, payload: Partial<ElectroCategoriaPayload>) => Promise<boolean>;
  removeElectroCategoria: (id: string) => Promise<boolean>;
  createExtraCategoria: (payload: ExtraCategoriaPayload) => Promise<boolean>;
  updateExtraCategoria: (id: string, payload: Partial<ExtraCategoriaPayload>) => Promise<boolean>;
  removeExtraCategoria: (id: string) => Promise<boolean>;
  createExtra: (payload: ExtraPayload) => Promise<boolean>;
  updateExtra: (id: string, payload: Partial<ExtraPayload>) => Promise<boolean>;
  removeExtra: (id: string) => Promise<boolean>;
};

const CatalogEquipamientoContext = createContext<CatalogEquipamientoContextValue | undefined>(undefined);

const sortByName = <T extends { _id: string; nombre?: string }>(list: T[]) =>
  [...list].sort((a, b) => (a.nombre || "").localeCompare(b.nombre || "", "es"));

const upsertById = <T extends { _id: string; nombre?: string }>(list: T[], item: T) =>
  sortByName([...list.filter((current) => current._id !== item._id), item]);

const removeById = <T extends { _id: string }>(list: T[], id: string) => list.filter((current) => current._id !== id);

export function CatalogEquipamientoProvider({ children }: { children: React.ReactNode }) {
  const [electrodomesticos, setElectrodomesticos] = useState<Electrodomestico[]>([]);
  const [electroCategorias, setElectroCategorias] = useState<ElectroCategoria[]>([]);
  const [extrasCategorias, setExtrasCategorias] = useState<ExtraCategoria[]>([]);
  const [extras, setExtras] = useState<Extra[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const role = authApi.getUserFromStorage()?.rol;
  // En local, si no hay rol cargado en runtimeStore, habilitamos acciones para pruebas de UI.
  const canMutate = role ? role === "admin" || role === "empleado" : true;
  const canDelete = role ? role === "admin" : true;

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [electroResponse, electroCategoriasResponse, categoriasResponse, extrasResponse] = await Promise.all([
        obtenerElectrodomesticos({ disponible: true }),
        obtenerCategoriasElectrodomesticos(),
        obtenerCategoriasExtras(),
        obtenerExtras({ disponible: true }),
      ]);

      if (electroResponse.success && electroResponse.data) {
        setElectrodomesticos(sortByName(electroResponse.data));
      } else {
        setElectrodomesticos([]);
      }

      if (electroCategoriasResponse.success && electroCategoriasResponse.data) {
        setElectroCategorias(sortByName(electroCategoriasResponse.data));
      } else {
        setElectroCategorias([]);
      }

      if (categoriasResponse.success && categoriasResponse.data) {
        setExtrasCategorias(sortByName(categoriasResponse.data));
      } else {
        setExtrasCategorias([]);
      }

      if (extrasResponse.success && extrasResponse.data) {
        setExtras(sortByName(extrasResponse.data));
      } else {
        setExtras([]);
      }

      if (!electroResponse.success && !electroCategoriasResponse.success && !categoriasResponse.success && !extrasResponse.success) {
        setError(
          electroResponse.message || electroCategoriasResponse.message || categoriasResponse.message || extrasResponse.message || "No se pudo cargar el catalogo de equipamiento.",
        );
      }
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "No se pudo cargar el catalogo de equipamiento.");
      setElectrodomesticos([]);
      setElectroCategorias([]);
      setExtrasCategorias([]);
      setExtras([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const uploadImage = useCallback(async (file: File): Promise<CloudinaryUploadResponse | null> => {
    const response = await subirImagenCloudinary(file);
    if (!response.success || !response.data) {
      setError(response.message || "No se pudo subir la imagen.");
      return null;
    }
    setError(null);
    return response.data;
  }, []);

  const createElectrodomesticoAction = useCallback(
    async (payload: ElectrodomesticoPayload) => {
      setIsMutating(true);
      try {
      if (!canMutate) {
        setError("No tienes permisos para crear electrodomesticos.");
        return false;
      }
      const response = await crearElectrodomestico(payload);
      if (!response.success) {
        setError(response.message || "No se pudo crear el electrodomestico.");
        return false;
      }
      if (response.data) {
        setElectrodomesticos((prev) => upsertById(prev, response.data as Electrodomestico));
      } else {
        await loadAll();
      }
      setError(null);
      return true;
      } finally {
        setIsMutating(false);
      }
    },
    [canMutate, loadAll],
  );

  const updateElectrodomesticoAction = useCallback(
    async (id: string, payload: Partial<ElectrodomesticoPayload>) => {
      setIsMutating(true);
      try {
      if (!canMutate) {
        setError("No tienes permisos para editar electrodomesticos.");
        return false;
      }
      const response = await actualizarElectrodomestico(id, payload);
      if (!response.success) {
        setError(response.message || "No se pudo actualizar el electrodomestico.");
        return false;
      }
      if (response.data) {
        setElectrodomesticos((prev) => upsertById(prev, response.data as Electrodomestico));
      } else {
        await loadAll();
      }
      setError(null);
      return true;
      } finally {
        setIsMutating(false);
      }
    },
    [canMutate, loadAll],
  );

  const removeElectrodomesticoAction = useCallback(
    async (id: string) => {
      setIsMutating(true);
      try {
      if (!canDelete) {
        setError("Solo administradores pueden eliminar electrodomesticos.");
        return false;
      }
      const response = await eliminarElectrodomestico(id);
      if (!response.success) {
        setError(response.message || "No se pudo eliminar el electrodomestico.");
        return false;
      }
      setElectrodomesticos((prev) => removeById(prev, id));
      setError(null);
      return true;
      } finally {
        setIsMutating(false);
      }
    },
    [canDelete, loadAll],
  );

  const createExtraCategoriaAction = useCallback(
    async (payload: ExtraCategoriaPayload) => {
      setIsMutating(true);
      try {
      if (!canMutate) {
        setError("No tienes permisos para crear categorias de extras.");
        return false;
      }
      const response = await crearCategoriaExtra(payload);
      if (!response.success) {
        setError(response.message || "No se pudo crear la categoria.");
        return false;
      }
      if (response.data) {
        setExtrasCategorias((prev) => upsertById(prev, response.data as ExtraCategoria));
      } else {
        await loadAll();
      }
      setError(null);
      return true;
      } finally {
        setIsMutating(false);
      }
    },
    [canMutate, loadAll],
  );

  const updateExtraCategoriaAction = useCallback(
    async (id: string, payload: Partial<ExtraCategoriaPayload>) => {
      setIsMutating(true);
      try {
      if (!canMutate) {
        setError("No tienes permisos para editar categorias de extras.");
        return false;
      }
      const response = await actualizarCategoriaExtra(id, payload);
      if (!response.success) {
        setError(response.message || "No se pudo actualizar la categoria.");
        return false;
      }
      if (response.data) {
        setExtrasCategorias((prev) => upsertById(prev, response.data as ExtraCategoria));
      } else {
        await loadAll();
      }
      setError(null);
      return true;
      } finally {
        setIsMutating(false);
      }
    },
    [canMutate, loadAll],
  );

  const removeExtraCategoriaAction = useCallback(
    async (id: string) => {
      setIsMutating(true);
      try {
      if (!canDelete) {
        setError("Solo administradores pueden eliminar categorias de extras.");
        return false;
      }
      const response = await eliminarCategoriaExtra(id);
      if (!response.success) {
        setError(response.message || "No se pudo eliminar la categoria.");
        return false;
      }
      setExtrasCategorias((prev) => removeById(prev, id));
      setError(null);
      return true;
      } finally {
        setIsMutating(false);
      }
    },
    [canDelete, loadAll],
  );

  const createElectroCategoriaAction = useCallback(
    async (payload: ElectroCategoriaPayload) => {
      setIsMutating(true);
      try {
      if (!canMutate) {
        setError("No tienes permisos para crear categorias de electrodomesticos.");
        return false;
      }
      const response = await crearCategoriaElectrodomestico(payload);
      if (!response.success) {
        setError(response.message || "No se pudo crear la categoria de electrodomestico.");
        return false;
      }
      if (response.data) {
        setElectroCategorias((prev) => upsertById(prev, response.data as ElectroCategoria));
      } else {
        await loadAll();
      }
      setError(null);
      return true;
      } finally {
        setIsMutating(false);
      }
    },
    [canMutate, loadAll],
  );

  const updateElectroCategoriaAction = useCallback(
    async (id: string, payload: Partial<ElectroCategoriaPayload>) => {
      setIsMutating(true);
      try {
      if (!canMutate) {
        setError("No tienes permisos para editar categorias de electrodomesticos.");
        return false;
      }
      const response = await actualizarCategoriaElectrodomestico(id, payload);
      if (!response.success) {
        setError(response.message || "No se pudo actualizar la categoria de electrodomestico.");
        return false;
      }
      if (response.data) {
        setElectroCategorias((prev) => upsertById(prev, response.data as ElectroCategoria));
      } else {
        await loadAll();
      }
      setError(null);
      return true;
      } finally {
        setIsMutating(false);
      }
    },
    [canMutate, loadAll],
  );

  const removeElectroCategoriaAction = useCallback(
    async (id: string) => {
      setIsMutating(true);
      try {
      if (!canDelete) {
        setError("Solo administradores pueden eliminar categorias de electrodomesticos.");
        return false;
      }
      const response = await eliminarCategoriaElectrodomestico(id);
      if (!response.success) {
        setError(response.message || "No se pudo eliminar la categoria de electrodomestico.");
        return false;
      }
      setElectroCategorias((prev) => removeById(prev, id));
      setError(null);
      return true;
      } finally {
        setIsMutating(false);
      }
    },
    [canDelete, loadAll],
  );

  const createExtraAction = useCallback(
    async (payload: ExtraPayload) => {
      setIsMutating(true);
      try {
      if (!canMutate) {
        setError("No tienes permisos para crear extras.");
        return false;
      }
      const response = await crearExtra(payload);
      if (!response.success) {
        setError(response.message || "No se pudo crear el extra.");
        return false;
      }
      if (response.data) {
        setExtras((prev) => upsertById(prev, response.data as Extra));
      } else {
        await loadAll();
      }
      setError(null);
      return true;
      } finally {
        setIsMutating(false);
      }
    },
    [canMutate, loadAll],
  );

  const updateExtraAction = useCallback(
    async (id: string, payload: Partial<ExtraPayload>) => {
      setIsMutating(true);
      try {
      if (!canMutate) {
        setError("No tienes permisos para editar extras.");
        return false;
      }
      const response = await actualizarExtra(id, payload);
      if (!response.success) {
        setError(response.message || "No se pudo actualizar el extra.");
        return false;
      }
      if (response.data) {
        setExtras((prev) => upsertById(prev, response.data as Extra));
      } else {
        await loadAll();
      }
      setError(null);
      return true;
      } finally {
        setIsMutating(false);
      }
    },
    [canMutate, loadAll],
  );

  const removeExtraAction = useCallback(
    async (id: string) => {
      setIsMutating(true);
      try {
      if (!canDelete) {
        setError("Solo administradores pueden eliminar extras.");
        return false;
      }
      const response = await eliminarExtra(id);
      if (!response.success) {
        setError(response.message || "No se pudo eliminar el extra.");
        return false;
      }
      setExtras((prev) => removeById(prev, id));
      setError(null);
      return true;
      } finally {
        setIsMutating(false);
      }
    },
    [canDelete, loadAll],
  );

  const value = useMemo(
    () => ({
      electrodomesticos,
      electroCategorias,
      extrasCategorias,
      extras,
      loading,
      isMutating,
      error,
      canMutate,
      canDelete,
      loadAll,
      uploadImage,
      createElectrodomestico: createElectrodomesticoAction,
      updateElectrodomestico: updateElectrodomesticoAction,
      removeElectrodomestico: removeElectrodomesticoAction,
      createElectroCategoria: createElectroCategoriaAction,
      updateElectroCategoria: updateElectroCategoriaAction,
      removeElectroCategoria: removeElectroCategoriaAction,
      createExtraCategoria: createExtraCategoriaAction,
      updateExtraCategoria: updateExtraCategoriaAction,
      removeExtraCategoria: removeExtraCategoriaAction,
      createExtra: createExtraAction,
      updateExtra: updateExtraAction,
      removeExtra: removeExtraAction,
    }),
    [
      electrodomesticos,
      electroCategorias,
      extrasCategorias,
      extras,
      loading,
      isMutating,
      error,
      canMutate,
      canDelete,
      loadAll,
      uploadImage,
      createElectrodomesticoAction,
      updateElectrodomesticoAction,
      removeElectrodomesticoAction,
      createElectroCategoriaAction,
      updateElectroCategoriaAction,
      removeElectroCategoriaAction,
      createExtraCategoriaAction,
      updateExtraCategoriaAction,
      removeExtraCategoriaAction,
      createExtraAction,
      updateExtraAction,
      removeExtraAction,
    ],
  );

  return <CatalogEquipamientoContext.Provider value={value}>{children}</CatalogEquipamientoContext.Provider>;
}

export function useCatalogEquipamiento() {
  const context = useContext(CatalogEquipamientoContext);
  if (!context) {
    throw new Error("useCatalogEquipamiento debe usarse dentro de CatalogEquipamientoProvider.");
  }
  return context;
}
