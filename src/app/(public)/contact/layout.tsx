import type { Metadata } from "next";

// The page itself is a client component (the quote form), so its
// metadata lives here.
export const metadata: Metadata = {
  title: { absolute: "Request a Quote: Herbal Extracts, Oils & Oleoresins" },
  description:
    "Request pricing, MOQ and specifications for herbal extracts, essential oils, oleoresins and nutraceuticals from New Delhi. We reply within one business day.",
  alternates: { canonical: "/contact" },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
