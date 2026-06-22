import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../../api/api";
import { useAuth } from "../../context/AuthContext";
import { useLang } from "../../context/LangContext";
import { useVoiceInput, LANG_MAP } from "../../utils/useVoiceInput";
import { playTTS } from "../../utils/voiceParser";

export default function Login() {
  const { login } = useAuth();
  const { t, lang } = useLang();
  const navigate = useNavigate();
  const { listening, activeField, interim, startListening } = useVoiceInput(lang);
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [savedAccounts, setSavedAccounts] = useState(() => {
    try { return JSON.parse(localStorage.getItem("rs_saved_accounts")) || []; } catch { return []; }
  });

  const saveAccountToLocal = (user, password) => {
    const accs = savedAccounts.filter(a => a.email !== user.email);
    accs.unshift({ email: user.email, password, name: user.name, role: user.role, avatar: user.avatar || user.profilePic });
    const limited = accs.slice(0, 4); // Keep last 4
    setSavedAccounts(limited);
    localStorage.setItem("rs_saved_accounts", JSON.stringify(limited));
  };

  const removeAccount = (email, e) => {
    e.stopPropagation();
    const accs = savedAccounts.filter(a => a.email !== email);
    setSavedAccounts(accs);
    localStorage.setItem("rs_saved_accounts", JSON.stringify(accs));
  };

  const fastLogin = async (acc) => {
    setError("");
    setLoading(true);
    try {
      const res = await API.post("/auth/login", { email: acc.email, password: acc.password });
      saveAccountToLocal(res.data.user, acc.password);
      login(res.data.user, res.data.token);
      const role = res.data.user.role;
      if (role === "farmer") navigate("/farmer");
      else if (role === "agent") navigate("/agent");
      else if (role === "admin") navigate("/admin");
      else navigate("/marketplace");
    } catch (err) {
      setError(err.response?.data?.error || "Login failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const readAloud = (label, value) => {
    const text = value ? `${label}. ${t("currentValueIs") || "is currently set to"} ${value}` : `${t("pleaseEnter")} ${label}`;
    playTTS(text, lang);
  };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleVoice = (field) => {
    startListening((val) => {
      if (typeof val === "function") {
        setForm((f) => {
          let newVal = val(f[field]);
          newVal = newVal.replace(/\s+/g, '').toLowerCase().replace(/at/g, '@').replace(/dot/g, '.');
          return { ...f, [field]: newVal };
        });
      } else {
        let newVal = val;
        newVal = newVal.replace(/\s+/g, '').toLowerCase().replace(/at/g, '@').replace(/dot/g, '.');
        setForm((f) => ({ ...f, [field]: newVal }));
      }
    }, { fieldId: field, lang: "en" });
  };

  const startGuidedAssistant = () => {
    const text1 = t("email") + ". " + (t("sayEmail") || "Please say your email address now.");
    playTTS(text1, lang).then(() => {
      handleVoice("email");
      setTimeout(() => {
        const text2 = t("password") + ". " + (t("sayPassword") || "Please say your password.");
        playTTS(text2, lang).then(() => {
          handleVoice("password");
        });
      }, 8000);
    });
  };

  const handleLogin = async () => {
    setError("");
    if (!form.email || !form.password) { setError("Please fill all fields."); return; }
    setLoading(true);
    try {
      const res = await API.post("/auth/login", form);
      saveAccountToLocal(res.data.user, form.password);
      login(res.data.user, res.data.token);
      // Redirect by role
      const role = res.data.user.role;
      if (role === "farmer") navigate("/farmer");
      else if (role === "agent") navigate("/agent");
      else if (role === "admin") navigate("/admin");
      else navigate("/marketplace");
    } catch (err) {
      setError(err.response?.data?.error || "Login failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
      <div style={{ width: "100%", maxWidth: "440px" }}>
        {/* Logo */}
        <div className="text-center mb-4">
          <span style={{ fontSize: "4rem", display: "block", animation: "floatUp 3s ease infinite" }}>🌾</span>
          <h1 className="page-title" style={{ fontSize: "2rem" }}>{t("appName")}</h1>
          <p style={{ color: "var(--text-mid)", fontSize: "0.9rem", marginTop: "0.4rem" }}>{t("tagline")}</p>
        </div>

        <div className="glass-card">
          <h2 style={{ color: "var(--text-dark)", fontSize: "1.4rem", fontWeight: 700, marginBottom: "1.5rem" }}>
            {t("login")} 👋
          </h2>

          {error && <div className="alert alert-error mb-2">⚠️ {error}</div>}

          {savedAccounts.length > 0 && (
            <div style={{ marginBottom: "1.5rem" }}>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>Saved Profiles</p>
              <div style={{ display: "flex", gap: "0.5rem", overflowX: "auto", paddingBottom: "0.5rem" }}>
                {savedAccounts.map((acc, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => fastLogin(acc)}
                    style={{ 
                      minWidth: "100px", padding: "0.5rem", borderRadius: "12px", border: "1px solid #e2e8f0", 
                      background: "white", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", position: "relative",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.05)"
                    }}
                  >
                    <button 
                      onClick={(e) => removeAccount(acc.email, e)}
                      style={{ position: "absolute", top: -5, right: -5, background: "#ef4444", color: "white", border: "none", borderRadius: "50%", width: "20px", height: "20px", fontSize: "0.7rem", cursor: "pointer" }}
                    >×</button>
                    <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "var(--green-pale)", color: "var(--green-deep)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", fontWeight: "bold", marginBottom: "0.3rem", backgroundImage: acc.avatar ? `url(${acc.avatar})` : "none", backgroundSize: "cover" }}>
                      {!acc.avatar && (acc.name ? acc.name.charAt(0).toUpperCase() : "U")}
                    </div>
                    <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-dark)", textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", width: "100%" }}>{acc.name || "User"}</span>
                    <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>{acc.role}</span>
                  </div>
                ))}
              </div>
              <div className="section-divider mt-2 mb-3">
                <hr /><span>or login manually</span><hr />
              </div>
            </div>
          )}

          <button type="button" className="btn-success" onClick={startGuidedAssistant} style={{width:"100%", marginBottom:"1rem"}}>🎙️ Start Guided Assistant</button>

          {/* Email */}
          <div className="form-group">
            <label className="field-label" style={{ display: "flex", justifyContent: "space-between" }}>
              <span>{t("email")}</span>
              <button type="button" className="btn-icon" onClick={() => readAloud("Email", form.email)} style={{ padding: 0 }}>🔊</button>
            </label>
            <div className="input-wrapper">
              <input
                className="rs-input"
                type="email"
                placeholder="you@example.com"
                value={listening && activeField === "email" && interim ? `${form.email} ${interim}...` : form.email}
                onChange={set("email")}
                autoComplete="email"
                style={listening && activeField === "email" && interim ? { color: "rgba(183,228,199,0.7)", fontStyle: "italic" } : {}}
              />
              <button
                type="button"
                className={`mic-btn ${listening && activeField === "email" ? "active" : ""}`}
                onClick={() => handleVoice("email")}
                title="Speak email"
              >🎤</button>
            </div>
          </div>

          {/* Password */}
          <div className="form-group">
            <label className="field-label" style={{ display: "flex", justifyContent: "space-between" }}>
              <span>{t("password")}</span>
            </label>
            <div className="input-wrapper">
              <input
                className="rs-input"
                type={showPass ? "text" : "password"}
                placeholder="••••••••"
                value={form.password}
                onChange={set("password")}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="mic-btn"
                onClick={() => setShowPass((s) => !s)}
                title="Toggle password"
              >{showPass ? "🙈" : "👁️"}</button>
            </div>
          </div>

          <button className="btn-primary mt-2" onClick={handleLogin} disabled={loading}>
            {loading ? <><span className="loader" style={{ width: 18, height: 18, borderWidth: 2 }}></span> {t("loading")}</> : `🚀 ${t("login")}`}
          </button>

          <div className="section-divider mt-3">
            <hr /><span>or</span><hr />
          </div>

          <p className="text-center mt-2" style={{ fontSize: "0.88rem", color: "var(--text-muted)" }}>
            New to Rythu Sethu?{" "}
            <Link to="/register" style={{ color: "var(--green-deep)", fontWeight: 600, textDecoration: "none" }}>
              {t("register")} →
            </Link>
          </p>
        </div>

        {/* Demo credentials hint */}
        <div className="glass-card mt-3" style={{ padding: "1rem", opacity: 0.8 }}>
          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", textAlign: "center" }}>
            🧪 Test: farmer@test.com / customer@test.com / agent@test.com (pass: <code style={{ color: "var(--green-deep)", fontWeight: "bold" }}>test123</code>)
          </p>
        </div>
      </div>
    </div>
  );
}