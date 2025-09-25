/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class",
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {

        // Light Theme
        light: {
          b1: "white",
          b2: "#d1d5db",
          b3: "#9ca3af",
          t1: "black",
          t2: "#374151",
          
        },

        // Dark Theme
        dark: {
          b1: "#0f172a",
          b2:"#1e293b",
          b3: "#334155",
          t1: "white",
          t2: "#d1d5db",
          
        },
      },
    },
  },


  plugins: [],
}