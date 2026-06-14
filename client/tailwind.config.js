/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#13051f",
        forest: "#5b21b6",
        mint: "#ede9fe",
        cream: "#f8f7fc",
        coral: "#a855f7"
      },
      boxShadow: {
        card: "0 18px 50px rgba(35, 10, 58, .09)",
        glow: "0 16px 45px rgba(124, 58, 237, .24)"
      }
    }
  },
  plugins: []
};
