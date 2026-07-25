/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Settings } from "lucide-react";

import { useFocusTrap } from "@/hooks/useFocusTrap";
import { emptyWhenZeroNumericString } from "@/lib/numeric-input-empty-zero";

const catalogoInicial = [
  {
    category: "CUBIERTA",
    items: [
      { id: "cub_melamina", label: "Cubierta melamina", unitPrice: 170, unit: "pies" },
      { id: "cub_granito", label: "Granito", unitPrice: 12000, unit: "placa" },
      { id: "mo_granito", label: "Mano obra granito", unitPrice: 1400, unit: "mts2" },
    ],
  },
  {
    category: "ESTRUCTURA",
    items: [
      { id: "est_mel_blanca", label: "Melamina Blanca", unitPrice: 700, unit: "pz" },
      { id: "est_mel_color", label: "Melamina Negro o gris", unitPrice: 1000, unit: "pz" },
      { id: "est_cubrecantos", label: "Cubrecantos", unitPrice: 9, unit: "pz" },
      { id: "est_cortes", label: "Cortes y enchapes", unitPrice: 1500, unit: "servicio" },
    ],
  },
  {
    category: "VISTAS",
    items: [
      { id: "vis_melamina", label: "Melamina Vistas", unitPrice: 1100, unit: "pz" },
      { id: "vis_brillo", label: "Alto brillo/mate", unitPrice: 3300, unit: "pz" },
      { id: "vis_cortes", label: "Cortes y enchape", unitPrice: 1500, unit: "servicio" },
      { id: "vis_cubrecantos", label: "Cubrecantos", unitPrice: 20, unit: "pz" },
    ],
  },
  {
    category: "HERRAJES",
    items: [
      { id: "herr_cajon_sen", label: "Cajón sencillo", unitPrice: 120, unit: "pz" },
      { id: "herr_cajon_len", label: "Cajón Cierre lento", unitPrice: 450, unit: "pz" },
      { id: "herr_cajon_blum", label: "Cajón BLUM tandem", unitPrice: 700, unit: "pz" },
      { id: "herr_puerta_len", label: "Puerta Cierre lento/Push", unitPrice: 50, unit: "pz" },
      { id: "herr_bisagra", label: "Puertas Bisagras sencilla", unitPrice: 30, unit: "pz" },
      { id: "herr_piston_sen", label: "Pistón sencillo", unitPrice: 40, unit: "pz" },
      { id: "herr_piston_blum", label: "Pistón blum", unitPrice: 350, unit: "pz" },
      { id: "herr_zoclo", label: "Zoclo", unitPrice: 180, unit: "pz" },
      { id: "herr_patas", label: "Patas y clips", unitPrice: 17, unit: "pz" },
      { id: "herr_push", label: "Push", unitPrice: 150, unit: "pz" },
      { id: "herr_spots", label: "Spots", unitPrice: 250, unit: "pz" },
      { id: "herr_puerta_esq", label: "Puertas Esquinera", unitPrice: 200, unit: "pz" },
    ],
  },
  {
    category: "EXTRAÍBLES Y ELECTRODOMÉSTICOS",
    items: [
      { id: "ext_alacena", label: "Alacena doble", unitPrice: 3000, unit: "pz" },
      { id: "ext_avento_hf", label: "Avento HF", unitPrice: 3500, unit: "pz" },
      { id: "ext_especiero", label: "Especiero", unitPrice: 1800, unit: "pz" },
      { id: "ext_servo", label: "Servo drive", unitPrice: 18000, unit: "pz" },
      { id: "ele_parrilla", label: "Parrilla", unitPrice: 3500, unit: "pz" },
      { id: "ele_campana", label: "Campana", unitPrice: 4500, unit: "pz" },
    ],
  },
  {
    category: "GASTOS FIJOS Y VARIOS",
    items: [
      { id: "var_insumos", label: "Varios (thiner, estopa, silicon, tornillos)", unitPrice: 2000, unit: "paquete" },
      { id: "fijo_mo_semana", label: "Mano obra 1 equipo", unitPrice: 6000, unit: "semana" },
      { id: "fijo_admin_semana", label: "Gastos admin", unitPrice: 7000, unit: "semana" },
    ],
  },
];

const initialFlatData = catalogoInicial.flatMap((category) =>
  category.items.map((item) => ({
    ...item,
    category: category.category,
  })),
);

const STORAGE_KEY = "kuche.catalogo.precios.v1";

const currencyFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  minimumFractionDigits: 2,
});

export default function PreciosPage() {
  const [items, setItems] = useState(initialFlatData);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todas");
  const [hasChanges, setHasChanges] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newItemId, setNewItemId] = useState("");
  const [newItemLabel, setNewItemLabel] = useState("");
  const [newItemCategory, setNewItemCategory] = useState(catalogoInicial[0]?.category ?? "");
  const [newItemUnit, setNewItemUnit] = useState("pz");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [addError, setAddError] = useState("");
  const modalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return;
    }
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        setItems(parsed);
      }
    } catch {
      // ignore corrupted storage
    }
  }, []);

  useEffect(() => {
    if (!isAddModalOpen) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsAddModalOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isAddModalOpen]);

  useFocusTrap(isAddModalOpen, modalRef);

  const categories = useMemo(
    () => ["Todas", ...catalogoInicial.map((category) => category.category)],
    [],
  );

  const filteredItems = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      const matchesCategory = selectedCategory === "Todas" || item.category === selectedCategory;
      const matchesQuery = !normalizedQuery || item.label.toLowerCase().includes(normalizedQuery);
      return matchesCategory && matchesQuery;
    });
  }, [items, searchQuery, selectedCategory]);

  const handlePriceChange = (id: string, value: string) => {
    if (value === "") {
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, unitPrice: 0 } : item)),
      );
      setHasChanges(true);
      return;
    }
    const parsed = Number.parseFloat(value);
    if (Number.isNaN(parsed)) {
      return;
    }
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, unitPrice: parsed } : item)),
    );
    setHasChanges(true);
  };

  const handleSave = () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    setHasChanges(false);
  };

  const handleExportCsv = () => {
    const header = ["id", "label", "category", "unit", "unitPrice"];
    const rows = items.map((item) => [
      item.id,
      item.label,
      item.category,
      item.unit,
      item.unitPrice.toString(),
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
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      if (!text) {
        return;
      }
      const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
      if (lines.length <= 1) {
        return;
      }
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
      const nextItems = dataLines
        .map((line) => {
          const [id, label, category, unit, unitPrice] = parseCsvLine(line).map((value) =>
            value.replace(/^"|"$/g, ""),
          );
          const parsedPrice = Number.parseFloat(unitPrice ?? "");
          if (!id || !label || !category || !unit || Number.isNaN(parsedPrice)) {
            return null;
          }
          return { id, label, category, unit, unitPrice: parsedPrice };
        })
        .filter((item): item is (typeof initialFlatData)[number] => item !== null);
      if (nextItems.length > 0) {
        setItems(nextItems);
        setHasChanges(true);
      }
    };
    reader.readAsText(file);
  };

  const handleRestoreDefaults = () => {
    setItems(initialFlatData);
    setHasChanges(true);
    window.localStorage.removeItem(STORAGE_KEY);
  };

  const handleAddMaterial = () => {
    const trimmedId = newItemId.trim();
    const trimmedLabel = newItemLabel.trim();
    const trimmedUnit = newItemUnit.trim();
    const parsedPrice = Number.parseFloat(newItemPrice);
    if (!trimmedId || !trimmedLabel || !trimmedUnit || Number.isNaN(parsedPrice)) {
      setAddError("Completa todos los campos y agrega un precio válido.");
      return;
    }
    const idExists = items.some((item) => item.id.toLowerCase() === trimmedId.toLowerCase());
    if (idExists) {
      setAddError("El ID ya existe. Usa un ID único.");
      return;
    }
    setItems((prev) => [
      ...prev,
      {
        id: trimmedId,
        label: trimmedLabel,
        category: newItemCategory,
        unit: trimmedUnit,
        unitPrice: parsedPrice,
      },
    ]);
    setHasChanges(true);
    setIsAddModalOpen(false);
    setNewItemId("");
    setNewItemLabel("");
    setNewItemUnit("pz");
    setNewItemPrice("");
    setAddError("");
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-800">Actualización de costos base (piezas)</p>
            <p className="mt-0.5 text-[11px] leading-snug text-gray-500">
              Esta tabla es solo los precios base de materiales del cotizador. Para el PDF de levantamiento
              (escenarios por superficie, IVA y materiales que aparecen en ese PDF), usa el botón{' '}
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
            accept=".csv,text/csv"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) {
                return;
              }
              handleImportCsv(file);
              event.currentTarget.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => {
              setNewItemCategory(catalogoInicial[0]?.category ?? "");
              setNewItemId("");
              setNewItemLabel("");
              setNewItemUnit("pz");
              setNewItemPrice("");
              setAddError("");
              setIsAddModalOpen(true);
            }}
            className="rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-100"
          >
            + Nuevo material
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-100"
          >
            Importar CSV
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            className="rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-100"
          >
            Exportar CSV
          </button>
          <button
            type="button"
            onClick={handleRestoreDefaults}
            className="rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-100"
          >
            Restaurar base
          </button>
          <button
            type="button"
            onClick={handleSave}
            className={`rounded-2xl bg-[#8B1C1C] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition ${
              hasChanges ? "animate-pulse" : ""
            }`}
          >
            Guardar cambios
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="relative flex w-full max-w-md items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2">
          <Search className="h-4 w-4 text-gray-400" />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Buscar material..."
            className="w-full bg-transparent text-sm text-gray-700 outline-none"
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

      <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white p-1 shadow-sm">
        <div className="grid grid-cols-[2.4fr_1fr_0.7fr_0.9fr] gap-2 px-6 py-4 text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
          <span>Material</span>
          <span>Categoría</span>
          <span>Unidad</span>
          <span className="text-right">Precio unitario</span>
        </div>
        <div className="divide-y divide-gray-100">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="grid grid-cols-[2.4fr_1fr_0.7fr_0.9fr] items-center gap-2 px-6 py-4"
            >
              <div>
                <p className="text-sm font-semibold text-gray-900">{item.label}</p>
                <p className="text-xs text-gray-400">{item.id}</p>
              </div>
              <span className="w-fit rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-600">
                {item.category}
              </span>
              <span className="text-sm text-gray-600">{item.unit}</span>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0"
                value={item.unitPrice === 0 ? "" : item.unitPrice}
                onChange={(event) => handlePriceChange(item.id, event.target.value)}
                className="w-24 justify-self-end border-b border-transparent bg-transparent text-right text-sm font-semibold text-gray-900 transition-colors hover:border-gray-300 focus:border-[#8B1C1C] focus:outline-none"
              />
              <span className="sr-only">{currencyFormatter.format(item.unitPrice)}</span>
            </div>
          ))}
          {filteredItems.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-gray-500">
              No hay materiales que coincidan con los filtros.
            </div>
          ) : null}
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
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="text-xs font-semibold text-gray-500">
                ID único
                <input
                  value={newItemId}
                  onChange={(event) => setNewItemId(event.target.value)}
                  placeholder="ej. herr_bisagra_premium"
                  className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none"
                />
              </label>
              <label className="text-xs font-semibold text-gray-500">
                Categoría
                <select
                  value={newItemCategory}
                  onChange={(event) => setNewItemCategory(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none"
                >
                  {catalogoInicial.map((category) => (
                    <option key={category.category} value={category.category}>
                      {category.category}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-semibold text-gray-500 sm:col-span-2">
                Nombre del material
                <input
                  value={newItemLabel}
                  onChange={(event) => setNewItemLabel(event.target.value)}
                  placeholder="ej. Bisagra premium"
                  className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none"
                />
              </label>
              <label className="text-xs font-semibold text-gray-500">
                Unidad
                <input
                  value={newItemUnit}
                  onChange={(event) => setNewItemUnit(event.target.value)}
                  placeholder="pz, mts, placa"
                  className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none"
                />
              </label>
              <label className="text-xs font-semibold text-gray-500">
                Precio unitario
                <input
                  value={emptyWhenZeroNumericString(newItemPrice)}
                  onChange={(event) => setNewItemPrice(event.target.value)}
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0"
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
                onClick={handleAddMaterial}
                className="rounded-2xl bg-[#8B1C1C] px-5 py-2 text-xs font-semibold text-white"
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
