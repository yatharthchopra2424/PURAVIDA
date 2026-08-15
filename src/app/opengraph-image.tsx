import { ImageResponse } from "next/og";

/**
 * Default Open Graph card for the site.
 *
 * The layout declared `twitter:card = summary_large_image` but no image
 * existed, so every LinkedIn and WhatsApp share rendered as a bare text
 * link. Generated at build time — no design asset to maintain.
 */

export const alt =
  "PuraVida Natural — Premium Botanical Extracts & Ingredients";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #062C1D 0%, #0d4a2f 55%, #5a8f0c 100%)",
          padding: "72px 80px",
          fontFamily: "sans-serif",
        }}
      >
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "#5a8f0c",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              fontSize: 32,
              fontWeight: 700,
            }}
          >
            P
          </div>
          <div style={{ display: "flex", fontSize: 34, fontWeight: 700 }}>
            <span style={{ color: "#ffffff" }}>Pura</span>
            <span style={{ color: "#F97316" }}>Vida</span>
          </div>
        </div>

        {/* Headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Satori requires an explicit display on any element with
              more than one child — hence a flex column of two lines
              rather than a <br />. */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 66,
              fontWeight: 700,
              color: "#ffffff",
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
            }}
          >
            <div style={{ display: "flex" }}>Premium Botanical</div>
            <div style={{ display: "flex" }}>Extracts &amp; Ingredients</div>
          </div>
          <div style={{ fontSize: 28, color: "rgba(255,255,255,0.78)" }}>
            Herbal extracts · Essential oils · Oleoresins · Nutraceuticals
          </div>
        </div>

        {/* Credentials */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {["ISO 9001:2015", "GMP", "FSSAI", "Exporting to 50+ countries"].map(
            (badge) => (
              <div
                key={badge}
                style={{
                  display: "flex",
                  padding: "10px 20px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.12)",
                  border: "1px solid rgba(255,255,255,0.22)",
                  color: "#ffffff",
                  fontSize: 21,
                }}
              >
                {badge}
              </div>
            )
          )}
        </div>
      </div>
    ),
    size
  );
}
