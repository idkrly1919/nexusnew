/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        brand: ['Space Grotesk', 'sans-serif'],
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'orbit-cw': 'orbit-cw 2s linear infinite',
        'orbit-ccw': 'orbit-ccw 3s linear infinite',
        'float-1': 'float-1 12s ease-in-out infinite',
        'float-2': 'float-2 15s ease-in-out infinite',
        'float-3': 'float-3 10s ease-in-out infinite',
        'float-4': 'float-4 18s ease-in-out infinite',
        'float