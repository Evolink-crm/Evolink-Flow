/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef4ff', 100: '#dbe6ff', 200: '#bccfff', 300: '#8fadff',
          400: '#5b82ff', 500: '#3a5cff', 600: '#2540f0', 700: '#1d31cc',
          800: '#1c2ca3', 900: '#1d2b80'
        }
      },
      boxShadow: { soft: '0 4px 24px rgba(15,23,42,0.06)' }
    }
  },
  plugins: []
}
