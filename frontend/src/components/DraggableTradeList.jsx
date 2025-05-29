import React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  restrictToVerticalAxis,
  restrictToWindowEdges,
} from '@dnd-kit/modifiers';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { themeClasses } from '../styles/designSystem';
import { Badge, Button } from './ui';

const DraggableTradeList = ({ trades, onReorder, renderTrade }) => {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = trades.findIndex((trade) => trade.id === active.id);
      const newIndex = trades.findIndex((trade) => trade.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        onReorder(oldIndex, newIndex);
      }
    }
  };

  // Проверяем что trades существует и не пустой
  if (!trades || trades.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        Нет сделок для перетаскивания
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      modifiers={[restrictToVerticalAxis, restrictToWindowEdges]}
    >
      <SortableContext 
        items={trades.map(trade => trade.id)} 
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-4">
          {trades.map((trade) => (
            <DraggableTradeItem
              key={trade.id}
              trade={trade}
              renderTrade={renderTrade}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};

// Отдельный компонент для каждого элемента списка
const DraggableTradeItem = ({ trade, renderTrade }) => {
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
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging ? 1000 : 1,
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
    <div
      ref={setNodeRef}
      style={style}
      className={`
        relative cursor-move
        ${isDragging ? 'shadow-2xl scale-105' : 'shadow-sm'}
        transition-all duration-200
      `}
      {...attributes}
      {...listeners}
    >
      {/* Drag indicator */}
      <div className="absolute left-2 top-1/2 transform -translate-y-1/2 z-10">
        <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
          <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/>
        </svg>
      </div>
      
      {/* Trade card with left padding for drag handle */}
      <div className="pl-8">
        {renderTrade(trade)}
      </div>
    </div>
  );
};

export default DraggableTradeList; 