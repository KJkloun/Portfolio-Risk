import React from 'react';
import { Trade, TradeStatus } from '../types';

interface TypeScriptExampleProps {
  trades: Trade[];
  onTradeSelect?: (trade: Trade) => void;
  status?: TradeStatus;
}

const TypeScriptExample: React.FC<TypeScriptExampleProps> = ({
  trades,
  onTradeSelect,
  status = 'open'
}) => {
  const handleTradeClick = (trade: Trade): void => {
    if (onTradeSelect) {
      onTradeSelect(trade);
    }
  };

  const filteredTrades = trades.filter((trade: Trade) => {
    if (status === 'open') {
      return !trade.exitPrice;
    }
    return !!trade.exitPrice;
  });

  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-4">
        TypeScript Example Component
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        Этот компонент демонстрирует использование TypeScript типов
      </p>
      
      <div className="space-y-2">
        {filteredTrades.map((trade: Trade) => (
          <div
            key={trade.id}
            onClick={() => handleTradeClick(trade)}
            className="p-3 border rounded cursor-pointer hover:bg-gray-50"
          >
            <div className="flex justify-between items-center">
              <span className="font-medium">{trade.symbol}</span>
              <span className="text-sm text-gray-500">
                {trade.quantity} shares @ ${trade.entryPrice}
              </span>
            </div>
            {trade.notes && (
              <p className="text-sm text-gray-600 mt-1">{trade.notes}</p>
            )}
          </div>
        ))}
      </div>
      
      {filteredTrades.length === 0 && (
        <p className="text-gray-500 text-center py-4">
          No {status} trades found
        </p>
      )}
    </div>
  );
};

export default TypeScriptExample; 