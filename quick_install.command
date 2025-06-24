#!/bin/bash

# Portfolio Risk - Установка зависимостей
# Скрипт для первоначальной установки

echo "📦 Установка Portfolio Risk Application..."
echo "=========================================="

# Переход в директорию проекта
cd "$(dirname "$0")"

# Проверяем зависимости
echo "🔍 Проверка системных зависимостей..."

# Проверяем Java
if ! command -v java &> /dev/null; then
    echo "❌ Java не найдена"
    echo "   💡 Установите Java 17 или выше:"
    echo "   🔗 https://adoptium.net/temurin/releases/"
    read -p "Нажмите Enter после установки Java..."
    if ! command -v java &> /dev/null; then
        echo "❌ Java все еще не найдена. Выход..."
        exit 1
    fi
else
    java_version=$(java -version 2>&1 | head -1 | cut -d'"' -f2 | cut -d'.' -f1)
    echo "✅ Java найдена (версия: $java_version)"
fi

# Проверяем Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js не найден"
    echo "   💡 Установите Node.js:"
    echo "   🔗 https://nodejs.org/"
    read -p "Нажмите Enter после установки Node.js..."
    if ! command -v node &> /dev/null; then
        echo "❌ Node.js все еще не найден. Выход..."
        exit 1
    fi
else
    node_version=$(node --version)
    echo "✅ Node.js найден (версия: $node_version)"
fi

# Проверяем npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm не найден"
    echo "   💡 npm должен устанавливаться вместе с Node.js"
    read -p "Нажмите Enter для продолжения..."
    exit 1
else
    npm_version=$(npm --version)
    echo "✅ npm найден (версия: $npm_version)"
fi

echo ""
echo "📦 Установка зависимостей..."

# Установка зависимостей frontend
echo "🌐 Установка зависимостей Frontend..."
cd frontend
if [ -f "package.json" ]; then
    npm install
    if [ $? -eq 0 ]; then
        echo "✅ Frontend зависимости установлены"
    else
        echo "❌ Ошибка установки frontend зависимостей"
        read -p "Нажмите Enter для выхода..."
        exit 1
    fi
else
    echo "❌ package.json не найден в директории frontend"
    read -p "Нажмите Enter для выхода..."
    exit 1
fi
cd ..

# Проверка backend зависимостей
echo "🖥️  Проверка Backend зависимостей..."
cd backend
if [ -f "pom.xml" ]; then
    echo "✅ Maven проект найден"
    # Даем права на выполнение mvnw
    chmod +x mvnw
    echo "✅ Права на mvnw установлены"
else
    echo "❌ pom.xml не найден в директории backend"
    read -p "Нажмите Enter для выхода..."
    exit 1
fi
cd ..

# Создание ярлыков на рабочем столе (опционально)
echo ""
echo "🖱️  Создать ярлыки на рабочем столе? (y/n)"
read -p "Ответ: " create_shortcuts

if [[ $create_shortcuts =~ ^[Yy]$ ]]; then
    DESKTOP="$HOME/Desktop"
    PROJECT_DIR="$(pwd)"
    
    # Ярлык для запуска
    cat > "$DESKTOP/🚀 Запуск Portfolio Risk.command" << EOF
#!/bin/bash
cd "$PROJECT_DIR"
./start.command
EOF
    chmod +x "$DESKTOP/🚀 Запуск Portfolio Risk.command"
    
    # Ярлык для остановки
    cat > "$DESKTOP/🛑 Остановка Portfolio Risk.command" << EOF
#!/bin/bash
cd "$PROJECT_DIR"
./stop.command
EOF
    chmod +x "$DESKTOP/🛑 Остановка Portfolio Risk.command"
    
    echo "✅ Ярлыки созданы на рабочем столе"
fi

# Делаем скрипты исполняемыми
chmod +x start.command
chmod +x stop.command
chmod +x quick_install.command

echo ""
echo "🎉 Установка завершена!"
echo "======================"
echo ""
echo "📋 Что делать дальше:"
echo "   1. Двойной клик на 'start.command' для запуска"
echo "   2. Или используйте ярлыки на рабочем столе"
echo "   3. Приложение откроется в браузере по адресу http://localhost:3000"
echo ""
echo "🔧 Управление:"
echo "   • Запуск: ./start.command или двойной клик"
echo "   • Остановка: ./stop.command или Ctrl+C в окне запуска"
echo ""
echo "💡 При первом запуске может потребоваться время на загрузку зависимостей"

read -p "Нажмите Enter для выхода..." 