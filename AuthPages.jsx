import React, { useState } from "react";
import { api, setSession } from "./api";
import { Eye, EyeOff, BarChart3, Check, Loader2 } from "lucide-react";
import { useToast } from "./useToast";

/**
 * Stocky authentication pages: Login + Sign up.
 * Stack: React (hooks), HTML5, CSS3 (in-file), Axios (via ./api.js)
 *
 * Posts to POST /register and POST /login on the Express backend in
 * /backend. On success, stores the JWT + user via setSession() and
 * calls onAuthenticated(user) so App.jsx can switch into the app.
 */

const AUTH_ENDPOINTS = {
  login: "/login",
  signup: "/register",
};

const TICKER_TAGS = [
  { label: "+2.48%", top: "10%", left: "8%", accent: "cyan", delay: "0s", duration: "7s" },
  { label: "091.220", top: "22%", left: "82%", accent: "gold", delay: "0.6s", duration: "8s" },
  { label: "1.0821", top: "62%", left: "6%", accent: "gold", delay: "1.1s", duration: "6.5s" },
  { label: "-0.63%", top: "78%", left: "70%", accent: "cyan", delay: "0.3s", duration: "7.5s" },
  { label: "▲ 12.3", top: "40%", left: "44%", accent: "cyan", delay: "1.6s", duration: "9s" },
  { label: "AA-010", top: "88%", left: "30%", accent: "gold", delay: "0.9s", duration: "6s" },
];

const GHOST_LABELS = [
  { text: "AO-010", top: "6%", left: "62%", rotate: "-4deg" },
  { text: "1.AA", top: "16%", left: "30%", rotate: "3deg" },
  { text: "00.100", top: "34%", left: "12%", rotate: "-2deg" },
  { text: "10.110001", top: "52%", left: "70%", rotate: "2deg" },
  { text: "AAO.10111", top: "70%", left: "20%", rotate: "-3deg" },
  { text: "00.1101", top: "86%", left: "56%", rotate: "4deg" },
];

const CYAN_WAVE =
  "M0,170 C60,120 100,80 160,90 C220,100 240,180 300,200 C360,220 380,140 440,100 " +
  "C500,60 540,60 600,110 C660,160 680,230 740,220 C800,210 820,130 880,110 C920,97 940,150 960,170";

const GOLD_WAVE =
  "M0,140 C50,180 90,220 150,200 C210,180 250,120 310,90 C370,60 410,80 470,130 " +
  "C530,180 560,220 620,190 C680,160 700,100 760,90 C820,80 860,130 900,150 C930,165 945,150 960,140";

function MarketPanel() {
  return (
    <div style={styles.rightPanel} className="pl-right-panel">
      <div style={styles.dotGrid} />

      {/* decorative soft blobs for depth */}
      <div className="pl-blob pl-blob1" />
      <div className="pl-blob pl-blob2" />
      <div className="pl-blob pl-blob3" />

      {GHOST_LABELS.map((g, i) => (
        <span
          key={i}
          style={{
            ...styles.ghostLabel,
            top: g.top,
            left: g.left,
            transform: `rotate(${g.rotate})`,
          }}
        >
          {g.text}
        </span>
      ))}

      <div style={styles.waveTrack} className="pl-wave-track">
        {[0, 1].map((i) => (
          <svg
            key={i}
            viewBox="0 0 960 300"
            preserveAspectRatio="none"
            style={styles.waveSvg}
          >
            <path d={GOLD_WAVE} fill="none" stroke="#f5b942" strokeWidth="2" strokeOpacity="0.65" />
            <path d={CYAN_WAVE} fill="none" stroke="#34e0d1" strokeWidth="2.5" strokeOpacity="0.9" />
          </svg>
        ))}
      </div>

      {TICKER_TAGS.map((t, i) => (
        <div
          key={i}
          className="pl-chip"
          style={{
            ...styles.chip,
            top: t.top,
            left: t.left,
            borderColor: t.accent === "cyan" ? "rgba(52,224,209,0.45)" : "rgba(245,185,66,0.45)",
            color: t.accent === "cyan" ? "#7cf2e6" : "#f7cd7a",
            animationDelay: t.delay,
            animationDuration: t.duration,
          }}
        >
          {t.label}
        </div>
      ))}

      <div style={styles.panelCaption}>
        <p style={styles.panelCaptionTitle}>Trade the markets with real capital</p>
        <p style={styles.panelCaptionBody}>
          Pass an evaluation, get funded, and keep up to 90% of what you earn.
        </p>
      </div>
    </div>
  );
}

function Logo() {
  return (
    <div style={styles.logoRow}>
      <BarChart3 size={26} color="#34e0d1" strokeWidth={2.4} />
      <span style={styles.logoText}>
        Stock<span style={{ color: "#3fe0a5" }}>y</span>
      </span>
    </div>
  );
}

function TextField({ label, ...props }) {
  return (
    <div style={styles.fieldGroup}>
      <label style={styles.label}>{label}</label>
      <input {...props} style={styles.input} />
    </div>
  );
}

function PasswordField({ label, value, onChange, show, onToggle, placeholder }) {
  return (
    <div style={styles.fieldGroup}>
      <label style={styles.label}>{label}</label>
      <div style={{ position: "relative" }}>
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          style={{ ...styles.input, paddingRight: "42px" }}
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={show ? "Hide password" : "Show password"}
          style={styles.eyeButton}
        >
          {show ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
    </div>
  );
}

function SocialRow() {
  const providers = [
    { name: "Google", glyph: "G", color: "#ea4335" },
    { name: "Facebook", glyph: "f", color: "#1877f2" },
    { name: "LinkedIn", glyph: "in", color: "#0a66c2" },
  ];
  return (
    <div style={styles.socialRow}>
      {providers.map((p) => (
        <button key={p.name} type="button" style={styles.socialButton}>
          <span style={{ ...styles.socialGlyph, color: p.color }}>{p.glyph}</span>
          {p.name}
        </button>
      ))}
    </div>
  );
}

export default function AuthPages({ onAuthenticated }) {
  const toast = useToast();
  const [mode, setMode] = useState("signup"); // "signup" | "login"
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [notRobot, setNotRobot] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [status, setStatus] = useState({ loading: false, error: "", success: "" });

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const switchMode = (next) => {
    setMode(next);
    setStatus({ loading: false, error: "", success: "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ loading: true, error: "", success: "" });

    if (mode === "signup") {
      if (form.password !== form.confirmPassword) {
        const errMsg = "Passwords don't match.";
        toast.error(errMsg);
        setStatus({ loading: false, error: errMsg, success: "" });
        return;
      }
      if (!agreeTerms) {
        const errMsg = "Agree to the terms to continue.";
        toast.error(errMsg);
        setStatus({ loading: false, error: errMsg, success: "" });
        return;
      }
      if (!notRobot) {
        const errMsg = "Confirm you're not a robot.";
        toast.error(errMsg);
        setStatus({ loading: false, error: errMsg, success: "" });
        return;
      }
    }

    const payload =
      mode === "signup"
        ? {
            firstName: form.firstName,
            lastName: form.lastName,
            email: form.email,
            password: form.password,
          }
        : { email: form.email, password: form.password, rememberMe };

    try {
      const res = await api.post(AUTH_ENDPOINTS[mode], payload);
      setSession(res.data.token, res.data.user);
      const successMsg = mode === "signup" ? "Account created. Redirecting..." : "Signed in. Redirecting...";
      toast.success(successMsg);
      setStatus({
        loading: false,
        error: "",
        success: successMsg,
      });
      onAuthenticated && onAuthenticated(res.data.user);
    } catch (err) {
      const errMsg =
        err?.response?.data?.message ||
        "Couldn't reach the server. Make sure the backend in /backend is running on port 4000.";
      toast.error(errMsg);
      setStatus({
        loading: false,
        error: errMsg,
        success: "",
      });
    }
  };

  const isSignup = mode === "signup";

  return (
    <div style={styles.page}>
      <style>{CSS}</style>

      <div style={styles.leftPanel}>
        <div style={styles.leftInner}>
          <Logo />

          <h1 style={styles.heading}>{isSignup ? "Sign up for free" : "Welcome back"}</h1>
          <p style={styles.subheading}>
            {isSignup ? (
              <>
                Already have an account?{" "}
                <button type="button" onClick={() => switchMode("login")} style={styles.linkButton}>
                  Login
                </button>
              </>
            ) : (
              <>
                Don't have an account?{" "}
                <button type="button" onClick={() => switchMode("signup")} style={styles.linkButton}>
                  Sign up
                </button>
              </>
            )}
          </p>

          <form onSubmit={handleSubmit} noValidate>
            {isSignup && (
              <div style={styles.row}>
                <TextField
                  label="First Name"
                  placeholder="First Name"
                  value={form.firstName}
                  onChange={update("firstName")}
                  required
                />
                <TextField
                  label="Last Name"
                  placeholder="Last Name"
                  value={form.lastName}
                  onChange={update("lastName")}
                  required
                />
              </div>
            )}

            <TextField
              label="Email"
              type="email"
              placeholder="Email Address"
              value={form.email}
              onChange={update("email")}
              required
            />

            {isSignup ? (
              <div style={styles.row}>
                <PasswordField
                  label="Password"
                  placeholder="Password"
                  value={form.password}
                  onChange={update("password")}
                  show={showPassword}
                  onToggle={() => setShowPassword((s) => !s)}
                />
                <PasswordField
                  label="Confirm Password"
                  placeholder="Confirm Password"
                  value={form.confirmPassword}
                  onChange={update("confirmPassword")}
                  show={showConfirm}
                  onToggle={() => setShowConfirm((s) => !s)}
                />
              </div>
            ) : (
              <PasswordField
                label="Password"
                placeholder="Password"
                value={form.password}
                onChange={update("password")}
                show={showPassword}
                onToggle={() => setShowPassword((s) => !s)}
              />
            )}

            {isSignup ? (
              <>
                <label style={styles.checkboxRow}>
                  <span
                    role="checkbox"
                    aria-checked={notRobot}
                    tabIndex={0}
                    onClick={() => setNotRobot((v) => !v)}
                    onKeyDown={(e) => e.key === "Enter" && setNotRobot((v) => !v)}
                    style={{ ...styles.checkbox, ...(notRobot ? styles.checkboxChecked : {}) }}
                  >
                    {notRobot && <Check size={13} color="#04120f" strokeWidth={3} />}
                  </span>
                  I'm not a robot
                </label>

                <label style={styles.checkboxRow}>
                  <span
                    role="checkbox"
                    aria-checked={agreeTerms}
                    tabIndex={0}
                    onClick={() => setAgreeTerms((v) => !v)}
                    onKeyDown={(e) => e.key === "Enter" && setAgreeTerms((v) => !v)}
                    style={{ ...styles.checkbox, ...(agreeTerms ? styles.checkboxChecked : {}) }}
                  >
                    {agreeTerms && <Check size={13} color="#04120f" strokeWidth={3} />}
                  </span>
                  <span>
                    I agree with <a style={styles.inlineLink} href="#privacy">Privacy Policy</a>,{" "}
                    <a style={styles.inlineLink} href="#terms">Terms of Service</a>,{" "}
                    <a style={styles.inlineLink} href="#trade">Trade Policy</a>
                  </span>
                </label>
              </>
            ) : (
              <div style={styles.loginRowBetween}>
                <label style={styles.checkboxRow}>
                  <span
                    role="checkbox"
                    aria-checked={rememberMe}
                    tabIndex={0}
                    onClick={() => setRememberMe((v) => !v)}
                    onKeyDown={(e) => e.key === "Enter" && setRememberMe((v) => !v)}
                    style={{ ...styles.checkbox, ...(rememberMe ? styles.checkboxChecked : {}) }}
                  >
                    {rememberMe && <Check size={13} color="#04120f" strokeWidth={3} />}
                  </span>
                  Remember me
                </label>
                <a style={styles.inlineLink} href="#forgot">Forgot password?</a>
              </div>
            )}

            {status.error && <p style={styles.errorText}>{status.error}</p>}
            {status.success && <p style={styles.successText}>{status.success}</p>}

            <button type="submit" style={styles.submitButton} disabled={status.loading}>
              {status.loading ? (
                <Loader2 size={18} className="pl-spin" />
              ) : isSignup ? (
                "Create account"
              ) : (
                "Login"
              )}
            </button>
          </form>

          <div style={styles.dividerRow}>
            <span style={styles.dividerLine} />
            <span style={styles.dividerText}>Or {isSignup ? "Register" : "Continue"} With</span>
            <span style={styles.dividerLine} />
          </div>

          <SocialRow />
        </div>
      </div>

      <MarketPanel />
    </div>
  );
}

const styles = {
  page: {
    display: "flex",
    minHeight: "100vh",
    width: "100%",
    background: "#050b18",
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
    color: "#e8edf5",
  },
  leftPanel: {
    flex: "0 0 480px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 24px",
    overflowY: "auto",
  },
  leftInner: { width: "100%", maxWidth: "400px" },
  logoRow: { display: "flex", alignItems: "center", gap: "8px", marginBottom: "28px" },
  logoText: { fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: "20px", color: "#f1f5f9" },
  heading: { fontFamily: "'Sora', sans-serif", fontSize: "28px", fontWeight: 700, margin: "0 0 10px" },
  subheading: { fontSize: "14px", color: "#8b9bb4", margin: "0 0 28px" },
  linkButton: {
    background: "none",
    border: "none",
    color: "#34e0d1",
    fontSize: "14px",
    cursor: "pointer",
    padding: 0,
    fontWeight: 600,
  },
  row: { display: "flex", gap: "14px" },
  fieldGroup: { flex: 1, marginBottom: "18px" },
  label: { display: "block", fontSize: "13px", color: "#aab6c9", marginBottom: "6px" },
  input: {
    width: "100%",
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(148,163,184,0.25)",
    borderRadius: "10px",
    padding: "12px 14px",
    color: "#f1f5f9",
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box",
  },
  eyeButton: {
    position: "absolute",
    right: "12px",
    top: "50%",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    color: "#8b9bb4",
    cursor: "pointer",
    display: "flex",
  },
  checkboxRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: "10px",
    fontSize: "13.5px",
    color: "#c3cede",
    marginBottom: "14px",
    cursor: "pointer",
    lineHeight: 1.5,
  },
  checkbox: {
    flexShrink: 0,
    width: "18px",
    height: "18px",
    borderRadius: "4px",
    border: "1px solid rgba(148,163,184,0.4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginTop: "1px",
  },
  checkboxChecked: {
    background: "linear-gradient(90deg,#2fb8ff,#3fe0a5)",
    borderColor: "transparent",
  },
  inlineLink: { color: "#34e0d1", textDecoration: "none" },
  loginRowBetween: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "18px",
  },
  errorText: { color: "#f47c7c", fontSize: "13px", margin: "0 0 14px" },
  successText: { color: "#5de6b0", fontSize: "13px", margin: "0 0 14px" },
  submitButton: {
    width: "100%",
    padding: "13px",
    borderRadius: "10px",
    border: "none",
    background: "linear-gradient(90deg,#2fb8ff,#3fe0a5)",
    color: "#04121a",
    fontWeight: 700,
    fontSize: "15px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginTop: "4px",
  },
  dividerRow: { display: "flex", alignItems: "center", gap: "12px", margin: "26px 0 18px" },
  dividerLine: { flex: 1, height: "1px", background: "rgba(148,163,184,0.2)" },
  dividerText: { fontSize: "12px", color: "#8b9bb4", fontWeight: 600, whiteSpace: "nowrap" },
  socialRow: { display: "flex", gap: "10px" },
  socialButton: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "10px",
    borderRadius: "10px",
    border: "1px solid rgba(148,163,184,0.25)",
    background: "rgba(255,255,255,0.03)",
    color: "#e8edf5",
    fontSize: "13px",
    cursor: "pointer",
  },
  socialGlyph: { fontWeight: 800, fontSize: "14px" },

  rightPanel: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
    background: "radial-gradient(ellipse at 30% 20%, #0c2338 0%, #050b18 65%)",
    minHeight: "100vh",
  },
  dotGrid: {
    position: "absolute",
    inset: 0,
    backgroundImage: "radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)",
    backgroundSize: "26px 26px",
    opacity: 0.6,
  },
  ghostLabel: {
    position: "absolute",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "12px",
    color: "rgba(148,163,184,0.35)",
    letterSpacing: "1px",
  },
  waveTrack: { position: "absolute", top: "18%", left: 0, width: "200%", height: "60%", display: "flex" },
  waveSvg: { width: "960px", height: "100%", flexShrink: 0 },
  chip: {
    position: "absolute",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "12px",
    fontWeight: 600,
    padding: "5px 10px",
    borderRadius: "6px",
    border: "1px solid",
    background: "rgba(5,11,24,0.55)",
    backdropFilter: "blur(2px)",
  },
  panelCaption: { position: "absolute", left: "8%", bottom: "9%", maxWidth: "420px" },
  panelCaptionTitle: {
    fontFamily: "'Sora', sans-serif",
    fontSize: "22px",
    fontWeight: 700,
    margin: "0 0 8px",
    color: "#f1f5f9",
  },
  panelCaptionBody: { fontSize: "14px", color: "#aab6c9", margin: 0, lineHeight: 1.6 },
};

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500&display=swap');

.pl-wave-track { animation: pl-drift 22s linear infinite; }
@keyframes pl-drift {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}

.pl-chip { animation-name: pl-float; animation-timing-function: ease-in-out; animation-iteration-count: infinite; }
@keyframes pl-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-14px); }
}

.pl-chip {
  box-shadow: 0 6px 18px rgba(6,17,28,0.6), inset 0 -1px 0 rgba(255,255,255,0.02);
  border-radius: 8px;
  transition: transform 240ms ease, box-shadow 240ms ease;
}
.pl-chip:hover { transform: translateY(-8px) scale(1.03); box-shadow: 0 10px 26px rgba(6,17,28,0.7); }

.pl-wave-track path { stroke-linecap: round; filter: drop-shadow(0 6px 18px rgba(52,224,209,0.08)); }

/* soft moving blobs for depth */
.pl-blob { position: absolute; border-radius: 50%; filter: blur(30px) saturate(120%); opacity: 0.26; transform: translateZ(0); }
.pl-blob1 { width: 360px; height: 360px; left: 8%; top: 6%; background: radial-gradient(circle at 30% 30%, #34e0d1 0%, transparent 50%); animation: pl-blob-move 14s ease-in-out infinite; }
.pl-blob2 { width: 260px; height: 260px; right: 6%; top: 18%; background: radial-gradient(circle at 60% 40%, #f5b942 0%, transparent 50%); animation: pl-blob-move 18s ease-in-out infinite; }
.pl-blob3 { width: 420px; height: 420px; right: 18%; bottom: 6%; background: radial-gradient(circle at 70% 60%, #3b82f6 0%, transparent 48%); animation: pl-blob-move 22s ease-in-out infinite; opacity: 0.18; }
@keyframes pl-blob-move { 0% { transform: translateY(0) translateX(0); } 50% { transform: translateY(-18px) translateX(10px); } 100% { transform: translateY(0) translateX(0); } }

.pl-spin { animation: pl-spin 0.8s linear infinite; }
@keyframes pl-spin { to { transform: rotate(360deg); } }

input::placeholder { color: #5c6b83; }
input:focus { border-color: rgba(52,224,209,0.6) !important; }

@media (max-width: 900px) {
  .pl-right-panel { display: none; }
}
`;
