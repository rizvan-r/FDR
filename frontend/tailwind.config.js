/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gov: {
          navy: "#12345A",         // Primary navy
          blue: "#1D5F91",         // Secondary blue
          bg: "#F4F6F9",           // Background
          card: "#FFFFFF",         // Card background
          text: "#1B2733",         // Main text
          muted: "#64748B",        // Secondary text
          success: "#16804A",      // Success
          warning: "#C58A12",      // Warning
          danger: "#B42318",       // Danger
          border: "#D9E0E8",       // Border
          accent: "#0A2540",
          light: "#EBF3FA",
          gold: "#D4AF37",
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'gov': '0 1px 3px 0 rgba(18, 52, 90, 0.08), 0 1px 2px 0 rgba(18, 52, 90, 0.04)',
        'gov-md': '0 4px 6px -1px rgba(18, 52, 90, 0.1), 0 2px 4px -1px rgba(18, 52, 90, 0.06)',
        'gov-lg': '0 10px 15px -3px rgba(18, 52, 90, 0.1), 0 4px 6px -2px rgba(18, 52, 90, 0.05)',
      }
    },
  },
  plugins: [],
}
