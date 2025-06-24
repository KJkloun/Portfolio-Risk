import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { usePortfolio } from '../../contexts/PortfolioContext';
import { formatPortfolioCurrency } from '../../utils/currencyFormatter';

function CurrentProfit() {
  const { currentPortfolio, refreshTrigger } = usePortfolio();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPositions, setCurrentPositions] = useState([]);

  useEffect(() => {
    fetchTransactions();
  }, [currentPortfolio, refreshTrigger]);

  const fetchTransactions = async () => {
    if (!currentPortfolio?.id) {
      setLoading(false);
      return;
    }

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
      calculateCurrentPositions(transformedData);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setError('Ошибка загрузки данных: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateCurrentPositions = (transactionsData) => {
    if (!transactionsData || transactionsData.length === 0) {
      setCurrentPositions([]);
      return;
    }

    const tickerData = {};

    // Process all transactions using FIFO method
    transactionsData.forEach(tx => {
      const ticker = tx.ticker;
      const transactionType = tx.transactionType;
      const price = parseFloat(tx.price) || 0;
      const quantity = parseFloat(tx.quantity) || 0;

      if (ticker && ticker !== 'USD' && (transactionType === 'BUY' || transactionType === 'SELL')) {
        if (!tickerData[ticker]) {
          tickerData[ticker] = {
            company: tx.company || ticker,
            transactions: [],
            remaining: 0
          };
        }

        if (transactionType === 'BUY') {
          // Add purchase transaction for FIFO calculation
          tickerData[ticker].transactions.push({ price: price, quantity: quantity });
          tickerData[ticker].remaining += quantity;
        } else if (transactionType === 'SELL' && tickerData[ticker].remaining > 0) {
          // Process sales using FIFO method
          let remainingToSell = quantity;
          
          while (remainingToSell > 0 && tickerData[ticker].transactions.length > 0) {
            const firstTransaction = tickerData[ticker].transactions[0];
            
            if (firstTransaction.quantity > remainingToSell) {
              firstTransaction.quantity -= remainingToSell;
              tickerData[ticker].remaining -= remainingToSell;
              remainingToSell = 0;
            } else {
              tickerData[ticker].remaining -= firstTransaction.quantity;
              remainingToSell -= firstTransaction.quantity;
              tickerData[ticker].transactions.shift();
            }
          }
        }
      }
    });

    // Calculate current positions with average prices
    const positions = [];
    Object.keys(tickerData).forEach(ticker => {
      const data = tickerData[ticker];
      if (data.remaining > 0) {
        let totalCost = 0;
        let totalQuantity = 0;
        
        data.transactions.forEach(transaction => {
          totalCost += transaction.price * transaction.quantity;
          totalQuantity += transaction.quantity;
        });
        
        const averagePrice = totalQuantity > 0 ? totalCost / totalQuantity : 0;
        
        // Get current price from localStorage
        const currentPrices = JSON.parse(localStorage.getItem('stockPrices') || '{}');
        const currentPrice = currentPrices[ticker] || averagePrice;
        const currentValue = data.remaining * currentPrice;
        const unrealizedProfit = currentValue - (data.remaining * averagePrice);
        
        positions.push({
          ticker,
          company: data.company,
          quantity: data.remaining,
          averagePrice,
          currentPrice,
          currentValue,
          unrealizedProfit
        });
      }
    });

    setCurrentPositions(positions);
    
    // Save to localStorage for Daily Summary
    if (currentPortfolio?.id) {
      localStorage.setItem(`currentPositions_${currentPortfolio.id}`, JSON.stringify(positions));
    }
  };

  const formatCurrency = (amount) => {
    return formatPortfolioCurrency(amount, currentPortfolio, 2);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800 mx-auto mb-4"></div>
          <p className="text-gray-500">Загрузка данных...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">⚠️</div>
          <p className="text-gray-700 mb-4">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      <div className="container-fluid p-4 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h3 className="text-2xl font-light text-gray-800 mb-2">Текущие сделки</h3>
          <p className="text-gray-500">Открытые позиции по акциям ({currentPortfolio?.currency || 'USD'})</p>
        </div>

        {/* Current Positions */}
        {currentPositions.length > 0 ? (
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border-0 overflow-hidden">
            <div className="px-6 py-4">
              <h6 className="text-lg font-medium text-gray-700 mb-1">Открытые позиции</h6>
              <p className="text-sm text-gray-400">{currentPositions.length} активных позиций</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Компания</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Тикер</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Количество</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Средняя цена</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Текущая цена</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Стоимость</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">П/У</th>
                  </tr>
                </thead>
                <tbody>
                  {currentPositions.map((position, index) => (
                    <tr key={index} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 text-sm text-gray-800">
                        {position.company}
                      </td>
                      <td className="px-4 py-4 text-sm font-medium text-gray-800">
                        {position.ticker}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-800 text-right">
                        {position.quantity.toLocaleString()}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-800 text-right">
                        {formatCurrency(position.averagePrice)}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-800 text-right">
                        {formatCurrency(position.currentPrice)}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-800 text-right">
                        {formatCurrency(position.currentValue)}
                      </td>
                      <td className={`px-4 py-4 text-sm text-right font-medium ${position.unrealizedProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {position.unrealizedProfit >= 0 ? '+' : ''}{formatCurrency(position.unrealizedProfit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Summary */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Итого нереализованная П/У:</span>
                <span className={`text-lg font-semibold ${
                  currentPositions.reduce((sum, pos) => sum + pos.unrealizedProfit, 0) >= 0 
                    ? 'text-green-600' 
                    : 'text-red-600'
                }`}>
                  {currentPositions.reduce((sum, pos) => sum + pos.unrealizedProfit, 0) >= 0 ? '+' : ''}
                  {formatCurrency(currentPositions.reduce((sum, pos) => sum + pos.unrealizedProfit, 0))}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border-0 p-12 text-center">
            <div className="text-gray-400 mb-4">📊</div>
            <h3 className="text-lg font-medium text-gray-700 mb-2">Нет открытых позиций</h3>
            <p className="text-gray-500">Все позиции закрыты или отсутствуют транзакции</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default CurrentProfit;
