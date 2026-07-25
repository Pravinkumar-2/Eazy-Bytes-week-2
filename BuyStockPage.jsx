import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Search, ShoppingCart, Loader2 } from "lucide-react";
import { theme as s } from "./shared";
import { api } from "./api";
import { useToast } from "./useToast";

/**
 * Buy Stock page, wired to the real backend: GET /stocks for the
 * search list, GET /portfolio for available cash, POST /buy to submit
 * the order. Pass `prefillTicker` (e.g. from a Buy button on
 * Portfolio/StockDetail) to pre-select a symbol.
 */

const money = (v) => `$${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function BuyStockPage({ prefillTicker, onBack, onComplete }) {
  const toast = useToast();
  const [allStocks, setAllStocks] = useState([]);
  const [balance, setBalance] = useState(0);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [orderType, setOrderType] = useState("market");
  const [limitPrice, setLimitPrice] = useState("");
  const [qty, setQty] = useState(1);
  const [status, setStatus] = useState({ loading: false, initializing: true });

  useEffect(() => {
    (async () => {
      try {
        const [stocksRes, portfolioRes] = await Promise.all([api.get("/stocks"), api.get("/portfolio")]);
        setAllStocks(stocksRes.data);
        setBalance(portfolioRes.data.balance);
        if (prefillTicker) {
          const match = stocksRes.data.find((sym) => sym.symbol === prefillTicker);
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
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillTicker]);

  const results = useMemo(() => {
    if (!query) return allStocks;
    const q = query.toLowerCase();
    return allStocks.filter((sym) => sym.symbol.toLowerCase().includes(q) || sym.name.toLowerCase().includes(q));
  }, [query, allStocks]);

  const execPrice = orderType === "market" ? selected?.price ?? 0 : Number(limitPrice) || 0;
  const estimatedCost = execPrice * qty;
  const insufficientFunds = estimatedCost > balance;

  const handleBuy = async () => {
    if (!selected || insufficientFunds || qty < 1) return;
    setStatus((st) => ({ ...st, loading: true }));
    try {
      const res = await api.post("/buy", {
        symbol: selected.symbol,
        qty,
        orderType,
        limitPrice: orderType === "limit" ? execPrice : undefined,
      });
      setBalance(res.data.balance);
      toast.success(`✓ Order placed: bought ${qty} share${qty === 1 ? "" : "s"} of ${selected.symbol} at ${money(execPrice)}.`);
      onComplete && onComplete({ side: "buy", symbol: selected.symbol, qty, price: execPrice });
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
        <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>Loading market data...</p>
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
          <p style={s.pageTitle}>Buy stock</p>
          <p style={s.pageSubtitle}>Search a symbol, choose an order type, and confirm</p>
        </div>
      </div>

      <div style={s.mainGrid}>
        <div style={s.formCard}>
          {!selected ? (
            <>
              <div style={{ position: "relative", marginBottom: "16px" }}>
                <Search size={16} color="var(--text-faint)" style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)" }} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by symbol or company name"
                  style={{ ...s.formInput, paddingLeft: "38px" }}
                />
              </div>
              <div>
                {results.map((sym) => (
                  <button
                    key={sym.symbol}
                    style={s.similarItem}
                    onClick={() => {
                      setSelected(sym);
                      setLimitPrice(String(sym.price));
                    }}
                  >
                    <div style={{ textAlign: "left" }}>
                      <p style={{ fontSize: "13.5px", fontWeight: 600, margin: "0 0 2px" }}>{sym.name}</p>
                      <p style={{ fontSize: "11.5px", color: "var(--text-faint)", margin: 0 }}>{sym.symbol}</p>
                    </div>
                    <span style={{ fontSize: "13.5px", fontWeight: 600 }}>{money(sym.price)}</span>
                  </button>
                ))}
                {results.length === 0 && <p style={{ fontSize: "13px", color: "var(--text-faint)" }}>No matches.</p>}
              </div>
            </>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
                <div>
                  <p style={{ fontSize: "17px", fontWeight: 700, margin: "0 0 3px" }}>{selected.name}</p>
                  <p style={{ fontSize: "12.5px", color: "var(--text-faint)", margin: 0 }}>
                    {selected.symbol} · Market price {money(selected.price)}
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
                  <label style={s.formLabel}>Quantity</label>
                  <input type="number" min="1" value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))} style={s.formInput} />
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
                  <span>Available cash</span>
                  <span>{money(balance)}</span>
                </div>
                <div style={s.summaryStripTotal}>
                  <span>Estimated cost</span>
                  <span style={{ color: insufficientFunds ? "#f2545b" : "var(--text)" }}>{money(estimatedCost)}</span>
                </div>
              </div>

              {insufficientFunds && <p style={{ color: "#f2545b", fontSize: "13px", marginBottom: "12px" }}>Estimated cost exceeds your available cash balance.</p>}

              <button style={{ ...s.buyButton, width: "100%", opacity: insufficientFunds || status.loading ? 0.6 : 1 }} onClick={handleBuy} disabled={insufficientFunds || status.loading}>
                {status.loading ? (
                  <Loader2 size={16} className="pl-spin" />
                ) : (
                  <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                    <ShoppingCart size={15} /> Buy {selected.symbol}
                  </span>
                )}
              </button>
            </>
          )}
        </div>

        <div style={s.sidebar}>
          <div style={s.sidebarHead}>
            <span style={s.sidebarTitle}>Buying power</span>
          </div>
          <p style={{ fontSize: "26px", fontWeight: 700, margin: "0 0 6px" }}>{money(balance)}</p>
          <p style={{ fontSize: "12.5px", color: "var(--text-muted)", margin: 0 }}>Cash available to place new buy orders, live from your account.</p>
        </div>
      </div>
    </div>
  );
}
