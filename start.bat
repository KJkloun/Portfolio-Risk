@echo off
chcp 65001 >nul
echo 🚀 Запуск Portfolio Risk Trading Application
echo =================================================

REM Проверка зависимостей
echo 📋 Проверка зависимостей...

where java >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Java не найдена. Установите Java 17+
    pause
    exit /b 1
)

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js не найден. Установите Node.js
    pause
    exit /b 1
)

where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ npm не найден. Установите npm
    pause
    exit /b 1
)

echo ✅ Все зависимости установлены

REM Создание директорий для логов
if not exist logs mkdir logs

REM Установка зависимостей frontend
echo 📦 Проверка зависимостей frontend...
if not exist node_modules (
    echo Установка зависимостей корневого frontend...
    call npm install
)

if not exist frontend\node_modules (
    echo Установка зависимостей frontend...
    cd frontend
    call npm install
    cd ..
)

echo ✅ Зависимости готовы

REM Остановка предыдущих процессов
echo 🛑 Остановка предыдущих процессов...
taskkill /f /im java.exe >nul 2>nul
taskkill /f /im node.exe >nul 2>nul
timeout /t 2 >nul

REM Запуск backend
echo 🔧 Запуск Backend (Spring Boot)...
cd backend
start "Backend" cmd /c "mvnw.cmd spring-boot:run > ..\logs\backend.log 2>&1"
cd ..

REM Ожидание запуска backend
echo ⏳ Ожидание запуска backend...
timeout /t 10 >nul

REM Запуск основного frontend
echo 🎨 Запуск Frontend (React)...
start "Frontend Main" cmd /c "npm run dev > logs\frontend-main.log 2>&1"

REM Запуск дополнительного frontend
echo 🎨 Запуск дополнительного Frontend...
cd frontend
start "Frontend Additional" cmd /c "npm run dev > ..\logs\frontend-additional.log 2>&1"
cd ..

REM Ожидание запуска frontend
echo ⏳ Ожидание запуска frontend...
timeout /t 5 >nul

echo.
echo 🎉 ПРОЕКТ УСПЕШНО ЗАПУЩЕН!
echo =================================
echo 📱 Веб-приложения:
echo    • Основное:        http://localhost:5173
echo    • Дополнительное:  http://localhost:3000
echo.
echo 🔧 API Backend:
echo    • REST API:        http://localhost:8081/api
echo    • H2 Database:     http://localhost:8081/api/h2-console
echo.
echo 📝 Для остановки запустите stop.bat
echo.
echo ✨ Приложение готово к использованию!

REM Автоматическое открытие браузера
start http://localhost:5173

pause 