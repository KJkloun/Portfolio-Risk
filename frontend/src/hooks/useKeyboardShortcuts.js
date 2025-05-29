import { useEffect, useCallback } from 'react';

const useKeyboardShortcuts = (shortcuts = {}) => {
  const handleKeyDown = useCallback((event) => {
    // Проверяем, что фокус не на input/textarea элементах
    const activeElement = document.activeElement;
    const isInputFocused = activeElement && (
      activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA' ||
      activeElement.contentEditable === 'true' ||
      activeElement.getAttribute('role') === 'textbox'
    );

    // Создаем строку комбинации клавиш
    const combo = [];
    if (event.ctrlKey || event.metaKey) combo.push('ctrl');
    if (event.altKey) combo.push('alt');
    if (event.shiftKey) combo.push('shift');
    combo.push(event.key.toLowerCase());
    
    const shortcut = combo.join('+');

    // Проверяем, есть ли обработчик для этой комбинации
    if (shortcuts[shortcut]) {
      // Для некоторых действий разрешаем работу даже с фокусом на input
      const allowInInput = shortcuts[shortcut].allowInInput || false;
      
      if (!isInputFocused || allowInInput) {
        event.preventDefault();
        shortcuts[shortcut].action(event);
      }
    }
  }, [shortcuts]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return null;
};

// Предустановленные комбинации клавиш
export const SHORTCUTS = {
  // Навигация (используем shift+ для безопасности)
  NEW_TRADE: 'shift+n',        // Безопасная комбинация
  SAVE: 'shift+s',             // Безопасная комбинация
  EDIT: 'shift+e',             // Безопасная комбинация  
  DELETE: 'shift+d',           // Безопасная комбинация
  SEARCH: 'shift+f',           // Безопасная комбинация
  
  // Быстрые действия
  QUICK_ENTRY: 'shift+q',      // Быстрая сделка
  BULK_IMPORT: 'shift+i',      // Импорт
  EXPORT_PDF: 'shift+p',       // Экспорт
  
  // UI
  TOGGLE_THEME: 'shift+t',     // Переключение темы
  CLOSE_MODAL: 'escape',
  
  // Вкладки/страницы - используем буквы
  TRADES_TAB: 'shift+1',       // Список сделок
  STATISTICS_TAB: 'shift+2',   // Статистика
  PRICES_TAB: 'shift+3',       // Курсы акций
  IMPORT_TAB: 'shift+4',       // Импорт данных
};

// Хелпер для отображения комбинаций клавиш в UI
export const formatShortcut = (shortcut) => {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  
  return shortcut
    .replace('cmd', isMac ? '⌘' : 'Ctrl')
    .replace('ctrl', 'Ctrl')
    .replace('alt', isMac ? '⌥' : 'Alt')
    .replace('shift', isMac ? '⇧' : 'Shift')
    .replace(/\+/g, ' + ')  // Заменяем все + на пробелы с +
    .split(' + ')           // Разделяем по +
    .map(part => part.toUpperCase())  // Делаем каждую часть заглавной
    .join(' + ');           // Соединяем обратно
};

export default useKeyboardShortcuts; 