/**
 * WebSocket Client for Real-Time Stock Price Updates
 * Connects to the backend WebSocket server and manages subscriptions
 */

const VITE_API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";
const WS_URL = VITE_API_URL.replace(/^http/, "ws").replace(/\/api$/, "/ws");

class StockWebSocketClient {
  constructor() {
    this.ws = null;
    this.isConnecting = false;
    this.isConnected = false;
    this.subscriptions = new Map(); // symbol -> callback functions
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 1000; // Start with 1 second
    this.handlers = {
      onConnect: null,
      onDisconnect: null,
      onError: null,
    };
  }

  /**
   * Connect to WebSocket server
   */
  connect() {
    if (this.isConnecting || this.isConnected) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      try {
        this.isConnecting = true;
        console.log(`[WS] Connecting to ${WS_URL}`);

        this.ws = new WebSocket(WS_URL);

        this.ws.onopen = () => {
          console.log("[WS] Connected");
          this.isConnected = true;
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.reconnectDelay = 1000;

          if (this.handlers.onConnect) {
            this.handlers.onConnect();
          }

          // Re-subscribe to previously subscribed symbols
          for (const symbol of this.subscriptions.keys()) {
            this.subscribe(symbol);
          }

          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onerror = (error) => {
          console.error("[WS] Error:", error);
          this.isConnecting = false;
          if (this.handlers.onError) {
            this.handlers.onError(error);
          }
          reject(error);
        };

        this.ws.onclose = () => {
          console.log("[WS] Disconnected");
          this.isConnected = false;
          this.isConnecting = false;

          if (this.handlers.onDisconnect) {
            this.handlers.onDisconnect();
          }

          this.attemptReconnect();
        };
      } catch (error) {
        this.isConnecting = false;
        console.error("[WS] Connection failed:", error);
        reject(error);
      }
    });
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("[WS] Max reconnection attempts reached");
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000);

    console.log(`[WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(() => {
      if (!this.isConnected) {
        this.connect().catch((err) => console.error("[WS] Reconnection failed:", err));
      }
    }, delay);
  }

  /**
   * Handle incoming WebSocket messages
   */
  handleMessage(rawData) {
    try {
      const message = JSON.parse(rawData);

      switch (message.type) {
        case "price_update":
          this.handlePriceUpdate(message.symbol, message.data);
          break;
        case "subscribed":
          console.log(`[WS] Subscribed to ${message.symbol}`);
          break;
        case "unsubscribed":
          console.log(`[WS] Unsubscribed from ${message.symbol}`);
          break;
        default:
          console.log("[WS] Unknown message type:", message.type);
      }
    } catch (error) {
      console.error("[WS] Error parsing message:", error);
    }
  }

  /**
   * Handle price update message
   */
  handlePriceUpdate(symbol, data) {
    const callbacks = this.subscriptions.get(symbol);
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[WS] Error in price update callback for ${symbol}:`, error);
        }
      });
    }
  }

  /**
   * Subscribe to price updates for a stock
   * @param {string} symbol - Stock symbol (e.g., "AAPL")
   * @param {Function} callback - Function to call when price updates
   */
  subscribe(symbol, callback) {
    const sym = symbol.toUpperCase();

    // Add callback to list
    if (callback) {
      if (!this.subscriptions.has(sym)) {
        this.subscriptions.set(sym, new Set());
      }
      this.subscriptions.get(sym).add(callback);
    }

    // Send subscription message if connected
    if (this.isConnected && this.ws) {
      const message = JSON.stringify({
        action: "subscribe",
        symbol: sym,
      });
      this.ws.send(message);
    }
  }

  /**
   * Unsubscribe from price updates for a stock
   * @param {string} symbol - Stock symbol (e.g., "AAPL")
   * @param {Function} callback - Specific callback to remove, or null to remove all
   */
  unsubscribe(symbol, callback) {
    const sym = symbol.toUpperCase();
    const callbacks = this.subscriptions.get(sym);

    if (!callbacks) return;

    if (callback) {
      callbacks.delete(callback);
    } else {
      callbacks.clear();
    }

    // Remove symbol if no more callbacks
    if (callbacks.size === 0) {
      this.subscriptions.delete(sym);

      // Send unsubscribe message if connected
      if (this.isConnected && this.ws) {
        const message = JSON.stringify({
          action: "unsubscribe",
          symbol: sym,
        });
        this.ws.send(message);
      }
    }
  }

  /**
   * Unsubscribe from all symbols
   */
  unsubscribeAll() {
    const symbols = Array.from(this.subscriptions.keys());
    for (const symbol of symbols) {
      this.unsubscribe(symbol);
    }
  }

  /**
   * Disconnect WebSocket
   */
  disconnect() {
    if (this.ws) {
      this.isConnected = false;
      this.isConnecting = false;
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Set connection lifecycle handlers
   */
  onConnect(callback) {
    this.handlers.onConnect = callback;
  }

  onDisconnect(callback) {
    this.handlers.onDisconnect = callback;
  }

  onError(callback) {
    this.handlers.onError = callback;
  }

  /**
   * Check if connected
   */
  isReady() {
    return this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN;
  }
}

// Export singleton instance
export const wsClient = new StockWebSocketClient();

export default StockWebSocketClient;
