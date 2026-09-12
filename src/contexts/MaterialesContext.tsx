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
  actualizarMaterial as apiActualizarMaterial,
  actualizarPrecioMaterial as apiActualizarPrecioMaterial,
  buscarMaterialPorNombre as apiBuscarMaterialPorNombre,
  crearMaterial as apiCrearMaterial,
  eliminarMaterial as apiEliminarMaterial,
  extractApiErrorMessage,
  obtenerMateriales as apiObtenerMateriales,
  type ActualizarMaterialPayload,
  type CatalogMaterial,
  type CrearMaterialPayload,
  type MaterialesFiltros,
} from "@/lib/axios/materialesApi";

interface MaterialesContextValue {
  materiales: CatalogMaterial[];
  loading: boolean;
  isSaving: boolean;
  error: string | null;
  cargarMateriales: (filtros?: MaterialesFiltros) => Promise<CatalogMaterial[]>;
  agregarMaterial: (payload: CrearMaterialPayload) => Promise<{ success: boolean; data?: CatalogMaterial; error?: string }>;
  actualizarMaterial: (id: string, payload: ActualizarMaterialPayload) => Promise<{ success: boolean; data?: CatalogMaterial; error?: string }>;
  actualizarPrecio: (id: string, precio: { precioUnitario?: number | null; precioPorMetro?: number | null }) => Promise<{ success: boolean; data?: CatalogMaterial; error?: string }>;
  guardarCambiosPrecios: (cambios: Array<{ id: string; nuevoPrecio?: number; precioUnitario?: number | null; precioPorMetro?: number | null }>) => Promise<{ success: boolean; error?: string; actualizados: number }>;
  eliminarMaterial: (id: string) => Promise<{ success: boolean; error?: string }>;
  buscarPorNombre: (nombre: string) => Promise<CatalogMaterial | null>;
}

const MaterialesContext = createContext<MaterialesContextValue | undefined>(undefined);

export function MaterialesProvider({ children }: { children: ReactNode }) {
  const [materiales, setMateriales] = useState<CatalogMaterial[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const cargarMateriales = useCallback(async (filtros?: MaterialesFiltros): Promise<CatalogMaterial[]> => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiObtenerMateriales(filtros);
      setMateriales(data);
      return data;
    } catch (err) {
      const msg = extractApiErrorMessage(err, "No se pudo cargar el catálogo de materiales");
      setError(msg);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void cargarMateriales();
  }, [cargarMateriales]);

  const agregarMaterial = useCallback(
    async (payload: CrearMaterialPayload): Promise<{ success: boolean; data?: CatalogMaterial; error?: string }> => {
      setIsSaving(true);
      setError(null);
      try {
        const nuevo = await apiCrearMaterial(payload);
        setMateriales((prev) => {
          const index = prev.findIndex((m) => m._id === nuevo._id || (nuevo.idCotizador && m.idCotizador === nuevo.idCotizador));
          if (index >= 0) {
            const next = [...prev];
            next[index] = nuevo;
            return next;
          }
          return [nuevo, ...prev];
        });
        return { success: true, data: nuevo };
      } catch (err) {
        const msg = extractApiErrorMessage(err, "Error al crear el material");
        setError(msg);
        return { success: false, error: msg };
      } finally {
        setIsSaving(false);
      }
    },
    [],
  );

  const actualizarMaterial = useCallback(
    async (id: string, payload: ActualizarMaterialPayload): Promise<{ success: boolean; data?: CatalogMaterial; error?: string }> => {
      setIsSaving(true);
      setError(null);
      try {
        const actualizado = await apiActualizarMaterial(id, payload);
        setMateriales((prev) =>
          prev.map((m) => (m._id === id || m.id === id || m.idCotizador === id ? { ...m, ...actualizado } : m)),
        );
        return { success: true, data: actualizado };
      } catch (err) {
        const msg = extractApiErrorMessage(err, "Error al actualizar el material");
        setError(msg);
        return { success: false, error: msg };
      } finally {
        setIsSaving(false);
      }
    },
    [],
  );

  const actualizarPrecio = useCallback(
    async (
      id: string,
      precio: { precioUnitario?: number | null; precioPorMetro?: number | null },
    ): Promise<{ success: boolean; data?: CatalogMaterial; error?: string }> => {
      setIsSaving(true);
      setError(null);
      try {
        const actualizado = await apiActualizarPrecioMaterial(id, precio);
        setMateriales((prev) =>
          prev.map((m) => (m._id === id || m.id === id || m.idCotizador === id ? { ...m, ...actualizado } : m)),
        );
        return { success: true, data: actualizado };
      } catch (err) {
        const msg = extractApiErrorMessage(err, "Error al actualizar precio");
        setError(msg);
        return { success: false, error: msg };
      } finally {
        setIsSaving(false);
      }
    },
    [],
  );

  const guardarCambiosPrecios = useCallback(
    async (
      cambios: Array<{ id: string; nuevoPrecio?: number; precioUnitario?: number | null; precioPorMetro?: number | null }>,
    ): Promise<{ success: boolean; error?: string; actualizados: number }> => {
      if (cambios.length === 0) {
        return { success: true, actualizados: 0 };
      }

      setIsSaving(true);
      setError(null);
      let actualizados = 0;
      const errores: string[] = [];

      try {
        await Promise.all(
          cambios.map(async (c) => {
            try {
              await apiActualizarPrecioMaterial(c.id, {
                nuevoPrecio: c.nuevoPrecio,
                precioUnitario: c.precioUnitario,
                precioPorMetro: c.precioPorMetro,
              });
              actualizados += 1;
            } catch (err) {
              errores.push(`${c.id}: ${extractApiErrorMessage(err)}`);
            }
          }),
        );

        // Recargamos el catálogo completo para sincronizar
        await cargarMateriales();

        if (errores.length > 0) {
          const msg = `Se actualizaron ${actualizados} de ${cambios.length} materiales. Errores: ${errores.join(", ")}`;
          setError(msg);
          return { success: false, error: msg, actualizados };
        }

        return { success: true, actualizados };
      } catch (err) {
        const msg = extractApiErrorMessage(err, "Error al guardar cambios de precios");
        setError(msg);
        return { success: false, error: msg, actualizados };
      } finally {
        setIsSaving(false);
      }
    },
    [cargarMateriales],
  );

  const eliminarMaterial = useCallback(async (id: string): Promise<{ success: boolean; error?: string }> => {
    setIsSaving(true);
    setError(null);
    try {
      await apiEliminarMaterial(id);
      setMateriales((prev) => prev.filter((m) => m._id !== id && m.id !== id && m.idCotizador !== id));
      return { success: true };
    } catch (err) {
      const msg = extractApiErrorMessage(err, "Error al eliminar el material");
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setIsSaving(false);
    }
  }, []);

  const buscarPorNombre = useCallback(async (nombre: string): Promise<CatalogMaterial | null> => {
    return apiBuscarMaterialPorNombre(nombre);
  }, []);

  const value = useMemo(
    () => ({
      materiales,
      loading,
      isSaving,
      error,
      cargarMateriales,
      agregarMaterial,
      actualizarMaterial,
      actualizarPrecio,
      guardarCambiosPrecios,
      eliminarMaterial,
      buscarPorNombre,
    }),
    [
      materiales,
      loading,
      isSaving,
      error,
      cargarMateriales,
      agregarMaterial,
      actualizarMaterial,
      actualizarPrecio,
      guardarCambiosPrecios,
      eliminarMaterial,
      buscarPorNombre,
    ],
  );

  return <MaterialesContext.Provider value={value}>{children}</MaterialesContext.Provider>;
}

export function useMaterialesContext() {
  const context = useContext(MaterialesContext);
  if (!context) {
    throw new Error("useMaterialesContext debe usarse dentro de un MaterialesProvider");
  }
  return context;
}
