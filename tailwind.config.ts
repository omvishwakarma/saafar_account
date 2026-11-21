import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        sand: "#f3efe6",
        paper: "#fffcf7",
        ink: "#1c1915",
        muted: "#6d655b",
        line: "#e5dccb",
        pine: "#16221f",
        moss: "#243f38",
        brass: "#b8501f",
        good: "#0f6e56",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "sans-serif"],
        display: ["var(--font-display)", "serif"],
      },
      boxShadow: {
        card: "0 1px 0 rgba(28,25,21,0.04), 0 12px 32px -20px rgba(28,25,21,0.35)",
      },
    },
  },
  plugins: [],
};

export default config;
