import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
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
    <div className="min-h-screen bg-gray-50">
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-2xl font-medium text-gray-900 mb-8">Новая сделка</h1>
        
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="symbol">
                    Тикер
                  </label>
                  <input
                    id="symbol"
                    type="text"
                    placeholder="SBER"
                    className={`w-full px-3 py-2 border rounded-md text-sm focus:ring-1 focus:ring-gray-400 focus:border-gray-400 ${errors.symbol ? 'border-red-300 focus:border-red-400 focus:ring-red-400' : 'border-gray-300'}`}
                    {...register('symbol')}
                  />
                  {errors.symbol && (
                    <p className="mt-1 text-sm text-red-600">{errors.symbol.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="quantity">
                    Количество
                  </label>
                  <input
                    id="quantity"
                    type="number"
                    placeholder="10"
                    className={`w-full px-3 py-2 border rounded-md text-sm focus:ring-1 focus:ring-gray-400 focus:border-gray-400 ${errors.quantity ? 'border-red-300 focus:border-red-400 focus:ring-red-400' : 'border-gray-300'}`}
                    {...register('quantity')}
                    onChange={(e) => {
                      register('quantity').onChange(e);
                      setTimeout(calculateCredit, 100);
                    }}
                  />
                  {errors.quantity && (
                    <p className="mt-1 text-sm text-red-600">{errors.quantity.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="entryPrice">
                    Цена акции
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 text-sm">₽</span>
                    </div>
                    <input
                      id="entryPrice"
                      type="number"
                      step="0.01"
                      placeholder="250.00"
                      className={`w-full pl-7 pr-3 py-2 border rounded-md text-sm focus:ring-1 focus:ring-gray-400 focus:border-gray-400 ${errors.entryPrice ? 'border-red-300 focus:border-red-400 focus:ring-red-400' : 'border-gray-300'}`}
                      {...register('entryPrice')}
                      onChange={(e) => {
                        register('entryPrice').onChange(e);
                        setTimeout(calculateCredit, 100);
                      }}
                    />
                  </div>
                  {errors.entryPrice && (
                    <p className="mt-1 text-sm text-red-600">{errors.entryPrice.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="creditRate">
                    Процент за кредит (% годовых)
                  </label>
                  <div className="relative">
                    <input
                      id="creditRate"
                      type="number"
                      step="0.01"
                      placeholder="23"
                      className={`w-full pr-7 pl-3 py-2 border rounded-md text-sm focus:ring-1 focus:ring-gray-400 focus:border-gray-400 ${errors.creditRate ? 'border-red-300 focus:border-red-400 focus:ring-red-400' : 'border-gray-300'}`}
                      {...register('creditRate')}
                      onChange={(e) => {
                        register('creditRate').onChange(e);
                        setTimeout(calculateCredit, 100);
                      }}
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 text-sm">%</span>
                    </div>
                  </div>
                  {errors.creditRate && (
                    <p className="mt-1 text-sm text-red-600">{errors.creditRate.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="entryDate">
                    Дата покупки
                  </label>
                  <input
                    id="entryDate"
                    type="date"
                    className={`w-full px-3 py-2 border rounded-md text-sm focus:ring-1 focus:ring-gray-400 focus:border-gray-400 ${errors.entryDate ? 'border-red-300 focus:border-red-400 focus:ring-red-400' : 'border-gray-300'}`}
                    {...register('entryDate')}
                  />
                  {errors.entryDate && (
                    <p className="mt-1 text-sm text-red-600">{errors.entryDate.message}</p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="notes">
                    Примечания (опционально)
                  </label>
                  <textarea
                    id="notes"
                    placeholder="Долгосрочная инвестиция в IT сектор"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                    {...register('notes')}
                  ></textarea>
                </div>
              </div>

              {calculation && (
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-medium mb-4 text-gray-900">Расчет сделки</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600">Общая сумма</p>
                      <p className="text-lg font-medium mt-1 text-gray-900">
                        {calculation.totalCost.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB' })}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600">Процент в год</p>
                      <p className="text-lg font-medium mt-1 text-gray-900">
                        {calculation.yearlyInterest.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB' })}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600">Процент в день</p>
                      <p className="text-lg font-medium mt-1 text-gray-900">
                        {calculation.dailyInterest.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB' })}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-gray-400 w-full sm:w-auto"
                  onClick={() => navigate('/')}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-transparent rounded-md text-white bg-gray-700 hover:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-gray-400 w-full sm:w-auto disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Сохранение...
                    </div>
                  ) : (
                    'Сохранить сделку'
                  )}
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
