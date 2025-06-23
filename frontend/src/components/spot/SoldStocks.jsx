import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

function SoldStocks() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSoldStocks();
  }, []);

  const fetchSoldStocks = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8081/api/spot-transactions');
      const allTransactions = await response.json();
      
      // Filter only SELL transactions
      const soldStocks = allTransactions
        .filter(tx => tx.transactionType === 'SELL')
        .sort((a, b) => new Date(b.tradeDate) - new Date(a.tradeDate));
      
      setTransactions(soldStocks);
    } catch (error) {
      console.error('Error fetching sold stocks:', error);
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

  const totalAmount = transactions.reduce((sum, tx) => sum + tx.amount, 0);
  const uniqueStocks = [...new Set(transactions.map(tx => tx.ticker))].length;

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
          <h1 className="text-2xl font-semibold text-gray-900">Проданные акции</h1>
          <p className="text-sm text-gray-500 mt-1">Все операции продажи акций в хронологическом порядке</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Статистика продаж</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-lg mr-3">
                  📊
                </div>
                <div>
                  <div className="text-sm text-blue-600 font-medium">Всего операций</div>
                  <div className="text-lg font-bold text-blue-800">{transactions.length}</div>
                </div>
              </div>
            </div>
            <div className="bg-orange-50 rounded-lg p-4">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-lg mr-3">
                  📉
                </div>
                <div>
                  <div className="text-sm text-orange-600 font-medium">Уникальных акций</div>
                  <div className="text-lg font-bold text-orange-800">{uniqueStocks}</div>
                </div>
              </div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-lg mr-3">
                  💰
                </div>
                <div>
                  <div className="text-sm text-green-600 font-medium">Общая выручка</div>
                  <div className="text-lg font-bold text-green-800">{formatCurrency(totalAmount)}</div>
                </div>
              </div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-lg mr-3">
                  📊
                </div>
                <div>
                  <div className="text-sm text-purple-600 font-medium">Средняя выручка</div>
                  <div className="text-lg font-bold text-purple-800">
                    {transactions.length > 0 ? formatCurrency(totalAmount / transactions.length) : formatCurrency(0)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">История продаж</h2>
          <p className="text-sm text-gray-500 mt-1">Детальная информация по каждой операции продажи</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">№</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Дата</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Компания</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Тикер</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Цена</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Кол-во</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Выручка</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Примечание</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {transactions.map((transaction, index) => (
                <tr key={transaction.id} className="hover:bg-gray-50 transition-colors duration-150">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {transactions.length - index}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(transaction.tradeDate).toLocaleDateString('ru-RU')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {transaction.company}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#9333ea] hover:text-[#7c3aed]">
                    <Link to={`/spot/ticker/${transaction.ticker}`} className="transition-colors duration-200">
                      {transaction.ticker}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {formatCurrency(transaction.price)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {transaction.quantity.toLocaleString('ru-RU')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium text-right">
                    {formatCurrency(transaction.amount)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                    {transaction.note}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {transactions.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500 text-lg">Нет операций продажи</div>
            <p className="text-gray-400 mt-2">
              <Link to="/spot" className="text-[#9333ea] hover:text-[#7c3aed] transition-colors duration-200">
                Добавьте операции продажи
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default SoldStocks; 