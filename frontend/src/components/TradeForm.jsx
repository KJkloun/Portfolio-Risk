import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { 
  calculateTotalCost, 
  calculateYearlyInterest, 
  calculateDailyInterest 
} from '../utils/calculations';
import useKeyboardShortcuts, { SHORTCUTS, formatShortcut } from '../hooks/useKeyboardShortcuts';

// Импорт унифицированных компонентов и дизайн-системы
import { Card, Button, Input, StockSelect } from './ui';
import { themeClasses } from '../styles/designSystem';

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
  const [existingStocks, setExistingStocks] = useState([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    control,
    setValue,
    trigger
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

  // Загружаем существующие тикеры для автодополнения
  useEffect(() => {
    const loadExistingStocks = async () => {
      try {
        const response = await axios.get('/api/trades');
        const uniqueStocks = [...new Set(response.data.map(trade => trade.symbol))];
        setExistingStocks(uniqueStocks);
      } catch (err) {
        console.error('Error loading existing stocks:', err);
      }
    };
    
    loadExistingStocks();
  }, []);

  // Клавиатурные сочетания
  useKeyboardShortcuts({
    [SHORTCUTS.SAVE]: {
      action: () => handleSubmit(onSubmit)(),
      allowInInput: true
    },
    [SHORTCUTS.NEW_TRADE]: {
      action: () => {
        // Сброс формы
        setValue('symbol', '');
        setValue('entryPrice', '');
        setValue('quantity', '');
        setValue('creditRate', '');
        setValue('notes', '');
        document.querySelector('[data-testid="stock-select"]')?.focus();
      }
    },
    'escape': {
      action: () => navigate('/'),
      allowInInput: true
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
    <div className={`min-h-screen ${themeClasses.background.secondary} ${themeClasses.transition}`}>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className={`text-2xl font-medium ${themeClasses.text.primary}`}>Новая сделка</h1>
          
          {/* Подсказки по клавиатурным сочетаниям */}
          <div className={`text-xs ${themeClasses.text.tertiary} space-x-4 hidden sm:flex`}>
            <span>{formatShortcut(SHORTCUTS.SAVE)} - Сохранить</span>
            <span>{formatShortcut(SHORTCUTS.NEW_TRADE)} - Очистить</span>
            <span>ESC - Отмена</span>
          </div>
        </div>
          
        <Card>
          {error && (
            <Card variant="default" className="mb-6 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30">
              <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
            </Card>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className={`block text-sm font-medium ${themeClasses.text.primary} mb-2`} htmlFor="symbol">
                  Тикер акции
                </label>
                <Controller
                  name="symbol"
                  control={control}
                  render={({ field }) => (
                    <StockSelect
                      {...field}
                      data-testid="stock-select"
                      existingStocks={existingStocks}
                      placeholder="Введите тикер (например, SBER)..."
                      onChange={(value) => {
                        field.onChange(value);
                        // Автофокус на следующее поле после выбора
                        if (value) {
                          setTimeout(() => {
                            document.getElementById('quantity')?.focus();
                          }, 100);
                        }
                      }}
                    />
                  )}
                />
                {errors.symbol && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.symbol.message}</p>
                )}
              </div>

              <div>
                <label className={`block text-sm font-medium ${themeClasses.text.primary} mb-2`} htmlFor="quantity">
                  Количество
                </label>
                <input
                  id="quantity"
                  type="number"
                  placeholder="10"
                  className={`w-full px-3 py-2 ${themeClasses.background.primary} ${themeClasses.text.primary} ${themeClasses.border.primary} border rounded-md text-sm ${themeClasses.transition} ${themeClasses.interactive.focus} ${errors.quantity ? 'border-red-300 dark:border-red-600 focus:border-red-400 dark:focus:border-red-500 focus:ring-red-400 dark:focus:ring-red-500' : ''}`}
                  {...register('quantity')}
                  onChange={(e) => {
                    register('quantity').onChange(e);
                    setTimeout(calculateCredit, 100);
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      document.getElementById('entryPrice')?.focus();
                    }
                  }}
                />
                {errors.quantity && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.quantity.message}</p>
                )}
              </div>

              <div>
                <label className={`block text-sm font-medium ${themeClasses.text.primary} mb-2`} htmlFor="entryPrice">
                  Цена акции
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className={`${themeClasses.text.tertiary} text-sm`}>₽</span>
                  </div>
                  <input
                    id="entryPrice"
                    type="number"
                    step="0.01"
                    placeholder="250.00"
                    className={`w-full pl-7 pr-3 py-2 ${themeClasses.background.primary} ${themeClasses.text.primary} ${themeClasses.border.primary} border rounded-md text-sm ${themeClasses.transition} ${themeClasses.interactive.focus} ${errors.entryPrice ? 'border-red-300 dark:border-red-600 focus:border-red-400 dark:focus:border-red-500 focus:ring-red-400 dark:focus:ring-red-500' : ''}`}
                    {...register('entryPrice')}
                    onChange={(e) => {
                      register('entryPrice').onChange(e);
                      setTimeout(calculateCredit, 100);
                    }}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        document.getElementById('creditRate')?.focus();
                      }
                    }}
                  />
                </div>
                {errors.entryPrice && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.entryPrice.message}</p>
                )}
              </div>

              <div>
                <label className={`block text-sm font-medium ${themeClasses.text.primary} mb-2`} htmlFor="creditRate">
                  Процент за кредит (% годовых)
                </label>
                <div className="relative">
                  <input
                    id="creditRate"
                    type="number"
                    step="0.01"
                    placeholder="23"
                    className={`w-full pr-7 pl-3 py-2 ${themeClasses.background.primary} ${themeClasses.text.primary} ${themeClasses.border.primary} border rounded-md text-sm ${themeClasses.transition} ${themeClasses.interactive.focus} ${errors.creditRate ? 'border-red-300 dark:border-red-600 focus:border-red-400 dark:focus:border-red-500 focus:ring-red-400 dark:focus:ring-red-500' : ''}`}
                    {...register('creditRate')}
                    onChange={(e) => {
                      register('creditRate').onChange(e);
                      setTimeout(calculateCredit, 100);
                    }}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        document.getElementById('notes')?.focus();
                      }
                    }}
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className={`${themeClasses.text.tertiary} text-sm`}>%</span>
                  </div>
                </div>
                {errors.creditRate && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.creditRate.message}</p>
                )}
              </div>

              <div>
                <label className={`block text-sm font-medium ${themeClasses.text.primary} mb-2`} htmlFor="entryDate">
                  Дата покупки
                </label>
                <input
                  id="entryDate"
                  type="date"
                  className={`w-full px-3 py-2 ${themeClasses.background.primary} ${themeClasses.text.primary} ${themeClasses.border.primary} border rounded-md text-sm ${themeClasses.transition} ${themeClasses.interactive.focus} ${errors.entryDate ? 'border-red-300 dark:border-red-600 focus:border-red-400 dark:focus:border-red-500 focus:ring-red-400 dark:focus:ring-red-500' : ''}`}
                  {...register('entryDate')}
                />
                {errors.entryDate && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.entryDate.message}</p>
                )}
              </div>

              <div>
                <label className={`block text-sm font-medium ${themeClasses.text.primary} mb-2`} htmlFor="notes">
                  Заметки (опционально)
                </label>
                <input
                  id="notes"
                  type="text"
                  placeholder="Дополнительная информация..."
                  className={`w-full px-3 py-2 ${themeClasses.background.primary} ${themeClasses.text.primary} ${themeClasses.border.primary} border rounded-md text-sm ${themeClasses.transition} ${themeClasses.interactive.focus}`}
                  {...register('notes')}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSubmit(onSubmit)();
                    }
                  }}
                />
              </div>
            </div>

            {/* Расчет кредита */}
            {calculation && (
              <Card variant="secondary" className="mt-6">
                <h3 className={`text-lg font-medium ${themeClasses.text.primary} mb-3`}>
                  Расчет кредита
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <p className={`text-sm ${themeClasses.text.secondary}`}>Стоимость покупки</p>
                    <p className={`text-lg font-semibold ${themeClasses.text.primary}`}>
                      {calculation.totalCost.toLocaleString('ru-RU', {
                        style: 'currency',
                        currency: 'RUB',
                        maximumFractionDigits: 0,
                      })}
                    </p>
                  </div>
                  <div>
                    <p className={`text-sm ${themeClasses.text.secondary}`}>Проценты в год</p>
                    <p className={`text-lg font-semibold text-orange-600 dark:text-orange-400`}>
                      {calculation.yearlyInterest.toLocaleString('ru-RU', {
                        style: 'currency',
                        currency: 'RUB',
                        maximumFractionDigits: 0,
                      })}
                    </p>
                  </div>
                  <div>
                    <p className={`text-sm ${themeClasses.text.secondary}`}>Проценты в день</p>
                    <p className={`text-lg font-semibold text-red-600 dark:text-red-400`}>
                      {calculation.dailyInterest.toLocaleString('ru-RU', {
                        style: 'currency',
                        currency: 'RUB',
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {/* Кнопки */}
            <div className="flex justify-end space-x-3 pt-6">
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate('/')}
                disabled={isSubmitting}
              >
                Отмена
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={isSubmitting}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Сохранение...' : 'Создать сделку'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}

export default TradeForm;
