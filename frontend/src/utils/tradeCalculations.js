// Constants for calculations
export const DEFAULT_INTEREST_RATE = 22.0;

/**
 * Utility functions for trade-related calculations
 * Following DRY principle to avoid duplication across components
 */

/**
 * Rounds a number to two decimal places
 * @param {number} value - The value to round
 * @returns {number} Rounded value
 */
export const roundToTwoDecimals = (value) => Math.round(value * 100) / 100;

/**
 * Formats a number as Russian currency (DEPRECATED - use formatPortfolioCurrency instead)
 * @param {number} amount - The amount to format
 * @returns {string} Formatted currency string
 * @deprecated Use formatPortfolioCurrency from currencyFormatter.js for portfolio-aware formatting
 */
export const formatCurrency = (amount) => {
  return amount.toLocaleString('ru-RU', { 
    style: 'currency', 
    currency: 'RUB',
    maximumFractionDigits: 0 
  });
};

/**
 * Gets current date as ISO string (YYYY-MM-DD format)
 * @returns {string} Current date string
 */
export const getCurrentDateString = () => new Date().toISOString().split('T')[0];

/**
 * Calculates the total investment amount for a trade
 * @param {Object} trade - Trade object with entryPrice and quantity
 * @returns {number} Total investment amount
 */
export const calculateTradeInvestment = (trade) => {
  return Number(trade.entryPrice || 0) * Number(trade.quantity || 0);
};

/**
 * Calculates daily interest payment for a trade
 * @param {number} investment - Total investment amount
 * @param {number} rate - Interest rate percentage
 * @returns {number} Daily interest payment
 */
export const calculateDailyInterest = (investment, rate) => {
  return investment * (rate / 100) / 365;
};

/**
 * Calculates overall statistics for a portfolio of trades
 * @param {Array} trades - Array of trade objects
 * @param {Object} allTradesDetails - Extended trade details
 * @returns {Object} Statistics object
 */
export const calculateOverallStatistics = (trades, allTradesDetails) => {
  const openTrades = trades.filter(trade => !trade.exitDate);
  
  if (openTrades.length === 0) {
    return createEmptyStatistics();
  }

  let totalDailyPayment = 0;
  let totalAccumulatedInterest = 0;
  let totalInvestments = 0;
  let weightedRateSum = 0;
  let profitToday = 0;
  let tradesWithDetails = 0;

  openTrades.forEach(trade => {
    const tradeDetails = allTradesDetails[trade.id];
    const investment = calculateTradeInvestment(trade);
    totalInvestments += investment;
    
    if (tradeDetails) {
      tradesWithDetails++;
      totalDailyPayment += tradeDetails.dailyInterestAmount || 0;
      totalAccumulatedInterest += tradeDetails.totalInterestWithVariableRate || 0;
      
      const currentRate = trade.marginAmount || DEFAULT_INTEREST_RATE;
      weightedRateSum += currentRate * investment;
      
      // Approximate profit calculation
      const currentPrice = trade.entryPrice * 1.02;
      profitToday += (currentPrice - trade.entryPrice) * trade.quantity;
    } else {
      // Basic calculations when details are not available
      const rate = trade.marginAmount || DEFAULT_INTEREST_RATE;
      const dailyPayment = calculateDailyInterest(investment, rate);
      
      weightedRateSum += rate * investment;
      totalDailyPayment += dailyPayment;
    }
  });

  const averageRate = totalInvestments > 0 ? (weightedRateSum / totalInvestments) : 0;
  const loadingProgress = openTrades.length > 0 ? (tradesWithDetails / openTrades.length * 100) : 100;

  return {
    totalDailyPayment: roundToTwoDecimals(totalDailyPayment),
    totalAccumulatedInterest: roundToTwoDecimals(totalAccumulatedInterest),
    averageRate: roundToTwoDecimals(averageRate),
    totalInvestments,
    positionCount: openTrades.length,
    profitToday: roundToTwoDecimals(profitToday),
    loadingProgress
  };
};

/**
 * Creates an empty statistics object
 * @returns {Object} Empty statistics with zero values
 */
const createEmptyStatistics = () => ({
  totalDailyPayment: 0,
  totalAccumulatedInterest: 0,
  averageRate: 0,
  totalInvestments: 0,
  positionCount: 0,
  profitToday: 0,
  loadingProgress: 100
});

/**
 * Validates trade input data
 * @param {Object} trade - Trade object to validate
 * @returns {Object} Validation result with isValid flag and errors array
 */
export const validateTradeData = (trade) => {
  const errors = [];
  
  if (!trade.symbol || trade.symbol.trim() === '') {
    errors.push('Символ акции обязателен');
  }
  
  if (!trade.quantity || Number(trade.quantity) <= 0) {
    errors.push('Количество должно быть больше нуля');
  }
  
  if (!trade.entryPrice || Number(trade.entryPrice) <= 0) {
    errors.push('Цена входа должна быть больше нуля');
  }
  
  if (!trade.entryDate) {
    errors.push('Дата входа обязательна');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Calculates profit for a closed trade
 * @param {Object} trade - Trade object with entry and exit data
 * @returns {number|null} Profit amount or null if trade is not closed
 */
export const calculateTradeProfit = (trade) => {
  if (!trade.exitPrice || !trade.entryPrice || !trade.quantity) {
    return null;
  }
  
  return (Number(trade.exitPrice) - Number(trade.entryPrice)) * Number(trade.quantity);
};

/**
 * Calculates potential profit for an open trade based on current price
 * @param {Object} trade - Trade object
 * @param {number} currentPrice - Current market price
 * @returns {number|null} Potential profit or null if data is incomplete
 */
export const calculatePotentialProfit = (trade, currentPrice) => {
  if (!currentPrice || !trade.entryPrice || !trade.quantity || trade.exitDate) {
    return null;
  }
  
  return (Number(currentPrice) - Number(trade.entryPrice)) * Number(trade.quantity);
}; 