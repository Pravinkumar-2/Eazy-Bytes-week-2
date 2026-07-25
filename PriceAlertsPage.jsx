import React, { useEffect, useState } from "react";
import { Target, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { theme as s } from "./shared";
import { api } from "./api";
import { useToast } from "./useToast";

/**
 * Price Alerts page -- create an alert (symbol + target price + above/
 * below), list existing ones, delete them. Backed by GET/POST/DELETE
 * /alerts. App.jsx polls GET /alerts/check periodically and surfaces
 * anything that fires as a live notification in the header bell.
 */

export default function PriceAlertsPage() {
  const toast = useToast();
  const [alerts, setAlerts] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [form, setForm] = useState({ symbol: "", targetPrice: "", direction: "above" });
  const [status, setStatus] = useState({ loading: true });

  const load = async () => {
    setStatus({ loading: true });
    try {
      const [aRes, sRes] = await Promise.all([api.get("/alerts"), api.get("/stocks")]);
      setAlerts(aRes.data);
      setStocks(sRes.data);
      if (!form.symbol && sRes.data[0]) setForm((f) => ({ ...f, symbol: sRes.data[0].symbol }));
      setStatus({ loading: false });
    } catch (err) {
      const errorMsg = err?.response?.data?.message || "Couldn't load alerts. Is the backend running?";
      toast.error(errorMsg);
      setStatus({ loading: false });
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createAlert = async (e) => {
    e.preventDefault();
    if (!form.symbol || !form.targetPrice) return;
    try {
      const res = await api.post("/alerts", { symbol: form.symbol, targetPrice: Number(form.targetPrice), direction: form.direction });
      setAlerts((a) => [...a, res.data]);
      setForm((f) => ({ ...f, targetPrice: "" }));
      toast.success(`✓ Alert set for ${form.symbol} at $${Number(form.targetPrice).toFixed(2)}`);
    } catch (err) {
      const errorMsg = err?.response?.data?.message || "Couldn't create that alert.";
      toast.error(errorMsg);
    }
  };

  const removeAlert = async (id) => {
    try {
      await api.delete(`/alerts/${id}`);
      setAlerts((a) => a.filter((al) => al.id !== id));
      toast.success("✓ Alert removed");
    } catch (err) {
      const errorMsg = err?.response?.data?.message || "Couldn't remove that alert.";
      toast.error(errorMsg);
    }
  };

  return (
    <div>
      <div style={s.pageHeadRow}>
        <div>
          <p style={s.pageTitle}>Price alerts</p>
          <p style={s.pageSubtitle}>Get notified when a stock crosses a price you set</p>
        </div>
      </div>

      <div style={s.mainGrid}>
        <div>
          <div style={s.tableCard}>
            <div style={{ ...s.tableHeadRow, gridTemplateColumns: "1.4fr 1fr 1fr 1fr 60px" }}>
              <span>Symbol</span>
              <span>Target</span>
              <span>Direction</span>
              <span>Status</span>
              <span></span>
            </div>
            {status.loading && <p style={{ fontSize: "13px", color: "var(--text-muted)", padding: "16px 6px" }}>Loading...</p>}
            {!status.loading && alerts.length === 0 && (
              <p style={{ fontSize: "13px", color: "var(--text-muted)", padding: "16px 6px" }}>No alerts yet -- create one on the right.</p>
            )}
            {alerts.map((a) => (
              <div key={a.id} style={{ ...s.tableRow, gridTemplateColumns: "1.4fr 1fr 1fr 1fr 60px" }}>
                <span style={{ fontSize: "13.5px", fontWeight: 600 }}>{a.symbol}</span>
                <span style={{ fontSize: "13.5px" }}>${Number(a.targetPrice).toFixed(2)}</span>
                <span style={{ fontSize: "13px", display: "flex", alignItems: "center", gap: "4px", color: a.direction === "above" ? "#33d69f" : "#f2545b" }}>
                  {a.direction === "above" ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                  {a.direction}
                </span>
                <span style={{ fontSize: "12px", color: a.triggered ? "#f5b942" : "var(--text-muted)" }}>{a.triggered ? "Triggered" : "Active"}</span>
                <button style={s.watchClose} aria-label="Delete alert" onClick={() => removeAlert(a.id)}>
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div style={s.formCard}>
          <p style={{ ...s.aboutTitle, display: "flex", alignItems: "center", gap: "8px" }}>
            <Target size={16} /> New alert
          </p>
          <form onSubmit={createAlert}>
            <div style={s.formGroup}>
              <label style={s.formLabel}>Symbol</label>
              <select style={s.formInput} value={form.symbol} onChange={(e) => setForm((f) => ({ ...f, symbol: e.target.value }))}>
                {stocks.map((st) => (
                  <option key={st.symbol} value={st.symbol}>
                    {st.symbol} -- {st.name}
                  </option>
                ))}
              </select>
            </div>
            <div style={s.formGroup}>
              <label style={s.formLabel}>Target price</label>
              <input
                type="number"
                step="0.01"
                style={s.formInput}
                value={form.targetPrice}
                onChange={(e) => setForm((f) => ({ ...f, targetPrice: e.target.value }))}
                placeholder="e.g. 220.00"
              />
            </div>
            <div style={s.segmented}>
              <button
                type="button"
                style={{ ...s.segmentedTab, ...(form.direction === "above" ? s.segmentedTabActive : {}) }}
                onClick={() => setForm((f) => ({ ...f, direction: "above" }))}
              >
                Price rises above
              </button>
              <button
                type="button"
                style={{ ...s.segmentedTab, ...(form.direction === "below" ? s.segmentedTabActive : {}) }}
                onClick={() => setForm((f) => ({ ...f, direction: "below" }))}
              >
                Price falls below
              </button>
            </div>
            <button type="submit" style={{ ...s.primaryButton, width: "100%", justifyContent: "center" }}>
              Create alert
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
