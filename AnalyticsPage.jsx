import React, { useEffect, useState } from "react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";
import { theme as s } from "./shared";
import { api } from "./api";

/**
 * Analytics page. Gainers/losers and win rate come from your real
 * holdings (GET /portfolio). The 6-month performance line is sample
 * data -- the backend doesn't keep a historical net-worth series yet;
 * that'd be a good next addition (e.g. a daily snapshot job that
 * appends to a `history` array in db.json).
 */

const PERFORMANCE = [
  { month: "Feb", value: 38200 },
  { month: "Mar", value: 39750 },
  { month: "Apr", value: 37940 },
  { month: "May", value: 41200 },
  { month: "Jun", value: 44680 },
  { month: "Jul", value: 46990 },
];

const money = (v) => `$${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function AnalyticsPage({ onOpenStock }) {
  const [holdings, setHoldings] = useState([]);
  const [status, setStatus] = useState({ loading: true, error: "" });
  const [perf, setPerf] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/portfolio");
        setHoldings([...res.data.holdings].sort((a, b) => b.plPct - a.plPct));
        setStatus({ loading: false, error: "" });
      } catch (err) {
        setStatus({ loading: false, error: err?.response?.data?.message || "Couldn't load analytics. Is the backend running?" });
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/analytics/performance?limit=180");
        // map snapshots -> { date, netWorth }
        const snaps = (res.data.snapshots || []).map((s) => ({
          date: s.date,
          netWorth: s.netWorth,
        }));
        setPerf(snaps);
      } catch (err) {
        // non-fatal; keep sample data if unavailable
        console.warn("Failed to load performance snapshots:", err?.response?.data || err.message);
      }
    })();
  }, []);

  const winners = holdings.filter((h) => h.plPct >= 0).length;
  const winRate = holdings.length ? (winners / holdings.length) * 100 : 0;
  const best = holdings[0];
  const worst = holdings[holdings.length - 1];

  // use real performance if available
  const perfData = perf.length ? perf.map((p) => ({ label: new Date(p.date).toLocaleDateString(), value: p.netWorth })) : PERFORMANCE.map((p) => ({ label: p.month, value: p.value }));
  const start = perfData[0].value;
  const end = perfData[perfData.length - 1].value;
  const totalReturnPct = ((end - start) / start) * 100;

  const barData = holdings.map((h) => ({ symbol: h.symbol, plPct: Number(h.plPct.toFixed(2)) }));

  return (
    <div>
      <div style={s.pageHeadRow}>
        <div>
          <p style={s.pageTitle}>Analytics</p>
          <p style={s.pageSubtitle}>Performance and portfolio breakdown over time</p>
        </div>
      </div>

      {status.error && <p style={{ color: "#f2545b", fontSize: "13px", marginBottom: "14px" }}>{status.error}</p>}

      <div style={s.summaryRow}>
        <div style={s.summaryCard}>
          <p style={s.summaryLabel}>Total return (6mo)</p>
          <p style={{ ...s.summaryValue, color: totalReturnPct >= 0 ? "#33d69f" : "#f2545b" }}>
            {totalReturnPct >= 0 ? "+" : ""}
            {totalReturnPct.toFixed(2)}%
          </p>
          <p style={s.summarySub}>{money(end - start)} gained</p>
        </div>
        <div style={s.summaryCard}>
          <p style={s.summaryLabel}>Win rate</p>
          <p style={s.summaryValue}>{winRate.toFixed(0)}%</p>
          <p style={{ ...s.summarySub, color: "var(--text-muted)" }}>
            {winners} of {holdings.length || 0} positions up
          </p>
        </div>
        <div style={s.summaryCard}>
          <p style={s.summaryLabel}>Best performer</p>
          <p style={{ ...s.summaryValue, color: "#33d69f" }}>{best ? best.symbol : "--"}</p>
          <p style={{ ...s.summarySub, color: "#33d69f" }}>{best ? `+${best.plPct.toFixed(2)}%` : ""}</p>
        </div>
        <div style={s.summaryCard}>
          <p style={s.summaryLabel}>Worst performer</p>
          <p style={{ ...s.summaryValue, color: worst && worst.plPct >= 0 ? "#33d69f" : "#f2545b" }}>{worst ? worst.symbol : "--"}</p>
          <p style={{ ...s.summarySub, color: worst && worst.plPct >= 0 ? "#33d69f" : "#f2545b" }}>
            {worst ? `${worst.plPct >= 0 ? "+" : ""}${worst.plPct.toFixed(2)}%` : ""}
          </p>
        </div>
      </div>

      <div style={s.chartCard}>
        <p style={{ ...s.aboutTitle, marginBottom: "4px" }}>Portfolio value over time</p>
        <p style={{ fontSize: "12.5px", color: "var(--text-faint)", marginBottom: "14px" }}>
          {perf.length
            ? `${new Date(perf[0].date).toLocaleDateString()} — ${new Date(perf[perf.length - 1].date).toLocaleDateString()}`
            : "Last 6 months (sample series)"}
        </p>
        <div style={{ width: "100%", height: 260 }}>
          <ResponsiveContainer>
              <AreaChart data={perfData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="perfFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34e0d1" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#34e0d1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "var(--text-faint)", fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--text-faint)", fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} width={54} />
              <Tooltip contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border-strong)", borderRadius: 8 }} labelStyle={{ color: "var(--text-muted)" }} itemStyle={{ color: "var(--text)" }} formatter={(v) => money(v)} />
              <Area type="monotone" dataKey="value" stroke="#34e0d1" strokeWidth={2.5} fill="url(#perfFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={s.mainGrid}>
        <div style={s.chartCard}>
          <p style={{ ...s.aboutTitle, marginBottom: "14px" }}>Profit bar chart</p>
          <div style={{ width: "100%", height: 240 }}>
            <ResponsiveContainer>
              <BarChart data={barData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="symbol" axisLine={false} tickLine={false} tick={{ fill: "var(--text-faint)", fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--text-faint)", fontSize: 12 }} tickFormatter={(v) => `${v}%`} width={44} />
                <Tooltip contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border-strong)", borderRadius: 8 }} labelStyle={{ color: "var(--text-muted)" }} itemStyle={{ color: "var(--text)" }} formatter={(v) => `${v}%`} />
                <Bar dataKey="plPct" radius={[6, 6, 6, 6]}>
                  {barData.map((d, i) => (
                    <Cell key={i} fill={d.plPct >= 0 ? "#33d69f" : "#f2545b"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {barData.length === 0 && !status.loading && <p style={{ fontSize: "12.5px", color: "var(--text-muted)" }}>No positions yet.</p>}
        </div>

        <div style={s.sidebar}>
          <div style={s.sidebarHead}>
            <span style={s.sidebarTitle}>Movers</span>
          </div>
          <p style={{ fontSize: "12px", color: "#33d69f", display: "flex", alignItems: "center", gap: "6px", margin: "4px 0 8px" }}>
            <TrendingUp size={13} /> Gainers
          </p>
          {holdings
            .filter((h) => h.plPct >= 0)
            .slice(0, 3)
            .map((h) => (
              <button key={h.symbol} style={s.similarItem} onClick={() => onOpenStock && onOpenStock({ name: h.name, ticker: h.symbol, price: h.price })}>
                <span style={{ fontSize: "13px" }}>{h.symbol}</span>
                <span style={{ fontSize: "13px", color: "#33d69f" }}>+{h.plPct.toFixed(2)}%</span>
              </button>
            ))}
          <p style={{ fontSize: "12px", color: "#f2545b", display: "flex", alignItems: "center", gap: "6px", margin: "16px 0 8px" }}>
            <TrendingDown size={13} /> Laggards
          </p>
          {holdings
            .filter((h) => h.plPct < 0)
            .slice(0, 3)
            .map((h) => (
              <button key={h.symbol} style={s.similarItem} onClick={() => onOpenStock && onOpenStock({ name: h.name, ticker: h.symbol, price: h.price })}>
                <span style={{ fontSize: "13px" }}>{h.symbol}</span>
                <span style={{ fontSize: "13px", color: "#f2545b" }}>{h.plPct.toFixed(2)}%</span>
              </button>
            ))}
          {holdings.filter((h) => h.plPct < 0).length === 0 && <p style={{ fontSize: "12.5px", color: "var(--text-muted)" }}>No positions currently down.</p>}
        </div>
      </div>
    </div>
  );
}
