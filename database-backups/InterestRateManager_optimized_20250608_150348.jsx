import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { 
  Container, 
  Row, 
  Col, 
  Card, 
  Table, 
  Button, 
  Badge, 
  Form,
  Modal,
  Alert,
  Spinner
} from 'react-bootstrap';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const InterestRateManager = () => {
  const { t } = useTranslation();
  
  const [trades, setTrades] = useState([]);
  const [allTradesDetails, setAllTradesDetails] = useState({});
  const [selectedTrades, setSelectedTrades] = useState([]);
  const [newRate, setNewRate] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [activeView, setActiveView] = useState('overview');
  const [selectedTradeId, setSelectedTradeId] = useState(null);
  const [showOverallView, setShowOverallView] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTradeIds, setSelectedTradeIds] = useState([]);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkRate, setBulkRate] = useState('');
  const [bulkDate, setBulkDate] = useState(new Date().toISOString().split('T')[0]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const fetchTrades = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get('http://localhost:8081/api/trades');
      setTrades(response.data || []);
      setError('');
    } catch (error) {
      setError('Ошибка загрузки сделок');
      setTrades([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Автоматическое обновление при открытии компонента
  useEffect(() => {
    // Комментируем очистку localStorage чтобы не удалять курсы акций
    // localStorage.clear();
    fetchTrades();
  }, []);

  const getTradeDetails = useCallback(async (tradeId) => {
    if (allTradesDetails[tradeId]) return allTradesDetails[tradeId];
    
    try {
      const response = await axios.get(`http://localhost:8081/api/trades/${tradeId}/extended-info`);
      const data = response.data;
      setAllTradesDetails(prev => ({
        ...prev,
        [tradeId]: data
      }));
      return data;
    } catch (error) {
      // Игнорируем ошибки загрузки деталей
      return null;
    }
  }, [allTradesDetails]);

  const fetchTradeDetails = async (tradeId) => {
    try {
      const response = await axios.get(`http://localhost:8081/api/trades/${tradeId}/extended-info`);
      setAllTradesDetails(prev => ({
        ...prev,
        [tradeId]: response.data
      }));
    } catch (error) {
      // Игнорируем ошибки загрузки деталей
    }
  };

  // Функция для загрузки базовой информации о сделке
  const fetchBasicTradeInfo = async (id) => {
    try {
      const response = await axios.get(`http://localhost:8081/api/trades/${id}`);
      return response.data;
    } catch (error) {
      // Игнорируем ошибки загрузки
      return null;
    }
  };

  const loadTradeDetails = async (tradeIds) => {
    try {
      // Ограничиваем количество загружаемых сделок для оптимизации
      const limitedIds = tradeIds.slice(0, 30);
      
      const promises = limitedIds.map(id => fetchBasicTradeInfo(id));
      const results = await Promise.all(promises);
      
      const tradeMap = {};
      results.forEach((trade, index) => {
        if (trade) {
          tradeMap[limitedIds[index]] = trade;
        }
      });
      
      setAllTradesDetails(prev => ({
        ...prev,
        ...tradeMap
      }));
    } catch (error) {
      // Игнорируем ошибки загрузки
    }
  };

  useEffect(() => {
    if (trades.length > 0) {
      loadTradeDetails(trades.map(trade => trade.id));
    }
  }, [trades, loadTradeDetails]);

  const getOverallStatistics = () => {
    const openTrades = trades.filter(trade => !trade.exitDate);
    
    if (openTrades.length === 0) {
      return {
        totalDailyPayment: 0,
        totalAccumulatedInterest: 0,
        averageRate: 0,
        totalInvestments: 0,
        positionCount: 0,
        profitToday: 0
      };
    }

    let totalDailyPayment = 0;
    let totalAccumulatedInterest = 0;
    let totalInvestments = 0;
    let weightedRateSum = 0;
    let profitToday = 0;
    let tradesWithDetails = 0;

    openTrades.forEach(trade => {
      const tradeDetails = allTradesDetails[trade.id];
      const position = Number(trade.entryPrice) * trade.quantity;
      totalInvestments += position;
      
      if (tradeDetails) {
        tradesWithDetails++;
        // Используем корректные данные из бэкенда
        const dailyPayment = tradeDetails.dailyInterestAmount || 0;
        const accumulatedInterest = tradeDetails.totalInterestWithVariableRate || 0;
        
        totalDailyPayment += dailyPayment;
        totalAccumulatedInterest += accumulatedInterest;
        
        // Используем текущую эффективную ставку из trade.marginAmount или из расширенной информации
        const currentRate = trade.marginAmount || 22.0;
        weightedRateSum += currentRate * position;
        
        // Примерная прибыль за сегодня (можно заменить на реальные данные)
        const currentPrice = trade.entryPrice * 1.02;
        profitToday += (currentPrice - trade.entryPrice) * trade.quantity;
      } else {
        // Если детали еще не загружены, используем базовые расчеты
        const rate = trade.marginAmount || 22.0;
        const dailyPayment = position * rate / 100 / 365;
        
        weightedRateSum += rate * position;
        totalDailyPayment += dailyPayment;
      }
    });

    const averageRate = totalInvestments > 0 ? (weightedRateSum / totalInvestments) : 0;

    return {
      totalDailyPayment: Math.round(totalDailyPayment * 100) / 100,
      totalAccumulatedInterest: Math.round(totalAccumulatedInterest * 100) / 100,
      averageRate: Math.round(averageRate * 100) / 100,
      totalInvestments,
      positionCount: openTrades.length,
      profitToday: Math.round(profitToday * 100) / 100,
      loadingProgress: openTrades.length > 0 ? (tradesWithDetails / openTrades.length * 100) : 100
    };
  };

  const getOverallRatesChartData = () => {
    const openTrades = trades.filter(trade => !trade.exitDate);
    
    if (!openTrades || openTrades.length === 0) {
      return {
        labels: [],
        datasets: []
      };
    }

    // Функция для парсинга русской даты
    function parseRussianDate(dateStr) {
      // Проверяем на undefined/null/пустую строку
      if (!dateStr || typeof dateStr !== 'string') {
        return null;
      }
      
      const months = {
        'янв': '01', 'фев': '02', 'мар': '03', 'апр': '04',
        'май': '05', 'июн': '06', 'июл': '07', 'авг': '08',
        'сен': '09', 'окт': '10', 'ноя': '11', 'дек': '12'
      };
      
      const parts = dateStr.split(' ');
      if (parts.length === 2) {
        const day = parts[0];
        const month = months[parts[1]];
        const year = new Date().getFullYear();
        if (month) {
          return new Date(`${year}-${month}-${day.padStart(2, '0')}`);
        }
      }
      return null;
    }

    const today = new Date();
    const labels = [];
    const dailyRates = [];
    
    // Генерируем данные за последние 7 дней
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      labels.push(date.toLocaleDateString('ru-RU', { 
        day: '2-digit', 
        month: 'short' 
      }));
      
      let totalInvestment = 0;
      let totalCurrentRate = 0;
      
      // Для каждой открытой сделки находим текущую ставку на эту дату
      openTrades.forEach(trade => {
        const tradeDetails = allTradesDetails[trade.id];
        const tradeStartDate = new Date(trade.entryDate);
        
        // Если сделка еще не началась на эту дату, пропускаем
        if (date < tradeStartDate) {
          return;
        }

        const investment = trade.quantity * trade.entryPrice;
        
        if (tradeDetails && tradeDetails.interestRateChanges) {
          // Находим эффективную ставку на данную дату
          let effectiveRate = parseFloat(trade.marginAmount) || 22.0;
          
          // Ищем изменения ставок до этой даты
          const rateChanges = tradeDetails.interestRateChanges
            .map(change => {
              const changeDate = parseRussianDate(change.changeDate);
              return changeDate ? {
                ...change,
                date: changeDate,
                rate: parseFloat(change.newRate)
              } : null;
            })
            .filter(change => change !== null)
            .sort((a, b) => a.date - b.date);
          
          // Находим последнее изменение ставки до указанной даты
          for (const change of rateChanges) {
            if (change.date <= date) {
              effectiveRate = change.rate;
            } else {
              break;
            }
          }
          
          totalInvestment += investment;
          totalCurrentRate += effectiveRate * investment;
        } else {
          // Если нет данных об изменениях, используем текущую ставку
          const currentRate = parseFloat(trade.marginAmount) || 22.0;
          totalInvestment += investment;
          totalCurrentRate += currentRate * investment;
        }
      });
      
      // Рассчитываем средневзвешенную текущую ставку на эту дату
      const avgCurrentRate = totalInvestment > 0 ? totalCurrentRate / totalInvestment : 22.0;
      dailyRates.push(parseFloat(avgCurrentRate.toFixed(2)));
    }

    return {
      labels,
      datasets: [
        {
          label: 'Текущая процентная ставка (%)',
          data: dailyRates,
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          fill: true,
          tension: 0.4
        }
      ]
    };
  };

  const getDailyExpensesChartData = () => {
    const openTrades = trades.filter(trade => !trade.exitDate);
    const today = new Date();
    const labels = [];
    const dailyData = [];
    
    // Генерируем данные за последние 30 дней
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      labels.push(date.toLocaleDateString('ru-RU', { 
        day: '2-digit', 
        month: 'short' 
      }));
      
      let dailyExpense = 0;
      
      // Рассчитываем ежедневные расходы на процентах для каждой сделки на эту дату
      openTrades.forEach(trade => {
        const tradeDetails = allTradesDetails[trade.id];
        const tradeStartDate = new Date(trade.entryDate);
        
        // Проверяем, была ли сделка уже открыта на эту дату
        if (tradeStartDate <= date) {
          const amount = Number(trade.entryPrice) * trade.quantity;
          let effectiveRate = Number(trade.marginAmount); // Текущая ставка по умолчанию
          
          // Если есть история изменений ставок, найдем действующую ставку на эту дату
          if (tradeDetails?.interestRateChanges && tradeDetails.interestRateChanges.length > 0) {
            // Сортируем изменения по дате
            const sortedChanges = [...tradeDetails.interestRateChanges].sort((a, b) => 
              new Date(a.fromDate) - new Date(b.fromDate)
            );
            
            // Находим действующую ставку на целевую дату
            for (let j = sortedChanges.length - 1; j >= 0; j--) {
              const change = sortedChanges[j];
              const changeFromDate = new Date(change.fromDate);
              
              if (date >= changeFromDate) {
                effectiveRate = change.rate;
                break;
              }
            }
          }
          
          // Рассчитываем ежедневную сумму процентов
          const dailyInterest = amount * effectiveRate / 100 / 365;
          dailyExpense += dailyInterest;
        }
      });
      
      dailyData.push(Math.max(0, Math.round(dailyExpense * 100) / 100));
    }
    
    return {
      labels,
      datasets: [
        {
          label: 'Ежедневные расходы на проценты (₽)',
          data: dailyData,
          borderColor: 'rgba(255, 99, 132, 1)',
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          borderWidth: 2,
          fill: true,
          tension: 0.1
        }
      ]
    };
  };

  const lineChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  const changeInterestRate = async (tradeId, newRate, effectiveDate) => {
    try {
      await axios.post(
        `http://localhost:8081/api/trades/${tradeId}/change-interest-rate?newRate=${newRate}&effectiveDate=${effectiveDate}`
      );
      
      // Обновляем данные после изменения ставки
      fetchTrades();
      setAllTradesDetails(prev => {
        const newDetails = { ...prev };
        delete newDetails[tradeId];
        return newDetails;
      });
    } catch (error) {
      // Игнорируем ошибки изменения ставки
    }
  };

  const handleBulkRateChange = async () => {
    if (selectedTradeIds.length === 0) return;
    
    try {
      await axios.post('http://localhost:8081/api/trades/change-interest-rate-bulk', {
        tradeIds: selectedTradeIds,
        newRate: parseFloat(bulkRate),
        effectiveDate: bulkDate
      });
      
      fetchTrades();
      setShowBulkModal(false);
      setSelectedTradeIds([]);
      setBulkRate('');
    } catch (error) {
      // Игнорируем ошибки массового изменения ставки
    }
  };

  const handleTradeSelection = (tradeId) => {
    setSelectedTradeIds(prev => 
      prev.includes(tradeId) 
        ? prev.filter(id => id !== tradeId)
        : [...prev, tradeId]
    );
  };

  const stats = useMemo(() => getOverallStatistics(), [trades, allTradesDetails]);

  // Мемоизируем данные графиков для оптимизации производительности
  const overallRatesData = useMemo(() => getOverallRatesChartData(), [trades, allTradesDetails]);
  const dailyExpensesData = useMemo(() => getDailyExpensesChartData(), [trades, allTradesDetails]);

  // Компонент для отображения деталей сделки
  const TradeDetails = ({ trade, details, onRateChange }) => {
    const [newRate, setNewRate] = useState('');
    const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split('T')[0]);

    if (!trade || !details) {
      return (
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Загрузка данных сделки...</p>
        </div>
      );
    }

    // Данные для графика истории ставок
    const rateHistoryData = details?.interestRateChanges ? {
      labels: details.interestRateChanges.map(change => 
        new Date(change.fromDate).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })
      ),
      datasets: [{
        label: 'Процентная ставка (%)',
        data: details.interestRateChanges.map(change => change.rate),
        borderColor: 'rgba(59, 130, 246, 1)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.3,
        pointBackgroundColor: 'rgba(59, 130, 246, 1)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4
      }]
    } : null;

    const handleRateChange = () => {
      if (newRate && effectiveDate) {
        onRateChange(trade.id, newRate, effectiveDate);
        setNewRate('');
      }
    };

    return (
      <div className="p-6 h-full overflow-y-auto">
        {/* Заголовок */}
        <div className="mb-6 pb-4 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">{trade.symbol}</h2>
          <p className="text-gray-500">Сделка #{trade.id} • {trade.quantity.toLocaleString('ru-RU')} акций</p>
        </div>

        {/* Основные метрики */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-900 mb-1">Дневной процент</h3>
            <p className="text-2xl font-bold text-blue-700">
              {details?.dailyInterestAmount?.toLocaleString('ru-RU')} ₽
            </p>
          </div>
          
          <div className="bg-red-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-red-900 mb-1">Накоплено</h3>
            <p className="text-2xl font-bold text-red-700">
              {details?.totalInterestWithVariableRate?.toLocaleString('ru-RU')} ₽
            </p>
          </div>
          
          <div className="bg-green-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-green-900 mb-1">Средневзв. ставка</h3>
            <p className="text-2xl font-bold text-green-700">
              {details?.averageWeightedInterestRate?.toFixed(2)}%
            </p>
          </div>
          
          <div className="bg-purple-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-purple-900 mb-1">Текущая ставка</h3>
            <p className="text-2xl font-bold text-purple-700">{trade.marginAmount}%</p>
          </div>
        </div>

        {/* График истории ставок */}
        {rateHistoryData && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">История ставок</h3>
            <div className="bg-gray-50 rounded-lg p-4 h-64">
              <Line data={rateHistoryData} options={lineChartOptions} />
            </div>
          </div>
        )}

        {/* История изменений */}
        {details?.interestRateChanges && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Хронология изменений</h3>
            <div className="space-y-2">
              {details.interestRateChanges
                .filter(change => {
                  // Исключаем периоды с 0 дней
                  if (change.endDate && change.fromDate === change.endDate) return false;
                  return true;
                })
                .map((change, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{change.rate}%</p>
                    <p className="text-sm text-gray-500">
                      с {new Date(change.fromDate).toLocaleDateString('ru-RU')}
                      {change.endDate && ` до ${new Date(change.endDate).toLocaleDateString('ru-RU')}`}
                    </p>
                  </div>
                  {index === details.interestRateChanges.length - 1 && (
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                      Текущая
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Форма изменения ставки */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Изменить ставку</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Новая ставка (%)
              </label>
              <input
                type="number"
                step="0.01"
                value={newRate}
                onChange={(e) => setNewRate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="3.5"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Дата вступления в силу
              </label>
              <input
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <button
              onClick={handleRateChange}
              disabled={!newRate || !effectiveDate}
              className="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              Применить изменение
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading && trades.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Загрузка данных...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Заголовок и переключатель */}
        <div className="mb-6">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Управление процентными ставками</h1>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowOverallView(true)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  showOverallView
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Общий обзор
              </button>
              <button
                onClick={() => setShowOverallView(false)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  !showOverallView
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Конкретные сделки
              </button>
            </div>
          </div>
        </div>

        {showOverallView ? (
          <div className="space-y-6">
            {/* Статистические карточки */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow-sm p-4 border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Ежедневная плата</p>
                    <p className="text-xl font-bold text-gray-900">
                      {stats.totalDailyPayment.toLocaleString('ru-RU', { 
                        style: 'currency', 
                        currency: 'RUB',
                        maximumFractionDigits: 0 
                      })}
                    </p>
                  </div>
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-4 border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Накопленные проценты</p>
                    <p className="text-xl font-bold text-gray-900">
                      {stats.totalAccumulatedInterest.toLocaleString('ru-RU', { 
                        style: 'currency', 
                        currency: 'RUB',
                        maximumFractionDigits: 0 
                      })}
                    </p>
                  </div>
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-4 border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Средневзв. ставка</p>
                    {stats.loadingProgress < 100 ? (
                      <div className="flex items-center">
                        <Spinner className="w-4 h-4 mr-2" />
                        <span className="text-sm text-gray-500">
                          Загрузка... ({Math.round(stats.loadingProgress)}%)
                        </span>
                      </div>
                    ) : (
                      <p className="text-xl font-bold text-gray-900">
                        {stats.averageRate.toFixed(2)}%
                      </p>
                    )}
                  </div>
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-4 border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Количество позиций</p>
                    <p className="text-xl font-bold text-gray-900">{stats.positionCount}</p>
                  </div>
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Графики */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow-sm p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Текущая процентная ставка (7 дней)</h3>
                <div className="h-64">
                  <Line data={overallRatesData} options={lineChartOptions} />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Ежедневные расходы на проценты (30 дней)</h3>
                <div className="h-64">
                  <Line data={dailyExpensesData} options={lineChartOptions} />
                </div>
              </div>
            </div>

            {/* Таблица с возможностью массового изменения ставок */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b bg-gray-50">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">Открытые позиции</h3>
                  {selectedTradeIds.length > 0 && (
                    <button
                      onClick={() => setShowBulkModal(true)}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                    >
                      Изменить ставку ({selectedTradeIds.length})
                    </button>
                  )}
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        <input
                          type="checkbox"
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTradeIds(trades.filter(t => !t.exitDate).map(t => t.id));
                            } else {
                              setSelectedTradeIds([]);
                            }
                          }}
                          checked={selectedTradeIds.length > 0 && selectedTradeIds.length === trades.filter(t => !t.exitDate).length}
                        />
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Символ</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Количество</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Цена входа</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Текущая ставка</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Средневзв. ставка</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Дневной процент</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Накопленный процент</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {trades.filter(trade => !trade.exitDate).map((trade) => {
                      const details = allTradesDetails[trade.id];
                      return (
                        <tr key={trade.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2">
                            <input
                              type="checkbox"
                              checked={selectedTradeIds.includes(trade.id)}
                              onChange={() => handleTradeSelection(trade.id)}
                            />
                          </td>
                          <td className="px-4 py-2 text-sm font-medium text-gray-900">
                            {trade.id}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900">{trade.symbol}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {trade.quantity.toLocaleString('ru-RU')}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {trade.entryPrice.toFixed(2)} ₽
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {trade.marginAmount}%
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {details?.averageWeightedInterestRate ? 
                              `${details.averageWeightedInterestRate.toFixed(2)}%` : 
                              'Загрузка...'
                            }
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {details?.dailyInterestAmount?.toLocaleString('ru-RU', { 
                              style: 'currency', 
                              currency: 'RUB' 
                            }) || 'Загрузка...'}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {details?.totalInterestWithVariableRate?.toLocaleString('ru-RU', { 
                              style: 'currency', 
                              currency: 'RUB' 
                            }) || 'Загрузка...'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          // Конкретные сделки - новый минималистичный дизайн
          <div className="flex h-screen bg-gray-50">
            {/* Левая панель - список сделок */}
            <div className="w-1/3 bg-white border-r border-gray-200 overflow-y-auto">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Открытые сделки</h3>
                <p className="text-sm text-gray-500">{trades.filter(trade => !trade.exitDate).length} активных позиций</p>
              </div>
              
              <div className="divide-y divide-gray-100">
                {trades.filter(trade => !trade.exitDate).map((trade) => {
                  const details = allTradesDetails[trade.id];
                  const isSelected = selectedTradeId === trade.id;
                  
                  return (
                    <div
                      key={trade.id}
                      onClick={() => setSelectedTradeId(trade.id)}
                      className={`p-4 cursor-pointer transition-colors ${
                        isSelected 
                          ? 'bg-blue-50 border-r-2 border-blue-500' 
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium text-gray-900">{trade.symbol}</h4>
                          <p className="text-sm text-gray-500">ID: {trade.id}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">
                            {details?.averageWeightedInterestRate ? 
                              `${details.averageWeightedInterestRate.toFixed(2)}%` : 
                              `${trade.marginAmount}%`
                            }
                          </p>
                          <p className="text-xs text-gray-500">средняя ставка</p>
                        </div>
                      </div>
                      
                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-gray-500">Дневной %:</span>
                          <p className="font-medium">
                            {details?.dailyInterestAmount ? 
                              `${details.dailyInterestAmount.toLocaleString('ru-RU')} ₽` : 
                              'Загрузка...'
                            }
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500">Накоплено:</span>
                          <p className="font-medium">
                            {details?.totalInterestWithVariableRate ? 
                              `${details.totalInterestWithVariableRate.toLocaleString('ru-RU')} ₽` : 
                              'Загрузка...'
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Правая панель - детали сделки */}
            <div className="flex-1 overflow-y-auto">
              {selectedTradeId ? (
                <TradeDetails 
                  trade={trades.find(t => t.id === selectedTradeId)}
                  details={allTradesDetails[selectedTradeId]}
                  onRateChange={changeInterestRate}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">Выберите сделку</h3>
                    <p className="mt-1 text-sm text-gray-500">Кликните на сделку слева чтобы увидеть детали</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Модальное окно для массового изменения ставок */}
        {showBulkModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-80">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Массовое изменение ставки
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Выбрано сделок: {selectedTradeIds.length}
              </p>
              <div className="space-y-3">
                <input
                  type="number"
                  step="0.1"
                  placeholder="Новая ставка (%)"
                  value={bulkRate}
                  onChange={(e) => setBulkRate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <input
                  type="date"
                  value={bulkDate}
                  onChange={(e) => setBulkDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowBulkModal(false)}
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={handleBulkRateChange}
                    className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Применить
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InterestRateManager; 