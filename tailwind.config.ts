import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Cinematic dark blue + charcoal foundation tuned for glassmorphism.
        bg: {
          base: "#06070b",
          surface: "#0b0d14",
          panel: "#11141d",
          elevated: "#171a26",
          glass: "rgba(18, 22, 32, 0.55)",
          "glass-strong": "rgba(22, 27, 40, 0.78)",
        },
        border: {
          subtle: "rgba(255, 255, 255, 0.06)",
          DEFAULT: "rgba(255, 255, 255, 0.10)",
          strong: "rgba(255, 255, 255, 0.16)",
        },
        text: {
          primary: "#f5f7fb",
          secondary: "#a8b0c2",
          muted: "#6b7388",
          faint: "#4a5063",
        },
        accent: {
          DEFAULT: "#5b8cff",
          hover: "#7aa1ff",
          soft: "rgba(91, 140, 255, 0.18)",
          glow: "rgba(91, 140, 255, 0.45)",
        },
        cinema: {
          indigo: "#1a2348",
          midnight: "#0a1024",
          slate: "#11151f",
          violet: "#2a1d52",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Display",
          "SF Pro Text",
          "Inter",
          "Segoe UI",
          "Roboto",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
      },
      letterSpacing: {
        tightest: "-0.035em",
      },
      borderRadius: {
        lg: "0.75rem",
        xl: "1rem",
        "2xl": "1.25rem",
        "3xl": "1.75rem",
      },
      boxShadow: {
        card: "0 1px 0 rgba(255,255,255,0.05) inset, 0 12px 32px rgba(0,0,0,0.45)",
        "card-hover":
          "0 1px 0 rgba(255,255,255,0.08) inset, 0 18px 48px rgba(0,0,0,0.55)",
        miniplayer:
          "0 24px 64px rgba(0,0,0,0.55), 0 1px 0 rgba(255,255,255,0.08) inset, 0 0 0 1px rgba(255,255,255,0.06)",
        glass:
          "0 1px 0 rgba(255,255,255,0.06) inset, 0 8px 28px rgba(0,0,0,0.45)",
        glow: "0 0 0 1px rgba(91,140,255,0.45), 0 12px 36px rgba(91,140,255,0.30)",
        "glow-soft": "0 0 0 1px rgba(91,140,255,0.30), 0 8px 24px rgba(91,140,255,0.18)",
        hero: "0 32px 80px rgba(0,0,0,0.55), 0 1px 0 rgba(255,255,255,0.05) inset",
      },
      backdropBlur: {
        xs: "6px",
        xl: "24px",
        "2xl": "32px",
        "3xl": "48px",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "ambient-drift": {
          "0%, 100%": { transform: "translate3d(0, 0, 0) scale(1)" },
          "50%": { transform: "translate3d(2%, -1%, 0) scale(1.04)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "0.85" },
          "50%": { opacity: "1" },
        },
      },
      animation: {
        "fade-in": "fade-in 240ms cubic-bezier(0.16, 1, 0.3, 1)",
        "scale-in": "scale-in 220ms cubic-bezier(0.16, 1, 0.3, 1)",
        shimmer: "shimmer 2s linear infinite",
        "ambient-drift": "ambient-drift 22s ease-in-out infinite",
        "pulse-soft": "pulse-soft 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
