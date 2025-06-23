import { useState, useEffect } from 'react';

function DailySummary() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8081/api/spot-transactions');
      const data = await response.json();
      setTransactions(data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDailySummary = () => {
    // Group transactions by date
    const dailyGroups = {};
    
    transactions.forEach(tx => {
      const date = new Date(tx.tradeDate).toDateString();
      if (!dailyGroups[date]) {
        dailyGroups[date] = {
          date: tx.tradeDate,
          transactions: [],
          totalBuyAmount: 0,
          totalSellAmount: 0,
          totalDeposits: 0,
          totalWithdrawals: 0,
          totalDividends: 0,
          netCashFlow: 0,
          transactionCount: 0
        };
      }
      
      dailyGroups[date].transactions.push(tx);
      dailyGroups[date].transactionCount++;
      
      const amount = tx.price * tx.quantity;
      
      switch (tx.transactionType) {
        case 'BUY':
          dailyGroups[date].totalBuyAmount += amount;
          dailyGroups[date].netCashFlow -= amount;
          break;
        case 'SELL':
          dailyGroups[date].totalSellAmount += amount;
          dailyGroups[date].netCashFlow += amount;
          break;
        case 'DEPOSIT':
          dailyGroups[date].totalDeposits += amount;
          dailyGroups[date].netCashFlow += amount;
          break;
        case 'WITHDRAW':
          dailyGroups[date].totalWithdrawals += amount;
          dailyGroups[date].netCashFlow -= amount;
          break;
        case 'DIVIDEND':
          dailyGroups[date].totalDividends += amount;
          dailyGroups[date].netCashFlow += amount;
          break;
      }
    });

    // Convert to array and sort by date (newest first)
    return Object.values(dailyGroups)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  const dailySummaries = calculateDailySummary();
  
  // Calculate overall stats
  const totalTransactions = transactions.length;
  const totalBuyAmount = transactions
    .filter(tx => tx.transactionType === 'BUY')
    .reduce((sum, tx) => sum + (tx.price * tx.quantity), 0);
  const totalSellAmount = transactions
    .filter(tx => tx.transactionType === 'SELL')
    .reduce((sum, tx) => sum + (tx.price * tx.quantity), 0);
  const totalNetFlow = totalSellAmount - totalBuyAmount;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const getTransactionTypeBadge = (type) => {
    switch (type) {
      case 'BUY':
        return { label: 'Покупка', color: 'text-blue-600' };
      case 'SELL':
        return { label: 'Продажа', color: 'text-orange-600' };
      case 'DEPOSIT':
        return { label: 'Пополнение', color: 'text-green-600' };
      case 'WITHDRAW':
        return { label: 'Снятие', color: 'text-red-600' };
      case 'DIVIDEND':
        return { label: 'Дивиденды', color: 'text-purple-600' };
      default:
        return { label: type, color: 'text-gray-600' };
    }
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
        <h1 className="text-2xl font-semibold text-gray-900">Дневная сводка</h1>
        <p className="text-gray-600 mt-1">Ежедневная активность и транзакции</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm font-medium text-gray-500">Всего транзакций</div>
          <div className="text-lg font-semibold text-gray-900 mt-1">
            {totalTransactions.toLocaleString()}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm font-medium text-gray-500">Общая сумма покупок</div>
          <div className="text-lg font-semibold text-blue-600 mt-1">
            {formatCurrency(totalBuyAmount)}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm font-medium text-gray-500">Общая сумма продаж</div>
          <div className="text-lg font-semibold text-orange-600 mt-1">
            {formatCurrency(totalSellAmount)}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm font-medium text-gray-500">Чистый поток</div>
          <div className={`text-lg font-semibold mt-1 ${
            totalNetFlow >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {formatCurrency(totalNetFlow)}
          </div>
        </div>
      </div>

      {/* Daily Summary Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Дневная активность</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Дата
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Транзакций
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Покупки
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Продажи
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Пополнения
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Снятия
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Дивиденды
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Чистый поток
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Операции
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {dailySummaries.map((summary, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(summary.date).toLocaleDateString('ru-RU')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {summary.transactionCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                    {summary.totalBuyAmount > 0 ? (
                      <span className="text-blue-600 font-medium">
                        {formatCurrency(summary.totalBuyAmount)}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                    {summary.totalSellAmount > 0 ? (
                      <span className="text-orange-600 font-medium">
                        {formatCurrency(summary.totalSellAmount)}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                    {summary.totalDeposits > 0 ? (
                      <span className="text-green-600 font-medium">
                        {formatCurrency(summary.totalDeposits)}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                    {summary.totalWithdrawals > 0 ? (
                      <span className="text-red-600 font-medium">
                        {formatCurrency(summary.totalWithdrawals)}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                    {summary.totalDividends > 0 ? (
                      <span className="text-purple-600 font-medium">
                        {formatCurrency(summary.totalDividends)}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${
                    summary.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {summary.netCashFlow >= 0 ? '+' : ''}{formatCurrency(summary.netCashFlow)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <div className="flex flex-wrap gap-1">
                      {summary.transactions
                        .reduce((acc, tx) => {
                          const existing = acc.find(item => item.type === tx.transactionType);
                          if (existing) {
                            existing.count++;
                          } else {
                            acc.push({ type: tx.transactionType, count: 1 });
                          }
                          return acc;
                        }, [])
                        .map((item, i) => {
                          const badge = getTransactionTypeBadge(item.type);
                          return (
                            <span key={i} className={`text-xs ${badge.color}`}>
                              {badge.label} ({item.count})
                            </span>
                          );
                        })}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {dailySummaries.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">Нет данных для отображения</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default DailySummary; 