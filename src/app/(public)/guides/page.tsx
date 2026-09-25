import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { GUIDES } from "@/data/guides";

export const metadata: Metadata = {
  title: "Buyer Guides: Herbal Extracts & Oleoresins",
  description:
    "Plain-language guides for buyers of herbal extracts, essential oils and oleoresins: reading a COA, extract grades, and the documents needed to import from India.",
  alternates: { canonical: "/guides" },
};

export default function GuidesIndex() {
  return (
    <div className="pb-20 pt-[10rem] lg:pt-[12rem]">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <span className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.2em] text-orange-500">
          <BookOpen className="h-4 w-4" aria-hidden="true" /> Buyer guides
        </span>
        <h1 className="mt-3 font-heading text-4xl font-black tracking-tight text-emerald-700 sm:text-5xl">
          Buying botanical ingredients, explained
        </h1>
        <p className="mt-4 text-lg text-gray-600">
          Short, factual answers to the questions purchasing managers and formulators ask before ordering.
        </p>
        <ul className="mt-10 space-y-4">
          {GUIDES.map((g) => (
            <li key={g.slug}>
              <Link
                href={`/guides/${g.slug}`}
                className="group block rounded-2xl border border-gray-100 bg-white p-6 transition-all hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald/5"
              >
                <h2 className="text-xl font-bold text-gray-900 group-hover:text-emerald-700">{g.title}</h2>
                <p className="mt-2 text-[15px] leading-relaxed text-gray-600">{g.answer}</p>
                <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
                  Read the guide <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
