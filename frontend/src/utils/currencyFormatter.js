/**
 * Форматирует сумму в соответствии с валютой портфеля
 * @param {number} amount - Сумма для форматирования
 * @param {string} currency - Код валюты (USD, RUB, EUR и т.д.)
 * @param {number} minimumFractionDigits - Минимальное количество знаков после запятой
 * @returns {string} Отформатированная строка валюты
 */
export const formatCurrency = (amount, currency = 'USD', minimumFractionDigits = 2) => {
  if (isNaN(amount)) return '-';
  
  // Настройки локали в зависимости от валюты
  const localeMap = {
    'RUB': 'ru-RU',
    'USD': 'en-US', 
    'EUR': 'de-DE',
    'CNY': 'zh-CN',
    'KZT': 'kk-KZ'
  };

  const locale = localeMap[currency] || 'en-US';
  
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: minimumFractionDigits,
    maximumFractionDigits: minimumFractionDigits
  }).format(amount);
};

/**
 * Форматирует сумму с автоматическим определением валюты из портфеля
 * @param {number} amount - Сумма для форматирования
 * @param {object} portfolio - Объект портфеля с полем currency
 * @param {number} minimumFractionDigits - Минимальное количество знаков после запятой
 * @returns {string} Отформатированная строка валюты
 */
export const formatPortfolioCurrency = (amount, portfolio, minimumFractionDigits = 2) => {
  const currency = portfolio?.currency || 'USD';
  return formatCurrency(amount, currency, minimumFractionDigits);
};

/**
 * Получает символ валюты
 * @param {string} currency - Код валюты
 * @returns {string} Символ валюты
 */
export const getCurrencySymbol = (currency) => {
  const symbols = {
    'USD': '$',
    'RUB': '₽',
    'EUR': '€',
    'CNY': '¥',
    'KZT': '₸'
  };
  return symbols[currency] || currency;
};

/**
 * Получает название валюты
 * @param {string} currency - Код валюты
 * @returns {string} Полное название валюты
 */
export const getCurrencyName = (currency) => {
  const names = {
    'USD': 'Доллар США',
    'RUB': 'Российский рубль',
    'EUR': 'Евро',
    'CNY': 'Китайский юань',
    'KZT': 'Казахстанский тенге'
  };
  return names[currency] || currency;
}; 