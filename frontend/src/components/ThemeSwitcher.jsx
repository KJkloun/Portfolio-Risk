import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';

const ThemeSwitcher = () => {
  const { theme, toggleTheme, setLightTheme, setDarkTheme, setSystemTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const themes = [
    {
      id: 'light',
      name: 'Светлая',
      icon: '☀️',
      description: 'Светлая тема для дневного использования'
    },
    {
      id: 'dark',
      name: 'Тёмная',
      icon: '🌙',
      description: 'Тёмная тема для комфортной работы в темноте'
    },
    {
      id: 'system',
      name: 'Системная',
      icon: '💻',
      description: 'Следует настройкам системы'
    }
  ];

  const handleThemeChange = (themeId) => {
    switch (themeId) {
      case 'light':
        setLightTheme();
        break;
      case 'dark':
        setDarkTheme();
        break;
      case 'system':
        setSystemTheme();
        break;
      default:
        break;
    }
    setIsOpen(false);
  };

  const getCurrentThemeIcon = () => {
    if (theme === 'dark') return '🌙';
    if (theme === 'light') return '☀️';
    return '💻';
  };

  return (
    <div className="relative">
      {/* Кнопка переключения темы */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
        title="Переключить тему"
      >
        <span className="text-lg">{getCurrentThemeIcon()}</span>
      </button>

      {/* Выпадающее меню */}
      {isOpen && (
        <>
          {/* Overlay для закрытия меню */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Меню выбора темы */}
          <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20 overflow-hidden">
            <div className="p-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Выберите тему
              </h3>
            </div>
            
            <div className="py-1">
              {themes.map((themeOption) => (
                <button
                  key={themeOption.id}
                  onClick={() => handleThemeChange(themeOption.id)}
                  className={`w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150 ${
                    (themeOption.id === theme || 
                     (themeOption.id === 'system' && !localStorage.getItem('portfolio-risk-theme')))
                      ? 'bg-purple-50 dark:bg-purple-900/20 border-r-2 border-purple-500'
                      : ''
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">{themeOption.icon}</span>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {themeOption.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {themeOption.description}
                      </div>
                    </div>
                    {(themeOption.id === theme || 
                      (themeOption.id === 'system' && !localStorage.getItem('portfolio-risk-theme'))) && (
                      <svg className="w-4 h-4 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </button>
              ))}
            </div>
            
            {/* Быстрое переключение */}
            <div className="p-3 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  toggleTheme();
                  setIsOpen(false);
                }}
                className="w-full px-3 py-2 text-sm text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-md transition-colors duration-150"
              >
                🔄 Быстрое переключение
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ThemeSwitcher; 