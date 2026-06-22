import React, { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

const CROSSERS = [
  { img: "/hanuman_admin.png", delay: 0.5, speed: 4.5, name: "Admin", scale: 1.2 }, // Admin (Hanuman/Admin) crosses first
  { img: "/agent_delivery.png", delay: 2.5, speed: 4.0, name: "Agent 1", scale: 1.0 },
  { img: "/agent_delivery.png", delay: 3.5, speed: 4.0, name: "Agent 2", scale: 1.0 },
  { img: "/agent_delivery.png", delay: 4.5, speed: 4.0, name: "Agent 3", scale: 1.0 }
];

export default function RythuSethuAnimation({ onComplete }) {
  const [stones, setStones] = useState([]);
  const [truckCross, setTruckCross] = useState(false);

  // Generate 25 keyframe points for the bridge (with a slight arc)
  const { pathLefts, pathBottoms, agentOpacities } = useMemo(() => {
    const lefts = [];
    const bottoms = [];
    const opacities = [];
    for (let i = 0; i <= 24; i++) {
      const progress = i / 24;
      lefts.push(`${5 + progress * 90}%`);
      const arc = Math.sin(progress * Math.PI) * 15; // 15% upward arc
      bottoms.push(`${10 + progress * 75 + arc}%`);
      opacities.push(i < 2 ? 0 : 1); // fade in at the start, stay visible
    }
    return { pathLefts: lefts, pathBottoms: bottoms, agentOpacities: opacities };
  }, []);

  useEffect(() => {
    let count = 0;
    const interval = setInterval(() => {
      if (count < 25) {
        setStones((prev) => [...prev, count]);
        count++;
      } else {
        clearInterval(interval);
        setTimeout(() => setTruckCross(true), 400);
        setTimeout(() => {
          if (onComplete) onComplete();
        }, 11000); // Wait 11 seconds to let admin and 3 agents fully cross
      }
    }, 80);
    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div style={{
      position: "relative",
      width: "100%",
      height: "320px",
      background: "linear-gradient(180deg, #87CEEB 0%, #a2d9ff 40%, #1e3a8a 70%, #0f172a 100%)",
      borderRadius: "20px",
      overflow: "hidden",
      boxShadow: "inset 0 0 30px rgba(0,0,0,0.15), 0 8px 32px rgba(0,0,0,0.1)"
    }}>

      {/* Sun */}
      <motion.div
        animate={{ y: [0, -5, 0], scale: [1, 1.05, 1] }}
        transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
        style={{
          position: "absolute", top: "12px", right: "20%",
          width: "60px", height: "60px", borderRadius: "50%",
          background: "radial-gradient(circle, #FFD700 40%, #FF8C00 100%)",
          boxShadow: "0 0 40px rgba(255,215,0,0.8), 0 0 80px rgba(255,140,0,0.5)",
          zIndex: 1
        }}
      />

      {/* Clouds */}
      {[
        { top: "5%", left: "-10%", w: 100, dur: 35 },
        { top: "15%", left: "30%", w: 80, dur: 45 },
        { top: "8%", left: "70%", w: 90, dur: 40 },
      ].map((c, i) => (
        <motion.div
          key={i}
          animate={{ x: ["0%", "120vw"] }}
          transition={{ repeat: Infinity, duration: c.dur, ease: "linear", delay: i * 5 }}
          style={{
            position: "absolute", top: c.top, left: c.left,
            width: `${c.w}px`, height: `${c.w * 0.4}px`,
            background: "rgba(255,255,255,0.85)", borderRadius: "50%",
            filter: "blur(5px)", zIndex: 1
          }}
        />
      ))}


      {/* Left Bank: Farm / Hills */}
      <div style={{
        position: "absolute", left: "-5%", bottom: "0", width: "35%", height: "45%",
        background: "linear-gradient(135deg, #2E8B57, #1b4d3e)", borderTopRightRadius: "60px", zIndex: 2,
        boxShadow: "10px 0 20px rgba(0,0,0,0.3)"
      }}>
        {/* Ram (Farmer) at extreme left bottom */}
        <div style={{ position: "absolute", bottom: "15px", left: "30px", textAlign: "center", color: "white" }}>
          <img src="/ram_farmer.png" alt="Ram" style={{ width: "65px", height: "65px", borderRadius: "50%", border: "2px solid white", objectFit: "cover", boxShadow: "0 4px 10px rgba(0,0,0,0.5)" }} />
          <div style={{ fontSize: "0.75rem", fontWeight: "bold", marginTop: "4px", background: "rgba(0,0,0,0.6)", padding: "2px 8px", borderRadius: "10px" }}>Farmer (Ram)</div>
        </div>
      </div>

      {/* Right Bank: Customer side / Hills */}
      <div style={{
        position: "absolute", right: "-5%", bottom: "25%", width: "35%", height: "40%",
        background: "linear-gradient(135deg, #5a5a5a, #2a2a2a)", borderTopLeftRadius: "60px", borderBottomLeftRadius: "40px", zIndex: 2,
        boxShadow: "-10px 10px 20px rgba(0,0,0,0.4)"
      }}>
        {/* Seetha (Customer) at extreme right top hills */}
        <div style={{ position: "absolute", top: "10px", right: "30px", textAlign: "center", color: "white" }}>
          <img src="/seetha_customer.png" alt="Seetha" style={{ width: "65px", height: "65px", borderRadius: "50%", border: "2px solid white", objectFit: "cover", boxShadow: "0 4px 10px rgba(0,0,0,0.5)" }} />
          <div style={{ fontSize: "0.75rem", fontWeight: "bold", marginTop: "4px", background: "rgba(0,0,0,0.6)", padding: "2px 8px", borderRadius: "10px" }}>Customer (Seetha)</div>
        </div>
      </div>

      {/* Ocean / Sea */}
      {[0, 1, 2, 3].map(i => (
        <motion.div
          key={`wave-${i}`}
          animate={{ x: ["-10%", "5%", "-10%"], opacity: [0.2, 0.5, 0.2] }}
          transition={{ repeat: Infinity, duration: 2.5 + i * 0.6, ease: "easeInOut", delay: i * 0.3 }}
          style={{
            position: "absolute", bottom: `${5 + i * 8}%`, left: "10%", width: "80%", height: "10px",
            background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)",
            borderRadius: "5px", zIndex: 1
          }}
        />
      ))}

      {/* Bridge stones following a precise diagonal path from bottom-left to mid-right */}
      <div style={{
        position: "absolute", bottom: "10%", left: "15%", width: "70%", height: "50%",
        zIndex: 3, pointerEvents: "none"
      }}>
        <AnimatePresence>
          {stones.map((i) => {
            return (
              <motion.div
                key={i}
                initial={{ y: -200, opacity: 0, rotate: Math.random() * 90 - 45 }}
                animate={{ y: 0, opacity: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 250, damping: 12 }}
                style={{
                  position: "absolute",
                  left: pathLefts[i],
                  bottom: pathBottoms[i],
                  width: "35px", height: "20px",
                  backgroundImage: "url('/realistic_stone_texture.png')",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  border: "1px solid rgba(0,0,0,0.6)", 
                  borderRadius: "40%", // More realistic oval/rock shape
                  boxShadow: "0 6px 12px rgba(0,0,0,0.6), inset 0 2px 4px rgba(255,255,255,0.3)",
                  transform: "translate(-50%, 50%)"
                }}
              />
            );
          })}
        </AnimatePresence>

        {/* Coordinates Map Line (Admin's Trail for Agents) */}
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 1 }}>
          <motion.polyline
            initial={{ pathLength: 0, opacity: 0 }}
            animate={truckCross ? { pathLength: 1, opacity: 0.8 } : { pathLength: 0, opacity: 0 }}
            transition={{ duration: CROSSERS[0].speed, delay: CROSSERS[0].delay, ease: "linear" }}
            points={pathLefts.map((x, i) => `${parseFloat(x)},${100 - parseFloat(pathBottoms[i])}`).join(" ")}
            // Since SVG uses top-left origin, we convert bottom % to top % (100 - bottom)
            fill="none"
            stroke="#0ea5e9"
            strokeWidth="0.8" // use smaller width since vector-effect scales it differently, or keep it 3 if non-scaling works well
            strokeDasharray="2 1"
            style={{ filter: "drop-shadow(0 0 5px #38bdf8)" }}
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {/* Admin and Agents crossing the bridge along the exact same diagonal path */}
        <AnimatePresence>
          {CROSSERS.map((crosser, idx) => {
            return (
              <motion.div
                key={`crosser-${idx}`}
                initial={{ left: "5%", bottom: "10%", opacity: 0 }}
                animate={truckCross ? { 
                  left: pathLefts, 
                  bottom: pathBottoms,
                  opacity: agentOpacities 
                } : { 
                  left: "5%",
                  bottom: "10%",
                  opacity: 0 
                }}
                transition={truckCross ? { 
                  duration: crosser.speed, 
                  ease: "linear", 
                  delay: crosser.delay
                } : { duration: 0 }}
                style={{
                  position: "absolute", zIndex: 4 + idx,
                  width: `${35 * crosser.scale}px`, height: `${35 * crosser.scale}px`,
                  transform: "translate(-50%, 50%)"
                }}
              >
                <motion.img
                  src={crosser.img}
                  animate={{ y: [0, -6, 0], rotate: [-6, 6, -6] }}
                  transition={{ repeat: Infinity, duration: 0.35 }}
                  style={{
                    width: "100%", height: "100%",
                    borderRadius: "50%",
                    border: idx === 0 ? "3px solid #38bdf8" : "2px solid #fbbf24",
                    objectFit: "cover",
                    boxShadow: idx === 0 ? "0 0 15px #38bdf8" : "0 4px 12px rgba(0,0,0,0.6)"
                  }}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Label */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: stones.length >= 25 ? 1 : 0 }}
        style={{
          position: "absolute", bottom: "10px", left: "50%", transform: "translateX(-50%)",
          fontSize: "0.75rem", color: "rgba(255,255,255,0.9)", fontWeight: 700,
          textShadow: "0 2px 4px rgba(0,0,0,0.8)", zIndex: 5,
          letterSpacing: "1px", textTransform: "uppercase"
        }}
      >
        🌉 Rythu Sethu — Connecting Farmers to Customers
      </motion.div>
    </div>
  );
}
