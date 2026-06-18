/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Deep OLED terminal surfaces
        base: "#020617",
        surface: {
          DEFAULT: "#0B1220",
          raised: "#0F172A",
          overlay: "#1E293B",
        },
        line: "#1F2A3C",
        ink: {
          DEFAULT: "#F8FAFC",
          muted: "#94A3B8",
          faint: "#64748B",
        },
        // P&L semantics
        bull: { DEFAULT: "#22C55E", soft: "#16331f" },
        bear: { DEFAULT: "#F43F5E", soft: "#3a1622" },
        warn: { DEFAULT: "#F59E0B", soft: "#3a2c10" },
        accent: { DEFAULT: "#38BDF8", soft: "#0c2b3a" },
        brand: { DEFAULT: "#10B981", 600: "#059669", 700: "#047857" },
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', "system-ui", "sans-serif"],
        mono: ['"IBM Plex Mono"', "ui-monospace", "monospace"],
      },
      boxShadow: {
        glow: "0 0 24px -6px rgba(16,185,129,0.45)",
        card: "0 1px 0 0 rgba(255,255,255,0.04) inset, 0 8px 30px -12px rgba(0,0,0,0.6)",
      },
      backgroundImage: {
        grid: "linear-gradient(rgba(148,163,184,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.05) 1px, transparent 1px)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.4s ease-out both",
      },
    },
  },
  plugins: [],
};
