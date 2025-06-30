import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { usePortfolio } from '../../contexts/PortfolioContext';
import { formatPortfolioCurrency } from '../../utils/currencyFormatter';

const schema = yup.object().shape({
  symbol: yup.string().required('Это поле обязательно'),
  entryPrice: yup.number().required('Это поле обязательно').positive('Введите положительное число'),
  quantity: yup.number().required('Это поле обязательно').positive('Введите положительное число').integer('Введите целое число'),
  marginAmount: yup.number().required('Это поле обязательно').positive('Введите положительное число').max(100, 'Максимум 100%'),
  notes: yup.string()
});

function MarginTradeForm() {
  const { currentPortfolio } = usePortfolio();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      symbol: '',
      entryPrice: '',
      quantity: '',
      marginAmount: 10, // Значение по умолчанию 10%
      notes: ''
    }
  });

  const watchedValues = watch();
  const totalCost = watchedValues.entryPrice && watchedValues.quantity 
    ? Number(watchedValues.entryPrice) * Number(watchedValues.quantity) 
    : 0;

  const dailyInterest = totalCost && watchedValues.marginAmount
    ? (totalCost * Number(watchedValues.marginAmount) / 100) / 365
    : 0;

  const monthlyInterest = dailyInterest * 30;
  const yearlyInterest = dailyInterest * 365;

  // Функция форматирования валюты
  const formatCurrency = (amount) => {
    return formatPortfolioCurrency(amount, currentPortfolio, 2);
  };

  const onSubmit = async (data) => {
    if (!currentPortfolio?.id) {
      setError('Портфель не выбран');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const payload = {
        ...data,
        entryDate: new Date().toISOString().split('T')[0]
      };

      const response = await axios.post('/api/trades/buy', payload, {
        headers: {
          'X-Portfolio-ID': currentPortfolio.id
        }
      });

      console.log('Trade created:', response.data);
      navigate('/margin/trades');
    } catch (err) {
      console.error('Error creating trade:', err);
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Не удалось создать сделку. Попробуйте еще раз.');
      }
    } finally {
      setLoading(false);
    }
  };

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
      <div className="container-fluid p-4 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h3 className="text-2xl font-light text-gray-800 mb-2">Новая маржинальная сделка</h3>
          <p className="text-gray-500">Создание позиции в портфеле {currentPortfolio?.name} ({currentPortfolio?.currency || 'RUB'})</p>
        </div>

        {error && (
          <div className="bg-red-50/80 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Форма */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border-0 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100/50">
              <h4 className="text-lg font-medium text-gray-800">Параметры сделки</h4>
            </div>
            
            <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-6 space-y-6">
              {/* Тикер */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Тикер <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('symbol')}
                  type="text"
                  placeholder="Например: SBER"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm bg-white/50 focus:ring-2 focus:ring-gray-200 focus:border-gray-300 transition-all uppercase"
                />
                {errors.symbol && (
                  <p className="mt-1 text-xs text-red-600">{errors.symbol.message}</p>
                )}
              </div>

              {/* Цена и количество */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Цена входа <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register('entryPrice')}
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm bg-white/50 focus:ring-2 focus:ring-gray-200 focus:border-gray-300 transition-all"
                  />
                  {errors.entryPrice && (
                    <p className="mt-1 text-xs text-red-600">{errors.entryPrice.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Количество <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register('quantity')}
                    type="number"
                    step="1"
                    placeholder="0"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm bg-white/50 focus:ring-2 focus:ring-gray-200 focus:border-gray-300 transition-all"
                  />
                  {errors.quantity && (
                    <p className="mt-1 text-xs text-red-600">{errors.quantity.message}</p>
                  )}
                </div>
              </div>

              {/* Ставка маржи */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ставка маржи (% годовых) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    {...register('marginAmount')}
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    placeholder="10.0"
                    className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl text-sm bg-white/50 focus:ring-2 focus:ring-gray-200 focus:border-gray-300 transition-all"
                  />
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                    <span className="text-gray-500 text-sm">%</span>
                  </div>
                </div>
                {errors.marginAmount && (
                  <p className="mt-1 text-xs text-red-600">{errors.marginAmount.message}</p>
                )}
              </div>

              {/* Заметки */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Заметки
                </label>
                <textarea
                  {...register('notes')}
                  rows={3}
                  placeholder="Дополнительная информация о сделке..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm bg-white/50 focus:ring-2 focus:ring-gray-200 focus:border-gray-300 transition-all resize-none"
                />
              </div>

              {/* Кнопки */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => navigate('/margin/trades')}
                  className="flex-1 px-6 py-3 text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Создание...' : 'Создать сделку'}
                </button>
              </div>
            </form>
          </div>

          {/* Предварительный расчет */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border-0 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100/50">
              <h4 className="text-lg font-medium text-gray-800">Расчет стоимости</h4>
            </div>
            
            <div className="px-6 py-6 space-y-6">
              {/* Основные показатели */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Общая стоимость позиции:</span>
                  <span className="text-lg font-semibold text-gray-800">
                    {formatCurrency(totalCost)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Ставка:</span>
                  <span className="text-purple-600 font-medium">
                    {watchedValues.marginAmount || 0}% годовых
                  </span>
                </div>
              </div>

              {/* Проценты */}
              <div className="pt-4 border-t border-gray-100/50">
                <h5 className="text-sm font-medium text-gray-700 mb-3">Проценты за использование маржи:</h5>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">За день:</span>
                    <span className="text-sm font-medium text-red-600">
                      -{formatCurrency(dailyInterest)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">За месяц (30 дней):</span>
                    <span className="text-sm font-medium text-red-600">
                      -{formatCurrency(monthlyInterest)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">За год:</span>
                    <span className="text-sm font-medium text-red-600">
                      -{formatCurrency(yearlyInterest)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Предупреждение */}
              <div className="pt-4 border-t border-gray-100/50">
                <div className="bg-yellow-50/80 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-yellow-400 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <h5 className="text-sm font-medium text-yellow-800 mb-1">Внимание</h5>
                      <p className="text-xs text-yellow-700">
                        Маржинальная торговля связана с повышенными рисками. 
                        Проценты начисляются ежедневно с момента открытия позиции.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MarginTradeForm; 