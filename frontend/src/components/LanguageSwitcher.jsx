import React from 'react';
import { useTranslation } from 'react-i18next';

const LanguageSwitcher = () => {
  const { i18n, t } = useTranslation();

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  const languages = [
    { code: 'ru', name: 'Русский', flag: '🇷🇺' },
    { code: 'en', name: 'English', flag: '🇺🇸' }
  ];

  return (
    <div className="relative inline-block text-left">
      <div className="flex items-center space-x-2">
        <span className="text-sm text-gray-700 dark:text-gray-300">
          {t('common.language')}:
        </span>
        <div className="flex space-x-1">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => changeLanguage(lang.code)}
              className={`
                px-2 py-1 rounded text-sm font-medium transition-colors
                ${
                  i18n.language === lang.code
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                    : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
                }
              `}
              title={lang.name}
            >
              {lang.flag}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LanguageSwitcher; 