import { useState, useCallback } from 'react';
import axios from 'axios';

// Constants
const MAX_TRADES_TO_LOAD = 30;

/**
 * Custom hook for managing trade data operations
 * Handles fetching trades, extended trade information, and bulk operations
 * 
 * @returns {Object} Trade data and management functions
 */
export const useTradeData = () => {
  const [trades, setTrades] = useState([]);
  const [allTradesDetails, setAllTradesDetails] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  /**
   * Fetches all trades from the API
   */
  const fetchTrades = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await axios.get('http://localhost:8081/api/trades');
      setTrades(response.data || []);
    } catch (error) {
      console.error('Error fetching trades:', error);
      setError('Ошибка загрузки сделок');
      setTrades([]);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetches extended information for a specific trade
   * 
   * @param {number} tradeId - The ID of the trade
   * @returns {Object|null} Extended trade information or null if error
   */
  const fetchTradeDetails = useCallback(async (tradeId) => {
    try {
      const response = await axios.get(`http://localhost:8081/api/trades/${tradeId}/extended-info`);
      const data = response.data;
      
      setAllTradesDetails(prev => ({
        ...prev,
        [tradeId]: data
      }));
      
      return data;
    } catch (error) {
      console.warn(`Failed to fetch details for trade ${tradeId}:`, error);
      return null;
    }
  }, []);

  /**
   * Loads basic trade information for multiple trades
   * Limited to MAX_TRADES_TO_LOAD for performance optimization
   * 
   * @param {number[]} tradeIds - Array of trade IDs to load
   */
  const loadBulkTradeDetails = useCallback(async (tradeIds) => {
    const limitedIds = tradeIds.slice(0, MAX_TRADES_TO_LOAD);
    
    try {
      const promises = limitedIds.map(async (id) => {
        try {
          const response = await axios.get(`http://localhost:8081/api/trades/${id}`);
          return { id, data: response.data };
        } catch (error) {
          console.warn(`Failed to fetch basic info for trade ${id}:`, error);
          return { id, data: null };
        }
      });
      
      const results = await Promise.all(promises);
      const tradeMap = {};
      
      results.forEach(({ id, data }) => {
        if (data) {
          tradeMap[id] = data;
        }
      });
      
      setAllTradesDetails(prev => ({ ...prev, ...tradeMap }));
    } catch (error) {
      console.warn('Failed to load bulk trade details:', error);
    }
  }, []);

  /**
   * Clears specific trade details from cache
   * Useful after rate changes to force refresh
   * 
   * @param {number} tradeId - The ID of the trade to clear
   */
  const clearTradeDetails = useCallback((tradeId) => {
    setAllTradesDetails(prev => {
      const newDetails = { ...prev };
      delete newDetails[tradeId];
      return newDetails;
    });
  }, []);

  return {
    trades,
    allTradesDetails,
    loading,
    error,
    fetchTrades,
    fetchTradeDetails,
    loadBulkTradeDetails,
    clearTradeDetails,
    setAllTradesDetails
  };
}; 