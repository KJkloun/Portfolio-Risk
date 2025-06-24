import React, { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { usePortfolio } from '../../contexts/PortfolioContext';
import { formatPortfolioCurrency } from '../../utils/currencyFormatter';
import axios from 'axios';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const CHART_COLORS = {
  primary: '#6366f1',
  secondary: '#8b5cf6',
  success: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
  light: '#f3f4f6',
  dark: '#1f2937'
};

function AllTransactions() {
  const { currentPortfolio, refreshData, refreshTrigger } = usePortfolio();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [filter, setFilter] = useState('');
  const [sortBy, setSortBy] = useState('tradeDate');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [analytics, setAnalytics] = useState(null);
  const [error, setError] = useState('');
  const [monthlyChartData, setMonthlyChartData] = useState({ labels: [], datasets: [] });
  const [typeDistributionData, setTypeDistributionData] = useState({ labels: [], datasets: [] });
  const [stockVolumeData, setStockVolumeData] = useState({ labels: [], datasets: [] });
  const [showImport, setShowImport] = useState(false);
  const [importData, setImportData] = useState('');
  const [importFile, setImportFile] = useState(null);

  const [formData, setFormData] = useState({
    company: '',
    ticker: '',
    transactionType: 'BUY',
    price: '',
    quantity: '',
    tradeDate: new Date().toISOString().split('T')[0],
    note: ''
  });

  const transactionTypes = [
    { value: 'BUY', label: 'Покупка', color: 'bg-red-100 text-red-800', icon: '📈', cashFlow: -1 },
    { value: 'SELL', label: 'Продажа', color: 'bg-green-100 text-green-800', icon: '📉', cashFlow: 1 },
    { value: 'DEPOSIT', label: 'Поступление', color: 'bg-blue-100 text-blue-800', icon: '💰', cashFlow: 1 },
    { value: 'WITHDRAW', label: 'Вывод', color: 'bg-orange-100 text-orange-800', icon: '💸', cashFlow: -1 },
    { value: 'DIVIDEND', label: 'Дивиденды', color: 'bg-purple-100 text-purple-800', icon: '💎', cashFlow: 1 }
  ];

  useEffect(() => {
    fetchTransactions();
  }, [currentPortfolio, refreshTrigger]);

  useEffect(() => {
    if (transactions.length > 0) {
      calculateAnalytics();
    }
  }, [selectedPeriod, transactions]);

  const fetchTransactions = async () => {
    if (!currentPortfolio?.id) {
      setLoading(false);
      return;
    }

    try {
      const response = await axios.get('/api/spot-transactions', {
        headers: {
          'X-Portfolio-ID': currentPortfolio.id
        }
      });
      const data = response.data;
      
      // Transform API data to match frontend expectations
      const transformedData = Array.isArray(data) ? data.map(tx => ({
        ...tx,
        tradeDate: tx.transactionDate || tx.tradeDate,
        totalAmount: tx.amount || tx.totalAmount
      })) : [];
      
      // Always update transactions, even if empty
      setTransactions(transformedData.sort((a, b) => new Date(b.tradeDate) - new Date(a.tradeDate)));
      calculateAnalytics(transformedData);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setError('Ошибка загрузки транзакций: ' + error.message);
      setTransactions([]);
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  };

  const calculateAnalytics = (transactionsData = transactions) => {
    if (!transactionsData || transactionsData.length === 0) {
      setAnalytics(null);
      return;
    }

    try {
      // Filter transactions by selected period
      const filteredData = getFilteredTransactionsByPeriod(transactionsData);
      
      const monthlyData = {};
      const typeData = {};
      const stockVolumes = {};
      
      let totalDeposits = 0; // Only deposits
      let totalStockPurchases = 0; // Only stock purchases
      let netCashFlow = 0;
      let transactionCount = filteredData.length;
      let uniqueStocks = new Set();

      console.log('Analytics Debug - Processing transactions:', filteredData.length);

      filteredData.forEach(tx => {
        // Calculate cash flow for this transaction
        const cashFlow = calculateCashFlow(tx);
        netCashFlow += cashFlow;
        
        // Get the signed amount from backend (negative for outflows, positive for inflows)
        const signedAmount = parseFloat(tx.amount || tx.totalAmount || 0);
        
        console.log(`Transaction: ${tx.transactionType} ${tx.ticker || 'USD'} - SignedAmount: ${signedAmount}, CashFlow: ${cashFlow}`);
        
        // Track deposits vs stock investments
        if (tx.transactionType === 'DEPOSIT') {
          // Money deposited into account
          totalDeposits += Math.abs(signedAmount);
        } else if (tx.transactionType === 'BUY') {
          // Money spent on stocks
          totalStockPurchases += Math.abs(signedAmount);
        }

        // Track unique stocks
        if (tx.ticker && tx.ticker !== 'USD') {
          uniqueStocks.add(tx.ticker);
        }

        // Monthly data
        if (tx.tradeDate) {
          const monthKey = format(new Date(tx.tradeDate), 'yyyy-MM');
          if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = { inflow: 0, outflow: 0, net: 0 };
          }
          
          if (cashFlow > 0) {
            monthlyData[monthKey].inflow += cashFlow;
          } else {
            monthlyData[monthKey].outflow += Math.abs(cashFlow);
          }
          monthlyData[monthKey].net += cashFlow;
        }

        // Transaction type distribution
        const typeLabel = transactionTypes.find(t => t.value === tx.transactionType)?.label || tx.transactionType;
        typeData[typeLabel] = (typeData[typeLabel] || 0) + 1;

        // Stock purchase volumes (only purchases, not sales)
        if (tx.ticker && tx.ticker !== 'USD' && tx.transactionType === 'BUY') {
          stockVolumes[tx.ticker] = (stockVolumes[tx.ticker] || 0) + Math.abs(signedAmount);
        }
      });

      console.log(`Analytics Summary:
        Total Deposits: ${totalDeposits}
        Total Stock Purchases: ${totalStockPurchases}
        Net Cash Flow: ${netCashFlow}
        Unique Stocks: ${uniqueStocks.size}`);

      setAnalytics({
        transactionCount,
        totalInvested: totalDeposits,
        totalReceived: totalStockPurchases,
        netCashFlow,
        uniqueStocksCount: uniqueStocks.size,
        monthlyData,
        typeData,
        stockVolumes
      });

      // Update chart data
      updateChartData(monthlyData, typeData, stockVolumes);
    } catch (error) {
      console.error('Error calculating analytics:', error);
      setAnalytics(null);
    }
  };

  const getFilteredTransactionsByPeriod = (data = transactions) => {
    if (selectedPeriod === 'all') return data;
    
    const now = new Date();
    const cutoffDate = new Date();
    
    switch (selectedPeriod) {
      case '1m':
        cutoffDate.setMonth(now.getMonth() - 1);
        break;
      case '3m':
        cutoffDate.setMonth(now.getMonth() - 3);
        break;
      case '6m':
        cutoffDate.setMonth(now.getMonth() - 6);
        break;
      case '1y':
        cutoffDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        return data;
    }
    
    return data.filter(tx => {
      if (!tx.tradeDate) return false;
      try {
        return new Date(tx.tradeDate) >= cutoffDate;
      } catch {
        return false;
      }
    });
  };

  const calculateCashFlow = (transaction) => {
    // Backend already calculates amount correctly (negative for purchases, positive for sales)
    // So we just return the amount from backend
    return transaction.amount || transaction.totalAmount || 0;
  };

  const handleCreateTransaction = async () => {
    if (!currentPortfolio?.id) return;

    try {
      const transactionData = {
        company: formData.company,
        ticker: formData.ticker,
        transactionType: formData.transactionType,
        price: parseFloat(formData.price) || 0,
        quantity: parseInt(formData.quantity) || 0,
        transactionDate: formData.tradeDate, // Backend expects transactionDate
        note: formData.note,
        portfolioId: currentPortfolio.id
      };

      console.log('Sending transaction data:', transactionData); // Debug log

      let response;
      if (editingTransaction) {
        // Update existing transaction
        response = await axios.put(`/api/spot-transactions/${editingTransaction.id}`, transactionData, {
          headers: {
            'X-Portfolio-ID': currentPortfolio.id
          }
        });
      } else {
        // Create new transaction
        response = await axios.post('/api/spot-transactions', transactionData, {
          headers: {
            'X-Portfolio-ID': currentPortfolio.id
          }
        });
      }

      if (response.status === 200 || response.status === 201) {
        setShowForm(false);
        setEditingTransaction(null);
        setFormData({
          company: '',
          ticker: '',
          transactionType: 'BUY',
          price: '',
          quantity: '',
          tradeDate: new Date().toISOString().split('T')[0],
          note: ''
        });
        // Force refresh with a slight delay to ensure backend is updated
        setTimeout(() => {
          fetchTransactions();
          refreshData(); // Notify all components to refresh
        }, 100);
      }
    } catch (error) {
      console.error('Error creating/updating transaction:', error);
      setError('Ошибка создания/обновления транзакции: ' + error.response?.data?.message || error.message);
    }
  };

  const handleEdit = (transaction) => {
    setEditingTransaction(transaction);
    
    // Format date for input field (needs YYYY-MM-DD format)
    let formattedDate = '';
    if (transaction.tradeDate) {
      try {
        const date = new Date(transaction.tradeDate);
        if (!isNaN(date.getTime())) {
          formattedDate = date.toISOString().split('T')[0];
        } else {
          formattedDate = transaction.tradeDate;
        }
      } catch {
        formattedDate = transaction.tradeDate;
      }
    }
    
    setFormData({
      company: transaction.company,
      ticker: transaction.ticker,
      transactionType: transaction.transactionType,
      price: transaction.price.toString(),
      quantity: transaction.quantity.toString(),
      tradeDate: formattedDate,
      note: transaction.note || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Вы уверены, что хотите удалить эту транзакцию?')) {
      try {
        await axios.delete(`/api/spot-transactions/${id}`);
        setTimeout(() => {
          fetchTransactions();
          refreshData(); // Notify all components to refresh
        }, 100);
      } catch (error) {
        console.error('Error deleting transaction:', error);
        setError('Ошибка удаления транзакции: ' + error.message);
      }
    }
  };

  const formatCurrency = (amount) => {
    return formatPortfolioCurrency(amount, currentPortfolio, 2);
  };

  const formatChartCurrency = (value) => {
    return formatPortfolioCurrency(value, currentPortfolio, 0);
  };

  const getTypeConfig = (type) => {
    return transactionTypes.find(t => t.value === type) || transactionTypes[0];
  };

  const filteredTransactions = transactions.filter(tx => 
    tx.company?.toLowerCase().includes(filter.toLowerCase()) ||
    tx.ticker?.toLowerCase().includes(filter.toLowerCase()) ||
    tx.note?.toLowerCase().includes(filter.toLowerCase())
  );

  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    let aVal = a[sortBy];
    let bVal = b[sortBy];
    
    if (sortBy === 'tradeDate') {
      // Handle invalid dates
      if (!aVal) aVal = new Date(0);
      else aVal = new Date(aVal);
      
      if (!bVal) bVal = new Date(0);
      else bVal = new Date(bVal);
    } else if (typeof aVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = bVal.toLowerCase();
    }
    
    if (sortOrder === 'asc') {
      return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    } else {
      return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
    }
  });

  // Chart data is now managed by state variables (monthlyChartData, typeDistributionData, stockVolumeData)
  // and updated via updateChartData function

  const updateChartData = (monthlyData, typeData, stockVolumes) => {
    // Monthly chart data
    const sortedMonths = Object.keys(monthlyData).sort();
    setMonthlyChartData({
      labels: sortedMonths.map(month => format(new Date(month + '-01'), 'MMM yyyy', { locale: ru })),
      datasets: [
        {
          label: 'Приток',
          data: sortedMonths.map(month => monthlyData[month].inflow),
          borderColor: CHART_COLORS.success,
          backgroundColor: CHART_COLORS.success + '20',
          fill: false,
          tension: 0.1
        },
        {
          label: 'Отток',
          data: sortedMonths.map(month => monthlyData[month].outflow),
          borderColor: CHART_COLORS.danger,
          backgroundColor: CHART_COLORS.danger + '20',
          fill: false,
          tension: 0.1
        }
      ]
    });

    // Type distribution chart data
    setTypeDistributionData({
      labels: Object.keys(typeData),
      datasets: [{
        data: Object.values(typeData),
        backgroundColor: [
          CHART_COLORS.danger,
          CHART_COLORS.success,
          CHART_COLORS.primary,
          CHART_COLORS.warning,
          CHART_COLORS.secondary
        ],
        borderWidth: 0
      }]
    });

    // Stock volume chart data
    const topStocks = Object.entries(stockVolumes)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);

    setStockVolumeData({
      labels: topStocks.map(([ticker]) => ticker),
      datasets: [{
        label: 'Покупки по акциям',
        data: topStocks.map(([,volume]) => volume),
        backgroundColor: CHART_COLORS.primary,
        borderWidth: 0
      }]
    });
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setImportFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImportData(e.target.result);
      };
      reader.readAsText(file, 'UTF-8');
    }
  };

  const handleImport = async () => {
    if (!currentPortfolio?.id || !importData.trim()) return;

    try {
      const lines = importData.trim().split('\n');
      const transactions = [];

      // Function to parse different date formats
      const parseDate = (dateStr) => {
        if (!dateStr) return null;
        
        // Remove quotes and trim
        const cleanDate = dateStr.replace(/"/g, '').trim();
        
        // Try different date formats
        const formats = [
          // ISO format: 2024-01-15
          /^\d{4}-\d{2}-\d{2}$/,
          // European format: 15.01.2024
          /^\d{1,2}\.\d{1,2}\.\d{4}$/,
          // US format: 01/15/2024
          /^\d{1,2}\/\d{1,2}\/\d{4}$/,
          // European format: 15-01-2024
          /^\d{1,2}-\d{1,2}-\d{4}$/
        ];

        let parsedDate = null;

        if (formats[0].test(cleanDate)) {
          // ISO format
          parsedDate = new Date(cleanDate);
        } else if (formats[1].test(cleanDate)) {
          // European format: 15.01.2024
          const [day, month, year] = cleanDate.split('.');
          parsedDate = new Date(year, month - 1, day);
        } else if (formats[2].test(cleanDate)) {
          // US format: 01/15/2024
          parsedDate = new Date(cleanDate);
        } else if (formats[3].test(cleanDate)) {
          // European format with dashes: 15-01-2024
          const [day, month, year] = cleanDate.split('-');
          parsedDate = new Date(year, month - 1, day);
        } else {
          // Try to parse as-is
          parsedDate = new Date(cleanDate);
        }

        if (parsedDate && !isNaN(parsedDate.getTime())) {
          return parsedDate.toISOString().split('T')[0]; // Return YYYY-MM-DD format
        }
        
        return cleanDate; // Return original if can't parse
      };

      for (const line of lines) {
        // Split by comma or semicolon, handle quoted values
        const parts = line.split(/[,;]/).map(item => item.replace(/"/g, '').trim());
        
        if (parts.length >= 6) {
          const [date, company, ticker, type, price, quantity, ...rest] = parts;
          const note = rest.join(' ').trim(); // Join remaining parts as note
          
          if (date && company && ticker && type && price && quantity) {
            transactions.push({
              transactionDate: parseDate(date), // Backend expects transactionDate
              company: company.trim(),
              ticker: ticker.toUpperCase().trim(),
              transactionType: type.toUpperCase().trim(),
              price: parseFloat(price.replace(/[^\d.-]/g, '')) || 0, // Remove currency symbols
              quantity: parseInt(quantity.replace(/[^\d.-]/g, '')) || 0, // Remove formatting
              note: note || '',
              portfolioId: currentPortfolio.id
            });
          }
        }
      }

      if (transactions.length === 0) {
        alert('Не найдено валидных транзакций для импорта. Проверьте формат данных.');
        return;
      }

      // Import each transaction
      for (const transaction of transactions) {
        await axios.post('/api/spot-transactions', transaction, {
          headers: {
            'X-Portfolio-ID': currentPortfolio.id
          }
        });
      }

      setShowImport(false);
      setImportData('');
      
      // Refresh data after import
      setTimeout(() => {
        fetchTransactions();
        refreshData();
      }, 100);

      alert(`Успешно импортировано ${transactions.length} транзакций`);
    } catch (error) {
      console.error('Error importing transactions:', error);
      setError('Ошибка импорта транзакций: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800 mx-auto mb-4"></div>
          <p className="text-gray-500">Загрузка транзакций...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">⚠️</div>
          <p className="text-gray-700 mb-4">{error}</p>
          {error.includes('Портфель не выбран') && (
            <button
              onClick={() => window.location.href = '/'}
              className="bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Выбрать портфель
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!currentPortfolio) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-400 mb-4">📋</div>
          <p className="text-gray-700 mb-4">Портфель не выбран</p>
          <p className="text-gray-500 text-sm mb-4">Пожалуйста, выберите портфель для просмотра транзакций</p>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      <div className="container-fluid p-4 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h3 className="text-2xl font-light text-gray-800 mb-2">Все транзакции</h3>
            <p className="text-gray-500">Полная история операций по спотовому портфелю (USD)</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowImport(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              📥 Импорт
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              + Новая транзакция
            </button>
          </div>
        </div>

        {/* Transaction Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
              <h4 className="text-lg font-medium text-gray-800 mb-4">
                {editingTransaction ? 'Редактировать транзакцию' : 'Новая транзакция'}
              </h4>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Компания</label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => setFormData({...formData, company: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                    placeholder="Название компании"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Тикер</label>
                  <input
                    type="text"
                    value={formData.ticker}
                    onChange={(e) => setFormData({...formData, ticker: e.target.value.toUpperCase()})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                    placeholder="AAPL, USD и т.д."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Тип операции</label>
                  <select
                    value={formData.transactionType}
                    onChange={(e) => setFormData({...formData, transactionType: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    {transactionTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.icon} {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Цена</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({...formData, price: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Количество</label>
                    <input
                      type="number"
                      value={formData.quantity}
                      onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Дата</label>
                  <input
                    type="date"
                    value={formData.tradeDate}
                    onChange={(e) => setFormData({...formData, tradeDate: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Примечание (опционально)</label>
                  <textarea
                    value={formData.note}
                    onChange={(e) => setFormData({...formData, note: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                    placeholder="Дополнительная информация..."
                    rows="2"
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    onClick={handleCreateTransaction}
                    className="flex-1 bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    {editingTransaction ? 'Сохранить' : 'Создать'}
                  </button>
                  <button
                    onClick={() => {
                      setShowForm(false);
                      setEditingTransaction(null);
                      setFormData({
                        company: '',
                        ticker: '',
                        transactionType: 'BUY',
                        price: '',
                        quantity: '',
                        tradeDate: new Date().toISOString().split('T')[0],
                        note: ''
                      });
                    }}
                    className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Import Modal */}
        {showImport && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-2xl mx-4">
              <h4 className="text-lg font-medium text-gray-800 mb-4">
                Импорт транзакций
              </h4>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Формат данных: Дата, Компания, Тикер, Тип, Цена, Количество, Примечание
                  </label>
                  <div className="text-xs text-gray-500 mb-3">
                    <div>Поддерживаемые форматы дат: 2024-01-15, 15.01.2024, 15/01/2024, 15-01-2024</div>
                    <div>Пример: 15.01.2024,Apple Inc,AAPL,BUY,150.00,10,Покупка акций</div>
                    <div>Или из Excel: "15.01.2024";"Apple Inc";"AAPL";"BUY";"$150.00";"10";"Примечание"</div>
                  </div>
                  
                  {/* File Upload */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Загрузить CSV файл
                    </label>
                    <input
                      type="file"
                      accept=".csv,.txt"
                      onChange={handleFileUpload}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                    />
                    {importFile && (
                      <p className="text-sm text-green-600 mt-1">
                        Файл загружен: {importFile.name}
                      </p>
                    )}
                  </div>

                  {/* Manual Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Или введите данные вручную
                    </label>
                    <textarea
                      value={importData}
                      onChange={(e) => setImportData(e.target.value)}
                      className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                      placeholder="Вставьте данные транзакций..."
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    onClick={handleImport}
                    disabled={!importData.trim()}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    Импортировать
                  </button>
                  <button
                    onClick={() => {
                      setShowImport(false);
                      setImportData('');
                      setImportFile(null);
                    }}
                    className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Period Filter */}
        <div className="mb-6">
          <div className="flex gap-2 flex-wrap">
            {[
              { key: 'all', label: 'Все время' },
              { key: '1y', label: '1 год' },
              { key: '6m', label: '6 месяцев' },
              { key: '3m', label: '3 месяца' },
              { key: '1m', label: '1 месяц' }
            ].map(p => (
              <button
                key={p.key}
                onClick={() => setSelectedPeriod(p.key)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                  selectedPeriod === p.key 
                    ? 'bg-gray-800 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {analytics && (
          <>
            {/* Key Metrics */}
            <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border-0 overflow-hidden">
                <div className="px-6 py-4 text-center">
                  <div className="text-2xl font-light text-gray-800">
                    {analytics.transactionCount || 0}
                  </div>
                  <div className="text-xs text-gray-400">всего операций</div>
                </div>
              </div>
              
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border-0 overflow-hidden">
                <div className="px-6 py-4 text-center">
                  <div className="text-2xl font-light text-indigo-600">
                    {formatCurrency(analytics.totalInvested || 0)}
                  </div>
                  <div className="text-xs text-gray-400">поступления на счет</div>
                </div>
              </div>
              
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border-0 overflow-hidden">
                <div className="px-6 py-4 text-center">
                  <div className="text-2xl font-light text-indigo-600">
                    {formatCurrency(analytics.totalReceived || 0)}
                  </div>
                  <div className="text-xs text-gray-400">потрачено на акции</div>
                </div>
              </div>
              
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border-0 overflow-hidden">
                <div className="px-6 py-4 text-center">
                  <div className={`text-2xl font-light ${(analytics.netCashFlow || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {formatCurrency(analytics.netCashFlow || 0)}
                  </div>
                  <div className="text-xs text-gray-400">чистый денежный поток</div>
                </div>
              </div>
            </div>

            {/* Charts */}
            <div className="mb-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Monthly Cash Flow */}
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border-0 overflow-hidden">
                <div className="px-4 py-3">
                  <h6 className="text-base font-medium text-gray-700 mb-1">Денежные потоки по месяцам</h6>
                  <p className="text-xs text-gray-400">Динамика входящих и исходящих средств</p>
                </div>
                <div className="px-4 pb-4">
                  {monthlyChartData.labels.length > 0 ? (
                    <Line 
                      data={monthlyChartData} 
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { 
                            display: true,
                            position: 'bottom',
                            labels: { font: { size: 10 } }
                          }
                        },
                        scales: {
                          y: {
                            grid: { display: false },
                            ticks: {
                              color: '#9ca3af',
                              font: { size: 10 },
                              callback: function(value) { 
                                return formatChartCurrency(value);
                              }
                            }
                          },
                          x: {
                            grid: { display: false },
                            ticks: { 
                              color: '#9ca3af',
                              font: { size: 10 }
                            }
                          }
                        }
                      }}
                      height={180}
                    />
                  ) : (
                    <div className="h-[180px] flex items-center justify-center text-gray-400 text-sm">
                      Нет данных для отображения
                    </div>
                  )}
                </div>
              </div>

              {/* Transaction Types */}
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border-0 overflow-hidden">
                <div className="px-4 py-3">
                  <h6 className="text-base font-medium text-gray-700 mb-1">Типы операций</h6>
                  <p className="text-xs text-gray-400">Распределение по видам транзакций</p>
                </div>
                <div className="px-4 pb-4">
                  {typeDistributionData.labels.length > 0 ? (
                    <Doughnut 
                      data={typeDistributionData} 
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { 
                            position: 'bottom',
                            labels: {
                              font: { size: 10 },
                              color: '#6b7280'
                            }
                          }
                        }
                      }}
                      height={180}
                    />
                  ) : (
                    <div className="h-[180px] flex items-center justify-center text-gray-400 text-sm">
                      Нет данных для отображения
                    </div>
                  )}
                </div>
              </div>

              {/* Volume by Stock */}
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border-0 overflow-hidden">
                <div className="px-4 py-3">
                  <h6 className="text-base font-medium text-gray-700 mb-1">Покупки по акциям</h6>
                  <p className="text-xs text-gray-400">Топ-10 акций по объему покупок</p>
                </div>
                <div className="px-4 pb-4">
                  {stockVolumeData.labels.length > 0 ? (
                    <Bar 
                      data={stockVolumeData} 
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { display: false }
                        },
                        scales: {
                          y: {
                            grid: { display: false },
                            ticks: {
                              color: '#9ca3af',
                              font: { size: 10 },
                              callback: function(value) { 
                                return formatChartCurrency(value);
                              }
                            }
                          },
                          x: {
                            grid: { display: false },
                            ticks: { 
                              color: '#9ca3af',
                              font: { size: 10 }
                            }
                          }
                        }
                      }}
                      height={180}
                    />
                  ) : (
                    <div className="h-[180px] flex items-center justify-center text-gray-400 text-sm">
                      Нет данных для отображения
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Transactions Table */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border-0 overflow-hidden">
          <div className="px-6 py-4">
            <h6 className="text-lg font-medium text-gray-700 mb-1">История транзакций</h6>
            <p className="text-sm text-gray-400">{getFilteredTransactionsByPeriod().length} операций</p>
          </div>
          {getFilteredTransactionsByPeriod().length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Дата</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Компания</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Тикер</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Тип</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Количество</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Цена</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Сумма</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Кэш-флоу</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {getFilteredTransactionsByPeriod().map((transaction, index) => {
                    const transactionType = transactionTypes.find(t => t.value === transaction.transactionType);
                    const cashFlow = calculateCashFlow(transaction);
                    
                    return (
                      <tr key={index} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 text-sm text-gray-800">
                          {(() => {
                            if (!transaction.tradeDate) return '-';
                            try {
                              const date = new Date(transaction.tradeDate);
                              if (isNaN(date.getTime())) return transaction.tradeDate; // Show original if invalid
                              return format(date, 'dd.MM.yyyy', { locale: ru });
                            } catch {
                              return transaction.tradeDate; // Show original if format fails
                            }
                          })()}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-800">
                          {transaction.company || '-'}
                        </td>
                        <td className="px-4 py-4 text-sm font-medium text-gray-800">
                          {transaction.ticker || '-'}
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${transactionType?.color || 'bg-gray-100 text-gray-800'}`}>
                            {transactionType?.icon} {transactionType?.label || transaction.transactionType}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-800 text-right">
                          {transaction.quantity || '-'}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-800 text-right">
                          {transaction.price ? formatCurrency(transaction.price) : '-'}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-800 text-right">
                          {formatCurrency(transaction.totalAmount || (transaction.price * transaction.quantity) || 0)}
                        </td>
                        <td className={`px-4 py-4 text-sm text-right font-medium ${cashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {cashFlow >= 0 ? '+' : ''}{formatCurrency(cashFlow)}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => handleEdit(transaction)}
                              className="text-blue-600 hover:text-blue-800 text-sm"
                              title="Редактировать"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleDelete(transaction.id)}
                              className="text-red-600 hover:text-red-800 text-sm"
                              title="Удалить"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-6 py-8 text-center">
              <div className="text-gray-400 text-sm">Нет транзакций для отображения</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AllTransactions; 