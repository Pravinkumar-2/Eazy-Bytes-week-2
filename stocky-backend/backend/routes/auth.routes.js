const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { getDb } = require("../utils/db");
const { JWT_SECRET } = require("../middleware/auth");

const router = express.Router();
const STARTING_BALANCE = 50000;

function publicUser(u) {
  return { id: u.id, name: u.name, email: u.email, createdAt: u.createdAt };
}

// POST /register  { firstName, lastName, email, password }
router.post("/register", async (req, res) => {
  const { firstName = "", lastName = "", name, email, password } = req.body || {};
  const fullName = name || `${firstName} ${lastName}`.trim();
  const normalizedEmail = String(email || "").trim();
  const emailLower = normalizedEmail.toLowerCase();

  if (!fullName || !normalizedEmail || !password) {
    return res.status(400).json({ message: "Name, email and password are required." });
  }

  const db = await getDb();
  const exists = await db.collection("users").findOne({ emailLower });
  if (exists) {
    return res.status(409).json({ message: "An account with this email already exists." });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = {
    id: `u_${Date.now()}_${Math.round(Math.random() * 1e4)}`,
    name: fullName,
    email: normalizedEmail,
    emailLower,
    passwordHash,
    createdAt: new Date().toISOString(),
  };

  await db.collection("users").insertOne(user);
  await db.collection("portfolios").updateOne(
    { userId: user.id },
    { $set: { userId: user.id, balance: STARTING_BALANCE, holdings: [] } },
    { upsert: true }
  );
  await db.collection("watchlists").updateOne(
    { userId: user.id },
    { $set: { userId: user.id, symbols: ["AAPL", "TSLA", "NVDA"] } },
    { upsert: true }
  );
  await db.collection("favorites").updateOne(
    { userId: user.id },
    { $set: { userId: user.id, symbols: [] } },
    { upsert: true }
  );

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });
  res.status(201).json({ token, user: publicUser(user) });
});

// POST /login  { email, password }
router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  const normalizedEmail = String(email || "").trim();
  if (!normalizedEmail || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }

  const db = await getDb();
  const user = await db.collection("users").findOne({ emailLower: normalizedEmail.toLowerCase() });
  if (!user) {
    return res.status(401).json({ message: "Invalid email or password." });
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return res.status(401).json({ message: "Invalid email or password." });
  }

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });
  res.json({ token, user: publicUser(user) });
});

module.exports = router;
