import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, TrendingDown, Target, CheckCircle } from "lucide-react";
import API from "../../api/api";
import { useAuth } from "../../context/AuthContext";

export default function CustomerGroups({ crops }) {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joinQty, setJoinQty] = useState({});
  const [msg, setMsg] = useState("");

  const fetchGroups = async () => {
    try {
      const res = await API.get("/groups/crop/all");
      if (res.data && res.data.length > 0) {
        setGroups(res.data);
      } else {
        // Seed some real groups if none exist so join works
        if (crops && crops.length > 0) {
          try {
            const c1 = crops.find(c => c.name?.toLowerCase().includes("tomato")) || crops[0];
            const c2 = crops.length > 1 ? crops[1] : null;
            
            if (c1) {
              await API.post("/groups/create", {
                name: "Neighborhood Fresh Pool",
                type: "customer_buy",
                cropId: c1._id,
                targetQuantity: 100,
                userId: user?._id || "system",
                quantity: 10
              });
            }
            if (c2) {
              await API.post("/groups/create", {
                name: "Weekend Bulk Savings",
                type: "customer_buy",
                cropId: c2._id,
                targetQuantity: 200,
                userId: user?._id || "system",
                quantity: 25
              });
            }
            // Fetch again after seeding
            const newRes = await API.get("/groups/crop/all");
            setGroups(newRes.data || []);
          } catch (seedErr) {
            console.error("Seeding failed", seedErr);
            setGroups([]);
          }
        } else {
          setGroups([]);
        }
      }
    } catch (e) {
      console.error(e);
      setGroups([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const handleJoin = async (groupId) => {
    const qty = joinQty[groupId];
    if (!qty || qty < 1) return;
    try {
      await API.post(`/groups/join/${groupId}`, { userId: user._id, quantity: qty });
      setMsg("Successfully joined the group!");
      fetchGroups();
    } catch (e) {
      setMsg("Failed to join group. You might already be in it.");
    }
  };

  return (
    <div style={{ paddingTop: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h2 style={{ color: "var(--text-dark)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Users size={24} color="#2563eb" /> Advanced Bulk Buying
        </h2>
      </div>

      <p style={{ color: "var(--text-muted)", marginBottom: "2rem", fontSize: "1.05rem" }}>
        Join forces to buy in bulk. Unlock higher discount tiers as more customers join!
      </p>

      {msg && <div className="alert alert-success mb-2">{msg}</div>}

      {loading ? (
        <div className="loader"></div>
      ) : groups.length === 0 ? (
        <div style={{ padding: "3rem", textAlign: "center", background: "white", borderRadius: "var(--radius-lg)" }}>
          <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>👥</div>
          <h3 style={{ color: "var(--text-mid)" }}>No active buying groups right now.</h3>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "1.5rem" }}>
          {groups.map(g => {
            const tiers = g.tiers || [{qty: g.targetQuantity, discount: g.discountPercent}];
            const maxTier = tiers[tiers.length - 1];
            const pct = Math.min((g.currentQuantity / maxTier.qty) * 100, 100);
            
            // Find current active tier
            let currentDiscount = 0;
            let nextTier = tiers[0];
            for (const t of tiers) {
              if (g.currentQuantity >= t.qty) {
                currentDiscount = t.discount;
              } else if (g.currentQuantity < t.qty) {
                nextTier = t;
                break;
              }
            }

            return (
              <motion.div whileHover={{ y: -5 }} key={g._id} style={{
                background: "white", borderRadius: "var(--radius-lg)", border: "1px solid #e2e8f0",
                padding: "1.5rem", position: "relative", overflow: "hidden", boxShadow: "0 10px 25px rgba(0,0,0,0.05)"
              }}>
                <div style={{ position: "absolute", top: 0, right: 0, background: currentDiscount > 0 ? "#16a34a" : "#dbeafe", color: currentDiscount > 0 ? "white" : "#2563eb", padding: "0.4rem 1rem", borderBottomLeftRadius: "16px", fontWeight: 700, fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                  <TrendingDown size={14} /> {currentDiscount > 0 ? `${currentDiscount}% UNLOCKED` : 'UP TO ' + maxTier.discount + '% OFF'}
                </div>

                <h3 style={{ color: "var(--text-dark)", fontSize: "1.3rem", marginTop: "0.5rem", marginBottom: "0.2rem" }}>{g.name}</h3>
                <p style={{ color: "var(--green-mid)", fontWeight: 600, fontSize: "1.1rem", marginBottom: "1.5rem" }}>
                  {g.crop?.name} (₹{g.crop?.price}/{g.crop?.unit})
                </p>

                <div style={{ marginBottom: "1.5rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.4rem" }}>
                    <span><strong style={{color:"var(--text-dark)"}}>{g.currentQuantity}</strong> {g.crop?.unit} pledged</span>
                    <span style={{ fontWeight: 600, color: "var(--text-dark)" }}><Target size={12}/> Max Target: {maxTier.qty}</span>
                  </div>
                  
                  {/* Tiered Progress Bar */}
                  <div style={{ height: 12, background: "#f1f5f9", borderRadius: 10, position: "relative", overflow: "hidden" }}>
                    <motion.div 
                      initial={{ width: 0 }} animate={{ width: `${pct}%` }} 
                      style={{ height: "100%", background: "linear-gradient(90deg, #3b82f6, #16a34a)", borderRadius: 10 }} 
                    />
                    {tiers.map((t, i) => (
                      <div key={i} style={{
                        position: "absolute", top: 0, bottom: 0, 
                        left: `${(t.qty / maxTier.qty) * 100}%`,
                        width: 2, background: "white", zIndex: 10
                      }}></div>
                    ))}
                  </div>
                  
                  {/* Tier Labels */}
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.5rem", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    {tiers.map((t, i) => (
                       <div key={i} style={{ 
                         textAlign: i === tiers.length - 1 ? "right" : "center",
                         color: g.currentQuantity >= t.qty ? "#16a34a" : "inherit",
                         fontWeight: g.currentQuantity >= t.qty ? 700 : 400
                       }}>
                         {t.qty}{g.crop?.unit}<br/>{t.discount}%
                       </div>
                    ))}
                  </div>
                </div>

                {pct === 100 ? (
                  <button className="btn-primary" disabled style={{ width: "100%", background: "#16a34a" }}>
                    <CheckCircle size={18} /> Target Reached!
                  </button>
                ) : (
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <input 
                      type="number" className="rs-input" placeholder={`Qty (${g.crop?.unit})`}
                      value={joinQty[g._id] || ""} onChange={e => setJoinQty({...joinQty, [g._id]: e.target.value})}
                      style={{ flex: 1 }}
                    />
                    <button className="btn-primary" onClick={() => handleJoin(g._id)} style={{ flex: 2, background: "#2563eb" }}>
                      Join Pool
                    </button>
                  </div>
                )}
                
                <div style={{ marginTop: "1rem", fontSize: "0.8rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <Users size={14} /> {g.members?.length} buyers have joined
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
