import { themeClasses } from '../../styles/designSystem';

const Select = ({
  label,
  error,
  hint,
  required = false,
  size = 'md',
  className = '',
  id,
  children,
  ...props
}) => {
  const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;

  const baseClasses = `
    block w-full rounded-lg
    ${themeClasses.background.primary}
    ${themeClasses.text.primary}
    ${themeClasses.transition}
    ${themeClasses.interactive.focus}
    shadow-sm
    appearance-none
    bg-no-repeat bg-right
  `;

  // SVG для стрелки в кодированном виде
  const arrowIcon = `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`;

  const borderClasses = error 
    ? 'border-red-500 dark:border-red-400 focus:border-red-500 dark:focus:border-red-400'
    : `${themeClasses.border.primary} focus:border-purple-500 dark:focus:border-purple-400`;

  const sizes = {
    sm: 'px-3 py-1.5 pr-8 text-sm',
    md: 'px-3 py-2 pr-8 text-sm',
    lg: 'px-4 py-3 pr-10 text-base',
  };

  return (
    <div className="space-y-1">
      {label && (
        <label 
          htmlFor={selectId}
          className={`block text-sm font-medium ${themeClasses.text.primary}`}
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        <select
          id={selectId}
          className={`
            ${baseClasses}
            ${borderClasses}
            ${sizes[size]}
            border
            ${className}
          `.trim().replace(/\s+/g, ' ')}
          style={{ backgroundImage: arrowIcon, backgroundPosition: 'right 0.5rem center', backgroundSize: '1.5em 1.5em' }}
          {...props}
        >
          {children}
        </select>
      </div>
      
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      
      {hint && !error && (
        <p className={`text-sm ${themeClasses.text.tertiary}`}>
          {hint}
        </p>
      )}
    </div>
  );
};

export default Select; 