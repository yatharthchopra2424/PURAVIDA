"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Package,
  AlertTriangle,
} from "lucide-react";
import ProductModal from "./ProductModal";

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
  product_categories?: { id: string; name: string; slug: string }[] | { id: string; name: string; slug: string } | null;
}

interface ProductsClientProps {
  initialProducts: Product[];
  categories: Category[];
}

const BADGE_COLORS: Record<string, string> = {
  ISO: "bg-blue-500/15 text-blue-300",
  GMP: "bg-emerald-500/15 text-emerald-300",
  FSSAI: "bg-purple-500/15 text-purple-300",
  Halal: "bg-green-500/15 text-green-300",
  FDA: "bg-red-500/15 text-red-300",
  Export: "bg-orange-500/15 text-orange-300",
};

export default function ProductsClient({
  initialProducts,
  categories,
}: ProductsClientProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [totalProducts, setTotalProducts] = useState(initialProducts.length);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchProducts = useCallback(
    async (p = page, s = search, cat = categoryFilter) => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(p),
          limit: "25",
          search: s,
          category: cat,
        });
        const res = await fetch(`/api/admin/products?${params}`);
        const json = await res.json();
        setProducts(json.data ?? []);
        setTotalProducts(json.total ?? 0);
        setTotalPages(json.totalPages ?? 1);
      } finally {
        setIsLoading(false);
      }
    },
    [page, search, categoryFilter]
  );

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      fetchProducts(1, search, categoryFilter);
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, categoryFilter]);

  async function handleDelete(id: string) {
    setIsDeleting(true);
    try {
      await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
      await fetchProducts();
      setDeleteConfirm(null);
    } finally {
      setIsDeleting(false);
    }
  }

  function handleSaved() {
    setModalOpen(false);
    setEditingProduct(null);
    fetchProducts();
  }

  function openAdd() {
    setEditingProduct(null);
    setModalOpen(true);
  }

  function openEdit(product: Product) {
    setEditingProduct(product);
    setModalOpen(true);
  }

  return (
    <div className="space-y-5 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-white">
            Products
          </h1>
          <p className="text-zinc-400 text-sm mt-0.5">
            {totalProducts.toLocaleString()} total products
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Product
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
            className="w-full bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 min-w-[180px]"
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-zinc-700 border-t-emerald-500 rounded-full animate-spin" />
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Package className="w-10 h-10 text-zinc-700" />
            <p className="text-zinc-500">No products found</p>
            <button
              onClick={openAdd}
              className="text-emerald-400 text-sm hover:text-emerald-300 transition-colors"
            >
              Add your first product →
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left px-4 py-3 text-zinc-400 text-xs font-medium uppercase tracking-wider">
                    Name
                  </th>
                  <th className="text-left px-4 py-3 text-zinc-400 text-xs font-medium uppercase tracking-wider hidden md:table-cell">
                    Category
                  </th>
                  <th className="text-left px-4 py-3 text-zinc-400 text-xs font-medium uppercase tracking-wider hidden lg:table-cell">
                    Slug
                  </th>
                  <th className="text-left px-4 py-3 text-zinc-400 text-xs font-medium uppercase tracking-wider hidden xl:table-cell">
                    Badges
                  </th>
                  <th className="text-right px-4 py-3 text-zinc-400 text-xs font-medium uppercase tracking-wider hidden sm:table-cell">
                    Popularity
                  </th>
                  <th className="text-right px-4 py-3 text-zinc-400 text-xs font-medium uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {products.map((product) => (
                  <tr
                    key={product.id}
                    className="hover:bg-zinc-800/30 transition-colors group"
                  >
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-zinc-100 text-sm font-medium truncate max-w-[200px]">
                          {product.name}
                        </p>
                        {product.botanical_name && (
                          <p className="text-zinc-600 text-xs italic truncate max-w-[200px]">
                            {product.botanical_name}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-zinc-400 text-sm">
                        {Array.isArray(product.product_categories)
                          ? (product.product_categories[0] as { name: string } | undefined)?.name ?? "—"
                          : (product.product_categories as { name: string } | null)?.name ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-zinc-600 text-xs font-mono">
                        {product.slug}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {(product.quality_badges ?? [])
                          .slice(0, 3)
                          .map((badge) => (
                            <span
                              key={badge}
                              className={`text-xs px-1.5 py-0.5 rounded-md font-medium ${BADGE_COLORS[badge] ?? "bg-zinc-700 text-zinc-300"}`}
                            >
                              {badge}
                            </span>
                          ))}
                        {(product.quality_badges ?? []).length > 3 && (
                          <span className="text-xs text-zinc-600">
                            +{product.quality_badges.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right hidden sm:table-cell">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500/60 rounded-full"
                            style={{ width: `${Math.min(product.popularity, 100)}%` }}
                          />
                        </div>
                        <span className="text-zinc-500 text-xs w-6 text-right">
                          {product.popularity}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(product)}
                          className="p-1.5 text-zinc-500 hover:text-zinc-100 hover:bg-zinc-700 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(product.id)}
                          className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800">
            <p className="text-zinc-500 text-sm">
              Page {page} of {totalPages} &nbsp;·&nbsp;{" "}
              {totalProducts.toLocaleString()} products
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  setPage(1);
                  fetchProducts(1);
                }}
                disabled={page === 1}
                className="p-1.5 text-zinc-500 hover:text-zinc-100 disabled:opacity-30 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setPage(page - 1);
                  fetchProducts(page - 1);
                }}
                disabled={page === 1}
                className="p-1.5 text-zinc-500 hover:text-zinc-100 disabled:opacity-30 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setPage(page + 1);
                  fetchProducts(page + 1);
                }}
                disabled={page === totalPages}
                className="p-1.5 text-zinc-500 hover:text-zinc-100 disabled:opacity-30 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setPage(totalPages);
                  fetchProducts(totalPages);
                }}
                disabled={page === totalPages}
                className="p-1.5 text-zinc-500 hover:text-zinc-100 disabled:opacity-30 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Product Modal */}
      {modalOpen && (
        <ProductModal
          product={editingProduct}
          categories={categories}
          onClose={() => {
            setModalOpen(false);
            setEditingProduct(null);
          }}
          onSaved={handleSaved}
        />
      )}

      {/* Delete Confirm Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-500/15 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-white font-semibold">Delete Product</p>
                <p className="text-zinc-400 text-sm">
                  This action cannot be undone.
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
