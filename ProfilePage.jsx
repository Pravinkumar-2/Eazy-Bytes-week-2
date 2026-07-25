import React, { useEffect, useState } from "react";
import { Pencil, Check, ShieldCheck, Award, Loader2, LogOut } from "lucide-react";
import { theme as s } from "./shared";
import { api, getStoredUser, clearSession } from "./api";

/**
 * Profile page -- name/email come from the logged-in session
 * (register/login response, persisted via setSession in api.js).
 * Trade stats (positions, win rate) are computed from the real
 * GET /portfolio + GET /history responses. Tier/KYC/phone are
 * decorative placeholders since the backend doesn't model them yet --
 * swap ACCOUNT_EXTRAS for a real GET /profile endpoint when you add one.
 */

const ACCOUNT_EXTRAS = {
  phone: "+91 xxx-xxx-xxxx",
  tier: "Pro Trader",
  kyc: "Verified",
  memberSince: "March 2026",
};

const RECENT_ACTIVITY_FALLBACK = [{ label: "No recent activity yet", time: "", tone: "neutral" }];

export default function ProfilePage() {
  const storedUser = getStoredUser() || { name: "Guest", email: "" };
  const [editing, setEditing] = useState(false);
  const [fields, setFields] = useState({ name: storedUser.name, email: storedUser.email, phone: ACCOUNT_EXTRAS.phone });
  const [status, setStatus] = useState({ loading: false, error: "", success: "" });
  const [stats, setStats] = useState({ positions: 0, winRate: 0, totalTrades: 0 });
  const [activity, setActivity] = useState(RECENT_ACTIVITY_FALLBACK);

  useEffect(() => {
    (async () => {
      try {
        const [portfolioRes, historyRes] = await Promise.all([api.get("/portfolio"), api.get("/history")]);
        const holdings = portfolioRes.data.holdings;
        const winners = holdings.filter((h) => h.plPct >= 0).length;
        setStats({
          positions: holdings.length,
          winRate: holdings.length ? (winners / holdings.length) * 100 : 0,
          totalTrades: historyRes.data.length,
        });
        if (historyRes.data.length > 0) {
          setActivity(
            historyRes.data.slice(0, 5).map((t) => ({
              label: `${t.type === "buy" ? "Bought" : "Sold"} ${t.qty} share${t.qty === 1 ? "" : "s"} of ${t.symbol}`,
              time: new Date(t.date).toLocaleDateString(),
              tone: t.type === "buy" ? "up" : "down",
            }))
          );
        }
      } catch {
        // Backend not running -- leave the fallback zero-state stats in place.
      }
    })();
  }, []);

  const save = () => {
    // No PUT /profile endpoint on the backend yet -- this just updates the
    // locally-stored session so the UI reflects the edit. Add a real
    // endpoint and swap this for an api.put('/profile', fields) call.
    setStatus({ loading: false, error: "", success: "Profile updated locally (add a PUT /profile endpoint to persist this)." });
    setEditing(false);
  };

  const logout = () => {
    clearSession();
    window.location.reload();
  };

  return (
    <div>
      <div style={s.pageHeadRow}>
        <div>
          <p style={s.pageTitle}>Profile</p>
          <p style={s.pageSubtitle}>Your account details and activity</p>
        </div>
        <button style={s.ghostButton} onClick={logout}>
          <LogOut size={15} /> Log out
        </button>
      </div>

      <div style={s.profileHeroCard}>
        <div style={s.profileAvatarLg}>{(fields.name || "?").slice(0, 2).toUpperCase()}</div>
        <div style={{ flex: 1, minWidth: "220px" }}>
          {!editing ? (
            <>
              <p style={{ fontSize: "19px", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", flexWrap: "wrap" }}>
                {fields.name}
                <span style={s.tierBadge}>
                  <Award size={12} /> {ACCOUNT_EXTRAS.tier}
                </span>
              </p>
              <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: "6px 0 2px" }}>{fields.email}</p>
              <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: "0 0 10px" }}>{fields.phone}</p>
              <span style={s.kycBadge}>
                <ShieldCheck size={12} /> {ACCOUNT_EXTRAS.kyc}
              </span>
              <span style={{ fontSize: "12px", color: "var(--text-faint)", marginLeft: "12px" }}>Member since {ACCOUNT_EXTRAS.memberSince}</span>
            </>
          ) : (
            <div style={{ display: "grid", gap: "10px", maxWidth: "360px" }}>
              <input style={s.formInput} value={fields.name} onChange={(e) => setFields((f) => ({ ...f, name: e.target.value }))} placeholder="Full name" />
              <input style={s.formInput} value={fields.email} onChange={(e) => setFields((f) => ({ ...f, email: e.target.value }))} placeholder="Email" />
              <input style={s.formInput} value={fields.phone} onChange={(e) => setFields((f) => ({ ...f, phone: e.target.value }))} placeholder="Phone" />
            </div>
          )}
        </div>

        {!editing ? (
          <button style={s.ghostButton} onClick={() => setEditing(true)}>
            <Pencil size={14} /> Edit profile
          </button>
        ) : (
          <button style={s.primaryButton} onClick={save} disabled={status.loading}>
            {status.loading ? <Loader2 size={15} className="pl-spin" /> : (
              <>
                <Check size={15} /> Save
              </>
            )}
          </button>
        )}
      </div>

      {status.success && <p style={{ color: "#33d69f", fontSize: "13px", marginBottom: "14px" }}>{status.success}</p>}
      {status.error && <p style={{ color: "#f2545b", fontSize: "13px", marginBottom: "14px" }}>{status.error}</p>}

      <div style={s.summaryRow}>
        <div style={s.summaryCard}>
          <p style={s.summaryLabel}>Total trades</p>
          <p style={s.summaryValue}>{stats.totalTrades}</p>
        </div>
        <div style={s.summaryCard}>
          <p style={s.summaryLabel}>Win rate</p>
          <p style={s.summaryValue}>{stats.winRate.toFixed(0)}%</p>
        </div>
        <div style={s.summaryCard}>
          <p style={s.summaryLabel}>Positions held</p>
          <p style={s.summaryValue}>{stats.positions}</p>
        </div>
        <div style={s.summaryCard}>
          <p style={s.summaryLabel}>Account tier</p>
          <p style={{ ...s.summaryValue, color: "#f5b942" }}>{ACCOUNT_EXTRAS.tier}</p>
        </div>
      </div>

      <div style={s.aboutCard}>
        <p style={s.aboutTitle}>Recent activity</p>
        {activity.map((a, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "11px 0", borderBottom: i < activity.length - 1 ? "1px solid var(--border-soft)" : "none" }}>
            <span style={{ fontSize: "13.5px", color: a.tone === "up" ? "#33d69f" : a.tone === "down" ? "#f2545b" : "var(--text)" }}>{a.label}</span>
            <span style={{ fontSize: "12px", color: "var(--text-faint)" }}>{a.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
