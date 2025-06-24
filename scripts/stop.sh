#!/bin/bash

# Portfolio Risk - Stop Script
echo "🛑 Stopping Portfolio Risk Management System..."

# Navigate to project root
cd "$(dirname "$0")/.."

# Create logs directory if it doesn't exist
mkdir -p logs

# Function to kill process by PID file
kill_by_pid_file() {
    local pid_file=$1
    local service_name=$2
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if ps -p $pid > /dev/null 2>&1; then
            echo "🔄 Stopping $service_name (PID: $pid)..."
            kill $pid
            sleep 2
            if ps -p $pid > /dev/null 2>&1; then
                echo "⚠️  Force killing $service_name..."
                kill -9 $pid
            fi
        fi
        rm -f "$pid_file"
        echo "✅ $service_name stopped"
    else
        echo "ℹ️  No PID file found for $service_name"
    fi
}

# Stop services using PID files
kill_by_pid_file "logs/backend.pid" "Backend"
kill_by_pid_file "logs/frontend.pid" "Frontend"

# Kill any remaining processes by name
echo "🧹 Cleaning up any remaining processes..."

# Kill Spring Boot processes
pkill -f "spring-boot:run" 2>/dev/null && echo "✅ Killed remaining Spring Boot processes"

# Kill Vite processes
pkill -f "vite" 2>/dev/null && echo "✅ Killed remaining Vite processes"

# Kill any processes on ports 3000 and 8081
for port in 3000 8081; do
    pid=$(lsof -ti:$port 2>/dev/null)
    if [ ! -z "$pid" ]; then
        echo "🔄 Killing process on port $port (PID: $pid)..."
        kill -9 $pid 2>/dev/null
    fi
done

echo ""
echo "🎉 Portfolio Risk Management System stopped successfully!"
echo ""
echo "🚀 To start again, run: ./scripts/start.sh" 