import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: "var(--bg)",
        raised: "var(--bg-raised)",
        overlay: "var(--bg-overlay)",
        hairline: "var(--hairline)",
        brand: {
          DEFAULT: "#ed1e8f",
          bright: "#f473b8",
          deep: "#a3125f",
          faint: "rgba(237,30,143,0.10)",
        },
        ink: {
          DEFAULT: "var(--ink)",
          2: "var(--ink-2)",
          3: "var(--ink-3)",
        },
        ok: "rgb(var(--ok-rgb) / <alpha-value>)",
        warn: "rgb(var(--warn-rgb) / <alpha-value>)",
        bad: "rgb(var(--bad-rgb) / <alpha-value>)",
        info: "rgb(var(--info-rgb) / <alpha-value>)",
        wa: {
          out: "#005c4b",
          in: "#202c33",
          bg: "#0b141a",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        sans: ["var(--font-sans)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      boxShadow: {
        card: "0 1px 0 rgba(255,255,255,0.03) inset, 0 10px 30px -12px rgba(0,0,0,0.55)",
        glow: "0 0 40px -8px rgba(237,30,143,0.35)",
        phone: "0 24px 60px -20px rgba(0,0,0,0.7), 0 0 0 1px rgba(237,30,143,0.18)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-dot": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.35" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.55s cubic-bezier(0.22,1,0.36,1) both",
        "pulse-dot": "pulse-dot 2s ease-in-out infinite",
        shimmer: "shimmer 2.5s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
