const WebSocket = require("ws");
const { fetchQuote } = require("./stockApi");

/**
 * WebSocket Server Manager
 * Manages real-time price updates for connected clients
 */

class PriceUpdateManager {
  constructor() {
    this.wss = null;
    this.clients = new Set();
    this.subscriptions = new Map(); // symbol -> Set of client ids
    this.updateIntervals = new Map(); // symbol -> interval id
  }

  /**
   * Initialize WebSocket server
   */
  init(server) {
    this.wss = new WebSocket.Server({ server, path: "/ws" });
    
    this.wss.on("connection", (ws) => {
      const clientId = Date.now() + Math.random();
      this.clients.add(ws);
      
      console.log(`[WS] Client connected. Total clients: ${this.clients.size}`);

      ws.on("message", (message) => this.handleMessage(ws, clientId, message));
      ws.on("close", () => this.handleClose(ws, clientId));
      ws.on("error", (error) => console.error("[WS] Error:", error.message));
    });

    console.log("[WS] WebSocket server initialized at /ws");
  }

  /**
   * Handle incoming WebSocket messages
   * Expected format: { action: "subscribe" | "unsubscribe", symbol: "AAPL" }
   */
  handleMessage(ws, clientId, message) {
    try {
      const data = JSON.parse(message);
      const { action, symbol } = data;

      if (action === "subscribe" && symbol) {
        this.subscribe(clientId, symbol, ws);
        ws.send(JSON.stringify({ 
          type: "subscribed", 
          symbol,
          message: `Subscribed to ${symbol} updates` 
        }));
      } else if (action === "unsubscribe" && symbol) {
        this.unsubscribe(clientId, symbol);
        ws.send(JSON.stringify({ 
          type: "unsubscribed", 
          symbol,
          message: `Unsubscribed from ${symbol}` 
        }));
      }
    } catch (error) {
      console.error("[WS] Message parsing error:", error.message);
    }
  }

  /**
   * Handle client disconnect
   */
  handleClose(ws, clientId) {
    this.clients.delete(ws);
    
    // Remove all subscriptions for this client
    for (const [symbol, clients] of this.subscriptions.entries()) {
      // Find and remove this clientId
      const arr = Array.from(clients);
      for (let i = 0; i < arr.length; i++) {
        if (arr[i].clientId === clientId) {
          clients.delete(arr[i]);
          break;
        }
      }
      
      // Stop updates if no more subscribers
      if (clients.size === 0) {
        this.stopUpdates(symbol);
      }
    }
    
    console.log(`[WS] Client disconnected. Total clients: ${this.clients.size}`);
  }

  /**
   * Subscribe a client to a stock symbol
   */
  subscribe(clientId, symbol, ws) {
    const sym = symbol.toUpperCase();
    
    if (!this.subscriptions.has(sym)) {
      this.subscriptions.set(sym, new Set());
    }
    
    const clients = this.subscriptions.get(sym);
    clients.add({ clientId, ws });

    // Start price updates if this is the first subscriber
    if (clients.size === 1) {
      this.startUpdates(sym);
    }
  }

  /**
   * Unsubscribe a client from a stock symbol
   */
  unsubscribe(clientId, symbol) {
    const sym = symbol.toUpperCase();
    const clients = this.subscriptions.get(sym);
    
    if (!clients) return;
    
    // Remove this client
    const arr = Array.from(clients);
    for (let i = 0; i < arr.length; i++) {
      if (arr[i].clientId === clientId) {
        clients.delete(arr[i]);
        break;
      }
    }

    // Stop updates if no more subscribers
    if (clients.size === 0) {
      this.stopUpdates(sym);
    }
  }

  /**
   * Start fetching and broadcasting price updates for a symbol
   */
  startUpdates(symbol) {
    if (this.updateIntervals.has(symbol)) {
      return; // Already running
    }

    console.log(`[Price Updates] Starting updates for ${symbol}`);

    // Fetch immediately
    this.broadcastPrice(symbol);

    // Then fetch every 2 seconds (Finnhub free tier: 60 calls/min)
    const intervalId = setInterval(() => {
      this.broadcastPrice(symbol).catch((err) => 
        console.error(`[Price Updates] Error for ${symbol}:`, err.message)
      );
    }, 2000);

    this.updateIntervals.set(symbol, intervalId);
  }

  /**
   * Stop fetching and broadcasting price updates for a symbol
   */
  stopUpdates(symbol) {
    const intervalId = this.updateIntervals.get(symbol);
    if (intervalId) {
      clearInterval(intervalId);
      this.updateIntervals.delete(symbol);
      console.log(`[Price Updates] Stopped updates for ${symbol}`);
    }
  }

  /**
   * Fetch latest price and broadcast to subscribed clients
   */
  async broadcastPrice(symbol) {
    const sym = symbol.toUpperCase();
    const clients = this.subscriptions.get(sym);

    if (!clients || clients.size === 0) {
      return;
    }

    try {
      const quote = await fetchQuote(sym);
      
      if (quote) {
        const message = JSON.stringify({
          type: "price_update",
          symbol: sym,
          data: quote,
        });

        // Send to all subscribed clients
        let deadClients = [];
        for (const { ws, clientId } of clients) {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(message);
          } else {
            deadClients.push(clientId);
          }
        }

        // Clean up dead connections
        for (const clientId of deadClients) {
          this.unsubscribe(clientId, sym);
        }
      }
    } catch (error) {
      console.error(`[Price Updates] Error broadcasting price for ${sym}:`, error.message);
    }
  }

  /**
   * Broadcast a message to all connected clients
   */
  broadcast(message) {
    if (!this.wss) return;

    const data = JSON.stringify(message);
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    }
  }

  /**
   * Get connected clients count
   */
  getClientCount() {
    return this.clients.size;
  }

  /**
   * Get active subscriptions
   */
  getActiveSubscriptions() {
    const result = {};
    for (const [symbol, clients] of this.subscriptions.entries()) {
      result[symbol] = clients.size;
    }
    return result;
  }
}

module.exports = new PriceUpdateManager();
