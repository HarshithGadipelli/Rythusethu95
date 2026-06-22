import { Link } from "react-router-dom";
import { useLang } from "../../context/LangContext";
import { useAuth } from "../../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { Tractor, ShieldCheck, Truck, Home, PackageCheck, MapPin } from "lucide-react";
import { useState, useEffect } from "react";
import API from "../../api/api";

export default function LandingPage() {
  const { t } = useLang();
  const { user } = useAuth();

  const [liveStats, setLiveStats] = useState({
    farmers: 0,
    customers: 0,
    orders: 0,
    revenue: 0
  });

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const handleMouseMove = (e) => {
    const x = (e.clientX / window.innerWidth) * 2 - 1;
    const y = (e.clientY / window.innerHeight) * 2 - 1;
    setMousePos({ x, y });
  };

  useEffect(() => {
    API.get("/public/stats").then(res => {
      setLiveStats(res.data);
    }).catch(err => console.error("Failed to fetch stats", err));
  }, []);

  const stats = [
    { icon: "🌾", value: liveStats.farmers > 0 ? liveStats.farmers.toLocaleString() : "0", label: "Real Farmers" },
    { icon: "🛒", value: liveStats.customers > 0 ? liveStats.customers.toLocaleString() : "0", label: "Happy Customers" },
    { icon: "🚚", value: liveStats.orders > 0 ? liveStats.orders.toLocaleString() : "0", label: "Real Deliveries" },
    { icon: "💰", value: liveStats.revenue > 0 ? `₹${liveStats.revenue.toLocaleString()}` : "₹0", label: "Total Sales Volume" }
  ];

  const features = [
    { icon: "🤖", title: "AI Crop Suggestions", desc: "ML-powered recommendations based on weather & soil" },
    { icon: "🗺️", title: "Live Map Tracking", desc: "See farm locations & track your delivery in real-time" },
    { icon: "🎤", title: "Voice Input", desc: "Speak in Telugu, Hindi or English — we understand you" },
    { icon: "📊", title: "Demand Forecast", desc: "Know which crops will sell best this season" },
    { icon: "🌿", title: "Organic Certified", desc: "Verified organic produce from trusted farmers" },
    { icon: "💳", title: "Instant Payments", desc: "UPI, card, and COD — pay the way you prefer" }
  ];

  return (
    <div onMouseMove={handleMouseMove}>
      {/* ─── HERO ─── */}
      <section className="landing-hero" style={{ 
        backgroundImage: `linear-gradient(rgba(248, 250, 252, 0.82), rgba(248, 250, 252, 1)), url(/indian_farm_landscape.png)`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}>
        <img src="/indian_farmer_emblem.png" alt="Indian Farmer Emblem" className="hero-emblem" style={{ width: "120px", height: "auto", marginBottom: "1.5rem", dropShadow: "0 10px 20px rgba(0,0,0,0.15)" }} />
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="page-title" 
          style={{ 
            background: "linear-gradient(135deg, var(--green-deep) 0%, var(--green-light) 100%)", 
            WebkitBackgroundClip: "text", 
            WebkitTextFillColor: "transparent",
            filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.1))",
            fontSize: "clamp(3rem, 6vw, 5.5rem)"
          }}
        >
          {t("appName")}
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="hero-tagline" 
          style={{ 
            color: "var(--text-dark)", 
            background: "rgba(255,255,255,0.85)", 
            padding: "0.75rem 1.75rem", 
            borderRadius: "100px", 
            backdropFilter: "blur(15px)", 
            fontWeight: 700, 
            maxWidth: "650px", 
            margin: "1rem auto 0", 
            fontSize: "1.2rem",
            boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
            border: "1px solid rgba(255,255,255,0.6)"
          }}
        >
          {t("tagline")}
        </motion.p>



        {/* Photorealistic Ramsethu Storytelling Animation */}
        {/* Photorealistic Ramsethu Storytelling Animation */}
        <div style={{ 
          width: "100%", 
          maxWidth: "1400px", 
          margin: "3rem auto 4rem", 
          position: "relative", 
          aspectRatio: "1 / 1", /* EXACT mathematical match for the 1024x1024 image */
          maxHeight: "80vh", /* Prevents vertical overflow */
          borderRadius: "24px", 
          overflow: "hidden", 
          boxShadow: "0 30px 60px rgba(0,0,0,0.3)", 
          backgroundImage: "url('/ramsethu_two_lands.png')",
          backgroundSize: "100% 100%", /* Ensures exact coordinate mapping with zero cropping */
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          imageRendering: "high-quality",
          border: "2px solid rgba(255,255,255,0.4)" 
        }}>
          {/* Dark Overlay for better contrast */}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.6) 100%)" }} />

          {/* Admin Hanuman Animation (Flies down, builds bridge, flies back) */}
          <motion.div 
            animate={{ 
              bottom: ["34%", "30%", "35%", "36%", "37%", "38%", "39%", "40%", "42%", "43%", "45%", "46%", "47%", "48%", "50%", "51%", "51%", "52%", "53%", "51%", "54%", "55%", "56%", "57%", "58%", "59%", "60%", "64%", "34%"], 
              left:   ["51%", "50%", "52%", "53%", "54%", "55%", "56%", "56%", "56%", "56%", "56%", "56%", "56%", "56%", "55%", "54%", "53%", "51%", "50%", "52%", "49%", "48%", "47%", "46%", "46%", "45%", "44%", "43%", "51%"],
              scale:  [1.2, 1.0, 0.97, 0.95, 0.92, 0.89, 0.87, 0.84, 0.81, 0.78, 0.76, 0.73, 0.7, 0.68, 0.65, 0.62, 0.6, 0.57, 0.54, 0.52, 0.49, 0.46, 0.43, 0.41, 0.38, 0.35, 0.33, 0.3, 1.2],
              opacity:[0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0]
            }}
            transition={{ duration: 20, repeat: Infinity, times: [0, 0.05, 0.112, 0.123, 0.135, 0.146, 0.158, 0.169, 0.181, 0.192, 0.204, 0.215, 0.227, 0.238, 0.25, 0.262, 0.273, 0.285, 0.296, 0.308, 0.319, 0.331, 0.342, 0.354, 0.365, 0.377, 0.388, 0.4, 0.45, 1], ease: "easeInOut" }}
            style={{ position: "absolute", width: "90px", zIndex: 5, filter: "drop-shadow(0 0 35px rgba(250, 204, 21, 0.9))", transform: "translateX(-50%)" }}
          >
            <div style={{ width: "90px", height: "90px", borderRadius: "50%", overflow: "hidden", border: "3px solid #facc15", boxShadow: "0 0 40px rgba(250,204,21,0.7)", background: "rgba(255,255,255,0.1)", backdropFilter: "blur(5px)" }}>
              <img src="/real_admin_human_rs.png" alt="Admin Hanuman" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
            <div style={{ textAlign: "center", marginTop: "8px", background: "rgba(0,0,0,0.8)", border: "1px solid #facc15", padding: "4px 8px", borderRadius: "8px", backdropFilter: "blur(10px)" }}>
              <div style={{ color: "#facc15", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "1px", fontWeight: "bold" }}>Admin</div>
              <div style={{ color: "white", fontSize: "0.55rem", opacity: 0.8 }}>(Building)</div>
            </div>
          </motion.div>

          {/* Creative Animation: Glowing Route being constructed exactly on the rock spine */}
          <svg style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", zIndex: 1, pointerEvents: "none" }} viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <linearGradient id="goldGradient" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor="#fef08a" stopOpacity="0" />
                <stop offset="50%" stopColor="#facc15" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#ca8a04" stopOpacity="1" />
              </linearGradient>
            </defs>
            <motion.polyline
              points="50,70 52,65 53,64 54,63 55,62 56,61 56,60 56,58 56,57 56,55 56,54 56,53 56,52 55,50 54,49 53,49 51,48 50,47 52,49 49,46 48,45 47,44 46,43 46,42 45,41 44,40 43,36"
              fill="none"
              stroke="url(#goldGradient)"
              strokeWidth="0.8"
              strokeLinejoin="round"
              strokeLinecap="round"
              animate={{ 
                pathLength: [0, 0, 1, 1, 0],
                opacity: [0, 1, 1, 1, 0]
              }}
              transition={{
                duration: 20, 
                repeat: Infinity,
                ease: "linear",
                times: [0, 0.1, 0.38, 0.9, 1]
              }}
              style={{ filter: "drop-shadow(0 0 8px #facc15)" }}
            />
          </svg>
          
                              {/* Realistic Scattered Rocks placed by Admin */}
          <motion.div
            key="rock-0"
            animate={{ 
              opacity: [0, 0, 1, 1, 0, 0],
              scale: [0, 0, 1.37, 0.92, 0.92, 0],
              rotate: 2
            }}
            transition={{ duration: 20, repeat: Infinity, times: [0, 0.107, 0.112, 0.95, 0.98, 1], ease: "easeOut" }}
            style={{
              position: "absolute",
              bottom: "35%",
              left: "52%",
              width: "28px",
              height: "20px",
              marginLeft: "-14px",
              marginBottom: "-10px",
              background: "radial-gradient(circle at 30% 30%, #a8a29e 0%, #78716c 40%, #44403c 80%, #292524 100%)",
              borderRadius: "50% 54% 58% 60% / 57% 38% 49% 50%",
              boxShadow: "inset -2px -3px 6px rgba(0,0,0,0.8), inset 2px 2px 4px rgba(255,255,255,0.4), 2px 4px 6px rgba(0,0,0,0.6), 0 0 12px rgba(250, 204, 21, 0.4)",
              border: "1px solid rgba(255,255,255,0.15)",
              zIndex: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden"
            }}
          >
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0.3, background: "repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,0.2) 2px, rgba(0,0,0,0.2) 4px)" }}></div>
            <span style={{ 
              color: "#fef08a", 
              fontSize: "5px", 
              fontWeight: 900, 
              fontFamily: "sans-serif",
              textShadow: "0 0 5px #facc15, 0 0 10px #ca8a04, inset 0 0 2px #000",
              transform: "rotate(-2deg)",
              opacity: 0.95,
              letterSpacing: "0.2px",
              position: "relative",
              zIndex: 3
            }}>
              RYTHU
            </span>
          </motion.div>
          <motion.div
            key="rock-1"
            animate={{ 
              opacity: [0, 0, 1, 1, 0, 0],
              scale: [0, 0, 1.71, 1.14, 1.14, 0],
              rotate: -1
            }}
            transition={{ duration: 20, repeat: Infinity, times: [0, 0.118, 0.123, 0.95, 0.98, 1], ease: "easeOut" }}
            style={{
              position: "absolute",
              bottom: "36%",
              left: "53%",
              width: "28px",
              height: "20px",
              marginLeft: "-14px",
              marginBottom: "-10px",
              background: "radial-gradient(circle at 30% 30%, #a8a29e 0%, #78716c 40%, #44403c 80%, #292524 100%)",
              borderRadius: "44% 36% 52% 39% / 44% 35% 56% 47%",
              boxShadow: "inset -2px -3px 6px rgba(0,0,0,0.8), inset 2px 2px 4px rgba(255,255,255,0.4), 2px 4px 6px rgba(0,0,0,0.6), 0 0 12px rgba(250, 204, 21, 0.4)",
              border: "1px solid rgba(255,255,255,0.15)",
              zIndex: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden"
            }}
          >
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0.3, background: "repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,0.2) 2px, rgba(0,0,0,0.2) 4px)" }}></div>
            <span style={{ 
              color: "#fef08a", 
              fontSize: "5px", 
              fontWeight: 900, 
              fontFamily: "sans-serif",
              textShadow: "0 0 5px #facc15, 0 0 10px #ca8a04, inset 0 0 2px #000",
              transform: "rotate(-6deg)",
              opacity: 0.95,
              letterSpacing: "0.2px",
              position: "relative",
              zIndex: 3
            }}>
              RYTHU
            </span>
          </motion.div>
          <motion.div
            key="rock-2"
            animate={{ 
              opacity: [0, 0, 1, 1, 0, 0],
              scale: [0, 0, 1.53, 1.02, 1.02, 0],
              rotate: 9
            }}
            transition={{ duration: 20, repeat: Infinity, times: [0, 0.130, 0.135, 0.95, 0.98, 1], ease: "easeOut" }}
            style={{
              position: "absolute",
              bottom: "37%",
              left: "54%",
              width: "28px",
              height: "20px",
              marginLeft: "-14px",
              marginBottom: "-10px",
              background: "radial-gradient(circle at 30% 30%, #a8a29e 0%, #78716c 40%, #44403c 80%, #292524 100%)",
              borderRadius: "45% 39% 51% 44% / 43% 53% 34% 47%",
              boxShadow: "inset -2px -3px 6px rgba(0,0,0,0.8), inset 2px 2px 4px rgba(255,255,255,0.4), 2px 4px 6px rgba(0,0,0,0.6), 0 0 12px rgba(250, 204, 21, 0.4)",
              border: "1px solid rgba(255,255,255,0.15)",
              zIndex: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden"
            }}
          >
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0.3, background: "repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,0.2) 2px, rgba(0,0,0,0.2) 4px)" }}></div>
            <span style={{ 
              color: "#fef08a", 
              fontSize: "5px", 
              fontWeight: 900, 
              fontFamily: "sans-serif",
              textShadow: "0 0 5px #facc15, 0 0 10px #ca8a04, inset 0 0 2px #000",
              transform: "rotate(0deg)",
              opacity: 0.95,
              letterSpacing: "0.2px",
              position: "relative",
              zIndex: 3
            }}>
              RYTHU
            </span>
          </motion.div>
          <motion.div
            key="rock-3"
            animate={{ 
              opacity: [0, 0, 1, 1, 0, 0],
              scale: [0, 0, 1.54, 1.03, 1.03, 0],
              rotate: 7
            }}
            transition={{ duration: 20, repeat: Infinity, times: [0, 0.141, 0.146, 0.95, 0.98, 1], ease: "easeOut" }}
            style={{
              position: "absolute",
              bottom: "38%",
              left: "55%",
              width: "28px",
              height: "20px",
              marginLeft: "-14px",
              marginBottom: "-10px",
              background: "radial-gradient(circle at 30% 30%, #a8a29e 0%, #78716c 40%, #44403c 80%, #292524 100%)",
              borderRadius: "35% 50% 50% 43% / 51% 46% 60% 60%",
              boxShadow: "inset -2px -3px 6px rgba(0,0,0,0.8), inset 2px 2px 4px rgba(255,255,255,0.4), 2px 4px 6px rgba(0,0,0,0.6), 0 0 12px rgba(250, 204, 21, 0.4)",
              border: "1px solid rgba(255,255,255,0.15)",
              zIndex: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden"
            }}
          >
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0.3, background: "repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,0.2) 2px, rgba(0,0,0,0.2) 4px)" }}></div>
            <span style={{ 
              color: "#fef08a", 
              fontSize: "5px", 
              fontWeight: 900, 
              fontFamily: "sans-serif",
              textShadow: "0 0 5px #facc15, 0 0 10px #ca8a04, inset 0 0 2px #000",
              transform: "rotate(4deg)",
              opacity: 0.95,
              letterSpacing: "0.2px",
              position: "relative",
              zIndex: 3
            }}>
              రైతు
            </span>
          </motion.div>
          <motion.div
            key="rock-4"
            animate={{ 
              opacity: [0, 0, 1, 1, 0, 0],
              scale: [0, 0, 1.25, 0.83, 0.83, 0],
              rotate: 16
            }}
            transition={{ duration: 20, repeat: Infinity, times: [0, 0.153, 0.158, 0.95, 0.98, 1], ease: "easeOut" }}
            style={{
              position: "absolute",
              bottom: "39%",
              left: "56%",
              width: "28px",
              height: "20px",
              marginLeft: "-14px",
              marginBottom: "-10px",
              background: "radial-gradient(circle at 30% 30%, #a8a29e 0%, #78716c 40%, #44403c 80%, #292524 100%)",
              borderRadius: "48% 43% 50% 60% / 63% 38% 41% 44%",
              boxShadow: "inset -2px -3px 6px rgba(0,0,0,0.8), inset 2px 2px 4px rgba(255,255,255,0.4), 2px 4px 6px rgba(0,0,0,0.6), 0 0 12px rgba(250, 204, 21, 0.4)",
              border: "1px solid rgba(255,255,255,0.15)",
              zIndex: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden"
            }}
          >
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0.3, background: "repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,0.2) 2px, rgba(0,0,0,0.2) 4px)" }}></div>
            <span style={{ 
              color: "#fef08a", 
              fontSize: "5px", 
              fontWeight: 900, 
              fontFamily: "sans-serif",
              textShadow: "0 0 5px #facc15, 0 0 10px #ca8a04, inset 0 0 2px #000",
              transform: "rotate(-11deg)",
              opacity: 0.95,
              letterSpacing: "0.2px",
              position: "relative",
              zIndex: 3
            }}>
              రైతు
            </span>
          </motion.div>
          <motion.div
            key="rock-5"
            animate={{ 
              opacity: [0, 0, 1, 1, 0, 0],
              scale: [0, 0, 1.58, 1.05, 1.05, 0],
              rotate: 2
            }}
            transition={{ duration: 20, repeat: Infinity, times: [0, 0.164, 0.169, 0.95, 0.98, 1], ease: "easeOut" }}
            style={{
              position: "absolute",
              bottom: "40%",
              left: "56%",
              width: "28px",
              height: "20px",
              marginLeft: "-14px",
              marginBottom: "-10px",
              background: "radial-gradient(circle at 30% 30%, #a8a29e 0%, #78716c 40%, #44403c 80%, #292524 100%)",
              borderRadius: "64% 63% 66% 51% / 55% 51% 58% 36%",
              boxShadow: "inset -2px -3px 6px rgba(0,0,0,0.8), inset 2px 2px 4px rgba(255,255,255,0.4), 2px 4px 6px rgba(0,0,0,0.6), 0 0 12px rgba(250, 204, 21, 0.4)",
              border: "1px solid rgba(255,255,255,0.15)",
              zIndex: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden"
            }}
          >
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0.3, background: "repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,0.2) 2px, rgba(0,0,0,0.2) 4px)" }}></div>
            <span style={{ 
              color: "#fef08a", 
              fontSize: "5px", 
              fontWeight: 900, 
              fontFamily: "sans-serif",
              textShadow: "0 0 5px #facc15, 0 0 10px #ca8a04, inset 0 0 2px #000",
              transform: "rotate(-13deg)",
              opacity: 0.95,
              letterSpacing: "0.2px",
              position: "relative",
              zIndex: 3
            }}>
              రైతు
            </span>
          </motion.div>
          <motion.div
            key="rock-6"
            animate={{ 
              opacity: [0, 0, 1, 1, 0, 0],
              scale: [0, 0, 1.47, 0.98, 0.98, 0],
              rotate: -4
            }}
            transition={{ duration: 20, repeat: Infinity, times: [0, 0.176, 0.181, 0.95, 0.98, 1], ease: "easeOut" }}
            style={{
              position: "absolute",
              bottom: "42%",
              left: "56%",
              width: "28px",
              height: "20px",
              marginLeft: "-14px",
              marginBottom: "-10px",
              background: "radial-gradient(circle at 30% 30%, #a8a29e 0%, #78716c 40%, #44403c 80%, #292524 100%)",
              borderRadius: "55% 41% 50% 70% / 50% 67% 63% 60%",
              boxShadow: "inset -2px -3px 6px rgba(0,0,0,0.8), inset 2px 2px 4px rgba(255,255,255,0.4), 2px 4px 6px rgba(0,0,0,0.6), 0 0 12px rgba(250, 204, 21, 0.4)",
              border: "1px solid rgba(255,255,255,0.15)",
              zIndex: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden"
            }}
          >
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0.3, background: "repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,0.2) 2px, rgba(0,0,0,0.2) 4px)" }}></div>
            <span style={{ 
              color: "#fef08a", 
              fontSize: "5px", 
              fontWeight: 900, 
              fontFamily: "sans-serif",
              textShadow: "0 0 5px #facc15, 0 0 10px #ca8a04, inset 0 0 2px #000",
              transform: "rotate(14deg)",
              opacity: 0.95,
              letterSpacing: "0.2px",
              position: "relative",
              zIndex: 3
            }}>
              RYTHU
            </span>
          </motion.div>
          <motion.div
            key="rock-7"
            animate={{ 
              opacity: [0, 0, 1, 1, 0, 0],
              scale: [0, 0, 1.19, 0.79, 0.79, 0],
              rotate: 15
            }}
            transition={{ duration: 20, repeat: Infinity, times: [0, 0.187, 0.192, 0.95, 0.98, 1], ease: "easeOut" }}
            style={{
              position: "absolute",
              bottom: "43%",
              left: "56%",
              width: "28px",
              height: "20px",
              marginLeft: "-14px",
              marginBottom: "-10px",
              background: "radial-gradient(circle at 30% 30%, #a8a29e 0%, #78716c 40%, #44403c 80%, #292524 100%)",
              borderRadius: "30% 54% 70% 54% / 38% 47% 62% 45%",
              boxShadow: "inset -2px -3px 6px rgba(0,0,0,0.8), inset 2px 2px 4px rgba(255,255,255,0.4), 2px 4px 6px rgba(0,0,0,0.6), 0 0 12px rgba(250, 204, 21, 0.4)",
              border: "1px solid rgba(255,255,255,0.15)",
              zIndex: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden"
            }}
          >
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0.3, background: "repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,0.2) 2px, rgba(0,0,0,0.2) 4px)" }}></div>
            <span style={{ 
              color: "#fef08a", 
              fontSize: "5px", 
              fontWeight: 900, 
              fontFamily: "sans-serif",
              textShadow: "0 0 5px #facc15, 0 0 10px #ca8a04, inset 0 0 2px #000",
              transform: "rotate(8deg)",
              opacity: 0.95,
              letterSpacing: "0.2px",
              position: "relative",
              zIndex: 3
            }}>
              రైతు
            </span>
          </motion.div>
          <motion.div
            key="rock-8"
            animate={{ 
              opacity: [0, 0, 1, 1, 0, 0],
              scale: [0, 0, 1.37, 0.92, 0.92, 0],
              rotate: 15
            }}
            transition={{ duration: 20, repeat: Infinity, times: [0, 0.199, 0.204, 0.95, 0.98, 1], ease: "easeOut" }}
            style={{
              position: "absolute",
              bottom: "45%",
              left: "56%",
              width: "28px",
              height: "20px",
              marginLeft: "-14px",
              marginBottom: "-10px",
              background: "radial-gradient(circle at 30% 30%, #a8a29e 0%, #78716c 40%, #44403c 80%, #292524 100%)",
              borderRadius: "42% 30% 36% 31% / 60% 38% 40% 37%",
              boxShadow: "inset -2px -3px 6px rgba(0,0,0,0.8), inset 2px 2px 4px rgba(255,255,255,0.4), 2px 4px 6px rgba(0,0,0,0.6), 0 0 12px rgba(250, 204, 21, 0.4)",
              border: "1px solid rgba(255,255,255,0.15)",
              zIndex: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden"
            }}
          >
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0.3, background: "repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,0.2) 2px, rgba(0,0,0,0.2) 4px)" }}></div>
            <span style={{ 
              color: "#fef08a", 
              fontSize: "5px", 
              fontWeight: 900, 
              fontFamily: "sans-serif",
              textShadow: "0 0 5px #facc15, 0 0 10px #ca8a04, inset 0 0 2px #000",
              transform: "rotate(-15deg)",
              opacity: 0.95,
              letterSpacing: "0.2px",
              position: "relative",
              zIndex: 3
            }}>
              రైతు
            </span>
          </motion.div>
          <motion.div
            key="rock-9"
            animate={{ 
              opacity: [0, 0, 1, 1, 0, 0],
              scale: [0, 0, 1.12, 0.75, 0.75, 0],
              rotate: -3
            }}
            transition={{ duration: 20, repeat: Infinity, times: [0, 0.210, 0.215, 0.95, 0.98, 1], ease: "easeOut" }}
            style={{
              position: "absolute",
              bottom: "46%",
              left: "56%",
              width: "28px",
              height: "20px",
              marginLeft: "-14px",
              marginBottom: "-10px",
              background: "radial-gradient(circle at 30% 30%, #a8a29e 0%, #78716c 40%, #44403c 80%, #292524 100%)",
              borderRadius: "36% 59% 58% 44% / 38% 56% 67% 32%",
              boxShadow: "inset -2px -3px 6px rgba(0,0,0,0.8), inset 2px 2px 4px rgba(255,255,255,0.4), 2px 4px 6px rgba(0,0,0,0.6), 0 0 12px rgba(250, 204, 21, 0.4)",
              border: "1px solid rgba(255,255,255,0.15)",
              zIndex: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden"
            }}
          >
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0.3, background: "repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,0.2) 2px, rgba(0,0,0,0.2) 4px)" }}></div>
            <span style={{ 
              color: "#fef08a", 
              fontSize: "5px", 
              fontWeight: 900, 
              fontFamily: "sans-serif",
              textShadow: "0 0 5px #facc15, 0 0 10px #ca8a04, inset 0 0 2px #000",
              transform: "rotate(-12deg)",
              opacity: 0.95,
              letterSpacing: "0.2px",
              position: "relative",
              zIndex: 3
            }}>
              RYTHU
            </span>
          </motion.div>
          <motion.div
            key="rock-10"
            animate={{ 
              opacity: [0, 0, 1, 1, 0, 0],
              scale: [0, 0, 1.19, 0.80, 0.80, 0],
              rotate: -15
            }}
            transition={{ duration: 20, repeat: Infinity, times: [0, 0.222, 0.227, 0.95, 0.98, 1], ease: "easeOut" }}
            style={{
              position: "absolute",
              bottom: "47%",
              left: "56%",
              width: "28px",
              height: "20px",
              marginLeft: "-14px",
              marginBottom: "-10px",
              background: "radial-gradient(circle at 30% 30%, #a8a29e 0%, #78716c 40%, #44403c 80%, #292524 100%)",
              borderRadius: "40% 56% 38% 30% / 52% 46% 47% 40%",
              boxShadow: "inset -2px -3px 6px rgba(0,0,0,0.8), inset 2px 2px 4px rgba(255,255,255,0.4), 2px 4px 6px rgba(0,0,0,0.6), 0 0 12px rgba(250, 204, 21, 0.4)",
              border: "1px solid rgba(255,255,255,0.15)",
              zIndex: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden"
            }}
          >
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0.3, background: "repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,0.2) 2px, rgba(0,0,0,0.2) 4px)" }}></div>
            <span style={{ 
              color: "#fef08a", 
              fontSize: "5px", 
              fontWeight: 900, 
              fontFamily: "sans-serif",
              textShadow: "0 0 5px #facc15, 0 0 10px #ca8a04, inset 0 0 2px #000",
              transform: "rotate(8deg)",
              opacity: 0.95,
              letterSpacing: "0.2px",
              position: "relative",
              zIndex: 3
            }}>
              RYTHU
            </span>
          </motion.div>
          <motion.div
            key="rock-11"
            animate={{ 
              opacity: [0, 0, 1, 1, 0, 0],
              scale: [0, 0, 1.19, 0.79, 0.79, 0],
              rotate: -3
            }}
            transition={{ duration: 20, repeat: Infinity, times: [0, 0.233, 0.238, 0.95, 0.98, 1], ease: "easeOut" }}
            style={{
              position: "absolute",
              bottom: "48%",
              left: "56%",
              width: "28px",
              height: "20px",
              marginLeft: "-14px",
              marginBottom: "-10px",
              background: "radial-gradient(circle at 30% 30%, #a8a29e 0%, #78716c 40%, #44403c 80%, #292524 100%)",
              borderRadius: "54% 42% 65% 35% / 38% 51% 63% 68%",
              boxShadow: "inset -2px -3px 6px rgba(0,0,0,0.8), inset 2px 2px 4px rgba(255,255,255,0.4), 2px 4px 6px rgba(0,0,0,0.6), 0 0 12px rgba(250, 204, 21, 0.4)",
              border: "1px solid rgba(255,255,255,0.15)",
              zIndex: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden"
            }}
          >
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0.3, background: "repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,0.2) 2px, rgba(0,0,0,0.2) 4px)" }}></div>
            <span style={{ 
              color: "#fef08a", 
              fontSize: "5px", 
              fontWeight: 900, 
              fontFamily: "sans-serif",
              textShadow: "0 0 5px #facc15, 0 0 10px #ca8a04, inset 0 0 2px #000",
              transform: "rotate(11deg)",
              opacity: 0.95,
              letterSpacing: "0.2px",
              position: "relative",
              zIndex: 3
            }}>
              RYTHU
            </span>
          </motion.div>
          <motion.div
            key="rock-12"
            animate={{ 
              opacity: [0, 0, 1, 1, 0, 0],
              scale: [0, 0, 1.18, 0.79, 0.79, 0],
              rotate: 12
            }}
            transition={{ duration: 20, repeat: Infinity, times: [0, 0.245, 0.250, 0.95, 0.98, 1], ease: "easeOut" }}
            style={{
              position: "absolute",
              bottom: "50%",
              left: "55%",
              width: "28px",
              height: "20px",
              marginLeft: "-14px",
              marginBottom: "-10px",
              background: "radial-gradient(circle at 30% 30%, #a8a29e 0%, #78716c 40%, #44403c 80%, #292524 100%)",
              borderRadius: "55% 34% 70% 46% / 57% 58% 42% 30%",
              boxShadow: "inset -2px -3px 6px rgba(0,0,0,0.8), inset 2px 2px 4px rgba(255,255,255,0.4), 2px 4px 6px rgba(0,0,0,0.6), 0 0 12px rgba(250, 204, 21, 0.4)",
              border: "1px solid rgba(255,255,255,0.15)",
              zIndex: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden"
            }}
          >
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0.3, background: "repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,0.2) 2px, rgba(0,0,0,0.2) 4px)" }}></div>
            <span style={{ 
              color: "#fef08a", 
              fontSize: "5px", 
              fontWeight: 900, 
              fontFamily: "sans-serif",
              textShadow: "0 0 5px #facc15, 0 0 10px #ca8a04, inset 0 0 2px #000",
              transform: "rotate(6deg)",
              opacity: 0.95,
              letterSpacing: "0.2px",
              position: "relative",
              zIndex: 3
            }}>
              రైతు
            </span>
          </motion.div>
          <motion.div
            key="rock-13"
            animate={{ 
              opacity: [0, 0, 1, 1, 0, 0],
              scale: [0, 0, 1.28, 0.85, 0.85, 0],
              rotate: 8
            }}
            transition={{ duration: 20, repeat: Infinity, times: [0, 0.257, 0.262, 0.95, 0.98, 1], ease: "easeOut" }}
            style={{
              position: "absolute",
              bottom: "51%",
              left: "54%",
              width: "28px",
              height: "20px",
              marginLeft: "-14px",
              marginBottom: "-10px",
              background: "radial-gradient(circle at 30% 30%, #a8a29e 0%, #78716c 40%, #44403c 80%, #292524 100%)",
              borderRadius: "67% 40% 42% 68% / 47% 50% 67% 58%",
              boxShadow: "inset -2px -3px 6px rgba(0,0,0,0.8), inset 2px 2px 4px rgba(255,255,255,0.4), 2px 4px 6px rgba(0,0,0,0.6), 0 0 12px rgba(250, 204, 21, 0.4)",
              border: "1px solid rgba(255,255,255,0.15)",
              zIndex: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden"
            }}
          >
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0.3, background: "repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,0.2) 2px, rgba(0,0,0,0.2) 4px)" }}></div>
            <span style={{ 
              color: "#fef08a", 
              fontSize: "5px", 
              fontWeight: 900, 
              fontFamily: "sans-serif",
              textShadow: "0 0 5px #facc15, 0 0 10px #ca8a04, inset 0 0 2px #000",
              transform: "rotate(3deg)",
              opacity: 0.95,
              letterSpacing: "0.2px",
              position: "relative",
              zIndex: 3
            }}>
              రైతు
            </span>
          </motion.div>
          <motion.div
            key="rock-14"
            animate={{ 
              opacity: [0, 0, 1, 1, 0, 0],
              scale: [0, 0, 1.24, 0.83, 0.83, 0],
              rotate: -8
            }}
            transition={{ duration: 20, repeat: Infinity, times: [0, 0.268, 0.273, 0.95, 0.98, 1], ease: "easeOut" }}
            style={{
              position: "absolute",
              bottom: "51%",
              left: "53%",
              width: "28px",
              height: "20px",
              marginLeft: "-14px",
              marginBottom: "-10px",
              background: "radial-gradient(circle at 30% 30%, #a8a29e 0%, #78716c 40%, #44403c 80%, #292524 100%)",
              borderRadius: "47% 50% 61% 68% / 32% 56% 45% 40%",
              boxShadow: "inset -2px -3px 6px rgba(0,0,0,0.8), inset 2px 2px 4px rgba(255,255,255,0.4), 2px 4px 6px rgba(0,0,0,0.6), 0 0 12px rgba(250, 204, 21, 0.4)",
              border: "1px solid rgba(255,255,255,0.15)",
              zIndex: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden"
            }}
          >
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0.3, background: "repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,0.2) 2px, rgba(0,0,0,0.2) 4px)" }}></div>
            <span style={{ 
              color: "#fef08a", 
              fontSize: "5px", 
              fontWeight: 900, 
              fontFamily: "sans-serif",
              textShadow: "0 0 5px #facc15, 0 0 10px #ca8a04, inset 0 0 2px #000",
              transform: "rotate(-13deg)",
              opacity: 0.95,
              letterSpacing: "0.2px",
              position: "relative",
              zIndex: 3
            }}>
              రైతు
            </span>
          </motion.div>
          <motion.div
            key="rock-15"
            animate={{ 
              opacity: [0, 0, 1, 1, 0, 0],
              scale: [0, 0, 1.24, 0.82, 0.82, 0],
              rotate: -1
            }}
            transition={{ duration: 20, repeat: Infinity, times: [0, 0.280, 0.285, 0.95, 0.98, 1], ease: "easeOut" }}
            style={{
              position: "absolute",
              bottom: "52%",
              left: "51%",
              width: "28px",
              height: "20px",
              marginLeft: "-14px",
              marginBottom: "-10px",
              background: "radial-gradient(circle at 30% 30%, #a8a29e 0%, #78716c 40%, #44403c 80%, #292524 100%)",
              borderRadius: "36% 33% 51% 43% / 58% 31% 47% 65%",
              boxShadow: "inset -2px -3px 6px rgba(0,0,0,0.8), inset 2px 2px 4px rgba(255,255,255,0.4), 2px 4px 6px rgba(0,0,0,0.6), 0 0 12px rgba(250, 204, 21, 0.4)",
              border: "1px solid rgba(255,255,255,0.15)",
              zIndex: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden"
            }}
          >
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0.3, background: "repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,0.2) 2px, rgba(0,0,0,0.2) 4px)" }}></div>
            <span style={{ 
              color: "#fef08a", 
              fontSize: "5px", 
              fontWeight: 900, 
              fontFamily: "sans-serif",
              textShadow: "0 0 5px #facc15, 0 0 10px #ca8a04, inset 0 0 2px #000",
              transform: "rotate(4deg)",
              opacity: 0.95,
              letterSpacing: "0.2px",
              position: "relative",
              zIndex: 3
            }}>
              RYTHU
            </span>
          </motion.div>
          <motion.div
            key="rock-16"
            animate={{ 
              opacity: [0, 0, 1, 1, 0, 0],
              scale: [0, 0, 1.13, 0.75, 0.75, 0],
              rotate: 20
            }}
            transition={{ duration: 20, repeat: Infinity, times: [0, 0.291, 0.296, 0.95, 0.98, 1], ease: "easeOut" }}
            style={{
              position: "absolute",
              bottom: "53%",
              left: "50%",
              width: "28px",
              height: "20px",
              marginLeft: "-14px",
              marginBottom: "-10px",
              background: "radial-gradient(circle at 30% 30%, #a8a29e 0%, #78716c 40%, #44403c 80%, #292524 100%)",
              borderRadius: "44% 51% 63% 36% / 56% 54% 67% 32%",
              boxShadow: "inset -2px -3px 6px rgba(0,0,0,0.8), inset 2px 2px 4px rgba(255,255,255,0.4), 2px 4px 6px rgba(0,0,0,0.6), 0 0 12px rgba(250, 204, 21, 0.4)",
              border: "1px solid rgba(255,255,255,0.15)",
              zIndex: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden"
            }}
          >
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0.3, background: "repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,0.2) 2px, rgba(0,0,0,0.2) 4px)" }}></div>
            <span style={{ 
              color: "#fef08a", 
              fontSize: "5px", 
              fontWeight: 900, 
              fontFamily: "sans-serif",
              textShadow: "0 0 5px #facc15, 0 0 10px #ca8a04, inset 0 0 2px #000",
              transform: "rotate(0deg)",
              opacity: 0.95,
              letterSpacing: "0.2px",
              position: "relative",
              zIndex: 3
            }}>
              రైతు
            </span>
          </motion.div>
          <motion.div
            key="rock-17"
            animate={{ 
              opacity: [0, 0, 1, 1, 0, 0],
              scale: [0, 0, 0.96, 0.64, 0.64, 0],
              rotate: -18
            }}
            transition={{ duration: 20, repeat: Infinity, times: [0, 0.303, 0.308, 0.95, 0.98, 1], ease: "easeOut" }}
            style={{
              position: "absolute",
              bottom: "51%",
              left: "52%",
              width: "28px",
              height: "20px",
              marginLeft: "-14px",
              marginBottom: "-10px",
              background: "radial-gradient(circle at 30% 30%, #a8a29e 0%, #78716c 40%, #44403c 80%, #292524 100%)",
              borderRadius: "68% 45% 35% 39% / 41% 37% 37% 64%",
              boxShadow: "inset -2px -3px 6px rgba(0,0,0,0.8), inset 2px 2px 4px rgba(255,255,255,0.4), 2px 4px 6px rgba(0,0,0,0.6), 0 0 12px rgba(250, 204, 21, 0.4)",
              border: "1px solid rgba(255,255,255,0.15)",
              zIndex: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden"
            }}
          >
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0.3, background: "repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,0.2) 2px, rgba(0,0,0,0.2) 4px)" }}></div>
            <span style={{ 
              color: "#fef08a", 
              fontSize: "5px", 
              fontWeight: 900, 
              fontFamily: "sans-serif",
              textShadow: "0 0 5px #facc15, 0 0 10px #ca8a04, inset 0 0 2px #000",
              transform: "rotate(-2deg)",
              opacity: 0.95,
              letterSpacing: "0.2px",
              position: "relative",
              zIndex: 3
            }}>
              RYTHU
            </span>
          </motion.div>
          <motion.div
            key="rock-18"
            animate={{ 
              opacity: [0, 0, 1, 1, 0, 0],
              scale: [0, 0, 0.91, 0.61, 0.61, 0],
              rotate: 18
            }}
            transition={{ duration: 20, repeat: Infinity, times: [0, 0.314, 0.319, 0.95, 0.98, 1], ease: "easeOut" }}
            style={{
              position: "absolute",
              bottom: "54%",
              left: "49%",
              width: "28px",
              height: "20px",
              marginLeft: "-14px",
              marginBottom: "-10px",
              background: "radial-gradient(circle at 30% 30%, #a8a29e 0%, #78716c 40%, #44403c 80%, #292524 100%)",
              borderRadius: "48% 66% 30% 48% / 39% 56% 33% 51%",
              boxShadow: "inset -2px -3px 6px rgba(0,0,0,0.8), inset 2px 2px 4px rgba(255,255,255,0.4), 2px 4px 6px rgba(0,0,0,0.6), 0 0 12px rgba(250, 204, 21, 0.4)",
              border: "1px solid rgba(255,255,255,0.15)",
              zIndex: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden"
            }}
          >
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0.3, background: "repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,0.2) 2px, rgba(0,0,0,0.2) 4px)" }}></div>
            <span style={{ 
              color: "#fef08a", 
              fontSize: "5px", 
              fontWeight: 900, 
              fontFamily: "sans-serif",
              textShadow: "0 0 5px #facc15, 0 0 10px #ca8a04, inset 0 0 2px #000",
              transform: "rotate(3deg)",
              opacity: 0.95,
              letterSpacing: "0.2px",
              position: "relative",
              zIndex: 3
            }}>
              రైతు
            </span>
          </motion.div>
          <motion.div
            key="rock-19"
            animate={{ 
              opacity: [0, 0, 1, 1, 0, 0],
              scale: [0, 0, 1.05, 0.70, 0.70, 0],
              rotate: -3
            }}
            transition={{ duration: 20, repeat: Infinity, times: [0, 0.326, 0.331, 0.95, 0.98, 1], ease: "easeOut" }}
            style={{
              position: "absolute",
              bottom: "55%",
              left: "48%",
              width: "28px",
              height: "20px",
              marginLeft: "-14px",
              marginBottom: "-10px",
              background: "radial-gradient(circle at 30% 30%, #a8a29e 0%, #78716c 40%, #44403c 80%, #292524 100%)",
              borderRadius: "31% 65% 68% 44% / 62% 51% 58% 57%",
              boxShadow: "inset -2px -3px 6px rgba(0,0,0,0.8), inset 2px 2px 4px rgba(255,255,255,0.4), 2px 4px 6px rgba(0,0,0,0.6), 0 0 12px rgba(250, 204, 21, 0.4)",
              border: "1px solid rgba(255,255,255,0.15)",
              zIndex: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden"
            }}
          >
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0.3, background: "repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,0.2) 2px, rgba(0,0,0,0.2) 4px)" }}></div>
            <span style={{ 
              color: "#fef08a", 
              fontSize: "5px", 
              fontWeight: 900, 
              fontFamily: "sans-serif",
              textShadow: "0 0 5px #facc15, 0 0 10px #ca8a04, inset 0 0 2px #000",
              transform: "rotate(3deg)",
              opacity: 0.95,
              letterSpacing: "0.2px",
              position: "relative",
              zIndex: 3
            }}>
              RYTHU
            </span>
          </motion.div>
          <motion.div
            key="rock-20"
            animate={{ 
              opacity: [0, 0, 1, 1, 0, 0],
              scale: [0, 0, 0.82, 0.55, 0.55, 0],
              rotate: -15
            }}
            transition={{ duration: 20, repeat: Infinity, times: [0, 0.337, 0.342, 0.95, 0.98, 1], ease: "easeOut" }}
            style={{
              position: "absolute",
              bottom: "56%",
              left: "47%",
              width: "28px",
              height: "20px",
              marginLeft: "-14px",
              marginBottom: "-10px",
              background: "radial-gradient(circle at 30% 30%, #a8a29e 0%, #78716c 40%, #44403c 80%, #292524 100%)",
              borderRadius: "37% 48% 67% 59% / 66% 56% 48% 45%",
              boxShadow: "inset -2px -3px 6px rgba(0,0,0,0.8), inset 2px 2px 4px rgba(255,255,255,0.4), 2px 4px 6px rgba(0,0,0,0.6), 0 0 12px rgba(250, 204, 21, 0.4)",
              border: "1px solid rgba(255,255,255,0.15)",
              zIndex: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden"
            }}
          >
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0.3, background: "repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,0.2) 2px, rgba(0,0,0,0.2) 4px)" }}></div>
            <span style={{ 
              color: "#fef08a", 
              fontSize: "5px", 
              fontWeight: 900, 
              fontFamily: "sans-serif",
              textShadow: "0 0 5px #facc15, 0 0 10px #ca8a04, inset 0 0 2px #000",
              transform: "rotate(-11deg)",
              opacity: 0.95,
              letterSpacing: "0.2px",
              position: "relative",
              zIndex: 3
            }}>
              రైతు
            </span>
          </motion.div>
          <motion.div
            key="rock-21"
            animate={{ 
              opacity: [0, 0, 1, 1, 0, 0],
              scale: [0, 0, 0.89, 0.59, 0.59, 0],
              rotate: 16
            }}
            transition={{ duration: 20, repeat: Infinity, times: [0, 0.349, 0.354, 0.95, 0.98, 1], ease: "easeOut" }}
            style={{
              position: "absolute",
              bottom: "57%",
              left: "46%",
              width: "28px",
              height: "20px",
              marginLeft: "-14px",
              marginBottom: "-10px",
              background: "radial-gradient(circle at 30% 30%, #a8a29e 0%, #78716c 40%, #44403c 80%, #292524 100%)",
              borderRadius: "56% 53% 65% 52% / 39% 57% 59% 60%",
              boxShadow: "inset -2px -3px 6px rgba(0,0,0,0.8), inset 2px 2px 4px rgba(255,255,255,0.4), 2px 4px 6px rgba(0,0,0,0.6), 0 0 12px rgba(250, 204, 21, 0.4)",
              border: "1px solid rgba(255,255,255,0.15)",
              zIndex: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden"
            }}
          >
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0.3, background: "repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,0.2) 2px, rgba(0,0,0,0.2) 4px)" }}></div>
            <span style={{ 
              color: "#fef08a", 
              fontSize: "5px", 
              fontWeight: 900, 
              fontFamily: "sans-serif",
              textShadow: "0 0 5px #facc15, 0 0 10px #ca8a04, inset 0 0 2px #000",
              transform: "rotate(-7deg)",
              opacity: 0.95,
              letterSpacing: "0.2px",
              position: "relative",
              zIndex: 3
            }}>
              రైతు
            </span>
          </motion.div>
          <motion.div
            key="rock-22"
            animate={{ 
              opacity: [0, 0, 1, 1, 0, 0],
              scale: [0, 0, 0.81, 0.54, 0.54, 0],
              rotate: -9
            }}
            transition={{ duration: 20, repeat: Infinity, times: [0, 0.360, 0.365, 0.95, 0.98, 1], ease: "easeOut" }}
            style={{
              position: "absolute",
              bottom: "58%",
              left: "46%",
              width: "28px",
              height: "20px",
              marginLeft: "-14px",
              marginBottom: "-10px",
              background: "radial-gradient(circle at 30% 30%, #a8a29e 0%, #78716c 40%, #44403c 80%, #292524 100%)",
              borderRadius: "68% 31% 48% 65% / 50% 64% 66% 46%",
              boxShadow: "inset -2px -3px 6px rgba(0,0,0,0.8), inset 2px 2px 4px rgba(255,255,255,0.4), 2px 4px 6px rgba(0,0,0,0.6), 0 0 12px rgba(250, 204, 21, 0.4)",
              border: "1px solid rgba(255,255,255,0.15)",
              zIndex: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden"
            }}
          >
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0.3, background: "repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,0.2) 2px, rgba(0,0,0,0.2) 4px)" }}></div>
            <span style={{ 
              color: "#fef08a", 
              fontSize: "5px", 
              fontWeight: 900, 
              fontFamily: "sans-serif",
              textShadow: "0 0 5px #facc15, 0 0 10px #ca8a04, inset 0 0 2px #000",
              transform: "rotate(-7deg)",
              opacity: 0.95,
              letterSpacing: "0.2px",
              position: "relative",
              zIndex: 3
            }}>
              RYTHU
            </span>
          </motion.div>
          <motion.div
            key="rock-23"
            animate={{ 
              opacity: [0, 0, 1, 1, 0, 0],
              scale: [0, 0, 0.79, 0.53, 0.53, 0],
              rotate: 11
            }}
            transition={{ duration: 20, repeat: Infinity, times: [0, 0.372, 0.377, 0.95, 0.98, 1], ease: "easeOut" }}
            style={{
              position: "absolute",
              bottom: "59%",
              left: "45%",
              width: "28px",
              height: "20px",
              marginLeft: "-14px",
              marginBottom: "-10px",
              background: "radial-gradient(circle at 30% 30%, #a8a29e 0%, #78716c 40%, #44403c 80%, #292524 100%)",
              borderRadius: "45% 67% 48% 59% / 51% 44% 50% 41%",
              boxShadow: "inset -2px -3px 6px rgba(0,0,0,0.8), inset 2px 2px 4px rgba(255,255,255,0.4), 2px 4px 6px rgba(0,0,0,0.6), 0 0 12px rgba(250, 204, 21, 0.4)",
              border: "1px solid rgba(255,255,255,0.15)",
              zIndex: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden"
            }}
          >
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0.3, background: "repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,0.2) 2px, rgba(0,0,0,0.2) 4px)" }}></div>
            <span style={{ 
              color: "#fef08a", 
              fontSize: "5px", 
              fontWeight: 900, 
              fontFamily: "sans-serif",
              textShadow: "0 0 5px #facc15, 0 0 10px #ca8a04, inset 0 0 2px #000",
              transform: "rotate(-8deg)",
              opacity: 0.95,
              letterSpacing: "0.2px",
              position: "relative",
              zIndex: 3
            }}>
              RYTHU
            </span>
          </motion.div>
          <motion.div
            key="rock-24"
            animate={{ 
              opacity: [0, 0, 1, 1, 0, 0],
              scale: [0, 0, 0.88, 0.58, 0.58, 0],
              rotate: -8
            }}
            transition={{ duration: 20, repeat: Infinity, times: [0, 0.383, 0.388, 0.95, 0.98, 1], ease: "easeOut" }}
            style={{
              position: "absolute",
              bottom: "60%",
              left: "44%",
              width: "28px",
              height: "20px",
              marginLeft: "-14px",
              marginBottom: "-10px",
              background: "radial-gradient(circle at 30% 30%, #a8a29e 0%, #78716c 40%, #44403c 80%, #292524 100%)",
              borderRadius: "64% 30% 61% 60% / 38% 49% 32% 62%",
              boxShadow: "inset -2px -3px 6px rgba(0,0,0,0.8), inset 2px 2px 4px rgba(255,255,255,0.4), 2px 4px 6px rgba(0,0,0,0.6), 0 0 12px rgba(250, 204, 21, 0.4)",
              border: "1px solid rgba(255,255,255,0.15)",
              zIndex: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden"
            }}
          >
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0.3, background: "repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,0.2) 2px, rgba(0,0,0,0.2) 4px)" }}></div>
            <span style={{ 
              color: "#fef08a", 
              fontSize: "5px", 
              fontWeight: 900, 
              fontFamily: "sans-serif",
              textShadow: "0 0 5px #facc15, 0 0 10px #ca8a04, inset 0 0 2px #000",
              transform: "rotate(-15deg)",
              opacity: 0.95,
              letterSpacing: "0.2px",
              position: "relative",
              zIndex: 3
            }}>
              RYTHU
            </span>
          </motion.div>
{/* Bottom Bank: Farmer (Positioned at Left: 53%, Bottom: 34%) */}
          <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", bottom: "30%", width: "70px", zIndex: 4 }}>
            <div style={{ width: "70px", height: "70px", borderRadius: "50%", overflow: "hidden", border: "2px solid #4ade80", boxShadow: "0 5px 20px rgba(0,0,0,0.6), 0 0 25px rgba(74, 222, 128, 0.4)" }}>
              <img src="/real_farmer_rs.png" alt="Indian Farmer" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
            <div style={{ textAlign: "center", marginTop: "4px", background: "rgba(0,0,0,0.8)", border: "1px solid rgba(255,255,255,0.2)", padding: "2px 6px", borderRadius: "8px", backdropFilter: "blur(10px)" }}>
              <div style={{ color: "#4ade80", fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "1px", fontWeight: "bold" }}>Ram (Farmer)</div>
            </div>
          </div>

          {/* Top Bank: Customer (Positioned exactly at Left: 52%, Bottom: 52%) */}
          <motion.div 
            animate={{
              filter: [
                "drop-shadow(0 0 0px rgba(250, 204, 21, 0))",
                "drop-shadow(0 0 0px rgba(250, 204, 21, 0))",
                "drop-shadow(0 0 40px rgba(250, 204, 21, 1))",
                "drop-shadow(0 0 5px rgba(250, 204, 21, 0.3))"
              ]
            }}
            transition={{ duration: 20, repeat: Infinity, times: [0, 0.38, 0.4, 0.5], ease: "easeOut" }}
            style={{ position: "absolute", left: "43%", bottom: "64%", transform: "translate(-50%, 20%)", width: "40px", zIndex: 2 }}
          >
            <div style={{ width: "40px", height: "40px", borderRadius: "50%", overflow: "hidden", border: "2px solid #38bdf8", boxShadow: "0 5px 15px rgba(0,0,0,0.8), 0 0 10px rgba(56, 189, 248, 0.5)" }}>
              <img src="/real_customer_rs.png" alt="Customer" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
            <div style={{ textAlign: "center", marginTop: "4px", background: "rgba(0,0,0,0.8)", border: "1px solid rgba(255,255,255,0.2)", padding: "2px 4px", borderRadius: "6px", backdropFilter: "blur(10px)" }}>
              <div style={{ color: "#38bdf8", fontSize: "0.45rem", textTransform: "uppercase", letterSpacing: "1px", fontWeight: "bold" }}>Seetha</div>
            </div>
          </motion.div>

                    {/* Dynamic Multiple Agents: Wait for Admin to build bridge, then deliver packages in a stream */}

          {/* Delivery Agent 1 */}
          <motion.div
            animate={{ 
              bottom: ["30%", "30%", "30%", "35%", "36%", "37%", "38%", "39%", "40%", "42%", "43%", "45%", "46%", "47%", "48%", "50%", "51%", "51%", "52%", "53%", "51%", "54%", "55%", "56%", "57%", "58%", "59%", "60%", "64%", "64%", "64%"], 
              left:   ["50%", "50%", "50%", "52%", "53%", "54%", "55%", "56%", "56%", "56%", "56%", "56%", "56%", "56%", "56%", "55%", "54%", "53%", "51%", "50%", "52%", "49%", "48%", "47%", "46%", "46%", "45%", "44%", "43%", "43%", "43%"],
              scale:  [0, 0, 1.0, 0.97, 0.94, 0.91, 0.88, 0.85, 0.82, 0.78, 0.75, 0.72, 0.69, 0.66, 0.63, 0.6, 0.57, 0.54, 0.51, 0.48, 0.45, 0.42, 0.38, 0.35, 0.32, 0.29, 0.26, 0.23, 0.2, 0, 0], 
              opacity:[0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0]
            }}
            transition={{ 
              duration: 20, 
              repeat: Infinity, 
              ease: "easeOut", 
              times: [0, 0.49, 0.5, 0.51, 0.519, 0.529, 0.538, 0.548, 0.558, 0.567, 0.577, 0.587, 0.596, 0.606, 0.615, 0.625, 0.635, 0.644, 0.654, 0.663, 0.673, 0.683, 0.692, 0.702, 0.712, 0.721, 0.731, 0.74, 0.75, 0.76, 1]
            }}
            style={{ position: "absolute", marginLeft: "-30px", width: "60px", zIndex: 4, display: "flex", flexDirection: "column", alignItems: "center", transformOrigin: "bottom center" }}
          >
            <div style={{ width: "45px", height: "45px", borderRadius: "50%", overflow: "hidden", border: "2px solid #38bdf8", boxShadow: "0 5px 15px rgba(0,0,0,0.5), 0 0 10px rgba(56, 189, 248, 0.4)", background: "#fff" }}>
              <img src="/real_agent_rs.png" alt="Delivery Agent" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
            <div style={{ marginTop: "2px", background: "rgba(0,0,0,0.8)", border: "1px solid rgba(255,255,255,0.2)", padding: "1px 4px", borderRadius: "6px", backdropFilter: "blur(5px)" }}>
              <div style={{ color: "#38bdf8", fontSize: "0.5rem", fontWeight: "bold", textTransform: "uppercase" }}>Agent</div>
            </div>
          </motion.div>

          {/* Delivery Agent 2 */}
          <motion.div
            animate={{ 
              bottom: ["30%", "30%", "30%", "35%", "36%", "37%", "38%", "39%", "40%", "42%", "43%", "45%", "46%", "47%", "48%", "50%", "51%", "51%", "52%", "53%", "51%", "54%", "55%", "56%", "57%", "58%", "59%", "60%", "64%", "64%", "64%"], 
              left:   ["50%", "50%", "50%", "52%", "53%", "54%", "55%", "56%", "56%", "56%", "56%", "56%", "56%", "56%", "56%", "55%", "54%", "53%", "51%", "50%", "52%", "49%", "48%", "47%", "46%", "46%", "45%", "44%", "43%", "43%", "43%"],
              scale:  [0, 0, 1.0, 0.97, 0.94, 0.91, 0.88, 0.85, 0.82, 0.78, 0.75, 0.72, 0.69, 0.66, 0.63, 0.6, 0.57, 0.54, 0.51, 0.48, 0.45, 0.42, 0.38, 0.35, 0.32, 0.29, 0.26, 0.23, 0.2, 0, 0], 
              opacity:[0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0]
            }}
            transition={{ 
              duration: 20, 
              repeat: Infinity, 
              ease: "easeOut", 
              times: [0, 0.57, 0.58, 0.59, 0.599, 0.609, 0.618, 0.628, 0.638, 0.647, 0.657, 0.667, 0.676, 0.686, 0.695, 0.705, 0.715, 0.724, 0.734, 0.743, 0.753, 0.763, 0.772, 0.782, 0.792, 0.801, 0.811, 0.82, 0.83, 0.84, 1]
            }}
            style={{ position: "absolute", marginLeft: "-30px", width: "60px", zIndex: 3, display: "flex", flexDirection: "column", alignItems: "center", transformOrigin: "bottom center" }}
          >
            <div style={{ width: "45px", height: "45px", borderRadius: "50%", overflow: "hidden", border: "2px solid #38bdf8", boxShadow: "0 5px 15px rgba(0,0,0,0.5), 0 0 10px rgba(56, 189, 248, 0.4)", background: "#fff" }}>
              <img src="/real_agent_rs.png" alt="Delivery Agent" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
            <div style={{ marginTop: "2px", background: "rgba(0,0,0,0.8)", border: "1px solid rgba(255,255,255,0.2)", padding: "1px 4px", borderRadius: "6px", backdropFilter: "blur(5px)" }}>
              <div style={{ color: "#38bdf8", fontSize: "0.5rem", fontWeight: "bold", textTransform: "uppercase" }}>Agent</div>
            </div>
          </motion.div>

          {/* Delivery Agent 3 */}
          <motion.div
            animate={{ 
              bottom: ["30%", "30%", "30%", "35%", "36%", "37%", "38%", "39%", "40%", "42%", "43%", "45%", "46%", "47%", "48%", "50%", "51%", "51%", "52%", "53%", "51%", "54%", "55%", "56%", "57%", "58%", "59%", "60%", "64%", "64%", "64%"], 
              left:   ["50%", "50%", "50%", "52%", "53%", "54%", "55%", "56%", "56%", "56%", "56%", "56%", "56%", "56%", "56%", "55%", "54%", "53%", "51%", "50%", "52%", "49%", "48%", "47%", "46%", "46%", "45%", "44%", "43%", "43%", "43%"],
              scale:  [0, 0, 1.0, 0.97, 0.94, 0.91, 0.88, 0.85, 0.82, 0.78, 0.75, 0.72, 0.69, 0.66, 0.63, 0.6, 0.57, 0.54, 0.51, 0.48, 0.45, 0.42, 0.38, 0.35, 0.32, 0.29, 0.26, 0.23, 0.2, 0, 0], 
              opacity:[0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0]
            }}
            transition={{ 
              duration: 20, 
              repeat: Infinity, 
              ease: "easeOut", 
              times: [0, 0.65, 0.66, 0.67, 0.679, 0.689, 0.698, 0.708, 0.718, 0.727, 0.737, 0.747, 0.756, 0.766, 0.775, 0.785, 0.795, 0.804, 0.814, 0.823, 0.833, 0.843, 0.852, 0.862, 0.872, 0.881, 0.891, 0.9, 0.91, 0.92, 1]
            }}
            style={{ position: "absolute", marginLeft: "-30px", width: "60px", zIndex: 2, display: "flex", flexDirection: "column", alignItems: "center", transformOrigin: "bottom center" }}
          >
            <div style={{ width: "45px", height: "45px", borderRadius: "50%", overflow: "hidden", border: "2px solid #38bdf8", boxShadow: "0 5px 15px rgba(0,0,0,0.5), 0 0 10px rgba(56, 189, 248, 0.4)", background: "#fff" }}>
              <img src="/real_agent_rs.png" alt="Delivery Agent" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
            <div style={{ marginTop: "2px", background: "rgba(0,0,0,0.8)", border: "1px solid rgba(255,255,255,0.2)", padding: "1px 4px", borderRadius: "6px", backdropFilter: "blur(5px)" }}>
              <div style={{ color: "#38bdf8", fontSize: "0.5rem", fontWeight: "bold", textTransform: "uppercase" }}>Agent</div>
            </div>
          </motion.div>

        </div>

        {/* CTA Buttons */}
        {!user ? (
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", justifyContent: "center", marginTop: "2rem" }}>
            <Link to="/register">
              <button className="btn-primary" style={{ width: "auto", padding: "1rem 2.5rem", fontSize: "1.05rem" }}>
                🌱 {t("getStarted")}
              </button>
            </Link>
            <Link to="/marketplace">
              <button className="btn-secondary" style={{ width: "auto", padding: "1rem 2.5rem", fontSize: "1.05rem" }}>
                🛒 {t("shopNow")}
              </button>
            </Link>
            <a href="mailto:support@rythusethu.in">
              <button className="btn-secondary" style={{ width: "auto", padding: "1rem 2.5rem", fontSize: "1.05rem", background: "white", color: "var(--text-dark)" }}>
                ✉️ Contact Us
              </button>
            </a>
          </div>
        ) : (
          <div style={{ marginTop: "2rem" }}>
            <p style={{ color: "var(--text-muted)", marginBottom: "1rem" }}>
              👋 Welcome back, <strong style={{ color: "var(--yellow-wheat)" }}>{user.name}</strong>!
            </p>
            <Link to={user.role === "farmer" ? "/farmer" : user.role === "agent" ? "/agent" : "/marketplace"}>
              <button className="btn-primary" style={{ width: "auto", padding: "1rem 2.5rem" }}>
                Go to Dashboard →
              </button>
            </Link>
          </div>
        )}

        {/* Stats */}
        <div className="grid-4 mt-4" style={{ maxWidth: "800px", width: "100%" }}>
          {stats.map((s, i) => (
            <div key={i} className="stat-card">
              <span className="stat-icon">{s.icon}</span>
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── RAM SETU VISION SECTION ─── */}
      <section className="sethu-section" style={{ position: "relative", padding: "8rem 2rem", overflow: "hidden", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div className="sethu-bg-layer" style={{ 
          position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
          background: "var(--green-deep)",
          transform: `translate(${mousePos.x * -20}px, ${mousePos.y * -20}px) scale(1.1)`,
          zIndex: 0
        }}></div>
        <div className="sethu-overlay" style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at center, rgba(10,59,32,0.6) 0%, rgba(0,0,0,0.9) 100%)", zIndex: 1 }}></div>
        
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="sethu-content" 
          style={{ position: "relative", zIndex: 2, textAlign: "center", color: "white", maxWidth: "1000px", padding: "3rem", transform: `perspective(1200px) rotateX(${mousePos.y * -2}deg) rotateY(${mousePos.x * 2}deg)` }}
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}
            className="story-tag" style={{ background: "rgba(74, 222, 128, 0.15)", border: "1px solid rgba(74, 222, 128, 0.4)", color:"var(--green-light)", letterSpacing:"4px", fontSize:"1rem", textTransform: "uppercase", fontWeight: 800, padding: "0.5rem 1.5rem", borderRadius: "100px", display: "inline-block", marginBottom: "1.5rem", backdropFilter: "blur(10px)" }}
          >
            {t("theVision")}
          </motion.div>
          <style>{`
            @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400;1,700&display=swap');
          `}</style>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="sethu-title" style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(3rem, 7vw, 5.5rem)", marginBottom: "2rem", fontWeight: 700, textShadow: "0 15px 40px rgba(0,0,0,0.9)", letterSpacing: "-0.02em", color: "#ffffff" }}
          >
            {t("farmersBridge")}
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ delay: 0.6 }}
            className="sethu-desc" style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.4rem", lineHeight: 1.9, marginBottom: "5rem", color: "rgba(255,255,255,0.95)", textShadow: "0 4px 12px rgba(0,0,0,0.8)" }}
          >
            {t("visionDesc")}
          </motion.p>

          <div className="interactive-gallery" style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", alignItems: "center", gap: "2rem", marginTop: "2rem" }}>
            {[
              { src: "/fresh_harvest_basket.png", alt: "Fresh Harvest" },
              { src: "/ram_setu_construction.png", alt: "Ram Setu Connection" },
              { src: "/digital_farmer.png", alt: "Digital Farmer" }
            ].map((img, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                whileHover={{ y: -15, scale: 1.05, zIndex: 10, boxShadow: "0 20px 40px rgba(74,222,128,0.3)" }}
                transition={{ type: "spring", stiffness: 100, damping: 15, delay: idx * 0.2 }}
                style={{ 
                  width: "280px", height: "380px", borderRadius: "24px", overflow: "hidden", 
                  boxShadow: "0 20px 40px rgba(0,0,0,0.8)", border: "2px solid rgba(255,255,255,0.2)",
                  background: "var(--green-deep)",
                  position: "relative"
                }}
              >
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 50%)", zIndex: 1, pointerEvents: "none" }} />
                <img src={img.src} alt={img.alt} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <div style={{ position: "absolute", bottom: "25px", left: "20px", right: "20px", zIndex: 2, textAlign: "center" }}>
                   <p style={{ color: "var(--green-light)", fontWeight: "bold", fontSize: "1.2rem", textShadow: "0 4px 8px rgba(0,0,0,0.9)", margin: 0, letterSpacing: "1px" }}>{img.alt}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>
      {/* ─── STORY SECTION (SYMBIOTIC RELATIONSHIP) ─── */}
      <section className="story-section" style={{ padding: "5rem 2rem", background: "#f8fafc" }}>
        
        {/* Block 1: Farmer */}
        <motion.div initial={{ opacity: 0, x: -50 }} whileInView={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }} viewport={{ once: true }} className="story-block" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "3rem", marginBottom: "5rem" }}>
          <div className="story-image-container" style={{ flex: "1 1 400px", position: "relative" }}>
            <div className="floating-badge top-left" style={{ position: "absolute", top: "-20px", left: "-20px", background: "white", padding: "0.5rem 1rem", borderRadius: "20px", boxShadow: "0 10px 20px rgba(0,0,0,0.1)", zIndex: 2, fontWeight: "bold" }}>
              🌾 +20% Revenue
            </div>
            <div className="floating-badge bottom-right" style={{ position: "absolute", bottom: "-20px", right: "-20px", background: "white", padding: "0.5rem 1rem", borderRadius: "20px", boxShadow: "0 10px 20px rgba(0,0,0,0.1)", zIndex: 2, fontWeight: "bold" }}>
              ⭐ Premium Quality
            </div>
            <div className="story-image-wrapper" style={{ borderRadius: "30px", overflow: "hidden", boxShadow: "0 20px 40px rgba(0,0,0,0.1)" }}>
              <img src="/farmer_harvest.png" alt="Happy Indian Farmer" style={{ width: "100%", height: "400px", objectFit: "cover" }} />
            </div>
          </div>
          <div className="story-content" style={{ flex: "1 1 500px" }}>
            <span className="story-tag" style={{ color: "var(--green-mid)", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "2px" }}>{t("forFarmers")}</span>
            <h2 className="story-title" style={{ fontSize: "2.5rem", color: "var(--text-dark)", marginTop: "0.5rem", marginBottom: "1rem" }}>{t("growMoreEarnMore")}</h2>
            <p className="story-desc" style={{ fontSize: "1.1rem", color: "var(--text-mid)", lineHeight: 1.6, marginBottom: "2rem" }}>
              {t("farmerDesc")}
            </p>
            <ul className="story-features" style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: "1rem" }}>
              <li style={{ display: "flex", gap: "1rem", alignItems: "start" }}><div className="story-icon">📈</div><span><strong>{t("predictiveAI")}:</strong> {t("predictiveAIDesc")}</span></li>
              <li style={{ display: "flex", gap: "1rem", alignItems: "start" }}><div className="story-icon">🤝</div><span><strong>{t("directAccess")}:</strong> {t("directAccessDesc")}</span></li>
              <li style={{ display: "flex", gap: "1rem", alignItems: "start" }}><div className="story-icon">💰</div><span><strong>{t("fairPricing")}:</strong> {t("fairPricingDesc")}</span></li>
            </ul>
          </div>
        </motion.div>

        {/* Block 2: Customer */}
        <motion.div initial={{ opacity: 0, x: 50 }} whileInView={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }} viewport={{ once: true }} className="story-block reverse" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "3rem", flexDirection: "row-reverse", marginBottom: "5rem" }}>
          <div className="story-image-container" style={{ flex: "1 1 400px", position: "relative" }}>
            <div className="floating-badge top-left" style={{ position: "absolute", top: "-20px", left: "-20px", background: "white", padding: "0.5rem 1rem", borderRadius: "20px", boxShadow: "0 10px 20px rgba(0,0,0,0.1)", zIndex: 2, fontWeight: "bold" }}>
              🛒 Farm Fresh
            </div>
            <div className="floating-badge bottom-right" style={{ position: "absolute", bottom: "-20px", right: "-20px", background: "white", padding: "0.5rem 1rem", borderRadius: "20px", boxShadow: "0 10px 20px rgba(0,0,0,0.1)", zIndex: 2, fontWeight: "bold" }}>
              🌱 100% Organic
            </div>
            <div className="story-image-wrapper" style={{ borderRadius: "30px", overflow: "hidden", boxShadow: "0 20px 40px rgba(0,0,0,0.1)" }}>
              <img src="/happy_family_meal.png" alt="Family enjoying fresh food" style={{ width: "100%", height: "400px", objectFit: "cover" }} />
            </div>
          </div>
          <div className="story-content" style={{ flex: "1 1 500px" }}>
            <span className="story-tag" style={{ color: "var(--sky-blue)", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "2px" }}>{t("forCustomers")}</span>
            <h2 className="story-title" style={{ fontSize: "2.5rem", color: "var(--text-dark)", marginTop: "0.5rem", marginBottom: "1rem" }}>{t("freshHealthy")}</h2>
            <p className="story-desc" style={{ fontSize: "1.1rem", color: "var(--text-mid)", lineHeight: 1.6, marginBottom: "2rem" }}>
              {t("customerDesc")}
            </p>
            <ul className="story-features" style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: "1rem" }}>
              <li style={{ display: "flex", gap: "1rem", alignItems: "start" }}><div className="story-icon">🥬</div><span><strong>{t("harvestedToday")}:</strong> {t("harvestedTodayDesc")}</span></li>
              <li style={{ display: "flex", gap: "1rem", alignItems: "start" }}><div className="story-icon">🏷️</div><span><strong>{t("lowerPrices")}:</strong> {t("lowerPricesDesc")}</span></li>
              <li style={{ display: "flex", gap: "1rem", alignItems: "start" }}><div className="story-icon">🔍</div><span><strong>{t("fullTransparency")}:</strong> {t("fullTransparencyDesc")}</span></li>
            </ul>
          </div>
        </motion.div>

        {/* Block 3: The Connection */}
        <motion.div initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} viewport={{ once: true }} className="story-block" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "3rem" }}>
          <div className="story-image-container" style={{ flex: "1 1 400px", position: "relative" }}>
            <div className="floating-badge bottom-left" style={{ position: "absolute", bottom: "-20px", left: "-20px", background: "white", padding: "0.5rem 1rem", borderRadius: "20px", boxShadow: "0 10px 20px rgba(0,0,0,0.1)", zIndex: 2, fontWeight: "bold" }}>
              🤝 Symbiotic Bond
            </div>
            <div className="story-image-wrapper" style={{ borderRadius: "30px", overflow: "hidden", boxShadow: "0 20px 40px rgba(0,0,0,0.1)" }}>
              <img src="/symbiotic_handshake.png" alt="Symbiotic connection" style={{ width: "100%", height: "400px", objectFit: "cover" }} />
            </div>
          </div>
          <div className="story-content" style={{ flex: "1 1 500px" }}>
            <span className="story-tag" style={{ color: "var(--yellow-wheat)", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "2px" }}>{t("theConnection")}</span>
            <h2 className="story-title" style={{ fontSize: "2.5rem", color: "var(--text-dark)", marginTop: "0.5rem", marginBottom: "1rem" }}>{t("symbioticRel")}</h2>
            <p className="story-desc" style={{ fontSize: "1.1rem", color: "var(--text-mid)", lineHeight: 1.6, marginBottom: "2rem" }}>
              {t("connectionDesc")}
            </p>
            <ul className="story-features" style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: "1rem" }}>
              <li style={{ display: "flex", gap: "1rem", alignItems: "start" }}><div className="story-icon">🚚</div><span><strong>{t("smartLogistics")}:</strong> {t("smartLogisticsDesc")}</span></li>
              <li style={{ display: "flex", gap: "1rem", alignItems: "start" }}><div className="story-icon">🌍</div><span><strong>{t("sustainableFuture")}:</strong> {t("sustainableFutureDesc")}</span></li>
            </ul>
          </div>
        </motion.div>

      </section>

      {/* ─── OFFLINE FARM TOUR ─── */}
      <section className="story-section" style={{ padding: "5rem 2rem", background: "white" }}>
        <motion.div initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} viewport={{ once: true }} className="story-block" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "3rem", flexDirection: "row-reverse" }}>
          <div className="story-image-container" style={{ flex: "1 1 400px", position: "relative" }}>
            <div className="floating-badge top-right" style={{ position: "absolute", top: "-20px", right: "-20px", background: "white", padding: "0.5rem 1rem", borderRadius: "20px", boxShadow: "0 10px 20px rgba(0,0,0,0.1)", zIndex: 2, fontWeight: "bold" }}>
              👨‍🌾 Family Friendly
            </div>
            <div className="floating-badge bottom-left" style={{ position: "absolute", bottom: "-20px", left: "-20px", background: "white", padding: "0.5rem 1rem", borderRadius: "20px", boxShadow: "0 10px 20px rgba(0,0,0,0.1)", zIndex: 2, fontWeight: "bold" }}>
              🌻 Nature Walk
            </div>
            <div className="story-image-wrapper" style={{ borderRadius: "30px", overflow: "hidden", boxShadow: "0 20px 40px rgba(0,0,0,0.1)", border: "4px solid white" }}>
              <img src="/indian_farm_landscape.png" alt="Offline Farm Tour" style={{ width: "100%", height: "400px", objectFit: "cover", transition: "transform 0.5s" }} onMouseOver={(e) => e.target.style.transform = "scale(1.05)"} onMouseOut={(e) => e.target.style.transform = "scale(1)"} />
            </div>
          </div>
          <div className="story-content" style={{ flex: "1 1 500px" }}>
            <span className="story-tag" style={{ color: "var(--green-mid)", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "2px" }}>Experience Nature</span>
            <h2 className="story-title" style={{ fontSize: "2.5rem", color: "var(--text-dark)", marginTop: "0.5rem", marginBottom: "1rem" }}>Offline Farm Tours.</h2>
            <p className="story-desc" style={{ fontSize: "1.1rem", color: "var(--text-mid)", lineHeight: 1.6, marginBottom: "2rem" }}>
              Step out of the city and into the fields! We offer exclusive weekend farm tours for families and individuals. Come see firsthand how your food is grown naturally, meet our passionate farmers, and enjoy a day in the serene countryside.
            </p>
            <ul className="story-features" style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "2rem" }}>
              <li style={{ display: "flex", gap: "1rem", alignItems: "start" }}><div className="story-icon">🚜</div><span><strong>Tractor Rides:</strong> Fun for kids and adults alike.</span></li>
              <li style={{ display: "flex", gap: "1rem", alignItems: "start" }}><div className="story-icon">🍓</div><span><strong>Pick Your Own:</strong> Harvest fresh fruits and veggies yourself.</span></li>
              <li style={{ display: "flex", gap: "1rem", alignItems: "start" }}><div className="story-icon">🍲</div><span><strong>Farm-to-Table Lunch:</strong> Enjoy an authentic, organic meal.</span></li>
            </ul>
            <button style={{ background: "var(--green-main)", color: "white", border: "none", padding: "0.8rem 2rem", fontSize: "1rem", fontWeight: "bold", borderRadius: "100px", cursor: "pointer", boxShadow: "0 10px 20px rgba(0,0,0,0.15)", transition: "transform 0.2s" }} onMouseOver={(e) => e.target.style.transform = "translateY(-3px) scale(1.05)"} onMouseOut={(e) => e.target.style.transform = "translateY(0) scale(1)"}>
              Book a Tour Today
            </button>
          </div>
        </motion.div>
      </section>

      {/* ─── ROLE PORTALS ─── */}
      <section className="page-wrapper">
        <h2 className="page-title mb-3">{t('chooseRole')}</h2>
        <div className="role-cards-grid">
          {[
            { to: "/marketplace", imgSrc: "/node_customer.png", title: t('customerPortal'), desc: t('customerPortalDesc'), color: "var(--sky-blue)" },
            { to: "/farmer", imgSrc: "/node_farmer.png", title: t('farmerPortal'), desc: t('farmerPortalDesc'), color: "var(--green-light)" },
            { to: "/agent", imgSrc: "/node_delivery.png", title: t('agentPortal'), desc: t('agentPortalDesc'), color: "var(--yellow-wheat)" },
            { to: "/admin", imgSrc: "/role_admin.png", title: t('adminPanel'), desc: t('adminPortalDesc'), color: "var(--saffron-main)" }
          ].map((r, i) => (
            <Link to={r.to} className="role-card" key={i}>
              <div className="role-card-inner" style={{ borderColor: `${r.color}33` }}>
                <div style={{ width: "80px", height: "80px", margin: "0 auto 1rem", borderRadius: "50%", overflow: "hidden", border: `2px solid ${r.color}`, boxShadow: "0 8px 16px rgba(0,0,0,0.1)" }}>
                  <img src={r.imgSrc} alt={r.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
                <div className="role-card-title" style={{ color: r.color }}>{r.title}</div>
                <div className="role-card-desc">{r.desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section className="page-wrapper mt-4">
        <h2 className="page-title mb-3">{t('whyRythuSethu')}</h2>
        <div className="grid-3">
          {[
            { icon: "🤖", title: t('aiCropSuggest'), desc: t('aiCropSuggestDesc') },
            { icon: "🗺️", title: t('liveMapTracking'), desc: t('liveMapTrackingDesc') },
            { icon: "🎙️", title: t('voiceInput'), desc: t('voiceInputDesc') },
            { icon: "📈", title: t('demandForecast'), desc: t('demandForecastDescLanding') },
            { icon: "🌿", title: t('organicCertified'), desc: t('organicCertifiedDesc') },
            { icon: "💳", title: t('instantPayments'), desc: t('instantPaymentsDesc') }
          ].map((f, i) => (
            <div className="glass-card" key={i} style={{ textAlign: "center" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>{f.icon}</div>
              <h3 style={{ color: "var(--yellow-wheat)", marginBottom: "0.5rem", fontSize: "1rem" }}>{f.title}</h3>
              <p style={{ color: "var(--text-mid)", fontSize: "0.85rem", lineHeight: 1.5 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer style={{
        marginTop: "4rem", padding: "3rem 2rem", background: "var(--green-deep)",
        borderTop: "1px solid rgba(82,183,136,0.2)",
        textAlign: "center", color: "white", fontSize: "0.9rem"
      }}>
        <div style={{ display: "flex", justifyContent: "center", gap: "2rem", marginBottom: "1.5rem" }}>
          <a href="mailto:support@rythusethu.in" style={{ color: "var(--text-muted)", textDecoration: "none" }}>Contact Us</a>
          <a href="#" style={{ color: "var(--text-muted)", textDecoration: "none" }}>Privacy Policy</a>
          <a href="#" style={{ color: "var(--text-muted)", textDecoration: "none" }}>Terms of Service</a>
        </div>
        <p>🌾 Rythu Sethu — Connecting Farmers & Customers Across India</p>
        <p style={{ marginTop: "0.5rem", opacity: 0.8 }}>Made with ❤️ for Indian Agriculture</p>
      </footer>
    </div>
  );
}
