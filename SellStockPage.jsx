import React, { useEffect, useState } from "react";
import { ArrowLeft, DollarSign, Loader2 } from "lucide-react";
import { theme as s } from "./shared";
import { api } from "./api";
import { useToast } from "./useToast";

/**
 * Sell Stock page, wired to the real backend: GET /portfolio for your
 * actual owned positions, POST /sell to submit the order. Pass
 * `prefillTicker` to pre-select a position (e.g. from the Sell button
 * on Portfolio).
 */

const money = (v) => `$${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function SellStockPage({ prefillTicker, onBack, onComplete }) {
  const toast = useToast();
  const [holdings, setHoldings] = useState([]);
  const [selected, setSelected] = useState(null);
  const [orderType, setOrderType] = useState("market");
  const [limitPrice, setLimitPrice] = useState("");
  const [qty, setQty] = useState(1);
  const [status, setStatus] = useState({ loading: false, initializing: true });

  const loadPortfolio = async () => {
    try {
      const res = await api.get("/portfolio");
      setHoldings(res.data.holdings);
      if (prefillTicker) {
        const match = res.data.holdings.find((h) => h.symbol === prefillTicker);
        if (match) {
          setSelected(match);
          setLimitPrice(String(match.price));
        }
      }
      setStatus((st) => ({ ...st, initializing: false }));
    } catch (err) {
      const errorMsg = err?.response?.data?.message || "Couldn't reach the backend. Make sure it's running on port 4000.";
      toast.error(errorMsg);
      setStatus({ loading: false, initializing: false });
    }
  };

  useEffect(() => {
    loadPortfolio();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillTicker]);

  const execPrice = orderType === "market" ? selected?.price ?? 0 : Number(limitPrice) || 0;
  const estimatedProceeds = execPrice * qty;
  const unrealizedPL = selected ? (selected.price - selected.avgCost) * qty : 0;
  const overQty = selected ? qty > selected.qty : false;

  const handleSell = async () => {
    if (!selected || overQty || qty < 1) return;
    setStatus((st) => ({ ...st, loading: true }));
    try {
      const res = await api.post("/sell", {
        symbol: selected.symbol,
        qty,
        orderType,
        limitPrice: orderType === "limit" ? execPrice : undefined,
      });
      toast.success(`✓ Order placed: sold ${qty} share${qty === 1 ? "" : "s"} of ${selected.symbol} at ${money(execPrice)}.`);
      onComplete && onComplete({ side: "sell", symbol: selected.symbol, qty, price: execPrice, balance: res.data.balance });
    } catch (err) {
      const errorMsg = err?.response?.data?.message || "Couldn't place that order.";
      toast.error(errorMsg);
      setStatus((st) => ({ ...st, loading: false }));
    }
  };

  if (status.initializing) {
    return (
      <div>
        <button style={s.backButton} onClick={onBack}>
          <ArrowLeft size={15} /> Back
        </button>
        <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>Loading your positions...</p>
      </div>
    );
  }

  return (
    <div>
      <button style={s.backButton} onClick={onBack}>
        <ArrowLeft size={15} /> Back
      </button>

      <div style={s.pageHeadRow}>
        <div>
          <p style={s.pageTitle}>Sell stock</p>
          <p style={s.pageSubtitle}>Choose a position from your portfolio and confirm</p>
        </div>
      </div>

      <div style={s.mainGrid}>
        <div style={s.formCard}>
          {!selected ? (
            <div>
              <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "14px" }}>Your positions</p>
              {holdings.map((h) => (
                <button
                  key={h.symbol}
                  style={s.similarItem}
                  onClick={() => {
                    setSelected(h);
                    setLimitPrice(String(h.price));
                    setQty(1);
                  }}
                >
                  <div style={{ textAlign: "left" }}>
                    <p style={{ fontSize: "13.5px", fontWeight: 600, margin: "0 0 2px" }}>{h.name}</p>
                    <p style={{ fontSize: "11.5px", color: "var(--text-faint)", margin: 0 }}>
                      {h.symbol} · {h.qty} shares owned
                    </p>
                  </div>
                  <span style={{ fontSize: "13.5px", fontWeight: 600 }}>{money(h.price)}</span>
                </button>
              ))}
              {holdings.length === 0 && <p style={{ fontSize: "13px", color: "var(--text-faint)" }}>You don't own any positions yet -- buy a stock first.</p>}
            </div>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
                <div>
                  <p style={{ fontSize: "17px", fontWeight: 700, margin: "0 0 3px" }}>{selected.name}</p>
                  <p style={{ fontSize: "12.5px", color: "var(--text-faint)", margin: 0 }}>
                    {selected.symbol} · {selected.qty} shares owned · avg cost {money(selected.avgCost)}
                  </p>
                </div>
                <button
                  style={{ ...s.ghostButton, padding: "8px 14px" }}
                  onClick={() => {
                    setSelected(null);
                    setStatus((st) => ({ ...st, error: "", success: "" }));
                  }}
                >
                  Change
                </button>
              </div>

              <div style={s.segmented}>
                <button style={{ ...s.segmentedTab, ...(orderType === "market" ? s.segmentedTabActive : {}) }} onClick={() => setOrderType("market")}>
                  Market order
                </button>
                <button style={{ ...s.segmentedTab, ...(orderType === "limit" ? s.segmentedTabActive : {}) }} onClick={() => setOrderType("limit")}>
                  Limit order
                </button>
              </div>

              <div style={s.formRow}>
                <div style={{ ...s.formGroup, flex: 1 }}>
                  <label style={s.formLabel}>Quantity (max {selected.qty})</label>
                  <input type="number" min="1" max={selected.qty} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))} style={s.formInput} />
                </div>
                {orderType === "limit" && (
                  <div style={{ ...s.formGroup, flex: 1 }}>
                    <label style={s.formLabel}>Limit price</label>
                    <input type="number" min="0" step="0.01" value={limitPrice} onChange={(e) => setLimitPrice(e.target.value)} style={s.formInput} />
                  </div>
                )}
              </div>

              <div style={s.summaryStrip}>
                <div style={s.summaryStripRow}>
                  <span>Execution price</span>
                  <span>{money(execPrice)}</span>
                </div>
                <div style={s.summaryStripRow}>
                  <span>Quantity</span>
                  <span>{qty}</span>
                </div>
                <div style={s.summaryStripRow}>
                  <span>Unrealized P/L on shares sold</span>
                  <span style={{ color: unrealizedPL >= 0 ? "#33d69f" : "#f2545b" }}>
                    {unrealizedPL >= 0 ? "+" : ""}
                    {money(unrealizedPL)}
                  </span>
                </div>
                <div style={s.summaryStripTotal}>
                  <span>Estimated proceeds</span>
                  <span>{money(estimatedProceeds)}</span>
                </div>
              </div>

              {overQty && <p style={{ color: "#f2545b", fontSize: "13px", marginBottom: "12px" }}>You only own {selected.qty} shares of {selected.symbol}.</p>}

              <button style={{ ...s.sellButton, width: "100%", opacity: overQty || status.loading ? 0.6 : 1 }} onClick={handleSell} disabled={overQty || status.loading}>
                {status.loading ? (
                  <Loader2 size={16} className="pl-spin" />
                ) : (
                  <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                    <DollarSign size={15} /> Sell {selected.symbol}
                  </span>
                )}
              </button>
            </>
          )}
        </div>

        <div style={s.sidebar}>
          <div style={s.sidebarHead}>
            <span style={s.sidebarTitle}>About selling</span>
          </div>
          <p style={{ fontSize: "12.5px", color: "var(--text-muted)", lineHeight: 1.7 }}>
            Market orders sell at the next available price. Limit orders only fill at your price or better. Orders here
            hit your real backend and update your actual portfolio balance.
          </p>
        </div>
      </div>
    </div>
  );
}
