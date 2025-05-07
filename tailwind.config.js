/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        montserrat: ['Montserrat', 'sans-serif'],
      },
      height: {
        'input': '2.75rem', // 44px
      },
      colors: {
        primary: {
          DEFAULT: '#475569', // slate-600
          light: '#64748b', // slate-500
          dark: '#334155', // slate-700
        },
        accent: {
          DEFAULT: '#6b7280', // gray-500
          light: '#9ca3af', // gray-400
          dark: '#4b5563', // gray-600
        },
        background: {
          DEFAULT: '#f8fafc', // slate-50
          alt: '#f1f5f9', // slate-100
        },
        border: {
          DEFAULT: '#e2e8f0', // slate-200
          dark: '#cbd5e1', // slate-300
        }
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}