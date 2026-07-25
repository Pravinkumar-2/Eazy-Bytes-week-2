const { MongoClient } = require("mongodb");

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017";
const MONGODB_DB = process.env.MONGODB_DB || "stocky";
let client;
let db;

async function connectDb() {
  if (db) return db;

  client = new MongoClient(MONGODB_URI);
  await client.connect();
  db = client.db(MONGODB_DB);

  await ensureIndexes(db);
  await seedData(db);
  return db;
}

async function getDb() {
  if (!db) await connectDb();
  return db;
}

function getCollection(name) {
  if (!db) throw new Error("MongoDB is not connected. Call connectDb() first.");
  return db.collection(name);
}

async function ensureIndexes(db) {
  await db.collection("users").createIndex({ emailLower: 1 }, { unique: true });
  await db.collection("stocks").createIndex({ symbol: 1 }, { unique: true });
  await db.collection("transactions").createIndex({ userId: 1, date: -1 });
  await db.collection("alerts").createIndex({ userId: 1 });
  await db.collection("watchlists").createIndex({ userId: 1 }, { unique: true });
  await db.collection("favorites").createIndex({ userId: 1 }, { unique: true });
  await db.collection("portfolios").createIndex({ userId: 1 }, { unique: true });
  // snapshots for portfolio analytics
  await db.collection("portfolioSnapshots").createIndex({ userId: 1, date: 1 });
  // orders collection for pending/filled/cancelled orders
  await db.collection("orders").createIndex({ userId: 1, status: 1, createdAt: -1 });
}

async function seedData(db) {
  const stocks = db.collection("stocks");
  const count = await stocks.countDocuments();
  if (count > 0) return;

  await stocks.insertMany(seedStocks());
}

function seedStocks() {
  const base = [
    { symbol: "AAPL", name: "Apple Inc", sector: "Technology", price: 214.32 },
    { symbol: "MSFT", name: "Microsoft Corp", sector: "Technology", price: 452.1 },
    { symbol: "NVDA", name: "Nvidia Corp", sector: "Technology", price: 138.55 },
    { symbol: "AMZN", name: "Amazon.com", sector: "Consumer", price: 198.77 },
    { symbol: "GOOGL", name: "Alphabet Inc", sector: "Technology", price: 176.2 },
    { symbol: "META", name: "Meta Platforms", sector: "Technology", price: 512.9 },
    { symbol: "TSLA", name: "Tesla Inc", sector: "Automotive", price: 244.6 },
    { symbol: "NFLX", name: "Netflix Inc", sector: "Media", price: 682.15 },
    { symbol: "AMD", name: "Advanced Micro Devices", sector: "Technology", price: 168.9 },
    { symbol: "DIS", name: "Walt Disney Co", sector: "Media", price: 112.4 },
    { symbol: "JPM", name: "JPMorgan Chase", sector: "Finance", price: 224.8 },
    { symbol: "V", name: "Visa Inc", sector: "Finance", price: 312.55 },
  ];
  return base.map((s) => ({
    ...s,
    prevClose: Number((s.price * (1 - (Math.random() * 0.02 - 0.01))).toFixed(2)),
    open: Number((s.price * (1 - (Math.random() * 0.01 - 0.005))).toFixed(2)),
    high: Number((s.price * 1.015).toFixed(2)),
    low: Number((s.price * 0.985).toFixed(2)),
    volume: Math.round(1_000_000 + Math.random() * 9_000_000),
    history: buildHistory(s.price),
  }));
}

function buildHistory(price) {
  let cursor = price * 0.92;
  const points = [];
  for (let i = 0; i < 30; i++) {
    cursor += (Math.random() - 0.47) * price * 0.015;
    points.push({ t: i, price: Number(cursor.toFixed(2)) });
  }
  return points;
}

module.exports = { connectDb, getDb, getCollection };
