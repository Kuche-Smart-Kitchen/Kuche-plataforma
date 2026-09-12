/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Trash2,
  Upload,
} from "lucide-react";

import { useFocusTrap } from "@/hooks/useFocusTrap";
import { emptyWhenZeroNumericString } from "@/lib/numeric-input-empty-zero";
import { syncKanbanTasksFromBackend } from "@/lib/admin-workflow";
import { useMaterialesContext } from "@/contexts/MaterialesContext";
import {
  GamaMaterial,
  normalizarSeccion,
  normalizarUnidadMedida,
  SECCIONES_MATERIALES,
  SeccionMaterial,
  UNIDADES_MEDIDA,
  UnidadMedidaMaterial,
} from "@/lib/axios/materialesApi";

type TableItem = {
  _id?: string;
  id: string;
  idCotizador?: string;
  label: string;
  category: string;
  seccion: SeccionMaterial;
  unit: string;
  unidadMedida: UnidadMedidaMaterial;
  unitPrice: number;
  precioPorMetro?: number | null;
  proveedor?: string;
  gama?: string;
  descripcion?: string;
  disponible?: boolean;
};

const catalogoInicialBase = [
  {
    category: "CUBIERTA",
    seccion: "cubierta" as SeccionMaterial,
    items: [
      { id: "cub_melamina", label: "Cubierta melamina", unitPrice: 170, unit: "pies", unidadMedida: "pies" as UnidadMedidaMaterial },
      { id: "cub_granito", label: "Granito", unitPrice: 12000, unit: "placa", unidadMedida: "placas" as UnidadMedidaMaterial },
      { id: "mo_granito", label: "Mano obra granito", unitPrice: 1400, unit: "mts2", unidadMedida: "m2" as UnidadMedidaMaterial },
    ],
  },
  {
    category: "ESTRUCTURA",
    seccion: "estructura" as SeccionMaterial,
    items: [
      { id: "est_mel_blanca", label: "Melamina Blanca", unitPrice: 700, unit: "pz", unidadMedida: "unidad" as UnidadMedidaMaterial },
      { id: "est_mel_color", label: "Melamina Negro o gris", unitPrice: 1000, unit: "pz", unidadMedida: "unidad" as UnidadMedidaMaterial },
      { id: "est_cubrecantos", label: "Cubrecantos", unitPrice: 9, unit: "pz", unidadMedida: "unidad" as UnidadMedidaMaterial },
      { id: "est_cortes", label: "Cortes y enchapes", unitPrice: 1500, unit: "servicio", unidadMedida: "unidad" as UnidadMedidaMaterial },
    ],
  },
  {
    category: "VISTAS",
    seccion: "vistas" as SeccionMaterial,
    items: [
      { id: "vis_melamina", label: "Melamina Vistas", unitPrice: 1100, unit: "pz", unidadMedida: "unidad" as UnidadMedidaMaterial },
      { id: "vis_brillo", label: "Alto brillo/mate", unitPrice: 3300, unit: "pz", unidadMedida: "unidad" as UnidadMedidaMaterial },
      { id: "vis_cortes", label: "Cortes y enchape", unitPrice: 1500, unit: "servicio", unidadMedida: "unidad" as UnidadMedidaMaterial },
      { id: "vis_cubrecantos", label: "Cubrecantos", unitPrice: 20, unit: "pz", unidadMedida: "unidad" as UnidadMedidaMaterial },
    ],
  },
  {
    category: "HERRAJES",
    seccion: "herrajes" as SeccionMaterial,
    items: [
      { id: "herr_cajon_sen", label: "Cajón sencillo", unitPrice: 120, unit: "pz", unidadMedida: "unidad" as UnidadMedidaMaterial },
      { id: "herr_cajon_len", label: "Cajón Cierre lento", unitPrice: 450, unit: "pz", unidadMedida: "unidad" as UnidadMedidaMaterial },
      { id: "herr_cajon_blum", label: "Cajón BLUM tandem", unitPrice: 700, unit: "pz", unidadMedida: "unidad" as UnidadMedidaMaterial },
      { id: "herr_puerta_len", label: "Puerta Cierre lento/Push", unitPrice: 50, unit: "pz", unidadMedida: "unidad" as UnidadMedidaMaterial },
      { id: "herr_bisagra", label: "Puertas Bisagras sencilla", unitPrice: 30, unit: "pz", unidadMedida: "unidad" as UnidadMedidaMaterial },
      { id: "herr_piston_sen", label: "Pistón sencillo", unitPrice: 40, unit: "pz", unidadMedida: "unidad" as UnidadMedidaMaterial },
      { id: "herr_piston_blum", label: "Pistón blum", unitPrice: 350, unit: "pz", unidadMedida: "unidad" as UnidadMedidaMaterial },
      { id: "herr_zoclo", label: "Zoclo", unitPrice: 180, unit: "pz", unidadMedida: "unidad" as UnidadMedidaMaterial },
      { id: "herr_patas", label: "Patas y clips", unitPrice: 17, unit: "pz", unidadMedida: "unidad" as UnidadMedidaMaterial },
      { id: "herr_push", label: "Push", unitPrice: 150, unit: "pz", unidadMedida: "unidad" as UnidadMedidaMaterial },
      { id: "herr_spots", label: "Spots", unitPrice: 250, unit: "pz", unidadMedida: "unidad" as UnidadMedidaMaterial },
      { id: "herr_puerta_esq", label: "Puertas Esquinera", unitPrice: 200, unit: "pz", unidadMedida: "unidad" as UnidadMedidaMaterial },
    ],
  },
  {
    category: "EXTRAÍBLES Y PUERTAS",
    seccion: "extraibles_puertas_abatibles" as SeccionMaterial,
    items: [
      { id: "ext_alacena", label: "Alacena doble", unitPrice: 3000, unit: "pz", unidadMedida: "unidad" as UnidadMedidaMaterial },
      { id: "ext_avento_hf", label: "Avento HF", unitPrice: 3500, unit: "pz", unidadMedida: "unidad" as UnidadMedidaMaterial },
      { id: "ext_especiero", label: "Especiero", unitPrice: 1800, unit: "pz", unidadMedida: "unidad" as UnidadMedidaMaterial },
      { id: "ext_servo", label: "Servo drive", unitPrice: 18000, unit: "pz", unidadMedida: "unidad" as UnidadMedidaMaterial },
      { id: "ele_parrilla", label: "Parrilla", unitPrice: 3500, unit: "pz", unidadMedida: "unidad" as UnidadMedidaMaterial },
      { id: "ele_campana", label: "Campana", unitPrice: 4500, unit: "pz", unidadMedida: "unidad" as UnidadMedidaMaterial },
    ],
  },
  {
    category: "GASTOS FIJOS Y VARIOS",
    seccion: "gastos_fijos" as SeccionMaterial,
    items: [
      { id: "var_insumos", label: "Varios (thiner, estopa, silicon, tornillos)", unitPrice: 2000, unit: "paquete", unidadMedida: "paquete" as UnidadMedidaMaterial },
      { id: "fijo_mo_semana", label: "Mano obra 1 equipo", unitPrice: 6000, unit: "semana", unidadMedida: "unidad" as UnidadMedidaMaterial },
      { id: "fijo_admin_semana", label: "Gastos admin", unitPrice: 7000, unit: "semana", unidadMedida: "unidad" as UnidadMedidaMaterial },
    ],
  },
];

const fallbackFlatData: TableItem[] = catalogoInicialBase.flatMap((category) =>
  category.items.map((item) => ({
    id: item.id,
    idCotizador: item.id,
    label: item.label,
    category: category.category,
    seccion: category.seccion,
    unit: item.unit,
    unidadMedida: item.unidadMedida,
    unitPrice: item.unitPrice,
    disponible: true,
  })),
);

const currencyFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  minimumFractionDigits: 2,
});

const getSeccionLabel = (seccion?: string) => {
  const norm = normalizarSeccion(seccion);
  const found = SECCIONES_MATERIALES.find((s) => s.valor === norm);
  return found ? found.label : (seccion || "Otros");
};

export default function PreciosPage() {
  const {
    materiales,
    loading,
    isSaving,
    error: contextError,
    cargarMateriales,
    agregarMaterial,
    guardarCambiosPrecios,
    eliminarMaterial,
  } = useMaterialesContext();

  const [items, setItems] = useState<TableItem[]>(fallbackFlatData);
  const [modifiedPrices, setModifiedPrices] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todas");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);

  // Formulario nuevo material
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newItemId, setNewItemId] = useState("");
  const [newItemLabel, setNewItemLabel] = useState("");
  const [newItemSeccion, setNewItemSeccion] = useState<SeccionMaterial>("cubierta");
  const [newItemUnit, setNewItemUnit] = useState<UnidadMedidaMaterial>("unidad");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [newItemProveedor, setNewItemProveedor] = useState("");
  const [newItemGama, setNewItemGama] = useState<GamaMaterial>("Tendencia");
  const [newItemDescripcion, setNewItemDescripcion] = useState("");
  const [addError, setAddError] = useState("");
  const [isSubmittingModal, setIsSubmittingModal] = useState(false);

  useEffect(() => {
    void syncKanbanTasksFromBackend();
  }, []);

  // Sincronizar items locales cuando cambian los materiales del contexto
  useEffect(() => {
    if (materiales.length > 0) {
      const mapped: TableItem[] = materiales.map((m) => {
        const seccionNorm = normalizarSeccion(m.seccion);
        const unidadNorm = normalizarUnidadMedida(m.unidadMedida);
        const price = modifiedPrices[m._id] ?? modifiedPrices[m.idCotizador ?? ""] ?? m.precioUnitario ?? m.precioPorMetro ?? 0;

        return {
          _id: m._id,
          id: m.idCotizador || m._id || m.id || m.nombre,
          idCotizador: m.idCotizador,
          label: m.nombre,
          category: getSeccionLabel(m.seccion),
          seccion: seccionNorm,
          unit: m.unidadMedida || "unidad",
          unidadMedida: unidadNorm,
          unitPrice: price,
          precioPorMetro: m.precioPorMetro,
          proveedor: m.proveedor,
          gama: m.gama || m.tier,
          descripcion: m.descripcion,
          disponible: m.disponible,
        };
      });
      setItems(mapped);
    }
  }, [materiales, modifiedPrices]);

  useEffect(() => {
    if (!isAddModalOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsAddModalOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isAddModalOpen]);

  useFocusTrap(isAddModalOpen, modalRef);

  const categories = useMemo(() => {
    const list = new Set<string>();
    list.add("Todas");
    SECCIONES_MATERIALES.forEach((s) => list.add(s.label));
    items.forEach((item) => {
      if (item.category) list.add(item.category);
    });
    return Array.from(list);
  }, [items]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      const matchesCategory =
        selectedCategory === "Todas" ||
        item.category.toLowerCase() === selectedCategory.toLowerCase() ||
        item.seccion.toLowerCase() === selectedCategory.toLowerCase();
      const matchesQuery =
        !normalizedQuery ||
        item.label.toLowerCase().includes(normalizedQuery) ||
        item.id.toLowerCase().includes(normalizedQuery) ||
        (item.proveedor && item.proveedor.toLowerCase().includes(normalizedQuery));
      return matchesCategory && matchesQuery;
    });
  }, [items, searchQuery, selectedCategory]);

  const hasChanges = Object.keys(modifiedPrices).length > 0;

  const handlePriceChange = (id: string, value: string) => {
    const parsed = value === "" ? 0 : Number.parseFloat(value);
    if (Number.isNaN(parsed) || parsed < 0) return;

    setModifiedPrices((prev) => ({ ...prev, [id]: parsed }));
    setItems((prev) =>
      prev.map((item) => (item.id === id || item._id === id ? { ...item, unitPrice: parsed } : item)),
    );
  };

  const handleSave = async () => {
    if (!hasChanges) return;

    setErrorMessage(null);
    setSuccessMessage(null);

    const cambios = Object.entries(modifiedPrices).map(([idKey, precio]) => {
      // Buscar el _id real si idKey es idCotizador
      const found = items.find((it) => it.id === idKey || it._id === idKey);
      const targetId = found?._id || idKey;
      const isPricePerMeter = found?.precioPorMetro !== null && found?.precioPorMetro !== undefined && (found?.unitPrice === undefined || found?.unitPrice === null);

      return {
        id: targetId,
        nuevoPrecio: isPricePerMeter ? undefined : precio,
        precioUnitario: isPricePerMeter ? undefined : precio,
        precioPorMetro: isPricePerMeter ? precio : undefined,
      };
    });

    const res = await guardarCambiosPrecios(cambios);
    if (res.success) {
      setModifiedPrices({});
      setSuccessMessage(`Se guardaron ${res.actualizados} cambios de precio exitosamente.`);
      setTimeout(() => setSuccessMessage(null), 5000);
    } else {
      setErrorMessage(res.error || "No se pudieron guardar algunos precios en el backend.");
    }
  };

  const handleDeleteMaterial = async (item: TableItem) => {
    if (!confirm(`¿Estás seguro de eliminar el material "${item.label}"?`)) return;

    setErrorMessage(null);
    setSuccessMessage(null);

    const targetId = item._id || item.id;
    const res = await eliminarMaterial(targetId);

    if (res.success) {
      setSuccessMessage(`Material "${item.label}" eliminado.`);
      setItems((prev) => prev.filter((it) => it.id !== item.id && it._id !== item._id));
      setTimeout(() => setSuccessMessage(null), 4000);
    } else {
      setErrorMessage(res.error || "No se pudo eliminar el material del servidor.");
    }
  };

  const handleAddMaterialSubmit = async () => {
    const trimmedLabel = newItemLabel.trim();
    const parsedPrice = Number.parseFloat(newItemPrice);

    if (!trimmedLabel) {
      setAddError("El nombre del material es obligatorio.");
      return;
    }
    if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
      setAddError("Debes especificar un precio válido (mayor o igual a 0).");
      return;
    }

    const payloadIdCotizador =
      newItemId.trim() ||
      trimmedLabel
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 32);

    setIsSubmittingModal(true);
    setAddError("");

    const res = await agregarMaterial({
      nombre: trimmedLabel,
      seccion: newItemSeccion,
      unidadMedida: newItemUnit,
      precioUnitario: parsedPrice,
      precioPorMetro: null,
      idCotizador: payloadIdCotizador,
      proveedor: newItemProveedor.trim() || undefined,
      gama: newItemGama,
      descripcion: newItemDescripcion.trim() || undefined,
      disponible: true,
    });

    setIsSubmittingModal(false);

    if (res.success) {
      setIsAddModalOpen(false);
      setNewItemId("");
      setNewItemLabel("");
      setNewItemUnit("unidad");
      setNewItemPrice("");
      setNewItemProveedor("");
      setNewItemDescripcion("");
      setAddError("");
      setSuccessMessage(`Material "${trimmedLabel}" agregado exitosamente.`);
      setTimeout(() => setSuccessMessage(null), 5000);
    } else {
      setAddError(res.error || "Error al guardar el material en el backend. Verifica que tu usuario tenga rol admin.");
    }
  };

  const handleExportCsv = () => {
    const header = ["id", "nombre", "seccion", "unidadMedida", "precioUnitario", "proveedor", "gama"];
    const rows = items.map((item) => [
      item.idCotizador || item._id || item.id,
      item.label,
      item.seccion,
      item.unidadMedida || item.unit,
      item.unitPrice.toString(),
      item.proveedor || "",
      item.gama || "",
    ]);
    const escapeValue = (value: string) =>
      /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
    const csv = [header, ...rows]
      .map((row) => row.map((value) => escapeValue(value)).join(","))
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

  const handleImportCsv = (file: File) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      if (!text) return;

      const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
      if (lines.length <= 1) return;

      const parseCsvLine = (line: string) => {
        const values: string[] = [];
        let current = "";
        let inQuotes = false;
        for (let i = 0; i < line.length; i += 1) {
          const char = line[i];
          if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
              current += '"';
              i += 1;
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
        return values.map((value) => value.trim());
      };

      const [, ...dataLines] = lines;
      let agregados = 0;

      for (const line of dataLines) {
        const cols = parseCsvLine(line).map((v) => v.replace(/^"|"$/g, ""));
        const [id, nombre, seccionRaw, unidadRaw, precioRaw, proveedor, gama] = cols;
        const parsedPrice = Number.parseFloat(precioRaw ?? "");

        if (nombre && !Number.isNaN(parsedPrice)) {
          const res = await agregarMaterial({
            nombre,
            idCotizador: id || undefined,
            seccion: normalizarSeccion(seccionRaw),
            unidadMedida: normalizarUnidadMedida(unidadRaw),
            precioUnitario: parsedPrice,
            proveedor: proveedor || undefined,
            gama: (gama as GamaMaterial) || "Tendencia",
            disponible: true,
          });
          if (res.success) agregados += 1;
        }
      }

      setSuccessMessage(`Se importaron ${agregados} materiales correctamente.`);
      setTimeout(() => setSuccessMessage(null), 5000);
      void cargarMateriales();
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* Banner info levantamiento */}
      <div className="rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-800">Actualización de costos base (piezas)</p>
            <p className="mt-0.5 text-[11px] leading-snug text-gray-500">
              Esta tabla gestiona los precios y catálogo de materiales (CRUD directo sincronizado con el backend). Para el PDF de levantamiento, usa el botón{' '}
              <span className="font-medium text-gray-600">Configuración levantamiento</span>.
            </p>
          </div>
          <Link
            href="/dashboard/configuracion-levantamiento"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-[11px] font-medium text-gray-700 shadow-sm transition hover:border-[#8B1C1C]/40 hover:bg-gray-50 hover:text-[#8B1C1C]"
          >
            <Settings className="h-3.5 w-3.5" />
            Configuración levantamiento
          </Link>
        </div>
      </div>

      {/* Notificaciones */}
      {successMessage ? (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      ) : null}

      {(errorMessage || contextError) ? (
        <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-800">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{errorMessage || contextError}</span>
        </div>
      ) : null}

      {/* Header y acciones */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Catálogo y Precios</h1>
            {loading ? (
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Cargando...
              </span>
            ) : (
              <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                {items.length} materiales
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Agrega o actualiza materiales y costos base sincronizados en tiempo real con el servidor.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              handleImportCsv(file);
              event.currentTarget.value = "";
            }}
          />

          <button
            type="button"
            onClick={() => {
              setNewItemId("");
              setNewItemLabel("");
              setNewItemSeccion("cubierta");
              setNewItemUnit("unidad");
              setNewItemPrice("");
              setNewItemProveedor("");
              setNewItemGama("Tendencia");
              setNewItemDescripcion("");
              setAddError("");
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-1.5 rounded-2xl bg-[#8B1C1C] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#721717]"
          >
            <Plus className="h-4 w-4" />
            Nuevo material
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-100"
          >
            <Upload className="h-4 w-4 text-gray-500" />
            Importar CSV
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-100"
          >
            <Download className="h-4 w-4 text-gray-500" />
            Exportar CSV
          </button>

          <button
            type="button"
            onClick={() => void cargarMateriales()}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-100 disabled:opacity-50"
            title="Recargar catálogo desde el backend"
          >
            <RefreshCw className={`h-4 w-4 text-gray-500 ${loading ? "animate-spin" : ""}`} />
            Recargar
          </button>

          <button
            type="button"
            disabled={!hasChanges || isSaving}
            onClick={handleSave}
            className={`flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 ${
              hasChanges ? "animate-pulse" : ""
            }`}
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Guardar cambios {hasChanges ? `(${Object.keys(modifiedPrices).length})` : ""}
          </button>
        </div>
      </div>

      {/* Buscador y filtro de categoría */}
      <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="relative flex w-full max-w-md items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2">
          <Search className="h-4 w-4 text-gray-400" />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Buscar por nombre, código o proveedor..."
            className="w-full bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(event) => setSelectedCategory(event.target.value)}
          className="rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 shadow-sm outline-none"
        >
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>

      {/* Tabla de materiales */}
      <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white p-1 shadow-sm">
        <div className="grid grid-cols-[2.2fr_1fr_0.8fr_1fr_0.4fr] gap-2 px-6 py-4 text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
          <span>Material</span>
          <span>Categoría / Sección</span>
          <span>Unidad</span>
          <span className="text-right">Precio unitario</span>
          <span className="text-center">Acción</span>
        </div>
        <div className="divide-y divide-gray-100">
          {filteredItems.map((item) => (
            <div
              key={item.id || item._id}
              className="grid grid-cols-[2.2fr_1fr_0.8fr_1fr_0.4fr] items-center gap-2 px-6 py-4 hover:bg-slate-50/50"
            >
              <div>
                <p className="text-sm font-semibold text-gray-900">{item.label}</p>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span>{item.id}</span>
                  {item.proveedor ? <span>• {item.proveedor}</span> : null}
                  {item.gama ? <span className="rounded bg-slate-100 px-1 py-0.5 text-[10px] text-slate-600">{item.gama}</span> : null}
                </div>
              </div>
              <span className="w-fit rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">
                {item.category}
              </span>
              <span className="text-sm text-gray-600">{item.unit}</span>
              <div className="flex items-center justify-end gap-1">
                <span className="text-xs text-gray-400">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0"
                  value={item.unitPrice === 0 ? "" : item.unitPrice}
                  onChange={(event) => handlePriceChange(item.id, event.target.value)}
                  className={`w-28 rounded-lg border bg-transparent px-2 py-1 text-right text-sm font-semibold text-gray-900 transition-colors focus:border-[#8B1C1C] focus:bg-white focus:outline-none ${
                    modifiedPrices[item.id] !== undefined || modifiedPrices[item._id ?? ""] !== undefined
                      ? "border-amber-400 bg-amber-50/50"
                      : "border-transparent hover:border-gray-300"
                  }`}
                />
              </div>
              <div className="flex justify-center">
                {item._id ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteMaterial(item)}
                    className="rounded-lg p-1.5 text-gray-400 transition hover:bg-rose-50 hover:text-rose-600"
                    title="Eliminar material"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                ) : (
                  <span className="text-[10px] text-gray-300">Base</span>
                )}
              </div>
            </div>
          ))}
          {filteredItems.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-gray-500">
              No hay materiales que coincidan con los filtros.
            </div>
          ) : null}
        </div>
      </div>

      {/* Modal Agregar Nuevo Material */}
      {isAddModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 backdrop-blur-sm">
          <div
            ref={modalRef}
            tabIndex={-1}
            className="w-full max-w-xl rounded-3xl border border-white/70 bg-white p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Agregar nuevo material</h3>
                <p className="text-xs text-gray-500">Se registrará en el modelo central de materiales del servidor.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-500 hover:bg-gray-50"
              >
                Cerrar
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="text-xs font-semibold text-gray-600 md:col-span-2">
                Nombre del material *
                <input
                  value={newItemLabel}
                  onChange={(event) => setNewItemLabel(event.target.value)}
                  placeholder="ej. Melamina Roble Halifax 16mm"
                  className="mt-1.5 w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-[#8B1C1C]"
                />
              </label>

              <label className="text-xs font-semibold text-gray-600">
                Sección / Categoría *
                <select
                  value={newItemSeccion}
                  onChange={(event) => setNewItemSeccion(event.target.value as SeccionMaterial)}
                  className="mt-1.5 w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-[#8B1C1C]"
                >
                  {SECCIONES_MATERIALES.map((seccion) => (
                    <option key={seccion.valor} value={seccion.valor}>
                      {seccion.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-xs font-semibold text-gray-600">
                Unidad de medida *
                <select
                  value={newItemUnit}
                  onChange={(event) => setNewItemUnit(event.target.value as UnidadMedidaMaterial)}
                  className="mt-1.5 w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-[#8B1C1C]"
                >
                  {UNIDADES_MEDIDA.map((unidad) => (
                    <option key={unidad.valor} value={unidad.valor}>
                      {unidad.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-xs font-semibold text-gray-600">
                Precio unitario (MXN) *
                <input
                  value={emptyWhenZeroNumericString(newItemPrice)}
                  onChange={(event) => setNewItemPrice(event.target.value)}
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="mt-1.5 w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-[#8B1C1C]"
                />
              </label>

              <label className="text-xs font-semibold text-gray-600">
                Código / ID Cotizador (opcional)
                <input
                  value={newItemId}
                  onChange={(event) => setNewItemId(event.target.value)}
                  placeholder="ej. melamina_roble_16"
                  className="mt-1.5 w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-[#8B1C1C]"
                />
              </label>

              <label className="text-xs font-semibold text-gray-600">
                Proveedor (opcional)
                <input
                  value={newItemProveedor}
                  onChange={(event) => setNewItemProveedor(event.target.value)}
                  placeholder="ej. Masisa, Arauco, Blum"
                  className="mt-1.5 w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-[#8B1C1C]"
                />
              </label>

              <label className="text-xs font-semibold text-gray-600">
                Gama / Tier (opcional)
                <select
                  value={newItemGama}
                  onChange={(event) => setNewItemGama(event.target.value as GamaMaterial)}
                  className="mt-1.5 w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-[#8B1C1C]"
                >
                  <option value="Estandar">Estándar</option>
                  <option value="Tendencia">Tendencia</option>
                  <option value="Premium">Premium</option>
                </select>
              </label>

              <label className="text-xs font-semibold text-gray-600 md:col-span-2">
                Descripción (opcional)
                <input
                  value={newItemDescripcion}
                  onChange={(event) => setNewItemDescripcion(event.target.value)}
                  placeholder="Detalles adicionales del material o acabado"
                  className="mt-1.5 w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-[#8B1C1C]"
                />
              </label>
            </div>

            {addError ? (
              <div className="mt-4 flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
                <span>{addError}</span>
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-3">
              <button
                type="button"
                disabled={isSubmittingModal}
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-2xl border border-gray-200 bg-white px-5 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isSubmittingModal}
                onClick={handleAddMaterialSubmit}
                className="flex items-center gap-2 rounded-2xl bg-[#8B1C1C] px-6 py-2.5 text-xs font-semibold text-white shadow transition hover:bg-[#721717] disabled:opacity-50"
              >
                {isSubmittingModal ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Guardar material
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
