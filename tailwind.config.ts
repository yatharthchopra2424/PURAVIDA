import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: "#FAFAFA",
        emerald: {
          DEFAULT: "#5a8f0c",
          50: "#f0f6e5",
          100: "#e1edcb",
          200: "#c3db97",
          300: "#a5c963",
          400: "#87b72f",
          500: "#5a8f0c",
          600: "#51800b",
          700: "#436a09",
          800: "#325007",
          900: "#213604",
          950: "#111b02",
        },
        orange: {
          DEFAULT: "#F97316",
          50: "#FFF7ED",
          100: "#FFEDD5",
          200: "#FED7AA",
          300: "#FDBA74",
          400: "#FB923C",
          500: "#F97316",
          600: "#EA580C",
          700: "#C2410C",
          800: "#9A3412",
          900: "#7C2D12",
        },
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      fontFamily: {
        // Modern heading font
        heading: ["var(--font-space-grotesk)", "system-ui", "sans-serif"],
        // Body text fonts
        sans: ["var(--font-inter)", "var(--font-plus-jakarta-sans)", "system-ui", "sans-serif"],
        // Fallback/legacy support
        geist: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        "geist-mono": ["var(--font-geist-mono)", "monospace"],
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-out",
        "fade-up": "fadeUp 0.6s ease-out",
        "slide-down": "slideDown 0.3s ease-out",
        "scale-in": "scaleIn 0.2s ease-out",
        ripple: "ripple 1s ease-out",
        "pulse-border": "pulseBorder 2s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideDown: {
          "0%": { opacity: "0", transform: "translateY(-10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        ripple: {
          "0%": { transform: "scale(0)", opacity: "0.5" },
          "100%": { transform: "scale(4)", opacity: "0" },
        },
        pulseBorder: {
          "0%, 100%": { borderColor: "#5a8f0c" },
          "50%": { borderColor: "#87b72f" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
