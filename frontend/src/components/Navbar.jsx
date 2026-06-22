import { BASE_URL } from '../api/api';
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../context/LangContext";
import { useLayout } from "../context/LayoutContext";
import { useCart } from "../context/CartContext";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Home, ShoppingBag, Leaf, Truck, Shield, LogOut, User, Bell, Headphones, Volume2, VolumeX, ShoppingCart } from "lucide-react";
import API from "../api/api";
import { io } from "socket.io-client";
import { createPortal } from "react-dom";

import CartSidebar from "./CartSidebar";
import MarketAnnouncer from "./MarketAnnouncer";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { lang, changeLang, t } = useLang();
  const { layoutMode, setLayoutMode } = useLayout();
  const { getCartCount, setIsCartOpen } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [isAnnouncerActive, setIsAnnouncerActive] = useState(false);
  const [birdsPlaying, setBirdsPlaying] = useState(false);
  
  const [fluteBgm, setFluteBgm] = useState(localStorage.getItem("rs_flute_bgm") !== "false");
  const [natureBgm, setNatureBgm] = useState(localStorage.getItem("rs_nature_bgm") !== "false");

  useEffect(() => {
    localStorage.setItem("rs_flute_bgm", fluteBgm);
  }, [fluteBgm]);

  useEffect(() => {
    localStorage.setItem("rs_nature_bgm", natureBgm);
  }, [natureBgm]);
  
  // Settings States
  const [showSettings, setShowSettings] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [upiId, setUpiId] = useState("");
  const [bankAcc, setBankAcc] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState("");
  const [settingsTab, setSettingsTab] = useState("profile");
  
  const notifRef = useRef(null);

  useEffect(() => {
    // Check initial state of the audio elements
    const fluteAudio = document.getElementById("ambient-flute-audio");
    if (fluteAudio) {
      setFluteBgm(!fluteAudio.paused);
      fluteAudio.addEventListener("play", () => setFluteBgm(true));
      fluteAudio.addEventListener("pause", () => setFluteBgm(false));
    }
    const natureAudio = document.getElementById("ambient-nature-audio");
    if (natureAudio) {
      setNatureBgm(!natureAudio.paused);
      natureAudio.addEventListener("play", () => setNatureBgm(true));
      natureAudio.addEventListener("pause", () => setNatureBgm(false));
    }
  }, []);

  // Sync announcer icon with Marketplace audio state
  useEffect(() => {
    const syncHandler = (e) => setIsAnnouncerActive(e.detail.isActive);
    window.addEventListener("market_audio_state", syncHandler);
    return () => window.removeEventListener("market_audio_state", syncHandler);
  }, []);


  useEffect(() => {
    if (showSettings && user) {
      API.get("/auth/profile").then(res => {
        setName(res.data.user.name || "");
        setPhone(res.data.user.phone || "");
        setUpiId(res.data.user.upiId || "");
        setBankAcc(res.data.user.bankAccountNumber || "");
      }).catch(console.error);
    }
  }, [showSettings, user]);

  const handleSaveSettings = async () => {
    try {
      setSavingSettings(true);
      setSettingsMsg("");
      await API.put("/auth/profile", { name, phone, upiId, bankAccountNumber: bankAcc });
      setSettingsMsg("✅ Settings saved successfully!");
      setTimeout(() => setShowSettings(false), 2000);
    } catch (e) {
      setSettingsMsg("❌ Failed to save settings.");
    } finally {
      setSavingSettings(false);
    }
  };

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const socket = io(BASE_URL);
      socket.on("notification", (data) => {
        if (data.userId === user._id) fetchNotifications();
      });
      return () => socket.disconnect();
    }
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await API.get(`/notifications/${user._id}`);
      setNotifications(res.data);
    } catch (e) { console.error("Failed to fetch notifications"); }
  };

  const markAsRead = async (id) => {
    try {
      await API.put(`/notifications/${id}/read`);
      fetchNotifications();
    } catch {}
  };

  const clearAllNotifications = async () => {
    try {
      await API.delete(`/notifications/${user._id}/clear`);
      setNotifications([]);
    } catch {}
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const active = (path) => location.pathname === path ? "navbar-link active" : "navbar-link";

  return (
    <nav className={`navbar ${scrolled ? "scrolled" : ""}`}>
      <Link to="/" className="navbar-brand">
        <motion.img whileHover={{ scale: 1.05 }} src="/logo.png?v=2" alt="Rythu Sethu Logo" style={{ height: "42px", width: "auto", borderRadius: "12px" }} />
        <div>
          <span className="navbar-title" translate="no">{t("appName")}</span>
          <span className="navbar-subtitle">{t("tagline")}</span>
        </div>
      </Link>

      <ul className="navbar-links">
        <li><Link to="/" className={active("/")}><Home size={18} /> {t("home")}</Link></li>
        <li><Link to="/marketplace" className={active("/marketplace")}><ShoppingBag size={18} /> {t("marketplace")}</Link></li>
        {user?.role === "farmer" && (
          <li><Link to="/farmer" className={active("/farmer")}><Leaf size={18} /> {t("dashboard")}</Link></li>
        )}
        {user?.role === "agent" && (
          <li><Link to="/agent" className={active("/agent")}><Truck size={18} /> {t("deliveries")}</Link></li>
        )}
        {user?.role === "admin" && (
          <li><Link to="/admin" className={active("/admin")}><Shield size={18} /> {t("adminPanel")}</Link></li>
        )}
        {user && (
          <li><Link to="/support" className={active("/support")}><Headphones size={18} /> Support</Link></li>
        )}
        {location.pathname === "/marketplace" && (
          <li>
            <button 
              className="btn-icon" 
              onClick={() => window.dispatchEvent(new CustomEvent("market_announcer_toggle"))} 
              title={isAnnouncerActive ? "Mute Market Sounds" : "Play Immersive Market Sounds"}
              style={{ 
                color: isAnnouncerActive ? "var(--green-mid)" : "var(--text-muted)",
                background: isAnnouncerActive ? "rgba(34,197,94,0.1)" : undefined,
                position: "relative"
              }}
            >
              {isAnnouncerActive ? <Volume2 size={20} /> : <Volume2 size={20} style={{ opacity: 0.4 }} />}
              {isAnnouncerActive && (
                <span style={{ position: "absolute", top: -3, right: -3, width: 8, height: 8, borderRadius: "50%", background: "#22c55e", border: "2px solid white", animation: "pulse 1.5s infinite" }} />
              )}
            </button>
          </li>
        )}
        <li>
          <button 
            className="btn-icon" 
            onClick={() => window.dispatchEvent(new Event("toggle_nature_audio"))} 
            title={natureBgm ? "Pause Nature Sounds" : "Play Nature Sounds"}
            style={{ 
              color: natureBgm ? "var(--green-mid)" : "var(--text-muted)",
              background: natureBgm ? "rgba(34,197,94,0.1)" : undefined,
              position: "relative"
            }}
          >
            {natureBgm ? <Volume2 size={20} /> : <VolumeX size={20} style={{ opacity: 0.4 }} />}
            <span style={{ fontSize: "10px", position: "absolute", bottom: -8, right: 0 }}>🌿</span>
          </button>
        </li>
        <li>
          <button 
            className="btn-icon" 
            onClick={() => window.dispatchEvent(new Event("toggle_flute_audio"))} 
            title={fluteBgm ? "Pause Flute BGM" : "Play Flute BGM"}
            style={{ 
              color: fluteBgm ? "var(--green-mid)" : "var(--text-muted)",
              background: fluteBgm ? "rgba(34,197,94,0.1)" : undefined,
              position: "relative"
            }}
          >
            {fluteBgm ? <Volume2 size={20} /> : <VolumeX size={20} style={{ opacity: 0.4 }} />}
            <span style={{ fontSize: "10px", position: "absolute", bottom: -8, right: 0 }}>🪈</span>
          </button>
        </li>
        <li>
          <select className="lang-select" value={lang} onChange={(e) => changeLang(e.target.value)}>
            <option value="en">🇬🇧 EN</option>
            <option value="hi">🇮🇳 Hindi (हि)</option>
            <option value="te">🇮🇳 Telugu (తె)</option>
            <option value="ta">🇮🇳 Tamil (தமி)</option>
            <option value="kn">🇮🇳 Kannada (ಕನ್)</option>
          </select>
        </li>
        {user ? (
          <>
            {user.role === "agent" && user.experiencePoints > 0 && (
              <li>
                <span className="rewards-badge" style={{ padding: "0.3rem 0.8rem", fontSize: "0.8rem" }}>⭐ {user.experiencePoints} XP</span>
              </li>
            )}
            {user.role !== "agent" && user.rewardPoints > 0 && (
              <li>
                <span className="rewards-badge" style={{ padding: "0.3rem 0.8rem", fontSize: "0.8rem" }}>🏆 {user.rewardPoints} Pts</span>
              </li>
            )}
            <li style={{ color: "var(--text-dark)", fontSize: "0.95rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <div style={{ background: "var(--green-pale)", padding: "6px", borderRadius: "50%", color: "var(--green-deep)" }}><User size={16} /></div>
              {user.name ? user.name.split(" ")[0] : "User"}
            </li>
            <li ref={notifRef} style={{ position: "relative" }}>
              <button 
                className="btn-icon" 
                style={{ position: "relative", background: showNotifs ? "var(--green-pale)" : "transparent" }}
                onClick={() => setShowNotifs(!showNotifs)}
              >
                <Bell size={20} color="var(--text-dark)" />
                {notifications.filter(n => !n.isRead).length > 0 && (
                  <span style={{ position: "absolute", top: 0, right: 0, background: "#ef4444", color: "white", borderRadius: "50%", width: 18, height: 18, fontSize: "0.65rem", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", border: "2px solid white" }}>
                    {notifications.filter(n => !n.isRead).length}
                  </span>
                )}
              </button>
              
              <AnimatePresence>
                {showNotifs && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="notif-dropdown"
                  >
                    <div className="notif-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <h4 style={{ fontSize: "1rem", margin: 0 }}>{t("notifications")}</h4>
                        <span style={{ fontSize: "0.75rem", color: "var(--green-mid)" }}>{notifications.filter(n => !n.isRead).length} {t("unread")}</span>
                      </div>
                      {notifications.length > 0 && (
                        <button 
                          onClick={clearAllNotifications}
                          style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: "0.8rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.3rem" }}
                        >
                          🧹 Clear All
                        </button>
                      )}
                    </div>
                    <div className="notif-body" style={{ background: "#efeae2", padding: "1rem" }}>
                      {notifications.length === 0 ? (
                        <p style={{ textAlign: "center", color: "var(--text-muted)", padding: "1rem 0" }}>{t("noNotifications")}</p>
                      ) : (
                        notifications.map(n => (
                          <div 
                            key={n._id} 
                            style={{
                              display: "flex",
                              justifyContent: "flex-start",
                              marginBottom: "0.75rem"
                            }}
                            onClick={() => { if (!n.isRead) markAsRead(n._id); }}
                          >
                            <div style={{
                              background: !n.isRead ? "#dcf8c6" : "white",
                              padding: "0.75rem 1rem",
                              borderRadius: "12px",
                              borderTopLeftRadius: "0",
                              boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                              maxWidth: "90%",
                              position: "relative",
                              cursor: "pointer",
                              border: !n.isRead ? "1px solid #c7e8b5" : "1px solid #e2e8f0"
                            }}>
                              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.25rem" }}>
                                <span style={{ fontSize: "1rem" }}>{n.type === "order" ? "📦" : n.type === "delivery" ? "🚚" : n.type === "payment" ? "💰" : "🔔"}</span>
                                <span style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--text-dark)" }}>{n.title}</span>
                              </div>
                              <div style={{ fontSize: "0.85rem", color: "var(--text-mid)", lineHeight: 1.4 }}>
                                {n.message}
                              </div>
                              <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "0.3rem", marginTop: "0.25rem" }}>
                                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                                  {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {n.isRead && <span style={{ color: "#53bdeb", fontSize: "0.8rem" }}>✓✓</span>}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
            
            {/* Cart Button */}
            <li style={{ position: "relative" }}>
              <button 
                className="btn-icon" 
                onClick={() => setIsCartOpen(true)}
              >
                <ShoppingCart size={20} color="var(--text-dark)" />
                {getCartCount() > 0 && (
                  <span style={{ position: "absolute", top: 0, right: 0, background: "#eab308", color: "black", borderRadius: "50%", width: 18, height: 18, fontSize: "0.65rem", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", border: "2px solid white" }}>
                    {getCartCount()}
                  </span>
                )}
              </button>
            </li>

            <li>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="btn-secondary" onClick={() => setShowSettings(true)} style={{ padding: "0.5rem 1rem", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--text-dark)", borderColor: "#e2e8f0" }}>
                <User size={16} /> Profile
              </motion.button>
            </li>
            <li>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="btn-secondary" onClick={handleLogout} style={{ padding: "0.5rem 1rem", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.4rem", background: "#fef2f2", color: "#ef4444", borderColor: "#fecaca" }}>
                <LogOut size={16} /> {t("logout")}
              </motion.button>
            </li>
          </>
        ) : (
          <>
            <li>
              <Link to="/login" style={{ textDecoration: "none" }}>
                <motion.span whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="btn-secondary" style={{ padding: "0.5rem 1.25rem", fontSize: "0.9rem", display: "inline-block", borderRadius: "100px", color: "var(--text-dark)", borderColor: "#e2e8f0" }}>{t("login")}</motion.span>
              </Link>
            </li>
            <li>
              <Link to="/register" style={{ textDecoration: "none" }}>
                <motion.span whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="btn-primary" style={{ padding: "0.5rem 1.25rem", fontSize: "0.9rem", display: "inline-block", width: "auto", borderRadius: "100px" }}>{t("register")}</motion.span>
              </Link>
            </li>
          </>
        )}
      </ul>

      {/* Settings Modal - Attached perfectly to body */}
      {showSettings && createPortal(
        <div className="modal-overlay" onClick={() => setShowSettings(false)} style={{ zIndex: 9999 }}>
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: "500px", padding: "2rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h3 style={{ margin: 0, color: "var(--text-dark)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <User color="var(--green-primary)" /> Global Settings
              </h3>
              <button onClick={() => setShowSettings(false)} style={{ background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer" }}>×</button>
            </div>
            
            <div style={{ display: "flex", borderBottom: "1px solid #e2e8f0", marginBottom: "1rem" }}>
              {["profile", "app", "wallet"].map(tab => (
                <button
                  key={tab}
                  onClick={() => setSettingsTab(tab)}
                  style={{
                    flex: 1, padding: "0.75rem", background: "transparent", border: "none", cursor: "pointer",
                    fontSize: "0.95rem", fontWeight: 600, color: settingsTab === tab ? "var(--green-deep)" : "var(--text-muted)",
                    borderBottom: settingsTab === tab ? "3px solid var(--green-mid)" : "3px solid transparent",
                    transition: "all 0.3s"
                  }}
                >
                  {tab === "profile" ? "👤 Profile" : tab === "app" ? "📱 App Settings" : "💳 Wallet & Pay"}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", minHeight: "300px" }}>
              
              {settingsTab === "app" && (
                <>
                  <div style={{ background: "#f8fafc", padding: "1.25rem", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                    <h4 style={{ margin: "0 0 1rem 0", fontSize: "0.95rem", color: "var(--text-dark)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      📱 App View Mode
                    </h4>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      {["auto", "mobile", "desktop"].map(mode => (
                        <button
                          key={mode}
                          onClick={() => setLayoutMode(mode)}
                          style={{
                            flex: 1, padding: "0.6rem", borderRadius: "8px", fontSize: "0.85rem", fontWeight: "bold", cursor: "pointer",
                            background: layoutMode === mode ? "var(--green-mid)" : "white",
                            color: layoutMode === mode ? "white" : "var(--text-mid)",
                            border: layoutMode === mode ? "2px solid var(--green-mid)" : "1px solid #cbd5e1"
                          }}
                        >
                          {mode === "auto" ? "Responsive" : mode === "mobile" ? "Mobile" : "Desktop"}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ background: "#f8fafc", padding: "1.25rem", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                    <h4 style={{ margin: "0 0 1rem 0", fontSize: "0.95rem", color: "var(--text-dark)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <Volume2 size={16} /> Global Audio Settings
                    </h4>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "0.85rem", color: "var(--text-mid)", fontWeight: 500 }}>Notification Sound</span>
                      <select 
                        className="rs-select" 
                        style={{ padding: "0.4rem", fontSize: "0.8rem", width: "160px" }}
                        value={localStorage.getItem("rs_notif_sound") || "default"}
                        onChange={(e) => {
                          localStorage.setItem("rs_notif_sound", e.target.value);
                          if (e.target.value === "nature") {
                            const audio = new Audio("https://freesound.org/data/previews/352/352514_5062143-lq.mp3");
                            audio.play().catch(()=>{});
                          }
                        }}
                      >
                        <option value="default">System Default</option>
                        <option value="nature">Nature (Water Drop)</option>
                        <option value="birds">Nature (Bird Chirp)</option>
                        <option value="mute">Muted</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              {settingsTab === "profile" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div>
                    <label style={{ fontSize: "0.85rem", color: "var(--text-muted)", display: "block", marginBottom: "0.3rem", fontWeight: 600 }}>Full Name</label>
                    <input 
                      type="text" 
                      value={name} 
                      onChange={e => setName(e.target.value)} 
                      placeholder="e.g. John Doe" 
                      style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", background: "white", fontSize: "1rem" }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.85rem", color: "var(--text-muted)", display: "block", marginBottom: "0.3rem", fontWeight: 600 }}>Mobile Number</label>
                    <input 
                      type="text" 
                      value={phone} 
                      onChange={e => setPhone(e.target.value)} 
                      placeholder="e.g. 9876543210" 
                      style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", background: "white", fontSize: "1rem" }}
                    />
                  </div>
                </div>
              )}

              {settingsTab === "wallet" && (
                <>
                  <div style={{ background: "linear-gradient(135deg, #16a34a, #059669)", padding: "1.5rem", borderRadius: "12px", color: "white", boxShadow: "0 10px 25px rgba(22, 163, 74, 0.3)" }}>
                    <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "0.95rem", opacity: 0.9 }}>💳 My Wallet Balance</h4>
                    <div style={{ fontSize: "2rem", fontWeight: 800 }}>
                      ₹{(user?.walletBalance || 0).toLocaleString()}
                    </div>
                    <p style={{ margin: "0.5rem 0 0", fontSize: "0.8rem", opacity: 0.8 }}>
                      Use this balance for instant checkouts or receive refunds here.
                    </p>
                  </div>

                  <div>
                    <h4 style={{ margin: "1rem 0 0.5rem 0", fontSize: "0.95rem", color: "var(--text-dark)" }}>💳 Payment Profile</h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                      <div>
                        <label style={{ fontSize: "0.85rem", color: "var(--text-muted)", display: "block", marginBottom: "0.3rem", fontWeight: 600 }}>UPI ID</label>
                        <input 
                          type="text" 
                          value={upiId} 
                          onChange={e => setUpiId(e.target.value)} 
                          placeholder="e.g. 9876543210@ybl" 
                          style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", background: "white" }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: "0.85rem", color: "var(--text-muted)", display: "block", marginBottom: "0.3rem", fontWeight: 600 }}>Bank Account Number</label>
                        <input 
                          type="text" 
                          value={bankAcc} 
                          onChange={e => setBankAcc(e.target.value)} 
                          placeholder="e.g. 123456789012" 
                          style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", background: "white" }}
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {settingsMsg && (
                <div style={{ padding: "0.75rem", borderRadius: "8px", fontSize: "0.9rem", textAlign: "center", fontWeight: 500, background: settingsMsg.includes("success") ? "#dcfce7" : "#fee2e2", color: settingsMsg.includes("success") ? "#166534" : "#991b1b" }}>
                  {settingsMsg}
                </div>
              )}

              <div style={{ display: "flex", gap: "1rem", marginTop: "auto", paddingTop: "1rem", borderTop: "1px solid #e2e8f0" }}>
                <button className="btn-secondary" style={{ flex: 1, padding: "0.75rem" }} onClick={() => setShowSettings(false)}>Close</button>
                <button className="btn-primary" style={{ flex: 1, padding: "0.75rem" }} onClick={handleSaveSettings} disabled={savingSettings}>
                  {savingSettings ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </motion.div>
        </div>,
        document.body
      )}

      <CartSidebar />
      <MarketAnnouncer />
    </nav>
  );
}
