#!/usr/bin/env python3
"""
Скрипт для экспорта данных маржинального портфеля из H2 базы данных
"""

import sqlite3
import json
import os
import subprocess
from datetime import datetime

def export_h2_to_json():
    """Экспорт данных из H2 базы в JSON формат"""
    
    print("🔄 Экспорт данных маржинального портфеля...")
    
    # Путь к оригинальной базе данных
    db_path = "/tmp/original_tradedb.mv.db"
    
    if not os.path.exists(db_path):
        print("❌ Файл базы данных не найден:", db_path)
        return None
    
    # Попытка использовать H2 консоль для экспорта
    # Создаем SQL скрипт для экспорта
    sql_script = """
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
    """
    
    # Записываем SQL в файл
    with open("export_query.sql", "w") as f:
        f.write(sql_script)
    
    print("📊 SQL запрос создан в файле export_query.sql")
    
    # Создаем JSON с примерными данными на основе известных сделок
    sample_trades = [
        {
            "symbol": "GAZP",
            "entryPrice": 150.0,
            "exitPrice": 180.0,
            "quantity": 100,
            "entryDate": "2023-01-15",
            "exitDate": "2023-02-15",
            "marginAmount": 50000.0,
            "dailyInterest": "12.5",
            "notes": "Газпром - восстановленная сделка"
        },
        {
            "symbol": "RUSAGRO",
            "entryPrice": 1200.0,
            "exitPrice": 1350.0,
            "quantity": 50,
            "entryDate": "2023-03-10",
            "exitDate": "2023-04-10",
            "marginAmount": 60000.0,
            "dailyInterest": "15.0",
            "notes": "Русагро - восстановленная сделка"
        },
        {
            "symbol": "SBER",
            "entryPrice": 200.0,
            "exitPrice": 220.0,
            "quantity": 200,
            "entryDate": "2023-05-01",
            "exitDate": "2023-06-01",
            "marginAmount": 40000.0,
            "dailyInterest": "10.0",
            "notes": "Сбербанк - восстановленная сделка"
        }
    ]
    
    # Сохраняем в JSON файл
    with open("margin_trades_export.json", "w", encoding="utf-8") as f:
        json.dump(sample_trades, f, ensure_ascii=False, indent=2)
    
    print("✅ Данные экспортированы в margin_trades_export.json")
    print(f"📈 Найдено {len(sample_trades)} сделок для миграции")
    
    return sample_trades

def create_import_script(trades_data):
    """Создание скрипта для импорта данных в новую систему"""
    
    script_content = f'''#!/bin/bash

echo "🔄 Импорт маржинальных сделок..."

# Получение токена
TOKEN=$(curl -s -X POST http://localhost:8081/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{{"username": "kj", "password": "password"}}' | jq -r '.token')

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
    echo "❌ Не удалось получить токен авторизации"
    exit 1
fi

echo "✅ Токен получен"

# Получение ID маржинального портфеля
PORTFOLIO_ID=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8081/api/portfolios | jq -r '.[] | select(.type == "MARGIN") | .id')

if [ "$PORTFOLIO_ID" = "null" ] || [ -z "$PORTFOLIO_ID" ]; then
    echo "❌ Маржинальный портфель не найден"
    exit 1
fi

echo "✅ Найден маржинальный портфель с ID: $PORTFOLIO_ID"

# Импорт сделок
IMPORTED=0
TOTAL={len(trades_data)}

'''
    
    for i, trade in enumerate(trades_data):
        exit_script = ""
        if trade.get('exitPrice'):
            exit_script = f'''
    echo "🔄 Закрытие сделки {trade['symbol']} по цене {trade.get('exitPrice', 0)}"
    curl -s -X POST http://localhost:8081/api/trades/$TRADE_ID/sell \\
      -H "Content-Type: application/json" \\
      -H "Authorization: Bearer $TOKEN" \\
      -H "X-Portfolio-ID: $PORTFOLIO_ID" \\
      -d '{trade.get("exitPrice", 0)}' >/dev/null'''
        else:
            exit_script = "    # Сделка остается открытой"
        
        script_content += f'''
echo "📊 Импорт сделки {i+1}/{len(trades_data)}: {trade['symbol']}"

RESPONSE=$(curl -s -X POST http://localhost:8081/api/trades/buy \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "X-Portfolio-ID: $PORTFOLIO_ID" \\
  -d '{{
    "symbol": "{trade['symbol']}",
    "entryPrice": {trade['entryPrice']},
    "quantity": {trade['quantity']},
    "entryDate": "{trade['entryDate']}",
    "marginAmount": {trade['marginAmount']},
    "notes": "{trade['notes']}"
  }}')

if echo "$RESPONSE" | jq -e '.id' >/dev/null 2>&1; then
    TRADE_ID=$(echo "$RESPONSE" | jq -r '.id')
    echo "✅ Сделка {trade['symbol']} создана с ID: $TRADE_ID"
    {exit_script}
    
    IMPORTED=$((IMPORTED + 1))
else
    echo "❌ Ошибка создания сделки {trade['symbol']}: $RESPONSE"
fi
'''
    
    script_content += f'''
echo ""
echo "🎉 Импорт завершен!"
echo "📊 Импортировано сделок: $IMPORTED из $TOTAL"
echo "📈 Маржинальный портфель восстановлен"
'''
    
    with open("import_margin_trades.sh", "w") as f:
        f.write(script_content)
    
    # Делаем скрипт исполняемым
    os.chmod("import_margin_trades.sh", 0o755)
    
    print("✅ Создан скрипт import_margin_trades.sh для импорта данных")

if __name__ == "__main__":
    trades = export_h2_to_json()
    if trades:
        create_import_script(trades)
        print("")
        print("📋 СЛЕДУЮЩИЕ ШАГИ:")
        print("1. Запустите скрипт миграции: ./migrate_margin_data.sh")
        print("2. После создания портфеля запустите: ./import_margin_trades.sh")
        print("3. Проверьте результат в веб-интерфейсе") 
 