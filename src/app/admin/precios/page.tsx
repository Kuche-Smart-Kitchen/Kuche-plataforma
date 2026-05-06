"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Download, MoreVertical, PencilLine, Plus, RefreshCw, Save, Search, Trash2, Upload } from "lucide-react";

import {
  UNIDADES_MEDIDA,
  actualizarHerraje,
  actualizarMaterial,
  crearHerraje,
  crearMaterial,
  eliminarHerraje,
  eliminarMaterial,
  obtenerHerrajes,
  obtenerMateriales,
  type Herraje,
  type Material,
  type UnidadMedida,
} from "@/lib/axios/catalogosApi";
import { useFocusTrap } from "@/hooks/useFocusTrap";

type CatalogItem = {
  _id: string;
  nombre: string;
  unidadMedida: UnidadMedida;
  categoria: string;
  idCotizador?: string;
  precioUnitario?: number;
  kind: "material" | "herraje";
};

type ImportedCatalogRow = {
  id: string;
  label: string;
  category: string;
  unit: UnidadMedida;
  unitPrice: number;
};

const toNumberOrUndefined = (value: string) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const extractList = <T,>(input: unknown, keys: string[]): T[] => {
  if (Array.isArray(input)) return input as T[];
  if (input && typeof input === "object") {
    const record = input as Record<string, unknown>;
    for (const key of keys) {
      const value = record[key];
      if (Array.isArray(value)) return value as T[];
    }
  }
  return [];
};

const safeId = (item: Record<string, unknown>) => {
  const id = item._id ?? item.id ?? item.idCotizador;
  return typeof id === "string" && id.trim().length > 0 ? id : `tmp-${Math.random().toString(36).slice(2, 10)}`;
};

const safeNumber = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const parsed = Number.parseFloat(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return undefined;
};

const formatApiErrorMessage = (
  response: { message?: string; errors?: Array<{ field?: string; message?: string }> },
  fallback: string,
) => {
  const baseMessage = response.message || fallback;
  if (!Array.isArray(response.errors) || response.errors.length === 0) return baseMessage;
  return `${baseMessage}. ${response.errors
    .map((item) => (item.field ? `${item.field}: ${item.message || "Error"}` : item.message || "Error"))
    .join(" | ")}`;
};

const mapMaterial = (item: Material): CatalogItem => {
  const raw = item as unknown as Record<string, unknown>;
  return {
    _id: safeId(raw),
    nombre: (typeof raw.nombre === "string" ? raw.nombre : "") || "Sin nombre",
    unidadMedida: (raw.unidadMedida as UnidadMedida) ?? "m",
    categoria: (typeof raw.categoria === "string" ? raw.categoria : undefined) ?? "Madera",
    idCotizador: typeof raw.idCotizador === "string" ? raw.idCotizador : undefined,
    precioUnitario: safeNumber(raw.precioUnitario, raw.precio, raw.precioMetroLineal),
    kind: "material",
  };
};

const mapHerraje = (item: Herraje): CatalogItem => {
  const raw = item as unknown as Record<string, unknown>;
  return {
    _id: safeId(raw),
    nombre: (typeof raw.nombre === "string" ? raw.nombre : "") || "Sin nombre",
    unidadMedida: (raw.unidadMedida as UnidadMedida) ?? "unidad",
    categoria: (typeof raw.categoria === "string" ? raw.categoria : undefined) ?? "Herrajes",
    idCotizador: typeof raw.idCotizador === "string" ? raw.idCotizador : undefined,
    precioUnitario: safeNumber(raw.precioUnitario, raw.precio, raw.precioMetroLineal),
    kind: "herraje",
  };
};

const buildItemKey = (item: Pick<CatalogItem, "kind" | "_id">) => `${item.kind}:${item._id}`;

const inferKindFromCategory = (categoria: string): "material" | "herraje" =>
  categoria.trim().toLowerCase() === "herrajes" ? "herraje" : "material";

/** Todas las categorías disponibles en el cotizador y catálogo */
const ALL_CATALOG_CATEGORIES = [
  "CUBIERTA",
  "ESTRUCTURA",
  "VISTAS",
  "ESPESOR",
  "CAJONES Y PUERTAS",
  "ACCESORIOS DE MÓDULO",
  "EXTRAÍBLES Y PUERTAS ABATIBLES",
  "INSUMOS DE PRODUCCIÓN",
  "EXTRAS",
  "Herrajes",
];

const currencyFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  minimumFractionDigits: 2,
});

const parsePriceValue = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const normalized = value.replace(/,/g, "").trim();
    const parsed = Number.parseFloat(normalized);
    if (Number.isFinite(parsed)) return parsed;
  }
  return Number.NaN;
};

export default function PreciosPage() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todas");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const [selectedItemKeys, setSelectedItemKeys] = useState<string[]>([]);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newIdCotizador, setNewIdCotizador] = useState("");
  const [newNombre, setNewNombre] = useState("");
  const [newUnidad, setNewUnidad] = useState<UnidadMedida>("m");
  const [newCategoria, setNewCategoria] = useState("");
  const [newPrecioUnitario, setNewPrecioUnitario] = useState("");
  const [addError, setAddError] = useState("");

  const modalRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const initialItemsRef = useRef<Map<string, CatalogItem>>(new Map());
  useFocusTrap(isAddModalOpen, modalRef);

  useEffect(() => {
    if (!isAddModalOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsAddModalOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isAddModalOpen]);

  const loadCatalogs = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [materialesResponse, herrajesResponse] = await Promise.all([obtenerMateriales(), obtenerHerrajes()]);
      const nextItems: CatalogItem[] = [];
      if (materialesResponse.success && materialesResponse.data) {
        const materialesList = extractList<Material>(materialesResponse.data, ["materiales", "items", "data", "results"]);
        nextItems.push(...materialesList.map(mapMaterial));
      }
      if (herrajesResponse.success && herrajesResponse.data) {
        const herrajesList = extractList<Herraje>(herrajesResponse.data, ["herrajes", "items", "data", "results"]);
        nextItems.push(...herrajesList.map(mapHerraje));
      }
      if (!materialesResponse.success && !herrajesResponse.success) {
        setError(materialesResponse.message || herrajesResponse.message || "No se pudo cargar el catálogo");
      }

      const dedupedItemsMap = new Map<string, CatalogItem>();
      for (const item of nextItems) {
        const itemKey = buildItemKey(item);
        if (!dedupedItemsMap.has(itemKey)) dedupedItemsMap.set(itemKey, item);
      }

      const loadedItems = Array.from(dedupedItemsMap.values());
      setItems(loadedItems);
      initialItemsRef.current = new Map(loadedItems.map((item) => [buildItemKey(item), item]));
      setHasPendingChanges(false);
      setSelectedItemKeys([]);
      setOpenMenuId(null);
      setEditingItemId(null);
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "No se pudo cargar el catálogo");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSelected = (item: CatalogItem) => {
    const key = buildItemKey(item);
    setSelectedItemKeys((current) =>
      current.includes(key) ? current.filter((currentKey) => currentKey !== key) : [...current, key],
    );
  };

  const handleDeleteSelected = async () => {
    if (selectedItemKeys.length === 0) return;
    if (!window.confirm(`Se eliminaran ${selectedItemKeys.length} materiales. Deseas continuar?`)) return;

    const selectedSet = new Set(selectedItemKeys);
    const selectedRows = items.filter((item) => selectedSet.has(buildItemKey(item)));

    setSavingId("bulk-delete");
    try {
      let needsReload = false;
      for (const item of selectedRows) {
        if (item._id.startsWith("tmp-csv-")) {
          setItems((current) => current.filter((row) => buildItemKey(row) !== buildItemKey(item)));
          setHasPendingChanges(true);
          continue;
        }

        const response = item.kind === "material" ? await eliminarMaterial(item._id) : await eliminarHerraje(item._id);
        if (!response.success) {
          throw new Error(formatApiErrorMessage(response as any, `No se pudo eliminar ${item.nombre}`));
        }
        needsReload = true;
      }

      if (needsReload) {
        await loadCatalogs();
      }
      setSelectedItemKeys([]);
      setOpenMenuId(null);
      setEditingItemId(null);
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "No se pudieron eliminar los materiales seleccionados");
    } finally {
      setSavingId(null);
    }
  };
  useEffect(() => {
    void loadCatalogs();
  }, []);

  const categories = useMemo(() => {
    const unique = new Set<string>(["Todas"]);
    for (const item of items) unique.add(item.categoria);
    return Array.from(unique);
  }, [items]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      const matchesCategory = selectedCategory === "Todas" || item.categoria === selectedCategory;
      const matchesQuery =
        !normalizedQuery ||
        item.nombre.toLowerCase().includes(normalizedQuery) ||
        (item.idCotizador || "").toLowerCase().includes(normalizedQuery);
      return matchesCategory && matchesQuery;
    });
  }, [items, searchQuery, selectedCategory]);

  const validatePrice = (precioUnitario?: number) => {
    if (typeof precioUnitario !== "number") {
      return "Debes capturar precio unitario.";
    }
    if (typeof precioUnitario === "number" && precioUnitario < 0) {
      return "Los precios deben ser mayores o iguales a 0.";
    }
    return null;
  };

  const parseCsvLine = (line: string) => {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];
      if (char === '"') {
        if (inQuotes && line[index + 1] === '"') {
          current += '"';
          index += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        values.push(current);
        current = "";
      } else {
        current += char;
      }
    }

    values.push(current);
    return values.map((value) => value.trim().replace(/^"|"$/g, ""));
  };

  const escapeCsvValue = (value: string) =>
    /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;

  const applyImportedRows = (parsedRows: ImportedCatalogRow[]) => {
    if (parsedRows.length === 0) {
      setError("El archivo no contiene filas validas.");
      return;
    }

    const existingById = new Map(
      items
        .filter((item) => Boolean(item.idCotizador))
        .map((item) => [item.idCotizador!.toLowerCase(), item]),
    );

    const mergedItems = parsedRows.map((row) => {
      const existing = existingById.get(row.id.toLowerCase());
      if (existing) {
        return {
          ...existing,
          nombre: row.label,
          categoria: row.category,
          unidadMedida: row.unit,
          precioUnitario: row.unitPrice,
          idCotizador: row.id,
        } satisfies CatalogItem;
      }

      const kind = inferKindFromCategory(row.category);
      return {
        _id: `tmp-csv-${Math.random().toString(36).slice(2, 10)}`,
        nombre: row.label,
        categoria: row.category,
        unidadMedida: row.unit,
        precioUnitario: row.unitPrice,
        idCotizador: row.id,
        kind,
      } satisfies CatalogItem;
    });

    setItems(mergedItems);
    setHasPendingChanges(true);
    setError(null);
    setSelectedItemKeys([]);
    setOpenMenuId(null);
    setEditingItemId(null);
  };

  const handleExportCsv = () => {
    const header = ["id", "label", "category", "unit", "unitPrice"];
    const rows = items.map((item) => [
      item.idCotizador || item._id,
      item.nombre,
      item.categoria,
      item.unidadMedida,
      (item.precioUnitario ?? 0).toString(),
    ]);

    const csv = [header, ...rows]
      .map((row) => row.map((value) => escapeCsvValue(value)).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "kuche_catalogo_precios.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleImportCsv = async (file: File) => {
    const text = await file.text();
    if (!text) return;

    const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
    if (lines.length <= 1) {
      setError("El CSV no contiene filas validas.");
      return;
    }

    const [, ...dataLines] = lines;

    const parsedRows = dataLines
      .map((line) => {
        const [id, label, category, unit, unitPrice] = parseCsvLine(line);
        const parsedPrice = parsePriceValue(unitPrice);
        if (!id || !label || !category || !unit || Number.isNaN(parsedPrice)) return null;
        return {
          id: id.trim(),
          label: label.trim(),
          category: category.trim(),
          unit: unit.trim() as UnidadMedida,
          unitPrice: parsedPrice,
        } satisfies ImportedCatalogRow;
      })
      .filter((row): row is ImportedCatalogRow => row !== null);

    applyImportedRows(parsedRows);
  };

  const handleImportExcel = async (file: File) => {
    const XLSX = await import("xlsx");
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      setError("El archivo Excel no contiene hojas.");
      return;
    }

    const worksheet = workbook.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
      defval: "",
      raw: false,
    });

    const parsedRows = rows
      .map((row) => {
        const id = String(row.id ?? row.ID ?? row.Id ?? "").trim();
        const label = String(row.label ?? row.LABEL ?? row.Label ?? "").trim();
        const category = String(row.category ?? row.CATEGORY ?? row.Category ?? "").trim();
        const unit = String(row.unit ?? row.UNIT ?? row.Unit ?? "").trim();
        const parsedPrice = parsePriceValue(row.unitPrice ?? row.UNITPRICE ?? row.UnitPrice);

        if (!id || !label || !category || !unit || Number.isNaN(parsedPrice)) return null;

        return {
          id,
          label,
          category,
          unit: unit as UnidadMedida,
          unitPrice: parsedPrice,
        } satisfies ImportedCatalogRow;
      })
      .filter((row): row is ImportedCatalogRow => row !== null);

    applyImportedRows(parsedRows);
  };

  const handleImportFile = async (file: File) => {
    const name = file.name.toLowerCase();
    const isExcel = name.endsWith(".xlsx") || name.endsWith(".xls");
    if (isExcel) {
      await handleImportExcel(file);
      return;
    }
    await handleImportCsv(file);
  };

  const didItemChange = (item: CatalogItem, initial: CatalogItem) =>
    item.nombre !== initial.nombre ||
    (item.idCotizador || "") !== (initial.idCotizador || "") ||
    item.categoria !== initial.categoria ||
    item.unidadMedida !== initial.unidadMedida ||
    (item.precioUnitario ?? 0) !== (initial.precioUnitario ?? 0);

  const handleSaveChanges = async () => {
    setError(null);
    const initialMap = initialItemsRef.current;

    const changedItems = items.filter((item) => {
      const initial = initialMap.get(buildItemKey(item));
      if (!initial) return true;
      return didItemChange(item, initial);
    });

    if (changedItems.length === 0) {
      setHasPendingChanges(false);
      return;
    }

    setSavingId("bulk");
    try {
      for (const item of changedItems) {
        const priceError = validatePrice(item.precioUnitario);
        if (priceError) {
          throw new Error(`Error en ${item.nombre}: ${priceError}`);
        }

        const payload = {
          nombre: item.nombre.trim(),
          idCotizador: item.idCotizador?.trim() || undefined,
          precioUnitario: item.precioUnitario,
          unidadMedida: item.unidadMedida,
          categoria: item.categoria as any,
          disponible: true,
        };

        if (item._id.startsWith("tmp-csv-")) {
          const createResponse =
            item.kind === "material" ? await crearMaterial(payload) : await crearHerraje(payload);
          if (!createResponse.success) {
            throw new Error(formatApiErrorMessage(createResponse as any, `No se pudo crear ${item.nombre}`));
          }
          continue;
        }

        const updateResponse =
          item.kind === "material"
            ? await actualizarMaterial(item._id, payload)
            : await actualizarHerraje(item._id, payload);
        if (!updateResponse.success) {
          throw new Error(formatApiErrorMessage(updateResponse as any, `No se pudo actualizar ${item.nombre}`));
        }
      }

      await loadCatalogs();
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "No se pudieron guardar los cambios");
    } finally {
      setSavingId(null);
    }
  };

  const handleDeleteItem = async (item: CatalogItem) => {
    if (!window.confirm(`Se eliminara \"${item.nombre}\". Deseas continuar?`)) return;
    setSavingId(buildItemKey(item));
    try {
      if (item._id.startsWith("tmp-csv-")) {
        setItems((current) => current.filter((row) => buildItemKey(row) !== buildItemKey(item)));
        setHasPendingChanges(true);
        return;
      }
      const response = item.kind === "material" ? await eliminarMaterial(item._id) : await eliminarHerraje(item._id);
      if (!response.success) {
        throw new Error(formatApiErrorMessage(response as any, "No se pudo eliminar el elemento"));
      }
      await loadCatalogs();
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "No se pudo eliminar el elemento");
    } finally {
      setSavingId(null);
    }
  };

  const resetCreateForm = () => {
    setNewIdCotizador("");
    setNewNombre("");
    setNewUnidad("m");
    setNewCategoria("");
    setNewPrecioUnitario("");
    setAddError("");
  };

  const handleCreateItem = async () => {
    const idCotizador = newIdCotizador.trim();
    const nombre = newNombre.trim();
    const categoria = newCategoria.trim();
    const unidadMedida = newUnidad;
    const precioUnitario = toNumberOrUndefined(newPrecioUnitario);

    if (!idCotizador || !nombre || !categoria || !unidadMedida) {
      setAddError("Completa todos los campos del formulario.");
      return;
    }

    const priceError = validatePrice(precioUnitario);
    if (priceError) {
      setAddError(priceError);
      return;
    }

    setSavingId("create");
    try {
      const kind = inferKindFromCategory(categoria);
      const payload = {
        nombre,
        idCotizador,
        precioUnitario,
        unidadMedida,
        categoria: categoria as any,
        disponible: true,
      };

      const response =
        kind === "material" ? await crearMaterial(payload) : await crearHerraje(payload);

      if (!response.success) {
        throw new Error(formatApiErrorMessage(response as any, "No se pudo crear el elemento"));
      }

      setIsAddModalOpen(false);
      resetCreateForm();
      await loadCatalogs();
    } catch (currentError) {
      setAddError(currentError instanceof Error ? currentError.message : "No se pudo crear el elemento");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Catálogo y Precios</h1>
          <p className="mt-2 text-sm text-gray-500">
            Actualiza los costos base. Los cambios afectarán las nuevas cotizaciones.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              void handleImportFile(file);
              event.currentTarget.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => void loadCatalogs()}
            className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-100"
          >
            <RefreshCw className="h-4 w-4" />
            Recargar
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-100"
          >
            <Upload className="h-4 w-4" />
            Importar Excel/CSV
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-100"
          >
            <Download className="h-4 w-4" />
            Exportar CSV
          </button>
          <button
            type="button"
            onClick={() => {
              resetCreateForm();
              setIsAddModalOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-100"
          >
            <Plus className="h-4 w-4" />
            Nuevo material
          </button>
          <button
            type="button"
            onClick={() => void handleSaveChanges()}
            disabled={savingId === "bulk" || !hasPendingChanges}
            className={`inline-flex items-center gap-2 rounded-2xl bg-[#8B1C1C] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${hasPendingChanges ? "animate-pulse" : ""}`}
          >
            <Save className="h-4 w-4" />
            {savingId === "bulk" ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </div>

      <div className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex w-full max-w-md items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2">
            <Search className="h-4 w-4 text-gray-400" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Buscar material..."
              className="w-full bg-transparent text-sm text-gray-700 outline-none"
            />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 overflow-x-auto pb-1">
          {categories.map((category) => {
            const isActive = selectedCategory === category;
            return (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
                  isActive
                    ? "bg-[#8B1C1C] text-white shadow-sm"
                    : "border border-gray-200 bg-white text-gray-600 hover:border-[#8B1C1C]/20 hover:bg-[#8B1C1C]/5 hover:text-[#8B1C1C]"
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600">

      {selectedItemKeys.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-primary/10 bg-primary/[0.04] px-4 py-3 shadow-sm">
          <p className="text-sm font-semibold text-primary">{selectedItemKeys.length} materiales seleccionados</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleDeleteSelected()}
              disabled={savingId === "bulk-delete"}
              className="inline-flex items-center gap-2 rounded-2xl bg-accent px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
            >
              <Trash2 className="h-4 w-4" />
              Eliminar seleccionados
            </button>
            <button
              type="button"
              onClick={() => setSelectedItemKeys([])}
              className="rounded-2xl border border-primary/10 bg-white px-4 py-2 text-xs font-semibold text-secondary"
            >
              Limpiar selección
            </button>
          </div>
        </div>
      ) : null}

      {editingItemId ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-accent/20 bg-accent/5 px-4 py-3 shadow-sm">
          <p className="text-sm font-semibold text-primary">Estás editando una fila. Guarda los cambios arriba cuando termines.</p>
          <button
            type="button"
            onClick={() => setEditingItemId(null)}
            className="rounded-2xl border border-primary/10 bg-white px-4 py-2 text-xs font-semibold text-secondary"
          >
            Cerrar edición
          </button>
        </div>
      ) : null}
          {error}
        </div>
      ) : null}

      {hasPendingChanges ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
          Tienes cambios sin guardar.
        </div>
      ) : null}

      <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white p-1 shadow-sm">
        <div className="grid grid-cols-[0.45fr_2.35fr_1fr_0.7fr_1fr_0.62fr] gap-2 px-6 py-4 text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
          <span />
          <span>Material</span>
          <span>Categoría</span>
          <span>Unidad</span>
          <span className="text-right">Precio unitario</span>
          <span className="text-center">Acciones</span>
        </div>
        <div className="divide-y divide-gray-100">
          {isLoading ? (
            <div className="px-6 py-10 text-center text-sm text-gray-500">Cargando catálogo...</div>
          ) : filteredItems.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-gray-500">No hay materiales que coincidan con los filtros.</div>
          ) : (
            filteredItems.map((item) => (
              <div
                key={buildItemKey(item)}
                className={`grid grid-cols-[0.45fr_2.35fr_1fr_0.7fr_1fr_0.62fr] items-center gap-2 px-6 py-4 ${editingItemId === buildItemKey(item) ? "bg-primary/[0.03]" : ""}`}
              >
                <button
                  type="button"
                  onClick={() => toggleSelected(item)}
                  className={`mx-auto inline-flex h-6 w-6 items-center justify-center rounded-full border transition ${
                    selectedItemKeys.includes(buildItemKey(item))
                      ? "border-accent bg-accent text-white"
                      : "border-primary/20 bg-white text-transparent hover:border-primary/40"
                  }`}
                  aria-label={selectedItemKeys.includes(buildItemKey(item)) ? "Quitar selección" : "Seleccionar material"}
                >
                  <Check className="h-3.5 w-3.5" />
                </button>

                <div>
                  {editingItemId === buildItemKey(item) ? (
                    <input
                      value={item.nombre}
                      onChange={(event) => {
                        setItems((current) =>
                          current.map((row) =>
                            buildItemKey(row) === buildItemKey(item) ? { ...row, nombre: event.target.value } : row,
                          ),
                        );
                        setHasPendingChanges(true);
                      }}
                      className="w-full rounded-xl border border-primary/10 bg-white px-3 py-2 text-sm font-semibold text-primary outline-none"
                    />
                  ) : (
                    <div className="text-sm font-semibold text-primary">{item.nombre}</div>
                  )}
                  <p className="text-xs text-gray-400">{item.idCotizador || item._id}</p>
                </div>

                <div>
                  {editingItemId === buildItemKey(item) ? (
                    <select
                      value={item.categoria}
                      onChange={(event) => {
                        setItems((current) =>
                          current.map((row) =>
                            buildItemKey(row) === buildItemKey(item) ? { ...row, categoria: event.target.value } : row,
                          ),
                        );
                        setHasPendingChanges(true);
                      }}
                      className="w-full rounded-xl border border-primary/10 bg-white px-3 py-2 text-sm text-primary outline-none"
                    >
                      {ALL_CATALOG_CATEGORIES.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="w-fit rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">{item.categoria}</span>
                  )}
                </div>

                <div>
                  {editingItemId === buildItemKey(item) ? (
                    <select
                      value={item.unidadMedida}
                      onChange={(event) => {
                        setItems((current) =>
                          current.map((row) =>
                            buildItemKey(row) === buildItemKey(item)
                              ? { ...row, unidadMedida: event.target.value as UnidadMedida }
                              : row,
                          ),
                        );
                        setHasPendingChanges(true);
                      }}
                      className="w-full rounded-xl border border-primary/10 bg-white px-3 py-2 text-sm text-primary outline-none"
                    >
                      {UNIDADES_MEDIDA.map((unidad) => (
                        <option key={unidad} value={unidad}>
                          {unidad}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-sm text-secondary">{item.unidadMedida}</span>
                  )}
                </div>

                <div className="text-right">
                  {editingItemId === buildItemKey(item) ? (
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.precioUnitario ?? ""}
                      onChange={(event) => {
                        setItems((current) =>
                          current.map((row) =>
                            buildItemKey(row) === buildItemKey(item)
                              ? { ...row, precioUnitario: toNumberOrUndefined(event.target.value) }
                              : row,
                          ),
                        );
                        setHasPendingChanges(true);
                      }}
                      className="w-28 rounded-xl border border-primary/10 bg-white px-3 py-2 text-right text-sm font-semibold text-primary outline-none"
                    />
                  ) : null}
                  <p className={`text-xs ${editingItemId === buildItemKey(item) ? "mt-1 text-secondary" : "font-semibold text-primary"}`}>
                    {currencyFormatter.format(item.precioUnitario ?? 0)}
                  </p>
                </div>

                <div className="relative flex justify-center">
                  {editingItemId === buildItemKey(item) ? (
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => void handleSaveChanges()}
                        disabled={savingId === "bulk" || !hasPendingChanges}
                        className="inline-flex items-center justify-center rounded-xl bg-[#8B1C1C] px-3 py-2 text-xs font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Save className="mr-1.5 h-4 w-4" />
                        Guardar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingItemId(null);
                          setOpenMenuId(null);
                        }}
                        className="inline-flex items-center justify-center rounded-xl border border-primary/10 bg-white px-3 py-2 text-xs font-semibold text-secondary transition hover:bg-primary/5"
                      >
                        Cerrar
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setOpenMenuId((current) => (current === buildItemKey(item) ? null : buildItemKey(item)))}
                      className="inline-flex items-center justify-center rounded-xl border border-primary/10 bg-white p-2 text-primary transition hover:bg-primary/5"
                      title="Más acciones"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  )}

                  {editingItemId !== buildItemKey(item) && openMenuId === buildItemKey(item) ? (
                    <div className="absolute right-0 top-11 z-10 w-48 rounded-2xl border border-primary/10 bg-white p-2 shadow-lg">
                      <button
                        type="button"
                        onClick={() => {
                          toggleSelected(item);
                          setOpenMenuId(null);
                        }}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-secondary hover:bg-primary/5 hover:text-primary"
                      >
                        <Check className="h-4 w-4" />
                        {selectedItemKeys.includes(buildItemKey(item)) ? "Quitar selección" : "Seleccionar"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingItemId((current) => (current === buildItemKey(item) ? null : buildItemKey(item)));
                          setOpenMenuId(null);
                        }}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-secondary hover:bg-primary/5 hover:text-primary"
                      >
                        <PencilLine className="h-4 w-4" />
                        Modificar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          void handleDeleteItem(item);
                          setOpenMenuId(null);
                        }}
                        disabled={savingId === buildItemKey(item)}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                        Eliminar
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {isAddModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <div
            ref={modalRef}
            tabIndex={-1}
            className="w-full max-w-lg rounded-3xl border border-white/70 bg-white/95 p-6 shadow-2xl backdrop-blur"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Agregar nuevo material</h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-500"
              >
                Cerrar
              </button>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-semibold text-gray-500">
                ID único
                <input
                  value={newIdCotizador}
                  onChange={(event) => setNewIdCotizador(event.target.value)}
                  placeholder="ej. herr_bisagra_premium"
                  className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none"
                />
              </label>
              <label className="text-xs font-semibold text-gray-500">
                Categoría
                <select
                  value={newCategoria}
                  onChange={(event) => setNewCategoria(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none"
                >
                  <option value="">Selecciona categoría</option>
                  {ALL_CATALOG_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-xs font-semibold text-gray-500 sm:col-span-2">
                Nombre del material
                <input
                  value={newNombre}
                  onChange={(event) => setNewNombre(event.target.value)}
                  placeholder="ej. Bisagra premium"
                  className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none"
                />
              </label>

              <label className="text-xs font-semibold text-gray-500">
                Unidad
                <select
                  value={newUnidad}
                  onChange={(event) => setNewUnidad(event.target.value as UnidadMedida)}
                  className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none"
                >
                  {UNIDADES_MEDIDA.map((unidad) => (
                    <option key={unidad} value={unidad}>
                      {unidad}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-xs font-semibold text-gray-500">
                Precio unitario
                <input
                  value={newPrecioUnitario}
                  onChange={(event) => setNewPrecioUnitario(event.target.value)}
                  type="number"
                  min="0"
                  step="0.01"
                  className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none"
                />
              </label>
            </div>
            {addError ? (
              <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-600">
                {addError}
              </p>
            ) : null}
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-2xl border border-gray-200 bg-white px-5 py-2 text-xs font-semibold text-gray-600"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleCreateItem()}
                disabled={savingId === "create"}
                className="rounded-2xl bg-[#8B1C1C] px-5 py-2 text-xs font-semibold text-white disabled:opacity-60"
              >
                Guardar material
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
