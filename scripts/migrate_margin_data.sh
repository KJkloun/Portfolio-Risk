#!/bin/bash

echo "🔄 Миграция маржинального портфеля из оригинальной базы данных..."

# Остановка процессов
pkill -f "java.*TradeDiaryApplication" || true
pkill -f "vite" || true
sleep 3

# Создание резервной копии оригинальных данных
echo "📦 Создание резервной копии оригинальных данных..."
cp backend/data/tradedb.mv.db /tmp/original_tradedb.mv.db
cp backend/data/tradedb.trace.db /tmp/original_tradedb.trace.db

# Переключение обратно на современную ветку
echo "🔄 Переключение на современную ветку..."
git stash || true
git checkout spot-redesign-clean
git stash pop || true

# Очистка текущей базы данных
echo "🗑️ Очистка текущей базы данных..."
rm -f backend/data/portfoliodb.mv.db backend/data/portfoliodb.trace.db

# Запуск backend для создания новой структуры
echo "🚀 Запуск backend для создания новой структуры..."
cd backend && mvn spring-boot:run > ../migrate_backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# Ожидание запуска backend
echo "⏳ Ожидание запуска backend (20 сек)..."
sleep 20

# Проверка, что backend запустился
if ! curl -s http://localhost:8081/api/auth/login >/dev/null 2>&1; then
    echo "❌ Backend не запустился"
    exit 1
fi

echo "✅ Backend запущен"

# Создание пользователя
echo "👤 Создание пользователя..."
curl -s -X POST http://localhost:8081/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username": "kj", "email": "kj@example.com", "password": "password", "firstName": "KJ", "lastName": "Trader"}' >/dev/null

# Получение токена
echo "🔑 Получение токена авторизации..."
TOKEN=$(curl -s -X POST http://localhost:8081/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "kj", "password": "password"}' | jq -r '.token')

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
    echo "❌ Не удалось получить токен авторизации"
    exit 1
fi

echo "✅ Токен получен"

# Создание маржинального портфеля
echo "📊 Создание маржинального портфеля..."
PORTFOLIO_RESPONSE=$(curl -s -X POST http://localhost:8081/api/portfolios \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name": "Маржинальный портфель (Исторический)", "description": "Восстановленные данные из оригинальной базы", "type": "MARGIN", "currency": "RUB"}')

PORTFOLIO_ID=$(echo "$PORTFOLIO_RESPONSE" | jq -r '.id')

if [ "$PORTFOLIO_ID" = "null" ] || [ -z "$PORTFOLIO_ID" ]; then
    echo "❌ Не удалось создать портфель"
    echo "Ответ: $PORTFOLIO_RESPONSE"
    exit 1
fi

echo "✅ Маржинальный портфель создан с ID: $PORTFOLIO_ID"

# Остановка backend для миграции данных
echo "🛑 Остановка backend для миграции данных..."
kill $BACKEND_PID
sleep 5

# Теперь нужно извлечь данные из старой базы и вставить в новую
# Это сложная операция, которая требует прямого доступа к базе данных
echo "📊 Извлечение данных из оригинальной базы..."

# Создаем временный скрипт для H2 консоли
cat > extract_trades.sql << 'EOF'
-- Подключение к старой базе данных
-- Это будет выполнено вручную через H2 консоль
SELECT 
    symbol,
    entry_price,
    exit_price,
    quantity,
    entry_date,
    exit_date,
    margin_amount,
    daily_interest,
    notes
FROM trades
ORDER BY entry_date;
EOF

echo "🔧 Создан файл extract_trades.sql для извлечения данных"
echo ""
echo "📋 СЛЕДУЮЩИЕ ШАГИ:"
echo "1. Откройте H2 консоль: http://localhost:8082"
echo "2. Подключитесь к старой базе: jdbc:h2:./backend/data/tradedb"
echo "3. Выполните запрос из файла extract_trades.sql"
echo "4. Скопируйте результаты"
echo "5. Запустите backend заново и загрузите данные через API"
echo ""
echo "🎯 Альтернативно, мы можем создать простой скрипт для загрузки ваших известных сделок"

# Запуск backend заново
echo "🚀 Запуск backend заново..."
cd backend && mvn spring-boot:run > ../migrate_backend_final.log 2>&1 &
cd ..

echo "✅ Миграция подготовлена. Backend запущен."
echo "📁 Оригинальные данные сохранены в /tmp/original_tradedb.*" 
 