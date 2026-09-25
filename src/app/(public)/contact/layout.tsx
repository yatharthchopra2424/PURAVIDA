import type { Metadata } from "next";

// The page itself is a client component (the quote form), so its
// metadata lives here.
export const metadata: Metadata = {
  title: "Request a Quote | Bulk Herbal Extracts, Essential Oils & Nutraceuticals",
  description:
    "Request pricing, MOQ and specifications for herbal extracts, essential oils, oleoresins and nutraceutical ingredients from PuraVida Natural, New Delhi. Reply within one business day.",
  alternates: { canonical: "/contact" },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
