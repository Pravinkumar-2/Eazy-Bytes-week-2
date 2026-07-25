import React, { useState, useEffect, useRef } from "react";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ArrowUp, ArrowDown, X } from "lucide-react";
import { theme as s } from "./shared";

/**
 * Live Tracking page -- everything on this page updates on an interval
 * to simulate a real-time feed. Kept separate from DashboardPage on
 * purpose: this is the page you leave open and watch move, the
 * dashboard is the "at a glance" snapshot.
 *
 * TICK_MS below drives a client-side random-walk simulator so it works
 * with zero backend. To go truly live, replace the body of the
 * setInterval callback in the useEffect with a WebSocket `onmessage`
 * handler or a polling axios.get() call feeding the same setState calls.
 */

const TICK_MS = 1800;
const CHART_WINDOW = 20;

const seedIndexes = [
  { key: "dax", name: "DAX PERFORMAE", code: "INX", value: 6243.28 },
  { key: "sp500", name: "S&P 500", code: "INX", value: 24586.54 },
  { key: "ftse", name: "FTSE 100 INDEX", code: "INX", value: 82965.68 },
  { key: "tsx", name: "S&P/TSX COMPOSITS", code: "INX", value: 32053.74 },
  { key: "nikkei", name: "NIKKEI 200", code: "INX", value: 46053.78 },
];

const seedCommodities = [
  { key: "platinum", name: "Platinum", value: 55789.75 },
  { key: "silver", name: "Silver", value: 30123.5 },
  { key: "copper", name: "Copper", value: 12345.67 },
  { key: "palladium", name: "Palladium", value: 78910.11 },
  { key: "rhodium", name: "Rhodium", value: 99999.99 },
];

const seedWatchlist = [
  { key: "sp500w", name: "S&P 500", price: 4372.75 },
  { key: "ftsew", name: "FTSE 100", price: 7500.12 },
  { key: "dow", name: "Dow Jones Industrial", price: 34000.25 },
  { key: "russell", name: "Russell 2000", price: 2080.3 },
];

const seedDiscover = [
  { key: "bse1", name: "Bse sensex", ticker: "DSSL", price: 6248.8 },
  { key: "ibp", name: "Installed building", ticker: "IBP", price: 1078.2 },
  { key: "wonder", name: "Wondershare", ticker: "ALIF", price: 68.8 },
  { key: "hims", name: "Hims & heres", ticker: "INDE", price: 8419.2 },
  { key: "robin", name: "Robinhood market", ticker: "SMW", price: 96008 },
  { key: "similar", name: "Similarweb Ltd", ticker: "HUB", price: 20490 },
  { key: "bse2", name: "Bse sensex", ticker: "HIM", price: 6248.8 },
  { key: "hubspot", name: "Hobspot Inc", ticker: "HOD", price: 42290 },
];

const now = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

const seedChart = (() => {
  let teal = 24000;
  let gold = 20000;
  return Array.from({ length: CHART_WINDOW }, () => {
    teal += (Math.random() - 0.45) * 900;
    gold += (Math.random() - 0.5) * 900;
    return { time: now(), teal: Math.round(teal), gold: Math.round(gold) };
  });
})();

const walk = (value, pct) => value * (1 + (Math.random() - 0.5) * pct);

function useFlash() {
  const timers = useRef({});
  const [flash, setFlash] = useState({});
  const trigger = (key, direction) => {
    setFlash((f) => ({ ...f, [key]: direction }));
    clearTimeout(timers.current[key]);
    timers.current[key] = setTimeout(() => setFlash((f) => ({ ...f, [key]: null })), 750);
  };
  return [flash, trigger];
}

function LiveBadge() {
  return (
    <div style={s.liveBadge}>
      <span style={s.liveDot} />
      LIVE
    </div>
  );
}

function StatusBar({ clock }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "18px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <LiveBadge />
        <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>Streaming a simulated feed, updates every {TICK_MS / 1000}s</span>
      </div>
      <span style={s.clockText}>{clock} UTC-4</span>
    </div>
  );
}

function TickerTape({ indexes }) {
  return (
    <div style={s.tickerTape}>
      {[...indexes, ...indexes].map((i, idx) => {
        const up = i.pct >= 0;
        return (
          <span key={idx} style={s.tickerItem}>
            <span style={{ color: "#c3cede" }}>{i.name}</span>
            <span>{i.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <span style={{ color: up ? "#33d69f" : "#f2545b" }}>
              {up ? "+" : ""}
              {i.pct.toFixed(2)}%
            </span>
          </span>
        );
      })}
    </div>
  );
}

function IndexCard({ item, flash }) {
  const up = item.pct >= 0;
  return (
    <div
      style={{
        ...s.indexCard,
        background: flash === "up" ? "rgba(51,214,159,0.07)" : flash === "down" ? "rgba(242,84,91,0.07)" : s.indexCard.background,
      }}
    >
      <p style={s.indexLabel}>{item.name}</p>
      <p style={s.indexValue}>{item.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
      <p style={s.indexSub}>
        {up ? "+" : ""}
        {item.deltaAbs.toFixed(2)} {item.pct.toFixed(2)}%
      </p>
      <div style={s.indexFoot}>
        <span style={s.indexCode}>{item.code}</span>
        <span style={{ ...s.indexChangePill, color: up ? "#33d69f" : "#f2545b" }}>
          {up ? <ArrowUp size={12} /> : <ArrowDown size={12} />} {Math.abs(item.pct).toFixed(2)}%
        </span>
      </div>
    </div>
  );
}

function CommodityRow({ items, flash }) {
  return (
    <div style={s.commodityRow}>
      {items.map((c) => {
        const up = c.pct >= 0;
        return (
          <div
            key={c.key}
            style={{
              ...s.commodityItem,
              background: flash[c.key] === "up" ? "rgba(51,214,159,0.06)" : flash[c.key] === "down" ? "rgba(242,84,91,0.06)" : "transparent",
              borderRadius: "10px",
              padding: "6px",
            }}
          >
            <div style={{ ...s.commodityIcon, background: up ? "rgba(51,214,159,0.15)" : "rgba(242,84,91,0.15)" }}>
              {up ? <ArrowUp size={15} color="#33d69f" /> : <ArrowUp size={15} color="#f2545b" style={{ transform: "rotate(180deg)" }} />}
            </div>
            <div>
              <p style={s.commodityName}>{c.name}</p>
              <p style={s.commodityValue}>
                {c.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
                <span style={{ color: up ? "#33d69f" : "#f2545b", fontSize: "12.5px" }}>
                  {up ? "+" : ""}
                  {c.pct.toFixed(2)}%
                </span>
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const RANGES = ["1D", "5D", "1M", "YTD", "6M", "1Y", "5Y", "MAX"];

function ChartCard({ data, current, trend, clock }) {
  const [range, setRange] = useState("1D");
  return (
    <div style={s.chartCard}>
      <div style={s.breadcrumb}>
        HOME <span style={{ margin: "0 6px" }}>›</span> <span style={{ color: "var(--text)" }}>.DJI-INDEX</span>
      </div>

      <div style={s.chartHeadRow}>
        <div>
          <p style={{ ...s.bigPrice, color: trend === "up" ? "#33d69f" : trend === "down" ? "#f2545b" : "#f1f5f9", transition: "color 0.4s ease" }}>
            {current.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p style={s.priceMeta}>{clock} UTC-4 · Streaming quote · Index disclaimer</p>
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
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="tealFillL" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#34e0d1" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#34e0d1" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="goldFillL" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f5b942" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#f5b942" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: "var(--text-faint)", fontSize: 11 }} interval={2} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--text-faint)", fontSize: 12 }} tickFormatter={(v) => v.toLocaleString()} width={64} />
            <Tooltip
              contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border-strong)", borderRadius: 8 }}
              labelStyle={{ color: "var(--text-muted)" }}
              itemStyle={{ color: "var(--text)" }}
              isAnimationActive={false}
            />
            <Area type="monotone" dataKey="gold" stroke="#f5b942" strokeWidth={2} fill="url(#goldFillL)" isAnimationActive={false} />
            <Area type="monotone" dataKey="teal" stroke="#34e0d1" strokeWidth={2.5} fill="url(#tealFillL)" isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function Watchlist({ items, flash, onRemove, onOpenStock }) {
  return (
    <div style={s.watchlist}>
      {items.map((w) => {
        const up = w.pct >= 0;
        return (
          <div
            key={w.key}
            style={{ ...s.watchRow, background: flash[w.key] === "up" ? "rgba(51,214,159,0.06)" : flash[w.key] === "down" ? "rgba(242,84,91,0.06)" : "transparent" }}
          >
            <input type="checkbox" style={s.checkbox} />
            <span style={{ ...s.watchName, cursor: "pointer" }} onClick={() => onOpenStock && onOpenStock({ name: w.name, price: w.price })}>
              {w.name}
            </span>
            <span style={s.watchPrice}>{w.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <span style={{ ...s.watchChange, color: up ? "#33d69f" : "#f2545b" }}>
              {up ? "+" : ""}
              {w.deltaAbs.toFixed(2)}
            </span>
            <span style={s.watchPct}>{Math.abs(w.pct).toFixed(1)}</span>
            <span style={{ ...s.watchPill, color: up ? "#34e0d1" : "#f2545b", borderColor: up ? "rgba(52,224,209,0.35)" : "rgba(242,84,91,0.35)" }}>
              {up ? <ArrowUp size={12} /> : <ArrowDown size={12} />} {Math.abs(w.pct).toFixed(1)}
            </span>
            <button style={s.watchClose} aria-label="Remove" onClick={() => onRemove(w.key)}>
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

function DiscoverCard({ item, flash, onOpenStock }) {
  const up = item.pct >= 0;
  return (
    <div
      style={{ ...s.discoverCard, cursor: "pointer", background: flash === "up" ? "rgba(51,214,159,0.06)" : flash === "down" ? "rgba(242,84,91,0.06)" : s.discoverCard.background }}
      onClick={() => onOpenStock && onOpenStock({ name: item.name, ticker: item.ticker, price: item.price })}
    >
      <div style={s.discoverTop}>
        <p style={s.discoverName}>{item.name}</p>
        <span style={s.discoverTicker}>{item.ticker}</span>
      </div>
      <p style={s.discoverPrice}>{item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
      <div style={{ position: "relative", height: 34 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={item.spark}>
            <Line type="monotone" dataKey="v" stroke={up ? "#33d69f" : "#f2545b"} strokeWidth={1.5} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
        <span style={{ ...s.discoverPct, color: up ? "#33d69f" : "#f2545b" }}>
          {up ? "+" : ""}
          {item.pct.toFixed(2)}%
        </span>
      </div>
    </div>
  );
}

export default function LiveTrackingPage({ onOpenStock }) {
  const [clock, setClock] = useState(now());
  const [indexes, setIndexes] = useState(seedIndexes.map((i) => ({ ...i, open: i.value, deltaAbs: 0, pct: 0 })));
  const [commodities, setCommodities] = useState(seedCommodities.map((c) => ({ ...c, open: c.value, pct: 0 })));
  const [watchlist, setWatchlist] = useState(seedWatchlist.map((w) => ({ ...w, open: w.price, deltaAbs: 0, pct: 0 })));
  const [discover, setDiscover] = useState(
    seedDiscover.map((d) => ({ ...d, open: d.price, pct: 0, spark: Array.from({ length: 7 }, () => ({ v: d.price })) }))
  );
  const [chartData, setChartData] = useState(seedChart);
  const [trend, setTrend] = useState(null);

  const [indexFlash, triggerIndexFlash] = useFlash();
  const [commodityFlash, triggerCommodityFlash] = useFlash();
  const [watchFlash, triggerWatchFlash] = useFlash();
  const [discoverFlash, triggerDiscoverFlash] = useFlash();

  useEffect(() => {
    const interval = setInterval(() => {
      setClock(now());

      setIndexes((prev) =>
        prev.map((i) => {
          const nextValue = walk(i.value, 0.006);
          const deltaAbs = nextValue - i.open;
          const pct = (deltaAbs / i.open) * 100;
          triggerIndexFlash(i.key, nextValue >= i.value ? "up" : "down");
          return { ...i, value: nextValue, deltaAbs, pct };
        })
      );

      setCommodities((prev) =>
        prev.map((c) => {
          const nextValue = walk(c.value, 0.01);
          const pct = ((nextValue - c.open) / c.open) * 100;
          triggerCommodityFlash(c.key, nextValue >= c.value ? "up" : "down");
          return { ...c, value: nextValue, pct };
        })
      );

      setWatchlist((prev) =>
        prev.map((w) => {
          const nextPrice = walk(w.price, 0.012);
          const deltaAbs = nextPrice - w.open;
          const pct = (deltaAbs / w.open) * 100;
          triggerWatchFlash(w.key, nextPrice >= w.price ? "up" : "down");
          return { ...w, price: nextPrice, deltaAbs, pct };
        })
      );

      setDiscover((prev) =>
        prev.map((d) => {
          const nextPrice = walk(d.price, 0.015);
          const pct = ((nextPrice - d.open) / d.open) * 100;
          triggerDiscoverFlash(d.key, nextPrice >= d.price ? "up" : "down");
          const spark = [...d.spark.slice(1), { v: nextPrice }];
          return { ...d, price: nextPrice, pct, spark };
        })
      );

      setChartData((prev) => {
        const last = prev[prev.length - 1];
        const nextTeal = Math.max(10000, walk(last.teal, 0.03));
        const nextGold = Math.max(10000, walk(last.gold, 0.03));
        setTrend(nextTeal >= last.teal ? "up" : "down");
        return [...prev.slice(1), { time: now(), teal: Math.round(nextTeal), gold: Math.round(nextGold) }];
      });
    }, TICK_MS);

    return () => clearInterval(interval);
  }, []);

  const currentPrice = chartData[chartData.length - 1]?.teal ?? 0;
  const removeFromWatchlist = (key) => setWatchlist((prev) => prev.filter((w) => w.key !== key));

  return (
    <div>
      <StatusBar clock={clock} />
      <TickerTape indexes={indexes} />

      <div style={s.indexRow}>
        {indexes.map((i) => (
          <IndexCard key={i.key} item={i} flash={indexFlash[i.key]} />
        ))}
      </div>

      <CommodityRow items={commodities} flash={commodityFlash} />

      <div style={s.mainGrid}>
        <div>
          <ChartCard data={chartData} current={currentPrice} trend={trend} clock={clock} />
          <Watchlist items={watchlist} flash={watchFlash} onRemove={removeFromWatchlist} onOpenStock={onOpenStock} />
        </div>

        <div style={s.sidebar}>
          <div style={s.sidebarHead}>
            <span style={s.sidebarTitle}>Discover more</span>
            <span style={s.sidebarSub}>you may be interested in</span>
          </div>
          <div style={s.discoverGrid}>
            {discover.map((d) => (
              <DiscoverCard key={d.key} item={d} flash={discoverFlash[d.key]} onOpenStock={onOpenStock} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
