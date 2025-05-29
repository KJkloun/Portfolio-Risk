import React from 'react';

/**
 * Универсальная фиолетовая кнопка с hover-эффектом
 */
export default function Button({ 
  children, 
  className = '', 
  variant = 'primary', // primary, secondary, outline, danger
  size = 'md', // sm, md, lg
  ...props 
}) {
  const baseClasses = "font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500";
  
  const getVariantClasses = () => {
    switch (variant) {
      case 'primary':
        return 'bg-purple-600 text-white hover:bg-purple-700 focus:ring-purple-500 border-transparent';
      case 'secondary':
        return 'bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-purple-500 border-transparent';
      case 'outline':
        return 'bg-white text-gray-700 hover:bg-gray-50 focus:ring-purple-500 border-gray-300';
      case 'danger':
        return 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 border-transparent';
      default:
        return 'bg-purple-600 text-white hover:bg-purple-700 focus:ring-purple-500 border-transparent';
    }
  };
  
  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2",
    lg: "px-5 py-2.5 text-lg"
  };
  
  const classes = `${baseClasses} ${getVariantClasses()} ${sizes[size]} ${className}`;
  
  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
} 