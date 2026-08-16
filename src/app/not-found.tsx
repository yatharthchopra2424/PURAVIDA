import Link from "next/link";
import { SearchX } from "lucide-react";

export const metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 pb-20 pt-[11rem] lg:pt-[13rem]">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50">
          <SearchX className="h-6 w-6 text-emerald" />
        </div>

        <p className="text-sm font-semibold uppercase tracking-wider text-emerald">
          404
        </p>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">
          We couldn&apos;t find that page
        </h1>
        <p className="mt-3 text-base leading-relaxed text-gray-600">
          The page may have moved, or the product you&apos;re looking for is no
          longer listed under that name.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/products"
            className="inline-flex items-center rounded-xl bg-emerald px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
          >
            Browse all products
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
          >
            Ask our team
          </Link>
        </div>
      </div>
    </div>
  );
}
