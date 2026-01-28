/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: '#3B82F6', // Blue-500
        secondary: '#6B7280', // Gray-500
        success: '#10B981', // Emerald-500
        warning: '#F59E0B', // Amber-500
        error: '#EF4444', // Red-500
        background: '#F3F4F6', // Gray-100
        card: '#FFFFFF',
      },
      fontFamily: {
        // Ajoute tes polices perso ici si besoin
      }
    },
  },
  plugins: [],
}
