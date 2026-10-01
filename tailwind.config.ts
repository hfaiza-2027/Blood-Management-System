import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Primary: deep haemoglobin red, used for blood actions & urgency only
        hemo: {
          50: "#FDF2F3",
          100: "#FBE3E6",
          200: "#F5C2C9",
          300: "#EC95A2",
          400: "#DE5F73",
          500: "#C8354D",
          600: "#A51C30",
          700: "#8A1628",
          800: "#701324",
          900: "#5C1220",
        },
        // Secondary: clinical navy
        ink: {
          50: "#F4F6F9",
          100: "#E6EAF0",
          200: "#CCD3DE",
          300: "#A5B0C2",
          400: "#76849C",
          500: "#56647D",
          600: "#434F66",
          700: "#343E52",
          800: "#232C3D",
          900: "#16233A",
        },
        paper: "#F6F7F9",
        line: "#E3E7ED",
        ok: { 50: "#ECF7F1", 100: "#D3EEDF", 600: "#1F7A55", 700: "#17603F" },
        warn: { 50: "#FDF6E7", 100: "#FAE9C2", 600: "#A86B06", 700: "#8A5705" },
        info: { 50: "#EEF4FB", 100: "#D8E6F6", 600: "#2563A8", 700: "#1D4F87" },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "6px",
        card: "10px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(22,35,58,0.06)",
        pop: "0 12px 32px -8px rgba(22,35,58,0.22)",
      },
      keyframes: {
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "slide-up": { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        "fill-vial": { from: { transform: "scaleY(0)" }, to: { transform: "scaleY(1)" } },
        pulse_ring: { "0%": { boxShadow: "0 0 0 0 rgba(165,28,48,0.45)" }, "100%": { boxShadow: "0 0 0 10px rgba(165,28,48,0)" } },
      },
      animation: {
        "fade-in": "fade-in 150ms ease-out",
        "slide-up": "slide-up 200ms ease-out",
        "fill-vial": "fill-vial 900ms cubic-bezier(.2,.7,.2,1) both",
        "pulse-ring": "pulse_ring 1.6s ease-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
