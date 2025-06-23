#!/bin/bash

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}📊 Статус Portfolio Risk Trading Application${NC}"
echo "=============================================="

# Проверка backend
echo -e "${BLUE}🔧 Backend Status:${NC}"
if curl -s http://localhost:8081/api/trades > /dev/null 2>&1; then
    echo -e "   ${GREEN}✅ Backend работает (http://localhost:8081)${NC}"
    if [ -f "logs/backend.pid" ]; then
        BACKEND_PID=$(cat logs/backend.pid)
        echo -e "   ${YELLOW}   PID: $BACKEND_PID${NC}"
    fi
else
    echo -e "   ${RED}❌ Backend не отвечает${NC}"
fi

# Проверка frontend основного
echo -e "${BLUE}🎨 Frontend Status:${NC}"
if curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo -e "   ${GREEN}✅ Основной Frontend работает (http://localhost:5173)${NC}"
    if [ -f "logs/frontend-main.pid" ]; then
        FRONTEND_MAIN_PID=$(cat logs/frontend-main.pid)
        echo -e "   ${YELLOW}   PID: $FRONTEND_MAIN_PID${NC}"
    fi
else
    echo -e "   ${RED}❌ Основной Frontend не отвечает${NC}"
fi

# Проверка frontend дополнительного
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e "   ${GREEN}✅ Дополнительный Frontend работает (http://localhost:3000)${NC}"
    if [ -f "logs/frontend-additional.pid" ]; then
        FRONTEND_ADD_PID=$(cat logs/frontend-additional.pid)
        echo -e "   ${YELLOW}   PID: $FRONTEND_ADD_PID${NC}"
    fi
else
    echo -e "   ${RED}❌ Дополнительный Frontend не отвечает${NC}"
fi

# Проверка процессов
echo -e "${BLUE}⚙️  Активные процессы:${NC}"
PROCESSES=$(ps aux | grep -E "(spring-boot:run|vite|TradeDiaryApplication)" | grep -v grep)
if [ -n "$PROCESSES" ]; then
    echo "$PROCESSES" | while read line; do
        echo -e "   ${YELLOW}$line${NC}"
    done
else
    echo -e "   ${RED}Нет активных процессов приложения${NC}"
fi

# Проверка портов
echo -e "${BLUE}🔌 Занятые порты:${NC}"
if lsof -i :8081 > /dev/null 2>&1; then
    echo -e "   ${GREEN}✅ Порт 8081 (Backend) занят${NC}"
else
    echo -e "   ${RED}❌ Порт 8081 свободен${NC}"
fi

if lsof -i :5173 > /dev/null 2>&1; then
    echo -e "   ${GREEN}✅ Порт 5173 (Frontend) занят${NC}"
else
    echo -e "   ${RED}❌ Порт 5173 свободен${NC}"
fi

if lsof -i :3000 > /dev/null 2>&1; then
    echo -e "   ${GREEN}✅ Порт 3000 (Frontend) занят${NC}"
else
    echo -e "   ${RED}❌ Порт 3000 свободен${NC}"
fi

# Логи
echo -e "${BLUE}📝 Последние логи:${NC}"
if [ -f "logs/backend.log" ]; then
    echo -e "   ${YELLOW}Backend (последние 3 строки):${NC}"
    tail -n 3 logs/backend.log | sed 's/^/      /'
fi

if [ -f "logs/frontend-main.log" ]; then
    echo -e "   ${YELLOW}Frontend (последние 3 строки):${NC}"
    tail -n 3 logs/frontend-main.log | sed 's/^/      /'
fi

echo ""
echo -e "${GREEN}📊 Статус проверен${NC}" 