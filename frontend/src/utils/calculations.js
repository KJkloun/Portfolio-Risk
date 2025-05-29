/**
 * Utility functions for trade calculations
 */

/**
 * Calculate total cost of the trade (price * quantity)
 * @param {number} price - Price per share
 * @param {number} quantity - Number of shares
 * @returns {number} Total cost with 2 decimal precision
 */
export const calculateTotalCost = (price, quantity) => {
  if (!price || !quantity) return 0;
  return Math.round(price * quantity * 100) / 100;
};

/**
 * Calculate yearly interest based on total cost and rate
 * @param {number} totalCost - Total cost of trade
 * @param {number} rate - Annual interest rate percentage
 * @returns {number} Yearly interest with 2 decimal precision
 */
export const calculateYearlyInterest = (totalCost, rate) => {
  if (!totalCost || !rate) return 0;
  return Math.round((totalCost * rate / 100) * 100) / 100;
};

/**
 * Calculate daily interest based on yearly interest
 * @param {number} yearlyInterest - Yearly interest amount
 * @returns {number} Daily interest with 2 decimal precision
 */
export const calculateDailyInterest = (yearlyInterest) => {
  if (!yearlyInterest) return 0;
  return Math.round((yearlyInterest / 365) * 100) / 100;
};

/**
 * Calculate daily interest directly from total cost and rate
 * @param {number} totalCost - Total cost of trade
 * @param {number} rate - Annual interest rate percentage
 * @returns {number} Daily interest with 2 decimal precision
 */
export const calculateDailyInterestDirect = (totalCost, rate) => {
  if (!totalCost || !rate) return 0;
  return Math.round((totalCost * rate / 100 / 365) * 100) / 100;
};

/**
 * Calculate profit for a trade
 * @param {number} exitPrice - Selling price per share
 * @param {number} entryPrice - Purchase price per share
 * @param {number} quantity - Number of shares
 * @returns {number} Total profit with 2 decimal precision
 */
export const calculateProfit = (exitPrice, entryPrice, quantity) => {
  if (exitPrice == null || entryPrice == null || !quantity) return 0;
  return Math.round((exitPrice - entryPrice) * quantity * 100) / 100;
};

/**
 * Calculate profit percentage
 * @param {number} exitPrice - Selling price per share
 * @param {number} entryPrice - Purchase price per share
 * @returns {number} Percentage profit with 2 decimal precision
 */
export const calculateProfitPercentage = (exitPrice, entryPrice) => {
  if (exitPrice == null || entryPrice == null) return 0;
  return Math.round(((exitPrice - entryPrice) / entryPrice) * 100 * 100) / 100;
}; 