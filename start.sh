#!/bin/bash

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Запуск Portfolio Risk Trading Application${NC}"
echo "================================================="

# Проверка зависимостей
echo -e "${YELLOW}📋 Проверка зависимостей...${NC}"

# Проверка Java
if ! command -v java &> /dev/null; then
    echo -e "${RED}❌ Java не найдена. Установите Java 17+${NC}"
    exit 1
fi

# Проверка Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js не найден. Установите Node.js${NC}"
    exit 1
fi

# Проверка npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm не найден. Установите npm${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Все зависимости установлены${NC}"

# Создание директорий для логов
mkdir -p logs

# Установка зависимостей frontend если нужно
echo -e "${YELLOW}📦 Проверка зависимостей frontend...${NC}"
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Установка зависимостей корневого frontend...${NC}"
    npm install
fi

if [ ! -d "frontend/node_modules" ]; then
    echo -e "${YELLOW}Установка зависимостей frontend...${NC}"
    cd frontend && npm install && cd ..
fi

echo -e "${GREEN}✅ Зависимости готовы${NC}"

# Остановка предыдущих процессов если есть
echo -e "${YELLOW}🛑 Остановка предыдущих процессов...${NC}"
pkill -f "spring-boot:run" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
sleep 2

# Запуск backend
echo -e "${BLUE}🔧 Запуск Backend (Spring Boot)...${NC}"
cd backend
nohup ./mvnw spring-boot:run > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# Ожидание запуска backend
echo -e "${YELLOW}⏳ Ожидание запуска backend...${NC}"
sleep 5

# Проверка запуска backend
for i in {1..30}; do
    if curl -s http://localhost:8081/api/trades > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend запущен (PID: $BACKEND_PID)${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}❌ Backend не запустился за 30 секунд${NC}"
        echo -e "${YELLOW}Проверьте логи: tail -f logs/backend.log${NC}"
        exit 1
    fi
    sleep 1
done

# Запуск основного frontend
echo -e "${BLUE}🎨 Запуск Frontend (React)...${NC}"
nohup npm run dev > logs/frontend-main.log 2>&1 &
FRONTEND_MAIN_PID=$!

# Запуск дополнительного frontend
echo -e "${BLUE}🎨 Запуск дополнительного Frontend...${NC}"
cd frontend
nohup npm run dev > ../logs/frontend-additional.log 2>&1 &
FRONTEND_ADD_PID=$!
cd ..

# Ожидание запуска frontend
echo -e "${YELLOW}⏳ Ожидание запуска frontend...${NC}"
sleep 3

# Сохранение PID процессов
echo "$BACKEND_PID" > logs/backend.pid
echo "$FRONTEND_MAIN_PID" > logs/frontend-main.pid  
echo "$FRONTEND_ADD_PID" > logs/frontend-additional.pid

echo ""
echo -e "${GREEN}🎉 ПРОЕКТ УСПЕШНО ЗАПУЩЕН!${NC}"
echo "================================="
echo -e "${BLUE}📱 Веб-приложения:${NC}"
echo -e "   • Основное:        ${GREEN}http://localhost:5173${NC}"
echo -e "   • Дополнительное:  ${GREEN}http://localhost:3000${NC}"
echo ""
echo -e "${BLUE}🔧 API Backend:${NC}"
echo -e "   • REST API:        ${GREEN}http://localhost:8081/api${NC}"
echo -e "   • H2 Database:     ${GREEN}http://localhost:8081/api/h2-console${NC}"
echo ""
echo -e "${BLUE}📊 Процессы:${NC}"
echo -e "   • Backend PID:     ${YELLOW}$BACKEND_PID${NC}"
echo -e "   • Frontend PID:    ${YELLOW}$FRONTEND_MAIN_PID${NC}"
echo -e "   • Frontend 2 PID:  ${YELLOW}$FRONTEND_ADD_PID${NC}"
echo ""
echo -e "${BLUE}📝 Управление:${NC}"
echo -e "   • Остановить все:  ${YELLOW}./stop.sh${NC}"
echo -e "   • Проверить статус: ${YELLOW}./status.sh${NC}"
echo -e "   • Логи backend:    ${YELLOW}tail -f logs/backend.log${NC}"
echo -e "   • Логи frontend:   ${YELLOW}tail -f logs/frontend-main.log${NC}"
echo ""
echo -e "${GREEN}✨ Приложение готово к использованию!${NC}" 