import Link from "next/link";
import { FileText, Send } from "lucide-react";
import type { Product } from "@/types";
import { buildFaq, buildSpecRows } from "@/lib/product-content";

/**
 * Specification table and buyer FAQ under the product hero. Server
 * component: the text is in the HTML for crawlers and AI engines, and the
 * FAQ uses <details> so it needs no JavaScript.
 */
export function ProductInsights({ product }: { product: Product }) {
  const rows = buildSpecRows(product);
  const faq = buildFaq(product);
  return (
    <section aria-label={`${product.name} specification and FAQ`} className="bg-white pt-16 pb-16 lg:pt-20 lg:pb-24">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <h2 className="mb-4 flex items-center gap-2 font-heading text-xl font-bold text-gray-900">
            <FileText className="h-5 w-5 text-emerald" aria-hidden="true" /> Specification
          </h2>
          <table className="w-full overflow-hidden rounded-2xl border border-gray-100 text-sm">
            <tbody className="divide-y divide-gray-100">
              {rows.map((r) => (
                <tr key={r.label} className="align-top">
                  <th scope="row" className="w-2/5 bg-gray-50 px-4 py-3 text-left font-semibold text-gray-700">
                    {r.label}
                  </th>
                  <td className="px-4 py-3 text-gray-900">{r.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {product.category.toLowerCase().includes("oleoresin") && (
            <p className="mt-4 text-sm text-gray-600">
              Need it as a free-flowing powder for dry blends?{" "}
              <Link href="/encapsulated-oleoresins" className="font-semibold text-emerald-700 hover:underline">
                See encapsulated oleoresins →
              </Link>
            </p>
          )}
          <Link
            href="/contact#quote"
            className="btn-shine mt-5 inline-flex h-12 items-center gap-2 whitespace-nowrap rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-6 font-bold text-white shadow-lg shadow-orange-500/25 transition-all hover:-translate-y-0.5"
          >
            Request a quote for {product.name} <Send className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        <div>
          <h2 className="mb-4 font-heading text-xl font-bold text-gray-900">Questions buyers ask</h2>
          <div className="space-y-3">
            {faq.map((f) => (
              <details key={f.q} className="group rounded-2xl border border-gray-200 bg-white p-4 open:shadow-sm">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-gray-900">
                  {f.q}
                  <span className="text-xl leading-none text-emerald transition-transform group-open:rotate-45" aria-hidden="true">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-gray-600">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
