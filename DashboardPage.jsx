import React, { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  LabelList,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ArrowUp, ArrowDown, X, Wallet, TrendingUp, TrendingDown, Briefcase, Activity, Bell } from "lucide-react";
import { theme as s } from "./shared";
import { api } from "./api";

/**
 * Dashboard page. The account cards (Portfolio / Available Balance /
 * Today's Profit / Today's Loss / Market Status) and the Daily Trading
 * Chart pull live data from GET /dashboard and GET /stocks. The market
 * index/commodity strips below them stay as illustrative sample data
 * (there's no index feed in the backend) -- everything account-specific
 * is real. If the API call fails (e.g. backend not running yet) the
 * cards fall back to sample numbers so the page never breaks.
 */

const NAV_LINKS = ["Us", "Europe", "Asia", "Currencies", "Crypto", "Futures"];

const INDEXES = [
  { name: "DAX PERFORMAE", value: "6,243.28", change: "+7.43 0.56%", code: "INX", up: true },
  { name: "S&P 500", value: "24,586.54", change: "+7.43 0.56%", code: "INX", up: true },
  { name: "FTSE 100 INDEX", value: "82,965.68", change: "+7.43 0.56%", code: "INX", up: true },
  { name: "S&P/TSX COMPOSITS", value: "32,053.74", change: "+7.43 0.56%", code: "INX", up: false },
  { name: "NIKKEI 200", value: "46,053.78", change: "+7.43 0.56%", code: "INX", up: true },
];

const COMMODITIES = [
  { name: "Platinum", value: "55,789.75", change: "+10.25 0.85%", up: true },
  { name: "Silver", value: "30,123.50", change: "+5.67 0.45%", up: true },
  { name: "Copper", value: "12,345.67", change: "+3.12 0.25%", up: false },
  { name: "Palladium", value: "78,910.11", change: "+8.90 0.60%", up: true },
  { name: "Rhodium", value: "99,999.99", change: "+12.34 0.75%", up: true },
];

const RANGES = ["1D", "5D", "1M", "YTD", "6M", "1Y", "5Y", "MAX"];

const CHART_DATA = [
  { time: "10:00PM", teal: 20500, gold: 11200 },
  { time: "", teal: 19800, gold: 15400 },
  { time: "12:00PM", teal: 22100, gold: 22600 },
  { time: "", teal: 22600, gold: 31200 },
  { time: "8:00PM", teal: 24300, gold: 27800 },
  { time: "", teal: 30800, gold: 23600 },
  { time: "10:00AM", teal: 30200, gold: 27400 },
  { time: "", teal: 33400, gold: 33200 },
  { time: "", teal: 36600, gold: 35100 },
  { time: "10:00AM", teal: 39200, gold: 32100 },
];

const WATCHLIST = [
  { name: "S&P 500", price: "4,372.75", change: "+10.32", pct: "100.2" },
  { name: "FTSE 100", price: "7,500.12", change: "+20.47", pct: "75.8" },
  { name: "Dow Jones Industrial", price: "34,000.25", change: "+75.05", pct: "150.6" },
  { name: "Russell 2000", price: "2,080.30", change: "+5.12", pct: "80.1" },
];

const sparkline = (seed) => {
  let v = 50 + seed;
  return Array.from({ length: 7 }, (_, i) => {
    v += Math.sin(i + seed) * 8 + (i === 5 ? 6 : 0);
    return { v: Math.round(v) };
  });
};

const DISCOVER = [
  { name: "Bse sensex", ticker: "DSSL", price: "$6,248.80", pct: "0.48%", seed: 1 },
  { name: "Installed building", ticker: "IBP", price: "$1,078.20", pct: "0.48%", seed: 2 },
  { name: "Wondershare", ticker: "ALIF", price: "$68.80", pct: "0.48%", seed: 3 },
  { name: "Hims & heres", ticker: "INDE", price: "84,19.20", pct: "0.48%", seed: 4 },
  { name: "Robinhood market", ticker: "SMW", price: "$96,008", pct: "0.48%", seed: 5 },
  { name: "Similarweb Ltd", ticker: "HUB", price: "$20,490", pct: "0.48%", seed: 6 },
  { name: "Bse sensex", ticker: "HIM", price: "6,248.80", pct: "0.48%", seed: 7 },
  { name: "Hobspot Inc", ticker: "HOD", price: "4,2290", pct: "0.48%", seed: 8 },
];

function SubNav() {
  return (
    <div style={s.subNav}>
      {NAV_LINKS.map((l) => (
        <a key={l} href={`#${l.toLowerCase()}`} style={s.subNavLink}>
          {l}
        </a>
      ))}
    </div>
  );
}

function DashboardCards({ data, loading }) {
  const cards = [
    { key: "portfolio", label: "Portfolio", value: data ? money(data.portfolioValue) : "--", icon: Briefcase, tone: "neutral" },
    { key: "balance", label: "Available Balance", value: data ? money(data.availableBalance) : "--", icon: Wallet, tone: "neutral" },
    { key: "profit", label: "Today's Profit", value: data ? `+${money(data.todaysProfit)}` : "--", icon: TrendingUp, tone: "up" },
    { key: "loss", label: "Today's Loss", value: data ? `-${money(data.todaysLoss)}` : "--", icon: TrendingDown, tone: "down" },
    { key: "status", label: "Market Status", value: data ? data.marketStatus : "--", icon: Activity, tone: data?.marketStatus === "Open" ? "up" : "neutral" },
  ];
  return (
    <div style={{ ...s.summaryRow, gridTemplateColumns: "repeat(5, 1fr)" }}>
      {cards.map((c) => {
        const Icon = c.icon;
        const color = c.tone === "up" ? "#33d69f" : c.tone === "down" ? "#f2545b" : "var(--text)";
        return (
          <div key={c.key} style={s.summaryCard}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
              <p style={{ ...s.summaryLabel, margin: 0 }}>{c.label}</p>
              <Icon size={15} color="var(--text-faint)" />
            </div>
            <p style={{ ...s.summaryValue, color, opacity: loading ? 0.5 : 1 }}>{c.value}</p>
          </div>
        );
      })}
    </div>
  );
}

const money = (v) => `$${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function DailyTradingChart({ stocks, onOpenStock }) {
  const [activeIndex, setActiveIndex] = useState(null);
  const data = [...stocks]
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 8)
    .map((st) => ({ symbol: st.symbol, volume: st.volume, price: st.price }));

  const activeStock = activeIndex !== null ? data[activeIndex] : null;

  return (
    <div
      style={{
        ...s.chartCard,
        marginBottom: "22px",
        boxShadow: "0 28px 80px rgba(12, 27, 41, 0.12)",
        background: "radial-gradient(circle at top left, rgba(52, 224, 209, 0.15), transparent 42%), var(--bg-card)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
        <div>
          <p style={{ ...s.aboutTitle, marginBottom: "4px" }}>Daily trading chart</p>
          <p style={{ fontSize: "12.5px", color: "var(--text-faint)", margin: 0 }}>Top trading symbols by volume from the backend.</p>
        </div>
        <span style={{ color: "var(--text-faint)", fontSize: "12px" }}>{data.length} symbols</span>
      </div>

      <div style={{ width: "100%", height: 280 }}>
        <ResponsiveContainer>
          <BarChart
            data={data}
            margin={{ top: 14, right: 8, left: -8, bottom: 0 }}
            barGap={12}
            barCategoryGap="28%"
            onMouseMove={(state) => setActiveIndex(state?.activeTooltipIndex ?? null)}
            onMouseLeave={() => setActiveIndex(null)}
          >
            <defs>
              <linearGradient id="dailyVolumeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#34e0d1" stopOpacity={0.92} />
                <stop offset="100%" stopColor="#2da8ff" stopOpacity={0.22} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(148, 163, 184, 0.18)" strokeDasharray="4 8" vertical={false} />
            <XAxis
              dataKey="symbol"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--text-faint)", fontSize: 12, fontWeight: 700 }}
              tickMargin={14}
              interval={0}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--text-faint)", fontSize: 12 }}
              tickFormatter={(v) => `${(v / 1e6).toFixed(1)}M`}
              width={48}
              minTickGap={24}
            />
            <Tooltip
              contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border-strong)", borderRadius: 14, boxShadow: "0 20px 45px rgba(0, 0, 0, 0.09)" }}
              labelStyle={{ color: "var(--text-muted)" }}
              itemStyle={{ color: "var(--text)" }}
              formatter={(value) => value.toLocaleString()}
              cursor={{ fill: "rgba(255, 255, 255, 0.08)" }}
            />
            <Bar
              dataKey="volume"
              fill="url(#dailyVolumeGradient)"
              radius={[14, 14, 6, 6]}
              maxBarSize={40}
              cursor={{ fill: "rgba(255, 255, 255, 0.08)" }}
              onClick={(data) => onOpenStock && onOpenStock({ name: data.payload.symbol, ticker: data.payload.symbol, price: data.payload.price })}
            >
              <LabelList
                dataKey="volume"
                position="top"
                formatter={(value) => `${(value / 1e6).toFixed(1)}M`}
                style={{ fill: "var(--text)", fontSize: 11, fontWeight: 700 }}
              />
              {data.map((_, i) => (
                <Cell
                  key={i}
                  fill={i === activeIndex ? "#3fd2ff" : i % 2 === 0 ? "#34e0d1" : "#2da8ff"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {activeStock && (
        <div style={{ marginTop: "14px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", padding: "14px 18px", borderRadius: "14px", background: "rgba(52, 224, 209, 0.08)" }}>
          <div>
            <p style={{ margin: 0, fontSize: "13px", fontWeight: 700 }}>Active symbol</p>
            <p style={{ margin: "6px 0 0", color: "var(--text-muted)", fontSize: "12.5px" }}>{activeStock.symbol}</p>
          </div>
          <p style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "var(--text)" }}>{activeStock.volume.toLocaleString()} trades</p>
        </div>
      )}
    </div>
  );
}

function NotificationWidget({ notifications }) {
  return (
    <div style={{ ...s.chartCard, padding: "22px", border: "1px solid rgba(52,224,209,0.18)", background: "rgba(52,224,209,0.08)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
        <div>
          <p style={{ ...s.aboutTitle, marginBottom: "4px" }}>Live notifications</p>
          <p style={{ fontSize: "12.5px", color: "var(--text-faint)", margin: 0 }}>Real-time alert activity from your watchlist.</p>
        </div>
        <span style={{ ...s.liveBadge, color: "#0b2a3a", background: "rgba(51,214,159,0.16)", border: "1px solid rgba(51,214,159,0.22)" }}>
          <Bell size={12} /> {notifications.length} new
        </span>
      </div>
      {notifications.length === 0 ? (
        <p style={{ color: "var(--text-muted)", fontSize: "13px", margin: 0 }}>No recent notifications. Set price alerts to get real-time updates.</p>
      ) : (
        notifications.slice(0, 4).map((n) => (
          <div key={n.id} style={{ padding: "12px 0", borderBottom: "1px solid var(--border-soft)", display: "flex", flexDirection: "column", gap: "6px" }}>
            <span style={{ fontSize: "13px", color: "var(--text)", fontWeight: 600 }}>{n.message}</span>
            <span style={{ fontSize: "12px", color: "var(--text-faint)" }}>Tap a bar or stock card to react instantly.</span>
          </div>
        ))
      )}
    </div>
  );
}

function MarketPulseCard({ stocks, onOpenStock }) {
  const topGainer = stocks.length ? stocks.reduce((best, stock) => (stock.changePct > best.changePct ? stock : best), stocks[0]) : null;
  const topLoser = stocks.length ? stocks.reduce((worst, stock) => (stock.changePct < worst.changePct ? stock : worst), stocks[0]) : null;

  return (
    <div style={{ ...s.chartCard, padding: "22px", minHeight: "220px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
        <div>
          <p style={{ ...s.aboutTitle, marginBottom: "4px" }}>Market pulse</p>
          <p style={{ fontSize: "12.5px", color: "var(--text-faint)", margin: 0 }}>Actionable insights from current stock moves.</p>
        </div>
        <span style={{ fontSize: "12px", color: "var(--text-faint)", fontWeight: 700 }}>{stocks.length} stocks</span>
      </div>
      <div style={{ display: "grid", gap: "14px" }}>
        {topGainer && (
          <button
            style={{ ...s.summaryCard, cursor: "pointer", background: "rgba(51,214,159,0.08)", border: "1px solid rgba(51,214,159,0.18)", textAlign: "left" }}
            onClick={() => onOpenStock && onOpenStock({ name: topGainer.name, ticker: topGainer.symbol, price: topGainer.price })}
          >
            <p style={{ fontSize: "12px", color: "#33d69f", margin: 0 }}>Top gainer</p>
            <p style={{ margin: "6px 0 0", fontSize: "16px", fontWeight: 700 }}>{topGainer.symbol}</p>
            <p style={{ margin: "6px 0 0", color: "var(--text-muted)", fontSize: "13px" }}>+{topGainer.changePct.toFixed(2)}%</p>
          </button>
        )}
        {topLoser && (
          <button
            style={{ ...s.summaryCard, cursor: "pointer", background: "rgba(242,84,91,0.08)", border: "1px solid rgba(242,84,91,0.18)", textAlign: "left" }}
            onClick={() => onOpenStock && onOpenStock({ name: topLoser.name, ticker: topLoser.symbol, price: topLoser.price })}
          >
            <p style={{ fontSize: "12px", color: "#f2545b", margin: 0 }}>Top loser</p>
            <p style={{ margin: "6px 0 0", fontSize: "16px", fontWeight: 700 }}>{topLoser.symbol}</p>
            <p style={{ margin: "6px 0 0", color: "var(--text-muted)", fontSize: "13px" }}>{topLoser.changePct.toFixed(2)}%</p>
          </button>
        )}
      </div>
    </div>
  );
}

function IndexCard({ item }) {
  return (
    <div style={s.indexCard}>
      <p style={s.indexLabel}>{item.name}</p>
      <p style={s.indexValue}>{item.value}</p>
      <p style={s.indexSub}>{item.change}</p>
      <div style={s.indexFoot}>
        <span style={s.indexCode}>{item.code}</span>
        <span style={{ ...s.indexChangePill, color: item.up ? "#33d69f" : "#f2545b" }}>
          {item.up ? <ArrowUp size={12} /> : <ArrowDown size={12} />} {item.change.split(" ")[1]}
        </span>
      </div>
    </div>
  );
}

function CommodityRow() {
  return (
    <div style={s.commodityRow}>
      {COMMODITIES.map((c) => (
        <div key={c.name} style={s.commodityItem}>
          <div style={{ ...s.commodityIcon, background: c.up ? "rgba(51,214,159,0.15)" : "rgba(242,84,91,0.15)" }}>
            {c.up ? <ArrowUp size={15} color="#33d69f" /> : <ArrowUp size={15} color="#f2545b" style={{ transform: "rotate(180deg)" }} />}
          </div>
          <div>
            <p style={s.commodityName}>{c.name}</p>
            <p style={s.commodityValue}>
              {c.value}{" "}
              <span style={{ color: c.up ? "#33d69f" : "#f2545b", fontSize: "12.5px" }}>{c.change}</span>
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function ChartCard() {
  const [range, setRange] = useState("1D");
  return (
    <div style={s.chartCard}>
      <div style={s.breadcrumb}>
        HOME <span style={{ margin: "0 6px" }}>›</span> <span style={{ color: "var(--text)" }}>.DJI-INDEX</span>
      </div>

      <div style={s.chartHeadRow}>
        <div>
          <p style={s.bigPrice}>44,524.40</p>
          <p style={s.priceMeta}>Jun 9, 4:05 PM UTC-4 · Index disclaimer</p>
        </div>
        <div style={s.rangeTabs}>
          {RANGES.map((r) => (
            <button key={r} onClick={() => setRange(r)} style={{ ...s.rangeTab, ...(range === r ? s.rangeTabActive : {}) }}>
              {r}
            </button>
          ))}
        </div>
      </div>

      <div style={{ width: "100%", height: 340 }}>
        <ResponsiveContainer>
          <AreaChart data={CHART_DATA} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="tealFillD" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#34e0d1" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#34e0d1" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="goldFillD" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f5b942" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#f5b942" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: "var(--text-faint)", fontSize: 12 }} interval={0} />
            <YAxis
              domain={[10000, 50000]}
              ticks={[10000, 20000, 30000, 40000, 50000]}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--text-faint)", fontSize: 12 }}
              tickFormatter={(v) => v.toLocaleString()}
            />
            <Tooltip
              contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border-strong)", borderRadius: 8 }}
              labelStyle={{ color: "var(--text-muted)" }}
              itemStyle={{ color: "var(--text)" }}
            />
            <Area type="monotone" dataKey="gold" stroke="#f5b942" strokeWidth={2} fill="url(#goldFillD)" />
            <Area type="monotone" dataKey="teal" stroke="#34e0d1" strokeWidth={2.5} fill="url(#tealFillD)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function Watchlist({ onOpenStock }) {
  return (
    <div style={s.watchlist}>
      {WATCHLIST.map((w) => (
        <div key={w.name} style={s.watchRow}>
          <input type="checkbox" style={s.checkbox} />
          <span style={{ ...s.watchName, cursor: "pointer" }} onClick={() => onOpenStock && onOpenStock(w)}>
            {w.name}
          </span>
          <span style={s.watchPrice}>{w.price}</span>
          <span style={{ ...s.watchChange, color: "#33d69f" }}>{w.change}</span>
          <span style={s.watchPct}>{w.pct}</span>
          <span style={{ ...s.watchPill, color: "#34e0d1", borderColor: "rgba(52,224,209,0.35)" }}>
            <ArrowUp size={12} /> {w.pct}
          </span>
          <button style={s.watchClose} aria-label="Remove">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

function DiscoverCard({ item, onOpenStock }) {
  return (
    <div style={{ ...s.discoverCard, cursor: "pointer" }} onClick={() => onOpenStock && onOpenStock(item)}>
      <div style={s.discoverTop}>
        <p style={s.discoverName}>{item.name}</p>
        <span style={s.discoverTicker}>{item.ticker}</span>
      </div>
      <p style={s.discoverPrice}>{item.price}</p>
      <div style={{ position: "relative", height: 34 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={sparkline(item.seed)}>
            <Line type="monotone" dataKey="v" stroke="#5b6a80" strokeWidth={1.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
        <span style={s.discoverPct}>{item.pct}</span>
      </div>
    </div>
  );
}

export default function DashboardPage({ onOpenStock, notifications = [] }) {
  const [cardData, setCardData] = useState(null);
  const [stocks, setStocks] = useState([]);
  const [loadingCards, setLoadingCards] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [dashRes, stocksRes] = await Promise.all([api.get("/dashboard"), api.get("/stocks")]);
        setCardData(dashRes.data);
        setStocks(stocksRes.data);
      } catch (err) {
        // Backend not running yet -- keep the page usable with sample data.
        setCardData({ portfolioValue: 51071.6, availableBalance: 48928.4, todaysProfit: 812.4, todaysLoss: 214.1, marketStatus: "Closed" });
      } finally {
        setLoadingCards(false);
      }
    })();
  }, []);

  return (
    <div>
      <SubNav />

      <DashboardCards data={cardData} loading={loadingCards} />

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "18px", marginBottom: "22px" }}>
        <NotificationWidget notifications={notifications} />
        <MarketPulseCard stocks={stocks} onOpenStock={onOpenStock} />
      </div>

      {stocks.length > 0 && <DailyTradingChart stocks={stocks} onOpenStock={onOpenStock} />}

      <div style={s.indexRow}>
        {INDEXES.map((i) => (
          <IndexCard key={i.name} item={i} />
        ))}
      </div>

      <CommodityRow />

      <div style={s.mainGrid}>
        <div>
          <ChartCard />
          <Watchlist onOpenStock={onOpenStock} />
        </div>

        <div style={s.sidebar}>
          <div style={s.sidebarHead}>
            <span style={s.sidebarTitle}>Discover more</span>
            <span style={s.sidebarSub}>you may be interested in</span>
          </div>
          <div style={s.discoverGrid}>
            {DISCOVER.map((d, i) => (
              <DiscoverCard key={i} item={d} onOpenStock={onOpenStock} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
