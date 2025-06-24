import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { PortfolioProvider } from './contexts/PortfolioContext';
import Landing from './components/Landing';
import Login from './components/Login';
import Register from './components/Register';
import PortfolioSelector from './components/PortfolioSelector';
import MarginTrading from './components/MarginTrading';
import SpotTrading from './components/SpotTrading';
import './index.css';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Загрузка...</p>
        </div>
      </div>
    );
  }
  
  return isAuthenticated ? children : <Navigate to="/login" />;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* Публичные маршруты */}
      <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/portfolios" />} />
      <Route path="/register" element={!isAuthenticated ? <Register /> : <Navigate to="/portfolios" />} />
      
      {/* Защищенные маршруты */}
      <Route path="/portfolios" element={
        <ProtectedRoute>
          <PortfolioProvider>
            <PortfolioSelector />
          </PortfolioProvider>
        </ProtectedRoute>
      } />
      
      <Route path="/margin/*" element={
        <ProtectedRoute>
          <PortfolioProvider>
            <MarginTrading />
          </PortfolioProvider>
        </ProtectedRoute>
      } />
      
      <Route path="/spot/*" element={
        <ProtectedRoute>
          <PortfolioProvider>
            <SpotTrading />
          </PortfolioProvider>
        </ProtectedRoute>
      } />
      
      {/* Переадресация главной страницы */}
      <Route path="/" element={
        isAuthenticated ? <Navigate to="/portfolios" /> : <Landing />
      } />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;
