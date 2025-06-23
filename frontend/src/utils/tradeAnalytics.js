// Utility functions for trade analytics reused by multiple components
import { differenceInDays, format } from 'date-fns';
import { ru } from 'date-fns/locale';

// Helper to get applicable rate for a trade on given date considering CB changes
export function getRateForDate(trade, date, rateChanges = []) {
  const tradeDate = new Date(trade.entryDate);
  if (date < tradeDate) return Number(trade.marginAmount);

  const applicable = rateChanges
    .filter(r => new Date(r.date) <= date && new Date(r.date) >= tradeDate)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  return applicable.length > 0 ? applicable[0].rate : Number(trade.marginAmount);
}

// Calculate full analytics for a trade (days, periods, interests)
export function calculateTradeDetails(trade, rateChanges = []) {
  if (!trade) return null;
  const entryDate = new Date(trade.entryDate);
  const today = trade.exitDate ? new Date(trade.exitDate) : new Date();
  const daysHeld = differenceInDays(today, entryDate);

  // Build periods based on rate changes
  const periods = [];
  let currentDate = entryDate;
  let totalInterest = 0;
  let currentRate = Number(trade.marginAmount);

  // Sort changes after entry
  const changes = rateChanges.filter(r => new Date(r.date) >= entryDate).sort((a, b) => new Date(a.date) - new Date(b.date));

  changes.forEach((ch, idx) => {
    const periodEnd = new Date(ch.date);
    if (periodEnd > today) return; // ignore future
    const periodDays = differenceInDays(periodEnd, currentDate);
    if (periodDays > 0) {
      const interest = trade.totalCost * currentRate / 100 / 365 * periodDays;
      periods.push({ startDate: currentDate, endDate: periodEnd, days: periodDays, rate: currentRate, interest, reason: idx === 0 ? 'Исходная ставка' : 'Изменение ЦБ' });
      totalInterest += interest;
      currentDate = periodEnd;
    }
    currentRate = ch.rate;
  });
  // Last period till today
  if (currentDate < today) {
    const periodDays = differenceInDays(today, currentDate);
    const interest = trade.totalCost * currentRate / 100 / 365 * periodDays;
    periods.push({ startDate: currentDate, endDate: today, days: periodDays, rate: currentRate, interest, reason: 'Текущая ставка' });
    totalInterest += interest;
  }

  // Savings: difference between first rate and actual changes
  const baselineInterest = trade.totalCost * Number(trade.marginAmount) / 100 / 365 * daysHeld;
  const savingsFromRateChanges = baselineInterest - totalInterest;

  return { trade, daysHeld, currentRate, totalInterest, savingsFromRateChanges, periods };
}

// Chart helpers
export function prepareRateChartData(details) {
  if (!details) return null;
  const labels = details.periods.map(p => format(new Date(p.endDate), 'dd.MM', { locale: ru }));
  const data = details.periods.map(p => p.rate);
  return {
    labels,
    datasets: [
      {
        label: 'Ставка %',
        data,
        borderColor: '#3b82f6',
        tension: 0,
        backgroundColor: 'rgba(59,130,246,0.1)',
        pointRadius: 2,
      },
    ],
  };
}

export function prepareInterestChartData(details) {
  if (!details) return null;
  const first = details.periods[0];
  const restSum = details.periods.slice(1).reduce((s, p) => s + p.interest, 0);
  return {
    labels: [
      `${format(new Date(first.startDate), 'dd.MM', { locale: ru })} - ${format(new Date(first.endDate), 'dd.MM', { locale: ru })}`,
      'Остальные',
    ],
    datasets: [
      {
        label: 'Проценты ₽',
        backgroundColor: ['#ef4444', '#10b981'],
        data: [Math.round(first.interest), Math.round(restSum)],
      },
    ],
  };
} 