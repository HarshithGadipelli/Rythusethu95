import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Leaf, Info, Droplets, Sun, Activity, Flame, ShieldCheck, Sparkles } from 'lucide-react';
import { useLang } from '../context/LangContext';
import { playTTS } from '../utils/voiceParser';
import API from '../api/api';
import { io } from "socket.io-client";
import { BASE_URL } from "../api/api";

export default function EcoAdvisor({ cropName }) {
  const { lang, user } = useLang();
  const [currentTip, setCurrentTip] = useState(0);
  const [dynamicTips, setDynamicTips] = useState([]);

  const tips = [
    {
      title: "Natural Farming + Modern Tech",
      icon: <Leaf size={24} color="#16a34a" />,
      text: `While 100% natural farming may initially lower yield, integrating modern precision tech (like drip irrigation or soil moisture sensors) can boost ${cropName || 'your crop'}'s yield naturally while keeping it pesticide-free!`,
      action: "Explore Precision Tech"
    },
    {
      title: "Stop Stubble Burning!",
      icon: <Flame size={24} color="#ef4444" />,
      text: `Instead of burning your harvested fields, convert the stubble into bales of hay! You can sell these bales as cattle feed or use machines like Happy Seeder to mulch it back into the soil. Reduce pollution and earn extra cash!`,
      action: "Learn Baling Techniques"
    },
    {
      title: "Organic Pest Control",
      icon: <ShieldCheck size={24} color="#2563eb" />,
      text: `Use Neem oil sprays and companion planting instead of harsh chemicals. It protects the groundwater, fetches a premium 'Organic' price on our marketplace, and keeps the soil healthy for generations.`,
      action: "View Organic Methods"
    }
  ];

  const allTips = [...dynamicTips, ...tips];

  useEffect(() => {
    const socket = io(BASE_URL);
    socket.on("admin_broadcast_received", async (data) => {
      let finalMessage = data.message;
      
      // AI Translation on the edge!
      if (lang !== "en") {
        try {
          const res = await API.post("/ai/chat", { 
            prompt: `Translate the following English broadcast to the language code '${lang}'. Respond ONLY with the translated text: "${data.message}"`,
            role: user?.role,
            userId: user?._id,
            lang
          });
          if (res.data.response || res.data.reply) finalMessage = res.data.response || res.data.reply;
        } catch (e) {
          console.warn("AI translation failed for broadcast", e);
        }
      }

      // Read aloud the urgent broadcast!
      playTTS("Important message: " + finalMessage, lang, { volume: 1.0 });

      // Add incoming broadcast as a new tip at the beginning
      setDynamicTips(prev => [{
        title: "📢 Admin Broadcast",
        icon: <Info size={24} color="#f59e0b" />,
        text: finalMessage,
        action: "Got it"
      }, ...prev]);
      setCurrentTip(0); // Jump to the new broadcast immediately
    });

    return () => socket.disconnect();
  }, [lang, user]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTip((prev) => (prev + 1) % allTips.length);
    }, 10000); // Rotate every 10 seconds
    return () => clearInterval(timer);
  }, [allTips.length]);

  return (
    <div className="glass-card mt-3" style={{ background: "linear-gradient(135deg, #f0fdf4, #dcfce7)", border: "1.5px solid #86efac", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: -20, right: -20, opacity: 0.1 }}>
        <Leaf size={120} color="#16a34a" />
      </div>
      
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
        <Sparkles size={20} color="#15803d" />
        <h3 style={{ color: "#15803d", fontSize: "1.1rem", margin: 0 }}>Rythu Sethu Eco-Advisor</h3>
      </div>

      <div style={{ minHeight: "120px", display: "flex", alignItems: "flex-start", gap: "1rem" }}>
        <div style={{ background: "white", padding: "10px", borderRadius: "50%", boxShadow: "0 4px 6px rgba(0,0,0,0.05)", display: "flex", flexShrink: 0 }}>
          {allTips[currentTip].icon}
        </div>
        <div>
          <h4 style={{ color: "var(--text-dark)", fontSize: "1rem", marginBottom: "0.4rem" }}>{allTips[currentTip].title}</h4>
          <p style={{ color: "var(--text-mid)", fontSize: "0.9rem", lineHeight: "1.5", marginBottom: "0.8rem" }}>
            {allTips[currentTip].text}
          </p>
          <button style={{ background: "white", color: "#15803d", border: "1px solid #15803d", padding: "0.3rem 0.8rem", borderRadius: "100px", fontSize: "0.8rem", fontWeight: "bold", cursor: "pointer", transition: "all 0.2s" }} onMouseOver={(e) => { e.target.style.background = "#15803d"; e.target.style.color = "white"; }} onMouseOut={(e) => { e.target.style.background = "white"; e.target.style.color = "#15803d"; }}>
            {allTips[currentTip].action} &rarr;
          </button>
        </div>
      </div>
      
      {/* Progress Dots */}
      <div style={{ display: "flex", justifyContent: "center", gap: "6px", marginTop: "1rem", flexWrap: "wrap" }}>
        {allTips.map((_, idx) => (
          <div key={idx} onClick={() => setCurrentTip(idx)} style={{ width: 8, height: 8, borderRadius: "50%", background: idx === currentTip ? "#15803d" : "#bbf7d0", cursor: "pointer", transition: "all 0.3s" }} />
        ))}
      </div>
    </div>
  );
}
