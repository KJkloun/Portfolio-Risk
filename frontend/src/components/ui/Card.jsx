import { themeClasses } from '../../styles/designSystem';

const Card = ({ 
  children, 
  className = '', 
  variant = 'default',
  padding = 'lg',
  hover = false,
  ...props 
}) => {
  const variants = {
    default: `${themeClasses.background.primary} ${themeClasses.border.primary}`,
    secondary: `${themeClasses.background.secondary} ${themeClasses.border.primary}`,
    tertiary: `${themeClasses.background.tertiary} ${themeClasses.border.secondary}`,
  };

  const paddings = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
    xl: 'p-8',
  };

  const hoverEffect = hover ? 'hover:shadow-lg hover:-translate-y-0.5 cursor-pointer' : '';

  return (
    <div
      className={`
        ${variants[variant]}
        ${paddings[padding]}
        ${themeClasses.transition}
        ${hoverEffect}
        border rounded-lg shadow-sm
        ${className}
      `.trim().replace(/\s+/g, ' ')}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card; 