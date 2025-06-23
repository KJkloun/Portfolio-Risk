import { Routes, Route } from 'react-router-dom';
import Landing from './components/Landing';
import MarginTrading from './components/MarginTrading';
import SpotTrading from './components/SpotTrading';
import './index.css';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/margin/*" element={<MarginTrading />} />
      <Route path="/spot/*" element={<SpotTrading />} />
    </Routes>
  );
}

export default App;
