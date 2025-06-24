import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { usePortfolio } from '../../contexts/PortfolioContext';
import { formatPortfolioCurrency } from '../../utils/currencyFormatter';
import TradeDetailsModal from '../TradeDetailsModal';

function MarginTradeList() {
  const { currentPortfolio } = usePortfolio();
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');
  const [view, setView] = useState('all'); // 'all', 'open', 'closed'
  
  // Дополнительные состояния для расширенной функциональности
  const [sortBy, setSortBy] = useState('entryDate');
  const [sortOrder, setSortOrder] = useState('desc');
  const [symbolFilter, setSymbolFilter] = useState('');
  const [dateRangeFilter, setDateRangeFilter] = useState({ start: '', end: '' });
  const [profitabilityFilter, setProfitabilityFilter] = useState('all'); // 'all', 'profitable', 'unprofitable'
  const [positionSizeFilter, setPositionSizeFilter] = useState('all'); // 'all', 'small', 'medium', 'large'
  const [groupByMonth, setGroupByMonth] = useState(false);
  const [groupByEntryPrice, setGroupByEntryPrice] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [isFilterPanelExpanded, setIsFilterPanelExpanded] = useState(false);
  
  // Состояния для модального окна
  const [selectedTrade, setSelectedTrade] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Функция форматирования валюты
  const formatCurrency = (amount, decimals = 2) => {
    return formatPortfolioCurrency(amount, currentPortfolio, decimals);
  };

  useEffect(() => {
    loadTrades();
  }, [currentPortfolio]);

  // Слушатель обновлений из модального окна
  useEffect(() => {
    const handleTradesUpdated = () => {
      loadTrades();
    };

    window.addEventListener('tradesUpdated', handleTradesUpdated);
    return () => window.removeEventListener('tradesUpdated', handleTradesUpdated);
  }, []);

  const loadTrades = async () => {
    if (!currentPortfolio?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await axios.get('/api/trades', {
        headers: {
          'X-Portfolio-ID': currentPortfolio.id
        }
      });
      
      if (Array.isArray(response.data)) {
        setTrades(response.data);
      } else {
        setTrades([]);
        setError('Данные получены в неверном формате');
      }
      setError('');
    } catch (err) {
      console.error('Error loading trades:', err);
      setError('Не удалось загрузить сделки');
      setTrades([]);
    } finally {
      setLoading(false);
    }
  };

  // Мемоизированная фильтрация и сортировка сделок
  const filteredAndSortedTrades = useMemo(() => {
    if (!Array.isArray(trades)) return [];
    
    // Определение порогов для размеров позиций
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
        } else if (profitabilityFilter !== 'all' && !trade.exitDate) {
          // Для открытых позиций не применяем этот фильтр
          profitabilityMatch = false;
        }
        
        // 4. Фильтр по размеру позиции
        let positionSizeMatch = true;
        if (positionSizeFilter !== 'all') {
          const positionSize = Number(trade.entryPrice) * Number(trade.quantity);
          if (positionSizeFilter === 'small' && positionSize > smallPositionThreshold) positionSizeMatch = false;
          if (positionSizeFilter === 'medium' && (positionSize <= smallPositionThreshold || positionSize >= largePositionThreshold)) positionSizeMatch = false;
          if (positionSizeFilter === 'large' && positionSize < largePositionThreshold) positionSizeMatch = false;
        }
        
        return statusMatch && searchMatch && symbolMatch && dateMatch && profitabilityMatch && positionSizeMatch;
      })
      .sort((a, b) => {
        let aValue, bValue;
        
        switch (sortBy) {
          case 'entryDate':
            aValue = new Date(a.entryDate).getTime();
            bValue = new Date(b.entryDate).getTime();
            break;
          case 'entryPrice':
            aValue = Number(a.entryPrice);
            bValue = Number(b.entryPrice);
            break;
          case 'symbol':
            aValue = a.symbol.toLowerCase();
            bValue = b.symbol.toLowerCase();
            break;
          case 'profit':
            aValue = a.exitPrice ? (Number(a.exitPrice) - Number(a.entryPrice)) * Number(a.quantity) : 0;
            bValue = b.exitPrice ? (Number(b.exitPrice) - Number(b.entryPrice)) * Number(b.quantity) : 0;
            break;
          case 'totalCost':
            aValue = Number(a.entryPrice) * Number(a.quantity);
            bValue = Number(b.entryPrice) * Number(b.quantity);
            break;
          default:
            return 0;
        }
        
        if (sortOrder === 'asc') {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      });
  }, [trades, view, filter, sortBy, sortOrder, symbolFilter, dateRangeFilter, profitabilityFilter, positionSizeFilter]);

  // Группировка сделок
  const groupedTrades = useMemo(() => {
    if (!groupByMonth && !groupByEntryPrice) {
      return [{ key: 'all', trades: filteredAndSortedTrades }];
    }

    const groups = {};

    filteredAndSortedTrades.forEach(trade => {
      let groupKey;

      if (groupByMonth) {
        const date = new Date(trade.entryDate);
        groupKey = format(date, 'MMMM yyyy', { locale: ru });
      } else if (groupByEntryPrice) {
        const entryPrice = Number(trade.entryPrice);
        const roundedPrice = Math.round(entryPrice / 5) * 5; // Округляем до пятерок
        groupKey = `${trade.symbol} ~${formatCurrency(roundedPrice, 0)}`;
      }

      if (!groups[groupKey]) {
        groups[groupKey] = {
          key: groupKey,
          trades: [],
          totalSum: 0,
          totalProfit: 0,
          openCount: 0,
          closedCount: 0
        };
      }

      groups[groupKey].trades.push(trade);
      groups[groupKey].totalSum += Number(trade.entryPrice) * Number(trade.quantity);
      
      if (trade.exitDate && trade.exitPrice) {
        groups[groupKey].closedCount++;
        groups[groupKey].totalProfit += (Number(trade.exitPrice) - Number(trade.entryPrice)) * Number(trade.quantity);
      } else {
        groups[groupKey].openCount++;
      }
    });

    return Object.values(groups).sort((a, b) => {
      // Сортируем группы по первой сделке в группе
      const firstTradeA = a.trades[0];
      const firstTradeB = b.trades[0];
      
      if (groupByMonth) {
        return new Date(firstTradeB.entryDate).getTime() - new Date(firstTradeA.entryDate).getTime();
      } else {
        return firstTradeA.symbol.localeCompare(firstTradeB.symbol);
      }
    });
  }, [filteredAndSortedTrades, groupByMonth, groupByEntryPrice]);

  const toggleGroup = (groupKey) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [groupKey]: prev[groupKey] === true ? false : true
    }));
  };

  const handleDelete = async (tradeId) => {
    if (!window.confirm('Вы уверены, что хотите удалить эту сделку?')) {
      return;
    }

    try {
      await axios.delete(`/api/trades/${tradeId}`, {
        headers: {
          'X-Portfolio-ID': currentPortfolio.id
        }
      });
      setTrades(trades.filter(trade => trade.id !== tradeId));
    } catch (err) {
      console.error('Error deleting trade:', err);
      setError('Не удалось удалить сделку');
    }
  };

  if (!currentPortfolio) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-400 mb-4">📊</div>
          <p className="text-gray-700 mb-4">Портфель не выбран</p>
          <button
            onClick={() => window.location.href = '/'}
            className="bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Выбрать портфель
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-300"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      <div className="container-fluid p-4 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h3 className="text-2xl font-light text-gray-800 mb-2">Список сделок</h3>
          <p className="text-gray-500">Управление маржинальными позициями ({currentPortfolio?.currency || 'RUB'})</p>
        </div>

        {error && (
          <div className="bg-red-50/80 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border-0 overflow-hidden">
          <div className="px-6 py-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Поиск по тикеру или заметкам..."
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm bg-white/50 focus:ring-2 focus:ring-gray-200 focus:border-gray-300 transition-all"
                />
              </div>

              {/* Status Filter */}
              <div className="flex gap-3 items-center">
                <div className="flex rounded-xl overflow-hidden border border-gray-200 bg-white/50">
                  <button
                    onClick={() => setView('all')}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${view === 'all' 
                      ? 'bg-gray-800 text-white' 
                      : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    Все ({trades.length})
                  </button>
                  <button
                    onClick={() => setView('open')}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${view === 'open' 
                      ? 'bg-gray-800 text-white' 
                      : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    Открытые ({trades.filter(t => !t.exitDate).length})
                  </button>
                  <button
                    onClick={() => setView('closed')}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${view === 'closed' 
                      ? 'bg-gray-800 text-white' 
                      : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    Закрытые ({trades.filter(t => t.exitDate).length})
                  </button>
                </div>

                {/* Advanced Filters Toggle */}
                <button
                  onClick={() => setIsFilterPanelExpanded(!isFilterPanelExpanded)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <svg className={`w-4 h-4 inline-block mr-2 transition-transform ${isFilterPanelExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  Фильтры
                </button>
              </div>
            </div>

            {/* Advanced Filters Panel */}
            {isFilterPanelExpanded && (
              <div className="mt-4 pt-4 border-t border-gray-100/50">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Sort By */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Сортировка</label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white/50 focus:ring-2 focus:ring-gray-200 focus:border-gray-300"
                    >
                      <option value="entryDate">По дате</option>
                      <option value="entryPrice">По цене входа</option>
                      <option value="symbol">По тикеру</option>
                      <option value="profit">По прибыли</option>
                      <option value="totalCost">По сумме</option>
                    </select>
                  </div>

                  {/* Sort Order */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Порядок</label>
                    <select
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white/50 focus:ring-2 focus:ring-gray-200 focus:border-gray-300"
                    >
                      <option value="desc">По убыванию</option>
                      <option value="asc">По возрастанию</option>
                    </select>
                  </div>

                  {/* Symbol Filter */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Тикер</label>
                    <input
                      type="text"
                      placeholder="Фильтр по тикеру"
                      value={symbolFilter}
                      onChange={(e) => setSymbolFilter(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white/50 focus:ring-2 focus:ring-gray-200 focus:border-gray-300"
                    />
                  </div>

                  {/* Profitability Filter */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Прибыльность</label>
                    <select
                      value={profitabilityFilter}
                      onChange={(e) => setProfitabilityFilter(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white/50 focus:ring-2 focus:ring-gray-200 focus:border-gray-300"
                    >
                      <option value="all">Все</option>
                      <option value="profitable">Прибыльные</option>
                      <option value="unprofitable">Убыточные</option>
                    </select>
                  </div>

                  {/* Date Range */}
                  <div className="lg:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Период</label>
                    <div className="flex gap-2">
                      <input
                        type="date"
                        value={dateRangeFilter.start}
                        onChange={(e) => setDateRangeFilter(prev => ({ ...prev, start: e.target.value }))}
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white/50 focus:ring-2 focus:ring-gray-200 focus:border-gray-300"
                      />
                      <span className="self-center text-gray-500">—</span>
                      <input
                        type="date"
                        value={dateRangeFilter.end}
                        onChange={(e) => setDateRangeFilter(prev => ({ ...prev, end: e.target.value }))}
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white/50 focus:ring-2 focus:ring-gray-200 focus:border-gray-300"
                      />
                    </div>
                  </div>

                  {/* Position Size Filter */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Размер позиции</label>
                    <select
                      value={positionSizeFilter}
                      onChange={(e) => setPositionSizeFilter(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white/50 focus:ring-2 focus:ring-gray-200 focus:border-gray-300"
                    >
                      <option value="all">Все</option>
                      <option value="small">Малые</option>
                      <option value="medium">Средние</option>
                      <option value="large">Крупные</option>
                    </select>
                  </div>

                  {/* Grouping Options */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Группировка</label>
                    <div className="space-y-2">
                      <label className="flex items-center text-sm">
                        <input
                          type="checkbox"
                          checked={groupByMonth}
                          onChange={(e) => {
                            setGroupByMonth(e.target.checked);
                            if (e.target.checked) {
                              setGroupByEntryPrice(false);
                              // Сворачиваем все группы при включении группировки
                              setCollapsedGroups({});
                            }
                          }}
                          className="mr-2 rounded text-gray-600 focus:ring-gray-500"
                        />
                        По месяцам
                      </label>
                      <label className="flex items-center text-sm">
                        <input
                          type="checkbox"
                          checked={groupByEntryPrice}
                          onChange={(e) => {
                            setGroupByEntryPrice(e.target.checked);
                            if (e.target.checked) {
                              setGroupByMonth(false);
                              // Сворачиваем все группы при включении группировки
                              setCollapsedGroups({});
                            }
                          }}
                          className="mr-2 rounded text-gray-600 focus:ring-gray-500"
                        />
                        По точкам входа
                      </label>
                    </div>
                  </div>
                </div>

                {/* Clear Filters */}
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => {
                      setSymbolFilter('');
                      setDateRangeFilter({ start: '', end: '' });
                      setProfitabilityFilter('all');
                      setPositionSizeFilter('all');
                      setSortBy('entryDate');
                      setSortOrder('desc');
                      setGroupByMonth(false);
                      setGroupByEntryPrice(false);
                    }}
                    className="text-sm text-gray-600 hover:text-gray-800 underline"
                  >
                    Сбросить фильтры
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Trades List */}
        {filteredAndSortedTrades.length === 0 ? (
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border-0 overflow-hidden">
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100/80 rounded-full mb-4">
                <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-700 mb-1">Нет сделок</h3>
              <p className="text-sm text-gray-400 max-w-md mx-auto">
                {filter || symbolFilter || dateRangeFilter.start || dateRangeFilter.end || profitabilityFilter !== 'all' || positionSizeFilter !== 'all' 
                  ? 'Не найдено сделок по вашему запросу' 
                  : 'Создайте первую маржинальную сделку'}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {groupedTrades.map(group => (
              <div key={group.key}>
                {/* Group Header - показывается всегда при группировке */}
                {(groupByMonth || groupByEntryPrice) && (
                  <div 
                    className="mb-4 flex items-center justify-between cursor-pointer hover:bg-gray-50/50 rounded-lg p-2 -mx-2"
                    onClick={() => toggleGroup(group.key)}
                  >
                    <div className="flex items-center space-x-3">
                      <svg 
                        className={`w-5 h-5 text-gray-400 transition-transform ${collapsedGroups[group.key] === true ? 'rotate-90' : ''}`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      <h4 className="text-lg font-medium text-gray-800">{group.key}</h4>
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <span className="px-2 py-0.5 rounded-full bg-gray-100">
                          {group.trades.length} сделок
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                          {group.openCount} открытых
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-800">
                          {group.closedCount} закрытых
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                          {formatCurrency(group.totalSum, 0)}
                        </span>
                        {group.totalProfit !== 0 && (
                          <span className={`px-2 py-0.5 rounded-full ${group.totalProfit > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {formatCurrency(group.totalProfit, 0)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Group Content - показывается только при раскрытии группы или если группировка отключена */}
                {((groupByMonth || groupByEntryPrice) ? collapsedGroups[group.key] === true : true) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {group.trades.map((trade) => (
                      <TradeCard 
                        key={trade.id} 
                        trade={trade} 
                        formatCurrency={formatCurrency}
                        onDelete={handleDelete}
                        onOpenModal={(trade) => {
                          setSelectedTrade(trade);
                          setIsModalOpen(true);
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Window */}
      {isModalOpen && selectedTrade && (
        <TradeDetailsModal 
          tradeId={selectedTrade.id}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedTrade(null);
            // Обновляем список сделок после закрытия модального окна
            loadTrades();
          }}
        />
      )}
    </div>
  );
}

function TradeCard({ trade, formatCurrency, onDelete, onOpenModal }) {
  const isOpenTrade = !trade.exitDate;
  const totalCost = Number(trade.entryPrice) * Number(trade.quantity);
  const profit = trade.exitPrice ? (Number(trade.exitPrice) - Number(trade.entryPrice)) * Number(trade.quantity) : 0;
  const profitPercent = trade.exitPrice ? ((Number(trade.exitPrice) - Number(trade.entryPrice)) / Number(trade.entryPrice)) * 100 : 0;

  return (
    <div 
      className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border-0 overflow-hidden hover:shadow-md transition-shadow duration-300 cursor-pointer"
      onClick={() => onOpenModal(trade)}
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h4 className="text-xl font-medium text-gray-800">{trade.symbol}</h4>
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
              isOpenTrade 
                ? 'bg-blue-100 text-blue-800' 
                : 'bg-green-100 text-green-800'
            }`}>
              {isOpenTrade ? 'Открыта' : 'Закрыта'}
            </div>
          </div>
          <div className="text-sm text-gray-500">
            {format(new Date(trade.entryDate), 'dd.MM.yyyy', { locale: ru })}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="px-6 py-4">
        <div className="space-y-3">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Цена входа:</span>
              <div className="font-medium text-gray-800">{formatCurrency(Number(trade.entryPrice))}</div>
            </div>
            <div>
              <span className="text-gray-500">Количество:</span>
              <div className="font-medium text-gray-800">{trade.quantity}</div>
            </div>
            <div>
              <span className="text-gray-500">Общая сумма:</span>
              <div className="font-medium text-gray-800">{formatCurrency(totalCost, 0)}</div>
            </div>
            <div>
              <span className="text-gray-500">Ставка:</span>
              <div className="font-medium text-purple-600">{trade.marginAmount}%</div>
            </div>
          </div>

          {/* Exit Info for Closed Trades */}
          {!isOpenTrade && (
            <div className="pt-3 border-t border-gray-100/50">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Цена выхода:</span>
                  <div className="font-medium text-gray-800">{formatCurrency(Number(trade.exitPrice))}</div>
                </div>
                <div>
                  <span className="text-gray-500">Дата выхода:</span>
                  <div className="font-medium text-gray-800">
                    {format(new Date(trade.exitDate), 'dd.MM.yyyy', { locale: ru })}
                  </div>
                </div>
              </div>
              
              {/* Profit */}
              <div className="mt-3 pt-3 border-t border-gray-100/50">
                <div className="text-center">
                  <span className="text-gray-500 text-sm">Прибыль:</span>
                  <div className={`text-lg font-semibold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(profit, 0)} ({profitPercent.toFixed(1)}%)
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          {trade.notes && (
            <div className="pt-3 border-t border-gray-100/50">
              <span className="text-gray-500 text-sm">Заметки:</span>
              <div className="text-sm text-gray-700 mt-1 italic">{trade.notes}</div>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="px-6 py-4 border-t border-gray-100/50 bg-gray-50/30">
        <div className="flex gap-2">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onOpenModal(trade);
            }}
            className="flex-1 px-4 py-2 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
          >
            Подробно
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onDelete(trade.id);
            }}
            className="flex-1 px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
          >
            Удалить
          </button>
        </div>
      </div>
    </div>
  );
}

export default MarginTradeList; 