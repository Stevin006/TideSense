#!/bin/bash

# TideSense Backend Server Startup Script
# This script starts the FastAPI backend server

cd "$(dirname "$0")/server"

echo "🌊 TideSense Backend Server"
echo "============================"
echo ""

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found!"
    echo "Please copy .env.example to .env and add your API keys"
    exit 1
fi

# Check if Python dependencies are installed
if ! python3 -c "import fastapi" 2>/dev/null; then
    echo "📦 Installing Python dependencies..."
    pip3 install -r requirements.txt
    echo ""
fi

# Check if port 8000 is already in use
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  Port 8000 is already in use"
    echo "Killing existing process..."
    lsof -ti:8000 | xargs kill -9 2>/dev/null
    sleep 2
fi

echo "🚀 Starting server at http://localhost:8000"
echo "📝 Logs will be saved to server/server.log"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start the server
python3 main.py
