const express = require("express");
const { getDb } = require("../utils/db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

// GET /history -- this user's transactions, most recent first
router.get("/history", async (req, res) => {
  const db = await getDb();
  const list = await db
    .collection("transactions")
    .find({ userId: req.userId })
    .sort({ date: -1 })
    .toArray();
  res.json(list);
});

module.exports = router;
