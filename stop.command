#!/bin/bash

# Portfolio Risk - Остановка приложения
# Скрипт для остановки всех процессов

echo "🛑 Остановка Portfolio Risk Application..."
echo "========================================="

# Переход в директорию проекта
cd "$(dirname "$0")"

echo "🔄 Завершение процессов..."

# Завершаем все связанные процессы
echo "   - Завершение Spring Boot процессов..."
pkill -f "spring-boot" 2>/dev/null
pkill -f "mvnw" 2>/dev/null
pkill -f "TradeDiaryApplication" 2>/dev/null

echo "   - Завершение Node.js/Vite процессов..."
pkill -f "vite" 2>/dev/null
pkill -f "npm.*dev" 2>/dev/null

# Освобождаем порты принудительно
echo "   - Освобождение портов..."
lsof -ti:8081 | xargs kill -9 2>/dev/null || true
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

# Даем время на завершение
sleep 3

# Проверяем что порты свободны
if lsof -Pi :8081 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  Порт 8081 все еще занят"
else
    echo "✅ Порт 8081 освобожден"
fi

if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  Порт 3000 все еще занят"
else
    echo "✅ Порт 3000 освобожден"
fi

echo ""
echo "🏁 Portfolio Risk остановлен"

read -p "Нажмите Enter для выхода..." 