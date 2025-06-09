#!/bin/bash

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🛑 Остановка Portfolio Risk Trading Application${NC}"
echo "================================================="

# Остановка по PID если файлы существуют
if [ -f "logs/backend.pid" ]; then
    BACKEND_PID=$(cat logs/backend.pid)
    if kill -0 $BACKEND_PID 2>/dev/null; then
        echo -e "${YELLOW}Остановка Backend (PID: $BACKEND_PID)...${NC}"
        kill $BACKEND_PID
        rm logs/backend.pid
    fi
fi

if [ -f "logs/frontend-main.pid" ]; then
    FRONTEND_MAIN_PID=$(cat logs/frontend-main.pid)
    if kill -0 $FRONTEND_MAIN_PID 2>/dev/null; then
        echo -e "${YELLOW}Остановка основного Frontend (PID: $FRONTEND_MAIN_PID)...${NC}"
        kill $FRONTEND_MAIN_PID
        rm logs/frontend-main.pid
    fi
fi

if [ -f "logs/frontend-additional.pid" ]; then
    FRONTEND_ADD_PID=$(cat logs/frontend-additional.pid)
    if kill -0 $FRONTEND_ADD_PID 2>/dev/null; then
        echo -e "${YELLOW}Остановка дополнительного Frontend (PID: $FRONTEND_ADD_PID)...${NC}"
        kill $FRONTEND_ADD_PID
        rm logs/frontend-additional.pid
    fi
fi

# Принудительная остановка всех связанных процессов
echo -e "${YELLOW}Принудительная остановка всех процессов...${NC}"
pkill -f "spring-boot:run" 2>/dev/null || true
pkill -f "mvnw" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
pkill -f "TradeDiaryApplication" 2>/dev/null || true

# Ожидание завершения процессов
sleep 3

# Проверка что все остановлено
REMAINING=$(ps aux | grep -E "(spring-boot:run|vite|TradeDiaryApplication)" | grep -v grep | wc -l)

if [ $REMAINING -eq 0 ]; then
    echo -e "${GREEN}✅ Все процессы успешно остановлены${NC}"
else
    echo -e "${YELLOW}⚠️  Некоторые процессы могут ещё работать${NC}"
    echo -e "${YELLOW}Активные процессы:${NC}"
    ps aux | grep -E "(spring-boot:run|vite|TradeDiaryApplication)" | grep -v grep
fi

echo -e "${GREEN}🏁 Остановка завершена${NC}" 