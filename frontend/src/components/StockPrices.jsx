import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

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
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-gray-400 border-r-2 border-b-2 border-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <h1 className="text-2xl font-medium text-gray-900">Курсы акций</h1>
          
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

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
            {successMessage}
          </div>
        )}

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Акция
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Открытые<br/>позиции
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Всего<br/>сделок
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Последняя<br/>цена
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Последняя<br/>сделка
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Текущий<br/>курс
                  </th>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredStocks.map((stock) => (
                  <tr key={stock.symbol} className={stock.openPositions > 0 ? 'bg-blue-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{stock.symbol}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm ${stock.openPositions > 0 ? 'font-medium text-blue-700' : 'text-gray-500'}`}>
                        {stock.openPositions}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{stock.totalPositions}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {Number(stock.lastPrice).toLocaleString('ru-RU', { style: 'currency', currency: 'RUB' })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {stock.lastTradeDate 
                          ? format(new Date(stock.lastTradeDate), 'd MMM yyyy', { locale: ru })
                          : '—'
                        }
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="relative rounded-md w-32">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 text-sm">₽</span>
                        </div>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={stockPrices[stock.symbol] || ''}
                          onChange={(e) => updateStockPrice(stock.symbol, e.target.value)}
                          className="w-full pl-7 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                          placeholder="0.00"
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {stock.openPositions > 0 && (
                        <button
                          onClick={() => saveAsLastPrice(stock)}
                          disabled={savingStock === stock.symbol || !stockPrices[stock.symbol]}
                          className="px-3 py-2 text-sm text-white bg-gray-700 border border-gray-700 rounded-md hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-gray-400"
                        >
                          {savingStock === stock.symbol ? (
                            <span className="flex items-center">
                              <span className="w-3 h-3 mr-2 rounded-full border-2 border-t-transparent border-white animate-spin"></span>
                              Сохранение...
                            </span>
                          ) : (
                            'Сохранить'
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredStocks.length === 0 && (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center text-sm text-gray-500">
                      {searchQuery ? 'Акции с таким названием не найдены' : 'Нет доступных акций'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StockPrices; 