import { useState } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import * as XLSX from 'xlsx';

function BulkImport() {
  const { t } = useTranslation();
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
        setError(t('import.error', 'Ошибка при чтении файла. Убедитесь, что файл имеет правильный формат.'));
      }
    };
    reader.onerror = (err) => {
      console.error("FileReader error:", err);
      setError(t('import.error', 'Ошибка при чтении файла.'));
    };
    reader.readAsBinaryString(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) {
      setError(t('import.selectFileError', 'Пожалуйста, выберите файл для импорта'));
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
          
          console.log("Sending data to server:", { trades: jsonData });
          
          // Send data to server
          const response = await axios.post('/api/trades/bulk-import', { trades: jsonData });
          console.log("Server response:", response.data);
          setSuccess(t('import.successMessage', `${response.data.importedCount} сделок успешно импортировано`));
          setFile(null);
          setPreview([]);
          document.getElementById('file-upload').value = '';
        } catch (err) {
          console.error("File processing error:", err);
          setError(t('import.processingError', 'Ошибка при обработке файла. Убедитесь, что файл имеет правильный формат.'));
        }
      };
      reader.onerror = (err) => {
        console.error("FileReader error:", err);
        setError(t('import.error', 'Ошибка при чтении файла.'));
      };
      reader.readAsBinaryString(file);
    } catch (err) {
      console.error("Upload error:", err);
      const errorMessage = err.response?.data?.message || t('import.uploadError', 'Не удалось импортировать сделки');
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    // Create template workbook
    const ws = XLSX.utils.aoa_to_sheet([
      ['symbol', 'entryPrice', 'quantity', 'entryDate', 'marginAmount', 'notes', 'exitDate', 'exitPrice'],
      ['GAZP', '115.00', '10000', '2023-05-02', '23', 'Пример записи', '', ''],
      ['SBER', '240.50', '5000', '2023-04-15', '23', 'Тест', '2023-05-20', '255.30'],
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
    <div className="min-h-screen bg-gray-50 dark:bg-dark-900 transition-colors duration-300">
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-2xl font-medium text-gray-900 dark:text-gray-100 mb-8">
          {t('import.title', 'Массовый импорт сделок')}
        </h1>
        
        {/* Success message */}
        {success && (
          <div className="notification-success mb-6">
            {success}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="notification-error mb-6">
            {error}
          </div>
        )}
        
        {/* File Upload Card */}
        <div className="bank-card mb-6">
          <div className="bank-card-body">
            <div className="mb-6">
              <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">
                {t('import.selectFile', 'Выберите файл для импорта')}
              </h2>
              <div 
                className="border-2 border-dashed border-gray-300 dark:border-dark-600 rounded-lg p-8 text-center hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors cursor-pointer"
                onClick={() => document.getElementById('file-upload').click()}
              >
                <div className="flex flex-col items-center justify-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span className="mt-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {file ? file.name : t('import.clickToSelect', 'Нажмите для выбора файла')}
                  </span>
                  <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">
                    {t('import.supportedFormats', 'Поддерживаемые форматы: XLSX, XLS, CSV')}
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
                <h3 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-3">
                  {t('import.preview', 'Предпросмотр данных')}:
                </h3>
                <div className="overflow-x-auto border border-gray-200 dark:border-dark-600 rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-600">
                    <tbody className="bg-white dark:bg-dark-800 divide-y divide-gray-200 dark:divide-dark-600">
                      {preview.map((row, rowIndex) => (
                        <tr key={rowIndex}>
                          {row.map((cell, cellIndex) => (
                            <td key={cellIndex} className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  {t('import.previewNote', `Показаны первые ${preview.length} строк из файла`)}
                </p>
              </div>
            )}
            
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
              <button 
                onClick={downloadTemplate}
                className="bank-button-secondary"
              >
                {t('import.downloadTemplate', 'Скачать шаблон')}
              </button>
              
              <button
                onClick={handleUpload}
                disabled={loading || !file}
                className={`bank-button-primary ${
                  loading || !file
                    ? 'opacity-50 cursor-not-allowed'
                    : ''
                }`}
              >
                {loading ? t('import.processing', 'Импорт...') : t('import.uploadFile', 'Импортировать сделки')}
              </button>
            </div>
          </div>
        </div>
        
        {/* Instructions Card */}
        <div className="bank-card mb-6">
          <div className="bank-card-body">
            <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
              {t('import.instructions', 'Инструкции по импорту')}
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-md font-medium text-gray-800 dark:text-gray-200 mb-2">
                  {t('import.fileFormat', 'Формат файла')}:
                </h3>
                <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>{t('import.formatNote1', 'Файл должен содержать следующие колонки: symbol, entryPrice, quantity, entryDate, marginAmount, notes, exitDate, exitPrice')}</li>
                  <li>{t('import.formatNote2', 'Обязательные поля: symbol, entryPrice, quantity, entryDate, marginAmount')}</li>
                  <li>{t('import.formatNote3', 'Даты должны быть в формате YYYY-MM-DD (например: 2023-05-15)')}</li>
                  <li>{t('import.formatNote4', 'Цены и количество должны быть числовыми значениями')}</li>
                </ul>
              </div>
              <div>
                <h3 className="text-md font-medium text-gray-800 dark:text-gray-200 mb-2">
                  {t('import.tips', 'Рекомендации')}:
                </h3>
                <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>{t('import.tip1', 'Скачайте шаблон и используйте его как основу для ваших данных')}</li>
                  <li>{t('import.tip2', 'Убедитесь, что все обязательные поля заполнены')}</li>
                  <li>{t('import.tip3', 'Для открытых позиций оставьте поля exitDate и exitPrice пустыми')}</li>
                  <li>{t('import.tip4', 'Система автоматически пропустит строки с некорректными данными')}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BulkImport; 