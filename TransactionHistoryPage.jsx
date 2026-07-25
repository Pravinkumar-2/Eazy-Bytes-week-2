import React, { useEffect, useState } from "react";
import { Download, ArrowUp, ArrowDown } from "lucide-react";
import { theme as s } from "./shared";
import { api } from "./api";

/**
 * Transaction History page -- GET /history for the fills table, plus a
 * client-side PDF export of the current portfolio (GET /portfolio) using
 * jsPDF. Run `npm i jspdf` in the frontend project for this to work;
 * jsPDF is loaded lazily so the rest of the app doesn't pay for it
 * unless someone actually clicks Export.
 */

const money = (v) => `$${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dateStr = (iso) => new Date(iso).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });

export default function TransactionHistoryPage() {
  const [txns, setTxns] = useState([]);
  const [status, setStatus] = useState({ loading: true, error: "" });
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/history");
        setTxns(res.data);
        setStatus({ loading: false, error: "" });
      } catch (err) {
        setStatus({ loading: false, error: err?.response?.data?.message || "Couldn't load transaction history. Is the backend running?" });
      }
    })();
  }, []);

  const exportPortfolioPDF = async () => {
    setExporting(true);
    try {
      const [{ jsPDF }, portfolioRes] = await Promise.all([import("jspdf"), api.get("/portfolio")]);
      const portfolio = portfolioRes.data;
      const doc = new jsPDF();

      doc.setFontSize(18);
      doc.text("Stocky -- Portfolio Statement", 14, 18);
      doc.setFontSize(10);
      doc.setTextColor(120);
      doc.text(new Date().toLocaleString(), 14, 25);

      doc.setTextColor(20);
      doc.setFontSize(12);
      doc.text(`Net worth: ${money(portfolio.netWorth)}`, 14, 38);
      doc.text(`Cash balance: ${money(portfolio.balance)}`, 14, 45);
      doc.text(`Holdings value: ${money(portfolio.holdingsValue)}`, 14, 52);

      let y = 66;
      doc.setFontSize(11);
      doc.text("Symbol", 14, y);
      doc.text("Qty", 60, y);
      doc.text("Avg cost", 85, y);
      doc.text("Price", 115, y);
      doc.text("Market value", 145, y);
      doc.text("P/L %", 180, y);
      y += 4;
      doc.setDrawColor(200);
      doc.line(14, y, 196, y);
      y += 6;

      doc.setFontSize(10);
      portfolio.holdings.forEach((h) => {
        if (y > 275) {
          doc.addPage();
          y = 20;
        }
        doc.text(h.symbol, 14, y);
        doc.text(String(h.qty), 60, y);
        doc.text(money(h.avgCost), 85, y);
        doc.text(money(h.price), 115, y);
        doc.text(money(h.marketValue), 145, y);
        doc.text(`${h.plPct >= 0 ? "+" : ""}${h.plPct.toFixed(2)}%`, 180, y);
        y += 8;
      });

      if (portfolio.holdings.length === 0) {
        doc.text("No open positions.", 14, y);
      }

      doc.save(`stocky-portfolio-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("PDF export failed:", err);
      setStatus((st) => ({ ...st, error: "Couldn't generate the PDF. Make sure jspdf is installed (npm i jspdf)." }));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <div style={s.pageHeadRow}>
        <div>
          <p style={s.pageTitle}>Transaction history</p>
          <p style={s.pageSubtitle}>Every buy and sell order that's been filled on your account</p>
        </div>
        <button style={s.primaryButton} onClick={exportPortfolioPDF} disabled={exporting}>
          <Download size={15} /> {exporting ? "Exporting..." : "Export portfolio PDF"}
        </button>
      </div>

      {status.error && <p style={{ color: "#f2545b", fontSize: "13px", marginBottom: "14px" }}>{status.error}</p>}

      <div style={s.tableCard}>
        <div style={{ ...s.tableHeadRow, gridTemplateColumns: "1fr 1fr 0.8fr 1fr 1fr 1.4fr" }}>
          <span>Type</span>
          <span>Symbol</span>
          <span>Qty</span>
          <span>Price</span>
          <span>Total</span>
          <span>Date</span>
        </div>
        {status.loading && <p style={{ fontSize: "13px", color: "var(--text-muted)", padding: "16px 6px" }}>Loading...</p>}
        {!status.loading && txns.length === 0 && (
          <p style={{ fontSize: "13px", color: "var(--text-muted)", padding: "16px 6px" }}>No transactions yet -- buy or sell a stock to see it here.</p>
        )}
        {txns.map((t) => {
          const isBuy = t.type === "buy";
          return (
            <div key={t.id} style={{ ...s.tableRow, gridTemplateColumns: "1fr 1fr 0.8fr 1fr 1fr 1.4fr" }}>
              <span style={{ fontSize: "12.5px", fontWeight: 700, color: isBuy ? "#33d69f" : "#f2545b", display: "flex", alignItems: "center", gap: "4px" }}>
                {isBuy ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                {isBuy ? "Buy" : "Sell"}
              </span>
              <span style={{ fontSize: "13.5px", fontWeight: 600 }}>{t.symbol}</span>
              <span style={{ fontSize: "13.5px" }}>{t.qty}</span>
              <span style={{ fontSize: "13.5px" }}>{money(t.price)}</span>
              <span style={{ fontSize: "13.5px", fontWeight: 600 }}>{money(t.total)}</span>
              <span style={{ fontSize: "12.5px", color: "var(--text-muted)" }}>{dateStr(t.date)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
