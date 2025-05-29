import React from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';

const Progress = ({
  value = 0,
  max = 100,
  size = 'md',
  variant = 'primary',
  showValue = false,
  animated = true,
  className = '',
  ...props
}) => {
  const { isDark } = useTheme();
  
  // Нормализация значения от 0 до 100
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  // Размеры
  const sizes = {
    xs: 'h-1',
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4',
    xl: 'h-6'
  };

  // Цветовые варианты
  const variants = {
    primary: {
      bg: isDark ? 'bg-purple-600' : 'bg-purple-500',
      track: isDark ? 'bg-gray-700' : 'bg-gray-200'
    },
    success: {
      bg: 'bg-green-500',
      track: isDark ? 'bg-gray-700' : 'bg-gray-200'
    },
    warning: {
      bg: 'bg-yellow-500',
      track: isDark ? 'bg-gray-700' : 'bg-gray-200'
    },
    danger: {
      bg: 'bg-red-500',
      track: isDark ? 'bg-gray-700' : 'bg-gray-200'
    },
    info: {
      bg: 'bg-blue-500',
      track: isDark ? 'bg-gray-700' : 'bg-gray-200'
    }
  };

  const currentVariant = variants[variant] || variants.primary;

  return (
    <div className={`relative ${className}`} {...props}>
      {/* Track */}
      <div className={`
        w-full ${sizes[size]} 
        ${currentVariant.track} 
        rounded-full overflow-hidden
      `}>
        {/* Progress Bar */}
        {animated ? (
          <motion.div
            className={`h-full ${currentVariant.bg} rounded-full`}
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ 
              duration: 0.8, 
              ease: "easeOut" 
            }}
          />
        ) : (
          <div
            className={`h-full ${currentVariant.bg} rounded-full transition-all duration-300`}
            style={{ width: `${percentage}%` }}
          />
        )}
      </div>

      {/* Value display */}
      {showValue && (
        <div className={`
          absolute right-0 top-0 mt-1 text-xs 
          ${isDark ? 'text-gray-300' : 'text-gray-600'}
        `}>
          {Math.round(percentage)}%
        </div>
      )}
    </div>
  );
};

// Круговой прогресс индикатор
export const CircularProgress = ({
  value = 0,
  max = 100,
  size = 'md',
  variant = 'primary',
  showValue = true,
  strokeWidth = 4,
  className = '',
  ...props
}) => {
  const { isDark } = useTheme();
  
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  // Размеры
  const sizes = {
    sm: { width: 40, height: 40 },
    md: { width: 60, height: 60 },
    lg: { width: 80, height: 80 },
    xl: { width: 120, height: 120 }
  };

  const { width, height } = sizes[size] || sizes.md;
  const radius = (width - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  // Цвета
  const colors = {
    primary: isDark ? '#8b5cf6' : '#7c3aed',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#3b82f6'
  };

  const color = colors[variant] || colors.primary;
  const trackColor = isDark ? '#374151' : '#e5e7eb';

  return (
    <div className={`relative inline-flex ${className}`} {...props}>
      <svg
        width={width}
        height={height}
        className="transform -rotate-90"
      >
        {/* Track */}
        <circle
          cx={width / 2}
          cy={height / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        
        {/* Progress */}
        <motion.circle
          cx={width / 2}
          cy={height / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={strokeDasharray}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </svg>

      {/* Value */}
      {showValue && (
        <div className={`
          absolute inset-0 flex items-center justify-center
          text-sm font-medium
          ${isDark ? 'text-white' : 'text-gray-900'}
        `}>
          {Math.round(percentage)}%
        </div>
      )}
    </div>
  );
};

// Индикатор прогресса с шагами
export const StepProgress = ({
  currentStep = 0,
  totalSteps = 3,
  variant = 'primary',
  showLabels = false,
  labels = [],
  className = '',
  ...props
}) => {
  const { isDark } = useTheme();

  const colors = {
    primary: {
      completed: isDark ? 'bg-purple-600' : 'bg-purple-500',
      current: isDark ? 'bg-purple-400' : 'bg-purple-300',
      pending: isDark ? 'bg-gray-600' : 'bg-gray-300'
    },
    success: {
      completed: 'bg-green-500',
      current: 'bg-green-400',
      pending: isDark ? 'bg-gray-600' : 'bg-gray-300'
    }
  };

  const currentColors = colors[variant] || colors.primary;

  return (
    <div className={`w-full ${className}`} {...props}>
      <div className="flex items-center justify-between">
        {Array.from({ length: totalSteps }, (_, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;
          const isPending = stepNumber > currentStep;

          let stepColor = currentColors.pending;
          if (isCompleted) stepColor = currentColors.completed;
          else if (isCurrent) stepColor = currentColors.current;

          return (
            <React.Fragment key={index}>
              {/* Step Circle */}
              <div className="flex flex-col items-center">
                <motion.div
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center
                    text-white text-sm font-medium
                    ${stepColor}
                  `}
                  initial={{ scale: 0.8 }}
                  animate={{ scale: isCurrent ? 1.1 : 1 }}
                  transition={{ duration: 0.2 }}
                >
                  {isCompleted ? (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    stepNumber
                  )}
                </motion.div>

                {/* Label */}
                {showLabels && labels[index] && (
                  <span className={`
                    mt-2 text-xs text-center
                    ${isDark ? 'text-gray-300' : 'text-gray-600'}
                    ${isCurrent ? 'font-medium' : ''}
                  `}>
                    {labels[index]}
                  </span>
                )}
              </div>

              {/* Connector Line */}
              {index < totalSteps - 1 && (
                <div className={`
                  flex-1 h-1 mx-2 rounded-full
                  ${isCompleted ? currentColors.completed : currentColors.pending}
                `} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

// Индикатор загрузки точками
export const DotProgress = ({
  size = 'md',
  variant = 'primary',
  className = '',
  ...props
}) => {
  const { isDark } = useTheme();

  const sizes = {
    sm: 'w-1 h-1',
    md: 'w-2 h-2',
    lg: 'w-3 h-3'
  };

  const colors = {
    primary: isDark ? 'bg-purple-500' : 'bg-purple-600',
    secondary: isDark ? 'bg-gray-500' : 'bg-gray-600'
  };

  const dotSize = sizes[size] || sizes.md;
  const dotColor = colors[variant] || colors.primary;

  return (
    <div className={`flex space-x-1 ${className}`} {...props}>
      {[0, 1, 2].map((index) => (
        <motion.div
          key={index}
          className={`${dotSize} ${dotColor} rounded-full`}
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: index * 0.2,
          }}
        />
      ))}
    </div>
  );
};

export default Progress; 