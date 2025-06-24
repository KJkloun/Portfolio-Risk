import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { usePortfolio } from '../../contexts/PortfolioContext';
import { formatPortfolioCurrency } from '../../utils/currencyFormatter';

function MarginBulkImport() {
  const { currentPortfolio } = usePortfolio();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tradesText, setTradesText] = useState('');

  // Функция форматирования валюты
  const formatCurrency = (amount) => {
    return formatPortfolioCurrency(amount, currentPortfolio, 2);
  };

  // Улучшенный пример с разными форматами дат и автозакрытием
  const exampleData = `SBER,250.5,100,10.5,2024-01-15,Покупка Сбербанка
LKOH,6800,10,12.0,16.01.2024,Покупка ЛУКОЙЛа
GAZP,180.2,50,9.5,2024/01/17,Газпром
YNDX,3200,20,11.0,2024-01-20,2024-02-20,3400,Яндекс - закрыта с прибылью`;

  // Функция для парсинга дат в разных форматах
  const parseFlexibleDate = (dateStr) => {
    if (!dateStr || dateStr.trim() === '') return null;
    
    const trimmed = dateStr.trim();
    
    // Пробуем разные форматы
    const patterns = [
      // ISO формат: 2023-05-02
      /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
      // Европейский с точками: 02.05.2023
      /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/,
      // Европейский со слешами: 02/05/2023
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
      // Американский со слешами: 05/02/2023
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
      // С дефисами: 02-05-2023
      /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
    ];

    // ISO формат
    if (patterns[0].test(trimmed)) {
      return trimmed; // Уже в правильном формате
    }

    // Европейский формат с точками
    if (patterns[1].test(trimmed)) {
      const [, day, month, year] = trimmed.match(patterns[1]);
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    // Другие форматы
    for (let i = 2; i < patterns.length; i++) {
      if (patterns[i].test(trimmed)) {
        const parts = trimmed.split(/[\/.-]/);
        if (parts.length === 3) {
          const [first, second, third] = parts;
          // Предполагаем европейский формат (день/месяц/год)
          if (parseInt(third) > 1900) {
            return `${third}-${second.padStart(2, '0')}-${first.padStart(2, '0')}`;
          }
        }
      }
    }

    throw new Error(`Неверный формат даты: ${dateStr}`);
  };

  const parseTrades = (text) => {
    const lines = text.trim().split('\n').filter(line => line.trim());
    const trades = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const parts = line.split(',');
      if (parts.length < 5) {
        throw new Error(`Строка ${i + 1}: Недостаточно данных (нужно минимум 5 полей)`);
      }

      const [symbol, entryPrice, quantity, marginAmount, entryDateRaw, ...rest] = parts;
      
      // Проверяем, есть ли данные для автозакрытия
      let exitDate = null;
      let exitPrice = null;
      let notes = '';

      if (rest.length >= 3) {
        // Если есть 3 дополнительных поля, это может быть exitDate, exitPrice, notes
        const possibleExitDate = rest[0];
        const possibleExitPrice = rest[1];
        
        try {
          exitDate = parseFlexibleDate(possibleExitDate);
          const parsedExitPrice = parseFloat(possibleExitPrice);
          if (!isNaN(parsedExitPrice) && parsedExitPrice > 0) {
            exitPrice = parsedExitPrice;
            notes = rest.slice(2).join(',').trim();
          } else {
            // Если не получилось распарсить как цену, значит это заметки
            notes = rest.join(',').trim();
            exitDate = null;
          }
        } catch (e) {
          // Если не получилось распарсить как дату, значит это заметки
          notes = rest.join(',').trim();
        }
      } else {
        notes = rest.join(',').trim();
      }

      if (!symbol?.trim()) {
        throw new Error(`Строка ${i + 1}: Тикер не может быть пустым`);
      }

      const parsedEntryPrice = parseFloat(entryPrice);
      if (isNaN(parsedEntryPrice) || parsedEntryPrice <= 0) {
        throw new Error(`Строка ${i + 1}: Неверная цена входа: ${entryPrice}`);
      }

      const parsedQuantity = parseInt(quantity);
      if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
        throw new Error(`Строка ${i + 1}: Неверное количество: ${quantity}`);
      }

      const parsedMarginAmount = parseFloat(marginAmount);
      if (isNaN(parsedMarginAmount) || parsedMarginAmount <= 0 || parsedMarginAmount > 100) {
        throw new Error(`Строка ${i + 1}: Неверная ставка маржи: ${marginAmount}%`);
      }

      const entryDate = parseFlexibleDate(entryDateRaw);
      if (!entryDate) {
        throw new Error(`Строка ${i + 1}: Неверная дата входа: ${entryDateRaw}`);
      }

      const trade = {
        symbol: symbol.trim().toUpperCase(),
        entryPrice: parsedEntryPrice,
        quantity: parsedQuantity,
        marginAmount: parsedMarginAmount,
        entryDate: entryDate,
        notes: notes.trim()
      };

      // Добавляем данные для автозакрытия, если они есть
      if (exitDate && exitPrice) {
        trade.exitDate = exitDate;
        trade.exitPrice = exitPrice;
      }

      trades.push(trade);
    }

    return trades;
  };

  const handleImport = async () => {
    if (!currentPortfolio?.id) {
      setError('Портфель не выбран');
      return;
    }

    if (!tradesText.trim()) {
      setError('Введите данные для импорта');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const trades = parseTrades(tradesText);
      
      if (trades.length === 0) {
        setError('Не найдено валидных сделок для импорта');
        return;
      }

      const response = await axios.post('/api/trades/bulk-import', 
        { trades }, 
        {
          headers: {
            'X-Portfolio-ID': currentPortfolio.id
          }
        }
      );

      if (response.data.success) {
        setSuccess(`Успешно импортировано ${response.data.importedCount} сделок`);
        setTradesText('');
        
        // Перенаправляем на список сделок через 2 секунды
        setTimeout(() => {
          navigate('/margin/trades');
        }, 2000);
      } else {
        setError(response.data.message || 'Ошибка при импорте');
      }
    } catch (err) {
      console.error('Import error:', err);
      if (err.message?.startsWith('Строка')) {
        setError(err.message);
      } else if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Ошибка при импорте сделок');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadExample = () => {
    setTradesText(exampleData);
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      setTradesText(e.target.result);
    };
    reader.onerror = () => {
      setError('Ошибка при чтении файла');
    };
    reader.readAsText(file);
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
      <div className="container-fluid p-4 max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h3 className="text-2xl font-light text-gray-800 mb-2">Импорт сделок</h3>
          <p className="text-gray-500">
            Массовое добавление маржинальных сделок в портфель {currentPortfolio?.name} ({currentPortfolio?.currency || 'RUB'})
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Форма импорта */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border-0 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100/50">
              <h4 className="text-lg font-medium text-gray-800">Данные для импорта</h4>
            </div>

            <div className="px-6 py-6 space-y-6">
              {/* Расширенная информация о формате */}
              <div className="bg-blue-50/80 border border-blue-200 rounded-lg p-4">
                <h5 className="text-sm font-medium text-blue-800 mb-2">Формат данных:</h5>
                <p className="text-xs text-blue-700 mb-2">
                  Каждая строка = одна сделка. Поля разделяются запятыми:
                </p>
                <code className="text-xs text-blue-800 bg-blue-100/80 px-2 py-1 rounded block mb-3">
                  ТИКЕР,ЦЕНА_ВХОДА,КОЛ-ВО,СТАВКА_%,ДАТА_ВХОДА[,ДАТА_ВЫХОДА,ЦЕНА_ВЫХОДА],ЗАМЕТКИ
                </code>
                
                <div className="space-y-2">
                  <div>
                    <h6 className="text-xs font-medium text-blue-800">Поддерживаемые форматы дат:</h6>
                    <ul className="text-xs text-blue-700 ml-4 list-disc">
                      <li>ISO: 2024-01-15</li>
                      <li>Европейский: 15.01.2024, 15/01/2024, 15-01-2024</li>
                      <li>С разделителями: точки, слеши, дефисы</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h6 className="text-xs font-medium text-blue-800">Автозакрытие сделок:</h6>
                    <p className="text-xs text-blue-700">
                      Если указаны ДАТА_ВЫХОДА и ЦЕНА_ВЫХОДА, сделка будет автоматически закрыта при импорте
                    </p>
                  </div>
                </div>
              </div>

              {/* Загрузка файла */}
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center">
                <input
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <p className="mt-2 text-sm text-gray-600">
                    <span className="font-medium text-blue-600 hover:text-blue-500">Загрузить файл</span> или перетащите сюда
                  </p>
                  <p className="text-xs text-gray-500">CSV или TXT файлы</p>
                </label>
              </div>

              {/* Текстовая область */}
              <div>
                <textarea
                  value={tradesText}
                  onChange={(e) => setTradesText(e.target.value)}
                  placeholder="Вставьте данные сделок здесь..."
                  rows={12}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm bg-white/50 focus:ring-2 focus:ring-gray-200 focus:border-gray-300 transition-all resize-none font-mono"
                />
              </div>

              {/* Кнопки */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={loadExample}
                  className="px-4 py-2 text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                >
                  Загрузить пример
                </button>
                <button
                  type="button"
                  onClick={() => setTradesText('')}
                  className="px-4 py-2 text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                >
                  Очистить
                </button>
              </div>

              {/* Основные кнопки */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => navigate('/margin')}
                  className="flex-1 px-6 py-3 text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={handleImport}
                  disabled={loading || !tradesText.trim()}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Импорт...' : 'Импортировать'}
                </button>
              </div>
            </div>
          </div>

          {/* Предварительный просмотр */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border-0 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100/50">
              <h4 className="text-lg font-medium text-gray-800">Предварительный просмотр</h4>
            </div>

            <div className="px-6 py-6">
              {/* Уведомления */}
              {error && (
                <div className="bg-red-50/80 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
                  {error}
                </div>
              )}

              {success && (
                <div className="bg-green-50/80 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm">
                  {success}
                </div>
              )}

              {/* Парсинг данных */}
              {tradesText.trim() && (
                <div>
                  {(() => {
                    try {
                      const parsedTrades = parseTrades(tradesText);
                      const totalValue = parsedTrades.reduce((sum, trade) => 
                        sum + (trade.entryPrice * trade.quantity), 0
                      );
                      const closedCount = parsedTrades.filter(t => t.exitDate && t.exitPrice).length;

                      return (
                        <div className="space-y-4">
                          {/* Сводка */}
                          <div className="bg-gray-50/80 rounded-lg p-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-gray-600">Сделок:</span>
                                <div className="font-medium text-gray-800">{parsedTrades.length}</div>
                                {closedCount > 0 && (
                                  <div className="text-xs text-green-600 mt-1">
                                    {closedCount} будут закрыты
                                  </div>
                                )}
                              </div>
                              <div>
                                <span className="text-gray-600">Общая стоимость:</span>
                                <div className="font-medium text-gray-800">{formatCurrency(totalValue)}</div>
                              </div>
                            </div>
                          </div>

                          {/* Список сделок */}
                          <div className="max-h-80 overflow-y-auto space-y-2">
                            {parsedTrades.map((trade, index) => (
                              <div key={index} className="bg-gray-50/50 rounded-lg p-3 text-sm">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <div className="font-medium text-gray-800">
                                      {trade.symbol}
                                      {trade.exitDate && trade.exitPrice && (
                                        <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                                          Будет закрыта
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-gray-600">
                                      {trade.quantity} × {formatCurrency(trade.entryPrice)}
                                      {trade.exitPrice && (
                                        <span className="text-green-600">
                                          {' → '}{formatCurrency(trade.exitPrice)}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-purple-600 text-xs">
                                      {trade.marginAmount}% маржа
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="font-medium text-gray-800">
                                      {formatCurrency(trade.entryPrice * trade.quantity)}
                                    </div>
                                    <div className="text-gray-500 text-xs">
                                      {trade.entryDate}
                                      {trade.exitDate && (
                                        <span> → {trade.exitDate}</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                {trade.notes && (
                                  <div className="text-gray-600 text-xs mt-1 italic">
                                    {trade.notes}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    } catch (err) {
                      return (
                        <div className="bg-yellow-50/80 border border-yellow-200 rounded-lg p-4">
                          <div className="flex items-start">
                            <svg className="w-5 h-5 text-yellow-400 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            <div>
                              <h5 className="text-sm font-medium text-yellow-800 mb-1">Ошибка формата</h5>
                              <p className="text-xs text-yellow-700">{err.message}</p>
                            </div>
                          </div>
                        </div>
                      );
                    }
                  })()}
                </div>
              )}

              {!tradesText.trim() && (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100/80 rounded-full mb-4">
                    <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-700 mb-1">Введите данные</h3>
                  <p className="text-sm text-gray-400 max-w-md mx-auto">
                    Вставьте данные сделок в указанном формате или загрузите пример
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MarginBulkImport; 