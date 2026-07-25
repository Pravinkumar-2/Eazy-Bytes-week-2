# Stocky backend

Express + JWT + bcrypt API for the Stocky app. Data persists to a single
JSON file (`data/db.json`), auto-created on first run with 12 seeded
stocks. Prices random-walk every 5 seconds in memory to simulate a live
market feed for polling clients.

## Setup

```bash
cd backend
npm install
npm start          # http://localhost:4000
```

`npm run dev` uses Node's built-in `--watch` flag to restart on file changes.

Set `PORT` and `JWT_SECRET` env vars to override the defaults (`4000` and a
dev-only secret -- **change JWT_SECRET before deploying**).

## Auth

All routes except `/register`, `/login`, `/stocks`, `/stock/:symbol` and
`/health` require `Authorization: Bearer <token>`, where `<token>` is the
JWT returned from register/login.

```
POST /api/register   { firstName, lastName, email, password } -> { token, user }
POST /api/login       { email, password }                     -> { token, user }
```

## Stocks

```
GET /api/stocks?search=app       -> [ { symbol, name, price, changeAbs, changePct, ... } ]
GET /api/stock/:symbol           -> single stock + 30-point price history
```

## Portfolio

```
GET  /api/portfolio    -> { balance, holdingsValue, netWorth, holdings: [...] }
GET  /api/dashboard    -> { portfolioValue, availableBalance, todaysProfit, todaysLoss, marketStatus }
POST /api/buy           { symbol, qty, orderType?, limitPrice? } -> { transaction, balance }
POST /api/sell          { symbol, qty, orderType?, limitPrice? } -> { transaction, balance }
```

Every new account starts with **$50,000** in cash (`STARTING_BALANCE` in
`routes/auth.routes.js`).

## Transactions

```
GET /api/history   -> this user's fills, most recent first
```

## Watchlist & Favorites

```
GET    /api/watchlist            POST /api/watchlist { symbol }      DELETE /api/watchlist/:symbol
GET    /api/favorites            POST /api/favorites { symbol }      DELETE /api/favorites/:symbol
```

## Price alerts (drives the "Live Notifications" feature)

```
GET    /api/alerts                POST /api/alerts { symbol, targetPrice, direction } DELETE /api/alerts/:id
GET    /api/alerts/check          -> alerts that just fired (and marks them triggered)
```

The frontend polls `GET /alerts/check` every 20s and shows anything it
gets back as a notification in the header bell -- that's the whole "live
notifications" feature, no websocket server needed for a project this size.

## Data model (`data/db.json`)

```
{
  users:        [{ id, name, email, passwordHash, createdAt }],
  portfolios:   { [userId]: { balance, holdings: [{symbol, qty, avgCost}] } },
  transactions: [{ id, userId, type, symbol, qty, price, total, date }],
  watchlists:   { [userId]: [symbol] },
  favorites:    { [userId]: [symbol] },
  alerts:       [{ id, userId, symbol, targetPrice, direction, triggered, createdAt }],
  stocks:       [{ symbol, name, sector, price, prevClose, open, high, low, volume, history }]
}
```

## Extending this

- Swap `utils/db.js` for a real database (Postgres/Mongo) without touching
  route handlers much -- they only ever call `getDb()`/`save()`.
- Add a `PUT /profile` and `PUT /settings/account` route to make the
  frontend's Profile/Settings edit forms actually persist (they're wired
  up to call these paths already and just show a friendly error today).
- Add a daily snapshot job that appends to a `history` array per user to
  back a real "portfolio value over time" chart on the Analytics page
  (currently sample data there).
- Swap the `setInterval` price simulator for a real market-data feed and
  add a WebSocket broadcast if you want push instead of polling.
