import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { GUIDES, guideBySlug } from "@/data/guides";
import { JsonLd } from "@/components/shared/JsonLd";
import { breadcrumbSchema, jsonLdGraph } from "@/lib/structured-data";
import { absoluteUrl } from "@/lib/site";

export const dynamicParams = false;
export const generateStaticParams = () => GUIDES.map((g) => ({ slug: g.slug }));

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const g = guideBySlug((await params).slug);
  if (!g) return { title: "Guide not found", robots: { index: false } };
  return {
    title: g.metaTitle,
    description: g.answer.slice(0, 158),
    alternates: { canonical: `/guides/${g.slug}` },
    openGraph: { type: "article", title: g.title, description: g.answer, url: `/guides/${g.slug}`, publishedTime: g.published },
  };
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const g = guideBySlug((await params).slug);
  if (!g) notFound();
  const url = absoluteUrl(`/guides/${g.slug}`);

  const schema = jsonLdGraph(
    {
      "@type": "Article",
      "@id": `${url}#article`,
      headline: g.title,
      description: g.answer,
      datePublished: g.published,
      dateModified: g.published,
      mainEntityOfPage: url,
      author: { "@id": absoluteUrl("/#organization") },
      publisher: { "@id": absoluteUrl("/#organization") },
    },
    breadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Guides", path: "/guides" },
      { name: g.title, path: `/guides/${g.slug}` },
    ])
  );

  return (
    <article className="pb-20 pt-[10rem] lg:pt-[12rem]">
      <JsonLd data={schema} />
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-sm text-gray-500">
          <Link href="/" className="hover:text-emerald">Home</Link>
          <span aria-hidden="true">/</span>
          <Link href="/guides" className="hover:text-emerald">Guides</Link>
        </nav>
        <h1 className="font-heading text-3xl font-black leading-tight tracking-tight text-emerald-700 sm:text-4xl">{g.title}</h1>
        <p className="mt-2 text-sm text-gray-500">
          By PuraVida Natural · {new Date(g.published).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
        </p>

        <p className="mt-6 rounded-2xl border-l-4 border-emerald bg-emerald-50/70 p-5 text-lg leading-relaxed text-gray-800">{g.answer}</p>

        {g.sections.map((s) => (
          <section key={s.heading} className="mt-10">
            <h2 className="font-heading text-2xl font-bold text-gray-900">{s.heading}</h2>
            {s.body.map((p) => (
              <p key={p} className="mt-3 text-[17px] leading-[1.8] text-gray-700">{p}</p>
            ))}
            {s.bullets && (
              <ul className="mt-4 list-disc space-y-2 pl-6 text-[17px] leading-relaxed text-gray-700 marker:text-emerald">
                {s.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            )}
          </section>
        ))}

        <aside className="mt-12 rounded-3xl bg-gradient-to-br from-emerald-700 to-emerald p-7 text-white">
          <h2 className="text-xl font-bold">Need pricing or a specification?</h2>
          <p className="mt-1 text-emerald-100">Tell us the product and quantity. We reply within one business day.</p>
          <Link
            href="/contact#quote"
            className="btn-shine mt-5 inline-flex h-12 items-center gap-2 whitespace-nowrap rounded-xl bg-white px-6 font-bold text-emerald-800 transition-all hover:-translate-y-0.5"
          >
            Request a quote <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </aside>

        {g.related.length > 0 && (
          <div className="mt-10">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">Related</h2>
            <ul className="mt-3 space-y-2">
              {g.related.map((r) => (
                <li key={r.href}>
                  <Link href={r.href} className="font-semibold text-emerald-700 hover:underline">{r.label} →</Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </article>
  );
}
