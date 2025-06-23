import { createContext, useState, useEffect } from 'react';
import axios from 'axios';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // {id, username}
  const [portfolios, setPortfolios] = useState([]);
  const [activePortfolio, setActivePortfolio] = useState(null); // {id, name, type}

  const login = async (username, password) => {
    const res = await axios.post('/auth/login', { username, password });
    setUser({ id: res.data.userId, username });
    await fetchPortfolios(res.data.userId);
  };

  const register = async (username, password) => {
    const res = await axios.post('/auth/register', { username, password });
    setUser({ id: res.data.userId, username });
  };

  const fetchPortfolios = async (userId) => {
    const res = await axios.get('/portfolios', { params: { userId } });
    setPortfolios(res.data);
    if (res.data.length > 0) setActivePortfolio(res.data[0]);
  };

  const createPortfolio = async (name, type) => {
    const res = await axios.post('/portfolios', {
      userId: user.id,
      name,
      type,
    });
    setPortfolios((prev) => [...prev, res.data]);
    setActivePortfolio(res.data);
  };

  // Добавляем interceptor, когда меняется activePortfolio
  useEffect(() => {
    const id = axios.interceptors.request.use((config) => {
      if (activePortfolio) {
        if (!config.params) config.params = {};
        config.params.portfolioId = activePortfolio.id;
      }
      return config;
    });
    return () => axios.interceptors.request.eject(id);
  }, [activePortfolio]);

  const value = {
    user,
    portfolios,
    activePortfolio,
    setActivePortfolio,
    login,
    register,
    createPortfolio,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
} 