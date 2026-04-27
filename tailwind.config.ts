import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          base: "#0a0a0c",
          surface: "#101013",
          panel: "#15151a",
          elevated: "#1c1c22",
        },
        border: {
          subtle: "#1f1f26",
          DEFAULT: "#26262e",
          strong: "#33333d",
        },
        text: {
          primary: "#f4f4f5",
          secondary: "#a1a1aa",
          muted: "#71717a",
          faint: "#52525b",
        },
        accent: {
          DEFAULT: "#7c5cff",
          hover: "#8a6dff",
          glow: "rgba(124, 92, 255, 0.35)",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.125rem",
      },
      boxShadow: {
        card: "0 1px 0 rgba(255,255,255,0.04) inset, 0 8px 24px rgba(0,0,0,0.35)",
        miniplayer:
          "0 8px 32px rgba(0,0,0,0.55), 0 1px 0 rgba(255,255,255,0.05) inset",
        glow: "0 0 0 1px rgba(124,92,255,0.4), 0 8px 28px rgba(124,92,255,0.25)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "fade-in": "fade-in 200ms ease-out",
        shimmer: "shimmer 2s linear infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
