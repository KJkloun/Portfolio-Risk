import { themeClasses } from '../../styles/designSystem';

const Input = ({
  label,
  error,
  hint,
  required = false,
  size = 'md',
  className = '',
  id,
  ...props
}) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

  const baseClasses = `
    block w-full rounded-lg
    ${themeClasses.background.primary}
    ${themeClasses.text.primary}
    ${themeClasses.transition}
    ${themeClasses.interactive.focus}
    shadow-sm
  `;

  const borderClasses = error 
    ? 'border-red-500 dark:border-red-400 focus:border-red-500 dark:focus:border-red-400'
    : `${themeClasses.border.primary} focus:border-purple-500 dark:focus:border-purple-400`;

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-3 text-base',
  };

  return (
    <div className="space-y-1">
      {label && (
        <label 
          htmlFor={inputId}
          className={`block text-sm font-medium ${themeClasses.text.primary}`}
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <input
        id={inputId}
        className={`
          ${baseClasses}
          ${borderClasses}
          ${sizes[size]}
          border
          ${className}
        `.trim().replace(/\s+/g, ' ')}
        {...props}
      />
      
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

export default Input; 