const express = require("express");
const cors = require("cors");
const http = require("http");
const { connectDb, getDb } = require("./utils/db");
const priceUpdateManager = require("./utils/priceUpdateManager");
const { hasValidApiKey } = require("./utils/stockApi");

const authRoutes = require("./routes/auth.routes");
const stocksRoutes = require("./routes/stocks.routes");
const portfolioRoutes = require("./routes/portfolio.routes");
const transactionsRoutes = require("./routes/transactions.routes");
const watchlistRoutes = require("./routes/watchlist.routes");
const alertsRoutes = require("./routes/alerts.routes");
const analyticsRoutes = require("./routes/analytics.routes");
const { snapshotAllUsers } = require("./utils/snapshot");
const ordersRoutes = require("./routes/orders.routes");
const { processPendingOrders } = require("./utils/orderProcessor");

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    time: new Date().toISOString(),
    apiMode: hasValidApiKey() ? "real-market" : "simulated",
    wsClients: priceUpdateManager.getClientCount(),
    wsSubscriptions: priceUpdateManager.getActiveSubscriptions(),
  });
});

// Auth: POST /api/register, POST /api/login
app.use("/api", authRoutes);
// Stocks: GET /api/stocks, GET /api/stock/:symbol
app.use("/api", stocksRoutes);
// Portfolio: GET /api/portfolio, POST /api/buy, POST /api/sell, GET /api/dashboard
app.use("/api", portfolioRoutes);
// Transactions: GET /api/history
app.use("/api", transactionsRoutes);
// Watchlist + Favorites
app.use("/api", watchlistRoutes);
// Price alerts
app.use("/api", alertsRoutes);
// Analytics: performance snapshots and reports
app.use("/api", analyticsRoutes);
// Orders: list and cancel
app.use("/api", ordersRoutes);

app.use((req, res) => res.status(404).json({ message: `No route for ${req.method} ${req.originalUrl}` }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: "Something went wrong on the server." });
});

async function tickPrices() {
  const db = await getDb();
  
  // Only use simulation if real API key is not configured
  if (!hasValidApiKey()) {
    // Fallback to simulated price ticks
    const stocks = await db.collection("stocks").find({}).toArray();
    const operations = stocks.map((s) => {
      const drift = (Math.random() - 0.5) * s.price * 0.004;
      const price = Number(Math.max(1, s.price + drift).toFixed(2));
      const high = Number(Math.max(s.high || price, price).toFixed(2));
      const low = Number(Math.min(s.low || price, price).toFixed(2));
      const history = [...(s.history || []), { t: (s.history?.[s.history.length - 1]?.t || 0) + 1, price }];
      if (history.length > 60) history.shift();
      return {
        updateOne: {
          filter: { symbol: s.symbol },
          update: { $set: { price, high, low, history } },
        },
      };
    });
    if (operations.length) {
      await db.collection("stocks").bulkWrite(operations);
    }
  }
  // If real API is configured, prices are updated via WebSocket subscriptions
  // and the stock routes endpoint
}

setInterval(() => {
  tickPrices().catch((err) => console.error("tickPrices error:", err));
}, 5000);

async function startServer() {
  await connectDb();
  
  // Initialize WebSocket server for live price updates
  priceUpdateManager.init(server);
  
  if (hasValidApiKey()) {
    console.log("✓ Using real-time market data from Finnhub API");
  } else {
    console.log("⚠ FINNHUB_API_KEY not configured - using simulated prices");
    console.log("  To enable real-time data: export FINNHUB_API_KEY=your_key_here");
    console.log("  Get a free API key at: https://finnhub.io/dashboard");
  }

  // take an initial daily snapshot on startup and then once every 24h
  try {
    await snapshotAllUsers();
    setInterval(() => {
      snapshotAllUsers().catch((err) => console.error("snapshotAllUsers error:", err));
    }, 24 * 60 * 60 * 1000);
    // process pending limit orders periodically (every 5s)
    setInterval(() => {
      processPendingOrders().catch((err) => console.error("processPendingOrders error:", err));
    }, 5000);
  } catch (err) {
    console.error("Failed to run initial snapshots:", err);
  }

  server.listen(PORT, () => {
    console.log(`\nStocky backend listening on http://localhost:${PORT}`);
    console.log(`WebSocket server at ws://localhost:${PORT}\n`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
