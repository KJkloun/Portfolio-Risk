import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { 
  calculateTotalCost, 
  calculateDailyInterestDirect, 
  calculateProfit, 
  calculateProfitPercentage 
} from '../utils/calculations';
import Button from './common/Button';

function TradeList() {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');
  const [sortBy, setSortBy] = useState('entryDate');
  const [sortOrder, setSortOrder] = useState('desc');
  const [sellPrice, setSellPrice] = useState('');
  const [sellingTrade, setSellingTrade] = useState(null);
  const [view, setView] = useState('all'); // 'all', 'open', 'closed'
  const [groupByMonth, setGroupByMonth] = useState(false);
  const [groupByEntryPrice, setGroupByEntryPrice] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [selectedTrades, setSelectedTrades] = useState({});
  const [selectAllChecked, setSelectAllChecked] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [stockPrices, setStockPrices] = useState({});
  
  // Состояния для дополнительных фильтров
  const [isFilterPanelExpanded, setIsFilterPanelExpanded] = useState(false);
  const [symbolFilter, setSymbolFilter] = useState('');
  const [dateRangeFilter, setDateRangeFilter] = useState({ start: '', end: '' });
  const [profitabilityFilter, setProfitabilityFilter] = useState('all'); // 'all', 'profitable', 'unprofitable'
  const [positionSizeFilter, setPositionSizeFilter] = useState('all'); // 'all', 'small', 'medium', 'large'

  useEffect(() => {
    loadTrades();
    loadSavedStockPrices();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      loadSavedStockPrices();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const loadTrades = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/trades');
      console.log('API response:', response);
      if (Array.isArray(response.data)) {
        setTrades(response.data);
      } else {
        console.error('API returned non-array data:', response.data);
        setTrades([]);
        setError('Данные получены в неверном формате. Пожалуйста, обратитесь к администратору.');
      }
      setError('');
    } catch (err) {
      console.error('Error loading trades:', err);
      setError('Не удалось загрузить сделки. Пожалуйста, попробуйте позже.');
      setTrades([]);
    } finally {
      setLoading(false);
    }
  };

  const loadSavedStockPrices = () => {
    try {
      const savedPrices = localStorage.getItem('stockPrices');
      if (savedPrices) {
        setStockPrices(JSON.parse(savedPrices));
      }
    } catch (e) {
      console.error('Error loading saved stock prices:', e);
    }
  };

  const getCurrentPrice = (symbol) => {
    return stockPrices[symbol] || '';
  };

  // Мемоизированная фильтрация и сортировка сделок
  const filteredAndSortedTrades = useMemo(() => {
    if (!Array.isArray(trades)) return [];
    
    // Определение порогов для размеров позиций на основе данных
    const positionSizes = trades.map(trade => Number(trade.entryPrice) * Number(trade.quantity));
    const validSizes = positionSizes.filter(size => !isNaN(size) && size > 0);
    const avgPositionSize = validSizes.reduce((sum, size) => sum + size, 0) / validSizes.length || 0;
    const smallPositionThreshold = avgPositionSize * 0.5; // 50% от среднего
    const largePositionThreshold = avgPositionSize * 1.5; // 150% от среднего
    
    return trades
      .filter((trade) => {
        // Базовые фильтры (статус и поиск)
        const statusMatch = 
          view === 'all' || 
          (view === 'open' && !trade.exitDate) || 
          (view === 'closed' && trade.exitDate);
        
        const searchMatch = 
          trade.symbol?.toLowerCase().includes(filter.toLowerCase()) ||
          trade.notes?.toLowerCase().includes(filter.toLowerCase());
        
        // Дополнительные фильтры
        // 1. Фильтр по символу
        const symbolMatch = 
          !symbolFilter || trade.symbol?.toLowerCase().includes(symbolFilter.toLowerCase());
        
        // 2. Фильтр по диапазону дат
        let dateMatch = true;
        if (dateRangeFilter.start || dateRangeFilter.end) {
          const entryDate = trade.entryDate ? new Date(trade.entryDate) : null;
          if (dateRangeFilter.start && entryDate) {
            const startDate = new Date(dateRangeFilter.start);
            if (entryDate < startDate) dateMatch = false;
          }
          if (dateRangeFilter.end && entryDate) {
            const endDate = new Date(dateRangeFilter.end);
            endDate.setHours(23, 59, 59, 999); // Конец дня
            if (entryDate > endDate) dateMatch = false;
          }
        }
        
        // 3. Фильтр по прибыльности
        let profitabilityMatch = true;
        if (profitabilityFilter !== 'all' && trade.exitDate && trade.exitPrice) {
          const profit = (Number(trade.exitPrice) - Number(trade.entryPrice)) * Number(trade.quantity);
          if (profitabilityFilter === 'profitable' && profit <= 0) profitabilityMatch = false;
          if (profitabilityFilter === 'unprofitable' && profit > 0) profitabilityMatch = false;
        } else if (profitabilityFilter !== 'all' && !trade.exitDate && trade.entryPrice && stockPrices[trade.symbol]) {
          // Для открытых позиций используем текущий курс
          const currentPrice = Number(stockPrices[trade.symbol]);
          const entryPrice = Number(trade.entryPrice);
          if (!isNaN(currentPrice) && !isNaN(entryPrice) && currentPrice > 0 && entryPrice > 0) {
            const potentialProfit = (currentPrice - entryPrice) * Number(trade.quantity);
            if (profitabilityFilter === 'profitable' && potentialProfit <= 0) profitabilityMatch = false;
            if (profitabilityFilter === 'unprofitable' && potentialProfit > 0) profitabilityMatch = false;
          } else {
            // Если нет данных для оценки прибыльности, показываем во всех категориях
            profitabilityMatch = true;
          }
        }
        
        // 4. Фильтр по размеру позиции
        let positionSizeMatch = true;
        if (positionSizeFilter !== 'all') {
          const positionSize = Number(trade.entryPrice) * Number(trade.quantity);
          if (positionSizeFilter === 'small' && positionSize > smallPositionThreshold) positionSizeMatch = false;
          if (positionSizeFilter === 'medium' && (positionSize <= smallPositionThreshold || positionSize >= largePositionThreshold)) positionSizeMatch = false;
          if (positionSizeFilter === 'large' && positionSize < largePositionThreshold) positionSizeMatch = false;
        }
        
        // Применяем все фильтры вместе
        return statusMatch && searchMatch && symbolMatch && dateMatch && profitabilityMatch && positionSizeMatch;
      })
      .sort((a, b) => {
        let aValue = a[sortBy] || '';
        let bValue = b[sortBy] || '';
        const multiplier = sortOrder === 'asc' ? 1 : -1;

        // Особая обработка для сортировки по суммам и процентам
        if (sortBy === 'totalCost') {
          aValue = Number(a.entryPrice) * Number(a.quantity);
          bValue = Number(b.entryPrice) * Number(b.quantity);
        } else if (sortBy === 'profit' && a.exitPrice && b.exitPrice) {
          aValue = (Number(a.exitPrice) - Number(a.entryPrice)) * Number(a.quantity);
          bValue = (Number(b.exitPrice) - Number(b.entryPrice)) * Number(b.quantity);
        } else if (sortBy === 'marginAmount') {
          aValue = Number(a.marginAmount) || 0;
          bValue = Number(b.marginAmount) || 0;
        } else if (sortBy === 'entryPrice') {
          aValue = Number(a.entryPrice) || 0;
          bValue = Number(b.entryPrice) || 0;
        }

        if (typeof aValue === 'string') {
          return aValue.localeCompare(bValue) * multiplier;
        }
        return (aValue - bValue) * multiplier;
      });
  }, [trades, filter, view, sortBy, sortOrder, symbolFilter, dateRangeFilter, profitabilityFilter, positionSizeFilter]);

  // Группировка по месяцам или цене входа, если включена
  const groupedTrades = useMemo(() => {
    if (!groupByMonth && !groupByEntryPrice) return { ungrouped: filteredAndSortedTrades };
    
    if (groupByMonth) {
      return filteredAndSortedTrades.reduce((groups, trade) => {
        const date = trade.entryDate ? parseISO(trade.entryDate) : new Date();
        const monthKey = format(date, 'yyyy-MM');
        const monthLabel = format(date, 'LLLL yyyy', { locale: ru });
        
        if (!groups[monthKey]) {
          groups[monthKey] = { 
            label: monthLabel, 
            trades: [],
            totalSum: 0,
            totalQuantity: 0
          };
        }
        
        groups[monthKey].trades.push(trade);
        groups[monthKey].totalSum += Number(trade.entryPrice) * Number(trade.quantity);
        groups[monthKey].totalQuantity += Number(trade.quantity);
        return groups;
      }, {});
    }
    
    if (groupByEntryPrice) {
      return filteredAndSortedTrades.reduce((groups, trade) => {
        const entryPrice = Number(trade.entryPrice);
        
        // Определяем диапазоны цен - округляем до ближайших 10
        const priceBase = Math.floor(entryPrice / 10) * 10;
        const priceRange = `${priceBase}-${priceBase + 10}`;
        const priceKey = `price-${priceBase}`;
        
        if (!groups[priceKey]) {
          groups[priceKey] = {
            label: `${priceRange} ₽`,
            trades: [],
            totalSum: 0,
            totalQuantity: 0
          };
        }
        
        groups[priceKey].trades.push(trade);
        groups[priceKey].totalSum += Number(trade.entryPrice) * Number(trade.quantity);
        groups[priceKey].totalQuantity += Number(trade.quantity);
        return groups;
      }, {});
    }
  }, [filteredAndSortedTrades, groupByMonth, groupByEntryPrice]);

  // Переключение состояния группы (свернута/развернута)
  const toggleGroup = (groupKey) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [groupKey]: !prev[groupKey]
    }));
  };

  // Обработчик изменения группировки по месяцам
  const handleGroupByMonthChange = (checked) => {
    setGroupByMonth(checked);
    if (checked) {
      setGroupByEntryPrice(false);
      
      // Если включается группировка, все группы будут свернуты по умолчанию
      const initialCollapsedState = {};
      // Получаем все уникальные ключи месяцев
      filteredAndSortedTrades.forEach(trade => {
        if (trade.entryDate) {
          const date = parseISO(trade.entryDate);
          const monthKey = format(date, 'yyyy-MM');
          initialCollapsedState[monthKey] = true; // true = свернуто
        }
      });
      
      setCollapsedGroups(initialCollapsedState);
    } else if (!groupByEntryPrice) {
      // Сбрасываем состояния только если не включена другая группировка
      setCollapsedGroups({});
    }
  };

  // Обработчик изменения группировки по цене входа
  const handleGroupByEntryPriceChange = (checked) => {
    setGroupByEntryPrice(checked);
    if (checked) {
      setGroupByMonth(false);
      
      // Инициализируем состояние свертывания для ценовых групп
      const initialCollapsedState = {};
      filteredAndSortedTrades.forEach(trade => {
        const entryPrice = Number(trade.entryPrice);
        const priceBase = Math.floor(entryPrice / 10) * 10;
        const priceKey = `price-${priceBase}`;
        initialCollapsedState[priceKey] = true; // true = свернуто
      });
      
      setCollapsedGroups(initialCollapsedState);
    } else if (!groupByMonth) {
      // Сбрасываем состояния только если не включена другая группировка
      setCollapsedGroups({});
    }
  };

  const handleSell = async (trade) => {
    try {
      setError('');
      console.log('Selling trade:', trade, 'at price:', sellPrice);
      const response = await axios.post(`/api/trades/${trade.id}/sell`, null, {
        params: { exitPrice: sellPrice }
      });
      
      console.log('Sell response:', response.data);
      
      if (response.data && response.data.trade) {
        setTrades(prevTrades => 
          prevTrades.map(t => t.id === trade.id ? response.data.trade : t)
        );
        
        const totalInterest = response.data.totalInterest || 0;
        const profit = response.data.profit || 0;
        
        alert(`Сделка закрыта!\nОбщий процент: ${totalInterest.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB' })}\nПрибыль: ${profit.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB' })}`);
      } else {
        console.error('Invalid response format:', response.data);
        alert('Сделка закрыта, но возникла ошибка при обновлении данных');
        loadTrades(); // Перезагрузка данных с сервера
      }
      
      setSellPrice('');
      setSellingTrade(null);
    } catch (err) {
      console.error('Error selling trade:', err);
      setError(err.response?.data?.message || 'Не удалось продать акцию');
    }
  };

  const handleDelete = async (tradeId) => {
    if (window.confirm('Вы уверены, что хотите удалить эту сделку?')) {
      try {
        setError('');
        console.log('Deleting trade:', tradeId);
        await axios.delete(`/api/trades/${tradeId}`);
        console.log('Trade deleted successfully');
        loadTrades();
      } catch (err) {
        console.error('Error deleting trade:', err);
        setError(err.response?.data?.message || 'Не удалось удалить сделку');
      }
    }
  };

  // Helper function for date parsing
  const parseDateLocal = (dateStr) => {
    if (!dateStr) return null;
    const [year, month, day] = dateStr.split('-');
    return new Date(+year, +month - 1, +day);
  };

  // Обработчики для выбора сделок
  const handleToggleSelect = (tradeId) => {
    setSelectedTrades(prev => ({
      ...prev,
      [tradeId]: !prev[tradeId]
    }));
  };

  const handleSelectAll = (checked) => {
    setSelectAllChecked(checked);
    if (checked) {
      const selected = {};
      filteredAndSortedTrades.forEach(trade => {
        selected[trade.id] = true;
      });
      setSelectedTrades(selected);
    } else {
      setSelectedTrades({});
    }
  };

  const getSelectedTradesCount = () => {
    return Object.values(selectedTrades).filter(Boolean).length;
  };

  const handleDeleteSelected = async () => {
    const selectedIds = Object.entries(selectedTrades)
      .filter(([_, selected]) => selected)
      .map(([id]) => parseInt(id));

    if (selectedIds.length === 0) return;

    if (window.confirm(`Вы уверены, что хотите удалить ${selectedIds.length} выбранных сделок?`)) {
      setError('');
      try {
        const promises = selectedIds.map(id => axios.delete(`/api/trades/${id}`));
        await Promise.all(promises);
        console.log(`Deleted ${selectedIds.length} trades`);
        loadTrades();
        setSelectedTrades({});
        setSelectAllChecked(false);
      } catch (err) {
        console.error('Error deleting selected trades:', err);
        setError(err.response?.data?.message || 'Не удалось удалить выбранные сделки');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-purple-600 border-r-2 border-b-2 border-transparent"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 bg-[#f9f9fa] text-gray-900 min-h-screen">
      {/* Header and Controls */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Список сделок</h1>
        <div className="flex space-x-2">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Поиск сделок..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-64 pl-10 pr-3 py-1.5 border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
          <button onClick={() => setIsFilterPanelExpanded(!isFilterPanelExpanded)} className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-purple-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
            </svg>
            {isFilterPanelExpanded ? 'Скрыть фильтры' : 'Показать фильтры'}
          </button>
        </div>
      </div>

      {/* Расширенная панель фильтров */}
      {isFilterPanelExpanded && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 mb-4 transition-all duration-300 ease-in-out">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Первая строка фильтров */}
            {/* Статус сделки */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Статус сделки</label>
              <div className="flex rounded-md overflow-hidden border border-gray-300">
                <button
                  onClick={() => setView('all')}
                  className={`px-4 py-2 text-sm font-medium flex-1 ${view === 'all' 
                    ? 'bg-purple-500 text-white' 
                    : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                >
                  Все
                </button>
                <button
                  onClick={() => setView('open')}
                  className={`px-4 py-2 text-sm font-medium flex-1 ${view === 'open' 
                    ? 'bg-purple-500 text-white' 
                    : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                >
                  Открытые
                </button>
                <button
                  onClick={() => setView('closed')}
                  className={`px-4 py-2 text-sm font-medium flex-1 ${view === 'closed' 
                    ? 'bg-purple-500 text-white' 
                    : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                >
                  Закрытые
                </button>
              </div>
            </div>
            
            {/* Фильтр по символу */}
            <div>
              <label htmlFor="symbolFilter" className="block text-sm font-medium text-gray-700 mb-1">Символ акции</label>
              <input
                type="text"
                id="symbolFilter"
                value={symbolFilter}
                onChange={(e) => setSymbolFilter(e.target.value)}
                placeholder="Введите символ"
                className="shadow-sm focus:ring-purple-500 focus:border-purple-500 block w-full sm:text-sm border-gray-300 rounded-md"
              />
            </div>
            
            {/* Фильтр по прибыльности */}
            <div>
              <label htmlFor="profitabilityFilter" className="block text-sm font-medium text-gray-700 mb-1">Прибыльность</label>
              <select
                id="profitabilityFilter"
                value={profitabilityFilter}
                onChange={(e) => setProfitabilityFilter(e.target.value)}
                className="shadow-sm focus:ring-purple-500 focus:border-purple-500 block w-full sm:text-sm border-gray-300 rounded-md"
              >
                <option value="all">Все сделки</option>
                <option value="profitable">Прибыльные</option>
                <option value="unprofitable">Убыточные</option>
              </select>
            </div>
            
            {/* Вторая строка фильтров */}
            {/* Фильтр по диапазону дат */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Период сделок</label>
              <div className="flex space-x-2">
                <input
                  type="date"
                  value={dateRangeFilter.start}
                  onChange={(e) => setDateRangeFilter(prev => ({ ...prev, start: e.target.value }))}
                  className="shadow-sm focus:ring-purple-500 focus:border-purple-500 block w-full sm:text-sm border-gray-300 rounded-md"
                />
                <span className="text-gray-500 inline-flex items-center">—</span>
                <input
                  type="date"
                  value={dateRangeFilter.end}
                  onChange={(e) => setDateRangeFilter(prev => ({ ...prev, end: e.target.value }))}
                  className="shadow-sm focus:ring-purple-500 focus:border-purple-500 block w-full sm:text-sm border-gray-300 rounded-md"
                />
              </div>
            </div>
            
            {/* Фильтр по размеру позиции */}
            <div>
              <label htmlFor="positionSizeFilter" className="block text-sm font-medium text-gray-700 mb-1">Размер позиции</label>
              <select
                id="positionSizeFilter"
                value={positionSizeFilter}
                onChange={(e) => setPositionSizeFilter(e.target.value)}
                className="shadow-sm focus:ring-purple-500 focus:border-purple-500 block w-full sm:text-sm border-gray-300 rounded-md"
              >
                <option value="all">Любой размер</option>
                <option value="small">Маленькие</option>
                <option value="medium">Средние</option>
                <option value="large">Большие</option>
              </select>
            </div>
            
            {/* Группировка и сброс фильтров */}
            <div className="flex items-end space-x-2">
              <label className="flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={groupByMonth} 
                  onChange={(e) => handleGroupByMonthChange(e.target.checked)}
                  className="form-checkbox h-4 w-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <span className="ml-2 text-sm text-gray-700">Группировать по месяцам</span>
              </label>
              
              <label className="flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={groupByEntryPrice} 
                  onChange={(e) => handleGroupByEntryPriceChange(e.target.checked)}
                  className="form-checkbox h-4 w-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <span className="ml-2 text-sm text-gray-700">Группировать по цене входа</span>
              </label>
              
              <button 
                onClick={() => {
                  setSymbolFilter('');
                  setDateRangeFilter({ start: '', end: '' });
                  setProfitabilityFilter('all');
                  setPositionSizeFilter('all');
                  setFilter('');
                }}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-purple-700 bg-purple-100 hover:bg-purple-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
              >
                Сбросить фильтры
              </button>
            </div>
          </div>
          
          {/* Индикатор активных фильтров */}
          {(filter || symbolFilter || dateRangeFilter.start || dateRangeFilter.end || profitabilityFilter !== 'all' || positionSizeFilter !== 'all') && (
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="text-xs text-gray-500">Активные фильтры:</span>
              {filter && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  Поиск: {filter}
                </span>
              )}
              {symbolFilter && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  Символ: {symbolFilter}
                </span>
              )}
              {dateRangeFilter.start && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  С: {dateRangeFilter.start}
                </span>
              )}
              {dateRangeFilter.end && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  По: {dateRangeFilter.end}
                </span>
              )}
              {profitabilityFilter !== 'all' && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  {profitabilityFilter === 'profitable' ? 'Прибыльные' : 'Убыточные'}
                </span>
              )}
              {positionSizeFilter !== 'all' && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  Размер: {positionSizeFilter === 'small' ? 'Маленькие' : positionSizeFilter === 'medium' ? 'Средние' : 'Большие'}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Расширенные элементы управления сортировкой и группировкой */}
      <div className="mb-6 flex flex-wrap items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="text-sm font-medium text-gray-700">Сортировать по:</div>
        <div className="flex gap-2 flex-wrap">
          <Button 
            variant={sortBy === 'entryDate' ? 'primary' : 'outline'} 
            size="sm"
            onClick={() => {
              setSortBy('entryDate');
              if (sortBy === 'entryDate') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
            }}
          >
            Дате входа {sortBy === 'entryDate' && (sortOrder === 'asc' ? '↑' : '↓')}
          </Button>
          
          <Button 
            variant={sortBy === 'symbol' ? 'primary' : 'outline'} 
            size="sm"
            onClick={() => {
              setSortBy('symbol');
              if (sortBy === 'symbol') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
            }}
          >
            Тикеру {sortBy === 'symbol' && (sortOrder === 'asc' ? '↑' : '↓')}
          </Button>
          
          <Button 
            variant={sortBy === 'entryPrice' ? 'primary' : 'outline'} 
            size="sm"
            onClick={() => {
              setSortBy('entryPrice');
              if (sortBy === 'entryPrice') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
            }}
          >
            Цене входа {sortBy === 'entryPrice' && (sortOrder === 'asc' ? '↑' : '↓')}
          </Button>
          
          <Button 
            variant={sortBy === 'totalCost' ? 'primary' : 'outline'} 
            size="sm"
            onClick={() => {
              setSortBy('totalCost');
              if (sortBy === 'totalCost') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
            }}
          >
            Сумме {sortBy === 'totalCost' && (sortOrder === 'asc' ? '↑' : '↓')}
          </Button>
          
          <Button 
            variant={sortBy === 'marginAmount' ? 'primary' : 'outline'} 
            size="sm"
            onClick={() => {
              setSortBy('marginAmount');
              if (sortBy === 'marginAmount') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
            }}
          >
            Ставке {sortBy === 'marginAmount' && (sortOrder === 'asc' ? '↑' : '↓')}
          </Button>
          
          <Button 
            variant={sortBy === 'profit' ? 'primary' : 'outline'} 
            size="sm"
            onClick={() => {
              setSortBy('profit');
              if (sortBy === 'profit') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
            }}
          >
            Прибыли {sortBy === 'profit' && (sortOrder === 'asc' ? '↑' : '↓')}
          </Button>
        </div>
      </div>
      
      {/* Панель выбора сделок */}
      <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-200">
        <div className="flex items-center">
          <input
            type="checkbox"
            checked={selectAllChecked}
            onChange={(e) => handleSelectAll(e.target.checked)}
            className="h-5 w-5 text-purple-600 rounded border-gray-300 focus:ring-purple-500 mr-2"
          />
          <label className="text-sm font-medium text-gray-700">
            {selectAllChecked ? 'Снять выбор' : 'Выбрать все'} 
          </label>
          
          {getSelectedTradesCount() > 0 && (
            <span className="ml-2 text-sm text-gray-500">
              (Выбрано: {getSelectedTradesCount()})
            </span>
          )}
        </div>
        
        {getSelectedTradesCount() > 0 && (
          <Button
            variant="danger"
            size="sm"
            onClick={handleDeleteSelected}
          >
            Удалить выбранные
          </Button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Trades Grid */}
      {filteredAndSortedTrades.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center border border-gray-200 shadow-sm">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <h3 className="mt-2 text-lg font-medium text-gray-900">Сделок не найдено</h3>
          <p className="mt-1 text-gray-500">
            Начните с создания новой сделки или измените параметры поиска.
          </p>
        </div>
      ) : (groupByMonth || groupByEntryPrice) ? (
        // Сделки сгруппированы по месяцам или цене входа
        <div className="space-y-4">
          {Object.entries(groupedTrades).map(([groupKey, group]) => (
            <div key={groupKey} className="bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm">
              <div
                className="p-4 flex justify-between items-center bg-gray-50 cursor-pointer"
                onClick={() => toggleGroup(groupKey)}
              >
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-bold text-gray-900 capitalize">{group.label}</h3>
                  <div className="flex gap-2 items-center text-sm">
                    <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                      {group.totalQuantity} шт.
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                      {group.totalSum.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-sm text-gray-500">
                    {group.trades.length} сделок
                  </div>
                  <svg
                    className={`h-5 w-5 text-gray-500 transition-transform ${collapsedGroups[groupKey] ? 'rotate-180' : ''}`}
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </div>

              {!collapsedGroups[groupKey] && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                  {group.trades.map(trade => renderTrade(trade))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        // Сделки без группировки
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAndSortedTrades.map(trade => renderTrade(trade))}
        </div>
      )}

      {/* Sell Modal */}
      {sellingTrade && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">Закрыть сделку {sellingTrade.symbol}</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Цена выхода (₽)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={sellPrice}
                onChange={(e) => setSellPrice(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setSellingTrade(null);
                  setSellPrice('');
                }}
              >
                Отмена
              </Button>
              <Button
                disabled={!sellPrice}
                onClick={() => handleSell(sellingTrade)}
              >
                Закрыть сделку
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Helper function to render a trade card
  function renderTrade(trade) {
    const isOpenTrade = !trade.exitDate;
    const totalCost = Number(trade.entryPrice) * Number(trade.quantity);
    const roundedTotalCost = Math.round(totalCost * 100) / 100;
    const yearlyInterest = roundedTotalCost * Number(trade.marginAmount) / 100;
    const dailyInterest = yearlyInterest / 365;
    const roundedDailyInterest = Math.round(dailyInterest * 100) / 100;
    
    // Calculate days held
    const entryDate = parseDateLocal(trade.entryDate);
    const exitDate = trade.exitDate ? parseDateLocal(trade.exitDate) : new Date();
    const daysHeld = Math.ceil((exitDate - entryDate) / (1000 * 60 * 60 * 24));
    
    // Calculate accumulated interest for the whole period
    const accumulatedInterest = roundedDailyInterest * daysHeld;
    
    // Calculate profit if closed
    let profit = 0;
    let profitAfterInterest = 0;
    let profitPercent = 0;
    let profitAfterInterestPercent = 0;
    
    if (trade.exitPrice) {
      profit = (Number(trade.exitPrice) - Number(trade.entryPrice)) * Number(trade.quantity);
      profitAfterInterest = profit - accumulatedInterest;
      profitPercent = ((Number(trade.exitPrice) - Number(trade.entryPrice)) / Number(trade.entryPrice)) * 100;
      profitAfterInterestPercent = (profitAfterInterest / roundedTotalCost) * 100;
    }
    
    // Calculate potential profit if open position and current price is provided
    let potentialProfit = 0;
    let potentialProfitPercent = 0;
    let potentialProfitAfterInterest = 0;
    let potentialProfitAfterInterestPercent = 0;
    
    const currentPrice = getCurrentPrice(trade.symbol);
    
    if (isOpenTrade && currentPrice && !isNaN(parseFloat(currentPrice)) && parseFloat(currentPrice) > 0) {
      const rate = parseFloat(currentPrice);
      potentialProfit = (rate - Number(trade.entryPrice)) * Number(trade.quantity);
      potentialProfitPercent = ((rate - Number(trade.entryPrice)) / Number(trade.entryPrice)) * 100;
      potentialProfitAfterInterest = potentialProfit - accumulatedInterest;
      potentialProfitAfterInterestPercent = (potentialProfitAfterInterest / roundedTotalCost) * 100;
    }
    
    return (
      <div
        key={trade.id}
        className="bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200"
      >
        {/* Card Header */}
        <div className="p-3 flex justify-between items-center border-b border-gray-100 bg-gray-50">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selectedTrades[trade.id] || false}
              onChange={() => handleToggleSelect(trade.id)}
              className="h-4 w-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
            />
            <div className="text-lg font-semibold text-gray-900">{trade.symbol}</div>
            <div className={`text-xs px-2 py-0.5 rounded-full ${isOpenTrade ? 'bg-indigo-100 text-indigo-800' : 'bg-green-100 text-green-800'}`}>
              {isOpenTrade ? 'Открыта' : 'Закрыта'}
            </div>
          </div>
          <div className="text-sm text-gray-600">
            {format(parseDateLocal(trade.entryDate), 'd MMM yyyy', { locale: ru })}
          </div>
        </div>

        {/* Card Body */}
        <div className="p-3">
          <div className="grid grid-cols-2 gap-2 text-sm">
            {/* Первая строка: цены */}
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Вход:</span>
              <span className="font-medium">
                {Number(trade.entryPrice).toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 2 })}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Выход:</span>
              <span className="font-medium">
                {trade.exitPrice
                  ? Number(trade.exitPrice).toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 2 })
                  : '—'}
              </span>
            </div>
            
            {/* Вторая строка: количество и сумма */}
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Кол-во:</span>
              <span className="font-medium">{trade.quantity}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Сумма:</span>
              <span className="font-medium">
                {roundedTotalCost.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}
              </span>
            </div>
            
            {/* Третья строка: ставка и проценты */}
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Ставка:</span>
              <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-800 text-xs font-medium">
                {trade.marginAmount}%
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Ежедн. %:</span>
              <span className="font-medium">
                {roundedDailyInterest.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}
              </span>
            </div>
            
            {/* Четвертая строка: дни и накопленные проценты */}
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Дней:</span>
              <span className="font-medium text-right max-w-[70px] truncate" title={daysHeld}>{daysHeld}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Накоплено %:</span>
              <span className="font-medium text-red-600 text-right max-w-[90px] truncate" title={accumulatedInterest.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}>
                {accumulatedInterest.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>

          {/* Блок прибыли для закрытых сделок */}
          {!isOpenTrade && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded p-2">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Прибыль без %</div>
                    <div className={`font-semibold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {profit.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}
                      <span className="text-xs ml-1 text-gray-500">
                        ({profitPercent.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Итоговая прибыль</div>
                    <div className={`font-semibold ${profitAfterInterest >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {profitAfterInterest.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}
                      <span className="text-xs ml-1 text-gray-500">
                        ({profitAfterInterestPercent.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Блок потенциальной прибыли для открытых сделок при наличии курса */}
          {isOpenTrade && currentPrice && parseFloat(currentPrice) > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded p-2">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Потенциальная прибыль</div>
                    <div className={`font-semibold ${potentialProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {potentialProfit.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}
                      <span className="text-xs ml-1 text-gray-500">
                        ({potentialProfitPercent.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-xs text-gray-500 mb-1">После вычета %</div>
                    <div className={`font-semibold ${potentialProfitAfterInterest >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {potentialProfitAfterInterest.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}
                      <span className="text-xs ml-1 text-gray-500">
                        ({potentialProfitAfterInterestPercent.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-xs text-right text-gray-500 mt-1">
                  При курсе {parseFloat(currentPrice).toLocaleString('ru-RU', { style: 'currency', currency: 'RUB' })}
                </div>
              </div>
            </div>
          )}

          {/* Заметки, если есть */}
          {trade.notes && (
            <div className="mt-3 pt-2 border-t border-gray-100">
              <div className="text-xs text-gray-500">Заметки</div>
              <div className="text-sm text-gray-700 italic">{trade.notes}</div>
            </div>
          )}

          {/* Кнопки действий */}
          <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2">
            {isOpenTrade && (
              <Button
                variant="primary"
                size="sm"
                className="flex-1"
                onClick={() => setSellingTrade(trade)}
              >
                Закрыть
              </Button>
            )}
            <Button
              variant="danger"
              size="sm"
              className="flex-1"
              onClick={() => handleDelete(trade.id)}
            >
              Удалить
            </Button>
          </div>
        </div>
      </div>
    );
  }
}

export default TradeList;
