import { Routes, Route, Link, NavLink } from 'react-router-dom';
import { useState } from 'react';
import TradeForm from './components/TradeForm';
import TradeList from './components/TradeList';
import BulkImport from './components/BulkImport';
import Statistics from './components/Statistics';
import StockPrices from './components/StockPrices';
import { ThemeProvider } from './contexts/ThemeContext';
import ThemeToggle from './components/ThemeToggle';
import './index.css';

function AppContent() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-200">
      <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10 transition-colors duration-200">
        <div className="max-w-6xl mx-auto px-4 py-2 flex justify-between items-center">
          <Link to="/" className="text-xl font-semibold text-gray-900 dark:text-gray-100">Portfolio Risk</Link>
          
          <div className="hidden sm:flex space-x-6">
            <NavLink to="/" end className={({isActive}) => 
              isActive 
                ? 'text-purple-600 dark:text-purple-400 font-medium' 
                : 'text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400'
            }>
              Сделки
            </NavLink>
            <NavLink to="/new" className={({isActive}) => 
              isActive 
                ? 'text-purple-600 dark:text-purple-400 font-medium' 
                : 'text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400'
            }>
              Новая сделка
            </NavLink>
            <NavLink to="/import" className={({isActive}) => 
              isActive 
                ? 'text-purple-600 dark:text-purple-400 font-medium' 
                : 'text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400'
            }>
              Импорт
            </NavLink>
            <NavLink to="/statistics" className={({isActive}) => 
              isActive 
                ? 'text-purple-600 dark:text-purple-400 font-medium' 
                : 'text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400'
            }>
              Статистика
            </NavLink>
            <NavLink to="/stock-prices" className={({isActive}) => 
              isActive 
                ? 'text-purple-600 dark:text-purple-400 font-medium' 
                : 'text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400'
            }>
              Курсы акций
            </NavLink>
          </div>

          <div className="flex items-center space-x-2">
            <ThemeToggle />
            <div className="sm:hidden">
              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)} 
                className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 focus:outline-none"
              >
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
        </div>
        
        {isMenuOpen && (
          <div className="sm:hidden bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 transition-colors duration-200">
            <div className="px-4 py-2 space-y-1">
              <NavLink to="/" end className={({isActive}) => 
                isActive 
                  ? 'block px-3 py-2 text-purple-600 dark:text-purple-400 font-medium' 
                  : 'block px-3 py-2 text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400'
              }>
                Сделки
              </NavLink>
              <NavLink to="/new" className={({isActive}) => 
                isActive 
                  ? 'block px-3 py-2 text-purple-600 dark:text-purple-400 font-medium' 
                  : 'block px-3 py-2 text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400'
              }>
                Новая сделка
              </NavLink>
              <NavLink to="/import" className={({isActive}) => 
                isActive 
                  ? 'block px-3 py-2 text-purple-600 dark:text-purple-400 font-medium' 
                  : 'block px-3 py-2 text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400'
              }>
                Импорт
              </NavLink>
              <NavLink to="/statistics" className={({isActive}) => 
                isActive 
                  ? 'block px-3 py-2 text-purple-600 dark:text-purple-400 font-medium' 
                  : 'block px-3 py-2 text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400'
              }>
                Статистика
              </NavLink>
              <NavLink to="/stock-prices" className={({isActive}) => 
                isActive 
                  ? 'block px-3 py-2 text-purple-600 dark:text-purple-400 font-medium' 
                  : 'block px-3 py-2 text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400'
              }>
                Курсы акций
              </NavLink>
            </div>
          </div>
        )}
      </nav>

      <main className="py-4 sm:py-6 lg:py-8 px-2 sm:px-4 lg:px-6 w-full">
        <Routes>
          <Route path="/" element={<TradeList />} />
          <Route path="/new" element={<TradeForm />} />
          <Route path="/import" element={<BulkImport />} />
          <Route path="/statistics" element={<Statistics />} />
          <Route path="/stock-prices" element={<StockPrices />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
