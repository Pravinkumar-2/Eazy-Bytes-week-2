import React, { useState } from "react";
import { Settings, Bell, ChevronDown, BarChart2, Search, Star, Target, Clock, Sun, Moon, X } from "lucide-react";
import { getStoredUser } from "./api";

/**
 * Shared chrome for the Stocky app: the top header (logo, page tabs,
 * search, quick-action icons, profile) plus the color/style tokens and
 * global CSS every page uses. Import `Header`, `theme`, and `globalCSS`
 * from here in every page.
 */

export const PAGES = {
  DASHBOARD: "dashboard",
  LIVE: "live",
  DETAIL: "detail",
  PORTFOLIO: "portfolio",
  ANALYTICS: "analytics",
  BUY: "buy",
  SELL: "sell",
  PROFILE: "profile",
  SETTINGS: "settings",
  WATCHLIST: "watchlist",
  ALERTS: "alerts",
  HISTORY: "history",
};

const PRIMARY_TABS = [
  { key: PAGES.DASHBOARD, label: "Dashboard" },
  { key: PAGES.LIVE, label: "Live Tracking" },
  { key: PAGES.PORTFOLIO, label: "Portfolio" },
  { key: PAGES.ANALYTICS, label: "Analytics" },
];

export function Header({
  page,
  onNavigate,
  darkMode = true,
  onToggleTheme,
  onSearch,
  searchResults = [],
  onSelectSearchResult,
  notifications = [],
  onDismissNotification,
}) {
  const [query, setQuery] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);

  const runSearch = (q) => {
    setQuery(q);
    setShowResults(!!q);
    onSearch && onSearch(q);
  };

  return (
    <div style={theme.header}>
      <div style={theme.brand}>
        <div style={theme.brandMark}>
          <BarChart2 size={20} color="#04151d" strokeWidth={2.6} />
        </div>
        <span style={theme.brandName}>Stocky</span>
      </div>

      <nav style={theme.pageTabs} className="pl-nav-collapse">
        {PRIMARY_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => onNavigate(t.key)}
            style={{ ...theme.pageTab, ...(page === t.key ? theme.pageTabActive : {}) }}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div style={{ position: "relative" }}>
        <div style={theme.searchBox}>
          <Search size={15} color="var(--text-faint)" />
          <input
            value={query}
            onChange={(e) => runSearch(e.target.value)}
            onFocus={() => setShowResults(!!query)}
            placeholder="Search stocks..."
            style={theme.searchInput}
          />
        </div>
        {showResults && (
          <div style={theme.searchDropdown}>
            {searchResults.length === 0 && <p style={{ fontSize: "12.5px", color: "var(--text-faint)", padding: "10px 12px" }}>No matches.</p>}
            {searchResults.slice(0, 6).map((r) => (
              <button
                key={r.ticker || r.symbol}
                style={theme.searchResultItem}
                onClick={() => {
                  onSelectSearchResult && onSelectSearchResult(r);
                  setShowResults(false);
                  setQuery("");
                }}
              >
                <span style={{ fontWeight: 700 }}>{r.ticker || r.symbol}</span>
                <span style={{ color: "var(--text-muted)", marginLeft: "8px" }}>{r.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={theme.headerRight}>
        <button style={theme.iconButton} aria-label="Watchlist" onClick={() => onNavigate(PAGES.WATCHLIST)}>
          <Star size={16} />
        </button>
        <button style={theme.iconButton} aria-label="Price alerts" onClick={() => onNavigate(PAGES.ALERTS)}>
          <Target size={16} />
        </button>
        <button style={theme.iconButton} aria-label="Transaction history" onClick={() => onNavigate(PAGES.HISTORY)}>
          <Clock size={16} />
        </button>
        <button style={theme.iconButton} aria-label="Toggle dark mode" onClick={onToggleTheme}>
          {darkMode ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <button style={theme.iconButton} aria-label="Settings" onClick={() => onNavigate(PAGES.SETTINGS)}>
          <Settings size={16} />
        </button>

        <div style={{ position: "relative" }}>
          <button style={theme.iconButton} aria-label="Notifications" onClick={() => setShowNotifs((v) => !v)}>
            <Bell size={16} />
            {notifications.length > 0 && <span style={theme.notifDot} />}
          </button>
          {showNotifs && (
            <div style={theme.notifDropdown}>
              <p style={{ fontSize: "12.5px", fontWeight: 700, margin: "0 0 8px" }}>Notifications</p>
              {notifications.length === 0 && <p style={{ fontSize: "12.5px", color: "var(--text-faint)" }}>You're all caught up.</p>}
              {notifications.map((n) => (
                <div key={n.id} style={theme.notifItem}>
                  <span style={{ fontSize: "12.5px" }}>{n.message}</span>
                  <button style={theme.notifClose} onClick={() => onDismissNotification && onDismissNotification(n.id)}>
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={theme.profile} onClick={() => onNavigate(PAGES.PROFILE)}>
          {(() => {
            const storedUser = getStoredUser() || { name: "Guest" };
            const initials = storedUser.name
              .split(" ")
              .filter(Boolean)
              .map((part) => part[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();
            return (
              <>
                <div style={theme.avatar}>{initials || "GU"}</div>
                <div>
                  <p style={theme.profileName}>{storedUser.name || "Guest"}</p>
                  <p style={theme.profileRole}>Project Holder</p>
                </div>
              </>
            );
          })()}
          <ChevronDown size={15} color="var(--text-muted)" />
        </div>
      </div>
    </div>
  );
}

export const theme = {
  page: {
    minHeight: "100vh",
    background: "var(--bg)",
    color: "var(--text)",
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
    padding: "22px 28px 40px",
    boxSizing: "border-box",
  },
  header: { display: "flex", alignItems: "center", gap: "36px", marginBottom: "28px" },
  brand: { display: "flex", alignItems: "center", gap: "10px" },
  brandMark: {
    width: "34px",
    height: "34px",
    borderRadius: "9px",
    background: "linear-gradient(135deg,#34e0d1,#3fe0a5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  brandName: { fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: "19px" },

  pageTabs: { display: "flex", gap: "4px", background: "var(--bg-soft)", borderRadius: "10px", padding: "4px", flex: 1, maxWidth: "480px", marginLeft: "16px" },
  pageTab: { flex: 1, border: "none", background: "transparent", color: "var(--text-muted)", fontSize: "13px", fontWeight: 600, padding: "9px 10px", borderRadius: "8px", cursor: "pointer", whiteSpace: "nowrap" },
  pageTabActive: { background: "rgba(148,163,184,0.16)", color: "#f1f5f9" },

  headerRight: { display: "flex", alignItems: "center", gap: "10px", marginLeft: "auto" },

  searchBox: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    background: "var(--bg-soft)",
    border: "1px solid var(--border-strong)",
    borderRadius: "10px",
    padding: "8px 12px",
    width: "220px",
  },
  searchInput: { background: "none", border: "none", outline: "none", color: "var(--text)", fontSize: "13px", width: "100%" },
  searchDropdown: {
    position: "absolute",
    top: "calc(100% + 6px)",
    left: 0,
    width: "280px",
    background: "var(--bg-card)",
    border: "1px solid var(--border-strong)",
    borderRadius: "10px",
    padding: "8px",
    zIndex: 50,
    boxShadow: "0 12px 30px rgba(0,0,0,0.35)",
  },
  searchResultItem: {
    display: "block",
    width: "100%",
    textAlign: "left",
    padding: "9px 10px",
    borderRadius: "8px",
    border: "none",
    background: "none",
    color: "var(--text)",
    fontSize: "12.5px",
    cursor: "pointer",
  },
  notifDot: { position: "absolute", top: "6px", right: "6px", width: "7px", height: "7px", borderRadius: "50%", background: "#f2545b" },
  notifDropdown: {
    position: "absolute",
    top: "calc(100% + 8px)",
    right: 0,
    width: "260px",
    background: "var(--bg-card)",
    border: "1px solid var(--border-strong)",
    borderRadius: "10px",
    padding: "12px",
    zIndex: 50,
    boxShadow: "0 12px 30px rgba(0,0,0,0.35)",
  },
  notifItem: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px", padding: "8px 0", borderBottom: "1px solid var(--border-soft)" },
  notifClose: { background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", flexShrink: 0 },
  iconButton: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    border: "1px solid rgba(148,163,184,0.2)",
    background: "var(--bg-soft)",
    color: "#c3cede",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  profile: { display: "flex", alignItems: "center", gap: "8px", marginLeft: "6px", cursor: "pointer" },
  avatar: {
    width: "34px",
    height: "34px",
    borderRadius: "50%",
    background: "#233047",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "12px",
    fontWeight: 700,
    color: "#9fb4d6",
  },
  profileName: { fontSize: "13.5px", fontWeight: 600, margin: 0 },
  profileRole: { fontSize: "11.5px", color: "var(--text-muted)", margin: 0 },

  subNav: { display: "flex", gap: "26px", marginBottom: "22px" },
  subNavLink: { color: "#aab6c9", textDecoration: "none", fontSize: "14.5px" },

  indexRow: { display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "14px", marginBottom: "14px" },
  indexCard: {
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: "14px",
    padding: "18px",
    transition: "background 0.5s ease",
  },
  indexLabel: { fontSize: "12px", letterSpacing: "0.5px", color: "var(--text-muted)", margin: "0 0 14px" },
  indexValue: { fontSize: "22px", fontWeight: 700, margin: "0 0 6px" },
  indexSub: { fontSize: "12.5px", color: "var(--text-muted)", margin: "0 0 14px" },
  indexFoot: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  indexCode: { fontSize: "12px", color: "var(--text-faint)" },
  indexChangePill: { display: "flex", alignItems: "center", gap: "3px", fontSize: "12.5px", fontWeight: 600 },

  commodityRow: {
    display: "grid",
    gridTemplateColumns: "repeat(5, 1fr)",
    gap: "14px",
    marginBottom: "22px",
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: "14px",
    padding: "16px 18px",
  },
  commodityItem: { display: "flex", alignItems: "center", gap: "10px", transition: "background 0.5s ease" },
  commodityIcon: { width: "30px", height: "30px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  commodityName: { fontSize: "13px", color: "#aab6c9", margin: "0 0 3px" },
  commodityValue: { fontSize: "14.5px", fontWeight: 600, margin: 0 },

  mainGrid: { display: "grid", gridTemplateColumns: "1fr 400px", gap: "18px", alignItems: "start" },
  chartCard: {
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: "14px",
    padding: "22px",
    marginBottom: "16px",
  },
  breadcrumb: { fontSize: "12px", color: "var(--text-faint)", marginBottom: "18px", letterSpacing: "0.5px" },
  chartHeadRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px", flexWrap: "wrap", gap: "14px" },
  bigPrice: { fontSize: "34px", fontWeight: 700, margin: "0 0 6px" },
  priceMeta: { fontSize: "12.5px", color: "var(--text-faint)", margin: 0 },
  rangeTabs: { display: "flex", gap: "4px", background: "var(--bg-soft)", borderRadius: "10px", padding: "4px" },
  rangeTab: { border: "none", background: "transparent", color: "var(--text-muted)", fontSize: "12.5px", padding: "7px 12px", borderRadius: "8px", cursor: "pointer" },
  rangeTabActive: { background: "rgba(148,163,184,0.16)", color: "#f1f5f9", fontWeight: 600 },

  watchlist: { background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "14px", padding: "8px 18px" },
  watchRow: {
    display: "grid",
    gridTemplateColumns: "24px 1.4fr 1fr 1fr 0.6fr 90px 30px",
    alignItems: "center",
    gap: "12px",
    padding: "14px 6px",
    borderBottom: "1px solid var(--border-soft)",
    borderRadius: "8px",
    transition: "background 0.5s ease",
  },
  checkbox: { width: "15px", height: "15px", accentColor: "#34e0d1" },
  watchName: { fontSize: "14px", fontWeight: 600 },
  watchPrice: { fontSize: "13.5px", color: "#c3cede" },
  watchChange: { fontSize: "13.5px" },
  watchPct: { fontSize: "13.5px", color: "var(--text-muted)" },
  watchPill: { display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", fontSize: "12.5px", border: "1px solid", borderRadius: "8px", padding: "5px 8px" },
  watchClose: { background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", display: "flex" },

  sidebar: { background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "14px", padding: "20px" },
  sidebarHead: { display: "flex", alignItems: "baseline", gap: "8px", marginBottom: "16px" },
  sidebarTitle: { fontSize: "16px", fontWeight: 700 },
  sidebarSub: { fontSize: "12px", color: "var(--text-faint)" },
  discoverGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" },
  discoverCard: { background: "var(--bg-soft)", border: "1px solid var(--border-soft)", borderRadius: "10px", padding: "12px", transition: "background 0.5s ease" },
  discoverTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" },
  discoverName: { fontSize: "13px", fontWeight: 600, margin: 0 },
  discoverTicker: { fontSize: "10.5px", background: "rgba(148,163,184,0.14)", color: "#c3cede", padding: "2px 6px", borderRadius: "5px" },
  discoverPrice: { fontSize: "16px", fontWeight: 700, margin: "0 0 4px" },
  discoverPct: { position: "absolute", right: 0, top: "-10px", fontSize: "10px", background: "#1a2436", padding: "2px 5px", borderRadius: "4px" },

  liveBadge: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.5px",
    color: "#33d69f",
    border: "1px solid rgba(51,214,159,0.35)",
    borderRadius: "999px",
    padding: "5px 10px",
  },
  liveDot: { width: "6px", height: "6px", borderRadius: "50%", background: "#33d69f", animation: "pl-pulse 1.4s infinite" },
  clockText: { fontSize: "12.5px", color: "var(--text-faint)", fontFamily: "'JetBrains Mono', monospace" },

  tickerTape: {
    display: "flex",
    gap: "28px",
    overflow: "hidden",
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: "14px",
    padding: "14px 20px",
    marginBottom: "18px",
  },
  tickerItem: { display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", whiteSpace: "nowrap", fontFamily: "'JetBrains Mono', monospace" },

  backButton: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    background: "none",
    border: "none",
    color: "var(--text-muted)",
    fontSize: "13px",
    cursor: "pointer",
    padding: 0,
    marginBottom: "18px",
  },
  detailHeadRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "18px", marginBottom: "18px" },
  detailSymbolRow: { display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" },
  detailLogo: {
    width: "40px",
    height: "40px",
    borderRadius: "10px",
    background: "linear-gradient(135deg,#233047,#182131)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "13px",
    fontWeight: 700,
    color: "#9fb4d6",
  },
  detailName: { fontSize: "20px", fontWeight: 700, margin: 0 },
  detailExchange: { fontSize: "12px", color: "var(--text-faint)", margin: 0 },
  detailPrice: { fontSize: "32px", fontWeight: 700, margin: "0 0 4px" },

  orderPanel: {
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: "14px",
    padding: "18px",
    minWidth: "220px",
  },
  qtyRow: { display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" },
  qtyInput: {
    width: "100%",
    background: "var(--bg-soft)",
    border: "1px solid var(--border-strong)",
    borderRadius: "8px",
    padding: "9px 10px",
    color: "#f1f5f9",
    fontSize: "13.5px",
    outline: "none",
  },
  buySellRow: { display: "flex", gap: "10px" },
  buyButton: { flex: 1, padding: "11px", borderRadius: "9px", border: "none", background: "#33d69f", color: "#04231a", fontWeight: 700, fontSize: "13.5px", cursor: "pointer" },
  sellButton: { flex: 1, padding: "11px", borderRadius: "9px", border: "1px solid rgba(242,84,91,0.4)", background: "rgba(242,84,91,0.08)", color: "#f2545b", fontWeight: 700, fontSize: "13.5px", cursor: "pointer" },
  orderNote: { fontSize: "12px", color: "#33d69f", marginTop: "10px", textAlign: "center" },

  statsGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "14px", marginBottom: "16px" },
  statCard: { background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "14px" },
  statLabel: { fontSize: "11.5px", color: "var(--text-muted)", margin: "0 0 6px" },
  statValue: { fontSize: "15px", fontWeight: 600, margin: 0 },

  aboutCard: { background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "14px", padding: "20px", marginBottom: "16px" },
  aboutTitle: { fontSize: "15px", fontWeight: 700, margin: "0 0 10px" },
  aboutText: { fontSize: "13.5px", color: "#aab6c9", lineHeight: 1.7, margin: 0 },

  similarItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 0",
    borderBottom: "1px solid var(--border-soft)",
    background: "none",
    border: "none",
    width: "100%",
    cursor: "pointer",
    color: "inherit",
  },

  // ---- shared page-level chrome ----
  pageHeadRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "14px", marginBottom: "20px" },
  pageTitle: { fontFamily: "'Sora', sans-serif", fontSize: "24px", fontWeight: 700, margin: "0 0 6px" },
  pageSubtitle: { fontSize: "13.5px", color: "var(--text-muted)", margin: 0 },
  primaryButton: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "10px 18px",
    borderRadius: "10px",
    border: "none",
    background: "linear-gradient(90deg,#2fb8ff,#3fe0a5)",
    color: "#04121a",
    fontWeight: 700,
    fontSize: "13.5px",
    cursor: "pointer",
  },
  ghostButton: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "10px 18px",
    borderRadius: "10px",
    border: "1px solid var(--border-strong)",
    background: "var(--bg-soft)",
    color: "var(--text)",
    fontWeight: 600,
    fontSize: "13.5px",
    cursor: "pointer",
  },

  // ---- summary card rows (portfolio / analytics) ----
  summaryRow: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "14px", marginBottom: "18px" },
  summaryCard: { background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "14px", padding: "18px" },
  summaryLabel: { fontSize: "12px", color: "var(--text-muted)", margin: "0 0 10px" },
  summaryValue: { fontSize: "22px", fontWeight: 700, margin: "0 0 6px" },
  summarySub: { fontSize: "12.5px", margin: 0, fontWeight: 600 },

  // ---- generic data table (portfolio holdings, sessions, etc.) ----
  tableCard: { background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "14px", padding: "8px 20px", marginBottom: "18px" },
  tableHeadRow: { display: "grid", gap: "12px", padding: "14px 6px", fontSize: "11.5px", color: "var(--text-faint)", letterSpacing: "0.4px", textTransform: "uppercase", borderBottom: "1px solid var(--border)" },
  tableRow: { display: "grid", gap: "12px", padding: "16px 6px", alignItems: "center", borderBottom: "1px solid var(--border-soft)" },
  tableCellStrong: { fontSize: "14px", fontWeight: 600, margin: 0 },
  tableCellMuted: { fontSize: "12px", color: "var(--text-faint)", margin: 0 },
  tableActionBtn: {
    padding: "6px 12px",
    borderRadius: "7px",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer",
    border: "1px solid",
  },

  // ---- forms (buy / sell / profile / settings) ----
  formCard: { background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "14px", padding: "22px" },
  formGroup: { marginBottom: "18px" },
  formLabel: { display: "block", fontSize: "13px", color: "#aab6c9", marginBottom: "6px" },
  formInput: {
    width: "100%",
    background: "var(--bg-soft)",
    border: "1px solid var(--border-strong)",
    borderRadius: "10px",
    padding: "12px 14px",
    color: "#f1f5f9",
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box",
  },
  formRow: { display: "flex", gap: "14px" },
  segmented: { display: "flex", gap: "4px", background: "var(--bg-soft)", borderRadius: "10px", padding: "4px", marginBottom: "18px" },
  segmentedTab: { flex: 1, border: "none", background: "transparent", color: "var(--text-muted)", fontSize: "13px", fontWeight: 600, padding: "9px", borderRadius: "8px", cursor: "pointer" },
  segmentedTabActive: { background: "rgba(148,163,184,0.16)", color: "#f1f5f9" },

  summaryStrip: { background: "var(--bg-soft)", border: "1px solid var(--border)", borderRadius: "10px", padding: "14px 16px", marginBottom: "18px" },
  summaryStripRow: { display: "flex", justifyContent: "space-between", fontSize: "13px", padding: "4px 0", color: "#aab6c9" },
  summaryStripTotal: { display: "flex", justifyContent: "space-between", fontSize: "14.5px", fontWeight: 700, paddingTop: "10px", marginTop: "6px", borderTop: "1px solid rgba(148,163,184,0.1)" },

  // ---- toggle switch (settings) ----
  toggleRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", borderBottom: "1px solid var(--border-soft)" },
  toggleLabel: { fontSize: "13.5px", fontWeight: 600, margin: "0 0 3px" },
  toggleDesc: { fontSize: "12px", color: "var(--text-muted)", margin: 0 },
  toggleTrack: { width: "42px", height: "24px", borderRadius: "999px", padding: "3px", cursor: "pointer", display: "flex", alignItems: "center", transition: "background 0.2s ease" },
  toggleThumb: { width: "18px", height: "18px", borderRadius: "50%", background: "#f1f5f9", transition: "transform 0.2s ease" },

  // ---- settings layout ----
  settingsLayout: { display: "grid", gridTemplateColumns: "220px 1fr", gap: "18px", alignItems: "start" },
  settingsNav: { background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "14px", padding: "10px" },
  settingsNavItem: {
    display: "block",
    width: "100%",
    textAlign: "left",
    padding: "11px 14px",
    borderRadius: "9px",
    border: "none",
    background: "transparent",
    color: "#aab6c9",
    fontSize: "13.5px",
    fontWeight: 600,
    cursor: "pointer",
    marginBottom: "2px",
  },
  settingsNavItemActive: { background: "rgba(52,224,209,0.1)", color: "#34e0d1" },

  // ---- profile ----
  profileHeroCard: { background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "14px", padding: "26px", display: "flex", gap: "20px", alignItems: "center", marginBottom: "18px", flexWrap: "wrap" },
  profileAvatarLg: {
    width: "76px",
    height: "76px",
    borderRadius: "50%",
    background: "linear-gradient(135deg,#233047,#182131)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "24px",
    fontWeight: 700,
    color: "#9fb4d6",
    flexShrink: 0,
  },
  tierBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    fontSize: "11.5px",
    fontWeight: 700,
    color: "#f5b942",
    border: "1px solid rgba(245,185,66,0.35)",
    borderRadius: "999px",
    padding: "4px 10px",
    marginLeft: "10px",
  },
  kycBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    fontSize: "11.5px",
    fontWeight: 700,
    color: "#33d69f",
    border: "1px solid rgba(51,214,159,0.35)",
    borderRadius: "999px",
    padding: "4px 10px",
  },
};

export const globalCSS = `
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500&display=swap');
* { box-sizing: border-box; }

:root, [data-theme="dark"] {
  --bg: #0a0f18;
  --bg-card: #0f1622;
  --bg-soft: rgba(255,255,255,0.03);
  --text: #e8edf5;
  --text-muted: #8b96a8;
  --text-faint: #6b7a91;
  --border: rgba(148,163,184,0.08);
  --border-soft: rgba(148,163,184,0.06);
  --border-strong: rgba(148,163,184,0.25);
}

[data-theme="light"] {
  --bg: #f2f4f8;
  --bg-card: #ffffff;
  --bg-soft: rgba(15,23,42,0.035);
  --text: #10182b;
  --text-muted: #5b6a80;
  --text-faint: #7c8aa0;
  --border: rgba(15,23,42,0.08);
  --border-soft: rgba(15,23,42,0.06);
  --border-strong: rgba(15,23,42,0.16);
}

@keyframes pl-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(1.5); }
}

@keyframes pl-spin { to { transform: rotate(360deg); } }
.pl-spin { animation: pl-spin 0.8s linear infinite; display: inline-block; }

@keyframes pl-toast-in {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}

select { color-scheme: dark; }
[data-theme="light"] select { color-scheme: light; }
input::placeholder { color: var(--text-faint); }
input:focus, select:focus { border-color: rgba(52,224,209,0.6) !important; outline: none; }

body { background: var(--bg); }

@media (max-width: 1100px) {
  .pl-hide-sidebar { display: none; }
}
@media (max-width: 900px) {
  .pl-right-panel { display: none; }
}
@media (max-width: 860px) {
  .pl-grid-collapse { grid-template-columns: 1fr !important; }
  .pl-nav-collapse { display: none !important; }
}
`;

// ---------------------------------------------------------------------
// Shared mock data -- Portfolio, Analytics, Buy and Sell all read from
// the same holdings/account so the numbers agree across pages. Swap
// these for real API responses (e.g. axios.get('/api/portfolio')) when
// you have a backend; keep the shape the same and every page keeps working.
// ---------------------------------------------------------------------

export const ACCOUNT = {
  name: "Mijan Rahaman",
  role: "Project Holder",
  email: "mijan.rahaman@stocky.io",
  phone: "+91 98765 43210",
  memberSince: "March 2023",
  tier: "Pro Trader",
  kyc: "Verified",
  cashBalance: 24580.32,
};

export const MOCK_HOLDINGS = [
  { ticker: "AAPL", name: "Apple Inc", qty: 24, avgCost: 178.4, price: 214.32 },
  { ticker: "MSFT", name: "Microsoft Corp", qty: 12, avgCost: 402.1, price: 452.1 },
  { ticker: "NVDA", name: "Nvidia Corp", qty: 40, avgCost: 96.2, price: 138.55 },
  { ticker: "AMZN", name: "Amazon.com", qty: 18, avgCost: 165.9, price: 198.77 },
  { ticker: "GOOGL", name: "Alphabet Inc", qty: 15, avgCost: 182.4, price: 176.2 },
  { ticker: "META", name: "Meta Platforms", qty: 8, avgCost: 468.3, price: 512.9 },
];

export const SYMBOL_POOL = [
  ...MOCK_HOLDINGS.map((h) => ({ ticker: h.ticker, name: h.name, price: h.price })),
  { ticker: "TSLA", name: "Tesla Inc", price: 244.6 },
  { ticker: "NFLX", name: "Netflix Inc", price: 682.15 },
  { ticker: "AMD", name: "Advanced Micro Devices", price: 168.9 },
  { ticker: "DIS", name: "Walt Disney Co", price: 112.4 },
];
