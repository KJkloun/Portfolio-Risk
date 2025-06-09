@echo off
chcp 65001 >nul
echo 🛑 Остановка Portfolio Risk Trading Application
echo =================================================

echo Остановка всех процессов...

REM Остановка Java процессов (Spring Boot)
taskkill /f /im java.exe >nul 2>nul
if %errorlevel% equ 0 (
    echo ✅ Backend остановлен
) else (
    echo ℹ️  Backend процессы не найдены
)

REM Остановка Node.js процессов (Frontend)
taskkill /f /im node.exe >nul 2>nul
if %errorlevel% equ 0 (
    echo ✅ Frontend процессы остановлены
) else (
    echo ℹ️  Frontend процессы не найдены
)

REM Дополнительная остановка по портам
netstat -ano | findstr :8081 >nul 2>nul
if %errorlevel% equ 0 (
    echo Остановка процесса на порту 8081...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8081') do taskkill /f /pid %%a >nul 2>nul
)

netstat -ano | findstr :5173 >nul 2>nul
if %errorlevel% equ 0 (
    echo Остановка процесса на порту 5173...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5173') do taskkill /f /pid %%a >nul 2>nul
)

netstat -ano | findstr :3000 >nul 2>nul
if %errorlevel% equ 0 (
    echo Остановка процесса на порту 3000...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do taskkill /f /pid %%a >nul 2>nul
)

echo.
echo ✅ Все процессы остановлены
echo 🏁 Остановка завершена

pause 