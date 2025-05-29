import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

// Импорт унифицированных компонентов и дизайн-системы
import { Card, Button, Input, Badge } from './ui';
import { themeClasses } from '../styles/designSystem';

function StockPrices() {
  const [stocks, setStocks] = useState([]);
  const [stockPrices, setStockPrices] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [savingStock, setSavingStock] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // При загрузке компонента получаем список акций и сохраненные цены
  useEffect(() => {
    loadStocks();
    loadSavedPrices();
  }, []);

  // Очистка сообщения об успехе через 3 секунды
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Загрузка списка всех акций из сделок
  const loadStocks = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await axios.get('/api/trades');
      const trades = response.data;
      
      // Извлекаем все уникальные символы акций
      const uniqueStocks = [...new Set(trades.map(trade => trade.symbol))];
      
      // Создаем массив объектов с информацией о каждой акции
      const stocksData = uniqueStocks.map(symbol => {
        const stockTrades = trades.filter(trade => trade.symbol === symbol);
        const openTrades = stockTrades.filter(trade => !trade.exitDate);
        const lastTrade = stockTrades.sort((a, b) => 
          new Date(b.entryDate) - new Date(a.entryDate)
        )[0];
        
        return {
          symbol,
          lastTradeDate: lastTrade?.entryDate,
          openPositions: openTrades.length,
          totalPositions: stockTrades.length,
          lastPrice: lastTrade?.entryPrice,
          tradeIds: openTrades.map(trade => trade.id)
        };
      });
      
      // Сортировка: сначала акции с открытыми позициями, затем по алфавиту
      stocksData.sort((a, b) => {
        if (a.openPositions > 0 && b.openPositions === 0) return -1;
        if (a.openPositions === 0 && b.openPositions > 0) return 1;
        return a.symbol.localeCompare(b.symbol);
      });
      
      setStocks(stocksData);
    } catch (err) {
      console.error('Error loading stocks:', err);
      setError('Не удалось загрузить данные об акциях');
    } finally {
      setLoading(false);
    }
  };

  // Загрузка сохраненных цен из localStorage
  const loadSavedPrices = () => {
    try {
      const savedPrices = localStorage.getItem('stockPrices');
      console.log('DEBUG: Saved stock prices:', savedPrices);
      if (savedPrices) {
        setStockPrices(JSON.parse(savedPrices));
      }
    } catch (e) {
      console.error('Error loading saved prices:', e);
    }
  };

  // Обновление цены акции в localStorage
  const updateStockPrice = (symbol, price) => {
    const updatedPrices = {
      ...stockPrices,
      [symbol]: price ? parseFloat(price) : ''
    };
    
    setStockPrices(updatedPrices);
    
    // Сохраняем в localStorage
    try {
      localStorage.setItem('stockPrices', JSON.stringify(updatedPrices));
    } catch (e) {
      console.error('Error saving prices to localStorage:', e);
    }
  };

  // Сохранение текущего курса как последней цены сделки
  const saveAsLastPrice = async (stock) => {
    if (!stockPrices[stock.symbol] || isNaN(parseFloat(stockPrices[stock.symbol]))) {
      setError(`Введите корректный курс для ${stock.symbol} перед сохранением`);
      return;
    }

    // Устанавливаем индикатор сохранения
    setSavingStock(stock.symbol);
    setError('');

    try {
      // Сохраняем курс только в localStorage
      // Фактическая функциональность обновления цен в базе данных отключена из-за ошибок API
      // В реальном приложении здесь был бы запрос к API
      
      // Сохраняем курс в localStorage (это уже сделано ранее при вводе)
      // для надежности делаем еще раз
      const updatedPrices = {
        ...stockPrices,
        [stock.symbol]: parseFloat(stockPrices[stock.symbol])
      };
      
      localStorage.setItem('stockPrices', JSON.stringify(updatedPrices));
      
      // Показываем сообщение об успехе
      if (stock.openPositions > 0) {
        setSuccessMessage(`Курс для ${stock.symbol} успешно сохранен!`);
      } else {
        setSuccessMessage(`Курс для ${stock.symbol} сохранен (нет открытых позиций)`);
      }
      
      // Небольшая задержка для лучшего взаимодействия
      setTimeout(() => {
        setSavingStock(null);
      }, 500);
    } catch (err) {
      console.error('Error saving price:', err);
      setError(`Не удалось сохранить курс для ${stock.symbol}`);
      setSavingStock(null);
    }
  };

  // Функция для сброса курсов акций
  const resetStockPrices = () => {
    try {
      localStorage.removeItem('stockPrices');
      setStockPrices({});
      setSuccessMessage('Курсы акций сброшены');
    } catch (e) {
      console.error('Error resetting stock prices:', e);
      setError('Не удалось сбросить курсы акций');
    }
  };

  // Функция для инициализации курсов акций значениями по умолчанию
  const initializeDefaultPrices = () => {
    try {
      // Создаем объект с ценами всех акций равными их последним ценам сделок
      const defaultPrices = {};
      stocks.forEach(stock => {
        if (stock.lastPrice && stock.openPositions > 0) {
          defaultPrices[stock.symbol] = parseFloat(stock.lastPrice);
        }
      });

      // Сохраняем в localStorage
      localStorage.setItem('stockPrices', JSON.stringify(defaultPrices));
      setStockPrices(defaultPrices);
      setSuccessMessage('Курсы акций инициализированы значениями по умолчанию');
    } catch (e) {
      console.error('Error initializing default prices:', e);
      setError('Не удалось инициализировать курсы акций');
    }
  };

  // Фильтрация акций по поисковому запросу
  const filteredStocks = stocks.filter(stock => 
    stock.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-purple-600 border-r-2 border-b-2 border-transparent"></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${themeClasses.background.secondary} ${themeClasses.transition}`}>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className={`text-2xl font-medium ${themeClasses.text.primary} mb-2`}>
            Курсы акций
          </h1>
          <p className={`${themeClasses.text.secondary}`}>
            Управление текущими курсами акций для расчета потенциальной прибыли
          </p>
        </div>

        {/* Сообщения */}
        {error && (
          <Card variant="default" className="mb-6 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30">
            <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
          </Card>
        )}

        {successMessage && (
          <Card variant="default" className="mb-6 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/30">
            <p className="text-green-700 dark:text-green-300 text-sm">{successMessage}</p>
          </Card>
        )}

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div className="flex gap-3 items-center">
            <button 
              onClick={resetStockPrices}
              className="px-3 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-gray-400"
            >
              Сбросить курсы
            </button>
            <button 
              onClick={initializeDefaultPrices}
              className="px-3 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-gray-400"
            >
              Инициализировать
            </button>
            <div className="relative w-full sm:w-64">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Поиск акций..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 placeholder-gray-400 focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
              />
            </div>
          </div>
        </div>

        {filteredStocks.length === 0 ? (
          <Card className="text-center py-8">
            <div className={`${themeClasses.text.tertiary} mb-4`}>
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className={`text-lg font-medium ${themeClasses.text.primary} mb-2`}>
              Нет активных позиций
            </h3>
            <p className={`${themeClasses.text.secondary}`}>
              Создайте сделки, чтобы управлять курсами акций
            </p>
          </Card>
        ) : (
          <>
            {/* Информационная панель */}
            <Card className="mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className={`text-lg font-medium ${themeClasses.text.primary} mb-1`}>
                    Активные позиции
                  </h2>
                  <p className={`text-sm ${themeClasses.text.secondary}`}>
                    Найдено {filteredStocks.length} уникальных акций в открытых позициях
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="primary"
                    onClick={initializeDefaultPrices}
                    size="sm"
                  >
                    Инициализировать все курсы
                  </Button>
                </div>
              </div>
            </Card>

            {/* Список акций */}
            <div className="space-y-4">
              {filteredStocks.map((stock) => (
                <Card key={stock.symbol}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className={`text-lg font-medium ${themeClasses.text.primary}`}>
                            {stock.symbol}
                          </h3>
                          {stockPrices[stock.symbol] && (
                            <Badge variant="success" size="sm">
                              {parseFloat(stockPrices[stock.symbol]).toLocaleString('ru-RU', {
                                style: 'currency',
                                currency: 'RUB',
                                maximumFractionDigits: 2
                              })}
                            </Badge>
                          )}
                        </div>
                        <p className={`text-sm ${themeClasses.text.secondary}`}>
                          Открытых позиций: {stock.openPositions}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Новая цена"
                          value={stockPrices[stock.symbol] || ''}
                          onChange={(e) => updateStockPrice(stock.symbol, e.target.value)}
                          size="sm"
                          className="w-32"
                        />
                        <span className={`text-sm ${themeClasses.text.tertiary}`}>₽</span>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => saveAsLastPrice(stock)}
                          disabled={savingStock === stock.symbol || !stockPrices[stock.symbol]}
                          loading={savingStock === stock.symbol}
                        >
                          {savingStock === stock.symbol ? (
                            <span className="flex items-center">
                              <span className="w-3 h-3 mr-2 rounded-full border-2 border-t-transparent border-white animate-spin"></span>
                              Сохранение...
                            </span>
                          ) : (
                            'Сохранить'
                          )}
                        </Button>

                        {stock.openPositions > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => resetStockPrices()}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Информация о хранении */}
            <Card variant="secondary" className="mt-8">
              <div className="flex items-start gap-3">
                <div className={`${themeClasses.text.info} mt-1`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className={`font-medium ${themeClasses.text.primary} mb-1`}>
                    О хранении данных
                  </h3>
                  <p className={`text-sm ${themeClasses.text.secondary}`}>
                    Курсы акций сохраняются локально в браузере и используются для расчета 
                    потенциальной прибыли по открытым позициям. Данные автоматически загружаются 
                    при каждом посещении страницы статистики.
                  </p>
                </div>
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

export default StockPrices; 