const express = require("express");
const { getDb } = require("../utils/db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

// GET /alerts -- this user's alerts
router.get("/alerts", async (req, res) => {
  const db = await getDb();
  const alerts = await db.collection("alerts").find({ userId: req.userId }).toArray();
  res.json(alerts);
});

// POST /alerts  { symbol, targetPrice, direction: "above" | "below" }
router.post("/alerts", async (req, res) => {
  const db = await getDb();
  const { symbol, targetPrice, direction = "above" } = req.body || {};
  if (!symbol || !targetPrice) {
    return res.status(400).json({ message: "symbol and targetPrice are required." });
  }
  const alert = {
    id: `al_${Date.now()}_${Math.round(Math.random() * 1e4)}`,
    userId: req.userId,
    symbol: String(symbol).toUpperCase(),
    targetPrice: Number(targetPrice),
    direction,
    triggered: false,
    createdAt: new Date().toISOString(),
  };
  await db.collection("alerts").insertOne(alert);
  res.status(201).json(alert);
});

// DELETE /alerts/:id
router.delete("/alerts/:id", async (req, res) => {
  const db = await getDb();
  await db.collection("alerts").deleteOne({ id: req.params.id, userId: req.userId });
  res.json({ message: "Alert removed." });
});

// GET /alerts/check -- evaluate this user's alerts against current prices,
// mark newly-triggered ones, and return just the ones that fired. The
// frontend polls this to drive the live-notifications feature.
router.get("/alerts/check", async (req, res) => {
  const db = await getDb();
  const alerts = await db.collection("alerts").find({ userId: req.userId, triggered: false }).toArray();
  const symbols = alerts.map((a) => a.symbol);
  const stocks = symbols.length
    ? await db.collection("stocks").find({ symbol: { $in: symbols } }).toArray()
    : [];
  const stockMap = Object.fromEntries(stocks.map((s) => [s.symbol, s]));
  const fired = [];
  const updates = [];

  for (const alert of alerts) {
    const stock = stockMap[alert.symbol];
    if (!stock) continue;
    const hit = alert.direction === "above" ? stock.price >= alert.targetPrice : stock.price <= alert.targetPrice;
    if (hit) {
      updates.push({ id: alert.id });
      fired.push({ ...alert, price: stock.price });
    }
  }

  if (updates.length) {
    await db.collection("alerts").updateMany(
      { id: { $in: updates.map((u) => u.id) } },
      { $set: { triggered: true } }
    );
  }

  res.json(fired);
});

module.exports = router;
