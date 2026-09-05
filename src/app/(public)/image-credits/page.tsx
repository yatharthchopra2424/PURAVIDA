import type { Metadata } from "next";
import fs from "fs";
import path from "path";
import { PageHero } from "@/components/layout/PageHero";

export const metadata: Metadata = {
  title: "Image Credits",
  description:
    "Attribution for photographs sourced from Wikimedia Commons used across the PuraVida Natural catalog.",
  alternates: { canonical: "/image-credits" },
  robots: { index: false, follow: true },
};

type AttributionEntry = {
  productName: string;
  commonsTitle: string;
  sourceUrl: string;
  license: string;
  artist: string;
};

function loadAttributions(): Record<string, AttributionEntry> {
  try {
    const filePath = path.join(
      process.cwd(),
      "public",
      "product_images",
      "COMMONS-ATTRIBUTION.json"
    );
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return {};
  }
}

export default function ImageCreditsPage() {
  const attributions = loadAttributions();
  const entries = Object.entries(attributions).sort(([, a], [, b]) =>
    a.productName.localeCompare(b.productName)
  );

  return (
    <div className="pb-20">
      <PageHero
        title="Image Credits"
        subtitle="Attribution for reference photography used across our catalog"
        image="/herosectioncarousel/Herbal Extraction.webp"
        imageAlt="Herbal extraction laboratory"
        crumbs={[{ label: "Image Credits" }]}
      />

      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <p className="mb-10 text-sm leading-relaxed text-gray-600">
          Many ingredient photographs on this site — the raw botanical source
          behind an extract, oil, or oleoresin — are reference images from{" "}
          <a
            href="https://commons.wikimedia.org"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-emerald underline underline-offset-2"
          >
            Wikimedia Commons
          </a>
          , used under their respective free-culture licenses. They illustrate
          the plant or compound behind a product rather than the finished
          goods themselves. Attribution for each is listed below.
        </p>

        {entries.length === 0 ? (
          <p className="text-sm text-gray-500">No attribution records found.</p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-100">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Used for</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Author</th>
                  <th className="px-4 py-3">License</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {entries.map(([slug, entry]) => (
                  <tr key={slug}>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {entry.productName}
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={entry.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald underline underline-offset-2 hover:text-emerald-700"
                      >
                        {entry.commonsTitle.replace(/^File:/, "")}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {entry.artist || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{entry.license}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
