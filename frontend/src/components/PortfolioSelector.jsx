import { useContext, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext';

export default function PortfolioSelector() {
  const { portfolios, createPortfolio, activePortfolio, setActivePortfolio } = useContext(AuthContext);
  const [name, setName] = useState('');
  const [type, setType] = useState('SPOT');

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name) return;
    await createPortfolio(name, type);
    setName('');
  };

  if (!activePortfolio) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full space-y-6 bg-white p-8 shadow-sm border border-gray-200">
          <h2 className="text-center text-2xl font-bold text-gray-900">Выберите или создайте портфель</h2>
          {portfolios.length > 0 && (
            <select
              className="w-full border border-gray-300 p-2 rounded"
              value=""
              onChange={(e) => {
                const id = Number(e.target.value);
                const p = portfolios.find((x) => x.id === id);
                setActivePortfolio(p);
              }}
            >
              <option value="" disabled>Выберите портфель</option>
              {portfolios.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.type})</option>
              ))}
            </select>
          )}

          <form onSubmit={handleCreate} className="space-y-4">
            <input
              className="w-full border border-gray-300 p-2 rounded"
              placeholder="Название портфеля"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <select
              className="w-full border border-gray-300 p-2 rounded"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="SPOT">Спотовый</option>
              <option value="MARGIN">Маржинальный</option>
            </select>
            <button type="submit" className="w-full bg-[#9333ea] hover:bg-[#7c3aed] text-white p-2 rounded">
              Создать портфель
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Если выбран портфель, ничего не отображаем, маршрут перенаправит
  return null;
} 