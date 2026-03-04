"use client";

import { useState, useEffect } from "react";
import { X, Plus, Minus } from "lucide-react";

interface Category {
  id: string;
  name: string;
  slug: string;
  label: string | null;
  description: string | null;
  image: string | null;
  subcategories: string[];
  example_products: string[];
  product_count: number;
}

interface CategoryModalProps {
  category: Category | null;
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

export default function CategoryModal({
  category,
  onClose,
  onSaved,
}: CategoryModalProps) {
  const isEditing = !!category;

  const [form, setForm] = useState({
    name: category?.name ?? "",
    slug: category?.slug ?? "",
    label: category?.label ?? "",
    description: category?.description ?? "",
    image: category?.image ?? "",
    subcategories: category?.subcategories ?? [],
    example_products: category?.example_products ?? [],
  });

  const [subInput, setSubInput] = useState("");
  const [exampleInput, setExampleInput] = useState("");
  const [slugManual, setSlugManual] = useState(isEditing);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slugManual && form.name) {
      setForm((f) => ({ ...f, slug: slugify(f.name) }));
    }
  }, [form.name, slugManual]);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function addTag(field: "subcategories" | "example_products", val: string) {
    if (val.trim() && !form[field].includes(val.trim())) {
      update(field, [...form[field], val.trim()]);
    }
  }

  function removeTag(field: "subcategories" | "example_products", val: string) {
    update(field, form[field].filter((t) => t !== val));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSaving(true);

    try {
      const url = isEditing
        ? `/api/admin/categories/${category.id}`
        : "/api/admin/categories";
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          label: form.label || null,
          description: form.description || null,
          image: form.image || null,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to save category");
        return;
      }

      onSaved();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-end">
      <div className="h-full w-full max-w-lg bg-zinc-900 border-l border-zinc-800 flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 flex-shrink-0">
          <div>
            <h2 className="text-white font-heading font-semibold text-lg">
              {isEditing ? "Edit Category" : "Add Category"}
            </h2>
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
          id="category-form"
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
              />
            </div>
          </div>

          {/* Label */}
          <div>
            <label className="block text-zinc-300 text-sm font-medium mb-1.5">
              Label / Tagline
            </label>
            <input
              value={form.label}
              onChange={(e) => update("label", e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              placeholder="e.g. Premium Botanical Extracts"
            />
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
            />
          </div>

          {/* Image */}
          <div>
            <label className="block text-zinc-300 text-sm font-medium mb-1.5">
              Image Path / URL
            </label>
            <input
              value={form.image}
              onChange={(e) => update("image", e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 text-white font-mono rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              placeholder="categories/image.jpg"
            />
          </div>

          {/* Subcategories */}
          <div>
            <label className="block text-zinc-300 text-sm font-medium mb-1.5">
              Subcategories
            </label>
            <div className="flex gap-2 mb-2">
              <input
                value={subInput}
                onChange={(e) => setSubInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag("subcategories", subInput);
                    setSubInput("");
                  }
                }}
                className="flex-1 bg-zinc-800 border border-zinc-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                placeholder="Add subcategory..."
              />
              <button
                type="button"
                onClick={() => {
                  addTag("subcategories", subInput);
                  setSubInput("");
                }}
                className="p-2 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded-xl transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {form.subcategories.map((sub) => (
                <span
                  key={sub}
                  className="flex items-center gap-1.5 bg-zinc-800 text-zinc-300 text-xs px-2.5 py-1 rounded-full"
                >
                  {sub}
                  <button
                    type="button"
                    onClick={() => removeTag("subcategories", sub)}
                    className="text-zinc-500 hover:text-red-400 transition-colors"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Example Products */}
          <div>
            <label className="block text-zinc-300 text-sm font-medium mb-1.5">
              Example Products
            </label>
            <div className="flex gap-2 mb-2">
              <input
                value={exampleInput}
                onChange={(e) => setExampleInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag("example_products", exampleInput);
                    setExampleInput("");
                  }
                }}
                className="flex-1 bg-zinc-800 border border-zinc-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                placeholder="Add example product..."
              />
              <button
                type="button"
                onClick={() => {
                  addTag("example_products", exampleInput);
                  setExampleInput("");
                }}
                className="p-2 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded-xl transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {form.example_products.map((ep) => (
                <span
                  key={ep}
                  className="flex items-center gap-1.5 bg-zinc-800 text-zinc-300 text-xs px-2.5 py-1 rounded-full"
                >
                  {ep}
                  <button
                    type="button"
                    onClick={() => removeTag("example_products", ep)}
                    className="text-zinc-500 hover:text-red-400 transition-colors"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
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
            form="category-form"
            disabled={isSaving}
            className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-semibold rounded-xl py-2.5 transition-colors flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving…
              </>
            ) : isEditing ? (
              "Save Changes"
            ) : (
              "Create Category"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
