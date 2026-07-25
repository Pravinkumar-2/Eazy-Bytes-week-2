const axios = require("axios");

/**
 * Stock API Service - fetches real market data
 * Using Finnhub API (free tier: 60 calls/min)
 * 
 * Sign up for free API key at: https://finnhub.io/dashboard
 * Set FINNHUB_API_KEY environment variable
 */

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || "demo"; // Use your API key here
const FINNHUB_BASE_URL = "https://finnhub.io/api/v1";

// Cache for price data to reduce API calls
const priceCache = new Map();
const CACHE_DURATION = 10000; // 10 seconds

/**
 * Fetch real-time quote for a stock symbol
 */
async function fetchQuote(symbol) {
  try {
    const cacheKey = `quote_${symbol}`;
    const cached = priceCache.get(cacheKey);
    
    // Return cached if still valid
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    const response = await axios.get(`${FINNHUB_BASE_URL}/quote`, {
      params: {
        symbol: symbol.toUpperCase(),
        token: FINNHUB_API_KEY,
      },
      timeout: 5000,
    });

    const data = response.data;
    
    // Map Finnhub response to our format
    const quoteData = {
      symbol: symbol.toUpperCase(),
      price: data.c || 0,
      prevClose: data.pc || 0,
      open: data.o || 0,
      high: data.h || 0,
      low: data.l || 0,
      timestamp: Date.now(),
    };

    // Cache the result
    priceCache.set(cacheKey, { data: quoteData, timestamp: Date.now() });
    
    return quoteData;
  } catch (error) {
    console.error(`Error fetching quote for ${symbol}:`, error.message);
    return null;
  }
}

/**
 * Fetch intraday candle data for charting
 */
async function fetchIntraday(symbol) {
  try {
    const cacheKey = `intraday_${symbol}`;
    const cached = priceCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION * 2) {
      return cached.data;
    }

    const response = await axios.get(`${FINNHUB_BASE_URL}/stock/candle`, {
      params: {
        symbol: symbol.toUpperCase(),
        resolution: "5", // 5 minute candles
        from: Math.floor(Date.now() / 1000) - 86400, // Last 24 hours
        to: Math.floor(Date.now() / 1000),
        token: FINNHUB_API_KEY,
      },
      timeout: 5000,
    });

    const data = response.data;
    
    if (!data.c || !Array.isArray(data.c)) {
      return [];
    }

    // Build history array from candles
    const history = data.c.map((closePrice, i) => ({
      t: i,
      price: closePrice,
    })).slice(-60); // Keep last 60 points

    priceCache.set(cacheKey, { data: history, timestamp: Date.now() });
    
    return history;
  } catch (error) {
    console.error(`Error fetching intraday data for ${symbol}:`, error.message);
    return [];
  }
}

/**
 * Fetch company profile info
 */
async function fetchCompanyProfile(symbol) {
  try {
    const cacheKey = `profile_${symbol}`;
    const cached = priceCache.get(cacheKey);
    
    // Cache company profiles for longer (24 hours)
    if (cached && Date.now() - cached.timestamp < 24 * 60 * 60 * 1000) {
      return cached.data;
    }

    const response = await axios.get(`${FINNHUB_BASE_URL}/stock/profile2`, {
      params: {
        symbol: symbol.toUpperCase(),
        token: FINNHUB_API_KEY,
      },
      timeout: 5000,
    });

    const data = response.data;
    
    const profileData = {
      symbol: symbol.toUpperCase(),
      name: data.name || symbol,
      exchange: data.exchange || "N/A",
      marketCap: data.marketCap || 0,
      sector: data.finnhubIndustry || "N/A",
      logo: data.logo || "",
    };

    priceCache.set(cacheKey, { data: profileData, timestamp: Date.now() });
    
    return profileData;
  } catch (error) {
    console.error(`Error fetching profile for ${symbol}:`, error.message);
    return null;
  }
}

/**
 * Validate if we have a real API key configured
 */
function hasValidApiKey() {
  return FINNHUB_API_KEY !== "demo" && FINNHUB_API_KEY !== "";
}

/**
 * Clear price cache periodically
 */
function clearOldCache() {
  const now = Date.now();
  for (const [key, value] of priceCache.entries()) {
    if (now - value.timestamp > 60000) { // Clear entries older than 1 minute
      priceCache.delete(key);
    }
  }
}

setInterval(clearOldCache, 30000); // Run cleanup every 30 seconds

module.exports = {
  fetchQuote,
  fetchIntraday,
  fetchCompanyProfile,
  hasValidApiKey,
};
