#!/bin/bash

# Portfolio Risk - Development Environment Script

set -e

echo "🚀 Starting Portfolio Risk in Development Mode..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Function to cleanup on exit
cleanup() {
    echo "🧹 Cleaning up..."
    docker-compose -f docker-compose.dev.yml down
}

# Set trap to cleanup on script exit
trap cleanup EXIT

# Build and start services
echo "🔨 Building and starting services..."
docker-compose -f docker-compose.dev.yml up --build

echo "✅ Development environment stopped." 