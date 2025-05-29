import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import { useTheme } from '../../contexts/ThemeContext';

// Популярные российские тикеры для автодополнения
const POPULAR_STOCKS = [
  { value: 'SBER', label: 'SBER - Сбербанк' },
  { value: 'GAZP', label: 'GAZP - Газпром' },
  { value: 'LKOH', label: 'LKOH - Лукойл' },
  { value: 'YNDX', label: 'YNDX - Яндекс' },
  { value: 'ROSN', label: 'ROSN - Роснефть' },
  { value: 'NVTK', label: 'NVTK - Новатэк' },
  { value: 'TCSG', label: 'TCSG - TCS Group' },
  { value: 'PLZL', label: 'PLZL - Полюс' },
  { value: 'GMKN', label: 'GMKN - ГМК Норникель' },
  { value: 'MGNT', label: 'MGNT - Магнит' },
  { value: 'MTSS', label: 'MTSS - МТС' },
  { value: 'RTKM', label: 'RTKM - Ростелеком' },
  { value: 'VTBR', label: 'VTBR - ВТБ' },
  { value: 'AFLT', label: 'AFLT - Аэрофлот' },
  { value: 'ALRS', label: 'ALRS - АЛРОСА' },
  { value: 'CHMF', label: 'CHMF - Северсталь' },
  { value: 'NLMK', label: 'NLMK - НЛМК' },
  { value: 'MAGN', label: 'MAGN - ММК' },
  { value: 'TATN', label: 'TATN - Татнефть' },
  { value: 'SNGS', label: 'SNGS - Сургутнефтегаз' }
];

const StockSelect = ({ 
  value, 
  onChange, 
  placeholder = "Введите тикер акции...",
  isRequired = false,
  existingStocks = [],
  ...props 
}) => {
  const { isDark } = useTheme();
  const [inputValue, setInputValue] = useState('');
  const [allOptions, setAllOptions] = useState(POPULAR_STOCKS);

  // Добавляем уже существующие акции в опции
  useEffect(() => {
    const existingOptions = existingStocks
      .filter(stock => !POPULAR_STOCKS.some(popular => popular.value === stock))
      .map(stock => ({ value: stock, label: stock }));
    
    setAllOptions([...POPULAR_STOCKS, ...existingOptions]);
  }, [existingStocks]);

  // Кастомная функция фильтрации (нечувствительная к регистру, поиск по тикеру и названию)
  const filterOption = (option, inputValue) => {
    if (!inputValue) return true;
    const searchValue = inputValue.toLowerCase();
    return (
      option.value.toLowerCase().includes(searchValue) ||
      option.label.toLowerCase().includes(searchValue)
    );
  };

  // Кастомные стили для темной темы
  const customStyles = {
    control: (provided, state) => ({
      ...provided,
      backgroundColor: isDark ? '#374151' : '#ffffff',
      borderColor: state.isFocused 
        ? (isDark ? '#8b5cf6' : '#7c3aed')
        : (isDark ? '#4b5563' : '#d1d5db'),
      boxShadow: state.isFocused 
        ? `0 0 0 1px ${isDark ? '#8b5cf6' : '#7c3aed'}` 
        : 'none',
      '&:hover': {
        borderColor: isDark ? '#6b7280' : '#9ca3af'
      },
      minHeight: '42px'
    }),
    input: (provided) => ({
      ...provided,
      color: isDark ? '#f9fafb' : '#111827',
    }),
    singleValue: (provided) => ({
      ...provided,
      color: isDark ? '#f9fafb' : '#111827',
    }),
    placeholder: (provided) => ({
      ...provided,
      color: isDark ? '#9ca3af' : '#6b7280',
    }),
    menu: (provided) => ({
      ...provided,
      backgroundColor: isDark ? '#374151' : '#ffffff',
      border: `1px solid ${isDark ? '#4b5563' : '#d1d5db'}`,
      boxShadow: isDark 
        ? '0 10px 15px -3px rgba(0, 0, 0, 0.3)' 
        : '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isFocused 
        ? (isDark ? '#4b5563' : '#f3f4f6')
        : (isDark ? '#374151' : '#ffffff'),
      color: isDark ? '#f9fafb' : '#111827',
      '&:hover': {
        backgroundColor: isDark ? '#4b5563' : '#f3f4f6'
      }
    }),
    menuList: (provided) => ({
      ...provided,
      maxHeight: '200px'
    })
  };

  const handleChange = (selectedOption) => {
    onChange(selectedOption ? selectedOption.value : '');
  };

  const handleInputChange = (newInputValue, actionMeta) => {
    if (actionMeta.action === 'input-change') {
      setInputValue(newInputValue);
      
      // Если ввели тикер который не в списке, добавляем его как опцию
      if (newInputValue && newInputValue.length >= 2) {
        const upperValue = newInputValue.toUpperCase();
        const existsInOptions = allOptions.some(opt => opt.value === upperValue);
        
        if (!existsInOptions) {
          const newOption = { value: upperValue, label: upperValue };
          setAllOptions(prev => [newOption, ...prev]);
        }
      }
    }
  };

  const selectedValue = allOptions.find(option => option.value === value) || null;

  return (
    <div className="relative">
      <Select
        {...props}
        value={selectedValue}
        onChange={handleChange}
        onInputChange={handleInputChange}
        inputValue={inputValue}
        options={allOptions}
        filterOption={filterOption}
        placeholder={placeholder}
        isClearable
        isSearchable
        styles={customStyles}
        noOptionsMessage={({ inputValue }) => 
          inputValue ? `Нет результатов для "${inputValue}"` : 'Введите тикер для поиска'
        }
        loadingMessage={() => 'Загрузка...'}
        className="react-select-container"
        classNamePrefix="react-select"
      />
      
      {/* Подсказка для быстрого ввода */}
      <div className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
        💡 Начните вводить тикер или название компании
      </div>
    </div>
  );
};

export default StockSelect; 