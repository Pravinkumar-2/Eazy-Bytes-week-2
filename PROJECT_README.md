# Stocky -- full project

A complete stock-trading demo app: signup/login, live-ish market data,
portfolio, buy/sell, analytics, watchlist, favorites, price alerts,
transaction history with PDF export, and dark/light mode.

## Structure

```
backend/                 Express + JWT + bcrypt API (see backend/README.md)
frontend-package.json    Dependencies for the React pages below
api.js                   Axios client all pages import (base URL, auth header, session storage)
shared.jsx               Header, design tokens (incl. CSS vars for dark/light), PAGES enum
App.jsx                  Auth gate + router + theme/search/notifications wiring

AuthPages.jsx             Sign up / Login
DashboardPage.jsx         Dashboard cards, daily trading chart, market snapshot
LiveTrackingPage.jsx      Auto-ticking live market view
StockDetailPage.jsx       Per-symbol detail, chart, quick buy/sell
PortfolioPage.jsx         Holdings table + allocation donut chart
AnalyticsPage.jsx         Performance chart, profit bar chart, movers
BuyStockPage.jsx          Full buy order form
SellStockPage.jsx         Full sell order form
WatchlistPage.jsx         Watchlist + Favorites (tabbed)
PriceAlertsPage.jsx       Create/manage price alerts
TransactionHistoryPage.jsx  Fill history + "Export portfolio PDF"
ProfilePage.jsx           Account info + trade stats
SettingsPage.jsx          Account / Notifications / Security / Preferences
```

## Running it

**Backend:**
```bash
cd backend
npm install
npm start                # http://localhost:4000
```

**Frontend:** drop all the root-level `.jsx`/`.js` files above into a React
project (Vite or Create React App both work), install the dependencies
listed in `frontend-package.json`, and render `<App />`.

```bash
npm install react react-dom axios recharts lucide-react jspdf
```

If your dev server proxies API calls differently, set `VITE_API_URL` (Vite)
or `REACT_APP_API_URL` (CRA) to point `api.js` at your backend -- it
defaults to `http://localhost:4000/api`.

## What's wired to the real backend vs. sample data

| Feature | Source |
|---|---|
| Register / Login | Real (`POST /register`, `POST /login`) |
| Dashboard cards (Portfolio, Balance, Profit, Loss, Market Status) | Real (`GET /dashboard`) |
| Daily Trading Chart (volume) | Real (`GET /stocks`) |
| Portfolio holdings + allocation chart | Real (`GET /portfolio`) |
| Buy / Sell | Real (`POST /buy`, `POST /sell`) |
| Transaction history | Real (`GET /history`) |
| Watchlist / Favorites | Real (`GET/POST/DELETE /watchlist`, `/favorites`) |
| Price alerts + live notifications | Real (`GET/POST/DELETE /alerts`, polls `GET /alerts/check`) |
| Stock Detail page | Real when the symbol exists in the backend's seed list, falls back to a deterministic mock otherwise (so clicking an illustrative "Discover more" card still works) |
| Market index/commodity strips on Dashboard, Live Tracking page | Sample data -- there's no index/forex feed in this backend |
| Analytics "portfolio value over time" | Sample data -- add a daily snapshot job server-side to make this real |
| Profile tier/KYC/phone, Settings account save | Decorative / not yet persisted -- see backend/README.md "Extending this" |

## Feature checklist

- [x] Dark Mode -- toggle in the header, CSS variables in `shared.jsx`
- [x] Watchlist -- `WatchlistPage.jsx`
- [x] Favorite Stocks -- same page, second tab
- [x] Price Alerts -- `PriceAlertsPage.jsx`
- [x] Search Stocks -- header search box, debounced `GET /stocks?search=`
- [x] Responsive Design -- grid/nav collapse below ~860-900px (see `globalCSS` media queries in `shared.jsx`)
- [x] Transaction History -- `TransactionHistoryPage.jsx`
- [x] Export Portfolio PDF -- same page, client-side via `jspdf`
- [x] Live Notifications -- header bell, polls `GET /alerts/check` every 20s
