#!/bin/bash

# Portfolio Risk - Production Environment Script

set -e

echo "🚀 Starting Portfolio Risk in Production Mode..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Function to cleanup on exit
cleanup() {
    echo "🧹 Cleaning up..."
    docker-compose down
}

# Set trap to cleanup on script exit
trap cleanup EXIT

# Pull latest images and start services
echo "📦 Pulling latest images..."
docker-compose pull

echo "🔨 Building and starting services..."
docker-compose up --build -d

echo "✅ Production environment started successfully!"
echo "📱 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:8081/api"
echo "📊 Swagger UI: http://localhost:8081/api/swagger-ui/index.html"

# Show logs
echo "📋 Showing logs (Ctrl+C to exit)..."
docker-compose logs -f 