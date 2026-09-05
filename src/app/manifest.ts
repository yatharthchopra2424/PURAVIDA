import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PuraVida Natural — Premium Botanical Extracts & Ingredients",
    short_name: "PuraVida Natural",
    description:
      "Manufacturer and exporter of premium herbal extracts, essential oils, oleoresins, and nutraceutical ingredients.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#6AA40E",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
