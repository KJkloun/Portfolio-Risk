#!/bin/bash

echo "🔄 Быстрый запуск Portfolio-Risk..."

# Остановка всех процессов
echo "🛑 Остановка процессов..."
pkill -f "vite" 2>/dev/null || true
pkill -f "java.*TradeDiaryApplication" 2>/dev/null || true
sleep 3

# Проверка портов
echo "🔍 Проверка портов..."
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo "❌ Порт 3000 занят, освобождаем..."
    kill -9 $(lsof -Pi :3000 -sTCP:LISTEN -t) 2>/dev/null || true
fi

if lsof -Pi :8081 -sTCP:LISTEN -t >/dev/null ; then
    echo "❌ Порт 8081 занят, освобождаем..."
    kill -9 $(lsof -Pi :8081 -sTCP:LISTEN -t) 2>/dev/null || true
fi

sleep 2

# Запуск backend
echo "🚀 Запуск backend..."
cd backend
mvn spring-boot:run > ../backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# Ждем запуска backend
echo "⏳ Ожидание backend (20 сек)..."
sleep 20

# Проверка backend
if curl -s http://localhost:8081/api/auth/login -H "Content-Type: application/json" -d '{}' | grep -q "message"; then
    echo "✅ Backend запущен"
else
    echo "❌ Backend не отвечает, проверьте backend.log"
fi

# Запуск frontend
echo "🎨 Запуск frontend..."
cd frontend
npm run dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

# Ждем запуска frontend
echo "⏳ Ожидание frontend (10 сек)..."
sleep 10

echo ""
echo "🎉============================================🎉"
echo "    PORTFOLIO-RISK ЗАПУЩЕН!"
echo "🎉============================================🎉"
echo ""
echo "🌐 ДОСТУП:"
echo "   📱 Frontend: http://localhost:3000"
echo "   🔧 Backend:  http://localhost:8081"
echo ""
echo "👤 ДАННЫЕ ДЛЯ ВХОДА:"
echo "   📧 Логин: kj"
echo "   🔑 Пароль: password"
echo ""
echo "📋 ЛОГИ:"
echo "   📄 Backend: backend.log"
echo "   📄 Frontend: frontend.log"
echo ""
echo "🛑 ОСТАНОВКА:"
echo "   Ctrl+C или ./stop.sh"
echo "============================================"

# Проверка статуса
echo "🔍 Проверка статуса сервисов..."
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo "✅ Frontend работает на порту 3000"
else
    echo "❌ Frontend не запустился"
fi

if lsof -Pi :8081 -sTCP:LISTEN -t >/dev/null ; then
    echo "✅ Backend работает на порту 8081"
else
    echo "❌ Backend не запустился"
fi

echo ""
echo "🎯 Откройте браузер: http://localhost:3000"
echo ""

# Ожидание завершения
wait 
 