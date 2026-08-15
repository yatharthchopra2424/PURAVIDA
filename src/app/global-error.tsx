"use client";

import { useEffect } from "react";

/**
 * Last-resort boundary. Catches errors thrown in the root layout
 * itself, where the normal error.tsx has no shell to render into —
 * so this component must supply its own <html> and <body>.
 *
 * Deliberately dependency-free and inline-styled: if the root layout
 * failed, fonts and global CSS may not have loaded either.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global-error]", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.5rem",
          backgroundColor: "#fafaf9",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
          color: "#1c1917",
        }}
      >
        <div style={{ maxWidth: "28rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>
            PuraVida Natural
          </h1>
          <p
            style={{
              marginTop: "0.75rem",
              fontSize: "1rem",
              lineHeight: 1.6,
              color: "#57534e",
            }}
          >
            The site is temporarily unavailable. Please try again shortly.
          </p>

          <button
            onClick={reset}
            style={{
              marginTop: "1.5rem",
              cursor: "pointer",
              borderRadius: "0.75rem",
              border: "none",
              backgroundColor: "#0f5132",
              padding: "0.65rem 1.25rem",
              fontSize: "0.875rem",
              fontWeight: 600,
              color: "#ffffff",
            }}
          >
            Try again
          </button>

          <p
            style={{
              marginTop: "1.5rem",
              fontSize: "0.875rem",
              color: "#78716c",
            }}
          >
            Urgent enquiries:{" "}
            <a
              href="mailto:ps@puravidanaturalindia.com"
              style={{ color: "#0f5132", fontWeight: 500 }}
            >
              ps@puravidanaturalindia.com
            </a>
          </p>

          {error.digest && (
            <p
              style={{
                marginTop: "1rem",
                fontFamily: "ui-monospace, monospace",
                fontSize: "0.75rem",
                color: "#a8a29e",
              }}
            >
              Reference: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
