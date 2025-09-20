#!/bin/bash

# Stop Stock Financial API Service
echo "🛑 Stopping Stock Financial API Service..."

# Stop the Docker containers
docker-compose down

echo "✅ Stock Financial API Service stopped."
