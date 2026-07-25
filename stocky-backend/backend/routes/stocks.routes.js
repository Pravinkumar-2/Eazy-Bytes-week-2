const express = require("express");
const { getDb } = require("../utils/db");
const { fetchQuote, fetchIntraday, hasValidApiKey } = require("../utils/stockApi");

const router = express.Router();

function withChange(stock) {
  const changeAbs = stock.price - stock.prevClose;
  const changePct = (changeAbs / stock.prevClose) * 100;
  return { 
    ...stock, 
    changeAbs: Number(changeAbs.toFixed(2)), 
    changePct: Number(changePct.toFixed(2)),
    isRealTime: stock.isRealTime || false,
  };
}

// GET /stocks?search=app -- list all stocks (optionally filtered)
router.get("/stocks", async (req, res) => {
  const db = await getDb();
  const { search } = req.query;
  const filter = {};
  if (search) {
    const q = String(search).trim();
    filter.$or = [
      { symbol: { $regex: q, $options: "i" } },
      { name: { $regex: q, $options: "i" } },
    ];
  }

  let list = await db.collection("stocks").find(filter).toArray();

  // If real API is configured, try to get current prices
  if (hasValidApiKey()) {
    const updatedList = [];
    for (const stock of list) {
      try {
        const quote = await fetchQuote(stock.symbol);
        if (quote) {
          updatedList.push({
            ...stock,
            price: quote.price,
            prevClose: quote.prevClose,
            open: quote.open,
            high: quote.high,
            low: quote.low,
            isRealTime: true,
          });
        } else {
          updatedList.push(stock);
        }
      } catch (error) {
        // Fallback to database price
        updatedList.push(stock);
      }
    }
    list = updatedList;
  }

  res.json(list.map(withChange));
});

// GET /stock/:symbol -- single stock with price history and real-time data
router.get("/stock/:symbol", async (req, res) => {
  const db = await getDb();
  const symbol = req.params.symbol.toUpperCase();
  let stock = await db.collection("stocks").findOne({ symbol });

  if (!stock) {
    return res.status(404).json({ message: `No stock found for symbol ${symbol}.` });
  }

  // If real API is configured, fetch current price and history
  if (hasValidApiKey()) {
    try {
      const [quote, history] = await Promise.all([
        fetchQuote(symbol),
        fetchIntraday(symbol),
      ]);

      if (quote) {
        stock = {
          ...stock,
          price: quote.price,
          prevClose: quote.prevClose,
          open: quote.open,
          high: quote.high,
          low: quote.low,
          timestamp: quote.timestamp,
          isRealTime: true,
        };
      }

      if (history && history.length > 0) {
        stock.history = history;
      }
    } catch (error) {
      console.error(`Error fetching real-time data for ${symbol}:`, error.message);
      // Continue with database data
    }
  }

  res.json(withChange(stock));
});

module.exports = router;
