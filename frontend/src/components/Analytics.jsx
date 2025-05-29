import { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';

function Analytics() {
  const [summary, setSummary] = useState(null);
  const [monthlyData, setMonthlyData] = useState([]);
  const [symbolData, setSymbolData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });

  // Фирменные цвета для графиков
  const CHART_COLORS = ['#0075FF', '#00B234', '#FFDD00', '#ED0000', '#7B61FF'];

  useEffect(() => {
    loadAnalytics();
  }, [dateRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError('');

      const params = new URLSearchParams();
      if (dateRange.startDate) params.append('startDate', dateRange.startDate);
      if (dateRange.endDate) params.append('endDate', dateRange.endDate);

      const [summaryRes, monthlyRes, symbolRes] = await Promise.all([
        axios.get(`/api/trades/analytics/summary?${params}`),
        axios.get(`/api/trades/analytics/monthly?${params}`),
        axios.get(`/api/trades/analytics/symbols?${params}`)
      ]);

      setSummary(summaryRes.data);
      
      // Форматируем данные для отображения на графике
      const formattedMonthly = monthlyRes.data.map(item => ({
        ...item,
        month: format(new Date(item.month), 'MMM yyyy', { locale: ru })
      }));
      
      setMonthlyData(formattedMonthly);
      setSymbolData(symbolRes.data);
    } catch (err) {
      setError('Не удалось загрузить аналитические данные');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Форматтер для валюты
  const currencyFormatter = (value) => {
    return value.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB' });
  };

  // Пользовательский тултип для графиков
  const CustomTooltip = ({ active, payload, label, formatter }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 shadow-md rounded-lg">
          <p className="text-sm font-medium text-gray-900">{label}</p>
          {payload.map((entry, index) => (
            <p key={`item-${index}`} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatter ? formatter(entry.value) : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-brand-blue-500 border-r-2 border-b-2 border-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок и фильтры по дате */}
      <div className="bg-white shadow-card rounded-2xl border border-gray-100">
        <div className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Аналитика кредитных сделок</h2>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex flex-col">
                <label htmlFor="start-date" className="text-sm text-gray-600 mb-1">Начальная дата</label>
                <input
                  id="start-date"
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                  className="input"
                />
              </div>
              <div className="flex flex-col">
                <label htmlFor="end-date" className="text-sm text-gray-600 mb-1">Конечная дата</label>
                <input
                  id="end-date"
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                  className="input"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-brand-red-50 border border-brand-red-200 text-brand-red-700 px-4 py-3 rounded-xl mb-6">
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Сводные показатели */}
      {summary && (
        <div className="bg-white shadow-card rounded-2xl border border-gray-100">
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-6">Сводка</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gradient-to-r from-brand-blue-500 to-brand-blue-600 rounded-2xl text-white p-6">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium opacity-90">Всего сделок</h4>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 opacity-80" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                    <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-3xl font-bold">{summary.totalTrades}</p>
              </div>

              <div className="bg-gradient-to-r from-brand-green-500 to-brand-green-600 rounded-2xl text-white p-6">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium opacity-90">Выигрышные</h4>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 opacity-80" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-3xl font-bold">{summary.winningTrades}</p>
              </div>

              <div className="bg-gradient-to-r from-brand-yellow-500 to-brand-yellow-400 rounded-2xl text-gray-900 p-6">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium opacity-80">Винрейт</h4>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 opacity-80" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-3xl font-bold">{summary.winRate.toFixed(1)}%</p>
              </div>

              <div className={`rounded-2xl text-white p-6 ${summary.totalProfit >= 0 ? 'bg-gradient-to-r from-brand-green-500 to-brand-green-600' : 'bg-gradient-to-r from-brand-red-500 to-brand-red-600'}`}>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium opacity-90">Общая прибыль</h4>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 opacity-80" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-3xl font-bold">
                  {currencyFormatter(Math.abs(summary.totalProfit))}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Графики */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* График месячной прибыли */}
        <div className="bg-white shadow-card rounded-2xl border border-gray-100">
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Месячная прибыль</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fill: '#6B7280', fontSize: 12 }}
                    axisLine={{ stroke: '#E5E7EB' }}
                    tickLine={{ stroke: '#E5E7EB' }}
                  />
                  <YAxis 
                    tick={{ fill: '#6B7280', fontSize: 12 }}
                    axisLine={{ stroke: '#E5E7EB' }}
                    tickLine={{ stroke: '#E5E7EB' }}
                    tickFormatter={currencyFormatter}
                  />
                  <Tooltip content={<CustomTooltip formatter={currencyFormatter} />} />
                  <Line 
                    type="monotone" 
                    dataKey="profit" 
                    name="Прибыль" 
                    stroke="#0075FF" 
                    strokeWidth={3}
                    dot={{ r: 4, fill: 'white', stroke: '#0075FF', strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: '#0075FF', stroke: 'white', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* График по символам */}
        <div className="bg-white shadow-card rounded-2xl border border-gray-100">
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Топ символов по прибыли</h3>
            <div className="h-80 flex">
              <div className="w-2/3 h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={symbolData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="symbol" 
                      tick={{ fill: '#6B7280', fontSize: 12 }}
                      axisLine={{ stroke: '#E5E7EB' }}
                      tickLine={{ stroke: '#E5E7EB' }}
                    />
                    <YAxis 
                      tick={{ fill: '#6B7280', fontSize: 12 }}
                      axisLine={{ stroke: '#E5E7EB' }}
                      tickLine={{ stroke: '#E5E7EB' }}
                      tickFormatter={currencyFormatter}
                    />
                    <Tooltip content={<CustomTooltip formatter={currencyFormatter} />} />
                    <Bar 
                      dataKey="profit" 
                      name="Прибыль" 
                      radius={[4, 4, 0, 0]}
                    >
                      {symbolData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="w-1/3 h-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="90%">
                  <PieChart>
                    <Pie
                      data={symbolData}
                      dataKey="profit"
                      nameKey="symbol"
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      fill="#8884d8"
                      label={({ symbol }) => symbol}
                    >
                      {symbolData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip formatter={currencyFormatter} />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Analytics; 