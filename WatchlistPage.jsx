import React, { useEffect, useMemo, useState } from "react";
import { Star, Plus, X, Search } from "lucide-react";
import { theme as s } from "./shared";
import { api } from "./api";
import { useToast } from "./useToast";

/**
 * Watchlist + Favorites in one page (two tabs) since they're the same
 * shape of data -- a list of symbols with live prices. Backed by
 * GET/POST/DELETE /watchlist and /favorites on the Express API.
 */

export default function WatchlistPage({ onOpenStock }) {
  const toast = useToast();
  const [tab, setTab] = useState("watchlist");
  const [watchlist, setWatchlist] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState({ loading: true });

  const load = async () => {
    setStatus({ loading: true });
    try {
      const [wRes, fRes] = await Promise.all([api.get("/watchlist"), api.get("/favorites")]);
      setWatchlist(wRes.data);
      setFavorites(fRes.data);
      setStatus({ loading: false });
    } catch (err) {
      const errorMsg = err?.response?.data?.message || "Couldn't load your watchlist. Is the backend running?";
      toast.error(errorMsg);
      setStatus({ loading: false });
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await api.get("/stocks", { params: { search: query } });
        setResults(res.data);
      } catch {
        setResults([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  const list = tab === "watchlist" ? watchlist : favorites;
  const endpoint = tab === "watchlist" ? "/watchlist" : "/favorites";
  const setList = tab === "watchlist" ? setWatchlist : setFavorites;

  const alreadyIn = useMemo(() => new Set(list.map((i) => i.symbol)), [list]);

  const addSymbol = async (symbol) => {
    try {
      const res = await api.post(endpoint, { symbol });
      setList(res.data);
      const tabName = tab === "watchlist" ? "watchlist" : "favorites";
      toast.success(`✓ Added ${symbol} to ${tabName}`);
      setQuery("");
      setResults([]);
    } catch (err) {
      const errorMsg = err?.response?.data?.message || "Couldn't add that symbol.";
      toast.error(errorMsg);
    }
  };

  const removeSymbol = async (symbol) => {
    try {
      const res = await api.delete(`${endpoint}/${symbol}`);
      setList(res.data);
      const tabName = tab === "watchlist" ? "watchlist" : "favorites";
      toast.success(`✓ Removed ${symbol} from ${tabName}`);
    } catch (err) {
      const errorMsg = err?.response?.data?.message || "Couldn't remove that symbol.";
      toast.error(errorMsg);
    }
  };

  return (
    <div>
      <div style={s.pageHeadRow}>
        <div>
          <p style={s.pageTitle}>Watchlist</p>
          <p style={s.pageSubtitle}>Symbols you're tracking and your starred favorites</p>
        </div>
      </div>

      <div style={{ ...s.segmented, maxWidth: "280px" }}>
        <button style={{ ...s.segmentedTab, ...(tab === "watchlist" ? s.segmentedTabActive : {}) }} onClick={() => setTab("watchlist")}>
          Watchlist
        </button>
        <button style={{ ...s.segmentedTab, ...(tab === "favorites" ? s.segmentedTabActive : {}) }} onClick={() => setTab("favorites")}>
          Favorites
        </button>
      </div>

      <div style={{ position: "relative", maxWidth: "360px", marginBottom: "18px" }}>
        <Search size={15} color="var(--text-faint)" style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)" }} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search a symbol to add to ${tab}`}
          style={{ ...s.formInput, paddingLeft: "38px" }}
        />
        {results.length > 0 && (
          <div style={s.searchDropdown}>
            {results.map((r) => (
              <button key={r.symbol} style={s.searchResultItem} onClick={() => addSymbol(r.symbol)} disabled={alreadyIn.has(r.symbol)}>
                <span style={{ fontWeight: 700 }}>{r.symbol}</span>
                <span style={{ color: "var(--text-muted)", marginLeft: "8px" }}>{r.name}</span>
                {alreadyIn.has(r.symbol) ? (
                  <span style={{ float: "right", color: "var(--text-faint)" }}>Added</span>
                ) : (
                  <Plus size={13} style={{ float: "right" }} />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={s.tableCard}>
        <div style={{ ...s.tableHeadRow, gridTemplateColumns: "1.6fr 1fr 1fr 60px" }}>
          <span>Symbol</span>
          <span>Price</span>
          <span>Change</span>
          <span></span>
        </div>
        {status.loading && <p style={{ fontSize: "13px", color: "var(--text-muted)", padding: "16px 6px" }}>Loading...</p>}
        {!status.loading && list.length === 0 && (
          <p style={{ fontSize: "13px", color: "var(--text-muted)", padding: "16px 6px" }}>
            Nothing here yet -- search above to add a symbol to your {tab}.
          </p>
        )}
        {list.map((item) => {
          const up = item.changePct >= 0;
          return (
            <div key={item.symbol} style={{ ...s.tableRow, gridTemplateColumns: "1.6fr 1fr 1fr 60px" }}>
              <div style={{ cursor: "pointer" }} onClick={() => onOpenStock && onOpenStock({ name: item.name, ticker: item.symbol, price: item.price })}>
                <p style={s.tableCellStrong}>{item.symbol}</p>
                <p style={s.tableCellMuted}>{item.name}</p>
              </div>
              <span style={{ fontSize: "13.5px" }}>${item.price.toFixed(2)}</span>
              <span style={{ fontSize: "13px", color: up ? "#33d69f" : "#f2545b" }}>
                {up ? "+" : ""}
                {item.changePct.toFixed(2)}%
              </span>
              <button style={s.watchClose} aria-label="Remove" onClick={() => removeSymbol(item.symbol)}>
                <X size={15} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
