import { Routes, Route, Link, NavLink } from 'react-router-dom';
import { useState } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import ThemeSwitcher from './components/ThemeSwitcher';
import LanguageSwitcher from './components/LanguageSwitcher';
import TradeForm from './components/TradeForm';
import TradeList from './components/TradeList';
import BulkImport from './components/BulkImport';
import Statistics from './components/Statistics';
import StockPrices from './components/StockPrices';
import './index.css';

function AppContent() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-900 text-gray-900 dark:text-gray-100 transition-colors duration-300">
      <nav className="bg-white dark:bg-dark-800 border-b border-gray-200 dark:border-dark-700 sticky top-0 z-10 transition-colors duration-300">
        <div className="max-w-6xl mx-auto px-4 py-2 flex justify-between items-center">
          <Link to="/" className="text-xl font-semibold text-gray-900 dark:text-gray-100 hover:text-brand-blue-500 dark:hover:text-brand-blue-400 transition-colors duration-200">
            Portfolio Risk
          </Link>
          
          {/* Desktop Navigation */}
          <div className="hidden sm:flex items-center space-x-6">
            <NavLink to="/" end className={({isActive}) => 
              isActive 
                ? 'nav-link-active' 
                : 'nav-link'
            }>
              Сделки
            </NavLink>
            <NavLink to="/new" className={({isActive}) => 
              isActive 
                ? 'nav-link-active' 
                : 'nav-link'
            }>
              Новая сделка
            </NavLink>
            <NavLink to="/import" className={({isActive}) => 
              isActive 
                ? 'nav-link-active' 
                : 'nav-link'
            }>
              Импорт
            </NavLink>
            <NavLink to="/statistics" className={({isActive}) => 
              isActive 
                ? 'nav-link-active' 
                : 'nav-link'
            }>
              Статистика
            </NavLink>
            <NavLink to="/stock-prices" className={({isActive}) => 
              isActive 
                ? 'nav-link-active' 
                : 'nav-link'
            }>
              Курсы акций
            </NavLink>
          </div>

          {/* Theme and Language Controls */}
          <div className="hidden sm:flex items-center space-x-3">
            <LanguageSwitcher />
            <ThemeSwitcher />
          </div>
          
          {/* Mobile Menu Button */}
          <div className="sm:hidden">
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)} 
              className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 focus:outline-none transition-colors duration-200"
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
        
        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="sm:hidden bg-white dark:bg-dark-800 border-t border-gray-200 dark:border-dark-700 animate-slide-down">
            <div className="px-4 py-2 space-y-1">
              <NavLink to="/" end className={({isActive}) => 
                isActive 
                  ? 'block px-3 py-2 nav-link-active' 
                  : 'block px-3 py-2 nav-link'
              }>
                Сделки
              </NavLink>
              <NavLink to="/new" className={({isActive}) => 
                isActive 
                  ? 'block px-3 py-2 nav-link-active' 
                  : 'block px-3 py-2 nav-link'
              }>
                Новая сделка
              </NavLink>
              <NavLink to="/import" className={({isActive}) => 
                isActive 
                  ? 'block px-3 py-2 nav-link-active' 
                  : 'block px-3 py-2 nav-link'
              }>
                Импорт
              </NavLink>
              <NavLink to="/statistics" className={({isActive}) => 
                isActive 
                  ? 'block px-3 py-2 nav-link-active' 
                  : 'block px-3 py-2 nav-link'
              }>
                Статистика
              </NavLink>
              <NavLink to="/stock-prices" className={({isActive}) => 
                isActive 
                  ? 'block px-3 py-2 nav-link-active' 
                  : 'block px-3 py-2 nav-link'
              }>
                Курсы акций
              </NavLink>
              
              {/* Mobile Theme and Language Controls */}
              <div className="flex items-center justify-between px-3 py-2 border-t border-gray-200 dark:border-dark-700 mt-2 pt-2">
                <LanguageSwitcher />
                <ThemeSwitcher />
              </div>
            </div>
          </div>
        )}
      </nav>

      <main className="py-4 sm:py-6 lg:py-8 px-2 sm:px-4 lg:px-6 w-full animate-fade-in">
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
