import React from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';

const Skeleton = ({ 
  width = '100%', 
  height = '20px', 
  className = '', 
  variant = 'default',
  animated = true,
  ...props 
}) => {
  const { isDark } = useTheme();

  const baseClasses = `rounded-md ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`;

  const variants = {
    default: '',
    text: 'h-4',
    title: 'h-6',
    avatar: 'rounded-full w-10 h-10',
    button: 'h-10 rounded-md',
    card: 'h-32 rounded-lg',
    image: 'aspect-video rounded-lg'
  };

  const style = {
    width,
    height: variant === 'avatar' ? undefined : height,
    ...props.style
  };

  const skeletonClasses = `${baseClasses} ${variants[variant]} ${className}`;

  if (animated) {
    return (
      <motion.div
        className={skeletonClasses}
        style={style}
        animate={{
          opacity: [0.4, 0.7, 0.4],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        {...props}
      />
    );
  }

  return (
    <div
      className={`${skeletonClasses} animate-pulse`}
      style={style}
      {...props}
    />
  );
};

// Компонент для группы skeleton элементов
export const SkeletonGroup = ({ children, className = '', ...props }) => {
  return (
    <div className={`space-y-3 ${className}`} {...props}>
      {children}
    </div>
  );
};

// Предустановленные skeleton компоненты
export const SkeletonText = ({ lines = 3, ...props }) => (
  <SkeletonGroup>
    {Array.from({ length: lines }, (_, i) => (
      <Skeleton
        key={i}
        variant="text"
        width={i === lines - 1 ? '70%' : '100%'}
        {...props}
      />
    ))}
  </SkeletonGroup>
);

export const SkeletonCard = ({ className = '', ...props }) => (
  <div className={`p-6 border rounded-lg ${className}`} {...props}>
    <SkeletonGroup>
      <Skeleton variant="title" width="60%" />
      <SkeletonText lines={2} />
      <div className="flex space-x-3 mt-4">
        <Skeleton variant="button" width="100px" />
        <Skeleton variant="button" width="80px" />
      </div>
    </SkeletonGroup>
  </div>
);

export const SkeletonTable = ({ rows = 5, columns = 4, ...props }) => (
  <div className="space-y-3" {...props}>
    {/* Header */}
    <div className="flex space-x-4">
      {Array.from({ length: columns }, (_, i) => (
        <Skeleton key={`header-${i}`} variant="text" width="150px" />
      ))}
    </div>
    {/* Rows */}
    {Array.from({ length: rows }, (_, rowIndex) => (
      <div key={`row-${rowIndex}`} className="flex space-x-4">
        {Array.from({ length: columns }, (_, colIndex) => (
          <Skeleton 
            key={`cell-${rowIndex}-${colIndex}`} 
            variant="text" 
            width={colIndex === 0 ? '100px' : '150px'} 
          />
        ))}
      </div>
    ))}
  </div>
);

export const SkeletonChart = ({ ...props }) => (
  <div className="space-y-4" {...props}>
    <Skeleton variant="title" width="200px" />
    <Skeleton variant="image" height="300px" />
    <div className="flex justify-center space-x-6">
      <div className="text-center">
        <Skeleton variant="text" width="60px" />
        <Skeleton variant="text" width="40px" className="mt-1" />
      </div>
      <div className="text-center">
        <Skeleton variant="text" width="60px" />
        <Skeleton variant="text" width="40px" className="mt-1" />
      </div>
      <div className="text-center">
        <Skeleton variant="text" width="60px" />
        <Skeleton variant="text" width="40px" className="mt-1" />
      </div>
    </div>
  </div>
);

export default Skeleton; 