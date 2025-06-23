import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

function TickerDetails() {
  const { ticker } = useParams();
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTickerDetails();
  }, [ticker]);

  const fetchTickerDetails = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8081/api/spot-transactions');
      const allTransactions = await response.json();
      
      // Filter transactions for this ticker
      const tickerTransactions = allTransactions
        .filter(tx => tx.ticker === ticker)
        .sort((a, b) => new Date(b.tradeDate) - new Date(a.tradeDate));
      
      // Calculate summary
      let totalQuantity = 0;
      let totalBought = 0;
      let totalSold = 0;
      let totalCost = 0;
      let totalRevenue = 0;
      let totalDividends = 0;
      let averageBuyPrice = 0;
      let averageSellPrice = 0;
      
      tickerTransactions.forEach(tx => {
        if (tx.transactionType === 'BUY') {
          totalQuantity += tx.quantity;
          totalBought += tx.quantity;
          totalCost += Math.abs(tx.amount);
        } else if (tx.transactionType === 'SELL') {
          totalQuantity -= tx.quantity;
          totalSold += tx.quantity;
          totalRevenue += tx.amount;
        } else if (tx.transactionType === 'DIVIDEND') {
          totalDividends += tx.amount;
        }
      });
      
      if (totalBought > 0) {
        averageBuyPrice = totalCost / totalBought;
      }
      if (totalSold > 0) {
        averageSellPrice = totalRevenue / totalSold;
      }
      
      // Mock current price
      const mockPrices = {
        'BA': 250.00,
        'XLNX': 150.00,
        'BTCUSD': 45000.00,
        'USD': 1.00
      };
      
      const currentPrice = mockPrices[ticker] || averageBuyPrice;
      const currentValue = totalQuantity * currentPrice;
      const realizedPnL = totalRevenue - (totalSold * averageBuyPrice);
      const unrealizedPnL = totalQuantity > 0 ? currentValue - (totalQuantity * averageBuyPrice) : 0;
      const totalPnL = realizedPnL + unrealizedPnL + totalDividends;
      
      setSummary({
        ticker,
        company: tickerTransactions[0]?.company || ticker,
        totalQuantity,
        totalBought,
        totalSold,
        totalCost,
        totalRevenue,
        totalDividends,
        averageBuyPrice,
        averageSellPrice,
        currentPrice,
        currentValue,
        realizedPnL,
        unrealizedPnL,
        totalPnL
      });
      
      setTransactions(tickerTransactions);
    } catch (error) {
      console.error('Error fetching ticker details:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getTypeConfig = (type) => {
    const types = {
      'DEPOSIT': { label: 'Поступление', color: 'bg-green-100 text-green-800', icon: '💰' },
      'WITHDRAW': { label: 'Снятие', color: 'bg-red-100 text-red-800', icon: '💸' },
      'BUY': { label: 'Покупка', color: 'bg-blue-100 text-blue-800', icon: '📈' },
      'SELL': { label: 'Продажа', color: 'bg-orange-100 text-orange-800', icon: '📉' },
      'DIVIDEND': { label: 'Дивиденды', color: 'bg-purple-100 text-purple-800', icon: '💎' }
    };
    return types[type] || { label: type, color: 'bg-gray-100 text-gray-800', icon: '📄' };
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#9333ea]"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6">
          <div className="flex justify-between items-center">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Link 
                  to="/spot" 
                  className="text-gray-400 hover:text-[#9333ea] transition-colors duration-200"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </Link>
                <h1 className="text-2xl font-semibold text-gray-900">
                  {ticker} - {summary.company}
                </h1>
              </div>
              <p className="text-sm text-gray-500">Детальная статистика и история операций по тикеру</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Общая П/У</div>
              <div className={`text-2xl font-bold ${summary.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(summary.totalPnL)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Основные показатели</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-lg mr-3">
                  📊
                </div>
                <div>
                  <div className="text-sm text-blue-600 font-medium">Текущий остаток</div>
                  <div className="text-lg font-bold text-blue-800">
                    {summary.totalQuantity?.toLocaleString('ru-RU')}
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-lg mr-3">
                  💰
                </div>
                <div>
                  <div className="text-sm text-green-600 font-medium">Текущая стоимость</div>
                  <div className="text-lg font-bold text-green-800">
                    {formatCurrency(summary.currentValue)}
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-lg mr-3">
                  💎
                </div>
                <div>
                  <div className="text-sm text-purple-600 font-medium">Дивиденды</div>
                  <div className="text-lg font-bold text-purple-800">
                    {formatCurrency(summary.totalDividends)}
                  </div>
                </div>
              </div>
            </div>
            <div className={`${summary.totalPnL >= 0 ? 'bg-green-50' : 'bg-red-50'} rounded-lg p-4`}>
              <div className="flex items-center">
                <div className={`w-10 h-10 ${summary.totalPnL >= 0 ? 'bg-green-100' : 'bg-red-100'} rounded-full flex items-center justify-center text-lg mr-3`}>
                  {summary.totalPnL >= 0 ? '📈' : '📉'}
                </div>
                <div>
                  <div className={`text-sm font-medium ${summary.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    Общая П/У
                  </div>
                  <div className={`text-lg font-bold ${summary.totalPnL >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                    {formatCurrency(summary.totalPnL)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                <span className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs mr-2">📈</span>
                Операции покупки
              </h3>
              <div className="space-y-2 text-gray-600">
                <div className="flex justify-between">
                  <span>Всего куплено:</span>
                  <span className="font-medium">{summary.totalBought?.toLocaleString('ru-RU')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Общая стоимость:</span>
                  <span className="font-medium">{formatCurrency(summary.totalCost)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Средняя цена:</span>
                  <span className="font-medium">{formatCurrency(summary.averageBuyPrice)}</span>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                <span className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center text-xs mr-2">📉</span>
                Операции продажи
              </h3>
              <div className="space-y-2 text-gray-600">
                <div className="flex justify-between">
                  <span>Всего продано:</span>
                  <span className="font-medium">{summary.totalSold?.toLocaleString('ru-RU')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Общая выручка:</span>
                  <span className="font-medium">{formatCurrency(summary.totalRevenue)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Средняя цена:</span>
                  <span className="font-medium">{formatCurrency(summary.averageSellPrice)}</span>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                <span className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center text-xs mr-2">📊</span>
                Текущая позиция
              </h3>
              <div className="space-y-2 text-gray-600">
                <div className="flex justify-between">
                  <span>Текущая цена:</span>
                  <span className="font-medium">{formatCurrency(summary.currentPrice)} <span className="text-xs text-gray-400">(мок)</span></span>
                </div>
                <div className="flex justify-between">
                  <span>Реализованная П/У:</span>
                  <span className={`font-medium ${summary.realizedPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(summary.realizedPnL)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Нереализованная П/У:</span>
                  <span className={`font-medium ${summary.unrealizedPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(summary.unrealizedPnL)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">История операций</h2>
          <p className="text-sm text-gray-500 mt-1">Все операции по тикеру {ticker}</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">№</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Дата</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Тип</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Цена</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Кол-во</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Сумма</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Примечание</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {transactions.map((transaction, index) => {
                const typeConfig = getTypeConfig(transaction.transactionType);
                return (
                  <tr key={transaction.id} className="hover:bg-gray-50 transition-colors duration-150">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transactions.length - index}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(transaction.tradeDate).toLocaleDateString('ru-RU')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${typeConfig.color}`}>
                        {typeConfig.icon} {typeConfig.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatCurrency(transaction.price)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {transaction.quantity.toLocaleString('ru-RU')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      <span className={transaction.amount >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                        {formatCurrency(transaction.amount)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                      {transaction.note}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {transactions.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500 text-lg">Нет операций по тикеру {ticker}</div>
            <p className="text-gray-400 mt-2">
              <Link to="/spot" className="text-[#9333ea] hover:text-[#7c3aed] transition-colors duration-200">
                Вернуться к списку всех операций
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default TickerDetails; 