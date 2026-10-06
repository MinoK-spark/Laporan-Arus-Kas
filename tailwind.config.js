/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        corporate: {
          50: '#f0f5fa',
          100: '#e1ecf5',
          200: '#c3d9eb',
          300: '#94bcdd',
          400: '#5e9bcb',
          500: '#387eb7',
          600: '#276499',
          700: '#1f507c',
          800: '#1d4467',
          900: '#1a3a55',
          950: '#0f2438',
        },
        navy: {
          800: '#0f1f38',
          900: '#0a1628',
          950: '#060d1a',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 4px 20px -2px rgba(15, 31, 56, 0.08), 0 2px 6px -1px rgba(15, 31, 56, 0.04)',
        'card-hover': '0 10px 25px -4px rgba(15, 31, 56, 0.12), 0 4px 10px -2px rgba(15, 31, 56, 0.06)',
      }
    },
  },
  plugins: [],
}
