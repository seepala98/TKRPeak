#!/bin/bash

# Start Stock Financial API Service
echo "🚀 Starting Stock Financial API Service..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Build and start the service
echo "🔨 Building Docker container..."
docker compose build

echo "🏃 Starting FastAPI service..."
docker compose up -d

# Wait for service to be healthy
echo "⏳ Waiting for service to be ready..."
sleep 10

# Check if service is running
if docker compose ps | grep -q "Up"; then
    echo "✅ FastAPI service is running!"
    echo "📖 API Documentation: http://localhost:8000/docs"
    echo "🔍 Health Check: http://localhost:8000/health"
    echo "📊 Test Endpoint: http://localhost:8000/financial/AAPL"
    echo ""
    echo "To stop the service: ./stop-api.sh"
    echo "To view logs: docker compose logs -f"
else
    echo "❌ Failed to start the service"
    docker compose logs
    exit 1
fi
