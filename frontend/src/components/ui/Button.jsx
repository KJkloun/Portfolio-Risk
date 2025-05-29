import React from 'react';

/**
 * Reusable Button component with purple theme
 * Props:
 * - onClick: click handler
 * - disabled: disabled state
 * - className: additional Tailwind CSS classes
 * - children: button content
 * - variant: 'primary' (default) or 'danger'
 */
export default function Button({ onClick, disabled, className = '', variant = 'primary', children }) {
  const baseClasses = 'font-medium py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed';
  const variantClasses = variant === 'danger' 
    ? 'bg-red-600 hover:bg-red-700 text-white'
    : 'bg-purple-600 hover:bg-purple-700 text-white';
    
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses} ${className}`.trim()}
    >
      {children}
    </button>
  );
} 