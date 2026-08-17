"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Boxes,
  CheckCircle2,
  ImagePlus,
  Plus,
  Search,
  Sparkles,
  Tag,
  Trash2,
  UploadCloud,
} from "lucide-react";
import {
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
  type ElectroCategoria,
  type Electrodomestico,
  type Extra,
  type ExtraCategoria,
} from "@/lib/axios/equipamientoApi";

const emptyCategoryDraft = {
  nombre: "",
  descripcion: "",
  orden: 1,
  disponible: true,
};

const emptyElectroDraft = {
  nombre: "",
  descripcion: "",
  precio: 0,
  categoria: "",
  subtipo: "",
  disponible: true,
  imagenUrl: "",
  thumbnailUrl: "",
};

const emptyExtraDraft = {
  nombre: "",
  descripcion: "",
  precio: 0,
  categoria: "",
  categoriaId: "",
  subtipo: "",
  disponible: true,
  imagenUrl: "",
  thumbnailUrl: "",
};

export default function EquipamientoAdminPage() {
  const [electrodomesticos, setElectrodomesticos] = useState<Electrodomestico[]>([]);
  const [extras, setExtras] = useState<Extra[]>([]);
  const [categoriasElectro, setCategoriasElectro] = useState<ElectroCategoria[]>([]);
  const [categoriasExtras, setCategoriasExtras] = useState<ExtraCategoria[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"electrodomesticos" | "extras">("electrodomesticos");
  const [electroDraft, setElectroDraft] = useState(emptyElectroDraft);
  const [extraDraft, setExtraDraft] = useState(emptyExtraDraft);
  const [categoryDraft, setCategoryDraft] = useState(emptyCategoryDraft);
  const [extraCategoryDraft, setExtraCategoryDraft] = useState(emptyCategoryDraft);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const filteredElectro = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return electrodomesticos.filter((item) => {
      if (!normalized) return true;
      return [item.nombre, item.descripcion, item.categoria, item.subtipo]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalized);
    });
  }, [electrodomesticos, search]);

  const filteredExtras = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return extras.filter((item) => {
      if (!normalized) return true;
      return [item.nombre, item.descripcion, item.categoria, item.subtipo]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalized);
    });
  }, [extras, search]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      const [electroRes, extrasRes, catRes, extraCatRes] = await Promise.all([
        obtenerElectrodomesticos(),
        obtenerExtras(),
        obtenerCategoriasElectrodomesticos(),
        obtenerCategoriasExtras(),
      ]);

      if (electroRes.success && Array.isArray(electroRes.data)) {
        setElectrodomesticos(electroRes.data);
      }
      if (extrasRes.success && Array.isArray(extrasRes.data)) {
        setExtras(extrasRes.data);
      }
      if (catRes.success && Array.isArray(catRes.data)) {
        setCategoriasElectro(catRes.data);
      }
      if (extraCatRes.success && Array.isArray(extraCatRes.data)) {
        setCategoriasExtras(extraCatRes.data);
      }
    } catch {
      setError("No se pudo cargar la información de equipamiento desde el backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setUploadingImage(true);
      const response = await subirImagenCloudinary(file);
      if (response.success && response.data) {
        const target = activeTab === "electrodomesticos" ? electroDraft : extraDraft;
        if (activeTab === "electrodomesticos") {
          setElectroDraft({ ...electroDraft, imagenUrl: response.data.secureUrl, thumbnailUrl: response.data.thumbnailUrl || response.data.secureUrl });
        } else {
          setExtraDraft({ ...extraDraft, imagenUrl: response.data.secureUrl, thumbnailUrl: response.data.thumbnailUrl || response.data.secureUrl });
        }
      } else {
        setError(response.message || "No se pudo subir la imagen.");
      }
    } catch {
      setError("Ocurrió un error al subir la imagen.");
    } finally {
      setUploadingImage(false);
      event.target.value = "";
    }
  };

  const handleCreateElectro = async () => {
    if (!electroDraft.nombre.trim() || !electroDraft.categoria.trim()) {
      setError("Completa el nombre y la categoría del electrodoméstico.");
      return;
    }
    try {
      setIsSaving(true);
      const response = await crearElectrodomestico({
        nombre: electroDraft.nombre.trim(),
        descripcion: electroDraft.descripcion.trim() || undefined,
        precio: Number(electroDraft.precio) || 0,
        categoria: electroDraft.categoria.trim(),
        subtipo: electroDraft.subtipo.trim() || undefined,
        disponible: electroDraft.disponible,
        imagenUrl: electroDraft.imagenUrl || undefined,
        thumbnailUrl: electroDraft.thumbnailUrl || undefined,
      });
      if (response.success) {
        setElectroDraft(emptyElectroDraft);
        await loadData();
      } else {
        setError(response.message || "No se pudo crear el electrodoméstico.");
      }
    } catch {
      setError("No se pudo crear el electrodoméstico.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateExtra = async () => {
    if (!extraDraft.nombre.trim() || !extraDraft.categoria.trim()) {
      setError("Completa el nombre y la categoría del extra.");
      return;
    }
    try {
      setIsSaving(true);
      const response = await crearExtra({
        nombre: extraDraft.nombre.trim(),
        descripcion: extraDraft.descripcion.trim() || undefined,
        precio: Number(extraDraft.precio) || 0,
        categoria: extraDraft.categoria.trim(),
        categoriaId: extraDraft.categoriaId || undefined,
        subtipo: extraDraft.subtipo.trim() || undefined,
        disponible: extraDraft.disponible,
        imagenUrl: extraDraft.imagenUrl || undefined,
        thumbnailUrl: extraDraft.thumbnailUrl || undefined,
      });
      if (response.success) {
        setExtraDraft(emptyExtraDraft);
        await loadData();
      } else {
        setError(response.message || "No se pudo crear el extra.");
      }
    } catch {
      setError("No se pudo crear el extra.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateElectroCategory = async () => {
    if (!categoryDraft.nombre.trim()) {
      setError("Asigna un nombre a la categoría.");
      return;
    }
    try {
      setIsSaving(true);
      const response = await crearCategoriaElectrodomestico({
        nombre: categoryDraft.nombre.trim(),
        descripcion: categoryDraft.descripcion?.trim() || undefined,
        orden: Number(categoryDraft.orden) || 1,
        disponible: categoryDraft.disponible,
      });
      if (response.success) {
        setCategoryDraft(emptyCategoryDraft);
        await loadData();
      } else {
        setError(response.message || "No se pudo crear la categoría.");
      }
    } catch {
      setError("No se pudo crear la categoría.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateExtraCategory = async () => {
    if (!extraCategoryDraft.nombre.trim()) {
      setError("Asigna un nombre a la categoría de extras.");
      return;
    }
    try {
      setIsSaving(true);
      const response = await crearCategoriaExtra({
        nombre: extraCategoryDraft.nombre.trim(),
        descripcion: extraCategoryDraft.descripcion?.trim() || undefined,
        orden: Number(extraCategoryDraft.orden) || 1,
        disponible: extraCategoryDraft.disponible,
      });
      if (response.success) {
        setExtraCategoryDraft(emptyCategoryDraft);
        await loadData();
      } else {
        setError(response.message || "No se pudo crear la categoría de extras.");
      }
    } catch {
      setError("No se pudo crear la categoría de extras.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteItem = async (type: "electro" | "extra") => {
    if (type === "electro") {
      const selected = electrodomesticos[0];
      if (!selected) return;
      const response = await eliminarElectrodomestico(selected._id);
      if (response.success) await loadData();
      return;
    }
    const selected = extras[0];
    if (!selected) return;
    const response = await eliminarExtra(selected._id);
    if (response.success) await loadData();
  };

  const handleDeleteCategory = async (type: "electro" | "extra") => {
    if (type === "electro") {
      const selected = categoriasElectro[0];
      if (!selected) return;
      const response = await eliminarCategoriaElectrodomestico(selected._id);
      if (response.success) await loadData();
      return;
    }
    const selected = categoriasExtras[0];
    if (!selected) return;
    const response = await eliminarCategoriaExtra(selected._id);
    if (response.success) await loadData();
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-secondary hover:text-primary">
              <ArrowLeft className="h-4 w-4" />
              Volver al panel
            </Link>
            <div className="mt-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Boxes className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-secondary">Admin</p>
                <h1 className="text-2xl font-semibold text-gray-900">Gestión de equipamiento</h1>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm text-secondary shadow-sm">
            Usa esta vista para administrar electrodomésticos, extras y sus categorías desde el backend.
          </div>
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-1 min-w-[240px] items-center gap-2 rounded-2xl border border-gray-200 bg-slate-50 px-3 py-2">
            <Search className="h-4 w-4 text-secondary" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nombre o categoría"
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>
          <div className="flex rounded-2xl border border-gray-200 bg-slate-50 p-1">
            <button type="button" onClick={() => setActiveTab("electrodomesticos")} className={`rounded-xl px-4 py-2 text-sm font-semibold ${activeTab === "electrodomesticos" ? "bg-primary text-white" : "text-secondary"}`}>
              Electrodomésticos
            </button>
            <button type="button" onClick={() => setActiveTab("extras")} className={`rounded-xl px-4 py-2 text-sm font-semibold ${activeTab === "extras" ? "bg-primary text-white" : "text-secondary"}`}>
              Extras
            </button>
          </div>
        </div>

        {error ? <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">{error}</div> : null}

        <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-secondary">Catálogo</p>
                <h2 className="text-xl font-semibold text-gray-900">{activeTab === "electrodomesticos" ? "Electrodomésticos" : "Extras"}</h2>
              </div>
              <div className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
                {activeTab === "electrodomesticos" ? filteredElectro.length : filteredExtras.length}
              </div>
            </div>

            {loading ? (
              <div className="flex min-h-[220px] items-center justify-center text-sm text-secondary">Cargando catálogo...</div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {(activeTab === "electrodomesticos" ? filteredElectro : filteredExtras).map((item) => (
                  <div key={item._id} className="rounded-2xl border border-gray-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{item.nombre}</p>
                        <p className="mt-1 text-sm text-secondary">{item.categoria || "Sin categoría"}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${item.disponible === false ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                        {item.disponible === false ? "Oculto" : "Visible"}
                      </span>
                    </div>
                    <p className="mt-3 line-clamp-3 text-sm text-secondary">{item.descripcion || "Sin descripción"}</p>
                    <div className="mt-4 flex items-center justify-between text-sm">
                      <span className="font-semibold text-primary">${Number(item.precio ?? 0).toLocaleString("es-MX")}</span>
                      <span className="text-secondary">{item.subtipo || "Sin subtipo"}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Plus className="h-4 w-4 text-primary" />
                <h3 className="text-lg font-semibold text-gray-900">Crear {activeTab === "electrodomesticos" ? "electrodoméstico" : "extra"}</h3>
              </div>
              {activeTab === "electrodomesticos" ? (
                <div className="space-y-3">
                  <input value={electroDraft.nombre} onChange={(event) => setElectroDraft({ ...electroDraft, nombre: event.target.value })} placeholder="Nombre" className="w-full rounded-2xl border border-gray-200 px-3 py-2 text-sm outline-none" />
                  <textarea value={electroDraft.descripcion} onChange={(event) => setElectroDraft({ ...electroDraft, descripcion: event.target.value })} placeholder="Descripción" className="min-h-24 w-full rounded-2xl border border-gray-200 px-3 py-2 text-sm outline-none" />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input type="number" value={electroDraft.precio} onChange={(event) => setElectroDraft({ ...electroDraft, precio: Number(event.target.value) })} placeholder="Precio" className="w-full rounded-2xl border border-gray-200 px-3 py-2 text-sm outline-none" />
                    <input value={electroDraft.categoria} onChange={(event) => setElectroDraft({ ...electroDraft, categoria: event.target.value })} placeholder="Categoría" className="w-full rounded-2xl border border-gray-200 px-3 py-2 text-sm outline-none" />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input value={electroDraft.subtipo} onChange={(event) => setElectroDraft({ ...electroDraft, subtipo: event.target.value })} placeholder="Subtipo" className="w-full rounded-2xl border border-gray-200 px-3 py-2 text-sm outline-none" />
                    <label className="flex items-center gap-2 text-sm text-secondary">
                      <input type="checkbox" checked={electroDraft.disponible} onChange={(event) => setElectroDraft({ ...electroDraft, disponible: event.target.checked })} />
                      Visible
                    </label>
                  </div>
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-gray-300 px-3 py-3 text-sm text-secondary">
                    <UploadCloud className="h-4 w-4" />
                    {uploadingImage ? "Subiendo imagen..." : "Subir imagen"}
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  </label>
                  <button type="button" onClick={handleCreateElectro} disabled={isSaving} className="w-full rounded-2xl bg-primary py-2.5 text-sm font-semibold text-white disabled:opacity-60">
                    {isSaving ? "Guardando..." : "Guardar electrodoméstico"}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <input value={extraDraft.nombre} onChange={(event) => setExtraDraft({ ...extraDraft, nombre: event.target.value })} placeholder="Nombre" className="w-full rounded-2xl border border-gray-200 px-3 py-2 text-sm outline-none" />
                  <textarea value={extraDraft.descripcion} onChange={(event) => setExtraDraft({ ...extraDraft, descripcion: event.target.value })} placeholder="Descripción" className="min-h-24 w-full rounded-2xl border border-gray-200 px-3 py-2 text-sm outline-none" />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input type="number" value={extraDraft.precio} onChange={(event) => setExtraDraft({ ...extraDraft, precio: Number(event.target.value) })} placeholder="Precio" className="w-full rounded-2xl border border-gray-200 px-3 py-2 text-sm outline-none" />
                    <input value={extraDraft.categoria} onChange={(event) => setExtraDraft({ ...extraDraft, categoria: event.target.value })} placeholder="Categoría" className="w-full rounded-2xl border border-gray-200 px-3 py-2 text-sm outline-none" />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input value={extraDraft.subtipo} onChange={(event) => setExtraDraft({ ...extraDraft, subtipo: event.target.value })} placeholder="Subtipo" className="w-full rounded-2xl border border-gray-200 px-3 py-2 text-sm outline-none" />
                    <label className="flex items-center gap-2 text-sm text-secondary">
                      <input type="checkbox" checked={extraDraft.disponible} onChange={(event) => setExtraDraft({ ...extraDraft, disponible: event.target.checked })} />
                      Visible
                    </label>
                  </div>
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-gray-300 px-3 py-3 text-sm text-secondary">
                    <UploadCloud className="h-4 w-4" />
                    {uploadingImage ? "Subiendo imagen..." : "Subir imagen"}
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  </label>
                  <button type="button" onClick={handleCreateExtra} disabled={isSaving} className="w-full rounded-2xl bg-primary py-2.5 text-sm font-semibold text-white disabled:opacity-60">
                    {isSaving ? "Guardando..." : "Guardar extra"}
                  </button>
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Tag className="h-4 w-4 text-primary" />
                <h3 className="text-lg font-semibold text-gray-900">Categorías</h3>
              </div>
              <div className="space-y-3">
                <input value={categoryDraft.nombre} onChange={(event) => setCategoryDraft({ ...categoryDraft, nombre: event.target.value })} placeholder="Categoría de electrodomésticos" className="w-full rounded-2xl border border-gray-200 px-3 py-2 text-sm outline-none" />
                <textarea value={categoryDraft.descripcion} onChange={(event) => setCategoryDraft({ ...categoryDraft, descripcion: event.target.value })} placeholder="Descripción" className="min-h-20 w-full rounded-2xl border border-gray-200 px-3 py-2 text-sm outline-none" />
                <input type="number" value={categoryDraft.orden} onChange={(event) => setCategoryDraft({ ...categoryDraft, orden: Number(event.target.value) })} placeholder="Orden" className="w-full rounded-2xl border border-gray-200 px-3 py-2 text-sm outline-none" />
                <button type="button" onClick={handleCreateElectroCategory} disabled={isSaving} className="w-full rounded-2xl bg-slate-800 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
                  {isSaving ? "Guardando..." : "Guardar categoría electro"}
                </button>
              </div>
              <div className="mt-4 space-y-2">
                {categoriasElectro.map((category) => (
                  <div key={category._id} className="flex items-center justify-between rounded-2xl border border-gray-200 bg-slate-50 px-3 py-2 text-sm">
                    <span>{category.nombre}</span>
                    <span className="text-secondary">{category.disponible === false ? "Oculta" : "Activa"}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h3 className="text-lg font-semibold text-gray-900">Categorías de extras</h3>
              </div>
              <div className="space-y-3">
                <input value={extraCategoryDraft.nombre} onChange={(event) => setExtraCategoryDraft({ ...extraCategoryDraft, nombre: event.target.value })} placeholder="Categoría de extras" className="w-full rounded-2xl border border-gray-200 px-3 py-2 text-sm outline-none" />
                <textarea value={extraCategoryDraft.descripcion} onChange={(event) => setExtraCategoryDraft({ ...extraCategoryDraft, descripcion: event.target.value })} placeholder="Descripción" className="min-h-20 w-full rounded-2xl border border-gray-200 px-3 py-2 text-sm outline-none" />
                <input type="number" value={extraCategoryDraft.orden} onChange={(event) => setExtraCategoryDraft({ ...extraCategoryDraft, orden: Number(event.target.value) })} placeholder="Orden" className="w-full rounded-2xl border border-gray-200 px-3 py-2 text-sm outline-none" />
                <button type="button" onClick={handleCreateExtraCategory} disabled={isSaving} className="w-full rounded-2xl bg-slate-800 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
                  {isSaving ? "Guardando..." : "Guardar categoría extra"}
                </button>
              </div>
              <div className="mt-4 space-y-2">
                {categoriasExtras.map((category) => (
                  <div key={category._id} className="flex items-center justify-between rounded-2xl border border-gray-200 bg-slate-50 px-3 py-2 text-sm">
                    <span>{category.nombre}</span>
                    <span className="text-secondary">{category.disponible === false ? "Oculta" : "Activa"}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Trash2 className="h-4 w-4 text-primary" />
                <h3 className="text-lg font-semibold text-gray-900">Gestión rápida</h3>
              </div>
              <div className="space-y-3">
                <button type="button" onClick={() => void handleDeleteItem(activeTab === "electrodomesticos" ? "electro" : "extra")} className="w-full rounded-2xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700">
                  Eliminar primer {activeTab === "electrodomesticos" ? "electrodoméstico" : "extra"}
                </button>
                <button type="button" onClick={() => void handleDeleteCategory(activeTab === "electrodomesticos" ? "electro" : "extra")} className="w-full rounded-2xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700">
                  Eliminar primera categoría {activeTab === "electrodomesticos" ? "electro" : "extra"}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
