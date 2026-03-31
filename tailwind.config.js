/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#F97316",
        background: "#0F1923",
        card: "#1a2636",
        surface: "#1F2937",
        border: "#2a3a4e",
        success: "#4ADE80",
        info: "#60A5FA",
        warning: "#FBBF24",
        error: "#F87171",
        "text-primary": "#FFFFFF",
        "text-secondary": "#9CA3AF",
        "text-dim": "#6B7280",
        "nav-bg": "#0a1018",
      },
    },
  },
  plugins: [],
};
