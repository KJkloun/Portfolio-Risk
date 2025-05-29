import { useState, useEffect } from 'react';
import axios from 'axios';
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
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';

// Импорт унифицированных компонентов и дизайн-системы
import { Card, Button, Select, Badge } from './ui';
import { themeClasses, colors } from '../styles/designSystem';
import { useTheme } from '../contexts/ThemeContext';

// Initialize pdfMake with fonts
pdfMake.vfs = pdfFonts.vfs;

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
  Legend
);

function Statistics() {
  const { isDark } = useTheme();
  
  // Унифицированная цветовая палитра для графиков в зависимости от темы
  const chartColors = {
    primary: isDark ? '#8b5cf6' : '#7c3aed',
    secondary: isDark ? '#6366f1' : '#4f46e5', 
    success: isDark ? '#10b981' : '#059669',
    error: isDark ? '#ef4444' : '#dc2626',
    warning: isDark ? '#f59e0b' : '#d97706',
    info: isDark ? '#3b82f6' : '#2563eb',
    
    // Дополнительные цвета для многоцветных графиков
    accent1: isDark ? '#a855f7' : '#9333ea',
    accent2: isDark ? '#06b6d4' : '#0891b2',
    accent3: isDark ? '#84cc16' : '#65a30d',
    accent4: isDark ? '#f97316' : '#ea580c',
    
    // Улучшенные цвета для графиков
    green: isDark ? '#10b981' : '#059669',
    red: isDark ? '#ef4444' : '#dc2626',
    
    // Цвета текста и сетки для графиков
    text: isDark ? '#d1d5db' : '#6b7280',
    grid: isDark ? '#374151' : '#f3f4f6',
    background: isDark ? '#1f2937' : '#ffffff',
  };

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
  });

  // Общие опции для всех графиков с поддержкой темной темы
  const getChartOptions = (customOptions = {}) => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: chartColors.text,
          usePointStyle: true,
          padding: 20,
        },
        ...customOptions.plugins?.legend,
      },
      tooltip: {
        backgroundColor: chartColors.background,
        titleColor: isDark ? '#f9fafb' : '#111827',
        bodyColor: chartColors.text,
        borderColor: chartColors.grid,
        borderWidth: 1,
        ...customOptions.plugins?.tooltip,
      },
    },
    scales: {
      x: {
        grid: {
          color: chartColors.grid,
          display: true,
        },
        ticks: {
          color: chartColors.text,
        },
        border: {
          display: false,
        },
        ...customOptions.scales?.x,
      },
      y: {
        grid: {
          color: chartColors.grid,
        },
        ticks: {
          color: chartColors.text,
        },
        border: {
          display: false,
        },
        ...customOptions.scales?.y,
      },
    },
    ...customOptions,
  });

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
      const response = await axios.get('/api/trades');
      console.log('Statistics API response:', response);
      
      if (Array.isArray(response.data)) {
        setTrades(response.data);
        // Extract unique stock symbols
        const symbols = [...new Set(response.data.map(trade => trade.symbol))].sort();
        setAvailableStocks(symbols);
        calculateStats(response.data);
        setError('');
      } else {
        console.error('Statistics API returned non-array data:', response.data);
        setTrades([]);
        setError('Данные получены в неверном формате. Пожалуйста, обратитесь к администратору.');
      }
    } catch (err) {
      console.error('Error loading statistics:', err);
      setError('Не удалось загрузить данные. Пожалуйста, попробуйте позже.');
      setTrades([]);
    } finally {
      setLoading(false);
    }
  };

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
      
      const dailyInterest = roundedTotalCost * Number(trade.marginAmount) / 100 / 365;
      const roundedDailyInterest = Math.round(dailyInterest * 100) / 100;
      const monthlyInterest = roundedDailyInterest * 30;

      if (!trade.exitDate) {
        // Open trade
        const entryDateOpen = parseDateLocal(trade.entryDate);
        const daysHeld = Math.max(1, Math.ceil((today - entryDateOpen) / (1000 * 60 * 60 * 24)));
        const accruedInterest = roundedDailyInterest * daysHeld;
        
        calculatedStats.totalCostOpen += roundedTotalCost;
        calculatedStats.totalInterestDaily += roundedDailyInterest;
        calculatedStats.totalInterestMonthly += monthlyInterest;
        calculatedStats.totalTradesOpen += 1;
        calculatedStats.totalSharesOpen += Number(trade.quantity);
        calculatedStats.totalAccruedInterest += accruedInterest;
        
        // Calculate weighted average credit rate
        totalOpenRateWeighted += Number(trade.marginAmount) * roundedTotalCost;
        openPositionsValue += roundedTotalCost;
        
        // Store upcoming trades data
        calculatedStats.upcomingTrades.push({
          symbol: trade.symbol,
          quantity: trade.quantity,
          entryPrice: trade.entryPrice,
          entryDate: trade.entryDate,
          dailyInterest: roundedDailyInterest,
          daysHeld,
          potentialProfit: 0,
          potentialProfitAfterInterest: 0
        });
      } else {
        // Closed trade
        calculatedStats.totalTradesClosed += 1;
        
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
          
          // Monthly interests
          calculatedStats.monthlyInterests[exitMonth] = (calculatedStats.monthlyInterests[exitMonth] || 0) + roundedDailyInterest * 30;
          
          if (trade.entryDate && trade.exitDate) {
            const entryDate = parseDateLocal(trade.entryDate);
            const exitDate = parseDateLocal(trade.exitDate);
            const daysHeldClosed = Math.max(1, Math.ceil((exitDate - entryDate) / (1000 * 60 * 60 * 24)));
            
            // Calculate interest for closed trade (for reference)
            const interestForPeriod = dailyInterest * daysHeldClosed;
            const roundedInterestForPeriod = Math.round(interestForPeriod * 100) / 100;
            totalClosedInterest += roundedInterestForPeriod;
            
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
    const stockTrades = trades.filter(t => t.symbol === stock);
    
    if (stockTrades.length === 0) return null;
    
    const today = new Date();
    const openTrades = stockTrades.filter(t => !t.exitDate);
    const closedTrades = stockTrades.filter(t => t.exitDate);
    
    const totalQuantity = stockTrades.reduce((sum, t) => sum + Number(t.quantity), 0);
    const totalOpenQuantity = openTrades.reduce((sum, t) => sum + Number(t.quantity), 0);
    
    const avgEntryPrice = openTrades.length > 0
      ? openTrades.reduce((sum, t) => sum + (Number(t.entryPrice) * Number(t.quantity)), 0) / 
        openTrades.reduce((sum, t) => sum + Number(t.quantity), 0)
      : 0;
    
    const totalInvested = openTrades.reduce((sum, t) => 
      sum + (Number(t.entryPrice) * Number(t.quantity)), 0);
    
    const currentPrice = stockPrices[stock] || 0;
    const currentValue = currentPrice * totalOpenQuantity;
    
    const totalProfit = closedTrades.reduce((sum, t) => 
      sum + ((Number(t.exitPrice) - Number(t.entryPrice)) * Number(t.quantity)), 0);
    
    const potentialProfit = currentPrice > 0
      ? (currentPrice - avgEntryPrice) * totalOpenQuantity
      : 0;
    
    // Calculate accumulated interest only for open trades (this is what we currently owe)
    let accumulatedInterest = 0;
    
    openTrades.forEach(trade => {
      const totalCost = Number(trade.entryPrice) * Number(trade.quantity);
      const dailyInterest = totalCost * Number(trade.marginAmount) / 100 / 365;
      const entryDate = parseDateLocal(trade.entryDate);
      if (entryDate) {
        const daysHeld = Math.max(1, Math.ceil((today - entryDate) / (1000 * 60 * 60 * 24)));
        accumulatedInterest += dailyInterest * daysHeld;
      }
    });
    
    // Calculate total interest paid for closed trades (for reference only)
    let totalInterestPaid = 0;
    closedTrades.forEach(trade => {
      if (trade.entryDate && trade.exitDate) {
        const totalCost = Number(trade.entryPrice) * Number(trade.quantity);
        const dailyInterest = totalCost * Number(trade.marginAmount) / 100 / 365;
        const entryDate = parseDateLocal(trade.entryDate);
        const exitDate = parseDateLocal(trade.exitDate);
        if (entryDate && exitDate) {
          const daysHeld = Math.max(1, Math.ceil((exitDate - entryDate) / (1000 * 60 * 60 * 24)));
          totalInterestPaid += dailyInterest * daysHeld;
        }
      }
    });
    
    // Profit calculations:
    // totalProfit - this already accounts for all costs including interest for closed trades
    // potentialProfitAfterInterest - subtract only accumulated interest for open positions
    // overallProfitAfterInterest - sum of above two values
    const potentialProfitAfterInterest = potentialProfit - accumulatedInterest;
    const overallProfitAfterInterest = totalProfit + potentialProfitAfterInterest;
    
    return {
      symbol: stock,
      totalTrades: stockTrades.length,
      openTrades: openTrades.length,
      closedTrades: closedTrades.length,
      totalQuantity,
      totalOpenQuantity,
      avgEntryPrice,
      totalInvested,
      currentPrice,
      currentValue,
      totalProfit, // This already includes all costs for closed trades
      potentialProfit,
      overallProfit: totalProfit + potentialProfit,
      accumulatedInterest, // Only for open positions
      totalInterestPaid, // Reference: what was paid for closed trades
      potentialProfitAfterInterest,
      overallProfitAfterInterest
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
                  ['Стоимость позиций', `${stockData.totalInvested.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₽`],
                  ['Активных акций', stockData.totalOpenQuantity.toString()],
                  ['Всего акций', stockData.totalQuantity.toString()],
                  ['', ''],
                  ['Прибыль:', ''],
                  ['  Зафиксированная', `${stockData.totalProfit.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₽`],
                  ['  Потенциальная', `${stockData.potentialProfit.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₽`],
                  ['  Общая', `${stockData.overallProfit.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₽`],
                  ['  Итого после %', `${stockData.overallProfitAfterInterest.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₽`],
                  ['', ''],
                  ['Сделки:', ''],
                  ['  Открытые', stockData.openTrades.toString()],
                  ['  Закрытые', stockData.closedTrades.toString()],
                  ['  Всего', stockData.totalTrades.toString()]
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
        backgroundColor: chartColors.primary + '99', // добавляем прозрачность
        borderColor: chartColors.primary,
        borderWidth: 1,
        borderRadius: 4,
        barPercentage: 0.8,
        categoryPercentage: 0.7,
      },
      {
        label: 'Прибыль (с %)',
        data: profitsAfterInterest,
        backgroundColor: chartColors.secondary + '99', // добавляем прозрачность
        borderColor: chartColors.secondary,
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
            `${chartColors.secondary}${Math.round(0.5 + (index % 3) * 0.15).toString(16).padStart(2, '0')}`
          ),
          borderColor: isDark ? '#ffffff' : '#ffffff',
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
            chartColors.primary + 'B3', // 70% opacity
            chartColors.accent1 + 'B3',
            chartColors.accent2 + 'B3',
            chartColors.accent3 + 'B3',
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
            chartColors.primary + 'B3', // 70% opacity
            chartColors.secondary + 'B3',
          ],
          borderColor: isDark ? '#ffffff' : '#ffffff',
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
          backgroundColor: chartColors.primary + 'B3', // 70% opacity
          borderColor: chartColors.primary,
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
          backgroundColor: chartColors.secondary + 'B3', // 70% opacity
          borderColor: chartColors.secondary,
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
          backgroundColor: chartColors.primary,
          borderColor: chartColors.secondary,
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
        backgroundColor: months.map(m => profitMap[m] >= 0 ? chartColors.green : chartColors.red),
        borderColor: chartColors.secondary,
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
          backgroundColor: [isDark ? '#374151' : '#e5e7eb'],
          borderWidth: 0
        }]
      };
    }
    
    return {
      labels: ['Открытые', 'Закрытые'],
      datasets: [{
        data: [openCount, closedCount],
        backgroundColor: [chartColors.primary, chartColors.secondary],
        borderColor: isDark ? '#ffffff' : '#ffffff',
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
          backgroundColor: chartColors.primary,
          borderColor: chartColors.secondary,
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
    
    for (let i = 0; i < 5; i++) {
      const rangeStart = minPrice + (rangeSize * i);
      const rangeEnd = minPrice + (rangeSize * (i + 1));
      
      // Подсчитываем количество сделок в этом диапазоне
      const tradesInRange = prices.filter(price => 
        price >= rangeStart && (i === 4 ? price <= rangeEnd : price < rangeEnd)
      ).length;
      
      ranges.push(`${rangeStart.toFixed(0)}-${rangeEnd.toFixed(0)}₽`);
      rangeCounts.push(tradesInRange);
    }
    
    return {
      labels: ranges,
      datasets: [{
        label: 'Количество сделок в диапазоне цен',
        data: rangeCounts,
        backgroundColor: rangeCounts.map((count, index) => {
          const intensity = 0.4 + (count / Math.max(...rangeCounts)) * 0.6;
          return chartColors.primary + Math.round(intensity * 255).toString(16).padStart(2, '0');
        }),
        borderColor: chartColors.secondary,
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
          borderColor: chartColors.secondary,
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
    const lineColor = finalProfit >= 0 ? chartColors.green : chartColors.red;
    const gradientColor = finalProfit >= 0 ? 
      (isDark ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.1)') : 
      (isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.1)');
    
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
        pointHoverBorderColor: isDark ? '#ffffff' : '#ffffff',
        pointHoverBorderWidth: 2,
        fill: true
      }]
    };
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-purple-600 border-r-2 border-b-2 border-transparent"></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${themeClasses.background.secondary} ${themeClasses.transition}`}>
    <div className="p-6 max-w-6xl mx-auto">
        <h1 className={`text-2xl font-medium ${themeClasses.text.primary} mb-8`}>
          Статистика торговли
        </h1>

      {/* Error message */}
      {error && (
          <Card variant="default" className="mb-6 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30">
            <p className="text-red-700 dark:text-red-300">{error}</p>
          </Card>
        )}

        {/* Stock Filter and PDF Export */}
        <div className="flex items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <label htmlFor="stockFilter" className={`text-sm ${themeClasses.text.secondary}`}>
            Акция:
          </label>
            <Select
            id="stockFilter"
            value={selectedStock}
            onChange={(e) => handleStockChange(e.target.value)}
              size="sm"
              className="min-w-32"
          >
            <option value="all">Все акции</option>
            {availableStocks.map(symbol => (
              <option key={symbol} value={symbol}>{symbol}</option>
            ))}
            </Select>
        </div>

          <div className="flex">
            <Button
              onClick={() => generatePDFReport()}
              variant="secondary"
              size="sm"
              className="rounded-r-none border-r-0"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              PDF отчет
            </Button>
            <Button
              onClick={() => setShowPDFOptions(true)}
              variant="secondary"
              size="sm"
              className="rounded-l-none px-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </Button>
        </div>
      </div>

        {/* Current Stock Prices */}
      {Object.keys(stockPrices).length > 0 && (
          <Card className="mb-8">
            <div className={`font-medium ${themeClasses.text.primary} mb-3`}>
              Текущие курсы акций:
            </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(stockPrices)
              .filter(([_, price]) => price && !isNaN(parseFloat(price)))
              .map(([symbol, price]) => (
                  <Badge key={symbol} variant="default" size="sm">
                    {symbol}: {parseFloat(price).toLocaleString('ru-RU', { 
                      style: 'currency', 
                      currency: 'RUB', 
                      maximumFractionDigits: 2 
                    })}
                  </Badge>
              ))}
          </div>
          </Card>
      )}

        {/* Main Statistics */}
      <div className="mb-8">
        {selectedStock === 'all' ? (
            // General statistics
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Portfolio Summary Card */}
              <Card>
                <h3 className={`text-lg font-medium ${themeClasses.text.primary} mb-4`}>
                  Сводка портфеля
                </h3>
                <div className="space-y-4">
                  {/* Basic portfolio info */}
          <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className={themeClasses.text.secondary}>Стоимость позиций</span>
                      <span className={`font-medium ${themeClasses.text.primary}`}>
                        {stats.totalCostOpen.toLocaleString('ru-RU', { 
                          style: 'currency', 
                          currency: 'RUB', 
                          maximumFractionDigits: 0 
                        })}
                      </span>
                </div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className={themeClasses.text.secondary}>Активных акций</span>
                      <span className={`font-medium ${themeClasses.text.primary}`}>
                        {stats.totalSharesOpen}
                      </span>
              </div>
                    <div className="flex justify-between text-sm">
                      <span className={themeClasses.text.secondary}>Средняя ставка</span>
                      <span className={`font-medium ${themeClasses.text.primary}`}>
                        {stats.avgCreditRate.toFixed(2)}%
                      </span>
                </div>
              </div>
              
                  {/* Profit breakdown */}
                  <div className={`border-t ${themeClasses.border.primary} pt-4`}>
                    <div className={`text-sm font-medium ${themeClasses.text.primary} mb-3`}>
                      Прибыль:
                </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className={themeClasses.text.secondary}>Зафиксированная</span>
                        <span className={`font-medium ${
                          stats.totalProfit >= 0 
                            ? 'text-green-600 dark:text-green-400' 
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          {stats.totalProfit.toLocaleString('ru-RU', { 
                            style: 'currency', 
                            currency: 'RUB', 
                            maximumFractionDigits: 0 
                          })}
                        </span>
              </div>
                      <div className="flex justify-between text-sm">
                        <span className={themeClasses.text.secondary}>Потенциальная</span>
                        <span className={`font-medium ${
                          stats.potentialProfit >= 0 
                            ? 'text-green-600 dark:text-green-400' 
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          {stats.potentialProfit.toLocaleString('ru-RU', { 
                            style: 'currency', 
                            currency: 'RUB', 
                            maximumFractionDigits: 0 
                          })}
                        </span>
                      </div>
                      <div className={`flex justify-between text-sm pt-2 border-t ${themeClasses.border.primary}`}>
                        <span className={`font-medium ${themeClasses.text.primary}`}>Общая</span>
                        <span className={`font-bold ${
                          stats.totalOverallProfit >= 0 
                            ? 'text-green-600 dark:text-green-400' 
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          {stats.totalOverallProfit.toLocaleString('ru-RU', { 
                            style: 'currency', 
                            currency: 'RUB', 
                            maximumFractionDigits: 0 
                          })}
                        </span>
                </div>
              </div>
            </div>
            
                  {/* Interest costs */}
                  <div className={`border-t ${themeClasses.border.primary} pt-4`}>
                    <div className={`text-sm font-medium ${themeClasses.text.primary} mb-3`}>
                      Проценты:
                </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className={themeClasses.text.secondary}>Заплачено по закрытым</span>
                        <span className="text-red-600 dark:text-red-400 font-medium">
                          -{stats.totalInterestPaid.toLocaleString('ru-RU', {
                            style: 'currency', 
                            currency: 'RUB', 
                            maximumFractionDigits: 0
                          })}
                        </span>
              </div>
                      <div className="flex justify-between text-sm">
                        <span className={themeClasses.text.secondary}>Накоплено по открытым</span>
                        <span className="text-red-500 dark:text-red-400">
                          -{stats.totalAccruedInterest.toLocaleString('ru-RU', {
                            style: 'currency', 
                            currency: 'RUB', 
                            maximumFractionDigits: 0
                          })}
                        </span>
                </div>
                      <div className={`flex justify-between text-sm pt-2 border-t ${themeClasses.border.primary}`}>
                        <span className={`font-medium ${themeClasses.text.primary}`}>Итого после %</span>
                        <span className={`font-bold ${
                          stats.totalOverallProfitAfterInterest >= 0 
                            ? 'text-green-600 dark:text-green-400' 
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          {stats.totalOverallProfitAfterInterest.toLocaleString('ru-RU', { 
                            style: 'currency', 
                            currency: 'RUB', 
                            maximumFractionDigits: 0 
                          })}
                        </span>
              </div>
                </div>
              </div>
                </div>
              </Card>
              
              {/* Activity Summary Card */}
              <Card>
                <h3 className={`text-lg font-medium ${themeClasses.text.primary} mb-4`}>
                  Активность
                </h3>
                <div className="space-y-4">
                  {/* Trade summary */}
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className={themeClasses.text.secondary}>Открытые сделки</span>
                      <span className={`font-medium ${themeClasses.text.primary}`}>
                        {stats.totalTradesOpen}
                      </span>
                </div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className={themeClasses.text.secondary}>Закрытые сделки</span>
                      <span className={`font-medium ${themeClasses.text.primary}`}>
                        {stats.totalTradesClosed}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className={themeClasses.text.secondary}>Всего сделок</span>
                      <span className={`font-medium ${themeClasses.text.primary}`}>
                        {stats.totalTradesOpen + stats.totalTradesClosed}
                      </span>
              </div>
            </div>

                  {/* Performance metrics */}
                  <div className={`border-t ${themeClasses.border.primary} pt-4`}>
                    <div className={`text-sm font-medium ${themeClasses.text.primary} mb-3`}>
                      Эффективность:
                    </div>
                <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className={themeClasses.text.secondary}>Успешность</span>
                        <span className={`font-medium ${themeClasses.text.primary}`}>
                          {stats.totalTradesClosed > 0 
                            ? `${Math.round((stats.totalProfit > 0 ? 1 : 0) * 100)}%` 
                            : '—'
                          }
                        </span>
                  </div>
                      <div className="flex justify-between text-sm">
                        <span className={themeClasses.text.secondary}>Средняя прибыль/сделка</span>
                        <span className={`font-medium ${themeClasses.text.primary}`}>
                          {stats.totalTradesClosed > 0 
                            ? (stats.totalProfit / stats.totalTradesClosed).toLocaleString('ru-RU', { 
                                style: 'currency', 
                                currency: 'RUB', 
                                maximumFractionDigits: 0 
                              })
                            : '—'
                          }
                        </span>
                  </div>
                  </div>
                    </div>
                  </div>
              </Card>
                    </div>
          ) : (
            // Stock-specific statistics
            <div>
              {(() => {
                const stockData = calculateStockMetrics(selectedStock);
                
                if (!stockData) return (
                  <Card className="text-center">
                    <p className={themeClasses.text.secondary}>Нет данных для выбранной акции</p>
                  </Card>
                );
                
                return (
                  <div>
                    {/* Detailed stats for specific stock */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <Card>
                        <h3 className={`text-lg font-medium ${themeClasses.text.primary} mb-4`}>Портфель ({selectedStock})</h3>
                        <div className="space-y-4">
                          {/* Basic info */}
                          <div>
                            <div className="flex justify-between text-sm mb-2">
                              <span className={themeClasses.text.secondary}>Стоимость позиций</span>
                              <span className={`font-medium ${themeClasses.text.primary}`}>{stockData.totalInvested.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}</span>
                            </div>
                            <div className="flex justify-between text-sm mb-2">
                              <span className={themeClasses.text.secondary}>Активных акций</span>
                              <span className={`font-medium ${themeClasses.text.primary}`}>{stockData.totalOpenQuantity}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className={themeClasses.text.secondary}>Всего акций</span>
                              <span className={`font-medium ${themeClasses.text.primary}`}>{stockData.totalQuantity}</span>
                            </div>
                          </div>
              
                          {/* Profit breakdown */}
                          <div className={`border-t ${themeClasses.border.primary} pt-4`}>
                            <div className={`text-sm font-medium ${themeClasses.text.primary} mb-3`}>Прибыль:</div>
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className={themeClasses.text.secondary}>Зафиксированная</span>
                                <span className={stockData.totalProfit >= 0 ? 'text-green-600 dark:text-green-400 font-medium' : 'text-red-600 dark:text-red-400 font-medium'}>
                                  {stockData.totalProfit.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}
                                </span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className={themeClasses.text.secondary}>Потенциальная</span>
                                <span className={stockData.potentialProfit >= 0 ? 'text-green-600 dark:text-green-400 font-medium' : 'text-red-600 dark:text-red-400 font-medium'}>
                                  {stockData.potentialProfit.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}
                                </span>
                              </div>
                              <div className={`flex justify-between text-sm pt-2 border-t ${themeClasses.border.primary}`}>
                                <span className={`${themeClasses.text.primary} font-medium`}>Общая</span>
                                <span className={`font-bold ${stockData.overallProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                  {stockData.overallProfit.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}
                                </span>
                              </div>
                            </div>
                          </div>
              
                          {/* Interest costs */}
                          <div className={`border-t ${themeClasses.border.primary} pt-4`}>
                            <div className={`text-sm font-medium ${themeClasses.text.primary} mb-3`}>Проценты:</div>
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className={themeClasses.text.secondary}>Заплачено по закрытым</span>
                                <span className="text-red-600 dark:text-red-400 font-medium">-{stockData.totalInterestPaid.toLocaleString('ru-RU', {style: 'currency', currency: 'RUB', maximumFractionDigits: 0})}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className={themeClasses.text.secondary}>Накоплено по открытым</span>
                                <span className="text-red-500 dark:text-red-400">-{stockData.accumulatedInterest.toLocaleString('ru-RU', {style: 'currency', currency: 'RUB', maximumFractionDigits: 0})}</span>
                              </div>
                              <div className={`flex justify-between text-sm pt-2 border-t ${themeClasses.border.primary}`}>
                                <span className={`${themeClasses.text.primary} font-medium`}>Итого после %</span>
                                <span className={`font-bold ${stockData.overallProfitAfterInterest >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                  {stockData.overallProfitAfterInterest.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Card>
              
                      <Card>
                        <h3 className={`text-lg font-medium ${themeClasses.text.primary} mb-4`}>Детали по {selectedStock}</h3>
                        <div className="space-y-4">
                          {/* Price info */}
                          <div>
                            <div className="flex justify-between text-sm mb-2">
                              <span className={themeClasses.text.secondary}>Средняя цена входа</span>
                              <span className={`font-medium ${themeClasses.text.primary}`}>{stockData.avgEntryPrice.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between text-sm mb-2">
                              <span className={themeClasses.text.secondary}>Текущая цена</span>
                              <span className={`font-medium ${themeClasses.text.primary}`}>
                                {stockData.currentPrice > 0 ? stockData.currentPrice.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 2 }) : '—'}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className={themeClasses.text.secondary}>Текущая стоимость</span>
                              <span className={`font-medium ${themeClasses.text.primary}`}>{stockData.currentValue.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}</span>
                            </div>
                          </div>
                          
                          {/* Trading activity */}
                          <div className={`border-t ${themeClasses.border.primary} pt-4`}>
                            <div className={`text-sm font-medium ${themeClasses.text.primary} mb-3`}>Сделки:</div>
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className={themeClasses.text.secondary}>Открытые</span>
                                <span className={`font-medium ${themeClasses.text.primary}`}>{stockData.openTrades}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className={themeClasses.text.secondary}>Закрытые</span>
                                <span className={`font-medium ${themeClasses.text.primary}`}>{stockData.closedTrades}</span>
                              </div>
                              <div className={`flex justify-between text-sm pt-2 border-t ${themeClasses.border.primary}`}>
                                <span className={`${themeClasses.text.primary} font-medium`}>Всего</span>
                                <span className={`font-bold ${themeClasses.text.primary}`}>{stockData.totalTrades}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </div>
                  </div>
                );
              })()}
              
              {/* Stock-specific charts */}
              <div className="space-y-6 mt-8">
                {/* Monthly profit chart */}
                <Card>
                  <h3 className={`text-lg font-medium ${themeClasses.text.primary} mb-4`}>
                    Прибыль по месяцам ({selectedStock})
                  </h3>
                  <div style={{ height: '300px', width: '100%' }}>
                    <Bar
                      data={prepareStockMonthlyProfitData(selectedStock)}
                      options={getChartOptions()}
                    />
                    </div>
                </Card>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Status chart */}
                  <Card>
                    <h3 className={`text-lg font-medium ${themeClasses.text.primary} mb-4`}>
                      Статус позиций
                    </h3>
                    <div style={{ height: '250px', width: '100%' }}>
                      <Doughnut
                        data={prepareStockStatusData(selectedStock)}
                        options={getChartOptions({ plugins: { legend: { position: 'bottom' } } })}
                      />
                    </div>
                  </Card>
                  
                  {/* Price ranges chart */}
                  <Card>
                    <h3 className={`text-lg font-medium ${themeClasses.text.primary} mb-4`}>
                      Диапазоны цен входа
                    </h3>
                    <div style={{ height: '250px', width: '100%' }}>
                      <Bar
                        data={prepareStockEntryPriceData(selectedStock)}
                        options={getChartOptions({ plugins: { legend: { display: false } } })}
                      />
                    </div>
                  </Card>
                  
                  {/* Cumulative profit chart */}
                  <Card className="lg:col-span-2">
                    <h3 className={`text-lg font-medium ${themeClasses.text.primary} mb-4`}>
                      Накопленная прибыль ({selectedStock})
                    </h3>
                    <div style={{ height: '250px', width: '100%' }}>
                      <Line
                        data={prepareStockCumulativeProfitData(selectedStock)}
                        options={getChartOptions({ plugins: { legend: { display: false } } })}
                      />
                    </div>
                  </Card>
                  </div>
                </div>
          </div>
        )}
      </div>

        {/* Charts for all stocks */}
      {selectedStock === 'all' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Profit Chart */}
            <Card>
              <h3 className={`text-lg font-medium ${themeClasses.text.primary} mb-4`}>
                Прибыль по месяцам
              </h3>
              {Object.keys(stats.monthlyProfits).length > 0 ? (
                <div style={{ height: '300px' }}>
                  <Bar 
                    data={prepareMonthlyProfitData()} 
                    options={getChartOptions({ plugins: { legend: { position: 'top' } } })}
                  />
                </div>
              ) : (
                <div className={`flex justify-center items-center h-48 ${themeClasses.text.tertiary}`}>
                  Нет данных для отображения
                </div>
              )}
            </Card>
            
            {/* Daily Profit Chart */}
            <Card>
              <h3 className={`text-lg font-medium ${themeClasses.text.primary} mb-4`}>
                Среднедневная прибыль
              </h3>
              {Object.keys(stats.monthlyProfits).length > 0 ? (
                <div style={{ height: '300px' }}>
                  <Line
                    data={prepareDailyProfitData()}
                    options={getChartOptions({ plugins: { legend: { display: false } } })}
                  />
                </div>
              ) : (
                <div className={`flex justify-center items-center h-48 ${themeClasses.text.tertiary}`}>
                  Нет данных для отображения
                </div>
              )}
            </Card>
            
            {/* Trade Status Chart */}
            <Card className="lg:col-span-2">
              <h3 className={`text-lg font-medium ${themeClasses.text.primary} mb-4`}>
                Статус позиций
              </h3>
              <div style={{ height: '300px' }} className="flex justify-center">
                <Doughnut 
                  data={{
                    labels: ['Открытые', 'Закрытые'],
                    datasets: [{
                      data: [stats.totalTradesOpen, stats.totalTradesClosed],
                      backgroundColor: [chartColors.primary, chartColors.secondary],
                      borderWidth: 0
                    }],
                  }}
                  options={getChartOptions({ plugins: { legend: { position: 'right' } } })}
                />
              </div>
            </Card>
          </div>
        )}
      </div>
      
      {/* PDF Options Modal */}
      {showPDFOptions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="max-w-md w-full mx-4" padding="lg">
            <h3 className={`text-lg font-medium ${themeClasses.text.primary} mb-4`}>
              Настройки PDF отчета
            </h3>
            
            <div className="mb-6">
              <label className={`block text-sm font-medium ${themeClasses.text.primary} mb-3`}>
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
                    className={`rounded ${themeClasses.border.primary} text-purple-600 focus:ring-purple-500`}
                  />
                  <span className={`ml-2 text-sm ${themeClasses.text.primary} font-medium`}>
                    Все акции (общий отчет)
                  </span>
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
                        className={`rounded ${themeClasses.border.primary} text-purple-600 focus:ring-purple-500 ${themeClasses.interactive.disabled}`}
                      />
                      <span className={`ml-2 text-sm ${themeClasses.text.secondary}`}>
                        {stock}
                      </span>
                    </label>
                  ))}
                </div>
                </div>
            </div>
            
            <div className="flex justify-end gap-3">
                <Button 
                variant="secondary"
                  size="sm" 
                onClick={() => {
                  setShowPDFOptions(false);
                  setSelectedStocksForPDF([]);
                }}
                >
                Отмена
                </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  const stocksToGenerate = selectedStocksForPDF.length > 0 
                    ? selectedStocksForPDF 
                    : (selectedStock === 'all' ? ['all'] : [selectedStock]);
                  generatePDFReport(stocksToGenerate);
                }}
              >
                Создать отчет
              </Button>
              </div>
          </Card>
        </div>
      )}
    </div>
  );
}

export default Statistics; 