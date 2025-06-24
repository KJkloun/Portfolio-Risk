#!/bin/bash

set -e

echo "📥 Импорт 77 спотовых транзакций в аккаунт kj..."

# Получаем JWT токен
TOKEN=$(curl -s -X POST http://localhost:8081/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"kj","password":"password"}' | jq -r '.token')

if [[ -z "$TOKEN" || "$TOKEN" == "null" ]]; then
  echo "❌ Не удалось получить токен. Проверьте, что backend запущен и пользователь существует."
  exit 1
fi

echo "✅ Токен получен"

# Находим ID спотового портфеля
PORTFOLIO_ID=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8081/api/portfolios | jq -r '.[] | select(.type=="SPOT") | .id' | head -n 1)

if [[ -z "$PORTFOLIO_ID" ]]; then
  echo "❌ Спотовый портфель не найден. Сначала создайте его."
  exit 1
fi

echo "📂 Спотовый портфель найден (ID: $PORTFOLIO_ID)"

auto_post() {
  local ticker="$1"; local type="$2"; local qty="$3"; local price="$4"; local date="$5"; local note="$6"
  curl -s -X POST http://localhost:8081/api/spot-transactions \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -H "X-Portfolio-ID: $PORTFOLIO_ID" \
    -d "{\"ticker\":\"$ticker\",\"transactionType\":\"$type\",\"quantity\":$qty,\"price\":$price,\"transactionDate\":\"$date\",\"note\":\"$note\"}" >/dev/null
  echo "✔ $ticker $type $qty @$price ($date)"
}

echo "🚀 Загружаю сделки..."

# === Ниже полный список 77 транзакций ===
auto_post "USD" "DEPOSIT" 100000 1.00 "2019-05-06" "Поступление"
auto_post "BA" "BUY" 272 365.17 "2019-05-07" "Boeing - покупка"
auto_post "USD" "DEPOSIT" 51000 1.00 "2019-05-08" "Поступление"
auto_post "BA" "BUY" 144 354.97 "2019-05-08" "Boeing - покупка"
auto_post "BA" "SELL" 140 369.50 "2019-06-18" "Boeing - продажа"
auto_post "BA" "SELL" 140 365.40 "2019-06-18" "Boeing - продажа"
auto_post "XLNX" "BUY" 860 120.98 "2019-07-19" "Xilinx - покупка"
auto_post "USD" "DIVIDEND" 243 1.00 "2019-09-17" "Boeing - дивиденды"
auto_post "BA" "SELL" 136 381.20 "2019-09-17" "Boeing - продажа"
auto_post "XLNX" "BUY" 532 98.07 "2019-09-22" "Xilinx - покупка"
auto_post "USD" "DEPOSIT" 22000 1.00 "2019-12-04" "Поступление"
auto_post "XLNX" "BUY" 224 98.07 "2019-12-04" "Xilinx - покупка"
auto_post "USD" "DIVIDEND" 538 1.00 "2019-12-04" "Дивиденды"
auto_post "USD" "DIVIDEND" 538 1.00 "2020-02-21" "Дивиденды"
auto_post "USD" "DEPOSIT" 155000 1.00 "2020-03-02" "Поступление"
auto_post "BA" "BUY" 200 290.49 "2020-03-03" "Boeing - покупка"
auto_post "BA" "BUY" 350 279.50 "2020-03-04" "Boeing - покупка"
auto_post "XLNX" "SELL" 1616 76.00 "2020-03-18" "Xilinx - продажа"
auto_post "BA" "BUY" 620 97.16 "2020-03-23" "Boeing - покупка"
auto_post "BA" "BUY" 650 95.16 "2020-03-23" "Boeing - покупка"
auto_post "BA" "SELL" 1820 240.61 "2021-01-12" "Boeing - продажа"
auto_post "BABA" "BUY" 2050 213.62 "2021-01-16" "Alibaba - покупка"
auto_post "BABA" "SELL" 2050 229.06 "2021-04-21" "Alibaba - продажа"
auto_post "INTC" "BUY" 2700 57.90 "2021-04-28" "Intel - покупка"
auto_post "BABA" "BUY" 940 227.00 "2021-05-05" "Alibaba - покупка"
auto_post "AYX" "BUY" 1329 75.28 "2021-05-06" "Alteryx - покупка"
auto_post "AYX" "SELL" 700 80.30 "2021-07-27" "Alteryx - продажа"
auto_post "TAL" "BUY" 11784 4.77 "2021-07-27" "TAL Education - покупка"
auto_post "TAL" "SELL" 11784 6.49 "2021-07-28" "TAL Education - продажа"
auto_post "AYX" "BUY" 1125 67.60 "2021-08-05" "Alteryx - покупка"
auto_post "AYX" "SELL" 1754 71.31 "2021-08-23" "Alteryx - продажа"
auto_post "TAL" "BUY" 25780 4.87 "2021-08-23" "TAL Education - покупка"
auto_post "TAL" "SELL" 25780 5.77 "2021-09-09" "TAL Education - продажа"
auto_post "TAL" "BUY" 31250 4.74 "2021-09-14" "TAL Education - покупка"
auto_post "TAL" "SELL" 31250 5.04 "2021-10-22" "TAL Education - продажа"
auto_post "TAL" "BUY" 32949 4.78 "2021-10-22" "TAL Education - покупка"
auto_post "INTC" "SELL" 2700 48.45 "2021-10-26" "Intel - продажа"
auto_post "TAL" "BUY" 15000 4.45 "2021-10-26" "TAL Education - покупка"
auto_post "TAL" "BUY" 10000 4.40 "2021-10-26" "TAL Education - покупка"
auto_post "TAL" "BUY" 4725 4.38 "2021-10-26" "TAL Education - покупка"
auto_post "TAL" "SELL" 62674 5.33 "2021-12-08" "TAL Education - продажа"
auto_post "TAL" "BUY" 75577 4.42 "2021-12-14" "TAL Education - покупка"
auto_post "BABA" "SELL" 940 106.50 "2022-02-28" "Alibaba - продажа"
auto_post "USD" "WITHDRAW" 4110 1.00 "2022-03-01" "Вывод"
auto_post "BABA" "BUY" 800 84.15 "2023-03-13" "Alibaba - покупка"
auto_post "TAL" "BUY" 2023 6.86 "2023-03-13" "TAL Education - покупка"
auto_post "BABA" "SELL" 800 102.50 "2023-03-31" "Alibaba - продажа"
auto_post "USD" "WITHDRAW" 2800 1.00 "2023-04-04" "Вывод"
auto_post "SPCE" "BUY" 2000 3.17 "2023-04-06" "Virgin Galactic - покупка"
auto_post "SPCE" "SELL" 2000 3.50 "2023-04-12" "Virgin Galactic - продажа"
auto_post "TAL" "BUY" 4000 5.89 "2023-04-12" "TAL Education - покупка"
auto_post "BABA" "BUY" 200 84.10 "2023-04-15" "Alibaba - покупка"
auto_post "BABA" "BUY" 200 84.90 "2023-04-28" "Alibaba - покупка"
auto_post "BABA" "BUY" 200 84.00 "2023-05-19" "Alibaba - покупка"
auto_post "TAL" "SELL" 4000 6.27 "2023-06-01" "TAL Education - продажа"
auto_post "AYX" "BUY" 200 41.49 "2023-07-17" "Alteryx - покупка"
auto_post "BTCUSD" "BUY" 0.5 29920.00 "2023-07-19" "Bitcoin - покупка"
auto_post "BABA" "SELL" 200 97.66 "2023-07-28" "Alibaba - продажа"
auto_post "TAL" "SELL" 2023 7.54 "2023-07-28" "TAL Education - продажа"
auto_post "BABA" "SELL" 400 100.80 "2023-07-28" "Alibaba - продажа"
auto_post "USD" "WITHDRAW" 2400 1.00 "2023-07-29" "Вывод"
auto_post "AYX" "BUY" 200 40.37 "2023-08-01" "Alteryx - покупка"
auto_post "AYX" "BUY" 200 38.00 "2023-08-02" "Alteryx - покупка"
auto_post "AYX" "BUY" 200 38.00 "2023-08-03" "Alteryx - покупка"
auto_post "AYX" "BUY" 400 29.50 "2023-08-08" "Alteryx - покупка"
auto_post "AYX" "SELL" 1200 38.33 "2023-09-29" "Alteryx - продажа"
auto_post "BABA" "BUY" 100 84.90 "2023-10-02" "Alibaba - покупка"
auto_post "BABA" "BUY" 100 84.70 "2023-10-03" "Alibaba - покупка"
auto_post "BABA" "BUY" 100 84.05 "2023-10-04" "Alibaba - покупка"
auto_post "BABA" "BUY" 100 84.06 "2023-10-09" "Alibaba - покупка"
auto_post "BABA" "BUY" 100 84.42 "2023-10-12" "Alibaba - покупка"
auto_post "BABA" "BUY" 100 83.98 "2023-10-13" "Alibaba - покупка"
auto_post "BTCUSD" "SELL" 0.5 33762.00 "2023-10-24" "Bitcoin - продажа"
auto_post "BABA" "BUY" 200 81.09 "2023-10-25" "Alibaba - покупка"
auto_post "USD" "WITHDRAW" 1000 1.00 "2024-08-26" "Вывод"
auto_post "USD" "WITHDRAW" 10000 1.00 "2024-08-26" "Вывод"
auto_post "USD" "WITHDRAW" 44989 1.00 "2024-09-01" "Вывод"

echo "🎉 Импорт завершён!" 
 