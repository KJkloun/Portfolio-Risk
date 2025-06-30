import { useState } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { usePortfolio } from '../contexts/PortfolioContext';

// Функция для парсинга различных форматов дат
const parseFlexibleDate = (dateString) => {
  if (!dateString) return null;
  
  // Убираем лишние пробелы и приводим к строке
  const cleanDate = String(dateString).trim();
  if (!cleanDate) return null;
  
  // Попробуем различные форматы
  const dateFormats = [
    // ISO формат: 2023-05-02
    /^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})$/,
    // Европейский формат: 02.05.2023, 02/05/2023, 02-05-2023
    /^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})$/,
    // Американский формат: 05/02/2023, 05-02-2023, 05.02.2023
    /^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})$/,
  ];
  
  // Проверяем ISO формат (YYYY-MM-DD)
  const isoMatch = cleanDate.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // Проверяем европейский формат (DD.MM.YYYY, DD/MM/YYYY, DD-MM-YYYY)
  const euMatch = cleanDate.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})$/);
  if (euMatch) {
    const [, day, month, year] = euMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // Попробуем стандартный парсер Date для других форматов
  try {
    const parsedDate = new Date(cleanDate);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate.toISOString().split('T')[0]; // YYYY-MM-DD
    }
  } catch (e) {
    console.warn('Не удалось распарсить дату:', cleanDate);
  }
  
  return null;
};

function BulkImport() {
  const { currentPortfolio } = usePortfolio();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [preview, setPreview] = useState([]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError('');
    setSuccess('');
    
    // Preview file contents
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheet = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheet];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        // Skip header row and take up to 5 rows for preview
        const previewData = jsonData.slice(1, 6);
        setPreview(previewData);
      } catch (err) {
        console.error("File reading error:", err);
        setError('Ошибка при чтении файла. Убедитесь, что файл имеет правильный формат.');
      }
    };
    reader.onerror = (err) => {
      console.error("FileReader error:", err);
      setError('Ошибка при чтении файла.');
    };
    reader.readAsBinaryString(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Пожалуйста, выберите файл для импорта');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const data = evt.target.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const firstSheet = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheet];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          
          // Обрабатываем даты и автозакрытие сделок
          const processedTrades = jsonData.map(trade => {
            const processedTrade = { ...trade };
            
            // Обрабатываем дату входа
            if (trade.entryDate) {
              processedTrade.entryDate = parseFlexibleDate(trade.entryDate);
            }
            
            // Обрабатываем дату выхода и автозакрытие
            if (trade.exitDate) {
              processedTrade.exitDate = parseFlexibleDate(trade.exitDate);
              
              // Если есть дата выхода, но нет цены выхода, попробуем взять из entryPrice
              if (processedTrade.exitDate && !processedTrade.exitPrice && trade.exitPrice) {
                processedTrade.exitPrice = trade.exitPrice;
              }
            }
            
            return processedTrade;
          });
          
          console.log("Sending processed data to server:", { trades: processedTrades });
          
          // Send data to server
          const response = await axios.post('/api/trades/bulk-import', { trades: processedTrades }, {
            headers: currentPortfolio?.id ? {
              'X-Portfolio-ID': currentPortfolio.id
            } : {}
          });
          console.log("Server response:", response.data);
          setSuccess(`${response.data.importedCount} сделок успешно импортировано`);
          setFile(null);
          setPreview([]);
          document.getElementById('file-upload').value = '';
        } catch (err) {
          console.error("File processing error:", err);
          setError('Ошибка при обработке файла. Убедитесь, что файл имеет правильный формат.');
        }
      };
      reader.onerror = (err) => {
        console.error("FileReader error:", err);
        setError('Ошибка при чтении файла.');
      };
      reader.readAsBinaryString(file);
    } catch (err) {
      console.error("Upload error:", err);
      const errorMessage = err.response?.data?.message || 'Не удалось импортировать сделки';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    // Create template workbook
    const ws = XLSX.utils.aoa_to_sheet([
      ['symbol', 'entryPrice', 'quantity', 'entryDate', 'marginAmount', 'notes', 'exitDate', 'exitPrice'],
      ['GAZP', '115.00', '10000', '2023-05-02', '23', 'Пример записи ISO формат', '', ''],
      ['SBER', '240.50', '5000', '15.04.2023', '23', 'Пример европейский формат', '20.05.2023', '255.30'],
      ['AAPL', '150.25', '100', '04/15/2023', '20', 'Пример американский формат', '05/20/2023', '160.50'],
      ['MSFT', '280.75', '50', '15-04-2023', '18', 'Формат с дефисами', '20-05-2023', '290.25'],
    ]);
    
    // Set column widths
    const wscols = [
      { wch: 10 }, // symbol
      { wch: 15 }, // entryPrice
      { wch: 12 }, // quantity
      { wch: 15 }, // entryDate
      { wch: 15 }, // marginAmount
      { wch: 30 }, // notes
      { wch: 15 }, // exitDate
      { wch: 15 }, // exitPrice
    ];
    ws['!cols'] = wscols;
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Сделки');
    
    // Generate Excel file and save
    XLSX.writeFile(wb, 'template_trades.xlsx');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-2xl font-medium text-gray-900 mb-8">Массовый импорт сделок</h1>
        
        {/* File Upload Card */}
        <div className="bg-white rounded-lg p-6 border border-gray-200 mb-6">
          <div className="mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-3">Выберите файл для импорта</h2>
            <div 
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:bg-gray-50 transition-colors cursor-pointer"
              onClick={() => document.getElementById('file-upload').click()}
            >
              <div className="flex flex-col items-center justify-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span className="mt-2 block text-sm font-medium text-gray-700">
                  {file ? file.name : 'Нажмите для выбора файла'}
                </span>
                <span className="mt-1 block text-xs text-gray-500">
                  Поддерживаемые форматы: XLSX, XLS, CSV
                </span>
                <input
                  id="file-upload"
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            </div>
          </div>
          
          {preview.length > 0 && (
            <div className="mb-6">
              <h3 className="text-md font-medium text-gray-900 mb-3">Предпросмотр данных:</h3>
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <tbody className="bg-white divide-y divide-gray-200">
                    {preview.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {row.map((cell, cellIndex) => (
                          <td key={cellIndex} className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-500 mt-2">Показаны первые {preview.length} строк из файла</p>
            </div>
          )}
          
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
            <button 
              onClick={downloadTemplate}
              className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-gray-400"
            >
              Скачать шаблон
            </button>
            
            <button
              onClick={handleUpload}
              disabled={loading || !file}
              className={`w-full sm:w-auto py-2 px-6 rounded-md text-sm font-medium ${
                loading || !file
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gray-700 text-white hover:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-gray-400'
              }`}
            >
              {loading ? 'Импорт...' : 'Импортировать сделки'}
            </button>
          </div>
        </div>
        
        {/* Instructions Card */}
        <div className="bg-white rounded-lg p-6 border border-gray-200 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Инструкция</h2>
          <p className="text-sm text-gray-600 mb-4">
            Для импорта сделок загрузите файл Excel (.xlsx) или CSV в указанном формате. 
            Файл должен содержать следующие столбцы:
          </p>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Столбец</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Описание</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Обязательный</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr>
                  <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">symbol</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">Тикер акции</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-green-600">Да</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">entryPrice</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">Цена входа</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-green-600">Да</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">quantity</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">Количество</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-green-600">Да</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">entryDate</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">Дата входа (поддерживаются форматы: ГГГГ-ММ-ДД, ДД.ММ.ГГГГ, ММ/ДД/ГГГГ, ДД-ММ-ГГГГ)</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-green-600">Да</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">marginAmount</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">Процентная ставка</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-green-600">Да</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">notes</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">Заметки</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">Нет</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">exitDate</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">Дата выхода для автозакрытия сделок (любой поддерживаемый формат)</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">Нет</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">exitPrice</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">Цена выхода (для закрытых сделок)</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">Нет</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-sm font-medium text-blue-800 mb-2">📅 Поддерживаемые форматы дат</h3>
            <div className="text-xs text-blue-700 grid grid-cols-2 gap-2">
              <div>• ISO: 2023-05-02</div>
              <div>• Европейский: 02.05.2023</div>
              <div>• Американский: 05/02/2023</div>
              <div>• С дефисами: 02-05-2023</div>
            </div>
            <p className="text-xs text-blue-600 mt-2">
              <strong>Автозакрытие:</strong> Если указана exitDate с exitPrice, сделка будет автоматически закрыта при импорте.
            </p>
          </div>
        </div>
        
        {/* Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}
        
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm">
            {success}
          </div>
        )}
      </div>
    </div>
  );
}

export default BulkImport; 