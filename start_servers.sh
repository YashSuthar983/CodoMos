#!/bin/bash

# Start servers script for CogniWork with GitHub Insights

echo "🚀 Starting CogniWork Application with GitHub Insights..."
echo "================================================"

# Start backend server
echo "Starting backend server..."
cd backend
.venv/bin/uvicorn app.main:app --reload --host 127.0.0.1 --port 8000 &
BACKEND_PID=$!
echo "Backend server started with PID: $BACKEND_PID"

# Wait for backend to be ready
echo "Waiting for backend to be ready..."
sleep 5

# Start frontend server
echo "Starting frontend server..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!
echo "Frontend server started with PID: $FRONTEND_PID"

echo ""
echo "================================================"
echo "✅ Application started successfully!"
echo ""
echo "🔗 Access the application at:"
echo "   Frontend: http://localhost:5173"
echo "   Backend API: http://127.0.0.1:8000"
echo "   API Docs: http://127.0.0.1:8000/docs"
echo ""
echo "📊 GitHub Insights Features:"
echo "   1. Navigate to 'Insights' in the navbar"
echo "   2. Select a repository to view analytics"
echo "   3. Click 'Sync Data' to fetch latest GitHub data"
echo ""
echo "⚠️  Prerequisites:"
echo "   - MongoDB must be running"
echo "   - GitHub PAT must be configured in user profile"
echo "   - Repository must be linked in Projects page"
echo ""
echo "Press Ctrl+C to stop all servers"
echo "================================================"

# Wait for user to stop the servers
wait $BACKEND_PID
wait $FRONTEND_PID
