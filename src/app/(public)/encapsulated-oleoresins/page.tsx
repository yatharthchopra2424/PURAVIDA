import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Droplets, Layers, Wind, Scale, FlaskConical, Boxes } from "lucide-react";
import { JsonLd } from "@/components/shared/JsonLd";
import { breadcrumbSchema, jsonLdGraph } from "@/lib/structured-data";
import { fetchProductsByCategory } from "@/lib/catalog";
import { absoluteUrl } from "@/lib/site";
import { COMPANY } from "@/lib/constants";

export const revalidate = 3600;

const PATH = "/encapsulated-oleoresins";

export const metadata: Metadata = {
  title: "Encapsulated Oleoresins: Supplier in India",
  description:
    "Free-flowing encapsulated oleoresins from New Delhi: hing, black pepper, capsicum, ginger, turmeric and more, for masala, seasoning and tea blends. Bulk and export.",
  alternates: { canonical: PATH },
  openGraph: {
    title: "Encapsulated Oleoresins: Manufacturer & Supplier, India",
    description: "Free-flowing, dose-ready oleoresin powders for masala, seasoning, tea and food blends. Bulk and export.",
    url: PATH,
  },
};

const BENEFITS = [
  { icon: Droplets, title: "Easy to dose", body: "Raw oleoresin is a thick, sticky liquid that clings to vessels. On a carrier it becomes a free-flowing powder you can weigh and blend like any dry ingredient." },
  { icon: Layers, title: "Even dispersion", body: "Flavour and pungency spread uniformly through a dry mix, so every pack of masala or seasoning tastes the same." },
  { icon: Wind, title: "Protected from air", body: "Fixing the oleoresin on a carrier limits its exposure to oxygen, which helps flavour and colour last." },
  { icon: Scale, title: "Standardised strength", body: "Loading is set per specification, so the strength you buy this month matches the next order." },
];

const FAQ: [string, string][] = [
  [
    "What is an encapsulated oleoresin?",
    "An oleoresin is the concentrated extract of a spice or herb, containing both its volatile oil (aroma) and its resin (pungency and colour). \"Encapsulated\" means that extract has been fixed onto a food-grade carrier, giving a dry, free-flowing powder instead of a viscous liquid.",
  ],
  [
    "What is the difference between an oleoresin, an essential oil and an encapsulated oleoresin?",
    "An essential oil is only the volatile fraction, usually steam-distilled. An oleoresin is solvent-extracted and carries the resin as well, so it is stronger and closer to the whole spice. An encapsulated oleoresin is the same oleoresin in powder form on a carrier, which is easier to handle in dry blends.",
  ],
  [
    "Which encapsulated oleoresins can you supply?",
    "Our catalogue lists oleoresins of black pepper, white pepper, capsicum, paprika, ginger, turmeric, cumin, clove, cinnamon, coriander, fennel, dill seed, garlic, onion, nutmeg, mace, coffee and hing (asafoetida), and we can discuss encapsulating them for your blend. Tell us the spice and the end use in the quote form.",
  ],
  [
    "Can you make a tea masala or other custom blend?",
    "Yes, tell us the product, the target flavour profile and the volumes, and we will confirm what we can supply and on what terms.",
  ],
  [
    "What carrier and loading do you use?",
    "The carrier and the oleoresin loading are agreed per specification, because they depend on the spice, the application and your market's food rules. Send your requirement and we reply with the proposed specification.",
  ],
  [
    "What are the MOQ, packing and lead time?",
    "They depend on the product and the quantity, so we confirm them in writing in your quote. We reply within one business day.",
  ],
  [
    "Do you export encapsulated oleoresins?",
    `Yes. ${COMPANY.legalName} supplies buyers in India and exports overseas from New Delhi. Please tell us the destination country so we can advise on the documents required.`,
  ],
  [
    "Can I get a certificate of analysis?",
    "A certificate of analysis is available on request. Please confirm that the specification meets the food regulations of your own market before use.",
  ],
];

export default async function EncapsulatedOleoresinsPage() {
  let oleoresins: Awaited<ReturnType<typeof fetchProductsByCategory>> = [];
  try {
    oleoresins = await fetchProductsByCategory("oleoresins");
  } catch {
    /* catalogue unreachable: the rest of the page still renders */
  }
  const url = absoluteUrl(PATH);

  const schema = jsonLdGraph(
    {
      "@type": "WebPage",
      "@id": `${url}#page`,
      name: "Encapsulated oleoresins: manufacturer & supplier, India",
      url,
      about: { "@type": "Thing", name: "Encapsulated oleoresins" },
      publisher: { "@id": absoluteUrl("/#organization") },
    },
    {
      "@type": "ItemList",
      name: "Oleoresins available for encapsulation",
      itemListElement: oleoresins.map((p, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: p.name,
        url: absoluteUrl(`/products/${p.categorySlug}/${p.slug}`),
      })),
    },
    {
      "@type": "FAQPage",
      mainEntity: FAQ.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
    },
    breadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Oleoresins", path: "/products/oleoresins" },
      { name: "Encapsulated oleoresins", path: PATH },
    ])
  );

  return (
    <>
      <JsonLd data={schema} />

      <section className="relative overflow-hidden bg-gradient-to-b from-emerald-50/70 via-white to-white pb-14 pt-[10rem] lg:pb-20 lg:pt-[12.5rem]">
        <div aria-hidden="true" className="pointer-events-none absolute -right-32 top-24 h-[26rem] w-[26rem] rounded-full bg-amber-100/60 blur-3xl" />
        <div className="relative mx-auto max-w-5xl px-4 sm:px-6">
          <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-sm text-gray-500">
            <Link href="/" className="hover:text-emerald">Home</Link>
            <span aria-hidden="true">/</span>
            <Link href="/products/oleoresins" className="hover:text-emerald">Oleoresins</Link>
            <span aria-hidden="true">/</span>
            <span className="text-gray-900">Encapsulated</span>
          </nav>
          <span className="text-xs font-extrabold uppercase tracking-[0.2em] text-orange-500">Oleoresins in powder form</span>
          <h1 className="mt-3 font-heading text-4xl font-black leading-[1.05] tracking-tight text-emerald-700 sm:text-6xl">
            Encapsulated oleoresins: manufacturer &amp; supplier, India
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-relaxed text-gray-600">
            Spice and herb oleoresins fixed on a food-grade carrier, giving a dry, free-flowing powder that is easy to weigh,
            blend and dose. Supplied from New Delhi for masala, seasoning, tea and food manufacturers in India, and for export.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/contact#quote"
              className="btn-shine group inline-flex h-[3.25rem] items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-7 font-bold text-white shadow-lg shadow-orange-500/30 transition-all hover:-translate-y-0.5"
            >
              Request a quote
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </Link>
            <a href="mailto:exports@puravidanaturalindia.com" className="inline-flex h-[3.25rem] items-center justify-center rounded-xl border-2 border-emerald px-6 font-semibold text-emerald-700 transition-colors hover:bg-emerald hover:text-white">
              Export enquiries
            </a>
          </div>
        </div>
      </section>

      <section className="bg-white py-14 lg:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <h2 className="font-heading text-3xl font-black tracking-tight text-emerald-700">Why manufacturers choose the powder form</h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            {BENEFITS.map((b) => (
              <article key={b.title} className="rounded-2xl border border-gray-100 bg-gray-50/60 p-6">
                <b.icon className="h-6 w-6 text-emerald" aria-hidden="true" />
                <h3 className="mt-3 text-lg font-bold text-gray-900">{b.title}</h3>
                <p className="mt-1.5 text-[15px] leading-relaxed text-gray-600">{b.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-emerald-50/50 py-14 lg:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <h2 className="font-heading text-3xl font-black tracking-tight text-emerald-700">Oleoresins in our range</h2>
          <p className="mt-3 max-w-3xl text-gray-600">
            Each of these can be discussed for encapsulation. Every page lists the botanical name, key actives and test method.
          </p>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {oleoresins.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/products/${p.categorySlug}/${p.slug}`}
                  className="group flex h-full flex-col rounded-2xl border border-emerald-100 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-emerald hover:shadow-lg hover:shadow-emerald/10"
                >
                  <span className="font-semibold text-gray-900 group-hover:text-emerald-700">{p.name}</span>
                  {p.botanicalName && <span className="text-xs italic text-gray-500">{p.botanicalName}</span>}
                  {p.activeIngredient && <span className="mt-2 text-sm text-gray-600">{p.activeIngredient}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-white py-14 lg:py-20">
        <div className="mx-auto grid max-w-5xl gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <h2 className="font-heading text-3xl font-black tracking-tight text-emerald-700">Tell us what you need</h2>
            <ul className="mt-5 space-y-3 text-[15px] text-gray-700">
              {[
                [FlaskConical, "The spice or blend, and the target flavour or pungency"],
                [Boxes, "Monthly volume and pack size"],
                [Scale, "Destination country, for export documents"],
              ].map(([Icon, t]) => {
                const I = Icon as typeof Boxes;
                return (
                  <li key={t as string} className="flex gap-3">
                    <I className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald" aria-hidden="true" />
                    {t as string}
                  </li>
                );
              })}
            </ul>
            <Link href="/contact#quote" className="mt-6 inline-flex items-center gap-2 font-semibold text-emerald-700 hover:underline">
              Open the quote form <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          <div>
            <h2 className="mb-5 font-heading text-3xl font-black tracking-tight text-emerald-700">Questions</h2>
            <div className="space-y-3">
              {FAQ.map(([q, a]) => (
                <details key={q} className="group rounded-2xl border border-gray-200 bg-white p-4 open:shadow-sm">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-gray-900">
                    {q}
                    <span className="text-xl leading-none text-emerald transition-transform group-open:rotate-45" aria-hidden="true">+</span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-gray-600">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
