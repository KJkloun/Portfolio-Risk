import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  calculateTotalCost, 
  calculateYearlyInterest, 
  calculateDailyInterest 
} from '../utils/calculations';

const schema = yup.object().shape({
  symbol: yup.string().required('Это поле обязательно'),
  entryPrice: yup.number().required('Это поле обязательно').positive('Введите положительное число'),
  quantity: yup.number().required('Это поле обязательно').positive('Введите положительное число').integer('Введите целое число'),
  creditRate: yup.number().required('Это поле обязательно').min(1, 'Минимум 1%').max(100, 'Максимум 100%'),
  entryDate: yup.date().required('Это поле обязательно'),
  notes: yup.string(),
});

function TradeForm() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [calculation, setCalculation] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      symbol: '',
      entryPrice: '',
      quantity: '',
      creditRate: '',
      entryDate: new Date().toISOString().split('T')[0], // Сегодняшняя дата по умолчанию
      notes: ''
    }
  });

  const entryPrice = watch('entryPrice');
  const quantity = watch('quantity');
  const creditRate = watch('creditRate');

  const calculateCredit = () => {
    // Проверяем, что все необходимые значения присутствуют
    if (!entryPrice || !quantity || !creditRate) {
      setCalculation(null);
      return;
    }

    try {
      // Явное преобразование строк в числа, обрабатывая и целые, и дробные значения
      const parsedPrice = Number(entryPrice.toString().replace(',', '.'));
      const parsedQuantity = Number(quantity.toString().replace(',', '.'));
      const parsedRate = Number(creditRate.toString().replace(',', '.'));
      
      // Используем функции из utils/calculations.js
      const totalCost = calculateTotalCost(parsedPrice, parsedQuantity);
      const yearlyInterest = calculateYearlyInterest(totalCost, parsedRate);
      const dailyInterest = calculateDailyInterest(yearlyInterest);
      
      setCalculation({
        totalCost,
        yearlyInterest,
        dailyInterest,
      });
    } catch (err) {
      console.error("Ошибка при расчете:", err);
      setCalculation(null);
    }
  };

  const onSubmit = async (data) => {
    try {
      setIsSubmitting(true);
      setError('');
      
      // Формируем данные для отправки на сервер в правильном формате
      const formattedData = {
        ...data,
        entryPrice: Number(data.entryPrice.toString().replace(',', '.')),
        quantity: Number(data.quantity.toString().replace(',', '.')),
        marginAmount: Number(data.creditRate.toString().replace(',', '.')), // Используем то же поле для совместимости с бэкендом
        entryDate: data.entryDate, // Добавляем дату сделки
      };
      
      // Удаляем поле creditRate, чтобы не было конфликта
      delete formattedData.creditRate;
      
      const response = await axios.post('/api/trades/buy', formattedData);
      console.log('Trade saved successfully:', response.data);
      navigate('/');
    } catch (err) {
      console.error('Error saving trade:', err);
      setError(err.response?.data?.message || 'Произошла ошибка при сохранении сделки.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-900 transition-colors duration-300">
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-2xl font-medium text-gray-900 dark:text-gray-100 mb-8">
          {t('trades.newTrade', 'Новая сделка')}
        </h1>
        
        <div className="bank-card">
          <div className="bank-card-body">
            {error && (
              <div className="notification-error mb-6">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" htmlFor="symbol">
                    {t('trades.ticker', 'Тикер')}
                  </label>
                  <input
                    id="symbol"
                    type="text"
                    placeholder="SBER"
                    className={`bank-input ${errors.symbol ? 'border-red-300 focus:border-red-400 focus:ring-red-400' : ''}`}
                    {...register('symbol')}
                  />
                  {errors.symbol && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.symbol.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" htmlFor="quantity">
                    {t('trades.quantity', 'Количество')}
                  </label>
                  <input
                    id="quantity"
                    type="number"
                    placeholder="10"
                    className={`bank-input ${errors.quantity ? 'border-red-300 focus:border-red-400 focus:ring-red-400' : ''}`}
                    {...register('quantity')}
                    onChange={(e) => {
                      register('quantity').onChange(e);
                      setTimeout(calculateCredit, 100);
                    }}
                  />
                  {errors.quantity && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.quantity.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" htmlFor="entryPrice">
                    {t('trades.entryPrice', 'Цена акции')}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 dark:text-gray-400 text-sm">₽</span>
                    </div>
                    <input
                      id="entryPrice"
                      type="number"
                      step="0.01"
                      placeholder="250.00"
                      className={`bank-input pl-7 ${errors.entryPrice ? 'border-red-300 focus:border-red-400 focus:ring-red-400' : ''}`}
                      {...register('entryPrice')}
                      onChange={(e) => {
                        register('entryPrice').onChange(e);
                        setTimeout(calculateCredit, 100);
                      }}
                    />
                  </div>
                  {errors.entryPrice && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.entryPrice.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" htmlFor="creditRate">
                    {t('trades.creditRate', 'Процент за кредит (% годовых)')}
                  </label>
                  <div className="relative">
                    <input
                      id="creditRate"
                      type="number"
                      step="0.01"
                      placeholder="23"
                      className={`bank-input pr-7 ${errors.creditRate ? 'border-red-300 focus:border-red-400 focus:ring-red-400' : ''}`}
                      {...register('creditRate')}
                      onChange={(e) => {
                        register('creditRate').onChange(e);
                        setTimeout(calculateCredit, 100);
                      }}
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 dark:text-gray-400 text-sm">%</span>
                    </div>
                  </div>
                  {errors.creditRate && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.creditRate.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" htmlFor="entryDate">
                    {t('trades.entryDate', 'Дата сделки')}
                  </label>
                  <input
                    id="entryDate"
                    type="date"
                    className={`bank-input ${errors.entryDate ? 'border-red-300 focus:border-red-400 focus:ring-red-400' : ''}`}
                    {...register('entryDate')}
                  />
                  {errors.entryDate && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.entryDate.message}</p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" htmlFor="notes">
                    {t('trades.notes', 'Заметки')} ({t('common.optional', 'необязательно')})
                  </label>
                  <textarea
                    id="notes"
                    rows="3"
                    placeholder={t('trades.notesPlaceholder', 'Дополнительная информация о сделке...')}
                    className="bank-textarea"
                    {...register('notes')}
                  />
                </div>
              </div>

              {/* Калькулятор расходов */}
              {calculation && (
                <div className="bank-card bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                  <div className="bank-card-body">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                      {t('trades.calculation', 'Расчет расходов')}
                    </h3>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {t('trades.totalCost', 'Общая стоимость')}
                        </p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                          {calculation.totalCost.toLocaleString('ru-RU', { 
                            style: 'currency', 
                            currency: 'RUB' 
                          })}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {t('trades.yearlyInterest', 'Проценты в год')}
                        </p>
                        <p className="text-lg font-semibold text-brand-red-600 dark:text-brand-red-400">
                          {calculation.yearlyInterest.toLocaleString('ru-RU', { 
                            style: 'currency', 
                            currency: 'RUB' 
                          })}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {t('trades.dailyInterest', 'Проценты в день')}
                        </p>
                        <p className="text-lg font-semibold text-brand-red-600 dark:text-brand-red-400">
                          {calculation.dailyInterest.toLocaleString('ru-RU', { 
                            style: 'currency', 
                            currency: 'RUB' 
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="bank-button-secondary"
                >
                  {t('common.cancel', 'Отмена')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bank-button-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? t('common.saving', 'Сохранение...') : t('trades.saveTrade', 'Сохранить сделку')}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TradeForm;
