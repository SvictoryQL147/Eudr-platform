import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

// shadcn/ui-style theme: semantic colours come from CSS variables in
// globals.css, so the whole look can be re-branded in one place.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "1rem", screens: { "2xl": "1400px" } },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        popover: { DEFAULT: "hsl(var(--popover))", foreground: "hsl(var(--popover-foreground))" },
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar))",
          foreground: "hsl(var(--sidebar-foreground))",
          muted: "hsl(var(--sidebar-muted))",
          accent: "hsl(var(--sidebar-accent))",
          border: "hsl(var(--sidebar-border))",
        },
        brand: {
          50: "#eef7f1", 100: "#d5ecdd", 200: "#acd8bc", 300: "#7dbf97", 400: "#4f9f71",
          500: "#2f8255", 600: "#226843", 700: "#1c5337", 800: "#18432e", 900: "#143827", 950: "#0b2118",
        },
      },
      borderRadius: { lg: "var(--radius)", md: "calc(var(--radius) - 2px)", sm: "calc(var(--radius) - 4px)" },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
        display: ["Plus Jakarta Sans", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,24,40,.04), 0 1px 3px rgba(16,24,40,.05)",
        pop: "0 10px 38px -10px rgba(22,23,24,.30), 0 10px 20px -15px rgba(22,23,24,.18)",
      },
      keyframes: {
        "fade-up": { from: { opacity: "0", transform: "translateY(4px)" }, to: { opacity: "1", transform: "none" } },
        float: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-8px)" } },
        draw: { from: { strokeDashoffset: "600" }, to: { strokeDashoffset: "0" } },
        "pulse-soft": { "0%,100%": { opacity: "1" }, "50%": { opacity: ".45" } },
        scan: { "0%": { transform: "translateY(-10%)" }, "100%": { transform: "translateY(110%)" } },
        shimmer: { from: { backgroundPosition: "200% 0" }, to: { backgroundPosition: "-200% 0" } },
        marquee: { from: { transform: "translateX(0)" }, to: { transform: "translateX(-50%)" } },
        "dash-flow": { to: { strokeDashoffset: "-40" } },
        "blur-in": { from: { opacity: "0", filter: "blur(12px)", transform: "translateY(18px)" }, to: { opacity: "1", filter: "blur(0)", transform: "none" } },
        "ping-slow": { "0%": { transform: "scale(1)", opacity: ".7" }, "100%": { transform: "scale(2.6)", opacity: "0" } },
        aurora: { "0%,100%": { transform: "translate(0,0) rotate(0deg)" }, "50%": { transform: "translate(4%,-3%) rotate(8deg)" } },
      },
      animation: {
        "fade-up": "fade-up .25s ease-out",
        float: "float 6s ease-in-out infinite",
        draw: "draw 2.4s ease-out forwards",
        "pulse-soft": "pulse-soft 2.4s ease-in-out infinite",
        scan: "scan 4.5s linear infinite",
        shimmer: "shimmer 8s linear infinite",
        marquee: "marquee 38s linear infinite",
        "dash-flow": "dash-flow 1.2s linear infinite",
        "blur-in": "blur-in .9s cubic-bezier(.2,.7,.2,1) both",
        "ping-slow": "ping-slow 2.4s cubic-bezier(0,0,.2,1) infinite",
        "spin-slow": "spin 28s linear infinite",
        aurora: "aurora 18s ease-in-out infinite",
      },
    },
  },
  plugins: [animate],
};
export default config;
