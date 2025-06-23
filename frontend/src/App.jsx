import { Routes, Route } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from './contexts/AuthContext';
import Login from './components/Login';
import PortfolioSelector from './components/PortfolioSelector';
import Landing from './components/Landing';
import MarginTrading from './components/MarginTrading';
import SpotTrading from './components/SpotTrading';
import './index.css';

function App() {
  const { user, activePortfolio } = useContext(AuthContext);

  if (!user) {
    return <Login />;
  }

  if (!activePortfolio) {
    return <PortfolioSelector />;
  }

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/margin/*" element={<MarginTrading />} />
      <Route path="/spot/*" element={<SpotTrading />} />
    </Routes>
  );
}

export default App;
