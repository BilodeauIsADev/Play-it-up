import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // macOS dark mode–inspired neutrals (window, sidebar, elevated surfaces).
        bg: {
          base: "#1d1d1f",
          surface: "#2c2c2e",
          panel: "#323234",
          elevated: "#3a3a3c",
          glass: "rgba(44, 44, 46, 0.72)",
          "glass-strong": "rgba(58, 58, 60, 0.88)",
        },
        border: {
          subtle: "rgba(255, 255, 255, 0.06)",
          DEFAULT: "rgba(255, 255, 255, 0.10)",
          strong: "rgba(255, 255, 255, 0.14)",
        },
        text: {
          primary: "rgba(255, 255, 255, 0.92)",
          secondary: "rgba(235, 235, 245, 0.60)",
          muted: "rgba(235, 235, 245, 0.38)",
          faint: "rgba(235, 235, 245, 0.24)",
        },
        accent: {
          DEFAULT: "rgba(255, 255, 255, 0.92)",
          hover: "#ffffff",
          soft: "rgba(255, 255, 255, 0.12)",
          glow: "rgba(255, 255, 255, 0.2)",
        },
        mac: {
          separator: "rgba(255, 255, 255, 0.08)",
          fill: "rgba(118, 118, 128, 0.24)",
          "fill-secondary": "rgba(118, 118, 128, 0.16)",
          selected: "rgba(255, 255, 255, 0.14)",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Display",
          "SF Pro Text",
          "Segoe UI Variable",
          "Segoe UI",
          "system-ui",
          "sans-serif",
        ],
      },
      letterSpacing: {
        tightest: "-0.028em",
      },
      borderRadius: {
        mac: "0.5rem",
        lg: "0.625rem",
        xl: "0.75rem",
        "2xl": "0.875rem",
        "3xl": "1.125rem",
      },
      boxShadow: {
        card: "0 1px 0 rgba(255,255,255,0.04) inset, 0 1px 2px rgba(0,0,0,0.28)",
        "card-hover":
          "0 1px 0 rgba(255,255,255,0.06) inset, 0 4px 12px rgba(0,0,0,0.32)",
        miniplayer:
          "0 8px 32px rgba(0,0,0,0.45), 0 0 0 0.5px rgba(255,255,255,0.08)",
        panel: "0 1px 0 rgba(255,255,255,0.04) inset, 0 8px 24px rgba(0,0,0,0.35)",
        glow: "0 0 0 1px rgba(10,132,255,0.45), 0 4px 16px rgba(10,132,255,0.22)",
        "glow-soft": "0 0 0 1px rgba(10,132,255,0.28), 0 2px 8px rgba(10,132,255,0.12)",
        hero: "0 24px 48px rgba(0,0,0,0.40)",
      },
      backdropBlur: {
        mac: "20px",
        xl: "24px",
        "2xl": "32px",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.98)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "ambient-drift": {
          "0%, 100%": { transform: "translate3d(0, 0, 0) scale(1)" },
          "50%": { transform: "translate3d(1%, -0.5%, 0) scale(1.02)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "0.85" },
          "50%": { opacity: "1" },
        },
      },
      animation: {
        "fade-in": "fade-in 220ms cubic-bezier(0.25, 0.1, 0.25, 1)",
        "scale-in": "scale-in 200ms cubic-bezier(0.25, 0.1, 0.25, 1)",
        shimmer: "shimmer 2s linear infinite",
        "ambient-drift": "ambient-drift 28s ease-in-out infinite",
        "pulse-soft": "pulse-soft 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
