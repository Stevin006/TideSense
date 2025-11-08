#!/bin/bash

# TideSense App Startup Script
# This script starts both the backend server and React Native app

echo "🌊 TideSense - Complete Startup"
echo "================================"
echo ""

# Check if backend is running
if ! lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  Backend server is not running!"
    echo "Starting backend server in background..."
    echo ""

    # Start backend in background
    cd server
    python3 main.py > server.log 2>&1 &
    SERVER_PID=$!
    cd ..

    echo "✅ Backend server started (PID: $SERVER_PID)"
    echo "   View logs: tail -f server/server.log"
    echo "   Health check: http://localhost:8000/health"
    echo ""

    # Wait for server to start
    echo "⏳ Waiting for server to be ready..."
    for i in {1..10}; do
        if curl -s http://localhost:8000/health > /dev/null 2>&1; then
            echo "✅ Server is ready!"
            break
        fi
        sleep 1
    done
    echo ""
else
    echo "✅ Backend server is already running"
    echo ""
fi

# Start React Native app
echo "🚀 Starting React Native app..."
echo ""
npm start
