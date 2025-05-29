import { useTheme } from '../contexts/ThemeContext';
import { themeClasses, colors, getColor } from '../styles/designSystem';

export const useDesignSystem = () => {
  const { isDark, theme } = useTheme();
  
  // Функция для получения цвета с учетом текущей темы
  const getThemeColor = (colorPath) => {
    return getColor(theme, colorPath);
  };
  
  // Готовые классы с учетом темы
  const classes = {
    ...themeClasses,
    
    // Дополнительные утилиты
    card: {
      default: `${themeClasses.background.primary} ${themeClasses.border.primary} border rounded-lg shadow-sm`,
      hover: `${themeClasses.background.primary} ${themeClasses.border.primary} border rounded-lg shadow-sm hover:shadow-md ${themeClasses.transition}`,
      interactive: `${themeClasses.background.primary} ${themeClasses.border.primary} border rounded-lg shadow-sm hover:shadow-md cursor-pointer ${themeClasses.transition}`,
    },
    
    input: {
      default: `${themeClasses.background.primary} ${themeClasses.text.primary} ${themeClasses.border.primary} border rounded-lg px-3 py-2 text-sm ${themeClasses.transition} focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400`,
      error: `${themeClasses.background.primary} ${themeClasses.text.primary} border-red-500 dark:border-red-400 rounded-lg px-3 py-2 text-sm ${themeClasses.transition} focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400`,
    },
    
    button: {
      primary: `bg-purple-600 dark:bg-purple-700 text-white hover:bg-purple-700 dark:hover:bg-purple-600 px-4 py-2 rounded-lg font-medium ${themeClasses.transition} ${themeClasses.interactive.focus}`,
      secondary: `${themeClasses.background.secondary} ${themeClasses.text.primary} ${themeClasses.border.primary} border hover:shadow-sm px-4 py-2 rounded-lg font-medium ${themeClasses.transition} ${themeClasses.interactive.focus}`,
      ghost: `${themeClasses.text.secondary} hover:bg-gray-100 dark:hover:bg-gray-800 px-4 py-2 rounded-lg font-medium ${themeClasses.transition}`,
    },
    
    status: {
      success: 'text-green-600 dark:text-green-400',
      error: 'text-red-600 dark:text-red-400',
      warning: 'text-yellow-600 dark:text-yellow-400',
      info: 'text-blue-600 dark:text-blue-400',
    },
    
    badge: {
      success: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-2.5 py-1 rounded-full text-sm font-medium',
      error: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 px-2.5 py-1 rounded-full text-sm font-medium',
      warning: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 px-2.5 py-1 rounded-full text-sm font-medium',
      info: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-2.5 py-1 rounded-full text-sm font-medium',
      default: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 px-2.5 py-1 rounded-full text-sm font-medium',
    }
  };
  
  return {
    isDark,
    theme,
    colors,
    classes,
    getThemeColor,
    
    // Утилиты для создания составных классов
    cn: (...classNames) => classNames.filter(Boolean).join(' '),
    
    // Условные классы
    when: (condition, trueClass, falseClass = '') => condition ? trueClass : falseClass,
  };
}; 