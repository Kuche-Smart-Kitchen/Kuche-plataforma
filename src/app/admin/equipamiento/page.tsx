"use client";

import { useEffect, useMemo, useState } from "react";
import { ImagePlus, Pencil, Plus, Trash2, X } from "lucide-react";

import { useCatalogEquipamiento } from "@/contexts/CatalogEquipamientoContext";

const PREDEFINED_EXTRA_CATEGORIES = [
  "Alacena extraible",
  "Bote de basura",
  "Space tower",
  "Mecanismos electricos",
  "Sistemas inteligentes (alexa)",
  "Esquinas magicas",
  "Persianas enrollables",
  "Botelleros/especiero/canastillas",
];

type TabKey = "electro" | "categorias" | "extras";
type ModalKind = "electro" | "extra";

type FormItem = {
  nombre: string;
  categoria: string;
  precio: string;
  descripcion: string;
  imagenUrl: string;
  thumbnailUrl: string;
};

const emptyForm: FormItem = {
  nombre: "",
  categoria: "",
  precio: "",
  descripcion: "",
  imagenUrl: "",
  thumbnailUrl: "",
};

export default function EquipamientoPage() {
  const {
    electrodomesticos,
    electroCategorias,
    extrasCategorias,
    extras,
    loading,
    error,
    canMutate,
    canDelete,
    uploadImage,
    createElectrodomestico,
    updateElectrodomestico,
    removeElectrodomestico,
    createElectroCategoria,
    removeElectroCategoria,
    createExtraCategoria,
    removeExtraCategoria,
    createExtra,
    updateExtra,
    removeExtra,
  } = useCatalogEquipamiento();

  const [activeTab, setActiveTab] = useState<TabKey>("electro");
  const [electroForm, setElectroForm] = useState<FormItem>(emptyForm);
  const [extraForm, setExtraForm] = useState<FormItem>(emptyForm);
  const [electroSearch, setElectroSearch] = useState("");
  const [electroCategoryFilter, setElectroCategoryFilter] = useState<string>("Todas");
  const [newElectroCategoriaNombre, setNewElectroCategoriaNombre] = useState("");
  const [newCategoriaNombre, setNewCategoriaNombre] = useState("");
  const [editingElectroId, setEditingElectroId] = useState<string | null>(null);
  const [editingExtraId, setEditingExtraId] = useState<string | null>(null);
  const [localMessage, setLocalMessage] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalKind, setModalKind] = useState<ModalKind>("electro");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const mergedCategoryNames = useMemo(() => {
    const dynamic = extrasCategorias.map((item) => item.nombre).filter(Boolean);
    return Array.from(new Set([...PREDEFINED_EXTRA_CATEGORIES, ...dynamic])).sort((a, b) =>
      a.localeCompare(b, "es"),
    );
  }, [extrasCategorias]);

  const electroCategoryNames = useMemo(() => {
    const backendNames = electroCategorias.map((item) => item.nombre).filter(Boolean);
    if (backendNames.length > 0) return backendNames;

    const inferredNames = electrodomesticos.map((item) => item.categoria?.trim()).filter(Boolean) as string[];
    return Array.from(new Set(inferredNames)).sort((a, b) => a.localeCompare(b, "es"));
  }, [electroCategorias, electrodomesticos]);

  const electroCategoryFilterOptions = useMemo(
    () => ["Todas", ...electroCategoryNames],
    [electroCategoryNames],
  );

  const filteredElectrodomesticos = useMemo(() => {
    const search = electroSearch.trim().toLowerCase();
    return electrodomesticos.filter((item) => {
      const matchesSearch =
        !search ||
        `${item.nombre} ${item.categoria ?? ""} ${item.descripcion ?? ""}`.toLowerCase().includes(search);
      const matchesCategory = electroCategoryFilter === "Todas" || item.categoria === electroCategoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [electroCategoryFilter, electroSearch, electrodomesticos]);

  useEffect(() => {
    if (!isModalOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsModalOpen(false);
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isModalOpen]);

  const resetElectroForm = () => {
    setElectroForm(emptyForm);
    setEditingElectroId(null);
  };

  const resetExtraForm = () => {
    setExtraForm(emptyForm);
    setEditingExtraId(null);
  };

  const openCreateModal = (kind: ModalKind) => {
    setModalKind(kind);
    if (kind === "electro") resetElectroForm();
    else resetExtraForm();
    setIsModalOpen(true);
  };

  const parsePrice = (raw: string) => {
    const parsed = Number.parseFloat(raw.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  const handleImageUpload = async (file: File, target: ModalKind) => {
    const uploaded = await uploadImage(file);
    if (!uploaded) return;
    const nextValue = {
      imagenUrl: uploaded.secureUrl,
      thumbnailUrl: uploaded.thumbnailUrl || uploaded.secureUrl,
    };
    if (target === "electro") {
      setElectroForm((prev) => ({ ...prev, ...nextValue }));
    } else {
      setExtraForm((prev) => ({ ...prev, ...nextValue }));
    }
    setLocalMessage("Imagen subida a Cloudinary correctamente.");
  };

  const submitElectro = async () => {
    if (!electroForm.nombre.trim() || !electroForm.categoria.trim()) {
      setLocalMessage("Nombre y categoria son obligatorios para electrodomesticos.");
      return false;
    }
    const payload = {
      nombre: electroForm.nombre.trim(),
      categoria: electroForm.categoria.trim(),
      precio: parsePrice(electroForm.precio),
      descripcion: electroForm.descripcion.trim() || undefined,
      imagenUrl: electroForm.imagenUrl.trim() || undefined,
      thumbnailUrl: electroForm.thumbnailUrl.trim() || undefined,
      disponible: true,
    };
    const success = editingElectroId
      ? await updateElectrodomestico(editingElectroId, payload)
      : await createElectrodomestico(payload);
    if (success) {
      setLocalMessage(editingElectroId ? "Electrodomestico actualizado." : "Electrodomestico creado.");
      resetElectroForm();
      return true;
    }
    return false;
  };

  const submitExtra = async () => {
    if (!extraForm.nombre.trim() || !extraForm.categoria.trim()) {
      setLocalMessage("Nombre y categoria son obligatorios para extras.");
      return false;
    }
    const selectedCategoria = extrasCategorias.find((cat) => cat.nombre === extraForm.categoria.trim());
    const payload = {
      nombre: extraForm.nombre.trim(),
      categoria: extraForm.categoria.trim(),
      categoriaId: selectedCategoria?._id,
      precio: parsePrice(extraForm.precio),
      descripcion: extraForm.descripcion.trim() || undefined,
      imagenUrl: extraForm.imagenUrl.trim() || undefined,
      thumbnailUrl: extraForm.thumbnailUrl.trim() || undefined,
      disponible: true,
    };
    const success = editingExtraId ? await updateExtra(editingExtraId, payload) : await createExtra(payload);
    if (success) {
      setLocalMessage(editingExtraId ? "Extra actualizado." : "Extra creado.");
      resetExtraForm();
      return true;
    }
    return false;
  };

  const submitCurrentModal = async () => {
    if (!canMutate || isSubmitting) return;
    setIsSubmitting(true);
    const ok = modalKind === "electro" ? await submitElectro() : await submitExtra();
    setIsSubmitting(false);
    if (ok) setIsModalOpen(false);
  };

  const submitCategoria = async () => {
    const nombre = newCategoriaNombre.trim();
    if (!nombre) {
      setLocalMessage("Escribe el nombre de la categoria.");
      return;
    }
    const success = await createExtraCategoria({ nombre, disponible: true });
    if (success) {
      setLocalMessage("Categoria de extras creada.");
      setNewCategoriaNombre("");
    }
  };

  const submitElectroCategoria = async () => {
    const nombre = newElectroCategoriaNombre.trim();
    if (!nombre) {
      setLocalMessage("Escribe el nombre de la categoria de electrodomesticos.");
      return;
    }
    const success = await createElectroCategoria({ nombre, disponible: true });
    if (success) {
      setLocalMessage("Categoria de electrodomesticos creada.");
      setNewElectroCategoriaNombre("");
    }
  };

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-white/70 bg-gradient-to-br from-white to-slate-50 p-6 shadow-md">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-secondary">Catalogo</p>
        <h1 className="mt-2 text-3xl font-semibold text-gray-900">Electrodomesticos y Extras</h1>
        <p className="mt-2 max-w-3xl text-sm text-secondary">
          Gestion global para levantamiento detallado y cotizacion. Admin y empleado pueden crear y editar.
          Solo admin puede eliminar.
        </p>
      </header>

      <div className="flex flex-wrap gap-2 rounded-2xl border border-primary/10 bg-white p-2 shadow-sm">
        {([
          ["electro", "Electrodomesticos"],
          ["categorias", "Categorias"],
          ["extras", "Extras"],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`rounded-xl px-4 py-2 text-xs font-semibold transition ${
              activeTab === id
                ? "bg-[#8B1C1C] text-white shadow"
                : "text-secondary hover:bg-primary/5"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
      ) : null}
      {localMessage ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {localMessage}
        </p>
      ) : null}

      {activeTab === "electro" ? (
        <section className="space-y-5 rounded-3xl border border-white/70 bg-white/85 p-6 shadow-md">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-gray-900">Electrodomesticos</h2>
            <button
              type="button"
              disabled={!canMutate}
              onClick={() => openCreateModal("electro")}
              className="inline-flex items-center gap-2 rounded-full bg-[#8B1C1C] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              <Plus className="h-4 w-4" /> Nuevo electrodomestico
            </button>
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-primary/10 bg-white/90 p-4 md:flex-row md:items-center md:justify-between">
            <div className="flex-1">
              <input
                value={electroSearch}
                onChange={(event) => setElectroSearch(event.target.value)}
                placeholder="Buscar electrodomestico..."
                className="w-full rounded-2xl border border-primary/10 bg-white px-4 py-2.5 text-sm outline-none"
              />
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              {electroCategoryFilterOptions.map((category) => {
                const isActive = electroCategoryFilter === category;
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setElectroCategoryFilter(category)}
                    className={`rounded-full border px-4 py-2 transition ${
                      isActive
                        ? "border-[#8B1C1C] bg-[#8B1C1C] text-white"
                        : "border-primary/10 bg-white text-secondary hover:border-[#8B1C1C]/40 hover:text-primary"
                    }`}
                  >
                    {category}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {(loading ? [] : filteredElectrodomesticos).map((item) => (
              <article
                key={item._id}
                className="group overflow-hidden rounded-2xl border border-primary/10 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-primary/[0.05]">
                  <img
                    src={item.thumbnailUrl || item.imagenUrl || "/images/hero-placeholder.svg"}
                    alt={item.nombre}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                  <span className="absolute right-2 top-2 rounded-full bg-black/65 px-2 py-1 text-[10px] font-semibold text-white">
                    {item.categoria}
                  </span>
                </div>
                <div className="space-y-2 p-4">
                  <p className="text-sm font-semibold text-primary">{item.nombre}</p>
                  <p className="text-xs font-semibold text-[#8B1C1C]">
                    {typeof item.precio === "number" ? `$${item.precio.toLocaleString("es-MX")}` : "Sin precio"}
                  </p>
                  {item.descripcion ? (
                    <p className="line-clamp-2 text-xs text-secondary">{item.descripcion}</p>
                  ) : null}
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      disabled={!canMutate}
                      onClick={() => {
                        setModalKind("electro");
                        setEditingElectroId(item._id);
                        setElectroForm({
                          nombre: item.nombre || "",
                          categoria: item.categoria || "",
                          precio: item.precio != null ? String(item.precio) : "",
                          descripcion: item.descripcion || "",
                          imagenUrl: item.imagenUrl || "",
                          thumbnailUrl: item.thumbnailUrl || "",
                        });
                        setIsModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1 rounded-full border border-primary/20 px-3 py-1.5 text-xs font-semibold text-primary disabled:opacity-45"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Editar
                    </button>
                    <button
                      type="button"
                      disabled={!canDelete}
                      onClick={() => void removeElectrodomestico(item._id)}
                      className="inline-flex items-center gap-1 rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 disabled:opacity-45"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Eliminar
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
          {!loading && filteredElectrodomesticos.length === 0 ? (
            <p className="rounded-2xl border border-primary/10 bg-primary/[0.04] px-4 py-3 text-sm text-secondary">
              No hay electrodomesticos que coincidan con el buscador o el filtro.
            </p>
          ) : null}
        </section>
      ) : null}

      {activeTab === "categorias" ? (
        <section className="space-y-5 rounded-3xl border border-white/70 bg-white/85 p-6 shadow-md">
          <h2 className="text-lg font-semibold text-gray-900">Categorias del catalogo</h2>
          <div className="rounded-2xl border border-primary/10 bg-white p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-secondary">
              Electrodomesticos
            </p>
            <div className="flex flex-wrap gap-2">
              <input
                value={newElectroCategoriaNombre}
                onChange={(e) => setNewElectroCategoriaNombre(e.target.value)}
                placeholder="Nombre de nueva categoria"
                className="min-w-[18rem] flex-1 rounded-xl border border-primary/15 px-3 py-2 text-sm outline-none"
              />
              <button
                type="button"
                disabled={!canMutate}
                onClick={() => void submitElectroCategoria()}
                className="inline-flex items-center gap-2 rounded-full bg-[#8B1C1C] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
              >
                <Plus className="h-4 w-4" /> Crear categoria
              </button>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {electroCategorias.map((category) => {
                const name = category.nombre;
                return (
                  <div
                    key={name}
                    className="space-y-2 rounded-2xl border border-primary/10 bg-white px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="block text-sm font-medium text-primary">{name}</span>
                        {category.descripcion ? (
                          <p className="mt-1 text-xs text-secondary">{category.descripcion}</p>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        disabled={!canDelete}
                        onClick={() => void removeElectroCategoria(category._id)}
                        className="inline-flex items-center gap-1 rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-700 disabled:opacity-45"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Eliminar
                      </button>
                    </div>
                  </div>
                );
              })}
              {!loading && electroCategorias.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-primary/15 bg-primary/[0.04] px-4 py-3 text-sm text-secondary md:col-span-2 xl:col-span-3">
                  No llegaron categorias desde el backend. El filtro usa categorias inferidas de los electrodomesticos mientras se corrige el endpoint.
                </div>
              ) : null}
            </div>
          </div>
          <div className="rounded-2xl border border-primary/10 bg-white p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-secondary">Extras</p>
            <div className="flex flex-wrap gap-2">
              <input
                value={newCategoriaNombre}
                onChange={(e) => setNewCategoriaNombre(e.target.value)}
                placeholder="Nombre de nueva categoria"
                className="min-w-[18rem] flex-1 rounded-xl border border-primary/15 px-3 py-2 text-sm outline-none"
              />
              <button
                type="button"
                disabled={!canMutate}
                onClick={() => void submitCategoria()}
                className="inline-flex items-center gap-2 rounded-full bg-[#8B1C1C] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
              >
                <Plus className="h-4 w-4" /> Crear categoria
              </button>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {mergedCategoryNames.map((name) => {
              const existing = extrasCategorias.find((item) => item.nombre === name);
              return (
                <div
                  key={name}
                  className="flex items-center justify-between rounded-2xl border border-primary/10 bg-white px-4 py-3"
                >
                  <span className="text-sm font-medium text-primary">{name}</span>
                  {existing ? (
                    <button
                      type="button"
                      disabled={!canDelete}
                      onClick={() => void removeExtraCategoria(existing._id)}
                      className="inline-flex items-center gap-1 rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-700 disabled:opacity-45"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Eliminar
                    </button>
                  ) : (
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-secondary/70">
                      Preset
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {activeTab === "extras" ? (
        <section className="space-y-5 rounded-3xl border border-white/70 bg-white/85 p-6 shadow-md">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-gray-900">Extras</h2>
            <button
              type="button"
              disabled={!canMutate}
              onClick={() => openCreateModal("extra")}
              className="inline-flex items-center gap-2 rounded-full bg-[#8B1C1C] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              <Plus className="h-4 w-4" /> Nuevo extra
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {(loading ? [] : extras).map((item) => (
              <article
                key={item._id}
                className="group overflow-hidden rounded-2xl border border-primary/10 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-primary/[0.05]">
                  <img
                    src={item.thumbnailUrl || item.imagenUrl || "/images/hero-placeholder.svg"}
                    alt={item.nombre}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                  <span className="absolute right-2 top-2 rounded-full bg-black/65 px-2 py-1 text-[10px] font-semibold text-white">
                    {item.categoria}
                  </span>
                </div>
                <div className="space-y-2 p-4">
                  <p className="text-sm font-semibold text-primary">{item.nombre}</p>
                  <p className="text-xs font-semibold text-[#8B1C1C]">
                    {typeof item.precio === "number" ? `$${item.precio.toLocaleString("es-MX")}` : "Sin precio"}
                  </p>
                  {item.descripcion ? (
                    <p className="line-clamp-2 text-xs text-secondary">{item.descripcion}</p>
                  ) : null}
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      disabled={!canMutate}
                      onClick={() => {
                        setModalKind("extra");
                        setEditingExtraId(item._id);
                        setExtraForm({
                          nombre: item.nombre || "",
                          categoria: item.categoria || "",
                          precio: item.precio != null ? String(item.precio) : "",
                          descripcion: item.descripcion || "",
                          imagenUrl: item.imagenUrl || "",
                          thumbnailUrl: item.thumbnailUrl || "",
                        });
                        setIsModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1 rounded-full border border-primary/20 px-3 py-1.5 text-xs font-semibold text-primary disabled:opacity-45"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Editar
                    </button>
                    <button
                      type="button"
                      disabled={!canDelete}
                      onClick={() => void removeExtra(item._id)}
                      className="inline-flex items-center gap-1 rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 disabled:opacity-45"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Eliminar
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-white/40 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-primary/10 bg-slate-50 px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary">
                  {modalKind === "electro" ? "Electrodomesticos" : "Extras"}
                </p>
                <h3 className="text-lg font-semibold text-primary">
                  {modalKind === "electro"
                    ? editingElectroId
                      ? "Editar electrodomestico"
                      : "Nuevo electrodomestico"
                    : editingExtraId
                      ? "Editar extra"
                      : "Nuevo extra"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-full border border-primary/15 p-2 text-secondary transition hover:bg-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              {modalKind === "electro" ? (
                <>
                  <div className="grid gap-3 md:grid-cols-2">
                    <input
                      value={electroForm.nombre}
                      onChange={(e) => setElectroForm((prev) => ({ ...prev, nombre: e.target.value }))}
                      placeholder="Nombre"
                      className="rounded-xl border border-primary/15 px-3 py-2 text-sm outline-none"
                    />
                    <select
                      value={electroForm.categoria}
                      onChange={(e) => setElectroForm((prev) => ({ ...prev, categoria: e.target.value }))}
                      className="rounded-xl border border-primary/15 px-3 py-2 text-sm outline-none"
                    >
                      <option value="">Selecciona categoria</option>
                      {electroCategoryNames.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                    <input
                      value={electroForm.precio}
                      onChange={(e) => setElectroForm((prev) => ({ ...prev, precio: e.target.value }))}
                      placeholder="Precio"
                      className="rounded-xl border border-primary/15 px-3 py-2 text-sm outline-none"
                    />
                    <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-primary/30 px-3 py-2 text-sm font-semibold text-primary">
                      <ImagePlus className="h-4 w-4" />
                      Subir imagen
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          void handleImageUpload(file, "electro");
                        }}
                      />
                    </label>
                  </div>
                  {electroForm.imagenUrl ? (
                    <div className="overflow-hidden rounded-2xl border border-primary/10 bg-slate-50">
                      <img
                        src={electroForm.thumbnailUrl || electroForm.imagenUrl}
                        alt="Vista previa"
                        className="h-44 w-full object-cover"
                      />
                    </div>
                  ) : null}
                  <textarea
                    value={electroForm.descripcion}
                    onChange={(e) => setElectroForm((prev) => ({ ...prev, descripcion: e.target.value }))}
                    placeholder="Descripcion"
                    rows={4}
                    className="w-full rounded-xl border border-primary/15 px-3 py-2 text-sm outline-none"
                  />
                </>
              ) : (
                <>
                  <div className="grid gap-3 md:grid-cols-2">
                    <input
                      value={extraForm.nombre}
                      onChange={(e) => setExtraForm((prev) => ({ ...prev, nombre: e.target.value }))}
                      placeholder="Nombre"
                      className="rounded-xl border border-primary/15 px-3 py-2 text-sm outline-none"
                    />
                    <select
                      value={extraForm.categoria}
                      onChange={(e) => setExtraForm((prev) => ({ ...prev, categoria: e.target.value }))}
                      className="rounded-xl border border-primary/15 px-3 py-2 text-sm outline-none"
                    >
                      <option value="">Selecciona categoria</option>
                      {mergedCategoryNames.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                    <input
                      value={extraForm.precio}
                      onChange={(e) => setExtraForm((prev) => ({ ...prev, precio: e.target.value }))}
                      placeholder="Precio"
                      className="rounded-xl border border-primary/15 px-3 py-2 text-sm outline-none"
                    />
                    <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-primary/30 px-3 py-2 text-sm font-semibold text-primary">
                      <ImagePlus className="h-4 w-4" />
                      Subir imagen
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          void handleImageUpload(file, "extra");
                        }}
                      />
                    </label>
                  </div>
                  {extraForm.imagenUrl ? (
                    <div className="overflow-hidden rounded-2xl border border-primary/10 bg-slate-50">
                      <img
                        src={extraForm.thumbnailUrl || extraForm.imagenUrl}
                        alt="Vista previa"
                        className="h-44 w-full object-cover"
                      />
                    </div>
                  ) : null}
                  <textarea
                    value={extraForm.descripcion}
                    onChange={(e) => setExtraForm((prev) => ({ ...prev, descripcion: e.target.value }))}
                    placeholder="Descripcion"
                    rows={4}
                    className="w-full rounded-xl border border-primary/15 px-3 py-2 text-sm outline-none"
                  />
                </>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-primary/10 bg-slate-50 px-5 py-4">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-full border border-primary/20 px-4 py-2 text-xs font-semibold text-secondary"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!canMutate || isSubmitting}
                onClick={() => void submitCurrentModal()}
                className="inline-flex items-center gap-2 rounded-full bg-[#8B1C1C] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                {isSubmitting ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
