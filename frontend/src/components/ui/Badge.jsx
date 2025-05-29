import { themeClasses } from '../../styles/designSystem';

const Badge = ({
  children,
  variant = 'default',
  size = 'md',
  className = '',
  ...props
}) => {
  const baseClasses = `
    inline-flex items-center font-medium rounded-full
    ${themeClasses.transition}
  `;

  const variants = {
    default: `
      bg-gray-100 dark:bg-gray-800 
      text-gray-800 dark:text-gray-200
    `,
    primary: `
      bg-purple-100 dark:bg-purple-900/30
      text-purple-800 dark:text-purple-300
    `,
    success: `
      bg-green-100 dark:bg-green-900/30
      text-green-800 dark:text-green-300
    `,
    warning: `
      bg-yellow-100 dark:bg-yellow-900/30
      text-yellow-800 dark:text-yellow-300
    `,
    error: `
      bg-red-100 dark:bg-red-900/30
      text-red-800 dark:text-red-300
    `,
    info: `
      bg-blue-100 dark:bg-blue-900/30
      text-blue-800 dark:text-blue-300
    `,
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  };

  return (
    <span
      className={`
        ${baseClasses}
        ${variants[variant]}
        ${sizes[size]}
        ${className}
      `.trim().replace(/\s+/g, ' ')}
      {...props}
    >
      {children}
    </span>
  );
};

export default Badge; 