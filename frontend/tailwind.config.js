/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#182230",
        mist: "#F4F7F2",
        moss: "#87A96B",
        clay: "#C46E48",
        pine: "#244239",
        sand: "#E4D7C4",
      },
      boxShadow: {
        panel: "0 20px 60px rgba(24, 34, 48, 0.08)",
      },
      fontFamily: {
        sans: ["'Manrope'", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
