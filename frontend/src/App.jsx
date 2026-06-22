import { BASE_URL } from './api/api';
import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { LangProvider, useLang } from "./context/LangContext";
import { CartProvider } from "./context/CartContext";
import { LayoutProvider } from "./context/LayoutContext";
import Navbar from "./components/Navbar";
import BottomNav from "./components/BottomNav";
import { MessageSquareText, BellRing, X } from "lucide-react";
import { io } from "socket.io-client";
import LandingPage from "./pages/Landing/LandingPage";
import Login from "./pages/Auth/Login";
import Register from "./pages/Auth/Register";
import AudioManager from "./components/AudioManager";
import FarmerDashboard from "./pages/Farmer/FarmerDashboard";
import AgentDashboard from "./pages/Agent/AgentDashboard";
import AdminDashboard from "./pages/Admin/AdminDashboard";
import Marketplace from "./pages/Marketplace/Marketplace";
import CustomerFarmTours from "./pages/Marketplace/CustomerFarmTours";
import CustomerOfflineTours from "./pages/Marketplace/CustomerOfflineTours";
import CuratedBoxes from "./pages/Marketplace/CuratedBoxes";
import Support from "./pages/Support/Support";
import AIAssistant from "./components/AIAssistant";
// Ensure Google Translate re-translates when React Router changes pages
function RouteChangeListener() {
  const location = useLocation();
  const { lang } = useLang();
  
  useEffect(() => {
    if (lang !== "en" && typeof window._triggerGoogleTranslate === "function") {
      const GT_LANG_MAP = {
        en: "en", hi: "hi", te: "te", ta: "ta", kn: "kn",
        ml: "ml", mr: "mr", gu: "gu", bn: "bn", pa: "pa",
        or: "or", as: "as", ur: "ur"
      };
      const gtLang = GT_LANG_MAP[lang] || "en";
      setTimeout(() => {
        const combo = document.querySelector('.goog-te-combo');
        if (combo && combo.value === gtLang) {
          // Force reset then apply to overcome React DOM overwrites
          combo.value = "en";
          combo.dispatchEvent(new Event("change"));
          setTimeout(() => {
            combo.value = gtLang;
            combo.dispatchEvent(new Event("change"));
          }, 150);
        } else if (combo) {
          combo.value = gtLang;
          combo.dispatchEvent(new Event("change"));
        }
      }, 500);
    }
  }, [location.pathname, lang]);
  return null;
}

// Protected route wrapper
function Protected({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="loader-wrapper" style={{ minHeight: "100vh" }}>
      <div className="loader"></div>
      <p className="loader-text">Loading Rythu Sethu...</p>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  const [broadcast, setBroadcast] = useState(null);

  useEffect(() => {
    const socket = io(BASE_URL);
    socket.on("admin_broadcast_received", (data) => {
      setBroadcast(data);
    });
    return () => socket.disconnect();
  }, []);

  return (
    <>
      <AudioManager />
      <RouteChangeListener />
      {broadcast && (
        <div style={{
          background: "linear-gradient(135deg, #e11d48, #be123c)",
          color: "white", padding: "0.75rem 1rem", textAlign: "center",
          fontWeight: 600, fontSize: "0.95rem", position: "relative",
          display: "flex", justifyContent: "center", alignItems: "center", gap: "0.75rem",
          zIndex: 999999, boxShadow: "0 4px 12px rgba(225, 29, 72, 0.4)"
        }}>
          <BellRing size={18} className="spin-anim" /> 
          <span style={{ flex: 1 }}>
            <strong style={{ color: "#ffe4e6", textTransform: "uppercase", letterSpacing: "1px", marginRight: "0.5rem" }}>Admin Broadcast:</strong> 
            {broadcast.message}
          </span>
          <button onClick={() => setBroadcast(null)} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "white", cursor: "pointer", borderRadius: "50%", padding: "4px", display: "flex" }}>
            <X size={16} />
          </button>
        </div>
      )}
      <div className="nature-bg-overlay">
        <div className="sunbeam" style={{ left: "10%", animationDuration: "12s" }}></div>
        <div className="sunbeam" style={{ left: "40%", animationDuration: "15s", animationDelay: "2s" }}></div>
        <div className="sunbeam" style={{ left: "70%", animationDuration: "10s", animationDelay: "1s" }}></div>
        
        <div className="cloud" style={{ top: "10%", width: "200px", height: "100px", animationDuration: "40s" }}></div>
        <div className="cloud" style={{ top: "30%", width: "300px", height: "150px", animationDuration: "60s", animationDelay: "15s" }}></div>
        <div className="cloud" style={{ top: "15%", width: "150px", height: "80px", animationDuration: "50s", animationDelay: "5s" }}></div>

        <div className="firefly"></div>
        <div className="firefly"></div>
        <div className="firefly"></div>
        <div className="firefly"></div>
        <div className="firefly"></div>
        <div className="firefly"></div>
        <div className="firefly"></div>
        <div className="firefly"></div>
        <div className="leaf-petal"></div>
        <div className="leaf-petal"></div>
        <div className="leaf-petal"></div>
        <div className="leaf-petal"></div>
      </div>
      <Navbar />
      <AIAssistant />
      <Routes>
        <Route path="/"           element={<LandingPage />} />
        <Route path="/login"      element={<Login />} />
        <Route path="/register"   element={<Register />} />
        <Route path="/marketplace" element={<Marketplace />} />
        <Route path="/farm-tours" element={<CustomerFarmTours />} />
        <Route path="/offline-tours" element={<CustomerOfflineTours />} />
        <Route path="/curated-boxes" element={<CuratedBoxes />} />

        <Route path="/farmer" element={
          <Protected roles={["farmer", "admin"]}>
            <FarmerDashboard />
          </Protected>
        } />

        <Route path="/agent" element={
          <Protected roles={["agent", "admin"]}>
            <AgentDashboard />
          </Protected>
        } />

        <Route path="/admin" element={
          <Protected roles={["admin"]}>
            <AdminDashboard />
          </Protected>
        } />

        <Route path="/support" element={
          <Protected>
            <Support />
          </Protected>
        } />

        {/* Legacy paths redirect */}
        <Route path="/farmer-dashboard"  element={<Navigate to="/farmer" replace />} />
        <Route path="/agent-dashboard"   element={<Navigate to="/agent" replace />} />
        <Route path="/admin-dashboard"   element={<Navigate to="/admin" replace />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Google Translate hidden widget container */}
      <div
        id="google_translate_element"
        style={{ position: "fixed", bottom: "-9999px", left: "-9999px", zIndex: -1, opacity: 0, pointerEvents: "none" }}
      />


      {/* Floating Contact Us Button */}
      <Link to="/support" className="floating-contact-btn" title="Contact Support">
        <MessageSquareText size={24} />
      </Link>

      <BottomNav />
    </>
  );
}

export default function App() {
  return (
    <LangProvider>
      <AuthProvider>
        <CartProvider>
          <LayoutProvider>
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </LayoutProvider>
        </CartProvider>
      </AuthProvider>
    </LangProvider>
  );
}
