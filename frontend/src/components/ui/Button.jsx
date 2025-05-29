import { themeClasses } from '../../styles/designSystem';

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  className = '',
  ...props
}) => {
  const baseClasses = `
    inline-flex items-center justify-center font-medium rounded-lg
    ${themeClasses.transition}
    ${themeClasses.interactive.focus}
    ${themeClasses.interactive.disabled}
  `;

  const variants = {
    primary: `
      bg-purple-600 dark:bg-purple-700 
      text-white 
      hover:bg-purple-700 dark:hover:bg-purple-600
      shadow-sm hover:shadow-md
    `,
    secondary: `
      ${themeClasses.background.secondary}
      ${themeClasses.text.primary}
      ${themeClasses.border.primary}
      border hover:shadow-sm
      ${themeClasses.interactive.hover}
    `,
    outline: `
      border border-purple-600 dark:border-purple-400
      text-purple-600 dark:text-purple-400
      hover:bg-purple-50 dark:hover:bg-purple-900/20
    `,
    ghost: `
      ${themeClasses.text.secondary}
      hover:bg-gray-100 dark:hover:bg-gray-800
    `,
    danger: `
      bg-red-600 dark:bg-red-700
      text-white
      hover:bg-red-700 dark:hover:bg-red-600
      shadow-sm hover:shadow-md
    `,
  };

  const sizes = {
    xs: 'px-2 py-1 text-xs',
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
    xl: 'px-8 py-4 text-lg',
  };

  const LoadingSpinner = () => (
    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
    
  return (
    <button
      className={`
        ${baseClasses}
        ${variants[variant]}
        ${sizes[size]}
        ${className}
      `.trim().replace(/\s+/g, ' ')}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <LoadingSpinner />}
      {children}
    </button>
  );
};

export default Button; 