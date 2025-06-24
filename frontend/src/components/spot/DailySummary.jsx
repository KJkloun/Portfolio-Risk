import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { usePortfolio } from '../../contexts/PortfolioContext';
import { formatPortfolioCurrency } from '../../utils/currencyFormatter';

function DailySummary() {
  const { currentPortfolio, refreshTrigger } = usePortfolio();
  const [summary, setSummary] = useState({
    currentCash: 0,
    currentPositions: [],
    totalPositionValue: 0,
    totalPortfolioValue: 0,
    lastUpdated: new Date()
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSummaryData();
  }, [currentPortfolio, refreshTrigger]);

  const loadSummaryData = async () => {
    if (!currentPortfolio?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // Try to get data from localStorage first
      let currentCash = 0;
      let currentPositions = [];

      const cashData = JSON.parse(localStorage.getItem(`cashBalance_${currentPortfolio.id}`) || 'null');
      const positionsData = JSON.parse(localStorage.getItem(`currentPositions_${currentPortfolio.id}`) || 'null');

      if (cashData && positionsData) {
        // Use localStorage data
        currentCash = cashData.balance || 0;
        currentPositions = positionsData;
      } else {
        // Fallback: fetch and calculate from API
        const response = await axios.get('/api/spot-transactions', {
          headers: {
            'X-Portfolio-ID': currentPortfolio.id
          }
        });
        
        const transactions = response.data;
        
        // Calculate cash balance
        currentCash = calculateCashBalance(transactions);
        
        // Calculate current positions
        currentPositions = calculateCurrentPositions(transactions);
      }

      // Get stock prices from localStorage
      const stockPrices = JSON.parse(localStorage.getItem('stockPrices') || '{}');

      // Calculate position values with current prices
      const positionsWithPrices = currentPositions.map(pos => {
        const currentPrice = stockPrices[pos.ticker] || pos.averagePrice || 0;
        const currentValue = pos.quantity * currentPrice;
        const unrealizedPL = currentValue - (pos.quantity * pos.averagePrice);
        
        return {
          ...pos,
          currentPrice,
          currentValue,
          unrealizedPL
        };
      });

      const totalPositionValue = positionsWithPrices.reduce((sum, pos) => sum + pos.currentValue, 0);
      const totalPortfolioValue = currentCash + totalPositionValue;

      setSummary({
        currentCash,
        currentPositions: positionsWithPrices,
        totalPositionValue,
        totalPortfolioValue,
        lastUpdated: new Date()
      });

    } catch (error) {
      console.error('Error loading summary data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateCashBalance = (transactions) => {
    let balance = 0;
    
    transactions.forEach(tx => {
      // Use backend amount directly (already has correct sign)
      const amount = parseFloat(tx.amount) || parseFloat(tx.totalAmount) || 0;
      balance += amount;
    });
    
    return balance;
  };

  const calculateCurrentPositions = (transactions) => {
    const tickerData = {};

    // Process all transactions using FIFO method
    transactions.forEach(tx => {
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
        
        positions.push({
          ticker,
          company: data.company,
          quantity: data.remaining,
          averagePrice
        });
      }
    });

    return positions;
  };

  const formatCurrency = (amount) => {
    return formatPortfolioCurrency(amount, currentPortfolio, 2);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-300"></div>
      </div>
    );
  }

  if (!currentPortfolio) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-400 mb-4">📊</div>
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
          <h3 className="text-2xl font-light text-gray-800 mb-2">Итоги на день</h3>
          <p className="text-gray-500">Общий обзор портфеля ({currentPortfolio?.currency || 'USD'})</p>
        </div>

        {/* Current Balance - Featured Card */}
        <div className="mb-6">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border-0 overflow-hidden">
            <div className="px-8 py-6 text-center">
              <div className="text-sm font-medium text-gray-400 mb-2">Общая стоимость портфеля</div>
              <div className="text-4xl font-light text-gray-800">
                {formatCurrency(summary.totalPortfolioValue)}
              </div>
              <div className="text-xs text-gray-400 mt-2">{summary.currentPositions.length} активных позиций</div>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border-0 overflow-hidden">
            <div className="px-6 py-4 text-center">
              <div className="text-2xl font-light text-green-500">
                {formatCurrency(summary.currentCash)}
              </div>
              <div className="text-xs text-gray-400">свободные средства</div>
            </div>
          </div>
          
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border-0 overflow-hidden">
            <div className="px-6 py-4 text-center">
              <div className="text-2xl font-light text-blue-500">
                {formatCurrency(summary.totalPositionValue)}
              </div>
              <div className="text-xs text-gray-400">стоимость позиций</div>
            </div>
          </div>
          
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border-0 overflow-hidden">
            <div className="px-6 py-4 text-center">
              <div className={`text-2xl font-light ${
                summary.currentPositions.reduce((sum, pos) => sum + (pos.unrealizedPL || 0), 0) >= 0 ? 'text-green-500' : 'text-red-500'
              }`}>
                {formatCurrency(summary.currentPositions.reduce((sum, pos) => sum + (pos.unrealizedPL || 0), 0))}
              </div>
              <div className="text-xs text-gray-400">нереализованная П/У</div>
            </div>
          </div>

          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border-0 overflow-hidden">
            <div className="px-6 py-4 text-center">
              <div className={`text-2xl font-light ${
                summary.currentPositions.reduce((sum, pos) => sum + (pos.unrealizedPL || 0), 0) >= 0 ? 'text-green-500' : 'text-red-500'
              }`}>
                {summary.currentPositions.reduce((sum, pos) => sum + (pos.unrealizedPL || 0), 0) >= 0 ? '📈' : '📉'}
              </div>
              <div className="text-xs text-gray-400">
                {summary.currentPositions.reduce((sum, pos) => sum + (pos.unrealizedPL || 0), 0) >= 0 ? 'прибыль' : 'убыток'}
              </div>
            </div>
          </div>
        </div>

        {/* Positions Table */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border-0 overflow-hidden mb-6">
          <div className="px-6 py-4">
            <h6 className="text-lg font-medium text-gray-700 mb-1">Текущие позиции</h6>
            <p className="text-sm text-gray-400">Детальный обзор активных инвестиций ({summary.currentPositions.length} позиций)</p>
          </div>
          
          {summary.currentPositions.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Нет открытых позиций</h3>
              <p className="text-gray-500 mb-6 max-w-sm mx-auto">Начните инвестировать, добавив первую транзакцию в ваш портфель</p>
              <a 
                href="/spot" 
                className="bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Добавить транзакцию
              </a>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Компания</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Тикер</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Количество</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Средняя цена</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Текущая цена</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Стоимость</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">П/У</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.currentPositions.map((position, index) => (
                    <tr key={index} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-4 text-sm text-gray-800">{position.company}</td>
                      <td className="px-4 py-4 text-sm text-gray-800 font-mono">{position.ticker}</td>
                      <td className="px-4 py-4 text-sm text-gray-800 text-right">{position.quantity?.toLocaleString() || 0}</td>
                      <td className="px-4 py-4 text-sm text-gray-800 text-right">{formatCurrency(position.averagePrice || 0)}</td>
                      <td className="px-4 py-4 text-sm text-gray-800 text-right">{formatCurrency(position.currentPrice || 0)}</td>
                      <td className="px-4 py-4 text-sm text-gray-800 text-right font-medium">{formatCurrency(position.currentValue || 0)}</td>
                      <td className={`px-4 py-4 text-sm text-right font-medium ${
                        (position.unrealizedPL || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(position.unrealizedPL || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Navigation Layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Cash Accounting */}
          <a 
            href="/spot/cash-accounting"
            className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border-0 p-6 hover:bg-white/80 transition-all"
          >
            <div>
              <h3 className="text-lg font-medium text-gray-700 mb-1">Учёт наличных</h3>
              <p className="text-sm text-gray-400">Движение средств</p>
            </div>
          </a>

          {/* Stock Accounting */}
          <a 
            href="/spot/stock-accounting"
            className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border-0 p-6 hover:bg-white/80 transition-all"
          >
            <div>
              <h3 className="text-lg font-medium text-gray-700 mb-1">Учёт акций</h3>
              <p className="text-sm text-gray-400">Позиции и активы</p>
            </div>
          </a>

          {/* FIFO Analysis */}
          <a 
            href="/spot/fifo-analysis"
            className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border-0 p-6 hover:bg-white/80 transition-all"
          >
            <div>
              <h3 className="text-lg font-medium text-gray-700 mb-1">FIFO анализ</h3>
              <p className="text-sm text-gray-400">Налоговый учёт</p>
            </div>
          </a>

          {/* All Transactions */}
          <a 
            href="/spot"
            className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border-0 p-6 hover:bg-white/80 transition-all"
          >
            <div>
              <h3 className="text-lg font-medium text-gray-700 mb-1">Все транзакции</h3>
              <p className="text-sm text-gray-400">История операций</p>
            </div>
          </a>

        </div>

      </div>
    </div>
  );
}

export default DailySummary; 