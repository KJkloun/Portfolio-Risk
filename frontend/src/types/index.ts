export interface Trade {
  id?: number;
  symbol: string;
  entryPrice: number;
  exitPrice?: number;
  quantity: number;
  entryDate: string;
  exitDate?: string;
  notes?: string;
  dailyInterest?: number;
  marginAmount?: number;
}

export interface TradeAnalytics {
  totalProfit: number;
  totalTrades: number;
  openTrades: number;
  closedTrades: number;
  winRate: number;
  averageProfit: number;
  profitBySymbol: Record<string, number>;
  monthlyProfit: Record<string, number>;
}

export interface StockPrice {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  lastUpdate: string;
}

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export type TradeStatus = 'open' | 'closed';

export interface TradeFormData {
  symbol: string;
  entryPrice: string;
  exitPrice?: string;
  quantity: string;
  entryDate: string;
  exitDate?: string;
  notes?: string;
  dailyInterest?: string;
  marginAmount?: string;
} 