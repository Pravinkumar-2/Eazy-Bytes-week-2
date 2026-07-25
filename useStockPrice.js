import { useEffect, useState, useRef } from "react";
import { wsClient } from "./wsClient";
import { api } from "./api";

/**
 * Custom hook for real-time stock price updates
 * Falls back to REST API if WebSocket is unavailable
 * 
 * @param {string} symbol - Stock symbol (e.g., "AAPL")
 * @returns {object} - { stock, loading, error, isRealTime }
 */
export function useStockPrice(symbol) {
  const [stock, setStock] = useState(null);
  const [loading, setLoading] = useState(!!symbol);
  const [error, setError] = useState(null);
  const [isRealTime, setIsRealTime] = useState(false);
  const callbackRef = useRef(null);

  useEffect(() => {
    if (!symbol) {
      setStock(null);
      setLoading(false);
      return;
    }

    let isMounted = true;

    // First, fetch initial data via REST API
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await api.get(`/stock/${symbol}`);
        
        if (isMounted) {
          setStock(res.data);
          setIsRealTime(res.data.isRealTime || false);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message);
          setLoading(false);
        }
      }
    };

    fetchInitialData();

    // Then subscribe to WebSocket updates
    if (wsClient.isReady()) {
      callbackRef.current = (data) => {
        if (isMounted) {
          setStock((prev) => ({
            ...prev,
            ...data,
            isRealTime: true,
          }));
          setIsRealTime(true);
        }
      };
      wsClient.subscribe(symbol, callbackRef.current);
    }

    // Cleanup
    return () => {
      isMounted = false;
      if (callbackRef.current) {
        wsClient.unsubscribe(symbol, callbackRef.current);
      }
    };
  }, [symbol]);

  return { stock, loading, error, isRealTime };
}

/**
 * Custom hook to subscribe to multiple stock prices
 * 
 * @param {string[]} symbols - Array of stock symbols
 * @returns {object} - { stocks: { symbol: stockData }, loading, error }
 */
export function useStockPrices(symbols) {
  const [stocks, setStocks] = useState({});
  const [loading, setLoading] = useState(!!symbols?.length);
  const [error, setError] = useState(null);
  const callbacksRef = useRef(new Map());

  useEffect(() => {
    if (!symbols || symbols.length === 0) {
      setStocks({});
      setLoading(false);
      return;
    }

    let isMounted = true;

    // Fetch all stock data
    const fetchAllStocks = async () => {
      try {
        setLoading(true);
        setError(null);

        const promises = symbols.map((sym) => api.get(`/stock/${sym}`).then((res) => ({ symbol: sym, data: res.data })));
        const results = await Promise.all(promises);

        if (isMounted) {
          const stocksMap = {};
          results.forEach(({ symbol, data }) => {
            stocksMap[symbol] = data;
          });
          setStocks(stocksMap);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message);
          setLoading(false);
        }
      }
    };

    fetchAllStocks();

    // Subscribe to WebSocket updates
    if (wsClient.isReady()) {
      callbacksRef.current.clear();
      symbols.forEach((symbol) => {
        const callback = (data) => {
          if (isMounted) {
            setStocks((prev) => ({
              ...prev,
              [symbol]: {
                ...prev[symbol],
                ...data,
                isRealTime: true,
              },
            }));
          }
        };
        callbacksRef.current.set(symbol, callback);
        wsClient.subscribe(symbol, callback);
      });
    }

    // Cleanup
    return () => {
      isMounted = false;
      callbacksRef.current.forEach((callback, symbol) => {
        wsClient.unsubscribe(symbol, callback);
      });
      callbacksRef.current.clear();
    };
  }, [symbols]);

  return { stocks, loading, error };
}

/**
 * Hook to track WebSocket connection status
 * 
 * @returns {object} - { isConnected, subscriptionCount, wsStatus }
 */
export function useWebSocketStatus() {
  const [isConnected, setIsConnected] = useState(wsClient.isReady());
  const [subscriptionCount, setSubscriptionCount] = useState(0);

  useEffect(() => {
    const updateStatus = () => {
      setIsConnected(wsClient.isReady());
      const subs = wsClient.subscriptions;
      const count = Array.from(subs.values()).reduce((sum, set) => sum + set.size, 0);
      setSubscriptionCount(count);
    };

    wsClient.onConnect(updateStatus);
    wsClient.onDisconnect(updateStatus);

    // Poll status every second
    const interval = setInterval(updateStatus, 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  return {
    isConnected,
    subscriptionCount,
    wsStatus: isConnected ? "connected" : "disconnected",
  };
}
