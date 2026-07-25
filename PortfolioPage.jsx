import React, { useEffect, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { ArrowUp, ArrowDown, ShoppingCart, DollarSign } from "lucide-react";
import { theme as s } from "./shared";
import { api } from "./api";

/**
 * Portfolio page, wired to the real backend: GET /portfolio drives the
 * summary cards, holdings table, and allocation donut. Buy/Sell buttons
 * on each row hand off to those pages with the symbol pre-selected.
 */

const COLORS = ["#34e0d1", "#f5b942", "#33d69f", "#7c9cf5", "#f2545b", "#c084fc"];
const money = (v) => `$${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function PortfolioPage({ onOpenStock, onNavigateBuy, onNavigateSell }) {
  const [portfolio, setPortfolio] = useState(null);
  const [status, setStatus] = useState({ loading: true, error: "" });

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/portfolio");
        setPortfolio(res.data);
        setStatus({ loading: false, error: "" });
      } catch (err) {
        setStatus({ loading: false, error: err?.response?.data?.message || "Couldn't load your portfolio. Is the backend running?" });
      }
    })();
  }, []);

  const holdings = portfolio?.holdings || [];
  const totalPL = holdings.reduce((a, h) => a + h.plAbs, 0);
  const totalCost = holdings.reduce((a, h) => a + h.avgCost * h.qty, 0);
  const totalPLPct = totalCost ? (totalPL / totalCost) * 100 : 0;
  const pieData = holdings.map((h) => ({ name: h.symbol, value: h.marketValue }));

  return (
    <div>
      <div style={s.pageHeadRow}>
        <div>
          <p style={s.pageTitle}>Portfolio</p>
          <p style={s.pageSubtitle}>Your holdings, allocation, and cash balance</p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button style={s.ghostButton} onClick={() => onNavigateSell && onNavigateSell(null)}>
            <DollarSign size={15} /> Sell
          </button>
          <button style={s.primaryButton} onClick={() => onNavigateBuy && onNavigateBuy(null)}>
            <ShoppingCart size={15} /> Buy stock
          </button>
        </div>
      </div>

      {status.error && <p style={{ color: "#f2545b", fontSize: "13px", marginBottom: "14px" }}>{status.error}</p>}

      <div style={s.summaryRow}>
        <div style={s.summaryCard}>
          <p style={s.summaryLabel}>Net worth</p>
          <p style={s.summaryValue}>{portfolio ? money(portfolio.netWorth) : "--"}</p>
          <p style={{ ...s.summarySub, color: "var(--text-muted)" }}>Holdings + cash</p>
        </div>
        <div style={s.summaryCard}>
          <p style={s.summaryLabel}>Holdings value</p>
          <p style={s.summaryValue}>{portfolio ? money(portfolio.holdingsValue) : "--"}</p>
          <p style={{ ...s.summarySub, color: totalPL >= 0 ? "#33d69f" : "#f2545b" }}>
            {totalPL >= 0 ? "+" : ""}
            {money(totalPL)} ({totalPL >= 0 ? "+" : ""}
            {totalPLPct.toFixed(2)}%)
          </p>
        </div>
        <div style={s.summaryCard}>
          <p style={s.summaryLabel}>Cash balance</p>
          <p style={s.summaryValue}>{portfolio ? money(portfolio.balance) : "--"}</p>
          <p style={{ ...s.summarySub, color: "var(--text-muted)" }}>Available to trade</p>
        </div>
        <div style={s.summaryCard}>
          <p style={s.summaryLabel}>Open positions</p>
          <p style={s.summaryValue}>{holdings.length}</p>
          <p style={{ ...s.summarySub, color: "var(--text-muted)" }}>Across your portfolio</p>
        </div>
      </div>

      <div style={s.mainGrid}>
        <div>
          <div style={s.tableCard}>
            <div style={{ ...s.tableHeadRow, gridTemplateColumns: "1.6fr 0.7fr 0.9fr 0.9fr 1fr 1fr 1.3fr" }}>
              <span>Symbol</span>
              <span>Qty</span>
              <span>Avg cost</span>
              <span>Price</span>
              <span>Market value</span>
              <span>P/L</span>
              <span>Actions</span>
            </div>
            {status.loading && <p style={{ fontSize: "13px", color: "var(--text-muted)", padding: "16px 6px" }}>Loading...</p>}
            {!status.loading && holdings.length === 0 && (
              <p style={{ fontSize: "13px", color: "var(--text-muted)", padding: "16px 6px" }}>
                No open positions yet -- use the Buy button above to place your first order.
              </p>
            )}
            {holdings.map((h) => {
              const up = h.plPct >= 0;
              return (
                <div key={h.symbol} style={{ ...s.tableRow, gridTemplateColumns: "1.6fr 0.7fr 0.9fr 0.9fr 1fr 1fr 1.3fr" }}>
                  <div style={{ cursor: "pointer" }} onClick={() => onOpenStock && onOpenStock({ name: h.name, ticker: h.symbol, price: h.price })}>
                    <p style={s.tableCellStrong}>{h.symbol}</p>
                    <p style={s.tableCellMuted}>{h.name}</p>
                  </div>
                  <span style={{ fontSize: "13.5px" }}>{h.qty}</span>
                  <span style={{ fontSize: "13.5px" }}>{money(h.avgCost)}</span>
                  <span style={{ fontSize: "13.5px" }}>{money(h.price)}</span>
                  <span style={{ fontSize: "13.5px", fontWeight: 600 }}>{money(h.marketValue)}</span>
                  <span style={{ fontSize: "13px", color: up ? "#33d69f" : "#f2545b", display: "flex", alignItems: "center", gap: "3px" }}>
                    {up ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                    {h.plPct.toFixed(2)}%
                  </span>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button style={{ ...s.tableActionBtn, color: "#33d69f", borderColor: "rgba(51,214,159,0.4)", background: "rgba(51,214,159,0.08)" }} onClick={() => onNavigateBuy && onNavigateBuy(h.symbol)}>
                      Buy
                    </button>
                    <button style={{ ...s.tableActionBtn, color: "#f2545b", borderColor: "rgba(242,84,91,0.4)", background: "rgba(242,84,91,0.08)" }} onClick={() => onNavigateSell && onNavigateSell(h.symbol)}>
                      Sell
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={s.sidebar}>
          <div style={s.sidebarHead}>
            <span style={s.sidebarTitle}>Allocation</span>
          </div>
          {pieData.length > 0 ? (
            <>
              <div style={{ width: "100%", height: 220 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border-strong)", borderRadius: 8 }} itemStyle={{ color: "var(--text)" }} formatter={(v) => money(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ marginTop: "6px" }}>
                {pieData.map((p, i) => (
                  <div key={p.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 0", fontSize: "12.5px" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text)" }}>
                      <span style={{ width: "9px", height: "9px", borderRadius: "3px", background: COLORS[i % COLORS.length] }} />
                      {p.name}
                    </span>
                    <span style={{ color: "var(--text-muted)" }}>{((p.value / portfolio.holdingsValue) * 100).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p style={{ fontSize: "12.5px", color: "var(--text-muted)" }}>Your allocation chart will show up here once you own a position.</p>
          )}
        </div>
      </div>
    </div>
  );
}
