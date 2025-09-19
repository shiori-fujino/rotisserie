#!/bin/bash

# --- 1. Start Postgres (skip if already running) ---
echo "▶ Checking Postgres..."
if ! pg_isready -q -d rotisserie -U juno; then
  echo "▶ Starting Postgres..."
  brew services start postgresql@15   # <- change if your version is different
else
  echo "✔ Postgres already running"
fi

# --- 2. Start backend ---
echo "▶ Starting backend..."
cd backend
npm run dev &
BACK_PID=$!
cd ..

# --- 3. Start frontend ---
echo "▶ Starting frontend..."
cd frontend
npm run dev &
FRONT_PID=$!
cd ..

# --- 4. Trap Ctrl+C to stop background processes ---
trap "echo 'Stopping...'; kill $BACK_PID $FRONT_PID" SIGINT

# Keep script running so trap works
wait
