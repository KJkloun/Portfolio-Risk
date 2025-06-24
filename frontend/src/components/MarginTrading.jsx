import { Routes, Route, Link, NavLink } from 'react-router-dom';
import { useState } from 'react';
import { usePortfolio } from '../contexts/PortfolioContext';
import TradeForm from './TradeForm';
import TradeList from './TradeList';
import MarginTradeList from './margin/MarginTradeList';
import MarginTradeForm from './margin/MarginTradeForm';
import MarginBulkImport from './margin/MarginBulkImport';
import BulkImport from './BulkImport';
import Statistics from './Statistics';
import StockPrices from './StockPrices';
import FloatingRateCalculator from './FloatingRateCalculator';
import TradeDetails from './TradeDetails';

// Главная страница маржинальной торговли
function MarginHome() {
  const { currentPortfolio } = usePortfolio();
  
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
          <h3 className="text-2xl font-light text-gray-800 mb-2">Маржинальная торговля</h3>
          <p className="text-gray-500">Управление маржинальными позициями ({currentPortfolio?.currency || 'RUB'})</p>
        </div>

        {/* Action Cards */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link 
            to="/margin/new"
            className="group block p-8 bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border-0 hover:shadow-md transition-all duration-300"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <div>
                  <h6 className="text-lg font-medium text-gray-700">Новая сделка</h6>
                  <p className="text-sm text-gray-400">Добавить маржинальную позицию</p>
                </div>
              </div>
              <svg className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>

          <Link 
            to="/margin/import"
            className="group block p-8 bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border-0 hover:shadow-md transition-all duration-300"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                  </svg>
                </div>
                <div>
                  <h6 className="text-lg font-medium text-gray-700">Импорт сделок</h6>
                  <p className="text-sm text-gray-400">Загрузить из файла</p>
                </div>
              </div>
              <svg className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        </div>

        {/* Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link 
            to="/margin/statistics"
            className="group block p-6 bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border-0 hover:shadow-md transition-all duration-300"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h6 className="text-sm font-medium text-gray-700">Статистика</h6>
                <p className="text-xs text-gray-400">Анализ сделок</p>
              </div>
            </div>
          </Link>

          <Link 
            to="/margin/stock-prices"
            className="group block p-6 bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border-0 hover:shadow-md transition-all duration-300"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div>
                <h6 className="text-sm font-medium text-gray-700">Курсы акций</h6>
                <p className="text-xs text-gray-400">Текущие цены</p>
              </div>
            </div>
          </Link>

          <Link 
            to="/margin/floating-rates"
            className="group block p-6 bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border-0 hover:shadow-md transition-all duration-300"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div>
                <h6 className="text-sm font-medium text-gray-700">Ставки ЦБ РФ</h6>
                <p className="text-xs text-gray-400">Процентные ставки</p>
              </div>
            </div>
          </Link>

          <Link 
            to="/margin/trades"
            className="group block p-6 bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border-0 hover:shadow-md transition-all duration-300"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <h6 className="text-sm font-medium text-gray-700">Все сделки</h6>
                <p className="text-xs text-gray-400">История операций</p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

function MarginTrading() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white text-gray-900">
      <nav className="bg-white/70 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-2 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div className="text-xl font-light text-gray-800">Маржинальная торговля</div>
          </div>
          <div className="hidden sm:flex space-x-6">
            <NavLink to="/margin" end className={({isActive}) => 
              isActive 
                ? 'text-gray-800 font-medium' 
                : 'text-gray-500 hover:text-gray-800'
            }>
              Главная
            </NavLink>
            <NavLink to="/margin/new" className={({isActive}) => 
              isActive 
                ? 'text-gray-800 font-medium' 
                : 'text-gray-500 hover:text-gray-800'
            }>
              Новая сделка
            </NavLink>
            <NavLink to="/margin/import" className={({isActive}) => 
              isActive 
                ? 'text-gray-800 font-medium' 
                : 'text-gray-500 hover:text-gray-800'
            }>
              Импорт
            </NavLink>
            <NavLink to="/margin/statistics" className={({isActive}) => 
              isActive 
                ? 'text-gray-800 font-medium' 
                : 'text-gray-500 hover:text-gray-800'
            }>
              Статистика
            </NavLink>
            <NavLink to="/margin/stock-prices" className={({isActive}) => 
              isActive 
                ? 'text-gray-800 font-medium' 
                : 'text-gray-500 hover:text-gray-800'
            }>
              Курсы акций
            </NavLink>
            <NavLink to="/margin/floating-rates" className={({isActive}) => 
              isActive 
                ? 'text-gray-800 font-medium' 
                : 'text-gray-500 hover:text-gray-800'
            }>
              Ставки ЦБ РФ
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
          <div className="sm:hidden bg-white/70 backdrop-blur-sm border-t border-gray-100">
            <div className="px-4 py-2 space-y-1">
              <NavLink to="/margin" end className={({isActive}) => 
                isActive 
                  ? 'block px-3 py-2 text-gray-800 font-medium' 
                  : 'block px-3 py-2 text-gray-500 hover:text-gray-800'
              }>
                Главная
              </NavLink>
              <NavLink to="/margin/new" className={({isActive}) => 
                isActive 
                  ? 'block px-3 py-2 text-gray-800 font-medium' 
                  : 'block px-3 py-2 text-gray-500 hover:text-gray-800'
              }>
                Новая сделка
              </NavLink>
              <NavLink to="/margin/import" className={({isActive}) => 
                isActive 
                  ? 'block px-3 py-2 text-gray-800 font-medium' 
                  : 'block px-3 py-2 text-gray-500 hover:text-gray-800'
              }>
                Импорт
              </NavLink>
              <NavLink to="/margin/statistics" className={({isActive}) => 
                isActive 
                  ? 'block px-3 py-2 text-gray-800 font-medium' 
                  : 'block px-3 py-2 text-gray-500 hover:text-gray-800'
              }>
                Статистика
              </NavLink>
              <NavLink to="/margin/stock-prices" className={({isActive}) => 
                isActive 
                  ? 'block px-3 py-2 text-gray-800 font-medium' 
                  : 'block px-3 py-2 text-gray-500 hover:text-gray-800'
              }>
                Курсы акций
              </NavLink>
              <NavLink to="/margin/floating-rates" className={({isActive}) => 
                isActive 
                  ? 'block px-3 py-2 text-gray-800 font-medium' 
                  : 'block px-3 py-2 text-gray-500 hover:text-gray-800'
              }>
                Ставки ЦБ РФ
              </NavLink>
            </div>
          </div>
        )}
      </nav>

      <main className="py-4 sm:py-6 lg:py-8 px-2 sm:px-4 lg:px-6 w-full">
        <Routes>
          <Route path="/" element={<MarginHome />} />
          <Route path="/trades" element={<MarginTradeList />} />
          <Route path="/new" element={<MarginTradeForm />} />
          <Route path="/import" element={<MarginBulkImport />} />
          <Route path="/statistics" element={<Statistics />} />
          <Route path="/stock-prices" element={<StockPrices />} />
          <Route path="/floating-rates" element={<FloatingRateCalculator />} />
          <Route path="/trade/:id" element={<TradeDetails />} />
        </Routes>
      </main>
    </div>
  );
}

export default MarginTrading; 