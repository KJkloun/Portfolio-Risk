import { useState, useEffect } from 'react';

function CashMovements() {
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
      
      // Filter only cash movement transactions and sort by date (newest first)
      const cashMovements = data
        .filter(tx => ['DEPOSIT', 'WITHDRAW', 'DIVIDEND'].includes(tx.transactionType))
        .sort((a, b) => new Date(b.tradeDate) - new Date(a.tradeDate));
      
      setTransactions(cashMovements);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate cash flow statistics
  const totalDeposits = transactions
    .filter(tx => tx.transactionType === 'DEPOSIT')
    .reduce((sum, tx) => sum + (tx.price * tx.quantity), 0);

  const totalWithdrawals = transactions
    .filter(tx => tx.transactionType === 'WITHDRAW')
    .reduce((sum, tx) => sum + (tx.price * tx.quantity), 0);

  const totalDividends = transactions
    .filter(tx => tx.transactionType === 'DIVIDEND')
    .reduce((sum, tx) => sum + (tx.price * tx.quantity), 0);

  const netCashFlow = totalDeposits + totalDividends - totalWithdrawals;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const getMovementType = (transactionType) => {
    switch (transactionType) {
      case 'DEPOSIT':
        return {
          label: 'Пополнение',
          color: 'text-green-600',
          icon: '⬆️',
          description: 'Поступление средств на счет'
        };
      case 'WITHDRAW':
        return {
          label: 'Снятие',
          color: 'text-red-600',
          icon: '⬇️',
          description: 'Снятие средств со счета'
        };
      case 'DIVIDEND':
        return {
          label: 'Дивиденды',
          color: 'text-purple-600',
          icon: '💰',
          description: 'Дивидендные выплаты'
        };
      default:
        return {
          label: transactionType,
          color: 'text-gray-600',
          icon: '•',
          description: 'Прочие операции'
        };
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
        <h1 className="text-2xl font-semibold text-gray-900">Движение наличных</h1>
        <p className="text-gray-600 mt-1">Пополнения, снятия и дивидендные выплаты</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm font-medium text-gray-500">Всего пополнений</div>
          <div className="text-lg font-semibold text-green-600 mt-1">
            {formatCurrency(totalDeposits)}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm font-medium text-gray-500">Всего снятий</div>
          <div className="text-lg font-semibold text-red-600 mt-1">
            {formatCurrency(totalWithdrawals)}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm font-medium text-gray-500">Дивиденды</div>
          <div className="text-lg font-semibold text-purple-600 mt-1">
            {formatCurrency(totalDividends)}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm font-medium text-gray-500">Чистый поток</div>
          <div className={`text-lg font-semibold mt-1 ${
            netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {formatCurrency(netCashFlow)}
          </div>
        </div>
      </div>

      {/* Cash Movements Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">История движений</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Дата
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Тип операции
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Описание
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Сумма
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Примечание
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {transactions.map((transaction) => {
                const movementType = getMovementType(transaction.transactionType);
                const amount = transaction.price * transaction.quantity;
                const isPositive = transaction.transactionType === 'DEPOSIT' || transaction.transactionType === 'DIVIDEND';
                
                return (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(transaction.tradeDate).toLocaleDateString('ru-RU')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-medium ${movementType.color}`}>
                        {movementType.icon} {movementType.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {transaction.transactionType === 'DIVIDEND' 
                        ? `Дивиденды от ${transaction.company} (${transaction.ticker})`
                        : movementType.description
                      }
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${
                      isPositive ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {isPositive ? '+' : '-'}{formatCurrency(amount)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {transaction.note || '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {transactions.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">Нет движений денежных средств</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default CashMovements; 