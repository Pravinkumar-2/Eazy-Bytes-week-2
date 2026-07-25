const { getDb } = require("./db");

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
    return {
      symbol: h.symbol,
      qty: h.qty,
      avgCost: h.avgCost,
      price,
      marketValue: Number(marketValue.toFixed(2)),
      plAbs: Number(plAbs.toFixed(2)),
    };
  });
}

async function computeSnapshotForPortfolio(db, portfolio) {
  const holdings = await enrichHoldings(db, portfolio.holdings || []);
  const holdingsValue = holdings.reduce((a, h) => a + h.marketValue, 0);
  const profitLoss = holdings.reduce((a, h) => a + h.plAbs, 0);
  const balance = Number((portfolio.balance || 0).toFixed(2));
  const netWorth = Number((balance + holdingsValue).toFixed(2));

  return {
    userId: portfolio.userId,
    date: new Date().toISOString(),
    netWorth: Number(netWorth.toFixed(2)),
    balance,
    holdingsValue: Number(holdingsValue.toFixed(2)),
    profitLoss: Number(profitLoss.toFixed(2)),
  };
}

async function snapshotAllUsers() {
  const db = await getDb();
  const portfolios = await db.collection("portfolios").find({}).toArray();
  if (!portfolios || portfolios.length === 0) return;

  const docs = [];
  for (const p of portfolios) {
    try {
      const snap = await computeSnapshotForPortfolio(db, p);
      // store only one snapshot per user per day (by ISO date prefix)
      const dayKey = snap.date.slice(0, 10);
      const exists = await db.collection("portfolioSnapshots").findOne({ userId: snap.userId, date: { $regex: `^${dayKey}` } });
      if (!exists) docs.push(snap);
    } catch (err) {
      console.error("snapshot error for user", p.userId, err);
    }
  }

  if (docs.length) {
    await db.collection("portfolioSnapshots").insertMany(docs);
  }
}

module.exports = { computeSnapshotForPortfolio, snapshotAllUsers };
