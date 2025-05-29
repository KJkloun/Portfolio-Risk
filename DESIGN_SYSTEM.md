# Дизайн-система Portfolio Risk

## Обзор

Portfolio Risk использует унифицированную дизайн-систему для обеспечения консистентного UI/UX во всем приложении. Система поддерживает светлую и темную темы с плавными переходами.

## Структура

```
frontend/src/
├── styles/
│   └── designSystem.js      # Основные токены дизайна
├── components/
│   └── ui/                  # Переиспользуемые UI компоненты
│       ├── Button.jsx
│       ├── Card.jsx
│       ├── Input.jsx
│       ├── Select.jsx
│       ├── Badge.jsx
│       └── index.js
├── hooks/
│   └── useDesignSystem.js   # Хук для работы с дизайн-системой
└── contexts/
    └── ThemeContext.jsx     # Контекст темы
```

## Цветовая палитра

### Основные цвета
- **Primary**: Серая шкала для основных элементов интерфейса
- **Accent**: Фиолетовый/синий для интерактивных элементов
- **Success**: Зеленый для положительных состояний
- **Error**: Красный для ошибок и опасных действий
- **Warning**: Желтый для предупреждений

### Семантические цвета по темам
```javascript
// Светлая тема
light: {
  background: { primary: '#ffffff', secondary: '#f9fafb', tertiary: '#f3f4f6' },
  text: { primary: '#111827', secondary: '#6b7280', tertiary: '#9ca3af' },
  border: { primary: '#e5e7eb', secondary: '#d1d5db', focus: '#3b82f6' }
}

// Темная тема  
dark: {
  background: { primary: '#111827', secondary: '#1f2937', tertiary: '#374151' },
  text: { primary: '#f9fafb', secondary: '#d1d5db', tertiary: '#9ca3af' },
  border: { primary: '#374151', secondary: '#4b5563', focus: '#60a5fa' }
}
```

## Компоненты

### Button
Унифицированный компонент кнопки с различными вариантами:

```jsx
import { Button } from './ui';

// Варианты
<Button variant="primary">Основная кнопка</Button>
<Button variant="secondary">Вторичная кнопка</Button>
<Button variant="outline">Контурная кнопка</Button>
<Button variant="ghost">Прозрачная кнопка</Button>
<Button variant="danger">Опасная кнопка</Button>

// Размеры
<Button size="xs">Очень маленькая</Button>
<Button size="sm">Маленькая</Button>
<Button size="md">Средняя (по умолчанию)</Button>
<Button size="lg">Большая</Button>
<Button size="xl">Очень большая</Button>

// Состояния
<Button loading>Загрузка</Button>
<Button disabled>Отключена</Button>
```

### Card
Контейнер для группировки связанного контента:

```jsx
import { Card } from './ui';

// Варианты
<Card variant="default">Основная карточка</Card>
<Card variant="secondary">Вторичная карточка</Card>
<Card variant="tertiary">Третичная карточка</Card>

// Отступы
<Card padding="sm">Маленькие отступы</Card>
<Card padding="md">Средние отступы</Card>
<Card padding="lg">Большие отступы (по умолчанию)</Card>

// Интерактивность
<Card hover>Карточка с hover эффектом</Card>
```

### Input
Поле ввода с поддержкой лейблов, ошибок и подсказок:

```jsx
import { Input } from './ui';

<Input 
  label="Email"
  placeholder="Введите email"
  required
  error="Некорректный email"
  hint="Мы не будем спамить"
/>
```

### Select
Выпадающий список с унифицированным стилем:

```jsx
import { Select } from './ui';

<Select label="Выберите опцию" required>
  <option value="">Выберите...</option>
  <option value="1">Опция 1</option>
  <option value="2">Опция 2</option>
</Select>
```

### Badge
Небольшие метки для статусов и категорий:

```jsx
import { Badge } from './ui';

<Badge variant="success">Успех</Badge>
<Badge variant="error">Ошибка</Badge>
<Badge variant="warning">Предупреждение</Badge>
<Badge variant="info">Информация</Badge>
<Badge variant="default">По умолчанию</Badge>
```

## Хук useDesignSystem

Удобный хук для работы с дизайн-системой:

```jsx
import { useDesignSystem } from '../hooks/useDesignSystem';

function MyComponent() {
  const { classes, cn, when, isDark, theme } = useDesignSystem();
  
  return (
    <div className={cn(
      classes.background.primary,
      classes.text.primary,
      classes.transition,
      when(isDark, 'shadow-lg', 'shadow-sm')
    )}>
      <h1 className={classes.text.primary}>Заголовок</h1>
      <p className={classes.text.secondary}>Описание</p>
    </div>
  );
}
```

## Готовые классы (themeClasses)

```javascript
// Фоны
background: {
  primary: 'bg-white dark:bg-gray-900',
  secondary: 'bg-gray-50 dark:bg-gray-800', 
  tertiary: 'bg-gray-100 dark:bg-gray-700',
}

// Текст
text: {
  primary: 'text-gray-900 dark:text-gray-100',
  secondary: 'text-gray-600 dark:text-gray-400',
  tertiary: 'text-gray-500 dark:text-gray-500',
  accent: 'text-purple-600 dark:text-purple-400',
}

// Границы
border: {
  primary: 'border-gray-200 dark:border-gray-700',
  secondary: 'border-gray-300 dark:border-gray-600',
  focus: 'border-blue-500 dark:border-blue-400',
}

// Интерактивность
interactive: {
  hover: 'hover:bg-gray-50 dark:hover:bg-gray-800',
  focus: 'focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400',
  disabled: 'disabled:opacity-50 disabled:cursor-not-allowed',
}

// Переходы
transition: 'transition-colors duration-200'
```

## Примеры использования

### Обновление существующего компонента

Было:
```jsx
<div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
    Заголовок
  </h3>
  <p className="text-gray-600 dark:text-gray-400">Текст</p>
</div>
```

Стало:
```jsx
<Card>
  <h3 className={`text-lg font-medium ${classes.text.primary} mb-4`}>
    Заголовок
  </h3>
  <p className={classes.text.secondary}>Текст</p>
</Card>
```

### Условные стили

```jsx
const { classes, when, cn } = useDesignSystem();

<div className={cn(
  classes.background.primary,
  classes.border.primary,
  'border rounded-lg p-4',
  when(isActive, 'ring-2 ring-purple-500', ''),
  when(hasError, 'border-red-500', classes.border.primary)
)}>
  Контент
</div>
```

## Миграция

Для миграции существующих компонентов:

1. Замените прямые импорты кнопок/карточек на импорты из `./ui`
2. Используйте `useDesignSystem()` хук для получения классов
3. Замените хардкод цветов на семантические классы
4. Используйте компоненты `Card`, `Button`, `Input` вместо обычных div/button/input

## Преимущества

- **Консистентность**: Единый визуальный язык
- **Поддержка тем**: Автоматическая поддержка светлой/темной темы
- **Переиспользование**: DRY принцип для UI компонентов
- **Простота поддержки**: Централизованное управление стилями
- **Типизация**: Четко определенные пропсы и варианты
- **Производительность**: Оптимизированные классы Tailwind 