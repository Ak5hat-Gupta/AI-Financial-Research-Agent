import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: "#0A0B0D",
        surface: { DEFAULT: "#101216", raised: "#16191F", overlay: "#1C2027" },
        line: "#23272F",
        ink: { DEFAULT: "#F2F4F7", muted: "#9BA3AF", faint: "#6B7280" },
        bull: { DEFAULT: "#10B981", soft: "rgba(16,185,129,0.12)" },
        bear: { DEFAULT: "#F43F5E", soft: "rgba(244,63,94,0.12)" },
        warn: { DEFAULT: "#F59E0B", soft: "rgba(245,158,11,0.12)" },
        info: { DEFAULT: "#3B82F6", soft: "rgba(59,130,246,0.12)" },
        brand: { DEFAULT: "#10B981", 600: "#059669" },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        glass: "0 1px 0 0 rgba(255,255,255,0.04) inset, 0 10px 40px -16px rgba(0,0,0,0.7)",
      },
      keyframes: {
        in: { "0%": { opacity: "0", transform: "translateY(6px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
      },
      animation: { in: "in .35s ease-out both" },
    },
  },
  plugins: [],
} satisfies Config;
