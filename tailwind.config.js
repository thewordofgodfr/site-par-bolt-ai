/** @type {import('tailwindcss').Config} */
export default {
  // ⬅️ indispensable pour piloter le thème via la classe .dark
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
};
