import React from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { useTheme } from '../../contexts/ThemeContext';

// Кастомные стили для тостов в соответствии с темой
const createToastOptions = (isDark) => ({
  duration: 4000,
  position: 'top-right',
  style: {
    background: isDark ? '#374151' : '#ffffff',
    color: isDark ? '#f9fafb' : '#111827',
    border: `1px solid ${isDark ? '#4b5563' : '#e5e7eb'}`,
    borderRadius: '8px',
    boxShadow: isDark 
      ? '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.1)'
      : '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    fontSize: '14px',
    fontWeight: '400',
    maxWidth: '420px',
  },
  success: {
    iconTheme: {
      primary: '#10b981',
      secondary: isDark ? '#374151' : '#ffffff',
    },
    style: {
      border: `1px solid ${isDark ? '#065f46' : '#10b981'}`,
      background: isDark ? '#064e3b' : '#f0fdf4',
    },
  },
  error: {
    iconTheme: {
      primary: '#ef4444',
      secondary: isDark ? '#374151' : '#ffffff',
    },
    style: {
      border: `1px solid ${isDark ? '#7f1d1d' : '#ef4444'}`,
      background: isDark ? '#7f1d1d' : '#fef2f2',
    },
  },
  loading: {
    iconTheme: {
      primary: isDark ? '#8b5cf6' : '#7c3aed',
      secondary: isDark ? '#374151' : '#ffffff',
    },
  },
});

// Компонент Toaster с правильными стилями для темы
export const CustomToaster = () => {
  const { isDark } = useTheme();
  const options = createToastOptions(isDark);

  return (
    <Toaster
      position={options.position}
      toastOptions={options}
      containerStyle={{
        top: 20,
        right: 20,
      }}
    />
  );
};

// Утилиты для показа разных типов тостов
export const showToast = {
  success: (message, options = {}) => {
    return toast.success(message, {
      duration: 4000,
      ...options
    });
  },

  error: (message, options = {}) => {
    return toast.error(message, {
      duration: 6000,
      ...options
    });
  },

  loading: (message, options = {}) => {
    return toast.loading(message, {
      duration: Infinity,
      ...options
    });
  },

  promise: (promise, messages) => {
    return toast.promise(promise, {
      loading: messages.loading || 'Загрузка...',
      success: messages.success || 'Успешно!',
      error: messages.error || 'Произошла ошибка',
    });
  },

  custom: (content, options = {}) => {
    return toast.custom(content, {
      duration: 4000,
      ...options
    });
  },

  dismiss: (toastId) => {
    if (toastId) {
      toast.dismiss(toastId);
    } else {
      toast.dismiss();
    }
  },
};

// Кастомный компонент тоста с дополнительными опциями
export const CustomToast = ({ 
  title, 
  message, 
  type = 'default', 
  action,
  onClose 
}) => {
  const { isDark } = useTheme();

  const typeStyles = {
    default: {
      icon: '💬',
      borderColor: isDark ? '#4b5563' : '#e5e7eb',
      bgColor: isDark ? '#374151' : '#ffffff',
    },
    success: {
      icon: '✅',
      borderColor: isDark ? '#065f46' : '#10b981',
      bgColor: isDark ? '#064e3b' : '#f0fdf4',
    },
    error: {
      icon: '❌',
      borderColor: isDark ? '#7f1d1d' : '#ef4444',
      bgColor: isDark ? '#7f1d1d' : '#fef2f2',
    },
    warning: {
      icon: '⚠️',
      borderColor: isDark ? '#78350f' : '#f59e0b',
      bgColor: isDark ? '#78350f' : '#fffbeb',
    },
    info: {
      icon: 'ℹ️',
      borderColor: isDark ? '#1e3a8a' : '#3b82f6',
      bgColor: isDark ? '#1e3a8a' : '#eff6ff',
    },
  };

  const currentStyle = typeStyles[type] || typeStyles.default;

  return (
    <div 
      className={`flex items-start space-x-3 p-4 rounded-lg border max-w-sm`}
      style={{
        borderColor: currentStyle.borderColor,
        backgroundColor: currentStyle.bgColor,
      }}
    >
      <div className="flex-shrink-0 text-lg">
        {currentStyle.icon}
      </div>
      
      <div className="flex-1 min-w-0">
        {title && (
          <p className={`font-medium text-sm ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
            {title}
          </p>
        )}
        {message && (
          <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'} ${title ? 'mt-1' : ''}`}>
            {message}
          </p>
        )}
        {action && (
          <div className="mt-3">
            {action}
          </div>
        )}
      </div>

      {onClose && (
        <button
          onClick={onClose}
          className={`flex-shrink-0 rounded-md p-1 ${isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-500'} focus:outline-none`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
};

// Хелперы для часто используемых тостов
export const showTradeToast = {
  created: (symbol) => showToast.success(`Сделка ${symbol} создана!`),
  updated: (symbol) => showToast.success(`Сделка ${symbol} обновлена!`),
  deleted: (symbol) => showToast.success(`Сделка ${symbol} удалена`),
  closed: (symbol) => showToast.success(`Позиция ${symbol} закрыта!`),
  error: (message) => showToast.error(`Ошибка: ${message}`),
  
  saving: (symbol) => showToast.loading(`Сохранение сделки ${symbol}...`),
  importing: () => showToast.loading('Импорт данных...'),
  exporting: () => showToast.loading('Экспорт в PDF...'),
};

export default CustomToaster; 