import { useState, useEffect } from 'react';
import axios from 'axios';
import { usePortfolio } from '../../contexts/PortfolioContext';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { formatPortfolioCurrency } from '../../utils/currencyFormatter';

function CashAccounting() {
  const { currentPortfolio, refreshTrigger } = usePortfolio();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
      
      // Sort by date, newest first
      const sortedData = transformedData.sort((a, b) => new Date(b.tradeDate) - new Date(a.tradeDate));
      setTransactions(sortedData);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setError('Ошибка загрузки данных: ' + error.message);
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
  
  // Save to localStorage for Daily Summary
  if (currentPortfolio?.id) {
    localStorage.setItem(`cashBalance_${currentPortfolio.id}`, JSON.stringify({ balance: currentBalance }));
  }
  
  const totalInflows = cashFlows
    .filter(cf => cf.type === 'inflow')
    .reduce((sum, cf) => sum + cf.amount, 0);
  
  const totalOutflows = cashFlows
    .filter(cf => cf.type === 'outflow')
    .reduce((sum, cf) => sum + Math.abs(cf.amount), 0);

  const netCashFlow = totalInflows - totalOutflows;

  const formatCurrency = (amount) => {
    return formatPortfolioCurrency(amount, currentPortfolio, 2);
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
          <div className="text-gray-400 mb-4">💰</div>
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
          <h3 className="text-2xl font-light text-gray-800 mb-2">Учёт наличных</h3>
          <p className="text-gray-500">Движение денежных средств в портфеле ({currentPortfolio?.currency || 'USD'})</p>
        </div>

        {/* Current Balance - Featured Card */}
        <div className="mb-6">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border-0 overflow-hidden">
            <div className="px-8 py-6 text-center">
              <div className="text-sm font-medium text-gray-400 mb-2">Текущий баланс наличных</div>
              <div className={`text-4xl font-light ${
                currentBalance >= 0 ? 'text-green-500' : 'text-red-500'
              }`}>
                {formatCurrency(currentBalance)}
              </div>
              <div className="text-xs text-gray-400 mt-2">доступно для инвестирования</div>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border-0 overflow-hidden">
            <div className="px-6 py-4 text-center">
              <div className="text-2xl font-light text-green-500">
                {formatCurrency(totalInflows)}
              </div>
              <div className="text-xs text-gray-400">всего поступлений</div>
            </div>
          </div>
          
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border-0 overflow-hidden">
            <div className="px-6 py-4 text-center">
              <div className="text-2xl font-light text-red-500">
                {formatCurrency(totalOutflows)}
              </div>
              <div className="text-xs text-gray-400">всего списаний</div>
            </div>
          </div>
          
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border-0 overflow-hidden">
            <div className="px-6 py-4 text-center">
              <div className={`text-2xl font-light ${netCashFlow >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {formatCurrency(netCashFlow)}
              </div>
              <div className="text-xs text-gray-400">чистый денежный поток</div>
            </div>
          </div>
        </div>

        {/* Cash Flow Table */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border-0 overflow-hidden">
          <div className="px-6 py-4">
            <h6 className="text-lg font-medium text-gray-700 mb-1">История движения средств</h6>
            <p className="text-sm text-gray-400">Детальный анализ всех денежных операций</p>
          </div>
          
          {cashFlows.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Дата</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Тип</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Описание</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Сумма</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Баланс</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Примечание</th>
                  </tr>
                </thead>
                <tbody>
                  {cashFlows.map((flow, index) => {
                    const typeConfig = getTypeConfig(flow.type);
                    return (
                      <tr key={index} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-4 text-sm text-gray-800">
                          {flow.tradeDate ? format(new Date(flow.tradeDate), 'dd.MM.yyyy', { locale: ru }) : '-'}
                        </td>
                        <td className="px-4 py-4 text-sm">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm">{typeConfig.icon}</span>
                            <span className={`text-sm font-medium ${typeConfig.color}`}>
                              {typeConfig.label}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-800">
                          {flow.description}
                        </td>
                        <td className={`px-4 py-4 text-sm text-right font-medium ${typeConfig.color}`}>
                          {flow.amount >= 0 ? '+' : ''}{formatCurrency(flow.amount)}
                        </td>
                        <td className={`px-4 py-4 text-sm text-right font-medium ${
                          flow.runningBalance >= 0 ? 'text-gray-800' : 'text-red-600'
                        }`}>
                          {formatCurrency(flow.runningBalance)}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-500">
                          {flow.note || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100/80 rounded-full mb-3">
                <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">Нет движения средств</h3>
              <p className="text-xs text-gray-400 max-w-md mx-auto">История операций с наличными средствами пока пуста</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CashAccounting;
