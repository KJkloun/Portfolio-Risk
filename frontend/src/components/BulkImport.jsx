import { useState } from 'react';
import axios from 'axios';
import Papa from 'papaparse';
import { useNavigate } from 'react-router-dom';

// Импорт унифицированных компонентов и дизайн-системы
import { Card, Button, Badge } from './ui';
import { themeClasses } from '../styles/designSystem';

function BulkImport() {
  const navigate = useNavigate();
  const [csvData, setCsvData] = useState([]);
  const [previewData, setPreviewData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [fileName, setFileName] = useState('');

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setFileName(file.name);
    setError('');
    setSuccess('');

    Papa.parse(file, {
      complete: (results) => {
        console.log('Parsed CSV data:', results);
        
        if (results.errors.length > 0) {
          setError(`Ошибки при парсинге CSV: ${results.errors.map(e => e.message).join(', ')}`);
          return;
        }

        const data = results.data;
        
        // Удаляем пустые строки
        const filteredData = data.filter(row => 
          row.some(cell => cell && cell.toString().trim() !== '')
        );

        if (filteredData.length < 2) {
          setError('Файл должен содержать как минимум заголовки и одну строку данных');
          return;
        }

        setCsvData(filteredData);
        
        // Показать превью первых 5 строк
        const preview = filteredData.slice(0, Math.min(6, filteredData.length));
        setPreviewData(preview);
      },
      header: false,
      skipEmptyLines: true
    });
  };

  const validateData = (data) => {
    const errors = [];
    const headers = data[0];
    
    // Проверяем, что есть необходимые колонки
    const requiredColumns = ['symbol', 'entryPrice', 'quantity', 'marginAmount', 'entryDate'];
    const headerLower = headers.map(h => h.toLowerCase().trim());
    
    for (const required of requiredColumns) {
      if (!headerLower.includes(required.toLowerCase())) {
        errors.push(`Отсутствует обязательная колонка: ${required}`);
      }
    }

    // Проверяем данные в строках
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      
      // Находим индексы колонок
      const symbolIndex = headerLower.indexOf('symbol');
      const priceIndex = headerLower.indexOf('entryprice');
      const quantityIndex = headerLower.indexOf('quantity');
      const marginIndex = headerLower.indexOf('marginamount');
      const dateIndex = headerLower.indexOf('entrydate');

      if (symbolIndex !== -1 && (!row[symbolIndex] || row[symbolIndex].trim() === '')) {
        errors.push(`Строка ${i + 1}: Пустой символ акции`);
      }

      if (priceIndex !== -1 && (isNaN(parseFloat(row[priceIndex])) || parseFloat(row[priceIndex]) <= 0)) {
        errors.push(`Строка ${i + 1}: Некорректная цена входа`);
      }

      if (quantityIndex !== -1 && (isNaN(parseInt(row[quantityIndex])) || parseInt(row[quantityIndex]) <= 0)) {
        errors.push(`Строка ${i + 1}: Некорректное количество`);
      }

      if (marginIndex !== -1 && (isNaN(parseFloat(row[marginIndex])) || parseFloat(row[marginIndex]) <= 0)) {
        errors.push(`Строка ${i + 1}: Некорректная процентная ставка`);
      }

      if (dateIndex !== -1 && row[dateIndex] && isNaN(Date.parse(row[dateIndex]))) {
        errors.push(`Строка ${i + 1}: Некорректная дата (используйте формат YYYY-MM-DD)`);
      }
    }

    return errors;
  };

  const handleImport = async () => {
    if (csvData.length === 0) {
      setError('Сначала загрузите CSV файл');
      return;
    }

    // Валидация данных
    const validationErrors = validateData(csvData);
    if (validationErrors.length > 0) {
      setError(`Ошибки валидации:\n${validationErrors.join('\n')}`);
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const headers = csvData[0];
      const headerLower = headers.map(h => h.toLowerCase().trim());
      
      // Создаем массив объектов для отправки
      const trades = csvData.slice(1).map(row => {
        const trade = {};
        
        headerLower.forEach((header, index) => {
          const value = row[index];
          
          switch (header) {
            case 'symbol':
              trade.symbol = value ? value.toString().trim().toUpperCase() : '';
              break;
            case 'entryprice':
              trade.entryPrice = parseFloat(value) || 0;
              break;
            case 'quantity':
              trade.quantity = parseInt(value) || 0;
              break;
            case 'marginamount':
              trade.marginAmount = parseFloat(value) || 0;
              break;
            case 'entrydate':
              if (value && !isNaN(Date.parse(value))) {
                trade.entryDate = new Date(value).toISOString().split('T')[0];
              } else {
                trade.entryDate = new Date().toISOString().split('T')[0];
              }
              break;
            case 'notes':
              trade.notes = value ? value.toString().trim() : '';
              break;
            default:
              // Игнорируем неизвестные колонки
              break;
          }
        });
        
        return trade;
      });

      console.log('Отправляем сделки:', trades);

      // Отправляем данные на сервер
      const response = await axios.post('/api/trades/bulk-import', { trades });
      
      console.log('Ответ сервера:', response.data);
      
      setSuccess(`Успешно импортировано ${trades.length} сделок`);
      setCsvData([]);
      setPreviewData([]);
      setFileName('');
      
      // Очищаем поле файла
      const fileInput = document.getElementById('csvFile');
      if (fileInput) fileInput.value = '';
      
    } catch (err) {
      console.error('Ошибка импорта:', err);
      setError(err.response?.data?.message || 'Произошла ошибка при импорте данных');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`min-h-screen ${themeClasses.background.secondary} ${themeClasses.transition}`}>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className={`text-2xl font-medium ${themeClasses.text.primary} mb-2`}>
            Импорт сделок из CSV
          </h1>
          <p className={`${themeClasses.text.secondary}`}>
            Загрузите CSV файл с данными о сделках для массового импорта
          </p>
        </div>

        {/* Инструкции */}
        <Card className="mb-6">
          <h2 className={`text-lg font-medium ${themeClasses.text.primary} mb-4`}>
            Формат CSV файла
          </h2>
          <div className={`${themeClasses.text.secondary} space-y-2 text-sm`}>
            <p>CSV файл должен содержать следующие колонки (регистр не важен):</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li><strong>symbol</strong> - Тикер акции (например: SBER, GAZP)</li>
              <li><strong>entryPrice</strong> - Цена входа (число)</li>
              <li><strong>quantity</strong> - Количество акций (целое число)</li>
              <li><strong>marginAmount</strong> - Процентная ставка (число от 1 до 100)</li>
              <li><strong>entryDate</strong> - Дата входа в формате YYYY-MM-DD (необязательно)</li>
              <li><strong>notes</strong> - Заметки (необязательно)</li>
            </ul>
            <div className={`mt-4 p-3 ${themeClasses.background.tertiary} rounded-lg`}>
              <p className="font-medium mb-2">Пример CSV файла:</p>
              <code className={`text-xs ${themeClasses.text.primary}`}>
                symbol,entryPrice,quantity,marginAmount,entryDate,notes<br/>
                SBER,250.50,10,23.5,2024-01-15,Покупка банковских акций<br/>
                GAZP,180.00,20,22.0,2024-01-16,Инвестиция в энергетику
              </code>
            </div>
          </div>
        </Card>

        {/* Загрузка файла */}
        <Card className="mb-6">
          <h2 className={`text-lg font-medium ${themeClasses.text.primary} mb-4`}>
            Загрузка файла
          </h2>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="csvFile" className={`block text-sm font-medium ${themeClasses.text.primary} mb-2`}>
                Выберите CSV файл
              </label>
              <input
                id="csvFile"
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className={`block w-full text-sm ${themeClasses.text.secondary} file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 dark:file:bg-purple-900/30 dark:file:text-purple-300 dark:hover:file:bg-purple-800/30 ${themeClasses.transition}`}
              />
            </div>
            
            {fileName && (
              <div className="flex items-center gap-2">
                <Badge variant="info">{fileName}</Badge>
                <span className={`text-sm ${themeClasses.text.tertiary}`}>
                  {csvData.length > 0 ? `${csvData.length - 1} строк данных` : 'Обрабатывается...'}
                </span>
              </div>
            )}
          </div>
        </Card>

        {/* Превью данных */}
        {previewData.length > 0 && (
          <Card className="mb-6">
            <h2 className={`text-lg font-medium ${themeClasses.text.primary} mb-4`}>
              Превью данных
            </h2>
            
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className={`${themeClasses.background.tertiary}`}>
                    {previewData[0].map((header, index) => (
                      <th key={index} className={`px-3 py-2 text-left text-xs font-medium ${themeClasses.text.secondary} uppercase tracking-wider`}>
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {previewData.slice(1).map((row, rowIndex) => (
                    <tr key={rowIndex} className={rowIndex % 2 === 0 ? themeClasses.background.primary : themeClasses.background.secondary}>
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex} className={`px-3 py-2 text-sm ${themeClasses.text.primary}`}>
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {csvData.length > 6 && (
              <p className={`mt-2 text-sm ${themeClasses.text.tertiary}`}>
                ... и еще {csvData.length - 6} строк
              </p>
            )}
          </Card>
        )}

        {/* Сообщения */}
        {error && (
          <Card variant="default" className="mb-6 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30">
            <div className="text-red-700 dark:text-red-300 text-sm whitespace-pre-line">
              {error}
            </div>
          </Card>
        )}

        {success && (
          <Card variant="default" className="mb-6 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/30">
            <div className="text-green-700 dark:text-green-300 text-sm">
              {success}
            </div>
          </Card>
        )}

        {/* Кнопки действий */}
        <div className="flex gap-4">
          <Button
            variant="secondary"
            onClick={() => navigate('/')}
          >
            Вернуться к списку
          </Button>
          
          <Button
            variant="primary"
            onClick={handleImport}
            disabled={csvData.length === 0 || isLoading}
            loading={isLoading}
          >
            {isLoading ? 'Импортирование...' : `Импортировать ${csvData.length > 0 ? csvData.length - 1 : 0} сделок`}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default BulkImport; 