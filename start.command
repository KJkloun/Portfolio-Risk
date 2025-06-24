#!/bin/bash

# Portfolio Risk - Запуск приложения
# Скрипт для быстрого запуска на macOS

echo "🚀 Запуск Portfolio Risk Application..."
echo "======================================"

# Переход в директорию проекта
cd "$(dirname "$0")"

# Функция для проверки порта
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
        return 0  # порт занят
    else
        return 1  # порт свободен
    fi
}

# Функция для очистки процессов
cleanup() {
    echo "🛑 Завершение работы..."
    # Убиваем процессы Spring Boot и Vite
    pkill -f "spring-boot" 2>/dev/null
    pkill -f "mvnw" 2>/dev/null
    pkill -f "TradeDiaryApplication" 2>/dev/null
    pkill -f "vite" 2>/dev/null
    pkill -f "npm.*dev" 2>/dev/null
    sleep 2
    echo "✅ Процессы завершены"
}

# Очистка при прерывании
trap cleanup SIGINT SIGTERM

# Проверяем зависимости
echo "🔍 Проверка зависимостей..."

# Проверяем Java
if ! command -v java &> /dev/null; then
    echo "❌ Java не найдена. Установите Java 17 или выше"
    read -p "Нажмите Enter для выхода..."
    exit 1
fi

# Проверяем Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js не найден. Установите Node.js"
    read -p "Нажмите Enter для выхода..."
    exit 1
fi

# Проверяем npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm не найден. Установите npm"
    read -p "Нажмите Enter для выхода..."
    exit 1
fi

echo "✅ Все зависимости найдены"

# Очищаем порты если заняты
if check_port 8081; then
    echo "🔄 Освобождаем порт 8081..."
    lsof -ti:8081 | xargs kill -9 2>/dev/null || true
    sleep 2
fi

if check_port 3000; then
    echo "🔄 Освобождаем порт 3000..."
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
    sleep 2
fi

# Установка зависимостей frontend (если нужно)
if [ ! -d "frontend/node_modules" ]; then
    echo "📦 Установка зависимостей frontend..."
    cd frontend
    npm install
    cd ..
    echo "✅ Зависимости frontend установлены"
fi

# Запуск Backend
echo "🖥️  Запуск Backend (порт 8081)..."
cd backend
gnome-terminal --title="Portfolio Risk - Backend" -- bash -c "./mvnw clean spring-boot:run; exec bash" 2>/dev/null || \
osascript -e 'tell app "Terminal" to do script "cd \"'$(pwd)'\"; ./mvnw clean spring-boot:run"' 2>/dev/null || \
(./mvnw clean spring-boot:run &)

cd ..

# Ждем запуска backend
echo "⏳ Ожидание запуска backend..."
for i in {1..30}; do
    if check_port 8081; then
        echo "✅ Backend запущен на порту 8081"
        break
    fi
    sleep 2
    if [ $i -eq 30 ]; then
        echo "❌ Backend не запустился за 60 секунд"
        cleanup
        read -p "Нажмите Enter для выхода..."
        exit 1
    fi
done

# Запуск Frontend
echo "🌐 Запуск Frontend (порт 3000)..."
cd frontend
gnome-terminal --title="Portfolio Risk - Frontend" -- bash -c "npm run dev; exec bash" 2>/dev/null || \
osascript -e 'tell app "Terminal" to do script "cd \"'$(pwd)'\"; npm run dev"' 2>/dev/null || \
(npm run dev &)

cd ..

# Ждем запуска frontend
echo "⏳ Ожидание запуска frontend..."
for i in {1..20}; do
    if check_port 3000; then
        echo "✅ Frontend запущен на порту 3000"
        break
    fi
    sleep 2
    if [ $i -eq 20 ]; then
        echo "❌ Frontend не запустился за 40 секунд"
        cleanup
        read -p "Нажмите Enter для выхода..."
        exit 1
    fi
done

# Открываем браузер
echo "🌐 Открытие приложения в браузере..."
sleep 3
open http://localhost:3000

echo ""
echo "🎉 Portfolio Risk успешно запущен!"
echo "======================================"
echo "📊 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:8081"
echo ""
echo "💡 Для остановки приложения нажмите Ctrl+C или закройте терминалы"
echo ""
echo "⚠️  Не закрывайте это окно - оно контролирует работу приложения"

# Ожидаем прерывания
while true; do
    sleep 5
    # Проверяем что оба сервиса работают
    if ! check_port 8081; then
        echo "❌ Backend перестал работать"
        break
    fi
    if ! check_port 3000; then
        echo "❌ Frontend перестал работать"
        break
    fi
done

cleanup
echo "🏁 Приложение завершено"
read -p "Нажмите Enter для выхода..." 