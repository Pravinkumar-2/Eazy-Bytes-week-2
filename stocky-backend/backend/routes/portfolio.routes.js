const express = require("express");
const { getDb } = require("../utils/db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

async function findStock(db, symbol) {
  return db.collection("stocks").findOne({ symbol: symbol.toUpperCase() });
}

async function enrichHoldings(db, holdings) {
  const normalizedHoldings = holdings || [];
  const symbols = normalizedHoldings.map((h) => h.symbol);
  const stocks = symbols.length
    ? await db.collection("stocks").find({ symbol: { $in: symbols } }).toArray()
    : [];
  const stockMap = Object.fromEntries(stocks.map((s) => [s.symbol, s]));

  return normalizedHoldings.map((h) => {
    const stock = stockMap[h.symbol];
    const price = stock ? stock.price : h.avgCost;
    const marketValue = price * h.qty;
    const costBasis = h.avgCost * h.qty;
    const plAbs = marketValue - costBasis;
    const plPct = costBasis ? (plAbs / costBasis) * 100 : 0;
    return {
      symbol: h.symbol,
      name: stock ? stock.name : h.symbol,
      qty: h.qty,
      avgCost: h.avgCost,
      price,
      marketValue: Number(marketValue.toFixed(2)),
      plAbs: Number(plAbs.toFixed(2)),
      plPct: Number(plPct.toFixed(2)),
    };
  });
}

// GET /portfolio
router.get("/portfolio", async (req, res) => {
  const db = await getDb();
  const portfolio = (await db.collection("portfolios").findOne({ userId: req.userId })) || { balance: 0, holdings: [] };
  const holdings = await enrichHoldings(db, portfolio.holdings);
  const holdingsValue = holdings.reduce((a, h) => a + h.marketValue, 0);
  res.json({
    balance: Number((portfolio.balance || 0).toFixed(2)),
    holdingsValue: Number(holdingsValue.toFixed(2)),
    netWorth: Number(((portfolio.balance || 0) + holdingsValue).toFixed(2)),
    holdings,
  });
});

// GET /dashboard -- the four dashboard cards + market status
router.get("/dashboard", async (req, res) => {
  const db = await getDb();
  const portfolio = (await db.collection("portfolios").findOne({ userId: req.userId })) || { balance: 0, holdings: [] };
  const holdings = await enrichHoldings(db, portfolio.holdings);
  const holdingsValue = holdings.reduce((a, h) => a + h.marketValue, 0);

  let todaysProfit = 0;
  let todaysLoss = 0;
  for (const h of holdings) {
    const stock = await findStock(db, h.symbol);
    if (!stock) continue;
    const dayChange = (stock.price - stock.prevClose) * h.qty;
    if (dayChange >= 0) todaysProfit += dayChange;
    else todaysLoss += Math.abs(dayChange);
  }

  const now = new Date();
  const hour = now.getUTCHours() + 5.5; // IST offset for a simple demo market-hours check
  const istHour = hour % 24;
  const day = now.getUTCDay();
  const isWeekday = day >= 1 && day <= 5;
  const marketStatus = isWeekday && istHour >= 9.25 && istHour <= 15.5 ? "Open" : "Closed";

  res.json({
    portfolioValue: Number(((portfolio.balance || 0) + holdingsValue).toFixed(2)),
    availableBalance: Number(((portfolio.balance || 0)).toFixed(2)),
    todaysProfit: Number(todaysProfit.toFixed(2)),
    todaysLoss: Number(todaysLoss.toFixed(2)),
    marketStatus,
  });
});

// POST /buy  { symbol, qty, orderType, limitPrice }
router.post("/buy", async (req, res) => {
  const db = await getDb();
  const { symbol, qty, orderType = "market", limitPrice } = req.body || {};
  const quantity = Number(qty);

  if (!symbol || !quantity || quantity <= 0) {
    return res.status(400).json({ message: "symbol and a positive qty are required." });
  }

  const stock = await findStock(db, symbol);
  if (!stock) return res.status(404).json({ message: `No stock found for symbol ${symbol}.` });

  const portfolio = (await db.collection("portfolios").findOne({ userId: req.userId })) || {
    userId: req.userId,
    balance: 0,
    holdings: [],
  };

  if (orderType === "market") {
    // execute immediately at current price
    const price = stock.price;
    const total = Number((price * quantity).toFixed(2));
    if (total > portfolio.balance) {
      return res.status(400).json({ message: "Insufficient balance for this order." });
    }

    // update holdings
    const holdings = portfolio.holdings || [];
    const existing = holdings.find((h) => h.symbol === stock.symbol);
    if (existing) {
      const newQty = existing.qty + quantity;
      existing.avgCost = Number(((existing.avgCost * existing.qty + total) / newQty).toFixed(4));
      existing.qty = newQty;
    } else {
      holdings.push({ symbol: stock.symbol, qty: quantity, avgCost: price });
    }

    portfolio.balance = Number((portfolio.balance - total).toFixed(2));
    portfolio.holdings = holdings;

    await db.collection("portfolios").updateOne({ userId: req.userId }, { $set: portfolio }, { upsert: true });

    const tx = {
      id: `tx_${Date.now()}_${Math.round(Math.random() * 1e4)}`,
      userId: req.userId,
      type: "buy",
      symbol: stock.symbol,
      qty: quantity,
      price,
      total,
      date: new Date().toISOString(),
    };
    await db.collection("transactions").insertOne(tx);

    // save order as executed
    const order = {
      id: `o_${Date.now()}_${Math.round(Math.random() * 1e4)}`,
      userId: req.userId,
      type: "buy",
      orderType: "market",
      status: "executed",
      symbol: stock.symbol,
      qty: quantity,
      executedPrice: price,
      total,
      createdAt: new Date().toISOString(),
      executedAt: new Date().toISOString(),
    };
    await db.collection("orders").insertOne(order);

    return res.status(201).json({ message: "Order executed.", transaction: tx, balance: portfolio.balance, order });
  }

  // limit order -> create pending order and reserve funds
  if (orderType === "limit") {
    if (!limitPrice) return res.status(400).json({ message: "limitPrice is required for limit orders." });
    const priceNum = Number(limitPrice);
    const total = Number((priceNum * quantity).toFixed(2));
    if (total > portfolio.balance) {
      return res.status(400).json({ message: "Insufficient balance to place this limit order." });
    }

    // reserve funds by decrementing available balance
    portfolio.balance = Number((portfolio.balance - total).toFixed(2));
    await db.collection("portfolios").updateOne({ userId: req.userId }, { $set: portfolio }, { upsert: true });

    const order = {
      id: `o_${Date.now()}_${Math.round(Math.random() * 1e4)}`,
      userId: req.userId,
      type: "buy",
      orderType: "limit",
      status: "pending",
      symbol: stock.symbol,
      qty: quantity,
      limitPrice: priceNum,
      reservedAmount: total,
      reservedAvgCost: null,
      createdAt: new Date().toISOString(),
    };
    await db.collection("orders").insertOne(order);

    return res.status(201).json({ message: "Limit order placed.", order, balance: portfolio.balance });
  }

  return res.status(400).json({ message: "Unsupported orderType." });
});

// POST /sell  { symbol, qty, orderType, limitPrice }
router.post("/sell", async (req, res) => {
  const db = await getDb();
  const { symbol, qty, orderType = "market", limitPrice } = req.body || {};
  const quantity = Number(qty);

  if (!symbol || !quantity || quantity <= 0) {
    return res.status(400).json({ message: "symbol and a positive qty are required." });
  }

  const stock = await findStock(db, symbol);
  if (!stock) return res.status(404).json({ message: `No stock found for symbol ${symbol}.` });

  const portfolio = (await db.collection("portfolios").findOne({ userId: req.userId })) || {
    userId: req.userId,
    balance: 0,
    holdings: [],
  };
  const holding = (portfolio.holdings || []).find((h) => h.symbol === stock.symbol);
  if (!holding || holding.qty < quantity) {
    return res.status(400).json({ message: `You only own ${holding ? holding.qty : 0} shares of ${stock.symbol}.` });
  }

  if (orderType === "market") {
    const price = stock.price;
    const total = Number((price * quantity).toFixed(2));

    // decrement holding
    holding.qty -= quantity;
    portfolio.balance = Number((portfolio.balance + total).toFixed(2));
    portfolio.holdings = portfolio.holdings.filter((h) => h.qty > 0);

    await db.collection("portfolios").updateOne({ userId: req.userId }, { $set: portfolio }, { upsert: true });

    const tx = {
      id: `tx_${Date.now()}_${Math.round(Math.random() * 1e4)}`,
      userId: req.userId,
      type: "sell",
      symbol: stock.symbol,
      qty: quantity,
      price,
      total,
      date: new Date().toISOString(),
    };
    await db.collection("transactions").insertOne(tx);

    const order = {
      id: `o_${Date.now()}_${Math.round(Math.random() * 1e4)}`,
      userId: req.userId,
      type: "sell",
      orderType: "market",
      status: "executed",
      symbol: stock.symbol,
      qty: quantity,
      executedPrice: price,
      total,
      createdAt: new Date().toISOString(),
      executedAt: new Date().toISOString(),
    };
    await db.collection("orders").insertOne(order);

    return res.status(201).json({ message: "Order executed.", transaction: tx, balance: portfolio.balance, order });
  }

  // limit sell: reserve quantity
  if (orderType === "limit") {
    if (!limitPrice) return res.status(400).json({ message: "limitPrice is required for limit orders." });
    const priceNum = Number(limitPrice);
    // reserve qty by reducing holding qty temporarily
    if (holding.qty < quantity) return res.status(400).json({ message: "Insufficient shares to place this limit sell order." });
    const reservedAvg = holding.avgCost || 0;
    holding.qty = holding.qty - quantity;
    portfolio.holdings = portfolio.holdings.filter((h) => h.qty > 0);
    await db.collection("portfolios").updateOne({ userId: req.userId }, { $set: portfolio }, { upsert: true });

    const order = {
      id: `o_${Date.now()}_${Math.round(Math.random() * 1e4)}`,
      userId: req.userId,
      type: "sell",
      orderType: "limit",
      status: "pending",
      symbol: stock.symbol,
      qty: quantity,
      limitPrice: priceNum,
      reservedQty: quantity,
      reservedAvgCost: reservedAvg,
      createdAt: new Date().toISOString(),
    };
    await db.collection("orders").insertOne(order);

    return res.status(201).json({ message: "Limit sell order placed.", order, holdings: portfolio.holdings });
  }

  return res.status(400).json({ message: "Unsupported orderType." });
});

module.exports = router;
