"use client";

import { useState, useEffect, useRef } from "react";
import { X, Plus, Minus, Upload, ImageIcon, Trash2, Loader2 } from "lucide-react";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const BUCKET = "product-images";

function getImageUrl(path: string) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
}

const QUALITY_BADGES = ["ISO", "GMP", "FSSAI", "Halal", "FDA", "Export"];

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  category_id: string;
  botanical_name: string | null;
  active_ingredient: string | null;
  active_compound: string | null;
  concentration: string | null;
  applications: string[];
  description: string | null;
  image_path: string | null;
  quality_badges: string[];
  is_halal: boolean;
  popularity: number;
}

interface ProductModalProps {
  product: Product | null;
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
}

function slugify(str: string) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export default function ProductModal({
  product,
  categories,
  onClose,
  onSaved,
}: ProductModalProps) {
  const isEditing = !!product;

  const [form, setForm] = useState({
    name: product?.name ?? "",
    slug: product?.slug ?? "",
    category_id: product?.category_id ?? "",
    botanical_name: product?.botanical_name ?? "",
    active_ingredient: product?.active_ingredient ?? "",
    active_compound: product?.active_compound ?? "",
    concentration: product?.concentration ?? "",
    description: product?.description ?? "",
    image_path: product?.image_path ?? "",
    is_halal: product?.is_halal ?? false,
    popularity: product?.popularity ?? 50,
    applications: product?.applications ?? [],
    quality_badges: product?.quality_badges ?? [],
  });

  const [applicationInput, setApplicationInput] = useState("");
  const [slugManual, setSlugManual] = useState(isEditing);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-generate slug from name
  useEffect(() => {
    if (!slugManual && form.name) {
      setForm((f) => ({ ...f, slug: slugify(f.name) }));
    }
  }, [form.name, slugManual]);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function addApplication() {
    const val = applicationInput.trim();
    if (val && !form.applications.includes(val)) {
      update("applications", [...form.applications, val]);
      setApplicationInput("");
    }
  }

  function removeApplication(app: string) {
    update(
      "applications",
      form.applications.filter((a) => a !== app)
    );
  }

  function toggleBadge(badge: string) {
    if (form.quality_badges.includes(badge)) {
      update("quality_badges", form.quality_badges.filter((b) => b !== badge));
    } else {
      update("quality_badges", [...form.quality_badges, badge]);
    }
  }

  async function handleImageUpload(file: File) {
    setIsUploading(true);
    setUploadError(null);

    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch("/api/admin/upload-image", {
        method: "POST",
        body: fd,
      });

      const json = await res.json();
      if (!res.ok) {
        setUploadError(json.error ?? "Upload failed");
        return;
      }

      update("image_path", json.path);
    } catch {
      setUploadError("Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleImageUpload(file);
    // Reset so same file can be re-selected
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleImageUpload(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSaving(true);

    try {
      const url = isEditing
        ? `/api/admin/products/${product.id}`
        : "/api/admin/products";
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          popularity: Number(form.popularity),
          applications: form.applications,
          quality_badges: form.quality_badges,
          botanical_name: form.botanical_name || null,
          active_ingredient: form.active_ingredient || null,
          active_compound: form.active_compound || null,
          concentration: form.concentration || null,
          description: form.description || null,
          image_path: form.image_path || null,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to save product");
        return;
      }

      onSaved();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-end">
      <div className="h-full w-full max-w-2xl bg-zinc-900 border-l border-zinc-800 flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 flex-shrink-0">
          <div>
            <h2 className="text-white font-heading font-semibold text-lg">
              {isEditing ? "Edit Product" : "Add Product"}
            </h2>
            <p className="text-zinc-500 text-xs mt-0.5">
              {isEditing ? product.name : "Create a new catalog entry"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form
          id="product-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-6 py-5 space-y-5"
        >
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl p-3">
              {error}
            </div>
          )}

          {/* Name + Slug */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-zinc-300 text-sm font-medium mb-1.5">
                Name <span className="text-red-400">*</span>
              </label>
              <input
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                required
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                placeholder="e.g. Turmeric Extract"
              />
            </div>
            <div>
              <label className="block text-zinc-300 text-sm font-medium mb-1.5">
                Slug <span className="text-red-400">*</span>
              </label>
              <input
                value={form.slug}
                onChange={(e) => {
                  setSlugManual(true);
                  update("slug", e.target.value);
                }}
                required
                className="w-full bg-zinc-800 border border-zinc-700 text-white font-mono rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                placeholder="auto-generated"
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-zinc-300 text-sm font-medium mb-1.5">
              Category <span className="text-red-400">*</span>
            </label>
            <select
              value={form.category_id}
              onChange={(e) => update("category_id", e.target.value)}
              required
              className="w-full bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            >
              <option value="">Select a category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Scientific Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-zinc-300 text-sm font-medium mb-1.5">
                Botanical Name
              </label>
              <input
                value={form.botanical_name}
                onChange={(e) => update("botanical_name", e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-3 py-2 text-sm italic focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                placeholder="e.g. Curcuma longa"
              />
            </div>
            <div>
              <label className="block text-zinc-300 text-sm font-medium mb-1.5">
                Active Ingredient
              </label>
              <input
                value={form.active_ingredient}
                onChange={(e) => update("active_ingredient", e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                placeholder="e.g. Curcumin"
              />
            </div>
            <div>
              <label className="block text-zinc-300 text-sm font-medium mb-1.5">
                Active Compound
              </label>
              <input
                value={form.active_compound}
                onChange={(e) => update("active_compound", e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                placeholder="e.g. Curcuminoids"
              />
            </div>
            <div>
              <label className="block text-zinc-300 text-sm font-medium mb-1.5">
                Concentration
              </label>
              <input
                value={form.concentration}
                onChange={(e) => update("concentration", e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                placeholder="e.g. 95%"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-zinc-300 text-sm font-medium mb-1.5">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              rows={3}
              className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none"
              placeholder="Product description..."
            />
          </div>

          {/* Applications */}
          <div>
            <label className="block text-zinc-300 text-sm font-medium mb-1.5">
              Applications
            </label>
            <div className="flex gap-2 mb-2">
              <input
                value={applicationInput}
                onChange={(e) => setApplicationInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addApplication();
                  }
                }}
                className="flex-1 bg-zinc-800 border border-zinc-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                placeholder="Type and press Enter or +"
              />
              <button
                type="button"
                onClick={addApplication}
                className="p-2 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded-xl transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {form.applications.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {form.applications.map((app) => (
                  <span
                    key={app}
                    className="flex items-center gap-1.5 bg-zinc-800 text-zinc-300 text-xs px-2.5 py-1 rounded-full"
                  >
                    {app}
                    <button
                      type="button"
                      onClick={() => removeApplication(app)}
                      className="text-zinc-500 hover:text-red-400 transition-colors"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Quality Badges */}
          <div>
            <label className="block text-zinc-300 text-sm font-medium mb-2">
              Quality Badges
            </label>
            <div className="flex flex-wrap gap-2">
              {QUALITY_BADGES.map((badge) => (
                <button
                  key={badge}
                  type="button"
                  onClick={() => toggleBadge(badge)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    form.quality_badges.includes(badge)
                      ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                      : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600"
                  }`}
                >
                  {badge}
                </button>
              ))}
            </div>
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-zinc-300 text-sm font-medium mb-1.5">
              Product Image
            </label>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
              onChange={handleFileChange}
              className="hidden"
            />

            {form.image_path ? (
              /* ── Image preview ── */
              <div className="relative rounded-xl overflow-hidden border border-zinc-700 bg-zinc-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getImageUrl(form.image_path) ?? ""}
                  alt="Product preview"
                  className="w-full h-48 object-contain bg-zinc-900"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
                <div className="absolute inset-0 bg-black/0 hover:bg-black/40 transition-colors group flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 bg-white/90 text-zinc-900 text-xs font-semibold px-3 py-1.5 rounded-lg transition-opacity"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Replace
                  </button>
                  <button
                    type="button"
                    onClick={() => update("image_path", "")}
                    className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 bg-red-500/90 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Remove
                  </button>
                </div>
                <div className="px-3 py-2 border-t border-zinc-700 bg-zinc-800">
                  <p className="text-zinc-400 text-xs font-mono truncate">{form.image_path}</p>
                </div>
              </div>
            ) : (
              /* ── Drop zone ── */
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => !isUploading && fileInputRef.current?.click()}
                className={`
                  relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed
                  cursor-pointer transition-all py-10 px-6 text-center
                  ${dragOver
                    ? "border-emerald-500 bg-emerald-500/10"
                    : "border-zinc-700 bg-zinc-800/50 hover:border-zinc-600 hover:bg-zinc-800"
                  }
                `}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
                    <p className="text-zinc-400 text-sm">Uploading…</p>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-full bg-zinc-700 flex items-center justify-center">
                      <ImageIcon className="w-5 h-5 text-zinc-400" />
                    </div>
                    <div>
                      <p className="text-zinc-300 text-sm font-medium">
                        Drop image here or{" "}
                        <span className="text-emerald-400 underline underline-offset-2">browse</span>
                      </p>
                      <p className="text-zinc-600 text-xs mt-0.5">JPG, PNG, WebP · max 5 MB</p>
                    </div>
                  </>
                )}
              </div>
            )}

            {uploadError && (
              <p className="mt-1.5 text-red-400 text-xs">{uploadError}</p>
            )}
          </div>

          {/* Popularity */}
          <div>
            <label className="block text-zinc-300 text-sm font-medium mb-1.5">
              Popularity (0–100)
            </label>
            <input
              type="number"
              min={0}
              max={100}
              value={form.popularity}
              onChange={(e) => update("popularity", Number(e.target.value))}
              className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>

          {/* Is Halal toggle */}
          <div className="flex items-center justify-between bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3">
            <div>
              <p className="text-zinc-200 text-sm font-medium">Halal Certified</p>
              <p className="text-zinc-500 text-xs">
                Mark this product as Halal certified
              </p>
            </div>
            <button
              type="button"
              onClick={() => update("is_halal", !form.is_halal)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                form.is_halal ? "bg-emerald-500" : "bg-zinc-700"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  form.is_halal ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </form>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-zinc-800 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium rounded-xl py-2.5 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="product-form"
            disabled={isSaving || isUploading}
            className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-semibold rounded-xl py-2.5 transition-colors flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving…
              </>
            ) : isUploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Uploading…
              </>
            ) : isEditing ? (
              "Save Changes"
            ) : (
              "Create Product"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
