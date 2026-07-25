import React, { useEffect, useMemo, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { ArrowLeft, ArrowUp, ArrowDown } from "lucide-react";
import { theme as s } from "./shared";
import { api } from "./api";

/**
 * Stock Detail page -- opened by clicking a symbol on the Dashboard,
 * Live Tracking, Portfolio, Watchlist or Analytics pages. First tries
 * GET /stock/:symbol on the real backend; if that symbol isn't in the
 * backend's seed list (e.g. one of the illustrative "Discover more"
 * cards), it falls back to `buildDetail()`, a deterministic generator
 * so the page still looks complete either way.
 */

const RANGES = ["1D", "5D", "1M", "YTD", "6M", "1Y", "5Y", "MAX"];

const SIMILAR_POOL = [
  { name: "Apple Inc", ticker: "AAPL", price: 214.32, pct: 1.2 },
  { name: "Microsoft Corp", ticker: "MSFT", price: 452.1, pct: -0.6 },
  { name: "Nvidia Corp", ticker: "NVDA", price: 138.55, pct: 2.4 },
  { name: "Amazon.com", ticker: "AMZN", price: 198.77, pct: 0.4 },
  { name: "Alphabet Inc", ticker: "GOOGL", price: 176.2, pct: -1.1 },
  { name: "Meta Platforms", ticker: "META", price: 512.9, pct: 0.9 },
];

const rollingAvg = (arr, i, span) => {
  const start = Math.max(0, i - span + 1);
  const slice = arr.slice(start, i + 1);
  return slice.reduce((a, p) => a + p.price, 0) / slice.length;
};

function fromLiveStock(stock) {
  const history = stock.history || [];
  const chart = history.map((h, i) => ({
    time: i % 4 === 0 ? `${i}` : "",
    teal: h.price,
    gold: Number(rollingAvg(history, i, 5).toFixed(2)),
  }));
  const prices = history.map((h) => h.price).concat(stock.price);
  return {
    name: stock.name,
    ticker: stock.symbol,
    price: stock.price,
    changeAbs: stock.changeAbs,
    changePct: stock.changePct,
    open: stock.open,
    prevClose: stock.prevClose,
    high: stock.high,
    low: stock.low,
    volume: stock.volume,
    marketCap: stock.price * stock.volume * 12,
    pe: null,
    week52Low: Math.min(...prices),
    week52High: Math.max(...prices),
    dividend: null,
    chart: chart.length ? chart : [{ time: "", teal: stock.price, gold: stock.price }],
    live: true,
  };
}

const parsePrice = (p) => {
  if (typeof p === "number") return p;
  const n = parseFloat(String(p).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 100;
};

const seedFromString = (str) => str.split("").reduce((a, c) => a + c.charCodeAt(0), 0);

function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function buildDetail(stock) {
  const name = stock.name || "Unknown";
  const price = parsePrice(stock.price ?? stock.value);
  const seed = seedFromString(name) + Math.round(price);
  const rand = seededRandom(seed);

  const open = price * (1 - 0.004 - rand() * 0.004);
  const prevClose = price * (1 - 0.002 - rand() * 0.003);
  const high = price * (1.006 + rand() * 0.012);
  const low = price * (0.98 - rand() * 0.012);
  const volume = Math.round(1_000_000 + rand() * 9_000_000);
  const marketCap = price * (5_000_000 + rand() * 40_000_000);
  const pe = (10 + rand() * 25).toFixed(1);
  const week52Low = price * (0.62 + rand() * 0.1);
  const week52High = price * (1.2 + rand() * 0.25);
  const dividend = (rand() * 2.4).toFixed(2);
  const changeAbs = price - prevClose;
  const changePct = (changeAbs / prevClose) * 100;

  let cursor = price * 0.9;
  const chart = Array.from({ length: 22 }, (_, i) => {
    cursor += (rand() - 0.47) * price * 0.02;
    const gold = cursor * (0.94 + rand() * 0.08);
    return {
      time: i % 4 === 0 ? `${9 + Math.floor(i / 4)}:00` : "",
      teal: Math.round(cursor),
      gold: Math.round(gold),
    };
  });

  return {
    name,
    ticker: stock.ticker || stock.code || name.slice(0, 4).toUpperCase(),
    price,
    changeAbs,
    changePct,
    open,
    prevClose,
    high,
    low,
    volume,
    marketCap,
    pe,
    week52Low,
    week52High,
    dividend,
    chart,
  };
}

const money = (v) => `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const compact = (v) => {
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  return `$${v.toFixed(0)}`;
};

function StatCard({ label, value }) {
  return (
    <div style={s.statCard}>
      <p style={s.statLabel}>{label}</p>
      <p style={s.statValue}>{value}</p>
    </div>
  );
}

export default function StockDetailPage({ stock, onBack, onOpenStock, onNavigateBuy, onNavigateSell }) {
  const [range, setRange] = useState("1D");
  const [qty, setQty] = useState(10);
  const [orderNote, setOrderNote] = useState("");
  const [liveStock, setLiveStock] = useState(null);
  const fallback = useMemo(() => buildDetail(stock || { name: "S&P 500", price: 4372.75 }), [stock]);

  useEffect(() => {
    setLiveStock(null);
    const symbol = stock?.ticker || stock?.code;
    if (!symbol) return;
    api
      .get(`/stock/${symbol}`)
      .then((res) => setLiveStock(fromLiveStock(res.data)))
      .catch(() => setLiveStock(null)); // not in the backend's seed list -- fallback stays in place
  }, [stock]);

  const detail = liveStock || fallback;
  const up = detail.changePct >= 0;

  const placeOrder = (side) => {
    setOrderNote(`${side === "buy" ? "Bought" : "Sold"} ${qty} share${qty === 1 ? "" : "s"} of ${detail.ticker} at ${money(detail.price)} (simulated -- use "Open full order form" for a real order).`);
  };

  return (
    <div>
      <button style={s.backButton} onClick={onBack}>
        <ArrowLeft size={15} /> Back
      </button>

      <div style={s.breadcrumb}>
        HOME <span style={{ margin: "0 6px" }}>›</span> <span style={{ color: "var(--text)" }}>{detail.ticker}</span>
      </div>

      <div style={s.detailHeadRow}>
        <div>
          <div style={s.detailSymbolRow}>
            <div style={s.detailLogo}>{detail.ticker.slice(0, 2)}</div>
            <div>
              <p style={s.detailName}>{detail.name}</p>
              <p style={s.detailExchange}>{detail.ticker} · NASDAQ</p>
            </div>
          </div>
          <p style={s.detailPrice}>{money(detail.price)}</p>
          <span style={{ ...s.indexChangePill, color: up ? "#33d69f" : "#f2545b", fontSize: "13.5px" }}>
            {up ? <ArrowUp size={13} /> : <ArrowDown size={13} />}
            {up ? "+" : ""}
            {detail.changeAbs.toFixed(2)} ({up ? "+" : ""}
            {detail.changePct.toFixed(2)}%) today
          </span>
        </div>

        <div style={s.orderPanel}>
          <p style={{ ...s.aboutTitle, marginBottom: "12px" }}>Place order</p>
          <div style={s.qtyRow}>
            <input
              type="number"
              min="1"
              value={qty}
              onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
              style={s.qtyInput}
            />
          </div>
          <div style={s.buySellRow}>
            <button style={s.buyButton} onClick={() => placeOrder("buy")}>
              Buy
            </button>
            <button style={s.sellButton} onClick={() => placeOrder("sell")}>
              Sell
            </button>
          </div>
          {orderNote && <p style={s.orderNote}>{orderNote}</p>}
          {(onNavigateBuy || onNavigateSell) && (
            <p style={{ fontSize: "11.5px", color: "var(--text-faint)", textAlign: "center", marginTop: "10px" }}>
              Need limit orders?{" "}
              <a style={{ color: "#34e0d1", textDecoration: "none" }} href="#full-order" onClick={(e) => { e.preventDefault(); onNavigateBuy && onNavigateBuy(detail.ticker); }}>
                Open full order form
              </a>
            </p>
          )}
        </div>
      </div>

      <div style={s.chartCard}>
        <div style={s.chartHeadRow}>
          <p style={{ fontSize: "13.5px", color: "var(--text-muted)", margin: 0 }}>Price history</p>
          <div style={s.rangeTabs}>
            {RANGES.map((r) => (
              <button key={r} onClick={() => setRange(r)} style={{ ...s.rangeTab, ...(range === r ? s.rangeTabActive : {}) }}>
                {r}
              </button>
            ))}
          </div>
        </div>

        <div style={{ width: "100%", height: 300 }}>
          <ResponsiveContainer>
            <AreaChart data={detail.chart} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="tealFillDet" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34e0d1" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#34e0d1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="goldFillDet" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f5b942" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#f5b942" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: "var(--text-faint)", fontSize: 11 }} interval={0} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--text-faint)", fontSize: 12 }} tickFormatter={(v) => v.toLocaleString()} width={60} />
              <Tooltip
                contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border-strong)", borderRadius: 8 }}
                labelStyle={{ color: "var(--text-muted)" }}
                itemStyle={{ color: "var(--text)" }}
              />
              <Area type="monotone" dataKey="gold" stroke="#f5b942" strokeWidth={2} fill="url(#goldFillDet)" />
              <Area type="monotone" dataKey="teal" stroke="#34e0d1" strokeWidth={2.5} fill="url(#tealFillDet)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={s.mainGrid}>
        <div>
          <div style={s.statsGrid}>
            <StatCard label="Open" value={money(detail.open)} />
            <StatCard label="Prev close" value={money(detail.prevClose)} />
            <StatCard label="Day high" value={money(detail.high)} />
            <StatCard label="Day low" value={money(detail.low)} />
            <StatCard label="Volume" value={detail.volume.toLocaleString()} />
            <StatCard label="Market cap" value={compact(detail.marketCap)} />
            <StatCard label="P/E ratio" value={detail.pe ?? "--"} />
            <StatCard label="Dividend yield" value={detail.dividend != null ? `${detail.dividend}%` : "--"} />
            <StatCard label="52w low" value={money(detail.week52Low)} />
            <StatCard label="52w high" value={money(detail.week52High)} />
          </div>

          <div style={s.aboutCard}>
            <p style={s.aboutTitle}>About {detail.name}</p>
            <p style={s.aboutText}>
              {detail.name} ({detail.ticker}) is shown here with sample market data for demonstration. Replace{" "}
              <code>buildDetail()</code> in <code>StockDetailPage.jsx</code> with a real quote/company endpoint to
              show live fundamentals, filings, and company description.
            </p>
          </div>
        </div>

        <div style={s.sidebar}>
          <div style={s.sidebarHead}>
            <span style={s.sidebarTitle}>Similar stocks</span>
          </div>
          <div>
            {SIMILAR_POOL.map((sim) => {
              const simUp = sim.pct >= 0;
              return (
                <button key={sim.ticker} style={s.similarItem} onClick={() => onOpenStock && onOpenStock(sim)}>
                  <div style={{ textAlign: "left" }}>
                    <p style={{ fontSize: "13.5px", fontWeight: 600, margin: "0 0 2px" }}>{sim.name}</p>
                    <p style={{ fontSize: "11.5px", color: "var(--text-faint)", margin: 0 }}>{sim.ticker}</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ fontSize: "13.5px", fontWeight: 600, margin: "0 0 2px" }}>{money(sim.price)}</p>
                    <p style={{ fontSize: "11.5px", margin: 0, color: simUp ? "#33d69f" : "#f2545b" }}>
                      {simUp ? "+" : ""}
                      {sim.pct.toFixed(2)}%
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
