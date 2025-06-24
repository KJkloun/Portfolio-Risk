#!/bin/bash

# Portfolio Risk - Start Script
echo "🚀 Starting Portfolio Risk Management System..."

# Navigate to project root
cd "$(dirname "$0")/.."

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to kill process on port
kill_port() {
    local port=$1
    local pid=$(lsof -ti:$port)
    if [ ! -z "$pid" ]; then
        echo "🔄 Stopping existing process on port $port (PID: $pid)"
        kill -9 $pid
        sleep 2
    fi
}

# Clean up any existing processes
echo "🧹 Cleaning up existing processes..."
kill_port 8081
kill_port 3000

# Start backend
echo "🏗️  Starting backend on port 8081..."
cd backend
if [ -f "mvnw" ]; then
    ./mvnw spring-boot:run > ../logs/backend.log 2>&1 &
else
    mvn spring-boot:run > ../logs/backend.log 2>&1 &
fi
BACKEND_PID=$!
echo "Backend started with PID: $BACKEND_PID"

# Wait for backend to start
echo "⏳ Waiting for backend to initialize..."
sleep 10

# Check if backend is running
if ! check_port 8081; then
    echo "❌ Backend failed to start on port 8081"
    echo "📋 Backend log:"
    tail -20 logs/backend.log
    exit 1
fi

echo "✅ Backend is running on http://localhost:8081"

# Start frontend
echo "🎨 Starting frontend on port 3000..."
cd ../frontend

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
fi

# Start frontend
npm run dev > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend started with PID: $FRONTEND_PID"

# Wait for frontend to start
echo "⏳ Waiting for frontend to initialize..."
sleep 5

# Check if frontend is running
if ! check_port 3000; then
    echo "❌ Frontend failed to start on port 3000"
    echo "📋 Frontend log:"
    tail -20 ../logs/frontend.log
    exit 1
fi

echo "✅ Frontend is running on http://localhost:3000"

# Create logs directory if it doesn't exist
mkdir -p ../logs

# Save PIDs for later cleanup
echo $BACKEND_PID > ../logs/backend.pid
echo $FRONTEND_PID > ../logs/frontend.pid

echo ""
echo "🎉 Portfolio Risk Management System is now running!"
echo ""
echo "📱 Frontend: http://localhost:3000"
echo "🔌 Backend API: http://localhost:8081/api"
echo ""
echo "🔑 Default credentials: kj / password"
echo ""
echo "🛑 To stop the application, run: ./scripts/stop.sh"
echo "📊 To check status, run: ./scripts/status.sh" 