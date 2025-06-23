import { Routes, Route, Link, NavLink } from 'react-router-dom';
import { useState } from 'react';
import AllTransactions from './spot/AllTransactions';
import BoughtStocks from './spot/BoughtStocks';
import SoldStocks from './spot/SoldStocks';
import CashMovements from './spot/CashMovements';
import CashAccounting from './spot/CashAccounting';
import StockAccounting from './spot/StockAccounting';
import CurrentProfit from './spot/CurrentProfit';
import DailySummary from './spot/DailySummary';
import TickerDetails from './spot/TickerDetails';
import FifoAnalysis from './spot/FifoAnalysis';

function SpotTrading() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f9f9fa] text-gray-900">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-2 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div className="text-xl font-semibold text-gray-900">Спотовая торговля</div>
          </div>
          <div className="hidden sm:flex space-x-6">
            <NavLink to="/spot" end className={({isActive}) => 
              isActive 
                ? 'text-[#9333ea] font-medium' 
                : 'text-gray-600 hover:text-[#9333ea]'
            }>
              Все сделки
            </NavLink>
            <NavLink to="/spot/fifo-analysis" className={({isActive}) => 
              isActive 
                ? 'text-[#9333ea] font-medium' 
                : 'text-gray-600 hover:text-[#9333ea]'
            }>
              FIFO Анализ
            </NavLink>
            <NavLink to="/spot/stock-accounting" className={({isActive}) => 
              isActive 
                ? 'text-[#9333ea] font-medium' 
                : 'text-gray-600 hover:text-[#9333ea]'
            }>
              Учёт акций
            </NavLink>
            <NavLink to="/spot/cash-accounting" className={({isActive}) => 
              isActive 
                ? 'text-[#9333ea] font-medium' 
                : 'text-gray-600 hover:text-[#9333ea]'
            }>
              Учёт наличных
            </NavLink>
            <NavLink to="/spot/current-profit" className={({isActive}) => 
              isActive 
                ? 'text-[#9333ea] font-medium' 
                : 'text-gray-600 hover:text-[#9333ea]'
            }>
              Текущая прибыль
            </NavLink>
            <NavLink to="/spot/daily-summary" className={({isActive}) => 
              isActive 
                ? 'text-[#9333ea] font-medium' 
                : 'text-gray-600 hover:text-[#9333ea]'
            }>
              Итог на день
            </NavLink>
          </div>
          <div className="sm:hidden">
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 text-gray-600 hover:text-gray-800 focus:outline-none">
              {!isMenuOpen ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </button>
          </div>
        </div>
        {isMenuOpen && (
          <div className="sm:hidden bg-white border-t border-gray-200">
            <div className="px-4 py-2 space-y-1">
              <NavLink to="/spot" end className={({isActive}) => 
                isActive 
                  ? 'block px-3 py-2 text-[#9333ea] font-medium' 
                  : 'block px-3 py-2 text-gray-600 hover:text-[#9333ea]'
              }>
                Все сделки
              </NavLink>
              <NavLink to="/spot/fifo-analysis" className={({isActive}) => 
                isActive 
                  ? 'block px-3 py-2 text-[#9333ea] font-medium' 
                  : 'block px-3 py-2 text-gray-600 hover:text-[#9333ea]'
              }>
                FIFO Анализ
              </NavLink>
              <NavLink to="/spot/stock-accounting" className={({isActive}) => 
                isActive 
                  ? 'block px-3 py-2 text-[#9333ea] font-medium' 
                  : 'block px-3 py-2 text-gray-600 hover:text-[#9333ea]'
              }>
                Учёт акций
              </NavLink>
              <NavLink to="/spot/cash-accounting" className={({isActive}) => 
                isActive 
                  ? 'block px-3 py-2 text-[#9333ea] font-medium' 
                  : 'block px-3 py-2 text-gray-600 hover:text-[#9333ea]'
              }>
                Учёт наличных
              </NavLink>
              <NavLink to="/spot/current-profit" className={({isActive}) => 
                isActive 
                  ? 'block px-3 py-2 text-[#9333ea] font-medium' 
                  : 'block px-3 py-2 text-gray-600 hover:text-[#9333ea]'
              }>
                Текущая прибыль
              </NavLink>
              <NavLink to="/spot/daily-summary" className={({isActive}) => 
                isActive 
                  ? 'block px-3 py-2 text-[#9333ea] font-medium' 
                  : 'block px-3 py-2 text-gray-600 hover:text-[#9333ea]'
              }>
                Итог на день
              </NavLink>
            </div>
          </div>
        )}
      </nav>

      <main className="py-4 sm:py-6 lg:py-8 px-2 sm:px-4 lg:px-6 w-full">
        <Routes>
          <Route path="/" element={<AllTransactions />} />
          <Route path="/fifo-analysis" element={<FifoAnalysis />} />
          <Route path="/bought" element={<BoughtStocks />} />
          <Route path="/sold" element={<SoldStocks />} />
          <Route path="/cash-movements" element={<CashMovements />} />
          <Route path="/cash-accounting" element={<CashAccounting />} />
          <Route path="/stock-accounting" element={<StockAccounting />} />
          <Route path="/current-profit" element={<CurrentProfit />} />
          <Route path="/daily-summary" element={<DailySummary />} />
          <Route path="/ticker/:ticker" element={<TickerDetails />} />
        </Routes>
      </main>
    </div>
  );
}

export default SpotTrading; 