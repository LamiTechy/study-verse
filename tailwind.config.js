/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Sora", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
        serif: ["Fraunces", "serif"],
      },
      colors: {
        accent: "#7C6EF5",
        "accent-dim": "#3d3670",
        gold: "#D4A853",
        surface: "#111114",
      },
      animation: {
        "fade-up": "fadeUp 0.4s ease-out",
        "fade-in": "fadeIn 0.3s ease-out",
      },
    },
  },
  plugins: [],
};
