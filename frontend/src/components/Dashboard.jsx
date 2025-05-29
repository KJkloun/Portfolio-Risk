import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { format, subMonths } from 'date-fns';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

function Dashboard() {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeRange, setTimeRange] = useState('3M');

  useEffect(() => {
    loadTrades();
  }, []);

  const loadTrades = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/trades');
      setTrades(response.data);
      setError('');
    } catch (err) {
      setError('Failed to load trades. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const calculateProfit = (trade) => {
    return (trade.exitPrice - trade.entryPrice) * trade.quantity;
  };

  const getTimeRangeData = () => {
    const now = new Date();
    let startDate;

    switch (timeRange) {
      case '1M':
        startDate = subMonths(now, 1);
        break;
      case '3M':
        startDate = subMonths(now, 3);
        break;
      case '6M':
        startDate = subMonths(now, 6);
        break;
      case '1Y':
        startDate = subMonths(now, 12);
        break;
      default:
        startDate = subMonths(now, 3);
    }

    return trades.filter(trade => new Date(trade.exitDate) >= startDate);
  };

  const getPerformanceData = () => {
    const filteredTrades = getTimeRangeData();
    const monthlyData = {};

    filteredTrades.forEach(trade => {
      const month = format(new Date(trade.exitDate), 'MMM yyyy');
      const profit = calculateProfit(trade);

      if (!monthlyData[month]) {
        monthlyData[month] = 0;
      }
      monthlyData[month] += profit;
    });

    return Object.entries(monthlyData).map(([month, profit]) => ({
      month,
      profit,
    }));
  };

  const getSymbolDistribution = () => {
    const filteredTrades = getTimeRangeData();
    const symbolData = {};

    filteredTrades.forEach(trade => {
      if (!symbolData[trade.symbol]) {
        symbolData[trade.symbol] = 0;
      }
      symbolData[trade.symbol] += Math.abs(calculateProfit(trade));
    });

    return Object.entries(symbolData)
      .map(([symbol, value]) => ({
        name: symbol,
        value,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  };

  const getSummaryStats = () => {
    const filteredTrades = getTimeRangeData();
    const totalTrades = filteredTrades.length;
    const totalProfit = filteredTrades.reduce((sum, trade) => sum + calculateProfit(trade), 0);
    const winningTrades = filteredTrades.filter(trade => calculateProfit(trade) > 0).length;
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

    return {
      totalTrades,
      totalProfit,
      winRate,
    };
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const summaryStats = getSummaryStats();
  const performanceData = getPerformanceData();
  const symbolDistribution = getSymbolDistribution();

  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-white shadow-md rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Dashboard</h2>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="1M">Last Month</option>
            <option value="3M">Last 3 Months</option>
            <option value="6M">Last 6 Months</option>
            <option value="1Y">Last Year</option>
          </select>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-lg font-medium text-gray-900">Total Trades</h3>
            <p className="mt-2 text-3xl font-bold text-indigo-600">{summaryStats.totalTrades}</p>
          </div>
          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-lg font-medium text-gray-900">Total Profit/Loss</h3>
            <p className={`mt-2 text-3xl font-bold ${summaryStats.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${Math.abs(summaryStats.totalProfit).toFixed(2)}
            </p>
          </div>
          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-lg font-medium text-gray-900">Win Rate</h3>
            <p className="mt-2 text-3xl font-bold text-indigo-600">{summaryStats.winRate.toFixed(1)}%</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Monthly Performance</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="profit"
                    stroke="#8884d8"
                    name="Profit/Loss"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Top Symbols by Profit/Loss</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={symbolDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {symbolDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
      </div>
      </div>
    </div>
  );
}

export default Dashboard;
