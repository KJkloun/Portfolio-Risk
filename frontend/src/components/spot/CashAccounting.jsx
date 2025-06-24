import { useState, useEffect } from 'react';
import axios from 'axios';

function CashAccounting() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/spot-transactions');
      const data = response.data;
      
      // Sort by date, newest first
      const sortedData = data.sort((a, b) => new Date(b.tradeDate) - new Date(a.tradeDate));
      setTransactions(sortedData);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate cash flows
  const calculateCashFlows = () => {
    const cashFlows = [];
    let runningBalance = 0;

    // Process transactions chronologically for running balance
    const chronologicalTxs = [...transactions].sort((a, b) => new Date(a.tradeDate) - new Date(b.tradeDate));
    
    chronologicalTxs.forEach(tx => {
      let amount = 0;
      let type = '';
      let description = '';

      switch (tx.transactionType) {
        case 'DEPOSIT':
          amount = tx.price * tx.quantity;
          type = 'inflow';
          description = `Пополнение счета`;
          break;
        case 'WITHDRAW':
          amount = -(tx.price * tx.quantity);
          type = 'outflow';
          description = `Снятие средств`;
          break;
        case 'BUY':
          amount = -(tx.price * tx.quantity);
          type = 'outflow';
          description = `Покупка ${tx.ticker} (${tx.quantity} шт.)`;
          break;
        case 'SELL':
          amount = tx.price * tx.quantity;
          type = 'inflow';
          description = `Продажа ${tx.ticker} (${tx.quantity} шт.)`;
          break;
        case 'DIVIDEND':
          amount = tx.price * tx.quantity;
          type = 'inflow';
          description = `Дивиденды ${tx.company}`;
          break;
        default:
          amount = 0;
          type = 'neutral';
          description = tx.note || 'Прочая операция';
      }

      runningBalance += amount;

      cashFlows.push({
        ...tx,
        amount,
        type,
        description,
        runningBalance
      });
    });

    return cashFlows.reverse(); // Show newest first
  };

  const cashFlows = calculateCashFlows();
  const currentBalance = cashFlows.length > 0 ? cashFlows[0].runningBalance : 0;
  
  const totalInflows = cashFlows
    .filter(cf => cf.type === 'inflow')
    .reduce((sum, cf) => sum + cf.amount, 0);
  
  const totalOutflows = cashFlows
    .filter(cf => cf.type === 'outflow')
    .reduce((sum, cf) => sum + Math.abs(cf.amount), 0);

  const netCashFlow = totalInflows - totalOutflows;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const getTypeConfig = (type) => {
    switch (type) {
      case 'inflow':
        return { color: 'text-green-600', icon: '⬆️', label: 'Поступление' };
      case 'outflow':
        return { color: 'text-red-600', icon: '⬇️', label: 'Списание' };
      default:
        return { color: 'text-gray-600', icon: '➡️', label: 'Операция' };
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
        <h1 className="text-2xl font-semibold text-gray-900">Учёт наличных</h1>
        <p className="text-gray-600 mt-1">Движение денежных средств</p>
      </div>

      {/* Current Balance */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 mb-6">
        <div className="text-center">
          <div className="text-sm font-medium text-gray-500 mb-2">Текущий баланс</div>
          <div className={`text-3xl font-bold ${
            currentBalance >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {formatCurrency(currentBalance)}
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm font-medium text-gray-500">Всего поступлений</div>
          <div className="text-lg font-semibold text-green-600 mt-1">
            {formatCurrency(totalInflows)}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm font-medium text-gray-500">Всего списаний</div>
          <div className="text-lg font-semibold text-red-600 mt-1">
            {formatCurrency(totalOutflows)}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm font-medium text-gray-500">Чистый денежный поток</div>
          <div className={`text-lg font-semibold mt-1 ${
            netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {formatCurrency(netCashFlow)}
          </div>
        </div>
      </div>

      {/* Cash Flow Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">История движения средств</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Дата
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Тип
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Описание
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Сумма
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Баланс
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Примечание
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {cashFlows.map((flow) => {
                const typeConfig = getTypeConfig(flow.type);
                
                return (
                  <tr key={flow.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(flow.tradeDate).toLocaleDateString('ru-RU')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-medium ${typeConfig.color}`}>
                        {typeConfig.icon} {typeConfig.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {flow.description}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${
                      flow.amount >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {flow.amount >= 0 ? '+' : ''}{formatCurrency(flow.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                      {formatCurrency(flow.runningBalance)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {flow.note}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {cashFlows.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">Нет движений по счету</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default CashAccounting; 