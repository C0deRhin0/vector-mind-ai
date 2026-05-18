#!/bin/bash
echo "Stopping all services..."

# Stop backend and frontend
pkill -f "uvicorn main:app" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true

# Stop Docker services
docker compose stop 2>/dev/null || true

echo "All services stopped."
