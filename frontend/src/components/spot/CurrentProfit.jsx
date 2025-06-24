import { useState, useEffect } from 'react';
import axios from 'axios';

function CurrentProfit() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Читаем сохранённые курсы акций
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
  }, []);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/spot-transactions');
      const data = response.data;
      
      // Check if data is an array
      if (Array.isArray(data)) {
        setTransactions(data);
      } else {
        console.warn('API returned non-array data:', data);
        setTransactions([]);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateProfitAnalysis = () => {
    const positions = {};
    let totalRealizedPL = 0;
    let totalUnrealizedPL = 0;
    let totalInvested = 0;
    let totalCurrentValue = 0;

    // Process transactions to calculate positions and realized P&L
    transactions.forEach(tx => {
      if (tx.transactionType === 'BUY' || tx.transactionType === 'SELL') {
        if (!positions[tx.ticker]) {
          positions[tx.ticker] = {
            ticker: tx.ticker,
            company: tx.company,
            shares: 0,
            totalCost: 0,
            realizedPL: 0,
            transactions: []
          };
        }

        positions[tx.ticker].transactions.push(tx);

        if (tx.transactionType === 'BUY') {
          positions[tx.ticker].shares += tx.quantity;
          positions[tx.ticker].totalCost += tx.price * tx.quantity;
        } else if (tx.transactionType === 'SELL') {
          const avgCost = positions[tx.ticker].shares > 0 ? 
            positions[tx.ticker].totalCost / positions[tx.ticker].shares : 0;
          const realizedPL = (tx.price - avgCost) * tx.quantity;
          
          positions[tx.ticker].realizedPL += realizedPL;
          positions[tx.ticker].shares -= tx.quantity;
          positions[tx.ticker].totalCost -= avgCost * tx.quantity;
          
          totalRealizedPL += realizedPL;
        }
      }
    });

    // Calculate unrealized P&L for remaining positions
    const positionAnalysis = Object.values(positions).map(pos => {
      const currentPrice = savedPrices[pos.ticker] || 0;
      const currentValue = pos.shares * currentPrice;
      const unrealizedPL = pos.shares > 0 ? currentValue - pos.totalCost : 0;
      const avgPrice = pos.shares > 0 ? pos.totalCost / pos.shares : 0;
      const totalPL = pos.realizedPL + unrealizedPL;

      if (pos.shares > 0) {
        totalInvested += pos.totalCost;
        totalCurrentValue += currentValue;
        totalUnrealizedPL += unrealizedPL;
      }

      return {
        ...pos,
        currentPrice,
        currentValue,
        unrealizedPL,
        avgPrice,
        totalPL,
        unrealizedPercent: pos.totalCost > 0 ? (unrealizedPL / pos.totalCost) * 100 : 0,
        totalPercent: pos.totalCost > 0 ? (totalPL / pos.totalCost) * 100 : 0
      };
    }).filter(pos => pos.shares > 0 || pos.realizedPL !== 0);

    return {
      positions: positionAnalysis,
      summary: {
        totalRealizedPL,
        totalUnrealizedPL,
        totalPL: totalRealizedPL + totalUnrealizedPL,
        totalInvested,
        totalCurrentValue,
        totalReturnPercent: totalInvested > 0 ? ((totalRealizedPL + totalUnrealizedPL) / totalInvested) * 100 : 0
      }
    };
  };

  const analysis = calculateProfitAnalysis();

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatPercent = (value) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Текущая прибыль</h1>
        <p className="text-gray-600 mt-1">Анализ прибыли и убытков по позициям</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm font-medium text-gray-500">Реализованная П/У</div>
          <div className={`text-lg font-semibold mt-1 ${
            analysis.summary.totalRealizedPL >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {formatCurrency(analysis.summary.totalRealizedPL)}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm font-medium text-gray-500">Нереализованная П/У</div>
          <div className={`text-lg font-semibold mt-1 ${
            analysis.summary.totalUnrealizedPL >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {formatCurrency(analysis.summary.totalUnrealizedPL)}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm font-medium text-gray-500">Общая П/У</div>
          <div className={`text-lg font-semibold mt-1 ${
            analysis.summary.totalPL >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {formatCurrency(analysis.summary.totalPL)}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm font-medium text-gray-500">Общая доходность</div>
          <div className={`text-lg font-semibold mt-1 ${
            analysis.summary.totalReturnPercent >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {formatPercent(analysis.summary.totalReturnPercent)}
          </div>
        </div>
      </div>

      {/* Profit Analysis Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Анализ прибыли по тикерам</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Тикер
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Компания
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Остаток
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Средняя цена
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Текущая цена
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Реализованная П/У
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Нереализованная П/У
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Общая П/У
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  %
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {analysis.positions.map((position) => (
                <tr key={position.ticker} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {position.ticker}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {position.company}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {position.shares.toLocaleString('ru-RU')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {position.shares > 0 ? formatCurrency(position.avgPrice) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {position.shares > 0 ? formatCurrency(position.currentPrice) : '-'}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${
                    position.realizedPL >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(position.realizedPL)}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${
                    position.unrealizedPL >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {position.shares > 0 ? formatCurrency(position.unrealizedPL) : '-'}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${
                    position.totalPL >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(position.totalPL)}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${
                    position.totalPercent >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {position.totalCost > 0 ? formatPercent(position.totalPercent) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {analysis.positions.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">Нет данных для анализа прибыли</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default CurrentProfit; 