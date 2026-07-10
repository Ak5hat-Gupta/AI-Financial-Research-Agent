import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#F5F4F0",
        surface: { DEFAULT: "#FFFFFF", raised: "#FFFFFF", overlay: "#EFEEE8" },
        line: "#E6E4DD",
        ink: { DEFAULT: "#16161D", muted: "#5C5F6B", faint: "#9A9BA4" },
        bull: { DEFAULT: "#059669", soft: "rgba(5,150,105,0.10)" },
        bear: { DEFAULT: "#E11D48", soft: "rgba(225,29,72,0.10)" },
        warn: { DEFAULT: "#D97706", soft: "rgba(217,119,6,0.12)" },
        info: { DEFAULT: "#4F46E5", soft: "rgba(79,70,229,0.10)" },
        brand: { DEFAULT: "#4F46E5", 600: "#4338CA", violet: "#7C3AED" },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        glass: "0 1px 2px 0 rgba(22,22,29,0.04), 0 12px 32px -14px rgba(22,22,29,0.14)",
        raised: "0 2px 4px -1px rgba(22,22,29,0.06), 0 20px 44px -20px rgba(22,22,29,0.20)",
        glow: "0 1px 2px rgba(79,70,229,0.35), 0 10px 26px -10px rgba(79,70,229,0.55)",
      },
      backgroundImage: {
        "brand-grad": "linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)",
      },
      keyframes: {
        in: { "0%": { opacity: "0", transform: "translateY(6px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        float: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-14px)" } },
      },
      animation: { in: "in .35s ease-out both", float: "float 12s ease-in-out infinite" },
    },
  },
  plugins: [],
} satisfies Config;
