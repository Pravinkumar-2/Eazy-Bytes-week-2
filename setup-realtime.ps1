#!/usr/bin/env pwsh

# Real-Time Stock Market Integration Setup Script
# Windows PowerShell Version

Write-Host "╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Stocky Real-Time Stock Market Integration Setup              ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Check if running in correct directory
if (-not (Test-Path "stocky-backend/backend/package.json")) {
    Write-Host "❌ Error: Not in the correct directory." -ForegroundColor Red
    Write-Host "   Run this script from the project root (share market directory)" -ForegroundColor Yellow
    exit 1
}

Write-Host "📦 Step 1: Installing backend dependencies..." -ForegroundColor Green
Push-Location stocky-backend/backend
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ npm install failed" -ForegroundColor Red
    Pop-Location
    exit 1
}
Pop-Location
Write-Host "✓ Backend dependencies installed" -ForegroundColor Green
Write-Host ""

Write-Host "🔑 Step 2: Setting up Finnhub API key..." -ForegroundColor Green
$apiKeySet = $null -ne $env:FINNHUB_API_KEY -and $env:FINNHUB_API_KEY -ne ""
if ($apiKeySet) {
    Write-Host "✓ FINNHUB_API_KEY is already set" -ForegroundColor Green
} else {
    Write-Host "⚠️  FINNHUB_API_KEY is not configured" -ForegroundColor Yellow
    Write-Host "   Get a free API key at: https://finnhub.io/dashboard" -ForegroundColor Cyan
    Write-Host ""
    $apiKey = Read-Host "Enter your Finnhub API key (or press Enter to use 'demo' for simulated data)"
    if ($apiKey) {
        $env:FINNHUB_API_KEY = $apiKey
        Write-Host "✓ API key set for this session" -ForegroundColor Green
        Write-Host ""
        Write-Host "To persist this across sessions, add to your PowerShell profile:" -ForegroundColor Yellow
        Write-Host "`$env:FINNHUB_API_KEY = '$apiKey'" -ForegroundColor Gray
    } else {
        Write-Host "ℹ️  Using 'demo' mode - prices will be simulated" -ForegroundColor Yellow
    }
}
Write-Host ""

Write-Host "🚀 Step 3: Starting backend server..." -ForegroundColor Green
Write-Host "   Backend will run on http://localhost:4000" -ForegroundColor Cyan
Write-Host "   WebSocket will be available at ws://localhost:4000" -ForegroundColor Cyan
Write-Host ""
Push-Location stocky-backend/backend
Write-Host "Running: npm start" -ForegroundColor Gray
npm start
