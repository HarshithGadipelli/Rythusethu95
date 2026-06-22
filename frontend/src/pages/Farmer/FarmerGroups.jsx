import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, TrendingUp, CheckCircle, Plus, X } from "lucide-react";
import API from "../../api/api";
import { useAuth } from "../../context/AuthContext";

export default function FarmerGroups({ crops = [] }) {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [joinQty, setJoinQty] = useState({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPool, setNewPool] = useState({ name: "", cropId: "", targetQuantity: "", quantity: "", region: "" });
  const [joinById, setJoinById] = useState({ poolId: "", quantity: "" });

  const fetchGroups = async () => {
    try {
      const res = await API.get("/groups/crop/all"); // Requires backend route for all farmer_sell groups
      const sellGroups = res.data.filter(g => g.type === "farmer_sell");
      setGroups(sellGroups);
    } catch (e) {
      setGroups([]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchGroups(); }, []);

  const handleJoin = async (groupId, qty) => {
    if (!qty || qty < 1) return;
    try {
      await API.post(`/groups/join/${groupId}`, { userId: user._id, quantity: qty });
      setMsg("Successfully pledged your harvest to the group!");
      fetchGroups();
    } catch (e) {
      setMsg("Failed to join group.");
    }
  };

  const handleJoinByPoolId = async () => {
    if (!joinById.poolId || !joinById.quantity) return;
    try {
      const res = await API.post("/groups/join-by-id", { poolId: joinById.poolId, userId: user._id, quantity: joinById.quantity });
      setMsg(`Successfully joined pool ${joinById.poolId}!`);
      setJoinById({ poolId: "", quantity: "" });
      fetchGroups();
    } catch (e) {
      setMsg(e.response?.data?.error || "Failed to join pool. Invalid ID?");
    }
  };

  return (
    <div className="glass-card" style={{ marginTop: "1rem" }}>
      <div className="flex-between mb-2">
        <h3 className="section-title mb-0" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Users size={24} color="var(--green-mid)" /> Group Selling
        </h3>
        <button className="btn-secondary" onClick={() => setShowCreateModal(true)} style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <Plus size={16} /> Create Pool
        </button>
      </div>
      <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
        Pool your harvest with other farmers to meet high-volume wholesale or export demands. Reach the target to unlock premium pricing!
      </p>

      <div style={{ background: "rgba(124, 58, 237, 0.05)", border: "1px dashed #7c3aed", padding: "1rem", borderRadius: "12px", marginBottom: "1.5rem", display: "flex", gap: "1rem", alignItems: "center" }}>
        <h4 style={{ margin: 0, color: "#7c3aed" }}>Have a Pool ID?</h4>
        <input type="text" className="rs-input" placeholder="Enter Pool ID (e.g. POOL-A1B2)" value={joinById.poolId} onChange={e => setJoinById({...joinById, poolId: e.target.value.toUpperCase()})} style={{ maxWidth: 200 }} />
        <input type="number" className="rs-input" placeholder="Quantity to Pledge" value={joinById.quantity} onChange={e => setJoinById({...joinById, quantity: e.target.value})} style={{ maxWidth: 150 }} />
        <button className="btn-primary" onClick={handleJoinByPoolId} style={{ background: "#7c3aed" }}>Join Pool</button>
      </div>

      {msg && <div className="alert alert-success mb-2">{msg}</div>}

      {loading ? (
        <div className="loader"></div>
      ) : groups.length === 0 ? (
        <div style={{ textAlign: "center", padding: "3rem", background: "rgba(22, 163, 74, 0.05)", borderRadius: "12px" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🤝</div>
          <h4 style={{ color: "var(--green-deep)" }}>No selling pools active</h4>
          <p style={{ color: "var(--text-mid)" }}>Start a new pool to attract wholesale buyers.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.5rem" }}>
          {groups.map(g => {
            const pct = Math.min((g.currentQuantity / g.targetQuantity) * 100, 100);
            return (
              <motion.div whileHover={{ y: -5 }} key={g._id} style={{
                background: "white", borderRadius: "16px", padding: "1.5rem", border: "1px solid #e2e8f0"
              }}>
                <h4 style={{ color: "var(--text-dark)", fontSize: "1.2rem", marginBottom: "0.25rem", display: "flex", justifyContent: "space-between" }}>
                  {g.name}
                  {g.poolId && <span style={{ fontSize: "0.8rem", background: "#f1f5f9", padding: "0.2rem 0.5rem", borderRadius: "4px", color: "#64748b" }}>ID: {g.poolId}</span>}
                </h4>
                <p style={{ color: "var(--green-mid)", fontWeight: 600, marginBottom: "0.25rem" }}>Crop: {g.crop?.name}</p>
                {g.region && <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1.25rem" }}>📍 Region: {g.region}</p>}
                
                <div style={{ marginBottom: "1.25rem" }}>
                  <div className="flex-between" style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.4rem" }}>
                    <span>{g.currentQuantity} {g.crop?.unit} pooled</span>
                    <span style={{ fontWeight: 600, color: "var(--text-dark)" }}>Target: {g.targetQuantity} {g.crop?.unit}</span>
                  </div>
                  <div style={{ height: 8, background: "#f1f5f9", borderRadius: 10, overflow: "hidden" }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} style={{ height: "100%", background: pct === 100 ? "#16a34a" : "var(--green-mid)" }} />
                  </div>
                </div>

                {pct === 100 ? (
                  <button className="btn-primary" disabled style={{ width: "100%", background: "#16a34a" }}>
                    <CheckCircle size={18} /> Pool Filled!
                  </button>
                ) : (
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <input type="number" className="rs-input" placeholder={`Qty (${g.crop?.unit})`} value={joinQty[g._id] || ""} onChange={e => setJoinQty({...joinQty, [g._id]: e.target.value})} style={{ flex: 1 }} />
                    <button className="btn-primary" onClick={() => handleJoin(g._id, joinQty[g._id])} style={{ flex: 2 }}>Pledge</button>
                  </div>
                )}
                <div style={{ marginTop: "1rem", fontSize: "0.8rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <Users size={14} /> {g.members?.length} farmers participating
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create Pool Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-overlay">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="modal-content glass-card" style={{ maxWidth: "500px", padding: "2rem" }}>
              <div className="flex-between mb-2">
                <h3 className="section-title mb-0" style={{ fontSize: "1.4rem" }}>Create New Pool</h3>
                <button className="btn-icon" onClick={() => setShowCreateModal(false)}><X size={20} /></button>
              </div>
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
                Start a pool for your crop to attract bulk buyers. Other farmers can join your pool!
              </p>
              
              <div className="form-group mb-2">
                <label className="field-label">Pool Name</label>
                <input className="rs-input" value={newPool.name} onChange={e => setNewPool({...newPool, name: e.target.value})} placeholder="e.g. Export Quality Basmati" />
              </div>
              <div className="form-group mb-2">
                <label className="field-label">Select Crop to Pool</label>
                <select className="rs-select" value={newPool.cropId} onChange={e => setNewPool({...newPool, cropId: e.target.value})}>
                  <option value="">-- Choose from your listed crops --</option>
                  {crops.map(c => <option key={c._id} value={c._id}>{c.name} (Current: {c.quantity} {c.unit})</option>)}
                </select>
              </div>
              <div className="form-group mb-2">
                <label className="field-label">Region (Optional)</label>
                <input className="rs-input" value={newPool.region} onChange={e => setNewPool({...newPool, region: e.target.value})} placeholder="e.g. Telangana North" />
              </div>
              <div className="grid-2 mb-2">
                <div className="form-group">
                  <label className="field-label">Target Quantity</label>
                  <input type="number" className="rs-input" value={newPool.targetQuantity} onChange={e => setNewPool({...newPool, targetQuantity: e.target.value})} placeholder="e.g. 5000" />
                </div>
                <div className="form-group">
                  <label className="field-label">Your Contribution</label>
                  <input type="number" className="rs-input" value={newPool.quantity} onChange={e => setNewPool({...newPool, quantity: e.target.value})} placeholder="e.g. 500" />
                </div>
              </div>
              <button 
                className="btn-primary" 
                style={{ width: "100%", marginTop: "1rem" }}
                onClick={async () => {
                  if (!newPool.name || !newPool.cropId || !newPool.targetQuantity || !newPool.quantity) {
                    setMsg("Please fill all fields to create a pool.");
                    setShowCreateModal(false);
                    return;
                  }
                  try {
                    const poolId = "POOL-" + Math.random().toString(36).substring(2,6).toUpperCase();
                    await API.post("/groups/create", {
                      name: newPool.name,
                      type: "farmer_sell",
                      cropId: newPool.cropId,
                      targetQuantity: Number(newPool.targetQuantity),
                      quantity: Number(newPool.quantity),
                      userId: user._id,
                      region: newPool.region,
                      poolId: poolId
                    });
                    setMsg(`Pool created successfully! Your Pool ID is ${poolId}`);
                    setShowCreateModal(false);
                    fetchGroups();
                  } catch(e) {
                    setMsg("Failed to create pool.");
                  }
                }}
              >
                Launch Pool
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
