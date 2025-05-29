import React, { useState, useEffect, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import axios from 'axios';
import { themeClasses } from '../styles/designSystem';
import { Card, Button, Input, StockSelect } from './ui';
import useKeyboardShortcuts from '../hooks/useKeyboardShortcuts';

const schema = yup.object().shape({
  symbol: yup.string().required('Требуется тикер'),
  entryPrice: yup.number().required('Требуется цена').positive('Цена должна быть положительной'),
  quantity: yup.number().required('Требуется количество').positive('Количество должно быть положительным').integer('Количество должно быть целым числом'),
  creditRate: yup.number().required('Требуется ставка').min(1, 'Мин. 1%').max(100, 'Макс. 100%'),
});

const QuickTradeModal = ({ isOpen, onClose, onSuccess, existingStocks = [] }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const modalRef = useRef(null);
  const firstInputRef = useRef(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
    setValue,
    reset,
    watch
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      symbol: '',
      entryPrice: '',
      quantity: '',
      creditRate: '23', // Стандартная ставка
    }
  });

  // Клавиатурные сочетания для модального окна
  useKeyboardShortcuts({
    'escape': {
      action: handleClose,
      allowInInput: true
    },
    'cmd+s': {
      action: () => handleSubmit(onSubmit)(),
      allowInInput: true
    }
  });

  // Фокус на первое поле при открытии
  useEffect(() => {
    if (isOpen && firstInputRef.current) {
      setTimeout(() => {
        firstInputRef.current.focus();
      }, 100);
    }
  }, [isOpen]);

  // Закрытие по клику вне модального окна
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  const handleClose = () => {
    reset();
    setError('');
    onClose();
  };

  const onSubmit = async (data) => {
    try {
      setIsSubmitting(true);
      setError('');

      const formattedData = {
        symbol: data.symbol.toUpperCase(),
        entryPrice: Number(data.entryPrice),
        quantity: Number(data.quantity),
        marginAmount: Number(data.creditRate),
        entryDate: new Date().toISOString().split('T')[0], // Сегодня
        notes: 'Быстрый ввод'
      };

      await axios.post('/api/trades/buy', formattedData);
      onSuccess?.();
      handleClose();
    } catch (err) {
      console.error('Error saving quick trade:', err);
      setError(err.response?.data?.message || 'Ошибка при сохранении сделки');
    } finally {
      setIsSubmitting(false);
    }
  };

  const watchedValues = watch();

  // Расчет общей стоимости
  const totalCost = watchedValues.entryPrice && watchedValues.quantity 
    ? Number(watchedValues.entryPrice) * Number(watchedValues.quantity)
    : 0;

  // Расчет дневных процентов
  const dailyInterest = totalCost && watchedValues.creditRate
    ? (totalCost * Number(watchedValues.creditRate) / 100) / 365
    : 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div
        ref={modalRef}
        className={`w-full max-w-lg ${themeClasses.background.primary} rounded-lg shadow-xl`}
      >
        <Card className="border-0 shadow-none">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className={`text-lg font-medium ${themeClasses.text.primary}`}>
                Быстрая сделка
              </h2>
              <p className={`text-sm ${themeClasses.text.tertiary} mt-1`}>
                ⌘+S - Сохранить • ESC - Отмена
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-8 w-8 p-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-md">
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Symbol */}
            <div>
              <label className={`block text-sm font-medium ${themeClasses.text.primary} mb-1`}>
                Тикер акции
              </label>
              <Controller
                name="symbol"
                control={control}
                render={({ field }) => (
                  <StockSelect
                    {...field}
                    ref={firstInputRef}
                    existingStocks={existingStocks}
                    placeholder="SBER, GAZP, LKOH..."
                    onChange={(value) => {
                      field.onChange(value);
                      if (value) {
                        setTimeout(() => {
                          document.getElementById('quick-quantity')?.focus();
                        }, 100);
                      }
                    }}
                  />
                )}
              />
              {errors.symbol && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.symbol.message}</p>
              )}
            </div>

            {/* Quick input row */}
            <div className="grid grid-cols-3 gap-3">
              {/* Quantity */}
              <div>
                <label className={`block text-xs font-medium ${themeClasses.text.primary} mb-1`}>
                  Кол-во
                </label>
                <input
                  id="quick-quantity"
                  type="number"
                  placeholder="10"
                  className={`w-full px-2 py-2 text-sm ${themeClasses.background.primary} ${themeClasses.text.primary} ${themeClasses.border.primary} border rounded-md ${themeClasses.transition} ${themeClasses.interactive.focus} ${errors.quantity ? 'border-red-300 dark:border-red-600' : ''}`}
                  {...register('quantity')}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      document.getElementById('quick-price')?.focus();
                    }
                  }}
                />
                {errors.quantity && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.quantity.message}</p>
                )}
              </div>

              {/* Price */}
              <div>
                <label className={`block text-xs font-medium ${themeClasses.text.primary} mb-1`}>
                  Цена (₽)
                </label>
                <input
                  id="quick-price"
                  type="number"
                  step="0.01"
                  placeholder="250"
                  className={`w-full px-2 py-2 text-sm ${themeClasses.background.primary} ${themeClasses.text.primary} ${themeClasses.border.primary} border rounded-md ${themeClasses.transition} ${themeClasses.interactive.focus} ${errors.entryPrice ? 'border-red-300 dark:border-red-600' : ''}`}
                  {...register('entryPrice')}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      document.getElementById('quick-rate')?.focus();
                    }
                  }}
                />
                {errors.entryPrice && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.entryPrice.message}</p>
                )}
              </div>

              {/* Credit Rate */}
              <div>
                <label className={`block text-xs font-medium ${themeClasses.text.primary} mb-1`}>
                  Ставка (%)
                </label>
                <input
                  id="quick-rate"
                  type="number"
                  step="0.1"
                  placeholder="23"
                  className={`w-full px-2 py-2 text-sm ${themeClasses.background.primary} ${themeClasses.text.primary} ${themeClasses.border.primary} border rounded-md ${themeClasses.transition} ${themeClasses.interactive.focus} ${errors.creditRate ? 'border-red-300 dark:border-red-600' : ''}`}
                  {...register('creditRate')}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSubmit(onSubmit)();
                    }
                  }}
                />
                {errors.creditRate && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.creditRate.message}</p>
                )}
              </div>
            </div>

            {/* Quick calculations */}
            {totalCost > 0 && (
              <div className={`p-3 ${themeClasses.background.secondary} rounded-md`}>
                <div className="flex justify-between items-center text-sm">
                  <span className={themeClasses.text.secondary}>Стоимость:</span>
                  <span className={`font-medium ${themeClasses.text.primary}`}>
                    {totalCost.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}
                  </span>
                </div>
                {dailyInterest > 0 && (
                  <div className="flex justify-between items-center text-sm mt-1">
                    <span className={themeClasses.text.secondary}>В день %:</span>
                    <span className="text-red-600 dark:text-red-400 font-medium">
                      -{dailyInterest.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={handleClose}
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
                {isSubmitting ? 'Сохранение...' : 'Создать'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default QuickTradeModal; 