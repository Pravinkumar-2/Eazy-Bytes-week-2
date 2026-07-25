# Real Stock API & WebSocket Integration Guide

## ✅ What's Been Implemented

### Backend Changes

1. **Stock API Service** (`stocky-backend/backend/utils/stockApi.js`)
   - Real-time quote fetching from Finnhub API
   - Intraday candle data for charting
   - Company profile information
   - Automatic caching to reduce API calls
   - Fallback mechanism if API is unavailable

2. **WebSocket Server** (`stocky-backend/backend/utils/priceUpdateManager.js`)
   - Real-time price broadcast to subscribed clients
   - Smart subscription management
   - Automatic cleanup of inactive connections
   - Fallback to simulation if no API key

3. **Updated Routes**
   - `GET /api/stocks` - Now fetches real data when API key configured
   - `GET /api/stock/:symbol` - Includes real price & intraday history
   - Health check endpoint shows API mode status

4. **Server Integration**
   - Express server now uses HTTP server for WebSocket support
   - WebSocket server initialized at `/ws` endpoint
   - Graceful fallback to simulated prices

### Frontend Changes

1. **WebSocket Client** (`wsClient.js`)
   - Singleton connection manager
   - Auto-reconnection with exponential backoff
   - Symbol subscription/unsubscription
   - Message type handling
   - Connection lifecycle events

2. **Custom Hooks** (`useStockPrice.js`)
   - `useStockPrice(symbol)` - Real-time single stock price
   - `useStockPrices(symbols)` - Multiple stock prices
   - `useWebSocketStatus()` - Connection status tracking
   - Fallback to REST API if WebSocket unavailable

3. **App Integration**
   - WebSocket auto-connects when user logs in
   - Auto-disconnects when user logs out
   - Seamless integration with existing auth flow

## 🚀 Setup Instructions

### 1. Install Dependencies

```bash
cd stocky-backend/backend
npm install
```

This installs:
- `ws` - WebSocket library
- `axios` - HTTP client for API calls

### 2. Configure API Key

Get a free Finnhub API key at: https://finnhub.io/dashboard

Set environment variable:
```bash
# On Windows PowerShell
$env:FINNHUB_API_KEY="your_api_key_here"

# On Linux/Mac
export FINNHUB_API_KEY="your_api_key_here"

# Or add to .env file in backend directory
FINNHUB_API_KEY=your_api_key_here
```

### 3. Start the Backend

```bash
cd stocky-backend/backend
npm start
# or for development with auto-reload
npm run dev
```

You should see:
```
✓ Using real-time market data from Finnhub API
Stocky backend listening on http://localhost:4000
WebSocket server at ws://localhost:4000
```

### 4. Start the Frontend

```bash
cd ..  # back to share market folder
npm install
npm run dev
```

## 📱 Usage in Components

### Single Stock Real-Time Price

```jsx
import { useStockPrice } from "./useStockPrice";

function StockCard({ symbol }) {
  const { stock, loading, error, isRealTime } = useStockPrice(symbol);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <div>
      <h3>{stock.name} ({stock.symbol})</h3>
      <p>Price: ${stock.price}</p>
      <p>Change: {stock.changePct}%</p>
      {isRealTime && <span>🔴 LIVE</span>}
    </div>
  );
}
```

### Multiple Stocks Real-Time Prices

```jsx
import { useStockPrices } from "./useStockPrice";

function WatchlistCard() {
  const symbols = ["AAPL", "MSFT", "GOOGL"];
  const { stocks, loading, error } = useStockPrices(symbols);

  return (
    <div>
      {symbols.map(sym => (
        <div key={sym}>
          <p>{sym}: ${stocks[sym]?.price}</p>
        </div>
      ))}
    </div>
  );
}
```

### Check WebSocket Status

```jsx
import { useWebSocketStatus } from "./useStockPrice";

function StatusIndicator() {
  const { isConnected, subscriptionCount } = useWebSocketStatus();

  return (
    <div>
      {isConnected ? "✓ Connected" : "✗ Disconnected"}
      ({subscriptionCount} subscriptions)
    </div>
  );
}
```

### Manual WebSocket Subscription

```jsx
import { wsClient } from "./wsClient";
import { useEffect, useState } from "react";

function CustomComponent() {
  const [price, setPrice] = useState(null);

  useEffect(() => {
    // Subscribe to price updates
    wsClient.subscribe("AAPL", (data) => {
      setPrice(data.price);
    });

    // Cleanup
    return () => {
      wsClient.unsubscribe("AAPL");
    };
  }, []);

  return <p>AAPL: ${price}</p>;
}
```

## 🔄 Data Flow

### Real-Time Update Flow (with API Key)

```
1. Client connects to WebSocket
2. Client subscribes to stock symbols
3. Backend fetches latest price from Finnhub API
4. Backend broadcasts update to all subscribers
5. Client receives update and updates React state
6. Component re-renders with new price
```

### Fallback Flow (no API Key)

```
1. Client connects to WebSocket
2. Backend falls back to simulated prices
3. Prices update via random walk simulation
4. Updates broadcast to subscribers
5. Same real-time experience with fake data
```

### Initial Data Flow

```
1. Component mounts, calls useStockPrice()
2. Fetches initial data via REST API
3. Subscribes to WebSocket for updates
4. Receives real-time updates as they come
```

## 📊 API Reference

### Finnhub API Endpoints Used

- `GET /quote` - Current quote (price, change, etc.)
- `GET /stock/candle` - OHLC data for charts
- `GET /stock/profile2` - Company info

### Free Tier Limits

- 60 API calls per minute
- Updates every 2 seconds (WebSocket)
- Data delayed by ~15 minutes in real market hours
- Sufficient for real-time demo experience

## 🐛 Troubleshooting

### WebSocket Connection Fails

**Problem**: "Failed to connect to WebSocket"

**Solutions**:
1. Check backend is running on correct port (4000)
2. Check VITE_API_URL in .env.local if using custom backend URL
3. Look for backend logs indicating WebSocket server startup

### Prices Not Updating

**Problem**: Prices fetched but not updating in real-time

**Solutions**:
1. Check browser console for WebSocket errors
2. Verify API key is configured: `echo $FINNHUB_API_KEY`
3. Check backend logs: should show "Price Updates: Starting updates for SYMBOL"
4. If no API key, should see simulated prices updating

### API Rate Limit Exceeded

**Problem**: Getting 429 errors or missing prices

**Solutions**:
1. Upgrade Finnhub plan (free tier: 60 calls/min)
2. Reduce subscription count
3. Increase cache duration in stockApi.js

### CORS Errors in Console

**Problem**: "Cross-Origin Request Blocked"

**Solutions**:
1. Ensure backend CORS is enabled (it should be)
2. Check backend is running before frontend
3. Verify API URL matches frontend VITE_API_URL

## 📈 Updating Components for Real-Time

### LiveTrackingPage Example

Update `LiveTrackingPage.jsx` to use real prices:

```jsx
import { useStockPrices } from "./useStockPrice";

function LiveTrackingPage() {
  const watchlistSymbols = ["AAPL", "MSFT", "GOOGL", "AMZN"];
  const { stocks } = useStockPrices(watchlistSymbols);

  // Replace the simulated ticker update with real data
  useEffect(() => {
    if (stocks) {
      // Update state with real prices from stocks object
    }
  }, [stocks]);

  // Rest of component...
}
```

### StockDetailPage Example

```jsx
import { useStockPrice } from "./useStockPrice";

function StockDetailPage({ symbol }) {
  const { stock, loading, error, isRealTime } = useStockPrice(symbol);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <div>
      <PriceChart history={stock.history} />
      <PriceStats stock={stock} />
      {isRealTime && <LiveBadge />}
    </div>
  );
}
```

## 🔒 Security Notes

1. **API Key**: Never commit FINNHUB_API_KEY to version control
2. **WebSocket**: No authentication required (uses existing JWT via REST API)
3. **Rate Limiting**: Consider implementing per-user rate limiting
4. **Data Validation**: All prices validated on backend before broadcast

## 🎯 Next Steps

1. **Update Components**: 
   - LiveTrackingPage - Show real-time stock tickers
   - StockDetailPage - Display live price with chart updates
   - DashboardPage - Real-time portfolio value
   - PortfolioPage - Live position values

2. **Add Features**:
   - Price alerts via WebSocket
   - Trading volume real-time
   - Market index tracking
   - Economic calendar events

3. **Optimize**:
   - Implement smart subscription management
   - Add data persistence for historical analysis
   - Create analytics on price movements

## 📚 Files Changed

### Backend
- `stocky-backend/backend/package.json` - Added ws, axios
- `stocky-backend/backend/server.js` - WebSocket integration
- `stocky-backend/backend/routes/stocks.routes.js` - Real API data
- `stocky-backend/backend/utils/stockApi.js` - NEW: Stock API service
- `stocky-backend/backend/utils/priceUpdateManager.js` - NEW: WebSocket manager

### Frontend
- `App.jsx` - WebSocket initialization on auth
- `wsClient.js` - NEW: WebSocket client
- `useStockPrice.js` - NEW: React hooks for real-time data

## 🎉 You're All Set!

Your stock market app now has:
- ✅ Real-time price data from Finnhub API
- ✅ WebSocket live updates
- ✅ Graceful fallback to simulated data
- ✅ React hooks for easy component integration
- ✅ Auto-reconnection with backoff
- ✅ Full TypeScript support ready

Enjoy real-time stock trading! 🚀
