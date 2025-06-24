#!/bin/bash

echo "🔄 Запуск Portfolio-Risk с чистой базой данных..."

# Остановка процессов
pkill -f "vite" || true
pkill -f "java.*TradeDiaryApplication" || true
sleep 3

# Запуск backend
echo "🚀 Запуск backend..."
cd backend && mvn spring-boot:run &
BACKEND_PID=$!
cd ..

# Ждем запуска backend
echo "⏳ Ожидание запуска backend..."
sleep 20

# Создание пользователя и данных
echo "👤 Создание пользователя и данных..."

# Регистрация пользователя
curl -s -X POST http://localhost:8081/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username": "kj", "email": "kj@example.com", "password": "password", "firstName": "KJ", "lastName": "Trader"}' > /dev/null

# Логин
TOKEN_RESPONSE=$(curl -s -X POST http://localhost:8081/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "kj", "password": "password"}')

TOKEN=$(echo "$TOKEN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo "❌ Ошибка получения токена"
    kill $BACKEND_PID
    exit 1
fi

echo "✅ Пользователь создан и авторизован"

# Создание спотового портфеля
SPOT_RESPONSE=$(curl -s -X POST http://localhost:8081/api/portfolios \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name": "Спотовый портфель", "description": "Исторические спотовые транзакции", "type": "SPOT", "currency": "USD"}')

SPOT_ID=$(echo "$SPOT_RESPONSE" | grep -o '"id":[0-9]*' | cut -d':' -f2)

# Создание маржинального портфеля
MARGIN_RESPONSE=$(curl -s -X POST http://localhost:8081/api/portfolios \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name": "Маржинальный портфель", "description": "Маржинальные сделки", "type": "MARGIN", "currency": "RUB"}')

MARGIN_ID=$(echo "$MARGIN_RESPONSE" | grep -o '"id":[0-9]*' | cut -d':' -f2)

echo "📊 Портфели созданы (Спот: $SPOT_ID, Маржа: $MARGIN_ID)"

# Функция добавления спотовой транзакции
add_spot() {
    curl -s -X POST http://localhost:8081/api/spot-transactions \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TOKEN" \
      -H "X-Portfolio-ID: $SPOT_ID" \
      -d "{\"ticker\": \"$1\", \"transactionType\": \"$2\", \"quantity\": $3, \"price\": $4, \"transactionDate\": \"$5\", \"note\": \"$6\"}" > /dev/null
}

echo "📈 Загрузка ключевых спотовых транзакций..."

# Основные транзакции из вашего списка
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
add_spot "BTCUSD" "BUY" 0.5 29920.00 "2023-07-19" "Bitcoin - покупка"
add_spot "BTCUSD" "SELL" 0.5 33762.00 "2023-10-24" "Bitcoin - продажа"
add_spot "USD" "WITHDRAW" 44989 1.00 "2024-09-01" "Вывод"

echo "✅ Спотовые транзакции загружены!"

# Запуск frontend
echo "🎨 Запуск frontend..."
cd frontend && npm run dev -- --port 3000 --strictPort &
FRONTEND_PID=$!
cd ..

sleep 5

echo ""
echo "🎉============================================🎉"
echo "    PORTFOLIO-RISK ЗАПУЩЕН!"
echo "🎉============================================🎉"
echo ""
echo "📊 ДАННЫЕ:"
echo "   ✅ Пользователь: kj"
echo "   ✅ Пароль: password"
echo "   ✅ Спотовые транзакции: загружены с правильными датами"
echo "   ✅ Маржинальный портфель: создан"
echo ""
echo "🌐 ПРИЛОЖЕНИЕ:"
echo "   🎯 Frontend: http://localhost:3000"
echo "   🔧 Backend: http://localhost:8081"
echo ""
echo "🚀 Готово к использованию!"
echo "============================================"

wait 
 