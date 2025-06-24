import { useState, useEffect } from 'react';
import axios from 'axios';
import { usePortfolio } from '../../contexts/PortfolioContext';
import { formatPortfolioCurrency } from '../../utils/currencyFormatter';

function StockAccounting() {
  const { currentPortfolio, refreshTrigger } = usePortfolio();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Сохраняем курсы акций, введённые пользователем, из localStorage
  const getSavedPrices = () => {
    try {
      return JSON.parse(localStorage.getItem('stockPrices')) || {};
    } catch {
      return {};
    }
  };
  const savedPrices = getSavedPrices();

  useEffect(() => {
    fetchTransactions();
  }, [currentPortfolio, refreshTrigger]);

  const fetchTransactions = async () => {
    if (!currentPortfolio?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await axios.get('/api/spot-transactions', {
        headers: {
          'X-Portfolio-ID': currentPortfolio.id
        }
      });
      
      const data = response.data;
      const transformedData = Array.isArray(data) ? data.map(tx => ({
        ...tx,
        tradeDate: tx.transactionDate || tx.tradeDate,
        totalAmount: tx.amount || tx.totalAmount
      })) : [];
      
      setTransactions(transformedData);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setError('Ошибка загрузки данных: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const calculatePositions = () => {
    const positions = {};
    
    transactions.forEach(tx => {
      if (tx.transactionType === 'BUY' || tx.transactionType === 'SELL') {
        if (!positions[tx.ticker]) {
          positions[tx.ticker] = {
            ticker: tx.ticker,
            company: tx.company,
            totalBought: 0,
            totalSold: 0,
            remaining: 0,
            totalProfit: 0
          };
        }
        
        if (tx.transactionType === 'BUY') {
          positions[tx.ticker].totalBought += tx.quantity;
          positions[tx.ticker].totalProfit -= tx.price * tx.quantity; // Cost basis
        } else if (tx.transactionType === 'SELL') {
          positions[tx.ticker].totalSold += tx.quantity;
          positions[tx.ticker].totalProfit += tx.price * tx.quantity; // Sale proceeds
        }
        
        positions[tx.ticker].remaining = positions[tx.ticker].totalBought - positions[tx.ticker].totalSold;
      }
    });

    // Show ALL stocks (including those with 0 remaining shares)
    return Object.values(positions).map(pos => {
      const currentPrice = savedPrices[pos.ticker] || 0;
      let finalProfit = pos.totalProfit;
      
      // If we still have remaining shares, add current market value
      if (pos.remaining > 0 && currentPrice > 0) {
        finalProfit += currentPrice * pos.remaining;
      }
      
      return {
        ...pos,
        currentPrice,
        finalProfit,
        status: pos.remaining > 0 ? 'Активная' : 'Закрытая'
      };
    }).sort((a, b) => {
      // Sort by status (active first), then by ticker
      if (a.status !== b.status) {
        return a.status === 'Активная' ? -1 : 1;
      }
      return a.ticker.localeCompare(b.ticker);
    });
  };

  const positions = calculatePositions();
  
  const activePositions = positions.filter(pos => pos.remaining > 0);
  const closedPositions = positions.filter(pos => pos.remaining === 0);
  const totalStocks = positions.length;
  const totalProfit = positions.reduce((sum, pos) => sum + pos.finalProfit, 0);

  const formatCurrency = (amount) => {
    return formatPortfolioCurrency(amount, currentPortfolio, 2);
  };

  const formatPercent = (value) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-300"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">⚠️</div>
          <p className="text-gray-700 mb-4">{error}</p>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      <div className="container-fluid p-4 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h3 className="text-2xl font-light text-gray-800 mb-2">Учёт акций</h3>
          <p className="text-gray-500">Полная статистика по всем акциям в портфеле ({currentPortfolio?.currency || 'USD'})</p>
        </div>

        {/* Summary Stats */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border-0 overflow-hidden">
            <div className="px-6 py-4 text-center">
              <div className="text-2xl font-light text-gray-800">
                {totalStocks}
              </div>
              <div className="text-xs text-gray-400">всего акций</div>
            </div>
          </div>
          
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border-0 overflow-hidden">
            <div className="px-6 py-4 text-center">
              <div className="text-2xl font-light text-blue-500">
                {activePositions.length}
              </div>
              <div className="text-xs text-gray-400">активных позиций</div>
            </div>
          </div>
          
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border-0 overflow-hidden">
            <div className="px-6 py-4 text-center">
              <div className="text-2xl font-light text-gray-500">
                {closedPositions.length}
              </div>
              <div className="text-xs text-gray-400">закрытых позиций</div>
            </div>
          </div>
          
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border-0 overflow-hidden">
            <div className="px-6 py-4 text-center">
              <div className={`text-2xl font-light ${totalProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {formatCurrency(totalProfit)}
              </div>
              <div className="text-xs text-gray-400">общая прибыль</div>
            </div>
          </div>
        </div>

        {/* Positions Table */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border-0 overflow-hidden">
          <div className="px-6 py-4">
            <h6 className="text-lg font-medium text-gray-700 mb-1">Все акции</h6>
            <p className="text-sm text-gray-400">Полная статистика по всем акциям (активные и закрытые позиции)</p>
          </div>
          
          {positions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Компания</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Тикер</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">Статус</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Куплено</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Продано</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Остаток</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Текущая цена</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Прибыль</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map((position) => (
                    <tr key={position.ticker} className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${position.status === 'Закрытая' ? 'opacity-60' : ''}`}>
                      <td className="px-4 py-4 text-sm text-gray-800">
                        {position.company}
                      </td>
                      <td className="px-4 py-4 text-sm font-medium text-gray-800">
                        {position.ticker}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          position.status === 'Активная' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {position.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-800 text-right">
                        {position.totalBought.toLocaleString()}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-800 text-right">
                        {position.totalSold.toLocaleString()}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-800 text-right">
                        {position.remaining.toLocaleString()}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-800 text-right">
                        {position.currentPrice > 0 ? formatCurrency(position.currentPrice) : '-'}
                      </td>
                      <td className={`px-4 py-4 text-sm text-right font-medium ${
                        position.finalProfit >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {position.finalProfit >= 0 ? '+' : ''}{formatCurrency(position.finalProfit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100/80 rounded-full mb-3">
                <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">Нет данных по акциям</h3>
              <p className="text-xs text-gray-400 max-w-md mx-auto">У вас пока нет операций с акциями</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default StockAccounting; 