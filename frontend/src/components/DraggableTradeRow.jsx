import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { themeClasses } from '../styles/designSystem';
import { Badge, Button } from './ui';

const DraggableTradeRow = ({ 
  trade, 
  onEdit, 
  onDelete, 
  onClose, 
  stockPrices = {},
  isDragMode = false 
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: trade.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Parse date string into local date object
  const parseDateLocal = (dateStr) => {
    if (!dateStr) return null;
    const [year, month, day] = dateStr.split('-');
    return new Date(+year, +month - 1, +day);
  };

  // Calculate profit/loss if exit price exists
  const profit = trade.exitPrice 
    ? (Number(trade.exitPrice) - Number(trade.entryPrice)) * Number(trade.quantity)
    : null;

  // Calculate potential profit if current price is available
  const currentPrice = stockPrices[trade.symbol];
  const potentialProfit = currentPrice && !trade.exitPrice
    ? (currentPrice - Number(trade.entryPrice)) * Number(trade.quantity)
    : null;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const date = parseDateLocal(dateStr);
    return date ? format(date, 'd MMM yyyy', { locale: ru }) : '—';
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`
        ${themeClasses.background.primary} 
        ${themeClasses.transition}
        ${isDragging ? 'shadow-lg z-50' : ''}
        ${isDragMode ? 'cursor-move' : ''}
        hover:${themeClasses.background.secondary}
      `}
    >
      {/* Drag Handle */}
      <td className="px-2 py-3">
        {isDragMode && (
          <div
            {...attributes}
            {...listeners}
            className={`p-1 rounded cursor-move ${themeClasses.text.tertiary} hover:${themeClasses.text.secondary}`}
            title="Перетащите для изменения порядка"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/>
            </svg>
          </div>
        )}
      </td>

      {/* Symbol */}
      <td className="px-4 py-3">
        <div className="flex items-center">
          <Badge 
            variant={trade.exitDate ? "secondary" : "primary"}
            size="sm"
          >
            {trade.symbol}
          </Badge>
        </div>
      </td>

      {/* Quantity */}
      <td className={`px-4 py-3 text-sm ${themeClasses.text.primary}`}>
        {Number(trade.quantity).toLocaleString()}
      </td>

      {/* Entry Price */}
      <td className={`px-4 py-3 text-sm ${themeClasses.text.primary}`}>
        {formatCurrency(Number(trade.entryPrice))}
      </td>

      {/* Exit Price */}
      <td className={`px-4 py-3 text-sm ${themeClasses.text.primary}`}>
        {trade.exitPrice ? formatCurrency(Number(trade.exitPrice)) : '—'}
      </td>

      {/* Current Price */}
      <td className={`px-4 py-3 text-sm ${themeClasses.text.secondary}`}>
        {currentPrice ? (
          <Badge variant="default" size="sm">
            {formatCurrency(currentPrice)}
          </Badge>
        ) : '—'}
      </td>

      {/* Profit/Loss */}
      <td className="px-4 py-3">
        {profit !== null ? (
          <span className={`text-sm font-medium ${
            profit >= 0 
              ? 'text-green-600 dark:text-green-400' 
              : 'text-red-600 dark:text-red-400'
          }`}>
            {profit >= 0 ? '+' : ''}{formatCurrency(profit)}
          </span>
        ) : potentialProfit !== null ? (
          <span className={`text-sm ${
            potentialProfit >= 0 
              ? 'text-green-600 dark:text-green-400' 
              : 'text-red-600 dark:text-red-400'
          }`}>
            {potentialProfit >= 0 ? '+' : ''}{formatCurrency(potentialProfit)}
            <span className={`block text-xs ${themeClasses.text.tertiary}`}>
              потенциал
            </span>
          </span>
        ) : (
          <span className={`text-sm ${themeClasses.text.tertiary}`}>—</span>
        )}
      </td>

      {/* Entry Date */}
      <td className={`px-4 py-3 text-sm ${themeClasses.text.secondary}`}>
        {formatDate(trade.entryDate)}
      </td>

      {/* Exit Date */}
      <td className={`px-4 py-3 text-sm ${themeClasses.text.secondary}`}>
        {formatDate(trade.exitDate)}
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        {!isDragMode && (
          <div className="flex space-x-2">
            {!trade.exitDate && (
              <Button
                variant="outline"
                size="xs"
                onClick={() => onClose(trade)}
                title="Закрыть позицию"
              >
                Закрыть
              </Button>
            )}
            <Button
              variant="outline"
              size="xs"
              onClick={() => onEdit(trade)}
              title="Редактировать сделку"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </Button>
            <Button
              variant="outline"
              size="xs"
              onClick={() => onDelete(trade.id)}
              title="Удалить сделку"
              className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </Button>
          </div>
        )}
      </td>
    </tr>
  );
};

export default DraggableTradeRow; 