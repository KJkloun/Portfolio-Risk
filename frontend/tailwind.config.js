/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Включаем поддержку темной темы через класс
  theme: {
    extend: {
      colors: {
        // Цвета в стиле ТОП российских банков (Тинькофф, Сбер, ВТБ, Альфа)
        brand: {
          // Основной синий (Сбер, ВТБ) 
          blue: {
            50: '#e6f1ff',
            100: '#cce3ff',
            200: '#99c8ff',
            300: '#66acff', 
            400: '#3391ff',
            500: '#0075FF', // Основной брендовый цвет
            600: '#005ecb',
            700: '#004798',
            800: '#002f64',
            900: '#001832',
          },
          // Зеленый цвет (Сбер)
          green: {
            50: '#e6f7eb',
            100: '#ccf0d6',
            200: '#99e0ae',
            300: '#66d185',
            400: '#33c15d',
            500: '#00B234', // Сбер-зеленый
            600: '#008e29',
            700: '#006b1f',
            800: '#004714',
            900: '#00240a',
          },
          // Желтый (Тинькофф, Райффайзен)
          yellow: {
            50: '#fffce6',
            100: '#fff9cc',
            200: '#fff399',
            300: '#ffec66',
            400: '#ffe633',
            500: '#FFDD00', // Тинькофф желтый
            600: '#ccb100',
            700: '#998500',
            800: '#665800',
            900: '#332c00',
          },
          // Красный (Альфа, МТС)
          red: {
            50: '#ffe6e6',
            100: '#ffcccc',
            200: '#ff9999',
            300: '#ff6666',
            400: '#ff3333',
            500: '#ED0000', // Альфа-банк красный
            600: '#ba0000',
            700: '#8b0000',
            800: '#5c0000',
            900: '#2e0000',
          },
        },
        // Дополнительные цвета для темной темы
        dark: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        }
      },
      fontFamily: {
        sans: ['Inter var', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
      boxShadow: {
        'card': '0 4px 20px rgba(0, 0, 0, 0.08)',
        'card-hover': '0 10px 30px rgba(0, 0, 0, 0.12)',
        'button': '0 2px 5px rgba(0, 0, 0, 0.1)',
        'card-dark': '0 4px 20px rgba(0, 0, 0, 0.3)',
        'card-hover-dark': '0 10px 30px rgba(0, 0, 0, 0.4)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
