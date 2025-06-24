# Дневник торговли акциями (Stock Trading Diary)

Веб-приложение для ведения дневника торговли акциями с возможностью анализа статистики и генерации отчетов.

## Возможности

- 📈 **Учет сделок**: Добавление, редактирование и удаление торговых операций
- 📊 **Детальная статистика**: Анализ прибыли, убытков, процентных расходов
- 📑 **PDF отчеты**: Генерация отчетов по портфелю с поддержкой русского языка
- 💰 **Расчет потенциальной прибыли**: Автоматический расчет с учетом текущих курсов
- 🎨 **Минималистичный дизайн**: Современный и удобный интерфейс

## Технологический стек

### Frontend
- **React** - JavaScript библиотека для создания пользовательских интерфейсов
- **Vite** - Быстрый инструмент сборки
- **Tailwind CSS** - CSS фреймворк для стилизации
- **Chart.js** - Библиотека для создания графиков
- **pdfMake** - Генерация PDF документов
- **date-fns** - Работа с датами
- **Axios** - HTTP клиент

### Backend
- **Java Spring Boot** - Фреймворк для создания REST API
- **H2 Database** - Встроенная база данных для разработки
- **Maven** - Управление зависимостями

## Структура проекта

```
stock-trades-diary/
├── frontend/           # React приложение
│   ├── src/
│   │   ├── components/ # React компоненты
│   │   ├── App.jsx     # Главный компонент
│   │   └── main.jsx    # Точка входа
│   ├── package.json
│   └── vite.config.js
├── backend/            # Spring Boot API
│   ├── src/main/java/
│   ├── pom.xml
│   └── mvnw
├── docker-compose.yml
└── README.md
```

## Установка и запуск

### Предварительные требования
- Node.js (версия 16+)
- Java 17+
- Maven

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Backend
```bash
cd backend
./mvnw spring-boot:run
```

Приложение будет доступно по адресу: http://localhost:5173

API документация: http://localhost:8081

## Основные функции

### Управление сделками
- Добавление новых торговых операций
- Указание цены входа, количества акций, маржинальной ставки
- Закрытие позиций с указанием цены выхода
- Редактирование и удаление записей

### Статистика и аналитика
- Общая статистика портфеля
- Прибыль/убыток по каждой акции
- Расчет процентных расходов
- Графики и диаграммы
- Фильтрация по отдельным акциям

### PDF отчеты
- Общие отчеты по портфелю
- Отчеты по отдельным акциям
- Выбор нескольких акций для отчета
- Поддержка русского языка

## API Endpoints

- `GET /api/trades` - Получить все сделки
- `POST /api/trades` - Создать новую сделку
- `PUT /api/trades/{id}` - Обновить сделку
- `DELETE /api/trades/{id}` - Удалить сделку

## Контрибьюция

1. Форкните репозиторий
2. Создайте ветку для новой функции (`git checkout -b feature/новая-функция`)
3. Зафиксируйте изменения (`git commit -am 'Добавить новую функцию'`)
4. Отправьте в ветку (`git push origin feature/новая-функция`)
5. Создайте Pull Request

## Лицензия

Этот проект распространяется под лицензией MIT.

## Автор

Проект создан для ведения личного дневника торговли акциями с акцентом на анализ эффективности и контроль рисков.

## Quick Start

### Demo User
For testing purposes, use these credentials:
- **Username**: `demo`
- **Password**: `demo123`

### Ports
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:8081

### Running the Application

1. **Start Backend**:
   ```bash
   cd backend
   mvn spring-boot:run
   ```

2. **Start Frontend**:
   ```bash
   cd frontend
   npm run dev
   ```

## Features

- ✅ Multi-user authentication with JWT
- ✅ Multi-portfolio support with currency selection (RUB, USD, EUR, CNY, KZT)
- ✅ Spot trading transaction management
- ✅ Margin trading with interest calculations
- ✅ Real-time portfolio analytics
- ✅ FIFO analysis for stock positions
- ✅ Daily trading summaries
- ✅ Cash flow tracking

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### Portfolios
- `GET /api/portfolios` - Get user portfolios
- `POST /api/portfolios` - Create new portfolio

### Spot Transactions
- `GET /api/spot-transactions` - Get transactions (filtered by portfolio)
- `POST /api/spot-transactions` - Create new transaction

### Margin Trades
- `GET /api/trades` - Get margin trades (filtered by portfolio)
- `POST /api/trades` - Create new trade

## Database

The application uses H2 database with file storage. Data is persisted in `backend/data/portfoliodb.mv.db`.

## Development

- Backend: Spring Boot 3.2.3 with Spring Security & JWT
- Frontend: React 18 with Vite, React Router, Axios
- Database: H2 with JPA/Hibernate
- Styling: Tailwind CSS

## Security

- JWT-based authentication
- CORS configured for development
- Request/response filtering by portfolio ownership
- Automatic token management via Axios interceptors

## Troubleshooting

If you encounter 403 errors, ensure you are:
1. Logged in with valid credentials
2. Have selected a portfolio
3. Using the correct API endpoints 
Проект создан для ведения личного дневника торговли акциями с акцентом на анализ эффективности и контроль рисков. 