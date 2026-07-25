#!/bin/bash

# Real-Time Stock Market Integration Setup Script
# Linux/macOS Version

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║  Stocky Real-Time Stock Market Integration Setup              ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Check if running in correct directory
if [ ! -f "stocky-backend/backend/package.json" ]; then
    echo "❌ Error: Not in the correct directory."
    echo "   Run this script from the project root (share market directory)"
    exit 1
fi

echo "📦 Step 1: Installing backend dependencies..."
cd stocky-backend/backend
npm install
if [ $? -ne 0 ]; then
    echo "❌ npm install failed"
    cd ../..
    exit 1
fi
cd ../..
echo "✓ Backend dependencies installed"
echo ""

echo "🔑 Step 2: Setting up Finnhub API key..."
if [ -n "$FINNHUB_API_KEY" ]; then
    echo "✓ FINNHUB_API_KEY is already set"
else
    echo "⚠️  FINNHUB_API_KEY is not configured"
    echo "   Get a free API key at: https://finnhub.io/dashboard"
    echo ""
    read -p "Enter your Finnhub API key (or press Enter to use 'demo' for simulated data): " apiKey
    if [ -n "$apiKey" ]; then
        export FINNHUB_API_KEY="$apiKey"
        echo "✓ API key set for this session"
        echo ""
        echo "To persist this across sessions, add to your ~/.bashrc or ~/.zshrc:"
        echo "export FINNHUB_API_KEY='$apiKey'"
    else
        echo "ℹ️  Using 'demo' mode - prices will be simulated"
    fi
fi
echo ""

echo "🚀 Step 3: Starting backend server..."
echo "   Backend will run on http://localhost:4000"
echo "   WebSocket will be available at ws://localhost:4000"
echo ""
echo "Running: npm start"
cd stocky-backend/backend
npm start
