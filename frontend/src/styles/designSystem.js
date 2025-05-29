// Единая дизайн-система для приложения Portfolio Risk

export const colors = {
  // Основные цвета бренда
  primary: {
    50: '#f0f0ff',
    100: '#e6e6ff', 
    200: '#d1d1ff',
    300: '#b3b3ff',
    400: '#8a8aff',
    500: '#6b7280', // Основной серый
    600: '#5a5a6b',
    700: '#4a4a5a',
    800: '#3a3a48',
    900: '#2a2a36',
  },

  // Акцентные цвета
  accent: {
    purple: {
      light: '#a855f7',
      main: '#9333ea',
      dark: '#7c3aed',
    },
    blue: {
      light: '#3b82f6',
      main: '#2563eb', 
      dark: '#1d4ed8',
    },
  },

  // Семантические цвета
  success: {
    light: '#10b981',
    main: '#059669',
    dark: '#047857',
  },
  
  error: {
    light: '#ef4444',
    main: '#dc2626',
    dark: '#b91c1c',
  },
  
  warning: {
    light: '#f59e0b',
    main: '#d97706',
    dark: '#b45309',
  },

  // Нейтральные цвета для светлой темы
  light: {
    background: {
      primary: '#ffffff',
      secondary: '#f9fafb',
      tertiary: '#f3f4f6',
    },
    text: {
      primary: '#111827',
      secondary: '#6b7280',
      tertiary: '#9ca3af',
    },
    border: {
      primary: '#e5e7eb',
      secondary: '#d1d5db',
      focus: '#3b82f6',
    },
  },

  // Нейтральные цвета для темной темы
  dark: {
    background: {
      primary: '#111827',
      secondary: '#1f2937',
      tertiary: '#374151',
    },
    text: {
      primary: '#f9fafb',
      secondary: '#d1d5db',
      tertiary: '#9ca3af',
    },
    border: {
      primary: '#374151',
      secondary: '#4b5563',
      focus: '#60a5fa',
    },
  },
};

export const spacing = {
  xs: '0.25rem',    // 4px
  sm: '0.5rem',     // 8px
  md: '0.75rem',    // 12px
  lg: '1rem',       // 16px
  xl: '1.25rem',    // 20px
  '2xl': '1.5rem',  // 24px
  '3xl': '2rem',    // 32px
  '4xl': '2.5rem',  // 40px
  '5xl': '3rem',    // 48px
};

export const borderRadius = {
  none: '0',
  sm: '0.25rem',
  md: '0.375rem',
  lg: '0.5rem',
  xl: '0.75rem',
  '2xl': '1rem',
  full: '9999px',
};

export const shadows = {
  light: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
  },
  dark: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.4)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.6)',
  },
};

export const typography = {
  fontSize: {
    xs: '0.75rem',     // 12px
    sm: '0.875rem',    // 14px
    base: '1rem',      // 16px
    lg: '1.125rem',    // 18px
    xl: '1.25rem',     // 20px
    '2xl': '1.5rem',   // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem',  // 36px
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  lineHeight: {
    tight: '1.25',
    normal: '1.5',
    relaxed: '1.75',
  },
};

export const transitions = {
  fast: 'all 0.15s ease',
  normal: 'all 0.2s ease',
  slow: 'all 0.3s ease',
  colors: 'color 0.2s ease, background-color 0.2s ease, border-color 0.2s ease',
};

// Utility функции для работы с темами
export const getColor = (theme, path) => {
  const [category, ...rest] = path.split('.');
  
  if (category === 'light' || category === 'dark') {
    return colors[theme][rest.join('.')];
  }
  
  // Для семантических цветов (success, error, etc.)
  return colors[category]?.[rest.join('.')] || colors[path];
};

// Готовые классы для Tailwind
export const themeClasses = {
  // Фоны
  background: {
    primary: 'bg-white dark:bg-gray-900',
    secondary: 'bg-gray-50 dark:bg-gray-800', 
    tertiary: 'bg-gray-100 dark:bg-gray-700',
  },
  
  // Текст
  text: {
    primary: 'text-gray-900 dark:text-gray-100',
    secondary: 'text-gray-600 dark:text-gray-400',
    tertiary: 'text-gray-500 dark:text-gray-500',
    accent: 'text-purple-600 dark:text-purple-400',
  },
  
  // Границы
  border: {
    primary: 'border-gray-200 dark:border-gray-700',
    secondary: 'border-gray-300 dark:border-gray-600',
    focus: 'border-blue-500 dark:border-blue-400',
  },
  
  // Интерактивные состояния
  interactive: {
    hover: 'hover:bg-gray-50 dark:hover:bg-gray-800',
    focus: 'focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400',
    disabled: 'disabled:opacity-50 disabled:cursor-not-allowed',
  },
  
  // Переходы
  transition: 'transition-colors duration-200',
}; 