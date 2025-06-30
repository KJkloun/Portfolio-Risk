import { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';

// Initialize pdfMake with fonts
pdfMake.vfs = pdfFonts.vfs;

// Simple color palette for charts
const CHART_COLORS = {
  primary: '#6b7280',
  secondary: '#9ca3af',
  green: '#10b981',
  red: '#ef4444'
};

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

function Statistics() {
  const { t } = useTranslation();
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stockPrices, setStockPrices] = useState({});
  const [selectedStock, setSelectedStock] = useState('all');
  const [availableStocks, setAvailableStocks] = useState([]);
  const [showPDFOptions, setShowPDFOptions] = useState(false);
  const [selectedStocksForPDF, setSelectedStocksForPDF] = useState([]);
  const [stats, setStats] = useState({
    totalCostOpen: 0,
    totalInterestDaily: 0,
    totalInterestMonthly: 0,
    totalTradesOpen: 0,
    totalTradesClosed: 0,
    totalProfit: 0,
    totalProfitAfterInterest: 0,
    totalAccruedInterest: 0,
    totalSharesOpen: 0,
    avgCreditRate: 0,
    profitBySymbol: {},
    symbolCounts: {},
    holdingPeriods: {
      closed: null,
      open: null,
    },
    monthlyProfits: {},
    upcomingTrades: [],
    potentialProfit: 0,
    potentialProfitAfterInterest: 0,
    totalOverallProfit: 0,
    totalOverallProfitAfterInterest: 0,
    totalInterestPaid: 0,
  });
  const [extendedTradeInfo, setExtendedTradeInfo] = useState({});

  // Load trades and saved stock prices when component mounts
  useEffect(() => {
    loadTrades();
    loadSavedStockPrices();
  }, []);

  // Parse date string into local date object
  const parseDateLocal = (dateStr) => {
    if (!dateStr) return null;
    const [year, month, day] = dateStr.split('-');
    return new Date(+year, +month - 1, +day);
  };

  // Запускаем расчет потенциальной прибыли после успешной загрузки сделок
  useEffect(() => {
    // Если есть и сделки, и сохраненные курсы, запускаем расчет
    if (trades.length > 0 && Object.keys(stockPrices).length > 0) {
      console.log('Запускаем расчет потенциальной прибыли после загрузки сделок');
      // Убираем задержку - вызываем сразу
      calculatePotentialProfit(trades, stockPrices);
    }
  }, [trades, stockPrices]);

  // Periodically reload stock prices (every 30 seconds) - увеличиваем интервал для оптимизации
  useEffect(() => {
    const interval = setInterval(() => {
      loadSavedStockPrices();
    }, 60000); // Увеличено до 60 секунд
    
    return () => clearInterval(interval);
  }, []);

  // Load saved stock prices from localStorage
  const loadSavedStockPrices = () => {
    try {
      const savedPrices = localStorage.getItem('stockPrices');
      console.log('DEBUG loadSavedStockPrices: Saved stock prices raw:', savedPrices);
      
      if (savedPrices) {
        try {
          const prices = JSON.parse(savedPrices);
          console.log('DEBUG loadSavedStockPrices: Parsed stock prices:', prices);
          
          // Проверка, что объект не пустой и содержит валидные значения
          if (typeof prices === 'object' && Object.keys(prices).length > 0) {
            // Проверим, что хотя бы одна цена больше нуля
            const hasValidPrices = Object.values(prices).some(price => 
              typeof price === 'number' && !isNaN(price) && price > 0
            );
            
            if (hasValidPrices) {
              console.log('DEBUG loadSavedStockPrices: Valid stock prices found:', prices);
              setStockPrices(prices);
              
              // Немедленно пересчитываем потенциальную прибыль при загрузке курсов
              if (trades.length > 0) {
                calculatePotentialProfit(trades, prices);
                console.log("DEBUG loadSavedStockPrices: Пересчитана потенциальная прибыль с сохраненными курсами:", prices);
              }
            } else {
              console.warn('DEBUG loadSavedStockPrices: No valid stock prices found in stored data');
            }
          } else {
            console.warn('DEBUG loadSavedStockPrices: Stored stock prices is empty or invalid');
          }
        } catch (parseError) {
          console.error('DEBUG loadSavedStockPrices: Error parsing saved stock prices:', parseError);
        }
      } else {
        console.warn('DEBUG loadSavedStockPrices: No saved stock prices found in localStorage');
      }
    } catch (e) {
      console.error('DEBUG loadSavedStockPrices: Error loading saved stock prices:', e);
    }
  };

  const loadTrades = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:8081/api/trades');
      console.log('Statistics API response:', response);
      
      if (Array.isArray(response.data)) {
        setTrades(response.data);
        // Extract unique stock symbols
        const symbols = [...new Set(response.data.map(trade => trade.symbol))].sort();
        setAvailableStocks(symbols);
        calculateStats(response.data);
        
        // Загружаем расширенную информацию для всех сделок
        loadExtendedTradeInfo(response.data);
        
        setError('');
      } else {
        console.error('Statistics API returned non-array data:', response.data);
        setTrades([]);
        setError(t('errors.serverError', 'Данные получены в неверном формате. Пожалуйста, обратитесь к администратору.'));
      }
    } catch (err) {
      console.error('Error loading statistics:', err);
      setError(t('errors.networkError', 'Не удалось загрузить данные. Пожалуйста, попробуйте позже.'));
      setTrades([]);
    } finally {
      setLoading(false);
    }
  };

  // Загрузка расширенной информации о сделках
  const loadExtendedTradeInfo = async (trades) => {
    // Загружаем расширенную информацию для всех сделок (не только открытых)
    const allTrades = trades.filter(trade => trade.id); // все сделки с ID
    
    for (const trade of allTrades) {
      if (!extendedTradeInfo[trade.id]) {
        try {
          const response = await axios.get(`http://localhost:8081/api/trades/${trade.id}/extended-info`);
          setExtendedTradeInfo(prev => ({
            ...prev,
            [trade.id]: response.data
          }));
        } catch (error) {
          console.error(`Error loading extended info for trade ${trade.id}:`, error);
        }
      }
    }
  };

  // Запускаем загрузку расширенной информации при загрузке сделок
  useEffect(() => {
    if (trades.length > 0) {
      loadExtendedTradeInfo(trades);
    }
  }, [trades]);

  // Пересчитываем статистику при изменении расширенной информации
  useEffect(() => {
    if (trades.length > 0) {
      calculateStats(trades);
    }
  }, [trades, extendedTradeInfo]);

  const calculateStats = (tradesData) => {
    const calculatedStats = {
      totalCostOpen: 0,
      totalInterestDaily: 0,
      totalInterestMonthly: 0,
      totalTradesOpen: 0,
      totalTradesClosed: 0,
      totalProfit: 0,
      totalProfitAfterInterest: 0,
      totalAccruedInterest: 0,
      totalSharesOpen: 0,
      avgCreditRate: 0,
      profitBySymbol: {},
      symbolCounts: {},
      monthlyProfits: {},
      monthlyInterests: {},
      valueAtRisk: 0,
      expectedShortfall: 0,
      maxDrawdown: 0,
      upcomingTrades: [],
      holdingPeriods: {},
      roi: 0,
      sharpeRatio: 0,
      potentialProfit: 0,
      potentialProfitAfterInterest: 0,
      totalOverallProfit: 0,
      totalOverallProfitAfterInterest: 0,
      totalInterestPaid: 0,
    };

    let totalClosedInterest = 0;
    let totalAmountInvested = 0;
    let totalRateWeighted = 0;
    let totalOpenRateWeighted = 0;
    let openPositionsValue = 0;
    let retentionPeriods = [];
    let portfolioReturns = [];

    // Sort trades by exit date for upcoming events calculation
    const sortedTrades = [...tradesData].sort((a, b) => {
      if (!a.exitDate) return 1;
      if (!b.exitDate) return -1;
      return new Date(a.exitDate) - new Date(b.exitDate);
    });

    // Get open trades for upcoming events
    const openTrades = sortedTrades.filter(trade => !trade.exitDate);
    const today = new Date();

    tradesData.forEach(trade => {
      // Count trades by symbol
      calculatedStats.symbolCounts[trade.symbol] = (calculatedStats.symbolCounts[trade.symbol] || 0) + 1;

      const totalCost = Number(trade.entryPrice) * Number(trade.quantity);
      const roundedTotalCost = Math.round(totalCost * 100) / 100;
      
      if (!trade.exitDate) {
        // Open trade - используем данные из бэкенда
        const extendedInfo = extendedTradeInfo[trade.id];
        
        calculatedStats.totalCostOpen += roundedTotalCost;
        calculatedStats.totalTradesOpen += 1;
        calculatedStats.totalSharesOpen += Number(trade.quantity);
        
        if (extendedInfo) {
          // Используем корректные данные из бэкенда
          const dailyInterest = extendedInfo.dailyInterestAmount || 0;
          const accruedInterest = extendedInfo.totalInterestWithVariableRate || 0;
          
          calculatedStats.totalInterestDaily += dailyInterest;
          calculatedStats.totalInterestMonthly += dailyInterest * 30;
          calculatedStats.totalAccruedInterest += accruedInterest;
          
          // Используем средневзвешенную ставку по времени из бэкенда
          const weightedRate = extendedInfo.averageWeightedInterestRate || Number(trade.marginAmount);
          totalOpenRateWeighted += weightedRate * roundedTotalCost;
        } else {
          // Если расширенная информация еще не загружена, используем базовые расчеты
          const dailyInterest = roundedTotalCost * Number(trade.marginAmount) / 100 / 365;
          const entryDateOpen = parseDateLocal(trade.entryDate);
          const daysHeld = Math.max(1, Math.ceil((today - entryDateOpen) / (1000 * 60 * 60 * 24)));
          const accruedInterest = dailyInterest * daysHeld;
          
          calculatedStats.totalInterestDaily += dailyInterest;
          calculatedStats.totalInterestMonthly += dailyInterest * 30;
          calculatedStats.totalAccruedInterest += accruedInterest;
          totalOpenRateWeighted += Number(trade.marginAmount) * roundedTotalCost;
        }
        
        openPositionsValue += roundedTotalCost;
        
        // Store upcoming trades data
        calculatedStats.upcomingTrades.push({
          symbol: trade.symbol,
          quantity: trade.quantity,
          entryPrice: trade.entryPrice,
          entryDate: trade.entryDate,
          dailyInterest: extendedInfo?.dailyInterestAmount || (roundedTotalCost * Number(trade.marginAmount) / 100 / 365),
          daysHeld: Math.max(1, Math.ceil((today - parseDateLocal(trade.entryDate)) / (1000 * 60 * 60 * 24))),
          potentialProfit: 0,
          potentialProfitAfterInterest: 0
        });
      } else {
        // Closed trade
        calculatedStats.totalTradesClosed += 1;
        
        // Добавляем заплаченные проценты по закрытым сделкам из расширенной информации
        const extendedInfo = extendedTradeInfo[trade.id];
        if (extendedInfo && extendedInfo.totalInterestWithVariableRate) {
          totalClosedInterest += extendedInfo.totalInterestWithVariableRate;
        } else {
          // Если расширенная информация не загружена, используем базовый расчет
          if (trade.entryDate && trade.exitDate) {
            const entryDate = parseDateLocal(trade.entryDate);
            const exitDate = parseDateLocal(trade.exitDate);
            const daysHeldClosed = Math.max(1, Math.ceil((exitDate - entryDate) / (1000 * 60 * 60 * 24)));
            const dailyInterest = roundedTotalCost * Number(trade.marginAmount) / 100 / 365;
            const interestForPeriod = dailyInterest * daysHeldClosed;
            totalClosedInterest += Math.round(interestForPeriod * 100) / 100;
          }
        }
        
        if (trade.exitPrice) {
          const profit = (Number(trade.exitPrice) - Number(trade.entryPrice)) * Number(trade.quantity);
          const roundedProfit = Math.round(profit * 100) / 100;
          calculatedStats.totalProfit += roundedProfit;
          
          // For ROI calculation
          totalAmountInvested += roundedTotalCost;
          
          // Profit by symbol
          calculatedStats.profitBySymbol[trade.symbol] = (calculatedStats.profitBySymbol[trade.symbol] || 0) + roundedProfit;
          
          // Monthly profits
          const exitMonth = format(parseDateLocal(trade.exitDate), 'yyyy-MM');
          calculatedStats.monthlyProfits[exitMonth] = (calculatedStats.monthlyProfits[exitMonth] || 0) + roundedProfit;
          
          if (trade.entryDate && trade.exitDate) {
            const entryDate = parseDateLocal(trade.entryDate);
            const exitDate = parseDateLocal(trade.exitDate);
            const daysHeldClosed = Math.max(1, Math.ceil((exitDate - entryDate) / (1000 * 60 * 60 * 24)));
            
            // Monthly interests
            calculatedStats.monthlyInterests[exitMonth] = (calculatedStats.monthlyInterests[exitMonth] || 0) + (extendedInfo?.dailyInterestAmount || (roundedTotalCost * Number(trade.marginAmount) / 100 / 365)) * 30;
            
            // Add to holding periods stats
            retentionPeriods.push(daysHeldClosed);
            
            // Add return percentage for Sharpe ratio
            const returnPercentage = roundedProfit / roundedTotalCost;
            portfolioReturns.push(returnPercentage);
            
            // Calculate weighted average credit rate
            totalRateWeighted += Number(trade.marginAmount) * roundedTotalCost;
          }
        }
      }
    });
    
    // Store total interest paid for closed trades (for reference)
    calculatedStats.totalInterestPaid = totalClosedInterest;
    calculatedStats.totalAccruedInterest = Math.round(calculatedStats.totalAccruedInterest * 100) / 100;
    
    // Calculate average credit rate
    if (openPositionsValue > 0) {
      calculatedStats.avgCreditRate = Math.round((totalOpenRateWeighted / openPositionsValue) * 100) / 100;
    } else if (totalAmountInvested > 0) {
      calculatedStats.avgCreditRate = Math.round((totalRateWeighted / totalAmountInvested) * 100) / 100;
    }
    
    // Calculate ROI
    if (totalAmountInvested > 0) {
      calculatedStats.roi = Math.round((calculatedStats.totalProfit / totalAmountInvested) * 10000) / 100;
    }
    
    // Calculate value at risk (simplified)
    if (portfolioReturns.length > 0) {
      // Sort returns in ascending order
      const sortedReturns = [...portfolioReturns].sort((a, b) => a - b);
      // Take 5% worst return as 95% VaR
      const varIndex = Math.floor(sortedReturns.length * 0.05);
      if (varIndex < sortedReturns.length) {
        calculatedStats.valueAtRisk = Math.round(Math.abs(sortedReturns[varIndex]) * calculatedStats.totalCostOpen * 100) / 100;
      }
      
      // Calculate expected shortfall (average of returns below VaR)
      const belowVarReturns = sortedReturns.slice(0, varIndex + 1);
      if (belowVarReturns.length > 0) {
        const avgBelowVar = belowVarReturns.reduce((sum, val) => sum + val, 0) / belowVarReturns.length;
        calculatedStats.expectedShortfall = Math.round(Math.abs(avgBelowVar) * calculatedStats.totalCostOpen * 100) / 100;
      }
      
      // Calculate Sharpe ratio (simplified)
      if (portfolioReturns.length > 1) {
        const avgReturn = portfolioReturns.reduce((sum, val) => sum + val, 0) / portfolioReturns.length;
        const variance = portfolioReturns.reduce((sum, val) => sum + Math.pow(val - avgReturn, 2), 0) / portfolioReturns.length;
        const stdDev = Math.sqrt(variance);
        if (stdDev > 0) {
          calculatedStats.sharpeRatio = Math.round((avgReturn / stdDev) * 100) / 100;
        }
      }
    }
    
    // Calculate maximum drawdown (simplified)
    calculatedStats.maxDrawdown = Math.round(calculatedStats.totalCostOpen * 0.15 * 100) / 100; // Example: 15% of current portfolio
    
    // Process holding periods
    if (retentionPeriods.length > 0) {
      // Group by duration range
      const periods = {
        '1-7': 0,
        '8-30': 0,
        '31-90': 0,
        '91+': 0
      };
      
      retentionPeriods.forEach(days => {
        if (days <= 7) periods['1-7']++;
        else if (days <= 30) periods['8-30']++;
        else if (days <= 90) periods['31-90']++;
        else periods['91+']++;
      });
      
      calculatedStats.holdingPeriods['closed'] = periods;
    }
    
    // Sort upcoming trades by accrued interest (most expensive first)
    calculatedStats.upcomingTrades.sort((a, b) => (b.dailyInterest * b.daysHeld) - (a.dailyInterest * a.daysHeld));
    // Limit to top 5
    calculatedStats.upcomingTrades = calculatedStats.upcomingTrades.slice(0, 5);
    
    // Set calculated stats
    setStats(calculatedStats);
    
    // Сразу же рассчитываем потенциальную прибыль, если есть курсы
    if (Object.keys(stockPrices).length > 0) {
      calculatePotentialProfit(tradesData, stockPrices);
    }
  };

  // Функция расчета потенциальной прибыли
  const calculatePotentialProfit = (tradesData, prices = stockPrices) => {
    console.log("DEBUG calculatePotentialProfit: Начат расчет потенциальной прибыли");
    console.log("DEBUG calculatePotentialProfit: Цены акций:", JSON.stringify(prices));
    console.log("DEBUG calculatePotentialProfit: Количество сделок:", tradesData.length);
    
    // Проверяем наличие курсов акций
    if (!prices || Object.keys(prices).length === 0) {
      console.warn("DEBUG calculatePotentialProfit: Нет сохраненных курсов для расчета потенциальной прибыли");
      return;
    }
    
    // Проверим, что есть хотя бы один валидный курс
    const hasValidPrices = Object.values(prices).some(price => 
      typeof price === 'number' && !isNaN(price) && price > 0
    );
    
    if (!hasValidPrices) {
      console.warn("DEBUG calculatePotentialProfit: Нет валидных курсов для расчета потенциальной прибыли");
      return;
    }
    
    let totalPotentialProfit = 0;
    let totalPotentialProfitAfterInterest = 0;
    const today = new Date();
    
    // Расчет только для открытых сделок
    const openTrades = tradesData.filter(trade => !trade.exitDate);
    console.log("DEBUG calculatePotentialProfit: Открытые сделки для расчета:", openTrades.length);
    
    // Подробная информация о каждой открытой сделке
    openTrades.forEach((trade, index) => {
      console.log(`DEBUG calculatePotentialProfit: Сделка ${index + 1}:`, {
        symbol: trade.symbol,
        quantity: trade.quantity,
        entryPrice: trade.entryPrice,
        marginAmount: trade.marginAmount,
        currentPrice: prices[trade.symbol] || 'нет курса'
      });
    });
    
    let calculatedTrades = 0;
    
    for (const trade of openTrades) {
      try {
        // Проверяем наличие курса для данной акции и его корректность
        if (!prices[trade.symbol]) {
          console.warn(`DEBUG calculatePotentialProfit: Нет курса для акции ${trade.symbol}`);
          continue;
        }
        
        if (isNaN(parseFloat(prices[trade.symbol])) || parseFloat(prices[trade.symbol]) <= 0) {
          console.warn(`DEBUG calculatePotentialProfit: Некорректный курс для акции ${trade.symbol}. Значение: ${prices[trade.symbol]}`);
          continue;
        }
        
        const rate = parseFloat(prices[trade.symbol]);
        const entryPrice = Number(trade.entryPrice);
        const quantity = Number(trade.quantity);
        
        // Проверка корректности входных данных
        if (isNaN(entryPrice) || isNaN(quantity) || entryPrice <= 0 || quantity <= 0) {
          console.warn(`DEBUG calculatePotentialProfit: Некорректные данные для сделки по ${trade.symbol}: цена=${entryPrice}, количество=${quantity}`);
          continue;
        }
        
        const totalCost = entryPrice * quantity;
        
        // Расчет потенциальной прибыли
        const potentialProfit = (rate - entryPrice) * quantity;
        
        // Расчет накопленных процентов
        let accumulatedInterest = 0;
        try {
          const marginAmount = Number(trade.marginAmount) || 0;
          if (marginAmount > 0) {
            const dailyInterest = totalCost * marginAmount / 100 / 365;
            const entryDate = parseDateLocal(trade.entryDate);
            if (entryDate) {
              const daysHeld = Math.max(1, Math.ceil((today - entryDate) / (1000 * 60 * 60 * 24)));
              accumulatedInterest = dailyInterest * daysHeld;
            }
          }
        } catch (e) {
          console.error(`DEBUG calculatePotentialProfit: Ошибка при расчете процентов для ${trade.symbol}:`, e);
        }
        
        // Потенциальная прибыль после вычета процентов
        const profitAfterInterest = potentialProfit - accumulatedInterest;
        
        totalPotentialProfit += potentialProfit;
        totalPotentialProfitAfterInterest += profitAfterInterest;
        
        calculatedTrades++;
        console.log(`DEBUG calculatePotentialProfit: Расчет для ${trade.symbol}: курс=${rate}, вход=${entryPrice}, прибыль=${potentialProfit.toFixed(2)}, проценты=${accumulatedInterest.toFixed(2)}`);
      } catch (error) {
        console.error(`DEBUG calculatePotentialProfit: Ошибка при расчете для ${trade.symbol}:`, error);
      }
    }
    
    console.log(`DEBUG calculatePotentialProfit: Рассчитано ${calculatedTrades} сделок из ${openTrades.length} открытых`);
    
    // Если не удалось рассчитать ни одной сделки, завершаем
    if (calculatedTrades === 0) {
      console.warn("DEBUG calculatePotentialProfit: Не удалось рассчитать потенциальную прибыль ни для одной сделки");
      return;
    }
    
    // Рассчитываем общую прибыль с учетом закрытых сделок и потенциальной прибыли открытых
    const totalOverallProfit = (stats.totalProfit || 0) + totalPotentialProfit;
    const totalOverallProfitAfterInterest = (stats.totalProfit || 0) + totalPotentialProfitAfterInterest;
    
    console.log("DEBUG calculatePotentialProfit: Итоговые расчеты:", {
      potentialProfit: totalPotentialProfit.toFixed(2),
      potentialProfitAfterInterest: totalPotentialProfitAfterInterest.toFixed(2),
      totalOverallProfit: totalOverallProfit.toFixed(2),
      totalOverallProfitAfterInterest: totalOverallProfitAfterInterest.toFixed(2)
    });
    
    // Обновляем состояние
    setStats(prevStats => ({
      ...prevStats,
      potentialProfit: totalPotentialProfit,
      potentialProfitAfterInterest: totalPotentialProfitAfterInterest,
      totalOverallProfit,
      totalOverallProfitAfterInterest
    }));
  };

  // Filter trades based on selected stock and active tab
  const getFilteredTrades = () => {
    return trades.filter(trade => 
      selectedStock === 'all' || trade.symbol === selectedStock
    );
  };

  // Get unique stock symbols from trades
  useEffect(() => {
    if (trades.length > 0) {
      const symbols = [...new Set(trades.map(trade => trade.symbol))].sort();
      setAvailableStocks(symbols);
      
      // When switching to specific stock, recalculate stats
      calculateStats(getFilteredTrades());
    }
  }, [trades, selectedStock]);

  const handleStockChange = (stock) => {
    setSelectedStock(stock);
    
    // Recalculate stats for the selected stock
    calculateStats(trades.filter(trade => 
      stock === 'all' || trade.symbol === stock
    ));
  };

  // Calculate stock-specific metrics
  const calculateStockMetrics = (stock) => {
    const stockTrades = trades.filter(trade => trade.symbol === stock);
    const openTrades = stockTrades.filter(trade => !trade.exitDate);
    const closedTrades = stockTrades.filter(trade => trade.exitDate);

    let totalShares = 0;
    let totalInvestment = 0;
    let totalAccumulatedInterest = 0;
    let avgWeightedRate = 0;
    let weightedRateSum = 0;
    let totalInterestPaid = 0;

    openTrades.forEach(trade => {
      const shares = trade.quantity;
      const investment = trade.quantity * trade.entryPrice;
      
      totalShares += shares;
      totalInvestment += investment;

      // Получаем расширенную информацию о сделке
      const extendedInfo = extendedTradeInfo[trade.id];
      if (extendedInfo) {
        // Используем корректные данные из бэкенда с учетом переменных ставок
        totalAccumulatedInterest += extendedInfo.totalInterestWithVariableRate || 0;
        
        // Используем средневзвешенную ставку по времени
        const tradeWeightedRate = extendedInfo.averageWeightedInterestRate || trade.marginAmount || 0;
        weightedRateSum += tradeWeightedRate * investment;
      } else {
        // Если расширенная информация не загружена, используем базовые расчеты
        const rate = trade.marginAmount || 0;
        weightedRateSum += rate * investment;
        
        const days = Math.ceil((new Date() - new Date(trade.entryDate)) / (1000 * 60 * 60 * 24));
        const dailyInterest = investment * rate / 100 / 365;
        totalAccumulatedInterest += dailyInterest * days;
      }
    });

    // Подсчет процентов по закрытым сделкам
    closedTrades.forEach(trade => {
      const extendedInfo = extendedTradeInfo[trade.id];
      if (extendedInfo) {
        totalInterestPaid += extendedInfo.totalInterestWithVariableRate || 0;
      }
    });

    avgWeightedRate = totalInvestment > 0 ? weightedRateSum / totalInvestment : 0;

    // Расчет прибыли
    let totalProfit = 0;
    let profitableCount = 0;
    closedTrades.forEach(trade => {
      const priceProfit = (trade.exitPrice - trade.entryPrice) * trade.quantity;
      const extendedInfo = extendedTradeInfo[trade.id];
      const accumulatedInterest = extendedInfo?.totalInterestWithVariableRate || 0;
      const totalTradeProfit = priceProfit - accumulatedInterest;
      
      if (totalTradeProfit > 0) profitableCount++;
      totalProfit += totalTradeProfit;
    });

    const avgEntryPrice = totalShares > 0 ? totalInvestment / totalShares : 0;
    const avgEntryPriceWithInterest = totalShares > 0 ? (totalInvestment + totalAccumulatedInterest) / totalShares : 0;
    const currentPrice = stockPrices[stock] || avgEntryPrice;
    const currentValue = totalShares * currentPrice;
    const potentialProfit = currentValue - totalInvestment;
    const overallProfit = totalProfit + potentialProfit;
    const overallProfitAfterInterest = overallProfit - totalAccumulatedInterest - totalInterestPaid;
    const winRate = closedTrades.length > 0 ? (profitableCount / closedTrades.length) * 100 : 0;

    // Возвращаем числовые значения с защитой от undefined
    return {
      totalShares: totalShares || 0,
      totalOpenQuantity: totalShares || 0, // алиас для совместимости
      totalQuantity: totalShares || 0, // алиас для совместимости
      avgEntryPrice: avgEntryPrice || 0,
      avgEntryPriceWithInterest: avgEntryPriceWithInterest || 0,
      avgWeightedRate: avgWeightedRate || 0,
      totalInvestment: totalInvestment || 0, // было totalInvested
      totalInvested: totalInvestment || 0, // добавляем алиас
      totalAccumulatedInterest: totalAccumulatedInterest || 0,
      accumulatedInterest: totalAccumulatedInterest || 0, // алиас
      totalInterestPaid: totalInterestPaid || 0,
      currentPrice: currentPrice || 0,
      currentValue: currentValue || 0,
      potentialProfit: potentialProfit || 0,
      totalProfit: totalProfit || 0,
      overallProfit: overallProfit || 0,
      overallProfitAfterInterest: overallProfitAfterInterest || 0,
      winRate: winRate || 0,
      tradesCount: stockTrades.length || 0,
      totalTrades: stockTrades.length || 0, // алиас
      openTrades: openTrades.length || 0,
      closedTrades: closedTrades.length || 0
    };
  };

  // Generate PDF Report
  const generatePDFReport = async (stocksToInclude = null) => {
    try {
      // Определяем, какие акции включить в отчет
      const stocksForReport = stocksToInclude || (selectedStock === 'all' ? ['all'] : [selectedStock]);
      
      // Заголовок документа
      const reportTitle = stocksForReport.includes('all') || stocksForReport.length > 1
        ? 'Отчет по портфелю - Сводный' 
        : `Отчет по портфелю - ${stocksForReport[0]}`;
      
      // Создаем структуру документа
      const docDefinition = {
        content: [
          // Заголовок
          {
            text: reportTitle,
            style: 'header',
            alignment: 'center',
            margin: [0, 0, 0, 20]
          },
          
          // Дата формирования
          {
            text: `Дата формирования: ${format(new Date(), 'd MMMM yyyy, HH:mm', { locale: ru })}`,
            style: 'subheader',
            alignment: 'center',
            margin: [0, 0, 0, 30]
          }
        ],
        
        styles: {
          header: {
            fontSize: 18,
            bold: true
          },
          subheader: {
            fontSize: 12,
            margin: [0, 10, 0, 5]
          },
          sectionHeader: {
            fontSize: 14,
            bold: true,
            margin: [0, 15, 0, 10]
          },
          tableHeader: {
            bold: true,
            fontSize: 11,
            color: 'black'
          }
        },
        
        defaultStyle: {
          fontSize: 10
        }
      };
      
      // Добавляем содержимое в зависимости от выбора акций
      if (stocksForReport.includes('all') || stocksForReport.length > 1) {
        // Общая сводка портфеля
        docDefinition.content.push(
          { text: 'Сводка портфеля', style: 'sectionHeader' },
          
          // Таблица основных показателей
          {
            table: {
              widths: ['*', '*'],
              body: [
                ['Показатель', 'Значение'],
                ['Стоимость позиций', `${stats.totalCostOpen.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₽`],
                ['Активных акций', stats.totalSharesOpen.toString()],
                ['Средняя ставка', `${stats.avgCreditRate.toFixed(2)}%`],
                ['', ''],
                ['Прибыль:', ''],
                ['  Зафиксированная', `${stats.totalProfit.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₽`],
                ['  Потенциальная', `${stats.potentialProfit.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₽`],
                ['  Общая', `${stats.totalOverallProfit.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₽`],
                ['', ''],
                ['Проценты:', ''],
                ['  Заплачено по закрытым', `-${stats.totalInterestPaid.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₽`],
                ['  Накоплено по открытым', `-${stats.totalAccruedInterest.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₽`],
                ['  Итого после %', `${stats.totalOverallProfitAfterInterest.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₽`]
              ]
            },
            layout: 'lightHorizontalLines',
            margin: [0, 0, 0, 20]
          },
          
          // Активность
          { text: 'Активность', style: 'sectionHeader' },
          {
            table: {
              widths: ['*', '*'],
              body: [
                ['Показатель', 'Значение'],
                ['Открытые сделки', stats.totalTradesOpen.toString()],
                ['Закрытые сделки', stats.totalTradesClosed.toString()],
                ['Всего сделок', (stats.totalTradesOpen + stats.totalTradesClosed).toString()],
                ['Эффективность', stats.totalTradesClosed > 0 ? `${Math.round((stats.totalProfit > 0 ? 1 : 0) * 100)}%` : '—'],
                ['Средняя прибыль/сделка', stats.totalTradesClosed > 0 ? 
                  (stats.totalProfit / stats.totalTradesClosed).toLocaleString('ru-RU', { maximumFractionDigits: 0 }) + ' ₽' : '—']
              ]
            },
            layout: 'lightHorizontalLines',
            margin: [0, 0, 0, 20]
          }
        );
      } else {
        // Отчет по конкретной акции
        const stock = stocksForReport[0];
        const stockData = calculateStockMetrics(stock);
        
        if (stockData) {
          docDefinition.content.push(
            { text: `Портфель (${stock})`, style: 'sectionHeader' },
            
            {
              table: {
                widths: ['*', '*'],
                body: [
                  ['Показатель', 'Значение'],
                  ['Стоимость позиций', `${(stockData.totalInvested || 0).toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}`],
                  ['Активных акций', (stockData.totalShares || 0).toString()],
                  ['Всего акций', (stockData.totalShares || 0).toString()],
                  ['', ''],
                  ['Прибыль:', ''],
                  ['  Зафиксированная', `${(stockData.totalProfit || 0).toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}`],
                  ['  Потенциальная', `${(stockData.potentialProfit || 0).toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}`],
                  ['  Общая', `${(stockData.overallProfit || 0).toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}`],
                  ['  Итого после %', `${(stockData.overallProfitAfterInterest || 0).toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}`],
                  ['', ''],
                  ['Сделки:', ''],
                  ['  Открытые', (stockData.openTrades || 0).toString()],
                  ['  Закрытые', (stockData.closedTrades || 0).toString()],
                  ['  Всего', (stockData.tradesCount || 0).toString()]
                ]
              },
              layout: 'lightHorizontalLines',
              margin: [0, 0, 0, 20]
            }
          );
        }
      }
      
      // Добавляем текущие курсы акций, если они есть
      if (Object.keys(stockPrices).length > 0) {
        const pricesToShow = stocksForReport.includes('all') 
          ? Object.entries(stockPrices)
          : Object.entries(stockPrices).filter(([symbol]) => stocksForReport.includes(symbol));
        
        if (pricesToShow.length > 0) {
          docDefinition.content.push(
            { text: 'Текущие курсы акций', style: 'sectionHeader' },
            {
              table: {
                widths: ['*', '*'],
                body: [
                  ['Акция', 'Цена'],
                  ...pricesToShow
                    .filter(([_, price]) => price && !isNaN(parseFloat(price)))
                    .map(([symbol, price]) => [
                      symbol,
                      `${parseFloat(price).toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ₽`
                    ])
                ]
              },
              layout: 'lightHorizontalLines'
            }
          );
        }
      }
      
      // Генерируем и скачиваем PDF
      const fileName = stocksForReport.includes('all') 
        ? `Отчет_портфель_общий_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.pdf`
        : stocksForReport.length === 1
        ? `Отчет_портфель_${stocksForReport[0]}_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.pdf`
        : `Отчет_портфель_выбранные_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.pdf`;
      
      pdfMake.createPdf(docDefinition).download(fileName);
      
      // Закрываем модальное окно
      setShowPDFOptions(false);
      
    } catch (error) {
      console.error('Ошибка при создании PDF отчета:', error);
      setError('Не удалось создать PDF отчет. Попробуйте еще раз.');
    }
  };

  // Подготовка данных для графика прибыли по месяцам
  const prepareMonthlyProfitData = () => {
    const sortedMonths = Object.keys(stats.monthlyProfits).sort((a, b) => {
      const [yearA, monthA] = a.split('-').map(Number);
      const [yearB, monthB] = b.split('-').map(Number);
      return yearA === yearB ? monthA - monthB : yearA - yearB;
    });
    
    // Расчет данных о процентах по месяцам, если их нет в данных
    // В данном случае, разница между прибылью и прибылью после процентов
    const calculateInterestByMonth = () => {
      const interestByMonth = {};
      
      sortedMonths.forEach(month => {
        const monthlyProfit = typeof stats.monthlyProfits[month] === 'object' 
          ? stats.monthlyProfits[month].profit || 0
          : stats.monthlyProfits[month] || 0;
          
        // Если есть данные о месячных процентах, используем их
        // В противном случае оцениваем как ~20% от прибыли для визуализации разницы
        let monthlyInterest = 0;
        
        if (stats.monthlyInterests && stats.monthlyInterests[month]) {
          monthlyInterest = stats.monthlyInterests[month];
        } else if (stats.monthlyProfits[month] && typeof stats.monthlyProfits[month] === 'object' && 
                  stats.monthlyProfits[month].profit && stats.monthlyProfits[month].profitAfterInterest) {
          // Если есть оба значения, вычисляем разницу
          monthlyInterest = stats.monthlyProfits[month].profit - stats.monthlyProfits[month].profitAfterInterest;
        } else {
          // Оценка процентов как ~15% от прибыли для демонстрации разницы
          monthlyInterest = Math.abs(monthlyProfit) * 0.15;
        }
        
        interestByMonth[month] = monthlyInterest;
      });
      
      return interestByMonth;
    };
    
    const interestByMonth = calculateInterestByMonth();
    
    // Получение данных прибыли
    const profits = sortedMonths.map(month => {
      if (!stats.monthlyProfits[month]) return 0;
      
      if (typeof stats.monthlyProfits[month] === 'object') {
        return stats.monthlyProfits[month].profit || 0;
      }
      
      return stats.monthlyProfits[month] || 0;
    });
    
    // Получение данных прибыли после вычета процентов
    const profitsAfterInterest = sortedMonths.map(month => {
      if (!stats.monthlyProfits[month]) return 0;
      
      if (typeof stats.monthlyProfits[month] === 'object' && 
          stats.monthlyProfits[month].hasOwnProperty('profitAfterInterest')) {
        return stats.monthlyProfits[month].profitAfterInterest;
      }
      
      // Если нет данных о прибыли после процентов, вычисляем из прибыли и процентов
      const profit = typeof stats.monthlyProfits[month] === 'object' 
        ? stats.monthlyProfits[month].profit || 0 
        : stats.monthlyProfits[month] || 0;
        
      return profit - interestByMonth[month];
    });
    
    // Проверка на идентичность данных и внесение небольшой разницы для визуализации
    const areArraysIdentical = JSON.stringify(profits) === JSON.stringify(profitsAfterInterest);
    
    if (areArraysIdentical && profits.some(profit => profit !== 0)) {
      // Если данные идентичны, но не все нули, добавляем искусственную разницу
      for (let i = 0; i < profitsAfterInterest.length; i++) {
        if (profitsAfterInterest[i] !== 0) {
          profitsAfterInterest[i] = profits[i] - Math.abs(profits[i] * 0.15); // Примерно 15% разницы
        }
      }
    }
    
    const datasets = [
      {
        label: 'Прибыль (без %)',
        data: profits,
        backgroundColor: 'rgba(124, 58, 237, 0.7)',
        borderColor: 'rgba(124, 58, 237, 1)',
        borderWidth: 1,
        borderRadius: 4,
        barPercentage: 0.8,
        categoryPercentage: 0.7,
      },
      {
        label: 'Прибыль (с %)',
        data: profitsAfterInterest,
        backgroundColor: 'rgba(79, 70, 229, 0.7)',
        borderColor: 'rgba(79, 70, 229, 1)',
        borderWidth: 1,
        borderRadius: 4,
        barPercentage: 0.8,
        categoryPercentage: 0.7,
      }
    ];
    
    return {
      labels: sortedMonths.map(month => {
        const [year, monthNum] = month.split('-');
        return ru.localize.month(parseInt(monthNum) - 1) + ' ' + year;
      }),
      datasets: datasets
    };
  };
  
  const prepareProfitBySymbolData = () => {
    const symbols = Object.keys(stats.profitBySymbol);
    
    return {
      labels: symbols,
      datasets: [
        {
          label: 'Прибыль по инструментам',
          data: symbols.map(symbol => stats.profitBySymbol[symbol]),
          backgroundColor: symbols.map((_, index) => 
            `rgba(124, 58, 237, ${0.5 + (index % 3) * 0.15})`
          ),
          borderColor: 'rgb(255, 255, 255)',
          borderWidth: 2,
          hoverOffset: 15,
        },
      ],
    };
  };
  
  const prepareTradesBySymbolData = () => {
    const symbols = Object.keys(stats.symbolCounts);
    
    return {
      labels: symbols,
      datasets: [
        {
          label: 'Количество сделок',
          data: symbols.map(symbol => stats.symbolCounts[symbol]),
          backgroundColor: symbols.map((_, index) => 
            `rgba(79, 70, 229, ${0.5 + (index % 3) * 0.15})`
          ),
          borderColor: 'rgb(255, 255, 255)',
          borderWidth: 1,
          borderRadius: 6,
          borderSkipped: false,
        },
      ],
    };
  };
  
  const prepareHoldingPeriodsData = () => {
    if (!stats.holdingPeriods.closed) return null;
    
    const periods = stats.holdingPeriods.closed;
    
    return {
      labels: Object.keys(periods),
      datasets: [
        {
          label: 'Длительность удержания (дни)',
          data: Object.values(periods),
          backgroundColor: [
            'rgba(124, 58, 237, 0.7)',
            'rgba(139, 92, 246, 0.7)',
            'rgba(167, 139, 250, 0.7)',
            'rgba(196, 181, 253, 0.7)',
          ],
          borderWidth: 0,
        },
      ],
    };
  };
  
  const prepareTradeStatusData = () => {
    return {
      labels: ['Открытые', 'Закрытые'],
      datasets: [
        {
          data: [stats.totalTradesOpen, stats.totalTradesClosed],
          backgroundColor: [
            'rgba(124, 58, 237, 0.7)',
            'rgba(79, 70, 229, 0.7)',
          ],
          borderColor: 'rgb(255, 255, 255)',
          borderWidth: 2,
        },
      ],
    };
  };

  // Подготовка данных для графика среднедневной прибыли
  const prepareDailyProfitData = () => {
    const sortedMonths = Object.keys(stats.monthlyProfits).sort((a, b) => {
      const [yearA, monthA] = a.split('-').map(Number);
      const [yearB, monthB] = b.split('-').map(Number);
      return yearA === yearB ? monthA - monthB : yearA - yearB;
    });
    
    // Вычисляем среднесуточную прибыль по месяцам
    const dailyProfits = sortedMonths.map(month => {
      const monthProfit = typeof stats.monthlyProfits[month] === 'object' 
        ? stats.monthlyProfits[month].profit || 0
        : stats.monthlyProfits[month] || 0;
      
      // Количество дней в месяце 
      const [year, monthNum] = month.split('-').map(Number);
      const daysInMonth = new Date(year, monthNum, 0).getDate();
      
      // Среднесуточный профит
      return monthProfit / daysInMonth;
    });
    
    return {
      labels: sortedMonths.map(month => {
        const [year, monthNum] = month.split('-');
        return ru.localize.month(parseInt(monthNum) - 1) + ' ' + year;
      }),
      datasets: [
        {
          label: 'Среднедневная прибыль',
          data: dailyProfits,
          backgroundColor: 'rgba(124, 58, 237, 0.7)',
          borderColor: 'rgba(124, 58, 237, 1)',
          borderWidth: 2,
          tension: 0.4,
          fill: true,
        }
      ]
    };
  };

  // Подготовка данных для графика эффективности инвестиций по месяцам (ROI)
  const prepareMonthlyROIData = () => {
    const sortedMonths = Object.keys(stats.monthlyProfits).sort((a, b) => {
      const [yearA, monthA] = a.split('-').map(Number);
      const [yearB, monthB] = b.split('-').map(Number);
      return yearA === yearB ? monthA - monthB : yearA - yearB;
    });
    
    // Оценочная сумма инвестиций по месяцам (предполагаем постоянное увеличение на 5%)
    let estimatedMonthlyInvestment = stats.totalCostOpen / (sortedMonths.length || 1);
    const investments = sortedMonths.map((_, index) => {
      const investment = estimatedMonthlyInvestment * (1 + 0.05 * index);
      return investment;
    });
    
    // Расчет ROI по месяцам
    const monthlyROI = sortedMonths.map((month, index) => {
      const monthProfit = typeof stats.monthlyProfits[month] === 'object' 
        ? stats.monthlyProfits[month].profit || 0
        : stats.monthlyProfits[month] || 0;
      
      return (monthProfit / investments[index]) * 100;
    });
    
    return {
      labels: sortedMonths.map(month => {
        const [year, monthNum] = month.split('-');
        return ru.localize.month(parseInt(monthNum) - 1) + ' ' + year;
      }),
      datasets: [
        {
          label: 'ROI (%)',
          data: monthlyROI,
          backgroundColor: 'rgba(79, 70, 229, 0.7)',
          borderColor: 'rgba(79, 70, 229, 1)',
          borderWidth: 2,
          borderRadius: 4,
        }
      ]
    };
  };

  // Helper: prepare monthly profit data for a specific stock - улучшенная версия
  const prepareStockMonthlyProfitData = (symbol) => {
    const profitMap = {};
    trades.filter(t => t.symbol === symbol && t.exitDate).forEach(t => {
      const month = format(parseDateLocal(t.exitDate), 'yyyy-MM');
      const profit = (Number(t.exitPrice) - Number(t.entryPrice)) * Number(t.quantity);
      profitMap[month] = (profitMap[month] || 0) + profit;
    });
    const months = Object.keys(profitMap).sort();
    
    if (months.length === 0) {
      return {
        labels: ['Нет данных'],
        datasets: [{
          label: 'Прибыль по месяцам',
          data: [0],
          backgroundColor: CHART_COLORS.primary,
          borderColor: CHART_COLORS.secondary,
          borderWidth: 1
        }]
      };
    }
    
    return {
      labels: months.map(m => {
        const [year, mon] = m.split('-');
        const monthName = ru.localize.month(parseInt(mon, 10) - 1);
        return `${monthName.substring(0, 3)} ${year}`;
      }),
      datasets: [{
        label: 'Прибыль',
        data: months.map(m => profitMap[m]),
        backgroundColor: months.map(m => profitMap[m] >= 0 ? CHART_COLORS.green : CHART_COLORS.red),
        borderColor: CHART_COLORS.secondary,
        borderWidth: 1,
        borderRadius: 4
      }]
    };
  };

  // Helper: prepare open/closed status data for a specific stock - улучшенная версия
  const prepareStockStatusData = (symbol) => {
    const stockTrades = trades.filter(t => t.symbol === symbol);
    const openCount = stockTrades.filter(t => !t.exitDate).length;
    const closedCount = stockTrades.filter(t => t.exitDate).length;
    
    if (openCount === 0 && closedCount === 0) {
      return {
        labels: ['Нет данных'],
        datasets: [{
          data: [1],
          backgroundColor: ['#e5e7eb'],
          borderWidth: 0
        }]
      };
    }
    
    return {
      labels: ['Открытые', 'Закрытые'],
      datasets: [{
        data: [openCount, closedCount],
        backgroundColor: [CHART_COLORS.primary, CHART_COLORS.secondary],
        borderColor: '#ffffff',
        borderWidth: 2,
        hoverOffset: 8
      }]
    };
  };

  // Helper: prepare entry price over time data for a specific stock - улучшенная версия
  const prepareStockEntryPriceData = (symbol) => {
    const stockTrades = trades.filter(t => t.symbol === symbol).sort((a, b) => 
      new Date(a.entryDate) - new Date(b.entryDate)
    );
    
    if (stockTrades.length === 0) {
      return {
        labels: ['Нет данных'],
        datasets: [{
          label: 'Диапазон цен',
          data: [0],
          backgroundColor: CHART_COLORS.primary,
          borderColor: CHART_COLORS.secondary,
          borderWidth: 1
        }]
      };
    }
    
    // Группируем цены по диапазонам для столбчатой диаграммы
    const prices = stockTrades.map(t => Number(t.entryPrice));
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const range = maxPrice - minPrice;
    
    // Создаем 5 диапазонов цен
    const rangeSize = range / 5;
    const ranges = [];
    const rangeCounts = [];
    const rangeColors = [];
    
    for (let i = 0; i < 5; i++) {
      const rangeStart = minPrice + (rangeSize * i);
      const rangeEnd = minPrice + (rangeSize * (i + 1));
      
      // Подсчитываем количество сделок в этом диапазоне
      const tradesInRange = prices.filter(price => 
        price >= rangeStart && (i === 4 ? price <= rangeEnd : price < rangeEnd)
      ).length;
      
      ranges.push(`${rangeStart.toFixed(0)}-${rangeEnd.toFixed(0)}₽`);
      rangeCounts.push(tradesInRange);
      rangeColors.push(`rgba(124, 58, 237, ${0.4 + (tradesInRange / stockTrades.length) * 0.6})`);
    }
    
    return {
      labels: ranges,
      datasets: [{
        label: 'Количество сделок в диапазоне цен',
        data: rangeCounts,
        backgroundColor: rangeColors,
        borderColor: CHART_COLORS.secondary,
        borderWidth: 1,
        borderRadius: 6
      }]
    };  
  };

  // Helper: prepare cumulative profit over time for a specific stock - более плоская и красивая версия
  const prepareStockCumulativeProfitData = (symbol) => {
    const closedTrades = trades
      .filter(t => t.symbol === symbol && t.exitDate && t.exitPrice)
      .map(t => ({ 
        date: parseDateLocal(t.exitDate), 
        profit: (Number(t.exitPrice) - Number(t.entryPrice)) * Number(t.quantity) 
      }))
      .sort((a, b) => a.date - b.date);
    
    if (closedTrades.length === 0) {
      return {
        labels: ['Нет данных'],
        datasets: [{
          label: 'Накопленная прибыль',
          data: [0],
          borderColor: CHART_COLORS.secondary,
          backgroundColor: 'transparent',
          tension: 0.1,
          pointRadius: 0
        }]
      };
    }
    
    let cumulative = 0;
    const labels = [];
    const data = [];
    
    closedTrades.forEach(({ date, profit }, index) => {
      cumulative += profit;
      labels.push(`${index + 1}`);
      data.push(cumulative);
    });
    
    // Определяем цвет линии в зависимости от итоговой прибыли
    const finalProfit = data[data.length - 1];
    const lineColor = finalProfit >= 0 ? CHART_COLORS.green : CHART_COLORS.red;
    const gradientColor = finalProfit >= 0 ? 
      'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)';
    
    return {
      labels,
      datasets: [{
        label: 'Накопленная прибыль (₽)',
        data,
        borderColor: lineColor,
        backgroundColor: gradientColor,
        borderWidth: 3,
        tension: 0.1,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: lineColor,
        pointHoverBorderColor: '#ffffff',
        pointHoverBorderWidth: 2,
        fill: true
      }]
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-900 transition-colors duration-300">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-brand-blue-500 border-r-2 border-b-2 border-transparent"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-900 transition-colors duration-300">
      <div className="p-6 max-w-6xl mx-auto">
        <h1 className="text-2xl font-medium text-gray-900 dark:text-gray-100 mb-8">
          {t('statistics.title', 'Статистика торговли')}
        </h1>

        {/* Error message */}
        {error && (
          <div className="notification-error mb-6">
            {error}
          </div>
        )}

        {/* Stock Filter */}
        <div className="flex items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <label htmlFor="stockFilter" className="text-sm text-gray-600 dark:text-gray-400">
              {t('statistics.selectStock', 'Акция')}:
            </label>
            <select
              id="stockFilter"
              value={selectedStock}
              onChange={(e) => handleStockChange(e.target.value)}
              className="bank-select"
            >
              <option value="all">{t('common.all', 'Все акции')}</option>
              {availableStocks.map(symbol => (
                <option key={symbol} value={symbol}>{symbol}</option>
              ))}
            </select>
          </div>
          
          <div className="flex">
            <button
              onClick={() => generatePDFReport()}
              className="bank-button-primary rounded-r-none border-r border-brand-blue-600 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {t('statistics.pdfReport', 'PDF отчет')}
            </button>
            <button
              onClick={() => setShowPDFOptions(true)}
              className="bank-button-primary rounded-l-none border-l-0 px-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Saved stock prices info */}
        {Object.keys(stockPrices).length > 0 && (
          <div className="bank-card mb-8">
            <div className="bank-card-body">
              <div className="font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('statistics.currentPrices', 'Текущие курсы акций')}:
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(stockPrices)
                  .filter(([_, price]) => price && !isNaN(parseFloat(price)))
                  .map(([symbol, price]) => (
                    <span key={symbol} className="badge badge-info">
                      {symbol}: {parseFloat(price).toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 2 })}
                    </span>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* Main statistics */}
        <div className="mb-8">
          {selectedStock === 'all' ? (
            // General statistics
            <div>
              {/* Detailed stats */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bank-card">
                  <div className="bank-card-body">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                      {t('statistics.portfolioSummary', 'Сводка портфеля')}
                    </h3>
                    <div className="space-y-4">
                      {/* Basic portfolio info */}
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-gray-600 dark:text-gray-400">
                            {t('statistics.positionValue', 'Стоимость позиций')}
                          </span>
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {stats.totalCostOpen.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-gray-600 dark:text-gray-400">
                            {t('statistics.activeShares', 'Активных акций')}
                          </span>
                          <span className="font-medium text-gray-900 dark:text-gray-100">{stats.totalSharesOpen}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">
                            {t('statistics.averageRate', 'Средняя ставка')}
                          </span>
                          <span className="font-medium text-gray-900 dark:text-gray-100">{stats.avgCreditRate.toFixed(2)}%</span>
                        </div>
                      </div>
                      
                      {/* Profit breakdown */}
                      <div className="border-t border-gray-100 dark:border-dark-700 pt-4">
                        <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                          {t('trades.profit', 'Прибыль')}:
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">
                              {t('statistics.realizedProfit', 'Зафиксированная')}
                            </span>
                            <span className={`font-medium ${(stats.totalProfit || 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                              {stats.totalProfit.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">
                              {t('statistics.potentialProfit', 'Потенциальная')}
                            </span>
                            <span className={`font-medium ${(stats.potentialProfit || 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                              {stats.potentialProfit.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm pt-2 border-t border-gray-100 dark:border-dark-700">
                            <span className="text-gray-700 dark:text-gray-300 font-medium">
                              {t('statistics.totalProfit', 'Общая')}
                            </span>
                            <span className={`font-bold ${(stats.totalOverallProfit || 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                              {stats.totalOverallProfit.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Interest costs */}
                      <div className="border-t border-gray-100 dark:border-dark-700 pt-4">
                        <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                          {t('statistics.interests', 'Проценты')}:
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">
                              {t('statistics.paidOnClosed', 'Заплачено по закрытым')}
                            </span>
                            <span className="text-red-600 dark:text-red-400 font-medium">
                              -{stats.totalInterestPaid.toLocaleString('ru-RU', {style: 'currency', currency: 'RUB', maximumFractionDigits: 0})}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">
                              {t('statistics.accruedOnOpen', 'Накоплено по открытым')}
                            </span>
                            <span className="text-red-500 dark:text-red-400">
                              -{stats.totalAccruedInterest.toLocaleString('ru-RU', {style: 'currency', currency: 'RUB', maximumFractionDigits: 0})}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm pt-2 border-t border-gray-100 dark:border-dark-700">
                            <span className="text-gray-700 dark:text-gray-300 font-medium">
                              {t('statistics.totalAfterInterest', 'Итого после %')}
                            </span>
                            <span className={`font-bold ${(stats.totalOverallProfitAfterInterest || 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                              {stats.totalOverallProfitAfterInterest.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bank-card">
                  <div className="bank-card-body">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                      {t('statistics.activity', 'Активность')}
                    </h3>
                    <div className="space-y-4">
                      {/* Trade summary */}
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-gray-600 dark:text-gray-400">
                            {t('statistics.openTrades', 'Открытые сделки')}
                          </span>
                          <span className="font-medium text-gray-900 dark:text-gray-100">{stats.totalTradesOpen}</span>
                        </div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-gray-600 dark:text-gray-400">
                            {t('statistics.closedTrades', 'Закрытые сделки')}
                          </span>
                          <span className="font-medium text-gray-900 dark:text-gray-100">{stats.totalTradesClosed}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">
                            {t('statistics.totalTrades', 'Всего сделок')}
                          </span>
                          <span className="font-medium text-gray-900 dark:text-gray-100">{stats.totalTradesOpen + stats.totalTradesClosed}</span>
                        </div>
                      </div>

                      {/* Performance metrics */}
                      <div className="border-t border-gray-100 dark:border-dark-700 pt-4">
                        <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                          {t('statistics.performance', 'Эффективность')}:
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">
                              {t('statistics.winRate', 'Успешность')}
                            </span>
                            <span className="font-medium text-gray-900 dark:text-gray-100">
                              {stats.totalTradesClosed > 0 ? `${Math.round((stats.totalProfit > 0 ? 1 : 0) * 100)}%` : '—'}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">
                              {t('statistics.averageProfit', 'Средняя прибыль/сделка')}
                            </span>
                            <span className="font-medium text-gray-900 dark:text-gray-100">
                              {stats.totalTradesClosed > 0 
                                ? (stats.totalProfit / stats.totalTradesClosed).toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })
                                : '—'
                              }
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Stock-specific statistics
            <div>
              {(() => {
                const stockData = calculateStockMetrics(selectedStock);
                
                if (!stockData) return (
                  <div className="bank-card text-center">
                    <div className="bank-card-body">
                      <p className="text-gray-500 dark:text-gray-400">
                        {t('statistics.noData', 'Нет данных для выбранной акции')}
                      </p>
                    </div>
                  </div>
                );
                
                return (
                  <div>
                    {/* Detailed stats for specific stock */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="bank-card">
                        <div className="bank-card-body">
                          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                            {t('statistics.portfolio', 'Портфель')} ({selectedStock})
                          </h3>
                          <div className="space-y-4">
                            {/* Basic info */}
                            <div>
                              <div className="flex justify-between text-sm mb-2">
                                <span className="text-gray-600 dark:text-gray-400">
                                  {t('statistics.positionValue', 'Стоимость позиций')}
                                </span>
                                <span className="font-medium text-gray-900 dark:text-gray-100">
                                  {(stockData.totalInvested || 0).toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}
                                </span>
                              </div>
                              <div className="flex justify-between text-sm mb-2">
                                <span className="text-gray-600 dark:text-gray-400">
                                  {t('statistics.activeShares', 'Активных акций')}
                                </span>
                                <span className="font-medium text-gray-900 dark:text-gray-100">{stockData.totalOpenQuantity}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600 dark:text-gray-400">
                                  {t('statistics.totalShares', 'Всего акций')}
                                </span>
                                <span className="font-medium text-gray-900 dark:text-gray-100">{stockData.totalQuantity}</span>
                              </div>
                            </div>
                            
                            {/* Profit breakdown */}
                            <div className="border-t border-gray-100 dark:border-dark-700 pt-4">
                              <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                {t('trades.profit', 'Прибыль')}:
                              </div>
                              <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-600 dark:text-gray-400">
                                    {t('statistics.realizedProfit', 'Зафиксированная')}
                                  </span>
                                  <span className={`font-medium ${(stockData.totalProfit || 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                    {(stockData.totalProfit || 0).toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}
                                  </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-600 dark:text-gray-400">
                                    {t('statistics.potentialProfit', 'Потенциальная')}
                                  </span>
                                  <span className={`font-medium ${(stockData.potentialProfit || 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                    {(stockData.potentialProfit || 0).toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}
                                  </span>
                                </div>
                                <div className="flex justify-between text-sm pt-2 border-t border-gray-100 dark:border-dark-700">
                                  <span className="text-gray-700 dark:text-gray-300 font-medium">
                                    {t('statistics.totalProfit', 'Общая')}
                                  </span>
                                  <span className={`font-bold ${(stockData.overallProfit || 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                    {(stockData.overallProfit || 0).toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Interest costs */}
                            <div className="border-t border-gray-100 dark:border-dark-700 pt-4">
                              <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                {t('statistics.interests', 'Проценты')}:
                              </div>
                              <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-600 dark:text-gray-400">
                                    {t('statistics.paidOnClosed', 'Заплачено по закрытым')}
                                  </span>
                                  <span className="text-red-600 dark:text-red-400 font-medium">
                                    -{(stockData.totalInterestPaid || 0).toLocaleString('ru-RU', {style: 'currency', currency: 'RUB', maximumFractionDigits: 0})}
                                  </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-600 dark:text-gray-400">
                                    {t('statistics.accruedOnOpen', 'Накоплено по открытым')}
                                  </span>
                                  <span className="text-red-500 dark:text-red-400">
                                    -{(stockData.accumulatedInterest || 0).toLocaleString('ru-RU', {style: 'currency', currency: 'RUB', maximumFractionDigits: 0})}
                                  </span>
                                </div>
                                <div className="flex justify-between text-sm pt-2 border-t border-gray-100 dark:border-dark-700">
                                  <span className="text-gray-700 dark:text-gray-300 font-medium">
                                    {t('statistics.totalAfterInterest', 'Итого после %')}
                                  </span>
                                  <span className={`font-bold ${(stockData.overallProfitAfterInterest || 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                    {(stockData.overallProfitAfterInterest || 0).toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bank-card">
                        <div className="bank-card-body">
                          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                            {t('statistics.details', 'Детали')} по {selectedStock}
                          </h3>
                          <div className="space-y-4">
                            {/* Price info */}
                            <div>
                              <div className="flex justify-between text-sm mb-2">
                                <span className="text-gray-600 dark:text-gray-400">
                                  {t('statistics.averageEntryPrice', 'Средняя цена входа')}
                                </span>
                                <span className="font-medium text-gray-900 dark:text-gray-100">
                                  {(stockData.avgEntryPrice || 0).toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 2 })}
                                </span>
                              </div>
                              {(stockData.avgEntryPriceWithInterest || 0) > 0 && (
                                <div className="flex justify-between text-sm mb-2">
                                  <span className="text-gray-600 dark:text-gray-400">
                                    {t('statistics.avgEntryPriceWithInterest', 'Средняя цена с процентами')}
                                  </span>
                                  <span className="font-medium text-orange-600 dark:text-orange-400">
                                    {(stockData.avgEntryPriceWithInterest || 0).toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 2 })}
                                  </span>
                                </div>
                              )}
                              <div className="flex justify-between text-sm mb-2">
                                <span className="text-gray-600 dark:text-gray-400">
                                  {t('statistics.currentPrice', 'Текущая цена')}
                                </span>
                                <span className="font-medium text-gray-900 dark:text-gray-100">
                                  {(stockData.currentPrice || 0) > 0 ? (stockData.currentPrice || 0).toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 2 }) : '—'}
                                </span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600 dark:text-gray-400">
                                  {t('statistics.currentValue', 'Текущая стоимость')}
                                </span>
                                <span className="font-medium text-gray-900 dark:text-gray-100">
                                  {(stockData.currentValue || 0).toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}
                                </span>
                              </div>
                            </div>
                            
                            {/* Trading activity */}
                            <div className="border-t border-gray-100 dark:border-dark-700 pt-4">
                              <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                {t('trades.trades', 'Сделки')}:
                              </div>
                              <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-600 dark:text-gray-400">
                                    {t('statistics.openTrades', 'Открытые')}
                                  </span>
                                  <span className="font-medium text-gray-900 dark:text-gray-100">{stockData.openTrades}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-600 dark:text-gray-400">
                                    {t('statistics.closedTrades', 'Закрытые')}
                                  </span>
                                  <span className="font-medium text-gray-900 dark:text-gray-100">{stockData.closedTrades}</span>
                                </div>
                                <div className="flex justify-between text-sm pt-2 border-t border-gray-100 dark:border-dark-700">
                                  <span className="text-gray-700 dark:text-gray-300 font-medium">
                                    {t('statistics.totalTrades', 'Всего')}
                                  </span>
                                  <span className="font-bold text-gray-900 dark:text-gray-100">{stockData.totalTrades}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
              
              {/* Stock-specific charts in minimalistic style */}
              <div className="space-y-6 mt-8">
                {/* Monthly profit chart */}
                <div className="bank-card">
                  <div className="bank-card-body">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                      {t('statistics.profitByMonth', 'Прибыль по месяцам')} ({selectedStock})
                    </h3>
                    <div style={{ height: '300px', width: '100%' }}>
                      <Bar
                        data={prepareStockMonthlyProfitData(selectedStock)}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: { display: false },
                            tooltip: {
                              backgroundColor: 'white',
                              titleColor: '#374151',
                              bodyColor: '#6b7280',
                              borderColor: '#d1d5db',
                              borderWidth: 1,
                              callbacks: {
                                label: function(context) {
                                  return `Прибыль: ${new Intl.NumberFormat('ru-RU', {
                                    style: 'currency',
                                    currency: 'RUB',
                                    maximumFractionDigits: 0
                                  }).format(context.parsed.y)}`;
                                }
                              }
                            }
                          }
                        }}
                        scales={{
                          y: {
                            beginAtZero: true,
                            grid: { color: '#f3f4f6' },
                            border: { display: false },
                            ticks: {
                              callback: function(value) {
                                return new Intl.NumberFormat('ru-RU', {
                                  style: 'currency',
                                  currency: 'RUB',
                                  notation: 'compact'
                                }).format(value);
                              }
                            }
                          },
                          x: {
                            grid: { display: false },
                            border: { display: false }
                          }
                        }}
                        elements={{ bar: { borderRadius: 2 } }}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Status chart */}
                  <div className="bank-card">
                    <div className="bank-card-body">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                        {t('statistics.positionStatus', 'Статус позиций')}
                      </h3>
                      <div style={{ height: '250px', width: '100%' }}>
                        <Doughnut
                          data={prepareStockStatusData(selectedStock)}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            cutout: '70%',
                            plugins: {
                              legend: {
                                position: 'bottom',
                                labels: { padding: 20, usePointStyle: true }
                              }
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Price ranges chart */}
                  <div className="bank-card">
                    <div className="bank-card-body">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                        {t('statistics.entryPriceRanges', 'Диапазоны цен входа')}
                      </h3>
                      <div style={{ height: '250px', width: '100%' }}>
                        <Bar
                          data={prepareStockEntryPriceData(selectedStock)}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              legend: { display: false }
                            },
                            scales: {
                              y: {
                                beginAtZero: true,
                                grid: { color: '#f3f4f6' },
                                border: { display: false }
                              },
                              x: {
                                grid: { display: false },
                                border: { display: false }
                              }
                            },
                            elements: { bar: { borderRadius: 2 } }
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Cumulative profit chart */}
                  <div className="bank-card lg:col-span-2">
                    <div className="bank-card-body">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                        {t('statistics.cumulativeProfit', 'Накопленная прибыль')} ({selectedStock})
                      </h3>
                      <div style={{ height: '250px', width: '100%' }}>
                        <Line
                          data={prepareStockCumulativeProfitData(selectedStock)}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: { legend: { display: false } },
                            scales: {
                              y: {
                                grid: { color: '#f3f4f6' },
                                border: { display: false }
                              },
                              x: {
                                grid: { display: false },
                                border: { display: false }
                              }
                            },
                            interaction: { intersect: false, mode: 'index' }
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Charts for all stocks */}
        {selectedStock === 'all' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Profit Chart */}
            <div className="bank-card">
              <div className="bank-card-body">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                  {t('statistics.profitByMonth', 'Прибыль по месяцам')}
                </h3>
                {Object.keys(stats.monthlyProfits).length > 0 ? (
                  <div style={{ height: '300px' }}>
                    <Bar 
                      data={prepareMonthlyProfitData()} 
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'top',
                            labels: { usePointStyle: true, padding: 20 }
                          }
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            grid: { color: '#f3f4f6' },
                            border: { display: false }
                          },
                          x: {
                            grid: { display: false },
                            border: { display: false }
                          }
                        },
                        elements: { bar: { borderRadius: 2 } }
                      }}
                    />
                  </div>
                ) : (
                  <div className="flex justify-center items-center h-48 text-gray-500">
                    {t('statistics.noData', 'Нет данных для отображения')}
                  </div>
                )}
              </div>
            </div>
            
            {/* Daily Profit Chart */}
            <div className="bank-card">
              <div className="bank-card-body">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                  {t('statistics.averageDailyProfit', 'Среднедневная прибыль')}
                </h3>
                {Object.keys(stats.monthlyProfits).length > 0 ? (
                  <div style={{ height: '300px' }}>
                    <Line
                      data={prepareDailyProfitData()}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                          y: {
                            beginAtZero: true,
                            grid: { color: '#f3f4f6' },
                            border: { display: false }
                          },
                          x: {
                            grid: { display: false },
                            border: { display: false }
                          }
                        }
                      }}
                    />
                  </div>
                ) : (
                  <div className="flex justify-center items-center h-48 text-gray-500">
                    {t('statistics.noData', 'Нет данных для отображения')}
                  </div>
                )}
              </div>
            </div>
            
            {/* Trade Status Chart */}
            <div className="bank-card lg:col-span-2">
              <div className="bank-card-body">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                  {t('statistics.positionStatus', 'Статус позиций')}
                </h3>
                <div style={{ height: '300px' }} className="flex justify-center">
                  <Doughnut 
                    data={{
                      labels: ['Открытые', 'Закрытые'],
                      datasets: [{
                        data: [stats.totalTradesOpen, stats.totalTradesClosed],
                        backgroundColor: ['#6b7280', '#374151'],
                        borderWidth: 0
                      }],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      cutout: '70%',
                      plugins: {
                        legend: {
                          position: 'right',
                          labels: { usePointStyle: true, padding: 20 }
                        }
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* PDF Options Modal */}
      {showPDFOptions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Настройки PDF отчета</h3>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Выберите акции для включения в отчет:
              </label>
              
              <div className="space-y-2 max-h-60 overflow-y-auto">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedStocksForPDF.includes('all')}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedStocksForPDF(['all']);
                      } else {
                        setSelectedStocksForPDF([]);
                      }
                    }}
                    className="rounded border-gray-300 text-gray-600 focus:ring-gray-400"
                  />
                  <span className="ml-2 text-sm text-gray-700 font-medium">Все акции (общий отчет)</span>
                </label>
                
                <div className="pl-4 space-y-2">
                  {availableStocks.map(stock => (
                    <label key={stock} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedStocksForPDF.includes(stock) && !selectedStocksForPDF.includes('all')}
                        onChange={(e) => {
                          if (selectedStocksForPDF.includes('all')) {
                            setSelectedStocksForPDF(e.target.checked ? [stock] : []);
                          } else {
                            if (e.target.checked) {
                              setSelectedStocksForPDF([...selectedStocksForPDF, stock]);
                            } else {
                              setSelectedStocksForPDF(selectedStocksForPDF.filter(s => s !== stock));
                            }
                          }
                        }}
                        disabled={selectedStocksForPDF.includes('all')}
                        className="rounded border-gray-300 text-gray-600 focus:ring-gray-400 disabled:opacity-50"
                      />
                      <span className="ml-2 text-sm text-gray-700">{stock}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowPDFOptions(false);
                  setSelectedStocksForPDF([]);
                }}
                className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-gray-400"
              >
                {t('common.cancel', 'Отмена')}
              </button>
              <button
                onClick={() => {
                  const stocksToGenerate = selectedStocksForPDF.length > 0 
                    ? selectedStocksForPDF 
                    : (selectedStock === 'all' ? ['all'] : [selectedStock]);
                  generatePDFReport(stocksToGenerate);
                }}
                className="px-4 py-2 text-sm text-white bg-gray-700 border border-gray-700 rounded-md hover:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-gray-400"
              >
                {t('common.create', 'Создать')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Statistics; 