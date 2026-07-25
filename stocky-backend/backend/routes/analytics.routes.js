const express = require("express");
const { getDb } = require("../utils/db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

// GET /analytics/performance?limit=30
router.get("/analytics/performance", async (req, res) => {
  const db = await getDb();
  const limit = Math.min(365, Number(req.query.limit) || 90);
  const snapshots = await db
    .collection("portfolioSnapshots")
    .find({ userId: req.userId })
    .sort({ date: 1 })
    .limit(limit)
    .toArray();
  res.json({ snapshots });
});

// GET /analytics/summary?days=30
router.get("/analytics/summary", async (req, res) => {
  const db = await getDb();
  const days = Math.max(1, Math.min(365, Number(req.query.days) || 30));
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const snaps = await db
    .collection("portfolioSnapshots")
    .find({ userId: req.userId, date: { $gte: since } })
    .sort({ date: 1 })
    .toArray();

  if (!snaps || snaps.length === 0) return res.json({ summary: null, snaps: [] });

  const first = snaps[0];
  const last = snaps[snaps.length - 1];
  const change = Number((last.netWorth - first.netWorth).toFixed(2));
  const pct = first.netWorth ? Number(((change / first.netWorth) * 100).toFixed(2)) : 0;

  res.json({ summary: { from: first.date, to: last.date, change, pct }, snaps });
});

module.exports = router;
