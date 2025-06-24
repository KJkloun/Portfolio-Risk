import { useState, useEffect } from 'react';
import axios from 'axios';

function StockAccounting() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

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
  }, []);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/spot-transactions');
      const data = response.data;
      setTransactions(data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
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
            shares: 0,
            totalCost: 0,
            avgPrice: 0
          };
        }
        
        if (tx.transactionType === 'BUY') {
          positions[tx.ticker].shares += tx.quantity;
          positions[tx.ticker].totalCost += tx.price * tx.quantity;
        } else if (tx.transactionType === 'SELL') {
          const sellValue = tx.price * tx.quantity;
          const avgCost = positions[tx.ticker].shares > 0 ? positions[tx.ticker].totalCost / positions[tx.ticker].shares : 0;
          positions[tx.ticker].shares -= tx.quantity;
          positions[tx.ticker].totalCost -= avgCost * tx.quantity;
        }
        
        if (positions[tx.ticker].shares > 0) {
          positions[tx.ticker].avgPrice = positions[tx.ticker].totalCost / positions[tx.ticker].shares;
        } else {
          positions[tx.ticker].avgPrice = 0;
        }
      }
    });

    // Filter out positions with 0 shares and add current market data
    return Object.values(positions)
      .filter(pos => pos.shares > 0)
      .map(pos => {
        const currentPrice = savedPrices[pos.ticker] || pos.avgPrice;
        const currentValue = pos.shares * currentPrice;
        const unrealizedPL = currentValue - pos.totalCost;
        const unrealizedPercent = pos.totalCost > 0 ? (unrealizedPL / pos.totalCost) * 100 : 0;
        
        return {
          ...pos,
          currentPrice,
          currentValue,
          unrealizedPL,
          unrealizedPercent
        };
      });
  };

  const positions = calculatePositions();
  
  const totalInvested = positions.reduce((sum, pos) => sum + pos.totalCost, 0);
  const totalCurrentValue = positions.reduce((sum, pos) => sum + pos.currentValue, 0);
  const totalUnrealizedPL = totalCurrentValue - totalInvested;
  const totalReturnPercent = totalInvested > 0 ? (totalUnrealizedPL / totalInvested) * 100 : 0;

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
        <h1 className="text-2xl font-semibold text-gray-900">Учёт акций</h1>
        <p className="text-gray-600 mt-1">Текущие позиции и их стоимость</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm font-medium text-gray-500">Всего инвестировано</div>
          <div className="text-lg font-semibold text-gray-900 mt-1">
            {formatCurrency(totalInvested)}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm font-medium text-gray-500">Текущая стоимость</div>
          <div className="text-lg font-semibold text-gray-900 mt-1">
            {formatCurrency(totalCurrentValue)}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm font-medium text-gray-500">Нереализованная П/У</div>
          <div className={`text-lg font-semibold mt-1 ${
            totalUnrealizedPL >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {formatCurrency(totalUnrealizedPL)}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm font-medium text-gray-500">Доходность</div>
          <div className={`text-lg font-semibold mt-1 ${
            totalReturnPercent >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {formatPercent(totalReturnPercent)}
          </div>
        </div>
      </div>

      {/* Positions Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Текущие позиции</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Компания
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Тикер
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Количество
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Средняя цена
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Текущая цена
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Инвестировано
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Текущая стоимость
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  П/У
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  %
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {positions.map((position) => (
                <tr key={position.ticker} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {position.company}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {position.ticker}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {position.shares.toLocaleString('ru-RU')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {formatCurrency(position.avgPrice)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {formatCurrency(position.currentPrice)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {formatCurrency(position.totalCost)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                    {formatCurrency(position.currentValue)}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${
                    position.unrealizedPL >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(position.unrealizedPL)}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${
                    position.unrealizedPercent >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatPercent(position.unrealizedPercent)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {positions.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">Нет открытых позиций</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default StockAccounting; 