"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Tag, AlertTriangle } from "lucide-react";
import CategoryModal from "./CategoryModal";

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

export default function CategoriesClient({
  initialCategories,
}: {
  initialCategories: Category[];
}) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function refetch() {
    const res = await fetch("/api/admin/categories");
    const json = await res.json();
    setCategories(json.data ?? []);
  }

  async function handleDelete(id: string) {
    setIsDeleting(true);
    try {
      await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
      await refetch();
      setDeleteConfirm(null);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-white">
            Categories
          </h1>
          <p className="text-zinc-400 text-sm mt-0.5">
            {categories.length} categories
          </p>
        </div>
        <button
          onClick={() => {
            setEditingCategory(null);
            setModalOpen(true);
          }}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Category
        </button>
      </div>

      {/* Categories grid */}
      {categories.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col items-center justify-center py-20 gap-3">
          <Tag className="w-10 h-10 text-zinc-700" />
          <p className="text-zinc-500">No categories yet</p>
          <button
            onClick={() => setModalOpen(true)}
            className="text-emerald-400 text-sm hover:text-emerald-300 transition-colors"
          >
            Add your first category →
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col gap-3 hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="w-9 h-9 bg-emerald-500/15 rounded-xl flex items-center justify-center">
                  <Tag className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      setEditingCategory(cat);
                      setModalOpen(true);
                    }}
                    className="p-1.5 text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(cat.id)}
                    className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-white font-semibold text-sm">{cat.name}</h3>
                {cat.label && (
                  <p className="text-zinc-500 text-xs mt-0.5">{cat.label}</p>
                )}
              </div>

              {cat.description && (
                <p className="text-zinc-500 text-xs line-clamp-2">
                  {cat.description}
                </p>
              )}

              <div className="flex items-center justify-between pt-1 border-t border-zinc-800">
                <span className="text-zinc-600 text-xs font-mono">{cat.slug}</span>
                <span className="text-emerald-400 text-xs font-medium">
                  {cat.product_count} products
                </span>
              </div>

              {cat.subcategories?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {cat.subcategories.slice(0, 3).map((sub) => (
                    <span
                      key={sub}
                      className="bg-zinc-800 text-zinc-400 text-xs px-2 py-0.5 rounded-md"
                    >
                      {sub}
                    </span>
                  ))}
                  {cat.subcategories.length > 3 && (
                    <span className="text-zinc-600 text-xs">
                      +{cat.subcategories.length - 3} more
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <CategoryModal
          category={editingCategory}
          onClose={() => {
            setModalOpen(false);
            setEditingCategory(null);
          }}
          onSaved={() => {
            setModalOpen(false);
            setEditingCategory(null);
            refetch();
          }}
        />
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-500/15 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-white font-semibold">Delete Category</p>
                <p className="text-zinc-400 text-sm">
                  Products in this category may be affected.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium rounded-xl py-2.5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={isDeleting}
                className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-semibold rounded-xl py-2.5 transition-colors"
              >
                {isDeleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
