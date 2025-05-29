// Общие анимации для использования в приложении

// Стандартные переходы
export const transitions = {
  fast: { duration: 0.2 },
  normal: { duration: 0.3 },
  slow: { duration: 0.5 },
  spring: { type: "spring", damping: 25, stiffness: 300 },
  springBouncy: { type: "spring", damping: 15, stiffness: 400 },
};

// Анимации появления/исчезновения
export const fadeVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 }
};

export const slideVariants = {
  slideUp: {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
  },
  slideDown: {
    hidden: { opacity: 0, y: -20 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 }
  },
  slideLeft: {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 }
  },
  slideRight: {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 }
  }
};

export const scaleVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 }
};

// Анимации для списков
export const listVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

export const listItemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

// Анимации для карточек
export const cardHoverVariants = {
  hover: {
    scale: 1.02,
    y: -2,
    transition: transitions.fast
  },
  tap: {
    scale: 0.98
  }
};

export const cardSlideVariants = {
  hidden: { opacity: 0, y: 50 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: transitions.spring
  }
};

// Анимации для кнопок
export const buttonVariants = {
  hover: {
    scale: 1.05,
    transition: transitions.fast
  },
  tap: {
    scale: 0.95
  }
};

// Анимации для навигации
export const pageVariants = {
  initial: {
    opacity: 0,
    x: "-100vw"
  },
  in: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.4,
      ease: "easeOut"
    }
  },
  out: {
    opacity: 0,
    x: "100vw",
    transition: {
      duration: 0.4,
      ease: "easeIn"
    }
  }
};

// Анимации для уведомлений
export const notificationVariants = {
  initial: { 
    opacity: 0, 
    y: -50, 
    scale: 0.3 
  },
  animate: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: transitions.springBouncy
  },
  exit: { 
    opacity: 0, 
    y: -50, 
    scale: 0.3,
    transition: transitions.fast
  }
};

// Анимации для модальных окон
export const modalBackdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 }
};

export const modalContentVariants = {
  hidden: { 
    opacity: 0, 
    scale: 0.8, 
    y: -50 
  },
  visible: { 
    opacity: 1, 
    scale: 1, 
    y: 0,
    transition: transitions.spring
  },
  exit: { 
    opacity: 0, 
    scale: 0.8, 
    y: -50,
    transition: transitions.fast
  }
};

// Анимации загрузки
export const loadingVariants = {
  spin: {
    rotate: [0, 360],
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: "linear"
    }
  },
  pulse: {
    scale: [1, 1.2, 1],
    opacity: [0.5, 1, 0.5],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: "easeInOut"
    }
  },
  bounce: {
    y: [0, -10, 0],
    transition: {
      duration: 0.6,
      repeat: Infinity,
      ease: "easeOut"
    }
  }
};

// Stagger анимации для групп элементов
export const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1
    }
  }
};

export const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  show: { 
    opacity: 1, 
    y: 0,
    transition: transitions.spring
  }
};

// Hover эффекты
export const hoverEffects = {
  lift: {
    y: -4,
    scale: 1.02,
    transition: transitions.fast
  },
  glow: {
    boxShadow: "0 0 20px rgba(139, 92, 246, 0.3)",
    transition: transitions.fast
  },
  rotate: {
    rotate: 5,
    transition: transitions.fast
  }
};

// Анимации для таблиц
export const tableRowVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: transitions.normal
  },
  hover: {
    backgroundColor: "rgba(139, 92, 246, 0.05)",
    transition: transitions.fast
  }
};

// Анимации для графиков
export const chartVariants = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: { 
    pathLength: 1, 
    opacity: 1,
    transition: {
      pathLength: { duration: 2, ease: "easeInOut" },
      opacity: { duration: 0.5 }
    }
  }
};

// Анимации для форм
export const formFieldVariants = {
  focus: {
    scale: 1.02,
    borderColor: "#8b5cf6",
    transition: transitions.fast
  },
  error: {
    x: [0, -10, 10, -10, 10, 0],
    transition: { duration: 0.5 }
  }
};

export default {
  transitions,
  fadeVariants,
  slideVariants,
  scaleVariants,
  listVariants,
  listItemVariants,
  cardHoverVariants,
  cardSlideVariants,
  buttonVariants,
  pageVariants,
  notificationVariants,
  modalBackdropVariants,
  modalContentVariants,
  loadingVariants,
  staggerContainer,
  staggerItem,
  hoverEffects,
  tableRowVariants,
  chartVariants,
  formFieldVariants
}; 