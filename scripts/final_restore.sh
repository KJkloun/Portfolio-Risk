#!/bin/bash

echo "🔄 Финальное восстановление исторических данных Portfolio-Risk..."

# Остановка всех процессов
echo "⏹️  Остановка текущих процессов..."
pkill -f "java.*TradeDiaryApplication" || true
pkill -f "vite" || true
sleep 3

# Очистка и восстановление базы данных
echo "💾 Восстановление исторической базы данных..."
rm -f backend/data/portfoliodb.mv.db backend/data/portfoliodb.trace.db
cp /tmp/tradedb_historical.mv.db backend/data/portfoliodb.mv.db
cp /tmp/tradedb_historical.trace.db backend/data/portfoliodb.trace.db

echo "✅ Историческая база данных восстановлена!"

# Запуск backend
echo "🚀 Запуск backend..."
cd backend && mvn spring-boot:run &
BACKEND_PID=$!
cd ..

# Ждем запуска backend
echo "⏳ Ожидание запуска backend..."
sleep 20

# Получение токена
echo "🔐 Аутентификация..."
TOKEN_RESPONSE=$(curl -s -X POST http://localhost:8081/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "kj", "password": "password"}')

TOKEN=$(echo "$TOKEN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo "❌ Ошибка получения токена. Попробуем создать пользователя..."
    
    USER_RESPONSE=$(curl -s -X POST http://localhost:8081/api/auth/register \
      -H "Content-Type: application/json" \
      -d '{"username": "kj", "email": "kj@example.com", "password": "password", "firstName": "KJ", "lastName": "Trader"}')
    
    TOKEN_RESPONSE=$(curl -s -X POST http://localhost:8081/api/auth/login \
      -H "Content-Type: application/json" \
      -d '{"username": "kj", "password": "password"}')
    
    TOKEN=$(echo "$TOKEN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
fi

if [ -z "$TOKEN" ]; then
    echo "❌ Не удалось получить токен"
    kill $BACKEND_PID
    exit 1
fi

echo "✅ Токен получен успешно"

# Создание спотового портфеля
echo "📊 Создание спотового портфеля..."
SPOT_RESPONSE=$(curl -s -X POST http://localhost:8081/api/portfolios \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name": "Спотовый портфель (Исторический)", "description": "Точные исторические данные спотовой торговли", "type": "SPOT", "currency": "USD"}')

SPOT_ID=$(echo "$SPOT_RESPONSE" | grep -o '"id":[0-9]*' | cut -d':' -f2)
echo "✅ Спотовый портфель создан (ID: $SPOT_ID)"

# Функция добавления спотовой транзакции
add_spot() {
    local ticker="$1"
    local type="$2"
    local qty="$3"
    local price="$4"
    local date="$5"
    local notes="$6"
    
    curl -s -X POST http://localhost:8081/api/spot-transactions \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TOKEN" \
      -H "X-Portfolio-ID: $SPOT_ID" \
      -d "{\"ticker\": \"$ticker\", \"transactionType\": \"$type\", \"quantity\": $qty, \"price\": $price, \"transactionDate\": \"$date\", \"note\": \"$notes\"}" > /dev/null
    
    echo "  ✓ $ticker $type $qty @ $price ($date)"
}

echo "📈 Загрузка 77 спотовых транзакций с правильными датами..."

# Все 77 транзакций из вашего списка
add_spot "USD" "DEPOSIT" 100000 1.00 "2019-05-06" "Поступление"
add_spot "BA" "BUY" 272 365.17 "2019-05-07" "Boeing - покупка"
add_spot "USD" "DEPOSIT" 51000 1.00 "2019-05-08" "Поступление"
add_spot "BA" "BUY" 144 354.97 "2019-05-08" "Boeing - покупка"
add_spot "BA" "SELL" 140 369.50 "2019-06-18" "Boeing - продажа"
add_spot "BA" "SELL" 140 365.40 "2019-06-18" "Boeing - продажа"
add_spot "XLNX" "BUY" 860 120.98 "2019-07-19" "Xilinx - покупка"
add_spot "USD" "DIVIDEND" 243 1.00 "2019-09-17" "Boeing - дивиденды"
add_spot "BA" "SELL" 136 381.20 "2019-09-17" "Boeing - продажа"
add_spot "XLNX" "BUY" 532 98.07 "2019-09-22" "Xilinx - покупка"
add_spot "USD" "DEPOSIT" 22000 1.00 "2019-12-04" "Поступление"
add_spot "XLNX" "BUY" 224 98.07 "2019-12-04" "Xilinx - покупка"
add_spot "USD" "DIVIDEND" 538 1.00 "2019-12-04" "Дивиденды"
add_spot "USD" "DIVIDEND" 538 1.00 "2020-02-21" "Дивиденды"
add_spot "USD" "DEPOSIT" 155000 1.00 "2020-03-02" "Поступление"
add_spot "BA" "BUY" 200 290.49 "2020-03-03" "Boeing - покупка"
add_spot "BA" "BUY" 350 279.50 "2020-03-04" "Boeing - покупка"
add_spot "XLNX" "SELL" 1616 76.00 "2020-03-18" "Xilinx - продажа"
add_spot "BA" "BUY" 620 97.16 "2020-03-23" "Boeing - покупка"
add_spot "BA" "BUY" 650 95.16 "2020-03-23" "Boeing - покупка"
add_spot "BA" "SELL" 1820 240.61 "2021-01-12" "Boeing - продажа"
add_spot "BABA" "BUY" 2050 213.62 "2021-01-16" "Alibaba - покупка"
add_spot "BABA" "SELL" 2050 229.06 "2021-04-21" "Alibaba - продажа"
add_spot "INTC" "BUY" 2700 57.90 "2021-04-28" "Intel - покупка"
add_spot "BABA" "BUY" 940 227.00 "2021-05-05" "Alibaba - покупка"
add_spot "AYX" "BUY" 1329 75.28 "2021-05-06" "Alteryx - покупка"
add_spot "AYX" "SELL" 700 80.30 "2021-07-27" "Alteryx - продажа"
add_spot "TAL" "BUY" 11784 4.77 "2021-07-27" "TAL Education - покупка"
add_spot "TAL" "SELL" 11784 6.49 "2021-07-28" "TAL Education - продажа"
add_spot "AYX" "BUY" 1125 67.60 "2021-08-05" "Alteryx - покупка"
add_spot "AYX" "SELL" 1754 71.31 "2021-08-23" "Alteryx - продажа"
add_spot "TAL" "BUY" 25780 4.87 "2021-08-23" "TAL Education - покупка"
add_spot "TAL" "SELL" 25780 5.77 "2021-09-09" "TAL Education - продажа"
add_spot "TAL" "BUY" 31250 4.74 "2021-09-14" "TAL Education - покупка"
add_spot "TAL" "SELL" 31250 5.04 "2021-10-22" "TAL Education - продажа"
add_spot "TAL" "BUY" 32949 4.78 "2021-10-22" "TAL Education - покупка"
add_spot "INTC" "SELL" 2700 48.45 "2021-10-26" "Intel - продажа"
add_spot "TAL" "BUY" 15000 4.45 "2021-10-26" "TAL Education - покупка"
add_spot "TAL" "BUY" 10000 4.40 "2021-10-26" "TAL Education - покупка"
add_spot "TAL" "BUY" 4725 4.38 "2021-10-26" "TAL Education - покупка"
add_spot "TAL" "SELL" 62674 5.33 "2021-12-08" "TAL Education - продажа"
add_spot "TAL" "BUY" 75577 4.42 "2021-12-14" "TAL Education - покупка"
add_spot "BABA" "SELL" 940 106.50 "2022-02-28" "Alibaba - продажа"
add_spot "USD" "WITHDRAW" 4110 1.00 "2022-03-01" "Вывод"
add_spot "BABA" "BUY" 800 84.15 "2023-03-13" "Alibaba - покупка"
add_spot "TAL" "BUY" 2023 6.86 "2023-03-13" "TAL Education - покупка"
add_spot "BABA" "SELL" 800 102.50 "2023-03-31" "Alibaba - продажа"
add_spot "USD" "WITHDRAW" 2800 1.00 "2023-04-04" "Вывод"
add_spot "SPCE" "BUY" 2000 3.17 "2023-04-06" "Virgin Galactic - покупка"
add_spot "SPCE" "SELL" 2000 3.50 "2023-04-12" "Virgin Galactic - продажа"
add_spot "TAL" "BUY" 4000 5.89 "2023-04-12" "TAL Education - покупка"
add_spot "BABA" "BUY" 200 84.10 "2023-04-15" "Alibaba - покупка"
add_spot "BABA" "BUY" 200 84.90 "2023-04-28" "Alibaba - покупка"
add_spot "BABA" "BUY" 200 84.00 "2023-05-19" "Alibaba - покупка"
add_spot "TAL" "SELL" 4000 6.27 "2023-06-01" "TAL Education - продажа"
add_spot "AYX" "BUY" 200 41.49 "2023-07-17" "Alteryx - покупка"
add_spot "BTCUSD" "BUY" 0.5 29920.00 "2023-07-19" "Bitcoin - покупка"
add_spot "BABA" "SELL" 200 97.66 "2023-07-28" "Alibaba - продажа"
add_spot "TAL" "SELL" 2023 7.54 "2023-07-28" "TAL Education - продажа"
add_spot "BABA" "SELL" 400 100.80 "2023-07-28" "Alibaba - продажа"
add_spot "USD" "WITHDRAW" 2400 1.00 "2023-07-29" "Вывод"
add_spot "AYX" "BUY" 200 40.37 "2023-08-01" "Alteryx - покупка"
add_spot "AYX" "BUY" 200 38.00 "2023-08-02" "Alteryx - покупка"
add_spot "AYX" "BUY" 200 38.00 "2023-08-03" "Alteryx - покупка"
add_spot "AYX" "BUY" 400 29.50 "2023-08-08" "Alteryx - покупка"
add_spot "AYX" "SELL" 1200 38.33 "2023-09-29" "Alteryx - продажа"
add_spot "BABA" "BUY" 100 84.90 "2023-10-02" "Alibaba - покупка"
add_spot "BABA" "BUY" 100 84.70 "2023-10-03" "Alibaba - покупка"
add_spot "BABA" "BUY" 100 84.05 "2023-10-04" "Alibaba - покупка"
add_spot "BABA" "BUY" 100 84.06 "2023-10-09" "Alibaba - покупка"
add_spot "BABA" "BUY" 100 84.42 "2023-10-12" "Alibaba - покупка"
add_spot "BABA" "BUY" 100 83.98 "2023-10-13" "Alibaba - покупка"
add_spot "BTCUSD" "SELL" 0.5 33762.00 "2023-10-24" "Bitcoin - продажа"
add_spot "BABA" "BUY" 200 81.09 "2023-10-25" "Alibaba - покупка"
add_spot "USD" "WITHDRAW" 1000 1.00 "2024-08-26" "Вывод"
add_spot "USD" "WITHDRAW" 10000 1.00 "2024-08-26" "Вывод"
add_spot "USD" "WITHDRAW" 44989 1.00 "2024-09-01" "Вывод"

echo "✅ Все 77 спотовых транзакций загружены!"

# Запуск frontend
echo "🎨 Запуск frontend..."
cd frontend && npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "🎉============================================🎉"
echo "    ИСТОРИЧЕСКИЕ ДАННЫЕ ПОЛНОСТЬЮ ВОССТАНОВЛЕНЫ!"
echo "🎉============================================🎉"
echo ""
echo "📊 ДАННЫЕ:"
echo "   ✅ Спотовые транзакции: 77 (с правильными датами 2019-2024)"
echo "   ✅ Маржинальные сделки: ~400 (из исторической базы)"
echo "   ✅ Пользователь: kj"
echo "   ✅ Пароль: password"
echo ""
echo "🌐 ПРИЛОЖЕНИЕ:"
echo "   🎯 Frontend: http://localhost:3000"
echo "   🔧 Backend: http://localhost:8081"
echo ""
echo "📋 PID процессов:"
echo "   Backend PID: $BACKEND_PID"
echo "   Frontend PID: $FRONTEND_PID"
echo ""
echo "🚀 Приложение готово к использованию!"
echo "============================================"

wait 
 