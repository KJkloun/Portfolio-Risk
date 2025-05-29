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
    if (event.ctrlKey || event.metaKey) combo.push('cmd');
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
  // Навигация
  NEW_TRADE: 'alt+n',
  SAVE: 'alt+s',
  EDIT: 'alt+e',
  DELETE: 'alt+d',
  SEARCH: 'alt+f',
  
  // Быстрые действия
  QUICK_ENTRY: 'alt+shift+n',
  BULK_IMPORT: 'alt+shift+i',
  EXPORT_PDF: 'alt+shift+p',
  
  // UI
  TOGGLE_THEME: 'alt+shift+t',
  CLOSE_MODAL: 'escape',
  
  // Вкладки/страницы
  TRADES_TAB: 'alt+1',
  STATISTICS_TAB: 'alt+2',
  PRICES_TAB: 'alt+3',
  IMPORT_TAB: 'alt+4',
};

// Хелпер для отображения комбинаций клавиш в UI
export const formatShortcut = (shortcut) => {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  
  return shortcut
    .replace('cmd', isMac ? '⌘' : 'Ctrl')
    .replace('alt', isMac ? '⌥' : 'Alt')
    .replace('shift', isMac ? '⇧' : 'Shift')
    .replace(/\+/g, ' + ')  // Заменяем все + на пробелы с +
    .split(' + ')           // Разделяем по +
    .map(part => part.toUpperCase())  // Делаем каждую часть заглавной
    .join(' + ');           // Соединяем обратно
};

export default useKeyboardShortcuts; 