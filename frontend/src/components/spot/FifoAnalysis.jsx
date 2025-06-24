import { useState, useEffect } from 'react';
import axios from 'axios';

function FifoAnalysis() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Получаем сохранённые курсы акций из localStorage один раз при монтировании
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
      
      // Check if data is an array before sorting
      if (Array.isArray(data)) {
        setTransactions(data.sort((a, b) => new Date(a.tradeDate) - new Date(b.tradeDate)));
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

  // FIFO Analysis calculations
  const calculateFifoAnalysis = () => {
    const positions = {};
    const fifoDetails = [];
    let totalRealizedPL = 0;
    let totalUnrealizedPL = 0;
    let totalCostBasis = 0;
    let totalCurrentValue = 0;

    transactions.forEach(tx => {
      if (tx.transactionType === 'BUY') {
        if (!positions[tx.ticker]) {
          positions[tx.ticker] = { shares: 0, purchases: [], totalCost: 0 };
        }
        
        positions[tx.ticker].purchases.push({
          date: tx.tradeDate,
          price: tx.price,
          quantity: tx.quantity,
          remaining: tx.quantity
        });
        positions[tx.ticker].shares += tx.quantity;
        positions[tx.ticker].totalCost += tx.price * tx.quantity;
      } 
      else if (tx.transactionType === 'SELL' && positions[tx.ticker]) {
        let remainingToSell = tx.quantity;
        let saleProceeds = tx.price * tx.quantity;
        let costBasis = 0;
        
        while (remainingToSell > 0 && positions[tx.ticker].purchases.length > 0) {
          const oldestPurchase = positions[tx.ticker].purchases[0];
          const sharesToUse = Math.min(remainingToSell, oldestPurchase.remaining);
          
          costBasis += sharesToUse * oldestPurchase.price;
          oldestPurchase.remaining -= sharesToUse;
          remainingToSell -= sharesToUse;
          
          if (oldestPurchase.remaining === 0) {
            positions[tx.ticker].purchases.shift();
          }
        }
        
        positions[tx.ticker].shares -= tx.quantity;
        positions[tx.ticker].totalCost -= costBasis;
        
        const realizedPL = saleProceeds - costBasis;
        totalRealizedPL += realizedPL;
        
        fifoDetails.push({
          date: tx.tradeDate,
          ticker: tx.ticker,
          type: 'SELL',
          quantity: tx.quantity,
          price: tx.price,
          proceeds: saleProceeds,
          costBasis: costBasis,
          realizedPL: realizedPL,
          holdingPeriod: 'N/A' // Could calculate this with purchase dates
        });
      }
    });

    // Calculate unrealized P&L for remaining positions
    Object.keys(positions).forEach(ticker => {
      if (positions[ticker].shares > 0) {
        const currentPrice = savedPrices[ticker] || 0;
        const currentValue = positions[ticker].shares * currentPrice;
        const unrealizedPL = currentValue - positions[ticker].totalCost;
        
        totalUnrealizedPL += unrealizedPL;
        totalCostBasis += positions[ticker].totalCost;
        totalCurrentValue += currentValue;
      }
    });

    return {
      positions,
      fifoDetails,
      totalRealizedPL,
      totalUnrealizedPL,
      totalCostBasis,
      totalCurrentValue,
      totalPL: totalRealizedPL + totalUnrealizedPL
    };
  };

  const analysis = calculateFifoAnalysis();

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
        <h1 className="text-2xl font-semibold text-gray-900">FIFO Анализ</h1>
        <p className="text-gray-600 mt-1">Детальный анализ сделок по методу FIFO</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm font-medium text-gray-500">Текущая стоимость</div>
          <div className="text-lg font-semibold text-gray-900 mt-1">
            {formatCurrency(analysis.totalCurrentValue)}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm font-medium text-gray-500">Себестоимость</div>
          <div className="text-lg font-semibold text-gray-900 mt-1">
            {formatCurrency(analysis.totalCostBasis)}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm font-medium text-gray-500">Реализованная П/У</div>
          <div className={`text-lg font-semibold mt-1 ${
            analysis.totalRealizedPL >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {formatCurrency(analysis.totalRealizedPL)}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm font-medium text-gray-500">Нереализованная П/У</div>
          <div className={`text-lg font-semibold mt-1 ${
            analysis.totalUnrealizedPL >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {formatCurrency(analysis.totalUnrealizedPL)}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm font-medium text-gray-500">Общая П/У</div>
          <div className={`text-lg font-semibold mt-1 ${
            analysis.totalPL >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {formatCurrency(analysis.totalPL)}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Обзор по тикерам
          </button>
          <button
            onClick={() => setActiveTab('fifo')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'fifo'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            FIFO детали
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'transactions'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Все транзакции
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Позиции по тикерам</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Тикер</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Остаток акций</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Средняя цена</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Текущая цена</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Себестоимость</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Текущая стоимость</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Нереализованная П/У</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {Object.entries(analysis.positions).map(([ticker, position]) => {
                  if (position.shares <= 0) return null;
                  
                  const currentPrice = savedPrices[ticker] || 0;
                  const currentValue = position.shares * currentPrice;
                  const unrealizedPL = currentValue - position.totalCost;
                  const unrealizedPercent = position.totalCost > 0 ? (unrealizedPL / position.totalCost) * 100 : 0;
                  const avgPrice = position.shares > 0 ? position.totalCost / position.shares : 0;
                  
                  return (
                    <tr key={ticker} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {ticker}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {position.shares.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {formatCurrency(avgPrice)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {formatCurrency(currentPrice)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {formatCurrency(position.totalCost)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {formatCurrency(currentValue)}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${
                        unrealizedPL >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(unrealizedPL)}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${
                        unrealizedPercent >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatPercent(unrealizedPercent)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'fifo' && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">FIFO детали продаж</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Дата</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Тикер</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Количество</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Цена продажи</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Выручка</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Себестоимость</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">П/У</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {analysis.fifoDetails.map((detail, index) => {
                  const plPercent = detail.costBasis > 0 ? (detail.realizedPL / detail.costBasis) * 100 : 0;
                  
                  return (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(detail.date).toLocaleDateString('ru-RU')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {detail.ticker}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {detail.quantity.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {formatCurrency(detail.price)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {formatCurrency(detail.proceeds)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {formatCurrency(detail.costBasis)}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${
                        detail.realizedPL >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(detail.realizedPL)}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${
                        plPercent >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatPercent(plPercent)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {analysis.fifoDetails.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">Нет данных о продажах</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'transactions' && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Все транзакции</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Дата</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Тип</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Тикер</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Цена</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Количество</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Сумма</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Примечание</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(tx.tradeDate).toLocaleDateString('ru-RU')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-medium ${
                        tx.transactionType === 'BUY' ? 'text-blue-600' : 
                        tx.transactionType === 'SELL' ? 'text-orange-600' : 'text-gray-600'
                      }`}>
                        {tx.transactionType}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {tx.ticker}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatCurrency(tx.price)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {tx.quantity.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                      {formatCurrency(tx.price * tx.quantity)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {tx.note}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default FifoAnalysis;
