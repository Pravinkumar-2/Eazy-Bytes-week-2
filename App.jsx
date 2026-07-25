import React, { useEffect, useState, useCallback } from "react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Header, PAGES, theme as s, globalCSS } from "./shared";
import { api, getToken, getStoredUser } from "./api";
import { wsClient } from "./wsClient";
import { useToast } from "./useToast";
import AuthPages from "./AuthPages";
import DashboardPage from "./DashboardPage";
import LiveTrackingPage from "./LiveTrackingPage";
import StockDetailPage from "./StockDetailPage";
import PortfolioPage from "./PortfolioPage";
import AnalyticsPage from "./AnalyticsPage";
import BuyStockPage from "./BuyStockPage";
import SellStockPage from "./SellStockPage";
import ProfilePage from "./ProfilePage";
import SettingsPage from "./SettingsPage";
import WatchlistPage from "./WatchlistPage";
import PriceAlertsPage from "./PriceAlertsPage";
import TransactionHistoryPage from "./TransactionHistoryPage";

/**
 * App shell -- the full Stocky project from signup to every additional
 * feature:
 *
 *  - Auth gate: shows AuthPages until a token exists in localStorage
 *    (set by AuthPages after POST /register or POST /login).
 *  - One piece of routing state (`page`) swaps in whichever page is
 *    active. Every page is a fully separate component/file.
 *  - Dark/light mode: toggles a `data-theme` attribute on <html>; the
 *    CSS variables driving every color live in shared.jsx's globalCSS.
 *  - Header search: debounced GET /stocks?search= wired to the search
 *    box, selecting a result opens Stock Detail.
 *  - Live notifications: polls GET /alerts/check every 20s once
 *    logged in and surfaces anything that fires in the header bell --
 *    this is the "Live Notifications" feature, built on the Price
 *    Alerts backend rather than a separate websocket server.
 */

const THEME_KEY = "stocky_theme";
const NOTIF_POLL_MS = 20000;

export default function App() {
  const [authed, setAuthed] = useState(!!getToken());
  const [page, setPage] = useState(PAGES.DASHBOARD);
  const [returnPage, setReturnPage] = useState(PAGES.DASHBOARD);
  const [selectedStock, setSelectedStock] = useState(null);
  const [tradeTicker, setTradeTicker] = useState(null);

  const [darkMode, setDarkMode] = useState(() => (localStorage.getItem(THEME_KEY) || "dark") === "dark");
  const [searchResults, setSearchResults] = useState([]);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", darkMode ? "dark" : "light");
    localStorage.setItem(THEME_KEY, darkMode ? "dark" : "light");
  }, [darkMode]);

  // Initialize WebSocket connection for real-time price updates
  useEffect(() => {
    if (!authed) {
      // Disconnect when logging out
      wsClient.disconnect();
      return;
    }

    // Connect to WebSocket on auth
    wsClient.connect().catch((err) => {
      console.error("Failed to connect to WebSocket:", err);
    });

    // Cleanup on unmount
    return () => {
      wsClient.disconnect();
    };
  }, [authed]);

  // Live notifications: poll for newly-triggered price alerts.
  useEffect(() => {
    if (!authed) return;
    const poll = async () => {
      try {
        const res = await api.get("/alerts/check");
        if (res.data.length > 0) {
          const fresh = res.data.map((a) => ({
            id: a.id,
            message: `${a.symbol} ${a.direction === "above" ? "rose above" : "fell below"} $${Number(a.targetPrice).toFixed(2)} (now $${Number(a.price).toFixed(2)})`,
          }));
          setNotifications((prev) => [...fresh, ...prev].slice(0, 20));
        }
      } catch {
        // Silently skip -- backend may not be running yet.
      }
    };
    poll();
    const interval = setInterval(poll, NOTIF_POLL_MS);
    return () => clearInterval(interval);
  }, [authed]);

  const isSubPage = (p) => [PAGES.DETAIL, PAGES.BUY, PAGES.SELL].includes(p);

  const navigate = (nextPage) => setPage(nextPage);

  const openStock = (stock) => {
    setReturnPage(isSubPage(page) ? returnPage : page);
    setSelectedStock(stock);
    setPage(PAGES.DETAIL);
  };

  const openBuy = (ticker) => {
    setReturnPage(isSubPage(page) ? returnPage : page);
    setTradeTicker(ticker || null);
    setPage(PAGES.BUY);
  };

  const openSell = (ticker) => {
    setReturnPage(isSubPage(page) ? returnPage : page);
    setTradeTicker(ticker || null);
    setPage(PAGES.SELL);
  };

  const goBack = () => setPage(returnPage);

  const handleSearch = useCallback(async (query) => {
    if (!query) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await api.get("/stocks", { params: { search: query } });
      setSearchResults(res.data);
    } catch {
      setSearchResults([]);
    }
  }, []);

  const selectSearchResult = (stock) => {
    openStock({ name: stock.name, ticker: stock.symbol, price: stock.price });
  };

  const dismissNotification = (id) => setNotifications((prev) => prev.filter((n) => n.id !== id));

  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={3500}
        hideProgressBar={false}
        newestOnTop={true}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />
      {!authed ? (
        <AuthPages onAuthenticated={() => setAuthed(true)} />
      ) : (
        <div style={s.page}>
          <style>{globalCSS}</style>
          {(() => {
            const activeTab = isSubPage(page) || [PAGES.SETTINGS, PAGES.PROFILE, PAGES.WATCHLIST, PAGES.ALERTS, PAGES.HISTORY].includes(page) ? returnPage : page;
            return (
              <>
                <Header
                  page={activeTab}
                  onNavigate={navigate}
                  darkMode={darkMode}
                  onToggleTheme={() => setDarkMode((d) => !d)}
                  onSearch={handleSearch}
                  searchResults={searchResults}
                  onSelectSearchResult={selectSearchResult}
                  notifications={notifications}
                  onDismissNotification={dismissNotification}
                />

                <div className="pl-grid-collapse">
                  {page === PAGES.DASHBOARD && <DashboardPage onOpenStock={openStock} notifications={notifications} />}
                  {page === PAGES.LIVE && <LiveTrackingPage onOpenStock={openStock} />}
                  {page === PAGES.PORTFOLIO && <PortfolioPage onOpenStock={openStock} onNavigateBuy={openBuy} onNavigateSell={openSell} />}
                  {page === PAGES.ANALYTICS && <AnalyticsPage onOpenStock={openStock} />}
                  {page === PAGES.WATCHLIST && <WatchlistPage onOpenStock={openStock} />}
                  {page === PAGES.ALERTS && <PriceAlertsPage />}
                  {page === PAGES.HISTORY && <TransactionHistoryPage />}
                  {page === PAGES.PROFILE && <ProfilePage />}
                  {page === PAGES.SETTINGS && <SettingsPage />}

                  {page === PAGES.DETAIL && <StockDetailPage stock={selectedStock} onBack={goBack} onOpenStock={openStock} onNavigateBuy={openBuy} onNavigateSell={openSell} />}
                  {page === PAGES.BUY && <BuyStockPage prefillTicker={tradeTicker} onBack={goBack} onComplete={goBack} />}
                  {page === PAGES.SELL && <SellStockPage prefillTicker={tradeTicker} onBack={goBack} onComplete={goBack} />}
                </div>
              </>
            );
          })()}
        </div>
      )}
    </>
  );
}
