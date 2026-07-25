import React, { useState } from "react";
import { User, Bell, ShieldCheck, Sliders, Loader2, LogOut } from "lucide-react";
import { theme as s } from "./shared";
import { api, getStoredUser, clearSession } from "./api";

/**
 * Settings page -- a left mini-nav switches between sections, all in
 * one component so the router only needs one PAGES.SETTINGS entry.
 * "Save" actions post to /api/settings via axios, wrapped in try/catch
 * so the page works fully with no backend attached.
 */

const SECTIONS = [
  { key: "account", label: "Account", icon: User },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "security", label: "Security", icon: ShieldCheck },
  { key: "preferences", label: "Preferences", icon: Sliders },
];

function Toggle({ checked, onChange }) {
  return (
    <div
      role="switch"
      aria-checked={checked}
      tabIndex={0}
      onClick={() => onChange(!checked)}
      onKeyDown={(e) => e.key === "Enter" && onChange(!checked)}
      style={{ ...s.toggleTrack, background: checked ? "linear-gradient(90deg,#2fb8ff,#3fe0a5)" : "rgba(148,163,184,0.25)", justifyContent: checked ? "flex-end" : "flex-start" }}
    >
      <div style={s.toggleThumb} />
    </div>
  );
}

function AccountSection() {
  const storedUser = getStoredUser() || { name: "", email: "" };
  const [fields, setFields] = useState({ name: storedUser.name, email: storedUser.email, phone: "" });
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [status, setStatus] = useState({ loading: false, error: "", success: "" });

  const save = async () => {
    setStatus({ loading: true, error: "", success: "" });
    try {
      // No PUT /settings/account route on the backend yet -- add one and
      // this call will start persisting for real. For now it surfaces a
      // clear error instead of pretending to succeed.
      await api.put("/settings/account", fields);
      setStatus({ loading: false, error: "", success: "Account details saved." });
    } catch (err) {
      setStatus({ loading: false, success: "", error: err?.response?.data?.message || "No account-update endpoint yet -- add PUT /settings/account on the backend." });
    }
  };

  return (
    <div style={s.formCard}>
      <p style={s.aboutTitle}>Account details</p>
      <div style={s.formRow}>
        <div style={{ ...s.formGroup, flex: 1 }}>
          <label style={s.formLabel}>Full name</label>
          <input style={s.formInput} value={fields.name} onChange={(e) => setFields((f) => ({ ...f, name: e.target.value }))} />
        </div>
        <div style={{ ...s.formGroup, flex: 1 }}>
          <label style={s.formLabel}>Email</label>
          <input style={s.formInput} value={fields.email} onChange={(e) => setFields((f) => ({ ...f, email: e.target.value }))} />
        </div>
      </div>
      <div style={{ ...s.formGroup, maxWidth: "260px" }}>
        <label style={s.formLabel}>Phone</label>
        <input style={s.formInput} value={fields.phone} onChange={(e) => setFields((f) => ({ ...f, phone: e.target.value }))} />
      </div>

      <p style={{ ...s.aboutTitle, marginTop: "10px" }}>Change password</p>
      <div style={s.formRow}>
        <div style={{ ...s.formGroup, flex: 1 }}>
          <label style={s.formLabel}>Current password</label>
          <input type="password" style={s.formInput} value={pw.current} onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))} />
        </div>
        <div style={{ ...s.formGroup, flex: 1 }}>
          <label style={s.formLabel}>New password</label>
          <input type="password" style={s.formInput} value={pw.next} onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))} />
        </div>
      </div>

      {status.success && <p style={{ color: "#33d69f", fontSize: "13px", marginBottom: "12px" }}>{status.success}</p>}
      {status.error && <p style={{ color: "#f2545b", fontSize: "13px", marginBottom: "12px" }}>{status.error}</p>}

      <div style={{ display: "flex", gap: "10px" }}>
        <button style={s.primaryButton} onClick={save} disabled={status.loading}>
          {status.loading ? <Loader2 size={15} className="pl-spin" /> : "Save changes"}
        </button>
        <button
          style={{ ...s.ghostButton, color: "#f2545b", borderColor: "rgba(242,84,91,0.35)" }}
          onClick={() => {
            clearSession();
            window.location.reload();
          }}
        >
          <LogOut size={14} /> Log out
        </button>
      </div>
    </div>
  );
}

function NotificationsSection() {
  const [prefs, setPrefs] = useState({ priceAlerts: true, orderFills: true, news: false, marketing: false });
  const items = [
    { key: "priceAlerts", label: "Price alerts", desc: "Get notified when a watchlist symbol hits your target price" },
    { key: "orderFills", label: "Order confirmations", desc: "Notify when a buy or sell order fills" },
    { key: "news", label: "Market news", desc: "Daily digest of news for symbols you follow" },
    { key: "marketing", label: "Product updates", desc: "Occasional emails about new Stocky features" },
  ];
  return (
    <div style={s.formCard}>
      <p style={s.aboutTitle}>Notifications</p>
      {items.map((item) => (
        <div key={item.key} style={s.toggleRow}>
          <div>
            <p style={s.toggleLabel}>{item.label}</p>
            <p style={s.toggleDesc}>{item.desc}</p>
          </div>
          <Toggle checked={prefs[item.key]} onChange={(v) => setPrefs((p) => ({ ...p, [item.key]: v }))} />
        </div>
      ))}
    </div>
  );
}

function SecuritySection() {
  const [twoFA, setTwoFA] = useState(true);
  const sessions = [
    { device: "Chrome on macOS", location: "Mumbai, IN", current: true },
    { device: "Stocky iOS app", location: "Mumbai, IN", current: false },
    { device: "Firefox on Windows", location: "Pune, IN", current: false },
  ];
  return (
    <div style={s.formCard}>
      <p style={s.aboutTitle}>Security</p>
      <div style={s.toggleRow}>
        <div>
          <p style={s.toggleLabel}>Two-factor authentication</p>
          <p style={s.toggleDesc}>Require a one-time code in addition to your password</p>
        </div>
        <Toggle checked={twoFA} onChange={setTwoFA} />
      </div>

      <p style={{ ...s.aboutTitle, marginTop: "22px" }}>Active sessions</p>
      {sessions.map((sess, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: i < sessions.length - 1 ? "1px solid rgba(148,163,184,0.06)" : "none" }}>
          <div>
            <p style={{ fontSize: "13.5px", fontWeight: 600, margin: "0 0 2px" }}>
              {sess.device} {sess.current && <span style={{ color: "#33d69f", fontSize: "11.5px", fontWeight: 700 }}> · This device</span>}
            </p>
            <p style={{ fontSize: "12px", color: "var(--text-faint)", margin: 0 }}>{sess.location}</p>
          </div>
          {!sess.current && (
            <button style={{ ...s.tableActionBtn, color: "#f2545b", borderColor: "rgba(242,84,91,0.4)", background: "rgba(242,84,91,0.08)", display: "flex", alignItems: "center", gap: "5px" }}>
              <LogOut size={12} /> Log out
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function PreferencesSection() {
  const [currency, setCurrency] = useState("USD");
  const [defaultOrder, setDefaultOrder] = useState("market");
  const [darkMode, setDarkMode] = useState(true);

  return (
    <div style={s.formCard}>
      <p style={s.aboutTitle}>Preferences</p>
      <div style={s.toggleRow}>
        <div>
          <p style={s.toggleLabel}>Dark theme</p>
          <p style={s.toggleDesc}>Stocky is designed dark-first; light mode is experimental</p>
        </div>
        <Toggle checked={darkMode} onChange={setDarkMode} />
      </div>

      <div style={{ ...s.formRow, marginTop: "16px" }}>
        <div style={{ ...s.formGroup, flex: 1 }}>
          <label style={s.formLabel}>Display currency</label>
          <select style={s.formInput} value={currency} onChange={(e) => setCurrency(e.target.value)}>
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
            <option value="INR">INR (₹)</option>
            <option value="GBP">GBP (£)</option>
          </select>
        </div>
        <div style={{ ...s.formGroup, flex: 1 }}>
          <label style={s.formLabel}>Default order type</label>
          <select style={s.formInput} value={defaultOrder} onChange={(e) => setDefaultOrder(e.target.value)}>
            <option value="market">Market</option>
            <option value="limit">Limit</option>
          </select>
        </div>
      </div>

      <div style={{ marginTop: "18px", padding: "16px", border: "1px solid rgba(242,84,91,0.25)", borderRadius: "10px", background: "rgba(242,84,91,0.05)" }}>
        <p style={{ fontSize: "13.5px", fontWeight: 700, color: "#f2545b", margin: "0 0 4px" }}>Danger zone</p>
        <p style={{ fontSize: "12.5px", color: "#c98d90", margin: "0 0 12px" }}>Deactivating your account closes all open positions and disables login.</p>
        <button style={{ ...s.tableActionBtn, color: "#f2545b", borderColor: "rgba(242,84,91,0.4)", background: "transparent", padding: "9px 16px" }}>
          Deactivate account
        </button>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [active, setActive] = useState("account");

  return (
    <div>
      <div style={s.pageHeadRow}>
        <div>
          <p style={s.pageTitle}>Settings</p>
          <p style={s.pageSubtitle}>Manage your account, notifications, and security</p>
        </div>
      </div>

      <div style={s.settingsLayout}>
        <div style={s.settingsNav}>
          {SECTIONS.map((sec) => {
            const Icon = sec.icon;
            return (
              <button
                key={sec.key}
                style={{ ...s.settingsNavItem, ...(active === sec.key ? s.settingsNavItemActive : {}), display: "flex", alignItems: "center", gap: "9px" }}
                onClick={() => setActive(sec.key)}
              >
                <Icon size={15} /> {sec.label}
              </button>
            );
          })}
        </div>

        <div>
          {active === "account" && <AccountSection />}
          {active === "notifications" && <NotificationsSection />}
          {active === "security" && <SecuritySection />}
          {active === "preferences" && <PreferencesSection />}
        </div>
      </div>
    </div>
  );
}
