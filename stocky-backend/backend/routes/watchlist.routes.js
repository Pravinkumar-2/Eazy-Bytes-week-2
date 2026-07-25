const express = require("express");
const { getDb } = require("../utils/db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

async function withPrices(db, symbols) {
  if (!symbols || !symbols.length) return [];
  const stocks = await db.collection("stocks").find({ symbol: { $in: symbols } }).toArray();
  return stocks.map((s) => ({
    symbol: s.symbol,
    name: s.name,
    price: s.price,
    changePct: Number((((s.price - s.prevClose) / s.prevClose) * 100).toFixed(2)),
  }));
}

async function getSymbols(db, collectionName, userId) {
  const doc = await db.collection(collectionName).findOne({ userId });
  return doc?.symbols || [];
}

// ---- Watchlist ----

// GET /watchlist
router.get("/watchlist", async (req, res) => {
  const db = await getDb();
  const symbols = await getSymbols(db, "watchlists", req.userId);
  res.json(await withPrices(db, symbols));
});

// POST /watchlist  { symbol }
router.post("/watchlist", async (req, res) => {
  const db = await getDb();
  const symbol = String(req.body?.symbol || "").toUpperCase();
  if (!symbol) return res.status(400).json({ message: "symbol is required." });

  await db.collection("watchlists").updateOne(
    { userId: req.userId },
    { $addToSet: { symbols: symbol }, $setOnInsert: { userId: req.userId } },
    { upsert: true }
  );

  const symbols = await getSymbols(db, "watchlists", req.userId);
  res.status(201).json(await withPrices(db, symbols));
});

// DELETE /watchlist/:symbol
router.delete("/watchlist/:symbol", async (req, res) => {
  const db = await getDb();
  const symbol = req.params.symbol.toUpperCase();
  await db.collection("watchlists").updateOne(
    { userId: req.userId },
    { $pull: { symbols: symbol } }
  );
  const symbols = await getSymbols(db, "watchlists", req.userId);
  res.json(await withPrices(db, symbols));
});

// ---- Favorites ----

// GET /favorites
router.get("/favorites", async (req, res) => {
  const db = await getDb();
  const symbols = await getSymbols(db, "favorites", req.userId);
  res.json(await withPrices(db, symbols));
});

// POST /favorites  { symbol }
router.post("/favorites", async (req, res) => {
  const db = await getDb();
  const symbol = String(req.body?.symbol || "").toUpperCase();
  if (!symbol) return res.status(400).json({ message: "symbol is required." });

  await db.collection("favorites").updateOne(
    { userId: req.userId },
    { $addToSet: { symbols: symbol }, $setOnInsert: { userId: req.userId } },
    { upsert: true }
  );

  const symbols = await getSymbols(db, "favorites", req.userId);
  res.status(201).json(await withPrices(db, symbols));
});

// DELETE /favorites/:symbol
router.delete("/favorites/:symbol", async (req, res) => {
  const db = await getDb();
  const symbol = req.params.symbol.toUpperCase();
  await db.collection("favorites").updateOne(
    { userId: req.userId },
    { $pull: { symbols: symbol } }
  );
  const symbols = await getSymbols(db, "favorites", req.userId);
  res.json(await withPrices(db, symbols));
});

module.exports = router;
