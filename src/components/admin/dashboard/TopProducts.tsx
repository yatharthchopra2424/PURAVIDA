import Link from "next/link";


interface TopProduct {
  id: string;
  name: string;
  slug: string;
  category: string | null;
  popularity: number;
}

export function TopProducts({ products }: { products: TopProduct[] }) {
  const maxPopularity = Math.max(...products.map((p) => p.popularity), 1);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white font-heading font-semibold text-base">
          Top Products
        </h2>
        <Link
          href="/x-admin/products"
          className="text-emerald-400 text-xs hover:text-emerald-300 transition-colors"
        >
          Manage →
        </Link>
      </div>

      {products.length === 0 ? (
        <p className="text-zinc-500 text-sm text-center py-8">
          No products found
        </p>
      ) : (
        <div className="space-y-3">
          {products.map((product, idx) => (
            <div key={product.id} className="flex items-center gap-3">
              <span className="text-zinc-600 text-xs w-4 text-right flex-shrink-0">
                {idx + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-zinc-200 text-sm truncate">
                    {product.name}
                  </span>
                  <span className="text-zinc-500 text-xs ml-2 flex-shrink-0">
                    {product.popularity}
                  </span>
                </div>
                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500/70 rounded-full transition-all"
                    style={{
                      width: `${(product.popularity / maxPopularity) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
