import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Leaf, Droplets, Moon, ShieldCheck, Package, Factory, AlertTriangle, ArrowRight } from "lucide-react";
import { JsonLd } from "@/components/shared/JsonLd";
import { breadcrumbSchema, jsonLdGraph } from "@/lib/structured-data";
import { absoluteUrl } from "@/lib/site";
import { COMPANY } from "@/lib/constants";
import { AmazonButton } from "./AmazonButton";

/**
 * Retail product page for the Selvasoul Digestive Fiber Blend sold on Amazon.
 *
 * Every fact here is transcribed from the physical label (private-docs/
 * amazon-originals/*_edited.png). Deliberately NOT used: the disease-risk
 * claims on the side label (cholesterol, blood sugar, IBS, weight), which
 * FSSAI's Health Supplement regulations don't permit for this product
 * category, and the AI-generated "What's inside" artwork, whose nutrition
 * panel does not match the real label.
 */

const AMAZON_URL = COMPANY.featuredProduct.url;
const PATH = "/selvasoul-digestive-fiber-blend";
const NAME = "Selvasoul Digestive Fiber Blend: Isabgol & Saunf, 200 g";

export const metadata: Metadata = {
  title: "Selvasoul Digestive Fiber Blend: Isabgol & Saunf Health Supplement (200 g)",
  description:
    "Selvasoul Digestive Fiber Blend: 80% isabgol husk (Plantago ovata) and 20% saunf (fennel). 4.1 g dietary fibre per 5 g serving, no additives or preservatives. Supports digestive health and regularity. Buy on Amazon.",
  alternates: { canonical: PATH },
  openGraph: {
    title: "Selvasoul Digestive Fiber Blend: Isabgol & Saunf",
    description: "4.1 g natural dietary fibre per serving. 80% isabgol husk, 20% saunf. No additives, no preservatives.",
    url: PATH,
    images: [{ url: "/selvasoul/jar-front.webp", width: 1400, height: 1563, alt: "Selvasoul Digestive Fiber Blend 200 g jar" }],
  },
};

const NUTRITION: [string, string][] = [
  ["Energy", "10 kcal"],
  ["Total fat", "0.0 g"],
  ["Saturated fat", "0.0 g"],
  ["Trans fat", "0.0 g"],
  ["Cholesterol", "0.0 g"],
  ["Sodium", "1.0 mg"],
  ["Total carbohydrate", "4.3 g"],
  ["Dietary fibre", "4.1 g"],
  ["Sugar", "0.0 g"],
  ["Protein", "0.0 g"],
];

const FAQ: [string, string][] = [
  [
    "What is in Selvasoul Digestive Fiber Blend?",
    "Two ingredients only: isabgol husk (psyllium, Plantago ovata) at 80% and saunf (fennel seed, Foeniculum vulgare) at 20%. A 5 g serving contains 4.0 g isabgol and 1.0 g saunf, with no additives or preservatives.",
  ],
  [
    "How much fibre does one serving provide?",
    "About 4.1 g of dietary fibre per 5 g serving, at roughly 10 kcal, with no sugar, fat or protein (approximate values from the label).",
  ],
  [
    "How do I take it?",
    "Adults and children above 12 years: 1–2 teaspoons (2.5–5 g) mixed in water, at bedtime or as directed by a physician. Use a dry spoon and do not exceed the recommended daily intake.",
  ],
  [
    "Who should check with a doctor first?",
    "Pregnant or lactating women and anyone with a medical condition should consult a physician before use. The product is a health supplement, not a medicine, and is not intended to diagnose, treat, cure or prevent any disease.",
  ],
  [
    "Where can I buy it?",
    "Selvasoul Digestive Fiber Blend is sold on Amazon India. For bulk, distributor or private-label supply, request a quote from PuraVida Natural directly.",
  ],
];

const HOW_TO = [
  { icon: Droplets, title: "Take 1–2 tsp", body: "2.5–5 g with a dry spoon" },
  { icon: Leaf, title: "Mix in water", body: "Stir well and drink straight away" },
  { icon: Moon, title: "At bedtime", body: "Or as directed by your physician" },
];

export default function SelvasoulPage() {
  const url = absoluteUrl(PATH);
  const schema = jsonLdGraph(
    {
      "@type": "Product",
      "@id": `${url}#product`,
      name: NAME,
      description:
        "Health supplement blend of isabgol husk (Plantago ovata, 80%) and saunf seed (Foeniculum vulgare, 20%). 4.1 g dietary fibre per 5 g serving. No additives, no preservatives.",
      brand: { "@type": "Brand", name: "Selvasoul" },
      image: ["jar-front", "jar-back", "jar-side"].map((n) => absoluteUrl(`/selvasoul/${n}.webp`)),
      category: "Health Supplements > Digestive Health > Fibre Supplements",
      countryOfOrigin: "IN",
      size: "200 g",
      material: "Isabgol husk (Plantago ovata), Saunf seed (Foeniculum vulgare)",
      manufacturer: { "@type": "Organization", name: "Lafiya Biotech", address: "Mohali, Punjab, India" },
      // Marketed by the site's own organisation node (see layout JSON-LD).
      isRelatedTo: { "@id": absoluteUrl("/#organization") },
      nutrition: {
        "@type": "NutritionInformation",
        servingSize: "5 g",
        calories: "10 kcal",
        carbohydrateContent: "4.3 g",
        fiberContent: "4.1 g",
        sugarContent: "0 g",
        fatContent: "0 g",
        proteinContent: "0 g",
        sodiumContent: "1 mg",
      },
      offers: {
        "@type": "Offer",
        url: AMAZON_URL,
        availability: "https://schema.org/InStock",
        seller: { "@type": "Organization", name: "Amazon.in" },
      },
    },
    {
      "@type": "FAQPage",
      mainEntity: FAQ.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
    },
    {
      "@type": "HowTo",
      name: "How to take Selvasoul Digestive Fiber Blend",
      totalTime: "PT1M",
      supply: [{ "@type": "HowToSupply", name: "Selvasoul Digestive Fiber Blend" }, { "@type": "HowToSupply", name: "A glass of water" }],
      step: [
        { "@type": "HowToStep", text: "Take 1–2 teaspoons (2.5–5 g) using a dry spoon." },
        { "@type": "HowToStep", text: "Mix into a glass of water and stir well." },
        { "@type": "HowToStep", text: "Drink at bedtime, or as directed by a physician." },
      ],
    },
    breadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Selvasoul Digestive Fiber Blend", path: PATH },
    ])
  );

  return (
    <>
      <JsonLd data={schema} />

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-emerald-50/70 via-white to-white pb-16 pt-[10rem] lg:pb-24 lg:pt-[12.5rem]">
        <div aria-hidden="true" className="pointer-events-none absolute -left-40 top-40 h-[28rem] w-[28rem] rounded-full bg-emerald-100/60 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2">
          <div className="order-2 lg:order-1">
            <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-sm text-gray-500">
              <Link href="/" className="hover:text-emerald">Home</Link>
              <span aria-hidden="true">/</span>
              <span className="text-gray-900">Selvasoul</span>
            </nav>
            <Image src="/selvasoul/selvasoul-logo.webp" alt="Selvasoul" width={180} height={60} className="mb-4 h-auto w-40" priority />
            <h1 className="font-heading text-4xl font-black leading-[1.05] tracking-tight text-gray-900 sm:text-5xl">
              Digestive Fiber Blend
              <span className="mt-2 block text-2xl font-bold text-emerald-700 sm:text-3xl">Isabgol &amp; Saunf · 200 g</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-gray-600">
              A two-ingredient health supplement: <strong>80% isabgol husk</strong> for gentle, natural fibre and{" "}
              <strong>20% saunf</strong> for a mild, pleasant taste. <strong>4.1 g dietary fibre</strong> in every 5 g
              serving, with no additives and no preservatives. Supports digestive health and regularity.
            </p>
            <ul className="mt-6 flex flex-wrap gap-2 text-sm">
              {["100% natural ingredients", "No additives or preservatives", "4.1 g fibre per serving", "Made in India"].map((t) => (
                <li key={t} className="rounded-full border border-emerald-200 bg-white px-3 py-1.5 font-medium text-emerald-800">{t}</li>
              ))}
            </ul>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <AmazonButton href={AMAZON_URL} />
              <Link
                href="/contact#quote"
                className="inline-flex h-[3.25rem] items-center justify-center gap-2 rounded-xl border-2 border-emerald bg-white px-6 text-base font-semibold text-emerald-700 transition-all hover:-translate-y-0.5 hover:bg-emerald hover:text-white"
              >
                Bulk &amp; private label <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <div className="relative mx-auto aspect-[1400/1563] w-full max-w-md">
              <Image
                src="/selvasoul/jar-front.webp"
                alt="Selvasoul Digestive Fiber Blend, 200 g jar, front label"
                fill
                sizes="(min-width: 1024px) 448px, 90vw"
                className="object-contain mix-blend-multiply"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── What's inside ───────────────────────────────────── */}
      <section className="bg-white py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 className="font-heading text-3xl font-black tracking-tight text-emerald-700 sm:text-4xl">What&apos;s inside</h2>
          <p className="mt-3 max-w-2xl text-gray-600">Two ingredients, listed in descending order of weight. Nothing else.</p>
          <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_1fr_1.1fr]">
            {[
              ["Isabgol husk", "Plantago ovata", "80%", "4.0 g per 5 g serving", "Psyllium husk: a naturally soluble fibre traditionally used to support regular bowel movements."],
              ["Saunf seed", "Foeniculum vulgare", "20%", "1.0 g per 5 g serving", "Fennel seed: used in Indian kitchens after meals for centuries, and gives the blend its mild taste."],
            ].map(([name, latin, pct, amount, body]) => (
              <article key={name} className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50/80 to-white p-7">
                <p className="font-heading text-5xl font-black text-emerald-600">{pct}</p>
                <h3 className="mt-3 text-xl font-bold text-gray-900">{name}</h3>
                <p className="text-sm italic text-gray-500">{latin}</p>
                <p className="mt-1 text-sm font-semibold text-emerald-700">{amount}</p>
                <p className="mt-4 text-sm leading-relaxed text-gray-600">{body}</p>
              </article>
            ))}
            <div className="rounded-3xl border border-gray-200 bg-white p-6">
              <h3 className="border-b-4 border-gray-900 pb-2 text-xl font-black text-gray-900">Nutritional information</h3>
              <p className="mt-2 text-xs text-gray-500">Serving size 5 g · approximate values</p>
              <table className="mt-3 w-full text-sm">
                <tbody>
                  {NUTRITION.map(([k, v]) => (
                    <tr key={k} className="border-b border-gray-100 last:border-0">
                      <th scope="row" className={`py-1.5 text-left font-medium ${/fat|fibre|Sugar/.test(k) && k !== "Total fat" ? "pl-4 text-gray-500" : "text-gray-800"}`}>{k}</th>
                      <td className="py-1.5 text-right tabular-nums text-gray-900">{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* ── How to use ──────────────────────────────────────── */}
      <section className="bg-emerald-50/50 py-16 lg:py-24">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2">
          <div className="relative aspect-square overflow-hidden rounded-3xl shadow-xl">
            <Image src="/selvasoul/how-to-use.webp" alt="How to use: take 1–2 teaspoons, mix in water, drink at bedtime" fill sizes="(min-width: 1024px) 600px, 100vw" className="object-cover" />
          </div>
          <div>
            <h2 className="font-heading text-3xl font-black tracking-tight text-emerald-700 sm:text-4xl">How to use</h2>
            <p className="mt-3 text-gray-600">For adults and children above 12 years.</p>
            <ol className="mt-8 space-y-4">
              {HOW_TO.map((s, i) => (
                <li key={s.title} className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm">
                  <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-emerald text-white">
                    <s.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block font-bold text-gray-900">{i + 1}. {s.title}</span>
                    <span className="text-sm text-gray-600">{s.body}</span>
                  </span>
                </li>
              ))}
            </ol>
            <div className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
              <p>
                Not for medicinal use. Do not exceed the recommended daily intake. Keep out of reach of children. Pregnant or
                lactating women and people with medical conditions should consult a physician. This product is not intended to
                diagnose, treat, cure or prevent any disease.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Label gallery ───────────────────────────────────── */}
      <section className="bg-white py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 className="font-heading text-3xl font-black tracking-tight text-emerald-700 sm:text-4xl">Full label</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {[
              ["jar-front", "Front of the jar"],
              ["jar-side", "Ingredients, nutrition and directions"],
              ["jar-back", "Marketer and manufacturer details"],
            ].map(([f, alt]) => (
              <figure key={f} className="rounded-3xl bg-gray-50 p-4">
                <div className="relative aspect-[1400/1560]">
                  <Image src={`/selvasoul/${f}.webp`} alt={`Selvasoul Digestive Fiber Blend: ${alt}`} fill sizes="(min-width: 640px) 33vw, 100vw" className="object-contain mix-blend-multiply" />
                </div>
                <figcaption className="mt-3 text-center text-sm text-gray-500">{alt}</figcaption>
              </figure>
            ))}
          </div>
          <dl className="mt-10 grid gap-4 text-sm sm:grid-cols-3">
            <div className="flex gap-3 rounded-2xl border border-gray-100 p-4">
              <Package className="h-5 w-5 flex-shrink-0 text-emerald" aria-hidden="true" />
              <div><dt className="font-semibold text-gray-900">Net weight</dt><dd className="text-gray-600">200 g</dd></div>
            </div>
            <div className="flex gap-3 rounded-2xl border border-gray-100 p-4">
              <ShieldCheck className="h-5 w-5 flex-shrink-0 text-emerald" aria-hidden="true" />
              <div><dt className="font-semibold text-gray-900">Marketed by</dt><dd className="text-gray-600">{COMPANY.legalName}, New Delhi · FSSAI Lic. {COMPANY.fssaiLicense}</dd></div>
            </div>
            <div className="flex gap-3 rounded-2xl border border-gray-100 p-4">
              <Factory className="h-5 w-5 flex-shrink-0 text-emerald" aria-hidden="true" />
              <div><dt className="font-semibold text-gray-900">Manufactured by</dt><dd className="text-gray-600">Lafiya Biotech, Mohali, Punjab (FSSAI licensed)</dd></div>
            </div>
          </dl>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────── */}
      <section className="bg-gray-50 py-16 lg:py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="font-heading text-3xl font-black tracking-tight text-emerald-700 sm:text-4xl">Questions</h2>
          <div className="mt-8 space-y-3">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group rounded-2xl border border-gray-200 bg-white p-5 open:shadow-sm">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-gray-900">
                  {q}
                  <span className="text-xl text-emerald transition-transform group-open:rotate-45" aria-hidden="true">+</span>
                </summary>
                <p className="mt-3 leading-relaxed text-gray-600">{a}</p>
              </details>
            ))}
          </div>
          <div className="mt-12 rounded-3xl bg-gradient-to-br from-emerald-700 to-emerald p-8 text-center text-white">
            <h2 className="text-2xl font-bold">Available on Amazon India</h2>
            <p className="mt-2 text-emerald-100">Delivered by Amazon. For bulk, distribution or private label, contact us directly.</p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <AmazonButton href={AMAZON_URL} variant="light" />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
