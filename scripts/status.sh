#!/bin/bash

# Portfolio Risk - Status Script
echo "📊 Portfolio Risk Management System Status"
echo "=========================================="

# Navigate to project root
cd "$(dirname "$0")/.."

# Function to check if port is in use
check_port() {
    local port=$1
    local service=$2
    
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        local pid=$(lsof -ti:$port)
        echo "✅ $service is running on port $port (PID: $pid)"
        return 0
    else
        echo "❌ $service is not running on port $port"
        return 1
    fi
}

# Function to check service by PID file
check_pid_file() {
    local pid_file=$1
    local service=$2
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if ps -p $pid > /dev/null 2>&1; then
            echo "✅ $service PID file exists and process is running (PID: $pid)"
            return 0
        else
            echo "⚠️  $service PID file exists but process is not running"
            return 1
        fi
    else
        echo "ℹ️  No PID file found for $service"
        return 1
    fi
}

# Check services
echo ""
echo "🔍 Checking services..."
echo ""

# Check backend
echo "🏗️  Backend Service:"
check_port 8081 "Backend API"
check_pid_file "logs/backend.pid" "Backend"

echo ""

# Check frontend
echo "🎨 Frontend Service:"
check_port 3000 "Frontend"
check_pid_file "logs/frontend.pid" "Frontend"

echo ""

# Check database files
echo "💾 Database Status:"
if [ -f "backend/data/tradedb.mv.db" ]; then
    size=$(du -h "backend/data/tradedb.mv.db" | cut -f1)
    echo "✅ Main database file exists ($size)"
else
    echo "❌ Main database file not found"
fi

if [ -f "backend/data/tradedb.trace.db" ]; then
    size=$(du -h "backend/data/tradedb.trace.db" | cut -f1)
    echo "✅ Database trace file exists ($size)"
else
    echo "❌ Database trace file not found"
fi

echo ""

# Test API connectivity
echo "🔌 API Connectivity:"
if curl -s http://localhost:8081/api/portfolios > /dev/null 2>&1; then
    echo "✅ Backend API is responding"
else
    echo "❌ Backend API is not responding"
fi

if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Frontend is responding"
else
    echo "❌ Frontend is not responding"
fi

echo ""

# Show recent log entries
echo "📋 Recent Logs:"
echo ""
if [ -f "logs/backend.log" ]; then
    echo "🏗️  Backend (last 3 lines):"
    tail -3 logs/backend.log | sed 's/^/   /'
else
    echo "🏗️  No backend log file found"
fi

echo ""
if [ -f "logs/frontend.log" ]; then
    echo "🎨 Frontend (last 3 lines):"
    tail -3 logs/frontend.log | sed 's/^/   /'
else
    echo "🎨 No frontend log file found"
fi

echo ""
echo "=========================================="
echo "🚀 To start: ./scripts/start.sh"
echo "🛑 To stop:  ./scripts/stop.sh" 