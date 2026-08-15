import { ImageResponse } from "next/og";
import { fetchProductBySlug } from "@/lib/catalog";

/**
 * Per-product Open Graph card.
 *
 * Each of the ~250 product pages gets a share image carrying its own
 * name, botanical name and active ingredient — the details a B2B buyer
 * actually scans for — instead of one generic sitewide card.
 */

export const alt = "PuraVida Natural product";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function ProductOpenGraphImage({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}) {
  const { slug } = await params;

  let product = null;
  try {
    product = await fetchProductBySlug(slug);
  } catch {
    // Fall through to the generic card rather than failing the build.
  }

  const name = product?.name ?? "Premium Botanical Ingredients";
  const botanical = product?.botanicalName ?? "";
  const active = product?.activeIngredient ?? "";
  const concentration = product?.concentration ?? "";
  const category = product?.category ?? "PuraVida Natural";
  const badges = product?.qualityBadges?.slice(0, 4) ?? ["ISO", "GMP", "FSSAI"];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #062C1D 0%, #0d4a2f 60%, #5a8f0c 100%)",
          padding: "64px 72px",
          fontFamily: "sans-serif",
        }}
      >
        {/* Brand + category */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: "#5a8f0c",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                fontSize: 28,
                fontWeight: 700,
              }}
            >
              P
            </div>
            <div style={{ display: "flex", fontSize: 28, fontWeight: 700 }}>
              <span style={{ color: "#ffffff" }}>Pura</span>
              <span style={{ color: "#F97316" }}>Vida</span>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              padding: "8px 18px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.12)",
              border: "1px solid rgba(255,255,255,0.22)",
              color: "rgba(255,255,255,0.9)",
              fontSize: 20,
            }}
          >
            {category}
          </div>
        </div>

        {/* Product */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              fontSize: name.length > 34 ? 58 : 72,
              fontWeight: 700,
              color: "#ffffff",
              lineHeight: 1.08,
              letterSpacing: "-0.02em",
            }}
          >
            {name}
          </div>

          {botanical ? (
            <div
              style={{
                fontSize: 30,
                color: "rgba(255,255,255,0.7)",
                fontStyle: "italic",
              }}
            >
              {botanical}
            </div>
          ) : null}

          {active ? (
            <div style={{ display: "flex", fontSize: 26, color: "#c3db97" }}>
              {`Active: ${active}${concentration ? ` · ${concentration}` : ""}`}
            </div>
          ) : null}
        </div>

        {/* Certifications */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {badges.map((badge) => (
            <div
              key={badge}
              style={{
                display: "flex",
                padding: "9px 18px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.22)",
                color: "#ffffff",
                fontSize: 20,
              }}
            >
              {badge}
            </div>
          ))}
          <div
            style={{
              display: "flex",
              marginLeft: "auto",
              color: "rgba(255,255,255,0.66)",
              fontSize: 20,
            }}
          >
            puravidanaturalindia.com
          </div>
        </div>
      </div>
    ),
    size
  );
}
