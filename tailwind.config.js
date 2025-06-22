/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand': {
          blue: {
            100: '#e6f2ff',
            200: '#b3d9ff',
            300: '#80bfff',
            400: '#4da6ff',
            500: '#007aff',
            600: '#0062cc',
            700: '#0049a6',
            800: '#003173',
            900: '#00185c',
          },
          green: {
            100: '#edfcf4',
            200: '#d1f5e0',
            300: '#a3eecc',
            400: '#70e4b5',
            500: '#34c759',
            600: '#28a048',
            700: '#1a6b30',
            800: '#104d22',
            900: '#0a3819',
          },
          yellow: {
            100: '#fff9e6',
            200: '#ffedb3',
            300: '#ffe080',
            400: '#ffd44d',
            500: '#ffcc00',
            600: '#cca300',
            700: '#997a00',
            800: '#665200',
            900: '#332900',
          },
          red: {
            100: '#ffe6e6',
            200: '#ffb3b3',
            300: '#ff8080',
            400: '#ff4d4d',
            500: '#ff3b30',
            600: '#cc2f26',
            700: '#992319',
            800: '#66180f',
            900: '#330c08',
          },
        },
      },
      boxShadow: {
        'card': '0 4px 12px rgba(0, 0, 0, 0.05)',
        'card-hover': '0 8px 24px rgba(0, 0, 0, 0.1)',
        'button': '0 1px 2px rgba(0, 0, 0, 0.05)',
      },
      keyframes: {
        fade: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-in': 'fade 0.2s ease-out forwards',
        'scale-in': 'scaleIn 0.2s ease-out forwards',
      },
    },
    fontFamily: {
      sans: [
        'Inter var',
        'system-ui',
        '-apple-system',
        'BlinkMacSystemFont',
        'Segoe UI',
        'Roboto',
        'Helvetica Neue',
        'Arial',
        'sans-serif',
      ],
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
} 