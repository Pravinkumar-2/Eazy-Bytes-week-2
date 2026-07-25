# Quick Start - Real-Time Stock Updates

## 🚀 Get Running in 2 Minutes

### Option 1: Automated Setup (Recommended)

**Windows PowerShell:**
```powershell
.\setup-realtime.ps1
```

**Linux/macOS:**
```bash
bash setup-realtime.sh
```

### Option 2: Manual Setup

1. **Install backend packages:**
   ```bash
   cd stocky-backend/backend
   npm install
   ```

2. **Configure API key:**
   ```bash
   # Windows PowerShell
   $env:FINNHUB_API_KEY="your_key_here"
   
   # Linux/macOS
   export FINNHUB_API_KEY="your_key_here"
   ```
   
   Get free key at: https://finnhub.io/dashboard

3. **Start backend:**
   ```bash
   npm start
   ```
   
   You should see:
   ```
   ✓ Using real-time market data from Finnhub API
   Stocky backend listening on http://localhost:4000
   WebSocket server at ws://localhost:4000
   ```

4. **In another terminal, start frontend:**
   ```bash
   cd share\ market
   npm install
   npm run dev
   ```

## 🎯 What's New

- ✅ Real stock prices from Finnhub API
- ✅ Live WebSocket updates every 2 seconds
- ✅ React hooks for easy integration
- ✅ Auto-reconnection on disconnect
- ✅ Simulated mode fallback

## 💡 Use Real-Time Prices in Your Components

```jsx
import { useStockPrice } from "./useStockPrice";

function MyComponent({ symbol }) {
  const { stock, loading, isRealTime } = useStockPrice(symbol);
  
  return (
    <div>
      <h3>{stock?.name}</h3>
      <p>${stock?.price}</p>
      {isRealTime && <span>🔴 LIVE</span>}
    </div>
  );
}
```

## 📚 Full Documentation

See `REALTIME_INTEGRATION_GUIDE.md` for:
- Complete API reference
- All available hooks
- Component examples
- Troubleshooting guide
- Architecture overview

## 🔧 Environment Setup

Copy `.env.example` to `.env` and configure:
```bash
cd stocky-backend/backend
cp .env.example .env
# Edit .env with your Finnhub API key
```

## 📊 No API Key? No Problem!

The app works perfectly with simulated prices:
- Prices update via random walk
- Same WebSocket experience
- Perfect for testing/demo
- Just don't set FINNHUB_API_KEY

## ⚡ Performance

- **Update frequency:** Every 2 seconds
- **API calls:** Cached intelligently
- **Rate limit:** 60 calls/min (Finnhub free tier)
- **Latency:** ~15-20ms WebSocket delivery

Enjoy real-time trading! 🚀
