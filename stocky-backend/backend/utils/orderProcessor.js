const { getDb } = require("./db");

async function processPendingOrders() {
  const db = await getDb();
  const pending = await db.collection("orders").find({ status: "pending" }).toArray();
  if (!pending || pending.length === 0) return;

  for (const o of pending) {
    try {
      const stock = await db.collection("stocks").findOne({ symbol: o.symbol });
      if (!stock) continue;

      if (o.orderType === "limit") {
        // buy: execute when market price <= limitPrice
        if (o.type === "buy" && stock.price <= o.limitPrice) {
          // attempt to execute using reservedAmount
          const portfolio = await db.collection("portfolios").findOne({ userId: o.userId });
          // reservedAmount was already deducted from balance at order creation
          const execPrice = stock.price;
          const total = Number((execPrice * o.qty).toFixed(2));

          // compute new holdings
          const holdings = portfolio.holdings || [];
          const existing = holdings.find((h) => h.symbol === o.symbol);
          if (existing) {
            const newQty = existing.qty + o.qty;
            existing.avgCost = Number(((existing.avgCost * existing.qty + total) / newQty).toFixed(4));
            existing.qty = newQty;
          } else {
            holdings.push({ symbol: o.symbol, qty: o.qty, avgCost: execPrice });
          }

          // update portfolio (reserved funds already removed)
          // refund any leftover from reservedAmount (when execPrice < limitPrice)
          const reserved = Number(o.reservedAmount || 0);
          const refund = Number((reserved - total).toFixed(2));
          if (refund > 0) {
            portfolio.balance = Number(((portfolio.balance || 0) + refund).toFixed(2));
          }

          await db.collection("portfolios").updateOne(
            { userId: o.userId },
            { $set: { ...portfolio, holdings } },
            { upsert: true }
          );

          const tx = {
            id: `tx_${Date.now()}_${Math.round(Math.random() * 1e4)}`,
            userId: o.userId,
            type: "buy",
            symbol: o.symbol,
            qty: o.qty,
            price: execPrice,
            total,
            date: new Date().toISOString(),
          };
          await db.collection("transactions").insertOne(tx);

          await db.collection("orders").updateOne({ id: o.id }, { $set: { status: "executed", executedAt: new Date().toISOString(), executedPrice: execPrice, total } });
        }

        // sell: execute when market price >= limitPrice
        if (o.type === "sell" && stock.price >= o.limitPrice) {
          const portfolio = await db.collection("portfolios").findOne({ userId: o.userId });
          const execPrice = stock.price;
          const total = Number((execPrice * o.qty).toFixed(2));

          // add funds and holdings already reduced at creation
          portfolio.balance = Number(((portfolio.balance || 0) + total).toFixed(2));
          await db.collection("portfolios").updateOne({ userId: o.userId }, { $set: portfolio }, { upsert: true });

          const tx = {
            id: `tx_${Date.now()}_${Math.round(Math.random() * 1e4)}`,
            userId: o.userId,
            type: "sell",
            symbol: o.symbol,
            qty: o.qty,
            price: execPrice,
            total,
            date: new Date().toISOString(),
          };
          await db.collection("transactions").insertOne(tx);

          await db.collection("orders").updateOne({ id: o.id }, { $set: { status: "executed", executedAt: new Date().toISOString(), executedPrice: execPrice, total } });
        }
      }
    } catch (err) {
      console.error("processPendingOrders error for order", o.id, err);
      // mark order as rejected on unexpected error
      try {
        await db.collection("orders").updateOne({ id: o.id }, { $set: { status: "rejected", rejectedAt: new Date().toISOString(), rejectReason: String(err) } });
      } catch (e) {}
    }
  }
}

async function cancelOrder(orderId, userId) {
  const db = await getDb();
  const o = await db.collection("orders").findOne({ id: orderId, userId });
  if (!o) throw new Error("Order not found");
  if (o.status !== "pending") throw new Error("Only pending orders can be cancelled");

  // restore reserved funds/holdings
  const portfolio = await db.collection("portfolios").findOne({ userId });
  if (o.type === "buy" && o.reservedAmount) {
    portfolio.balance = Number(((portfolio.balance || 0) + o.reservedAmount).toFixed(2));
  }
  if (o.type === "sell" && o.reservedQty) {
    const holdings = portfolio.holdings || [];
    const existing = holdings.find((h) => h.symbol === o.symbol);
    if (existing) existing.qty += o.reservedQty;
    else holdings.push({ symbol: o.symbol, qty: o.reservedQty, avgCost: o.reservedAvgCost || 0 });
    portfolio.holdings = holdings;
  }

  await db.collection("portfolios").updateOne({ userId }, { $set: portfolio }, { upsert: true });
  await db.collection("orders").updateOne({ id: orderId }, { $set: { status: "cancelled", cancelledAt: new Date().toISOString() } });
  return true;
}

module.exports = { processPendingOrders, cancelOrder };
