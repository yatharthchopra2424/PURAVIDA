import Link from "next/link";
import { SearchX, Leaf, Droplets, FlaskConical, Pill, BookOpen, ArrowRight } from "lucide-react";

export const metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

const ROUTES = [
  { href: "/products/herbal-extracts", label: "Herbal extracts", icon: Leaf },
  { href: "/products/essential-oils", label: "Essential oils", icon: Droplets },
  { href: "/products/nutraceuticals", label: "Nutraceuticals", icon: Pill },
  { href: "/products/oleoresins", label: "Oleoresins", icon: FlaskConical },
  { href: "/guides", label: "Buyer guides", icon: BookOpen },
];

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 pb-20 pt-[11rem] lg:pt-[13rem]">
      <div className="mx-auto max-w-xl text-center">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50">
          <SearchX className="h-6 w-6 text-emerald" />
        </div>
        <p className="text-sm font-semibold uppercase tracking-wider text-emerald">404</p>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">We couldn&apos;t find that page</h1>
        <p className="mt-3 text-base leading-relaxed text-gray-600">
          The page may have moved, or the product isn&apos;t listed under that name. Try one of these, or press{" "}
          <kbd className="rounded border border-gray-300 bg-gray-50 px-1.5 py-0.5 text-xs">Ctrl</kbd>+
          <kbd className="rounded border border-gray-300 bg-gray-50 px-1.5 py-0.5 text-xs">K</kbd> to search every product.
        </p>

        <ul className="mt-8 grid grid-cols-2 gap-3 text-left sm:grid-cols-3">
          {ROUTES.map((r) => (
            <li key={r.href}>
              <Link
                href={r.href}
                className="group flex h-full items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 text-sm font-semibold text-gray-800 transition-all hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald/10"
              >
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald">
                  <r.icon className="h-4 w-4" aria-hidden="true" />
                </span>
                {r.label}
              </Link>
            </li>
          ))}
        </ul>

        <Link
          href="/contact#quote"
          className="btn-shine group mt-8 inline-flex h-12 items-center gap-2 whitespace-nowrap rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-6 font-bold text-white shadow-lg shadow-orange-500/25 transition-all hover:-translate-y-0.5"
        >
          Ask our team for a quote
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
