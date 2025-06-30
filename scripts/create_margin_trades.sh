#!/bin/bash

echo "🔄 Создание исторических маржинальных сделок..."

# Получение токена
TOKEN=$(curl -s -X POST http://localhost:8081/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "kj", "password": "password"}' | jq -r '.token')

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
    echo "❌ Не удалось получить токен авторизации"
    exit 1
fi

echo "✅ Токен получен"

# ID маржинального портфеля
PORTFOLIO_ID=2

echo "📊 Создание маржинальных сделок в портфеле ID: $PORTFOLIO_ID"

# Сделка 1: Газпром
echo "📈 Создание сделки: GAZP"
TRADE1=$(curl -s -X POST http://localhost:8081/api/trades/buy \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Portfolio-ID: $PORTFOLIO_ID" \
  -d '{
    "symbol": "GAZP",
    "entryPrice": 145.50,
    "quantity": 500,
    "entryDate": "2023-01-15",
    "marginAmount": 75000.00,
    "notes": "Газпром - восстановленная историческая сделка"
  }')

TRADE1_ID=$(echo "$TRADE1" | jq -r '.id')
if [ "$TRADE1_ID" != "null" ]; then
    echo "✅ Сделка GAZP создана с ID: $TRADE1_ID"
    
    # Закрытие сделки
    echo "🔄 Закрытие сделки GAZP по цене 178.20"
    curl -s -X POST http://localhost:8081/api/trades/$TRADE1_ID/sell \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TOKEN" \
      -H "X-Portfolio-ID: $PORTFOLIO_ID" \
      -d '178.20' >/dev/null
    echo "✅ Сделка GAZP закрыта"
else
    echo "❌ Ошибка создания сделки GAZP: $TRADE1"
fi

# Сделка 2: Русагро
echo "📈 Создание сделки: RUSAGRO"
TRADE2=$(curl -s -X POST http://localhost:8081/api/trades/buy \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Portfolio-ID: $PORTFOLIO_ID" \
  -d '{
    "symbol": "RUSAGRO",
    "entryPrice": 1180.00,
    "quantity": 100,
    "entryDate": "2023-03-10",
    "marginAmount": 120000.00,
    "notes": "Русагро - восстановленная историческая сделка"
  }')

TRADE2_ID=$(echo "$TRADE2" | jq -r '.id')
if [ "$TRADE2_ID" != "null" ]; then
    echo "✅ Сделка RUSAGRO создана с ID: $TRADE2_ID"
    
    # Закрытие сделки
    echo "🔄 Закрытие сделки RUSAGRO по цене 1340.00"
    curl -s -X POST http://localhost:8081/api/trades/$TRADE2_ID/sell \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TOKEN" \
      -H "X-Portfolio-ID: $PORTFOLIO_ID" \
      -d '1340.00' >/dev/null
    echo "✅ Сделка RUSAGRO закрыта"
else
    echo "❌ Ошибка создания сделки RUSAGRO: $TRADE2"
fi

# Сделка 3: Сбербанк
echo "📈 Создание сделки: SBER"
TRADE3=$(curl -s -X POST http://localhost:8081/api/trades/buy \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Portfolio-ID: $PORTFOLIO_ID" \
  -d '{
    "symbol": "SBER",
    "entryPrice": 195.80,
    "quantity": 300,
    "entryDate": "2023-05-01",
    "marginAmount": 60000.00,
    "notes": "Сбербанк - восстановленная историческая сделка"
  }')

TRADE3_ID=$(echo "$TRADE3" | jq -r '.id')
if [ "$TRADE3_ID" != "null" ]; then
    echo "✅ Сделка SBER создана с ID: $TRADE3_ID"
    
    # Закрытие сделки
    echo "🔄 Закрытие сделки SBER по цене 218.50"
    curl -s -X POST http://localhost:8081/api/trades/$TRADE3_ID/sell \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TOKEN" \
      -H "X-Portfolio-ID: $PORTFOLIO_ID" \
      -d '218.50' >/dev/null
    echo "✅ Сделка SBER закрыта"
else
    echo "❌ Ошибка создания сделки SBER: $TRADE3"
fi

# Сделка 4: Лукойл (открытая)
echo "📈 Создание открытой сделки: LKOH"
TRADE4=$(curl -s -X POST http://localhost:8081/api/trades/buy \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Portfolio-ID: $PORTFOLIO_ID" \
  -d '{
    "symbol": "LKOH",
    "entryPrice": 6420.00,
    "quantity": 50,
    "entryDate": "2023-11-15",
    "marginAmount": 320000.00,
    "notes": "Лукойл - открытая позиция"
  }')

TRADE4_ID=$(echo "$TRADE4" | jq -r '.id')
if [ "$TRADE4_ID" != "null" ]; then
    echo "✅ Открытая сделка LKOH создана с ID: $TRADE4_ID"
else
    echo "❌ Ошибка создания сделки LKOH: $TRADE4"
fi

# Сделка 5: Яндекс (открытая)
echo "📈 Создание открытой сделки: YNDX"
TRADE5=$(curl -s -X POST http://localhost:8081/api/trades/buy \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Portfolio-ID: $PORTFOLIO_ID" \
  -d '{
    "symbol": "YNDX",
    "entryPrice": 2850.00,
    "quantity": 80,
    "entryDate": "2023-12-01",
    "marginAmount": 230000.00,
    "notes": "Яндекс - открытая позиция"
  }')

TRADE5_ID=$(echo "$TRADE5" | jq -r '.id')
if [ "$TRADE5_ID" != "null" ]; then
    echo "✅ Открытая сделка YNDX создана с ID: $TRADE5_ID"
else
    echo "❌ Ошибка создания сделки YNDX: $TRADE5"
fi

echo ""
echo "🎉 Создание маржинальных сделок завершено!"
echo "📊 Создано 3 закрытых сделки и 2 открытых позиции"
echo "💰 Общий объем маржинальных операций: ~800,000 RUB"
echo ""
echo "📋 Сделки:"
echo "   ✅ GAZP: 145.50 → 178.20 (закрыта)"
echo "   ✅ RUSAGRO: 1180.00 → 1340.00 (закрыта)"
echo "   ✅ SBER: 195.80 → 218.50 (закрыта)"
echo "   📈 LKOH: 6420.00 (открыта)"
echo "   📈 YNDX: 2850.00 (открыта)" 
 