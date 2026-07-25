const express = require("express");
const { getDb } = require("../utils/db");
const { requireAuth } = require("../middleware/auth");
const { cancelOrder } = require("../utils/orderProcessor");

const router = express.Router();
router.use(requireAuth);

// GET /orders -> list user's orders
router.get("/orders", async (req, res) => {
  const db = await getDb();
  const orders = await db.collection("orders").find({ userId: req.userId }).sort({ createdAt: -1 }).toArray();
  res.json({ orders });
});

// POST /orders/:id/cancel -> cancel a pending order
router.post("/orders/:id/cancel", async (req, res) => {
  const db = await getDb();
  const { id } = req.params;
  try {
    await cancelOrder(id, req.userId);
    res.json({ message: "Order cancelled." });
  } catch (err) {
    res.status(400).json({ message: err.message || "Unable to cancel order." });
  }
});

module.exports = router;
