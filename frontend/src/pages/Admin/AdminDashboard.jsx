import { BASE_URL } from '../../api/api';
import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useLang } from "../../context/LangContext";
import { useVoiceInput } from "../../utils/useVoiceInput";
import AutoSuggestInput from "../../components/AutoSuggestInput";
import API from "../../api/api";
import { io } from "socket.io-client";
import AdminFinancials from "./AdminFinancials";
import AdminGlobalMap from "../../components/AdminGlobalMap";

const TABS = ["overview","users","verification","orders","deliveries","profit","security","support", "tips", "mlops"];

const AdminTips = ({ stats }) => {
  const tips = [
    "📈 Analyze daily revenue trends. If platform profit dips, consider dynamic pricing or promotional discounts.",
    "🛡️ Maintain a high trust ecosystem: promptly review and act on agent mismatch reports.",
    "🧑‍🌾 Engage farmers with regular broadcast messages containing seasonal farming tips to boost their yields.",
    "🚀 If order volume is high but assigned deliveries are low, onboard more delivery agents in high-demand zip codes.",
    "🎁 Consider adding a 'Nutritional Tips' broadcast to customers to boost demand for organic and pesticide-free crops."
  ];

  return (
    <div className="glass-card mt-3">
      <h3 className="section-title">💡 Marketing & Management Tips</h3>
      <p style={{ color:"var(--text-muted)", fontSize:"0.85rem", marginBottom:"1rem" }}>Actionable insights based on platform activity to improve operations and profitability:</p>
      
      <div className="grid-2" style={{ marginBottom: "1.5rem" }}>
        <div style={{ background: "rgba(59, 130, 246, 0.1)", border: "1px solid rgba(59, 130, 246, 0.2)", padding: "1rem", borderRadius: "8px" }}>
          <h4 style={{ color: "var(--blue-light)", marginBottom: "0.5rem" }}>Demand Analysis</h4>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
            Current pending orders: <strong>{stats?.pendingOrders || 0}</strong>. {stats?.pendingOrders > 50 ? "High demand! Ensure agents are assigned promptly." : "Stable demand."}
          </p>
        </div>
        <div style={{ background: "rgba(234, 179, 8, 0.1)", border: "1px solid rgba(234, 179, 8, 0.2)", padding: "1rem", borderRadius: "8px" }}>
          <h4 style={{ color: "var(--yellow-wheat)", marginBottom: "0.5rem" }}>Platform Revenue</h4>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
            Total Profit: <strong>₹{(stats?.platformProfit || 0).toLocaleString()}</strong>. {stats?.platformProfit < 5000 ? "Consider running a marketing campaign to boost platform usage." : "Revenue is healthy."}
          </p>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
        {tips.map((t, i) => (
          <div key={i} style={{ background: "rgba(255, 255, 255, 0.05)", padding: "1rem", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.1)" }}>
            {t}
          </div>
        ))}
      </div>
    </div>
  );
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const { t, lang } = useLang();

  const [tab, setTab] = useState("overview");
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [crops, setCrops] = useState([]);
  const [agents, setAgents] = useState([]);
  const [stats, setStats] = useState({});
  const [deliveries, setDeliveries] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [reports, setReports] = useState([]);
  const [pendingUsersList, setPendingUsersList] = useState([]);
  const [pendingTours, setPendingTours] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type:"", text:"" });
  const [assignModal, setAssignModal] = useState(null);
  const [search, setSearch] = useState("");
  const [mapRegionFilter, setMapRegionFilter] = useState("All");
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const { listening, activeField, interim, startListening } = useVoiceInput(lang || "en");

  useEffect(() => {
    loadAll();
    const socket = io(BASE_URL);
    socket.on("order_created", () => loadAll());
    socket.on("order_updated", () => loadAll());
    socket.on("delivery_updated", () => loadAll());
    return () => socket.disconnect();
  }, []);

  const handleRetrain = async (modelName) => {
    try {
      const res = await API.post("/ml/retrain", { model: modelName });
      setMsg({ type: "success", text: `🔄 ${modelName} ${res.data.message}` });
    } catch (e) {
      setMsg({ type: "error", text: "Failed to start retraining." });
    }
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      const [ur, or, cr, ag, st, dl, tk, rp, pu, pt] = await Promise.all([
        API.get("/admin/users"),
        API.get("/admin/orders"),
        API.get("/crops"),
        API.get("/admin/agents"),
        API.get("/admin/stats"),
        API.get("/admin/deliveries"),
        API.get("/tickets/admin"),
        API.get("/reports"),
        API.get("/admin/pending-users"),
        API.get("/tours/pending")
      ]);
      setUsers(ur.data);
      setOrders(or.data);
      setCrops(cr.data);
      setAgents(ag.data);
      setStats(st.data);
      setDeliveries(dl.data);
      setTickets(tk.data);
      setReports(rp.data);
      setPendingUsersList(pu.data);
      setPendingTours(pt.data);
    } catch(e) {
      setMsg({ type:"error", text:"Failed to load data." });
    } finally { setLoading(false); }
  };

  const flash = (type, text) => { setMsg({ type, text }); setTimeout(() => setMsg({ type:"", text:"" }), 3000); };

  const deleteUser = async (id, name) => {
    if (!confirm(`Remove user "${name}"?`)) return;
    try { await API.delete(`/admin/users/${id}`); flash("success",`✅ User "${name}" removed.`); loadAll(); }
    catch { flash("error","Failed to delete user."); }
  };

  const fineUser = async (id, name) => {
    const amount = prompt(`Enter amount to deduct from ${name}'s wallet as a fine:`);
    if (!amount || isNaN(amount) || Number(amount) <= 0) return;
    try { 
      await API.post(`/admin/users/${id}/fine`, { amount: Number(amount) }); 
      flash("success",`✅ ₹${amount} fined from ${name}.`); 
      loadAll(); 
    }
    catch { flash("error","Failed to apply fine."); }
  };

  const changeRole = async (id, role) => {
    try { await API.put(`/admin/users/${id}/role`, { role }); flash("success",`✅ Role updated.`); loadAll(); }
    catch { flash("error","Failed to update role."); }
  };

  const verifyFarmer = async (id, name) => {
    try { await API.put(`/admin/users/${id}/verify`); flash("success",`✅ ${name} is now verified!`); loadAll(); }
    catch { flash("error","Failed to verify."); }
  };

  const rejectFarmer = async (id, name) => {
    const reason = prompt(`Reason for rejecting ${name}?`);
    if (!reason) return;
    try { await API.put(`/admin/users/${id}/reject`, { reason }); flash("success",`❌ ${name} rejected.`); loadAll(); }
    catch { flash("error","Failed to reject."); }
  };

  const updateOrderStatus = async (id, status) => {
    try { await API.put(`/orders/${id}/status`, { status }); flash("success","✅ Order status updated."); loadAll(); }
    catch { flash("error","Failed to update order."); }
  };

  const assignAgent = async (orderId, agentId) => {
    try {
      await API.post("/admin/delivery/assign", { orderId, agentId });
      flash("success","✅ Delivery agent assigned!");
      setAssignModal(null);
      loadAll();
    } catch { flash("error","Failed to assign agent."); }
  };

  const [broadcastTarget, setBroadcastTarget] = useState("all");
  const [broadcastType, setBroadcastType] = useState("general");

  const sendBroadcast = () => {
    if (!broadcastMsg.trim()) return flash("error", "Message cannot be empty.");
    const socket = io(BASE_URL);
    socket.emit("admin_broadcast", { 
      message: broadcastMsg, 
      targetRole: broadcastTarget,
      type: broadcastType,
      timestamp: Date.now() 
    });
    flash("success", "📢 Broadcast sent!");
    setBroadcastMsg("");
    socket.disconnect();
  };

  const getDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const roleColor = { farmer:"badge-green", customer:"badge-blue", agent:"badge-yellow", admin:"badge-red" };
  const orderColor = { pending:"badge-yellow", confirmed:"badge-blue", processing:"badge-blue", assigned:"badge-yellow", picked_up:"badge-blue", in_transit:"badge-blue", delivered:"badge-green", cancelled:"badge-red" };

  const lowerSearch = search.toLowerCase();
  const filteredUsers = users.filter(u => u.name?.toLowerCase().includes(lowerSearch) || u.email?.toLowerCase().includes(lowerSearch));
  const filteredOrders = orders.filter(o => o.billNumber?.toLowerCase().includes(lowerSearch) || o.crop?.name?.toLowerCase().includes(lowerSearch) || o.customer?.name?.toLowerCase().includes(lowerSearch));
  const filteredDeliveries = deliveries.filter(d => d.trackingCode?.toLowerCase().includes(lowerSearch) || d.agent?.name?.toLowerCase().includes(lowerSearch));

  const pendingFarmers = filteredUsers.filter(u => (u.role === "farmer" || u.role === "agent") && !u.isVerified);
  const needsDelivery = filteredOrders.filter(o => ["confirmed","processing"].includes(o.status) && !o.agent && o.deliveryType !== "farm_pickup");

  return (
    <div className="page-wrapper" style={{ maxWidth:1400 }}>
      <div className="flex-between mb-3" style={{ flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 className="page-title" style={{ textAlign:"left", fontSize:"1.8rem" }}>🛡️ Admin Control Center</h1>
          <p style={{ color: "var(--text-muted)", fontSize:"0.85rem" }}>Full platform management & analytics</p>
        </div>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ minWidth: 250 }}>
            <AutoSuggestInput
               value={search}
               onChange={setSearch}
               placeholder="🔍 Search users, orders..."
               fieldType="default"
               onSpeak={() => startListening((val) => {
                 if (typeof val === "function") setSearch(f=>val(f));
                 else setSearch(val);
               }, { replace: true, fieldId: "search" })}
               listening={listening && activeField === "search"}
               interim={interim}
            />
          </div>
          <button className="btn-secondary" onClick={loadAll}>🔄 Refresh</button>
        </div>
      </div>

      {msg.text && <div className={`alert alert-${msg.type} mb-3`}>{msg.text}</div>}

      {/* Tabs */}
      <div className="tab-bar mb-3" style={{ flexWrap:"wrap" }}>
        {[
          { k:"overview", l:"📊 Overview" },
          { k:"tracking", l:"🗺️ Live Map" },
          { k:"users",   l:`👥 Users (${users.length})` },
          { k:"verification", l:`🌾 Verify (${pendingFarmers.length})` },
          { k:"tours", l:`🚜 Verify Tours (${pendingTours.length})` },
          { k:"orders",  l:`📦 Orders (${orders.length})` },
          { k:"deliveries", l:`🚚 Delivery (${needsDelivery.length})` },
          { k:"financials", l:"💵 Financial Ledger" },
          { k:"security",l:"🛡️ Security" },
          { k:"support", l:`🎫 Tickets (${tickets.length})` },
          { k:"crops", l:`🌾 Crop Lifecycles` },
          { k:"broadcast", l:"📢 Broadcast" },
          { k:"tips", l:"💡 Growth Tips" },
          { k:"mlops", l:"🤖 ML Ops" }
        ].map(tb => (
          <button key={tb.k} className={`tab-btn ${tab===tb.k?"active":""}`} onClick={() => setTab(tb.k)}>
            {tb.l}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loader-wrapper"><div className="loader"></div><p className="loader-text">{t("loading")}</p></div>
      ) : (
        <>
          {/* ── OVERVIEW ── */}
          {tab === "overview" && (
            <>
              <div className="admin-stats-row">
                {[
                  { icon:"👥", label:"Total Users", value: stats.totalUsers || 0 },
                  { icon:"🌾", label:"Farmers", value: stats.farmers || 0 },
                  { icon:"🛒", label:"Customers", value: stats.customers || 0 },
                  { icon:"🚚", label:"Agents", value: stats.agents || 0 },
                  { icon:"✅", label:"Verified Farmers", value: stats.verifiedFarmers || 0 },
                  { icon:"⏳", label:"Pending Verify", value: stats.pendingFarmers || 0 },
                ].map((s,i)=>(
                  <div className="stat-card" key={i}>
                    <span className="stat-icon">{s.icon}</span>
                    <div className="stat-value">{s.value}</div>
                    <div className="stat-label">{s.label}</div>
                  </div>
                ))}
              </div>
              <div className="admin-stats-row">
                {[
                  { icon:"📦", label:"Total Orders", value: stats.totalOrders || 0 },
                  { icon:"⏳", label:"Pending", value: stats.pendingOrders || 0 },
                  { icon:"✅", label:"Delivered", value: stats.deliveredOrders || 0 },
                  { icon:"❌", label:"Cancelled", value: stats.cancelledOrders || 0 },
                  { icon:"💰", label:"Revenue", value: `₹${(stats.totalRevenue || 0).toLocaleString()}` },
                  { icon:"📈", label:"Platform Profit", value: `₹${(stats.platformProfit || 0).toLocaleString()}` },
                ].map((s,i)=>(
                  <div className="stat-card" key={i}>
                    <span className="stat-icon">{s.icon}</span>
                    <div className="stat-value">{s.value}</div>
                    <div className="stat-label">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Quick actions */}
              <div className="grid-2">
                <div className="glass-card">
                  <h3 className="section-title">⚠️ Needs Attention</h3>
                  <div className="toggle-row"><span className="toggle-label">Pending Verifications</span><span className="badge badge-yellow">{pendingFarmers.length}</span></div>
                  <div className="toggle-row"><span className="toggle-label">Orders Awaiting Delivery</span><span className="badge badge-yellow">{needsDelivery.length}</span></div>
                  <div className="toggle-row"><span className="toggle-label">Pending Orders</span><span className="badge badge-yellow">{stats.pendingOrders || 0}</span></div>
                </div>
                <div className="glass-card">
                  <h3 className="section-title">📊 Revenue by Category</h3>
                  {stats.revenueByCategory && Object.entries(stats.revenueByCategory).map(([cat, rev]) => (
                    <div className="toggle-row" key={cat}>
                      <span className="toggle-label capitalize">{cat}</span>
                      <strong style={{ color:"var(--yellow-wheat)" }}>₹{rev.toLocaleString()}</strong>
                    </div>
                  ))}
                  {(!stats.revenueByCategory || Object.keys(stats.revenueByCategory).length === 0) && (
                    <p style={{ color:"var(--text-muted)", fontSize:"0.85rem" }}>No revenue data yet</p>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ── LIVE TRACKING MAP ── */}
          {tab === "tracking" && (
            <div className="glass-card">
              <div className="flex-between mb-3" style={{ flexWrap: "wrap", gap: "1rem" }}>
                <h3 className="section-title mb-0">🗺️ Global Delivery Tracking</h3>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 600 }}>Region:</span>
                  <select 
                    className="rs-select" 
                    value={mapRegionFilter} 
                    onChange={e => setMapRegionFilter(e.target.value)}
                    style={{ padding: "0.4rem 1rem", fontSize: "0.85rem", width: "auto" }}
                  >
                    <option value="All">All Regions</option>
                    <option value="Hyderabad">Hyderabad</option>
                    <option value="Warangal">Warangal</option>
                    <option value="Nizamabad">Nizamabad</option>
                    <option value="Khammam">Khammam</option>
                    <option value="Karimnagar">Karimnagar</option>
                  </select>
                </div>
              </div>
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "1rem" }}>Showing active deliveries {mapRegionFilter !== "All" ? `in ${mapRegionFilter}` : "globally"}.</p>
              <AdminGlobalMap activeDeliveries={deliveries.filter(d => mapRegionFilter === "All" || d.deliveryLocation?.toLowerCase().includes(mapRegionFilter.toLowerCase()) || d.pickupLocation?.toLowerCase().includes(mapRegionFilter.toLowerCase()))} />
            </div>
          )}

          {/* ── USERS ── */}
          {tab === "users" && (
            <div className="glass-card" style={{ overflowX:"auto" }}>
              <table className="rs-table">
                <thead>
                  <tr>
                    <th>Name</th><th>Email</th><th>Phone</th>
                    <th>Role</th><th>Verified</th><th>Joined</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(u => (
                    <tr key={u._id}>
                      <td><strong style={{ color: "var(--text-dark)" }}>{u.name||"—"}</strong></td>
                      <td style={{ color: "var(--text-muted)", fontSize:"0.85rem" }}>{u.email}</td>
                      <td style={{ color:"var(--text-muted)", fontSize:"0.82rem" }}>{u.phone||"—"}</td>
                      <td>
                        <select value={u.role} onChange={(e) => changeRole(u._id, e.target.value)}
                          style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(82,183,136,0.25)", borderRadius:6, color: "var(--text-dark)", padding:"3px 6px", fontSize:"0.8rem", cursor:"pointer" }}>
                          {["farmer","customer","agent","admin"].map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </td>
                      <td><span className={`badge ${u.isVerified?"badge-green":"badge-red"}`}>{u.isVerified?"✅":"⏳"}</span></td>
                      <td style={{ color:"var(--text-muted)", fontSize:"0.78rem" }}>{new Date(u.createdAt).toLocaleDateString("en-IN")}</td>
                      <td>
                        {u.role !== "admin" && (
                          <>
                            <button className="btn-warn" style={{ padding:"0.35rem 0.75rem", fontSize:"0.78rem", marginRight:"0.5rem" }} onClick={() => fineUser(u._id, u.name)}>💸 Fine</button>
                            <button className="btn-danger" style={{ padding:"0.35rem 0.75rem", fontSize:"0.78rem" }} onClick={() => deleteUser(u._id, u.name)}>🗑️</button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── USER VERIFICATION ── */}
          {tab === "verification" && (
            <div>
              {pendingUsersList.length === 0 ? (
                <div className="glass-card text-center" style={{ padding:"3rem" }}>
                  <p style={{ fontSize:"3rem" }}>✅</p>
                  <p style={{ color: "var(--text-muted)", marginTop:"1rem" }}>All users are verified! No pending requests.</p>
                </div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:"1rem" }}>
                  {pendingUsersList.map(({ user: u, farmerProfile, agentProfile, photos }) => (
                    <div className="glass-card" key={u._id} style={{ display:"flex", flexDirection: "column", gap:"1rem" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:"1rem" }}>
                        <div style={{ flex:1, minWidth:200 }}>
                          <h3 style={{ color: "var(--text-dark)", fontWeight:700 }}>
                            {u.name} <span className="badge badge-yellow ml-2">{u.role.toUpperCase()}</span>
                          </h3>
                          <p style={{ color: "var(--text-muted)", fontSize:"0.82rem" }}>{u.email} • {u.phone || "No phone"}</p>
                          <p style={{ color:"var(--text-muted)", fontSize:"0.78rem" }}>📍 {u.location || "No location"}</p>
                          {u.aadhaar && <p style={{ color:"var(--text-muted)", fontSize:"0.78rem" }}>🪪 Aadhaar: {u.aadhaar}</p>}
                          <p style={{ color:"var(--text-muted)", fontSize:"0.72rem" }}>Joined: {new Date(u.createdAt).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" })}</p>
                        </div>
                        <div style={{ display:"flex", gap:"0.75rem", flexWrap: "wrap" }}>
                          {photos && Object.entries(photos).map(([key, url]) => {
                            if (!url) return null;
                            const label = key.replace("Photo", "").replace(/([A-Z])/g, ' $1').trim();
                            return (
                              <div key={key} style={{ textAlign: "center" }}>
                                <img src={url.startsWith('http') || url.startsWith('data:') ? url : `${BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`} alt={label} style={{ width: 100, height: 100, objectFit: "cover", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.2)", background: "var(--green-light)" }} />
                                <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.2rem", textTransform: "capitalize" }}>{label}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <div style={{ display:"flex", gap:"0.75rem", justifyContent: "flex-end", marginTop: "1rem" }}>
                        <button className="btn-primary" style={{ width:"auto", padding:"0.6rem 1.25rem" }} onClick={() => verifyFarmer(u._id, u.name)}>
                          ✅ Approve
                        </button>
                        <button className="btn-danger" style={{ width: "auto", padding:"0.6rem 1.25rem" }} onClick={() => rejectFarmer(u._id, u.name)}>
                          ❌ Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── FARM TOURS VERIFICATION ── */}
          {tab === "tours" && (
            <div>
              <h3 className="section-title mb-3">🚜 Pending Farm Tour Approvals</h3>
              {pendingTours.length === 0 ? (
                <div className="glass-card text-center" style={{ padding:"3rem" }}>
                  <p style={{ fontSize:"3rem" }}>✅</p>
                  <p style={{ color: "var(--text-muted)", marginTop:"1rem" }}>All requested farm tours have been verified!</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {pendingTours.map((farmer) => (
                    <div className="glass-card" key={farmer._id} style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
                      <div>
                        <h4 style={{ color: "var(--text-dark)", fontSize: "1.2rem", marginBottom: "0.2rem" }}>{farmer.user?.name}</h4>
                        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: 0 }}>📍 {farmer.farmLocation || farmer.user?.location || "No Location Provided"}</p>
                        <div style={{ marginTop: "0.5rem" }}>
                          <span className="badge badge-yellow">Price: ₹{farmer.farmTourPrice}</span>
                        </div>
                        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "0.5rem", fontStyle: "italic", maxWidth: "600px" }}>
                          "{farmer.farmTourDetails || "No details provided by the farmer."}"
                        </p>
                      </div>
                      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                        <button className="btn-primary" style={{ padding: "0.5rem 1rem" }} onClick={async () => {
                          try { await API.put(`/tours/verify/${farmer._id}`, { verified: true }); loadAll(); setMsg({ type: "success", text: "Farm Tour Approved!" }); } catch { setMsg({ type: "error", text: "Failed to verify tour." }); }
                        }}>✅ Approve</button>
                        <button className="btn-danger" style={{ padding: "0.5rem 1rem" }} onClick={async () => {
                          try { await API.put(`/tours/settings/${farmer.user?._id}`, { farmTourEnabled: false }); loadAll(); setMsg({ type: "success", text: "Farm Tour Rejected." }); } catch { setMsg({ type: "error", text: "Failed to reject tour." }); }
                        }}>❌ Reject</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── ORDERS ── */}
          {tab === "orders" && (
            <div className="glass-card" style={{ overflowX:"auto" }}>
              <table className="rs-table">
                <thead>
                  <tr>
                    <th>Order ID</th><th>Crop</th><th>Customer</th>
                    <th>Qty</th><th>Amount</th><th>Type</th><th>Payment</th><th>Status</th><th>Agent</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map(o => (
                    <tr key={o._id}>
                      <td style={{ fontSize:"0.75rem", color:"var(--text-muted)" }}>#{o.billNumber || o._id.substring(0,8).toUpperCase()}</td>
                      <td><strong style={{ color: "var(--text-dark)" }}>{o.crop?.name || "—"}</strong></td>
                      <td style={{ color: "var(--text-muted)", fontSize:"0.85rem" }}>{o.customer?.name || "—"}</td>
                      <td style={{ color: "var(--text-dark)" }}>{o.quantity}</td>
                      <td style={{ color:"var(--yellow-wheat)", fontWeight:700 }}>₹{(o.totalAmount||0).toLocaleString()}</td>
                      <td><span className={`badge ${o.deliveryType==="farm_pickup"?"badge-green":"badge-blue"}`}>{o.deliveryType==="farm_pickup"?"🏡 Farm":"🚚 Delivery"}</span></td>
                      <td><span className="badge badge-blue">{o.paymentMode||"cod"}</span></td>
                      <td>
                        <select value={o.status} onChange={(e) => updateOrderStatus(o._id, e.target.value)}
                          style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(82,183,136,0.25)", borderRadius:6, color: "var(--text-dark)", padding:"3px 6px", fontSize:"0.78rem", cursor:"pointer" }}>
                          {["pending","confirmed","processing","assigned","picked_up","in_transit","delivered","cancelled"].map(s =>
                            <option key={s} value={s}>{s.replace("_"," ")}</option>
                          )}
                        </select>
                      </td>
                      <td style={{ fontSize:"0.78rem", color: o.agent ? "var(--green-light)" : "var(--text-muted)" }}>
                        {o.agent?.name || "None"}
                      </td>
                      <td>
                        {!o.agent && o.deliveryType !== "farm_pickup" && (
                          <button className="btn-warn" style={{ fontSize:"0.72rem", padding:"0.3rem 0.5rem" }} onClick={() => setAssignModal(o)}>
                            🚚 Assign
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── DELIVERY MANAGEMENT ── */}
          {tab === "deliveries" && (
            <div>
              <h3 className="section-title mb-2">📦 Orders Needing Delivery Assignment</h3>
              {needsDelivery.length === 0 ? (
                <div className="glass-card text-center" style={{ padding:"2rem" }}>
                  <p style={{ color: "var(--text-muted)" }}>✅ All delivery orders have been assigned!</p>
                </div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:"1rem", marginBottom:"2rem" }}>
                  {needsDelivery.map(o => (
                    <div className="glass-card" key={o._id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:"1rem" }}>
                      <div>
                        <h4 style={{ color: "var(--text-dark)" }}>#{o.billNumber || o._id.substring(0,8).toUpperCase()} — {o.crop?.name}</h4>
                        <p style={{ color: "var(--text-muted)", fontSize:"0.82rem" }}>Customer: {o.customer?.name} • ₹{(o.totalAmount||0).toLocaleString()}</p>
                        <p style={{ color:"var(--text-muted)", fontSize:"0.78rem" }}>📍 {o.deliveryAddress?.substring(0,50) || "No address"}</p>
                      </div>
                      <button className="btn-primary" style={{ width:"auto" }} onClick={() => setAssignModal(o)}>🚚 Assign Agent</button>
                    </div>
                  ))}
                </div>
              )}

              <h3 className="section-title mb-2 mt-3">📋 Active Deliveries</h3>
              <div className="glass-card" style={{ overflowX:"auto" }}>
                <table className="rs-table">
                  <thead><tr><th>Tracking</th><th>Agent</th><th>Pickup</th><th>Deliver To</th><th>Status</th><th>Date</th></tr></thead>
                  <tbody>
                    {filteredDeliveries.map(d => (
                      <tr key={d._id}>
                        <td style={{ color:"var(--yellow-wheat)", fontSize:"0.82rem", fontWeight:600 }}>{d.trackingCode || "—"}</td>
                        <td style={{ color: "var(--text-dark)" }}>{d.agent?.name || "—"}</td>
                        <td style={{ color:"var(--text-muted)", fontSize:"0.78rem" }}>{d.pickupLocation?.substring(0,30) || "—"}</td>
                        <td style={{ color:"var(--text-muted)", fontSize:"0.78rem" }}>{d.deliveryLocation?.substring(0,30) || "—"}</td>
                        <td><span className={`badge ${d.status==="delivered"?"badge-green":d.status==="in_transit"?"badge-blue":"badge-yellow"}`}>{d.status?.replace("_"," ")}</span></td>
                        <td style={{ color:"var(--text-muted)", fontSize:"0.75rem" }}>{new Date(d.createdAt).toLocaleDateString("en-IN")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── FINANCIAL LEDGER ── */}
          {tab === "financials" && (
            <AdminFinancials />
          )}

          {/* ── PROFIT MANAGEMENT ── */}
          {tab === "profit" && (
            <div>
              <div className="admin-stats-row">
                <div className="earnings-card">
                  <div className="earnings-value">₹{(stats.totalRevenue || 0).toLocaleString()}</div>
                  <div className="earnings-label">Total Revenue</div>
                </div>
                <div className="earnings-card">
                  <div className="earnings-value">₹{(stats.totalPlatformFees || 0).toLocaleString()}</div>
                  <div className="earnings-label">Platform Fees (5%)</div>
                </div>
                <div className="earnings-card">
                  <div className="earnings-value">₹{(stats.totalDeliveryCharges || 0).toLocaleString()}</div>
                  <div className="earnings-label">Delivery Revenue</div>
                </div>
                <div className="earnings-card">
                  <div className="earnings-value">₹{(stats.platformProfit || 0).toLocaleString()}</div>
                  <div className="earnings-label">Net Platform Profit</div>
                </div>
              </div>

              <div className="glass-card mt-3">
                <h3 className="section-title">📊 Revenue Breakdown by Category</h3>
                {stats.revenueByCategory && Object.entries(stats.revenueByCategory).length > 0 ? (
                  Object.entries(stats.revenueByCategory).map(([cat, rev]) => {
                    const pct = stats.totalRevenue ? Math.round((rev / stats.totalRevenue) * 100) : 0;
                    return (
                      <div key={cat} style={{ marginBottom:"1rem" }}>
                        <div className="flex-between" style={{ marginBottom:"0.3rem" }}>
                          <span style={{ color: "var(--text-dark)", fontSize:"0.9rem", textTransform:"capitalize" }}>{cat}</span>
                          <span style={{ color:"var(--yellow-wheat)", fontWeight:700 }}>₹{rev.toLocaleString()} ({pct}%)</span>
                        </div>
                        <div style={{ height:8, background:"rgba(255,255,255,0.1)", borderRadius:4, overflow:"hidden" }}>
                          <div style={{ height:"100%", width:`${pct}%`, background:"var(--gradient-btn)", borderRadius:4, transition:"width 0.5s ease" }}></div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p style={{ color:"var(--text-muted)" }}>No revenue data yet.</p>
                )}
              </div>
            </div>
          )}

          {/* ── SECURITY & RULES ── */}
          {tab === "security" && (
            <div>
              <h3 className="section-title mb-2">🚨 Misuse & Mismatch Reports</h3>
              {reports.length === 0 ? (
                <div className="glass-card text-center text-muted p-4">No reports found.</div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:"1rem" }}>
                  {reports.map(r => (
                    <div key={r._id} className="glass-card">
                      <div className="flex-between mb-2">
                        <strong style={{ color:"var(--red-light)" }}>Order #{r.billNumber} Mismatch</strong>
                        <span className={`badge ${r.reportResolution==="pending"?"badge-yellow":r.reportResolution==="penalized"?"badge-red":"badge-green"}`}>
                          {r.reportResolution?.toUpperCase()}
                        </span>
                      </div>
                      <p style={{ fontSize:"0.85rem", color:"var(--text-muted)" }}>Agent reported: {r.agentReportReason}</p>
                      <p style={{ fontSize:"0.85rem", color: "var(--text-muted)" }}>Farmer: {r.farmer?.name}</p>
                      
                      {r.reportResolution === "pending" && (
                        <div style={{ marginTop:"1rem", display:"flex", gap:"0.5rem" }}>
                          <button className="btn-danger" style={{ width:"auto" }} onClick={async () => {
                            try {
                              await API.put(`/reports/${r._id}/penalize`, { penaltyPoints: 50, adminId: user._id });
                              flash("success", "Farmer penalized."); loadAll();
                            } catch(e) { flash("error", "Error penalizing."); }
                          }}>Penalize Farmer</button>
                          
                          <button className="btn-secondary" style={{ width:"auto" }} onClick={async () => {
                            try {
                              await API.put(`/reports/${r._id}/dismiss`, { adminId: user._id });
                              flash("success", "Report dismissed."); loadAll();
                            } catch(e) { flash("error", "Error dismissing."); }
                          }}>Dismiss</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <h3 className="section-title mb-2 mt-4">👮 Platform Guidelines & Verification</h3>
              <div className="glass-card mb-3" style={{ background: "rgba(34, 197, 94, 0.05)", borderLeft: "4px solid var(--green-primary)" }}>
                <h4 style={{ color: "var(--green-light)", marginBottom: "0.5rem" }}>Community Guidelines & Enforcement</h4>
                <ul style={{ color: "var(--text-dark)", fontSize: "0.85rem", paddingLeft: "1.2rem", margin: 0, display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                  <li><strong>Farmers:</strong> Must accurately list crop quality, quantity, and organic/pesticide-free status. Fake certifications or misleading photos warrant a strike.</li>
                  <li><strong>Agents:</strong> Must upload genuine photos of the farm and the market upon pickup/delivery. Tampering with products or delayed deliveries without reason warrant a strike.</li>
                  <li><strong>Customers:</strong> Must not abuse the return policy or initiate fake COD orders. Repeated offenses lead to suspension.</li>
                </ul>
              </div>

              <h3 className="section-title mb-2">User Trust & Strike Management</h3>
              <div className="glass-card" style={{ overflowX:"auto" }}>
                <table className="rs-table">
                  <thead><tr><th>User</th><th>Role</th><th>Status</th><th>Trust / Delivery Score</th><th>Strikes</th><th>Action</th></tr></thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u._id}>
                        <td style={{ color: "var(--text-dark)" }}>
                          {u.name}
                          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{u.phone || u.email}</div>
                        </td>
                        <td style={{ color: "var(--text-muted)", textTransform: "capitalize" }}>{u.role}</td>
                        <td><span className={`badge ${u.accountStatus==="active"?"badge-green":u.accountStatus==="suspended"?"badge-yellow":"badge-red"}`}>{u.accountStatus}</span></td>
                        <td>
                          {u.role === "agent" ? (
                            <span style={{ color: u.deliveryScore > 80 ? "var(--green-light)" : "var(--yellow-wheat)" }}>{u.deliveryScore || 0}/100 Delivery</span>
                          ) : (
                            <span style={{ color: u.trustScore > 80 ? "var(--green-light)" : "var(--yellow-wheat)" }}>{u.trustScore || 85}/100 Trust</span>
                          )}
                        </td>
                        <td style={{ color: u.strikes > 0 ? "var(--red-light)" : "var(--text-muted)", fontWeight: "bold" }}>{u.strikes || 0}</td>
                        <td>
                          {u.accountStatus !== "banned" ? (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                              <button className="btn-warn" style={{ fontSize:"0.65rem", padding:"0.2rem 0.4rem", width: "auto" }} onClick={async () => {
                                const reason = prompt(`Reason for striking ${u.name}?`);
                                if (!reason) return;
                                try { await API.put(`/admin/users/${u._id}/strike`, { reason }); flash("success", `Strike added`); loadAll(); } catch(e) { flash("error", "Error adding strike."); }
                              }}>+ Strike</button>
                              
                              <button className="btn-warn" style={{ fontSize:"0.65rem", padding:"0.2rem 0.4rem", width: "auto", background: "#d97706" }} onClick={async () => {
                                const reason = prompt(`Reason for deducting 20 points from ${u.name}? (Minor Fraud)`);
                                if (!reason) return;
                                try { await API.put(`/admin/users/${u._id}/deduct-points`, { amount: 20, reason }); flash("success", `Points deducted`); loadAll(); } catch(e) { flash("error", "Error deducting points."); }
                              }}>- Points</button>

                              <button className="btn-danger" style={{ fontSize:"0.65rem", padding:"0.2rem 0.4rem", width: "auto" }} onClick={async () => {
                                const reason = prompt(`Reason for deducting ₹500 from ${u.name}'s wallet? (Major Fraud)`);
                                if (!reason) return;
                                try { await API.put(`/admin/users/${u._id}/deduct-wallet`, { amount: 500, reason }); flash("success", `Wallet funds deducted`); loadAll(); } catch(e) { flash("error", "Error deducting wallet."); }
                              }}>- ₹500</button>
                              
                              {u.accountStatus === "active" && (
                                <button className="btn-secondary" style={{ fontSize:"0.65rem", padding:"0.2rem 0.4rem", width: "auto" }} onClick={async () => {
                                  if (confirm(`Suspend ${u.name}?`)) {
                                    try { await API.put(`/admin/users/${u._id}/status`, { status: "suspended" }); flash("success", "Account suspended."); loadAll(); } catch(e) { flash("error", "Error suspending."); }
                                  }
                                }}>Suspend</button>
                              )}

                              <button className="btn-danger" style={{ fontSize:"0.65rem", padding:"0.2rem 0.4rem", width: "auto", background: "#7f1d1d" }} onClick={async () => {
                                if (confirm(`PERMANENTLY BAN ${u.name}?`)) {
                                  try { await API.put(`/admin/users/${u._id}/status`, { status: "banned" }); flash("success", "User BANNED."); loadAll(); } catch(e) { flash("error", "Error banning."); }
                                }
                              }}>BAN</button>
                              
                              {u.accountStatus === "suspended" && (
                                <button className="btn-primary" style={{ fontSize:"0.65rem", padding:"0.2rem 0.4rem", width: "auto" }} onClick={async () => {
                                  try { await API.put(`/admin/users/${u._id}/status`, { status: "active" }); flash("success", "User restored."); loadAll(); } catch(e) { flash("error", "Error restoring."); }
                                }}>Restore</button>
                              )}
                            </div>
                          ) : (
                            <div style={{ display: "flex", gap: "0.5rem" }}>
                              <span style={{ color: "var(--red-light)", fontWeight: "bold", fontSize: "0.8rem" }}>BANNED</span>
                              <button className="btn-primary" style={{ fontSize:"0.65rem", padding:"0.2rem 0.4rem", width: "auto" }} onClick={async () => {
                                try { await API.put(`/admin/users/${u._id}/status`, { status: "active" }); flash("success", "User unbanned."); loadAll(); } catch(e) { flash("error", "Error unbanning."); }
                              }}>Unban</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── CROP LIFECYCLES ── */}
          {tab === "crops" && (
            <div className="admin-section">
              <h2 className="section-title mb-3">🌾 Crop Lifecycle Proofs</h2>
              <div className="glass-card">
                <table className="rs-table">
                  <thead><tr><th>Crop / Farmer</th><th>Current Stage</th><th>Latest Proof</th><th>Notes</th><th>Date</th></tr></thead>
                  <tbody>
                    {crops.filter(c => c.lifecycleUpdates && c.lifecycleUpdates.length > 0).map(c => {
                      const latestUpdate = c.lifecycleUpdates[c.lifecycleUpdates.length - 1];
                      return (
                        <tr key={c._id}>
                          <td>
                            <strong style={{ color: "var(--text-dark)" }}>{c.name}</strong>
                            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Farmer: {c.farmer?.name || "Unknown"}</div>
                          </td>
                          <td style={{ textTransform: "capitalize", color: "var(--yellow-wheat)" }}>{c.lifecycleStage}</td>
                          <td>
                            {latestUpdate.imageUrl ? (
                              <img src={latestUpdate.imageUrl} alt="Proof" style={{ width: "60px", height: "60px", objectFit: "cover", borderRadius: "8px", border: "1px solid var(--green-pale)" }} />
                            ) : (
                              <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>No image</span>
                            )}
                          </td>
                          <td style={{ color: "var(--text-dark)", fontSize: "0.85rem", maxWidth: "200px" }}>{latestUpdate.notes || "-"}</td>
                          <td style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>{new Date(latestUpdate.timestamp).toLocaleDateString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {crops.filter(c => c.lifecycleUpdates && c.lifecycleUpdates.length > 0).length === 0 && (
                  <p style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>No crop lifecycle updates found.</p>
                )}
              </div>
            </div>
          )}

          {/* ── SUPPORT TICKETS ── */}
          {tab === "support" && (
            <div>
              <h3 className="section-title mb-2">🎫 Support Tickets</h3>
              {tickets.length === 0 ? (
                <div className="glass-card text-center text-muted p-4">No support tickets found.</div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:"1rem" }}>
                  {tickets.map(t => (
                    <div key={t._id} className="glass-card">
                      <div className="flex-between mb-2">
                        <div>
                          <strong style={{ color: "var(--text-dark)" }}>{t.subject}</strong>
                          <span className="badge badge-blue ml-2">{t.priority}</span>
                        </div>
                        <span className={`badge ${t.status==="resolved"?"badge-green":t.status==="open"?"badge-red":"badge-yellow"}`}>
                          {t.status?.toUpperCase()}
                        </span>
                      </div>
                      <p style={{ fontSize:"0.85rem", color:"var(--text-muted)", marginBottom:"1rem" }}>{t.description}</p>
                      
                      <div style={{ background:"rgba(0,0,0,0.2)", padding:"1rem", borderRadius:"8px", marginBottom:"1rem" }}>
                        {t.responses.map((r, i) => (
                          <div key={i} style={{ marginBottom:"0.5rem" }}>
                            <strong style={{ color: "var(--text-muted)", fontSize:"0.8rem" }}>{r.senderName}: </strong>
                            <span style={{ color: "var(--text-dark)", fontSize:"0.85rem" }}>{r.message}</span>
                          </div>
                        ))}
                      </div>

                      {t.status !== "resolved" && (
                        <div style={{ display:"flex", gap:"0.5rem" }}>
                          <input id={`reply-${t._id}`} className="rs-input" style={{ flex:1 }} placeholder="Type reply..." />
                          <button className="btn-primary" style={{ width:"auto" }} onClick={async () => {
                            const val = document.getElementById(`reply-${t._id}`).value;
                            if (!val) return;
                            try {
                              await API.post(`/tickets/${t._id}/reply`, { sender: user._id, senderName: "Admin", message: val });
                              document.getElementById(`reply-${t._id}`).value = "";
                              flash("success", "Replied!"); loadAll();
                            } catch(e) { flash("error", "Error replying."); }
                          }}>Reply</button>
                          <button className="btn-secondary" style={{ width:"auto" }} onClick={async () => {
                            try {
                              await API.put(`/tickets/${t._id}/resolve`, { adminId: user._id });
                              flash("success", "Ticket resolved."); loadAll();
                            } catch(e) { flash("error", "Error."); }
                          }}>Resolve</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── BROADCAST TAB ── */}
          {tab === "broadcast" && (
            <div className="glass-card" style={{ maxWidth: 600, margin: "0 auto" }}>
              <h3 className="section-title">📢 Send Global Broadcast</h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "1.5rem" }}>
                Send a real-time notification to connected users. Provide targeted tips or urgent alerts.
              </p>
              
              <div className="grid-2 mb-2">
                <div className="form-group">
                  <label className="field-label">Target Audience</label>
                  <select className="rs-select" value={broadcastTarget} onChange={e => setBroadcastTarget(e.target.value)}>
                    <option value="all">All Users</option>
                    <option value="farmer">Farmers Only</option>
                    <option value="customer">Customers Only</option>
                    <option value="agent">Agents Only</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="field-label">Message Type</label>
                  <select className="rs-select" value={broadcastType} onChange={e => setBroadcastType(e.target.value)}>
                    <option value="general">Urgent / General Alert</option>
                    <option value="farming">Farming / Irrigation Tip</option>
                    <option value="health">Health / Nutritional Tip</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="field-label">Message</label>
                <textarea 
                  className="rs-input" 
                  rows="4" 
                  placeholder="e.g. Try using drip irrigation to save water this summer!..."
                  value={broadcastMsg}
                  onChange={(e) => setBroadcastMsg(e.target.value)}
                />
              </div>
              <button className="btn-primary mt-2" onClick={sendBroadcast}>
                📢 Send Broadcast Now
              </button>
            </div>
          )}

          {/* ── MLOPS TAB ── */}
          {tab === "mlops" && (
            <div className="glass-card mt-3">
              <h3 className="section-title">🤖 Machine Learning Operations (MLOps)</h3>
              <p style={{ color:"var(--text-muted)", fontSize:"0.85rem", marginBottom:"1rem" }}>
                Manually trigger retraining of the AI models using the latest live database parameters.
              </p>
              
              <div className="grid-3">
                <div className="glass-card-dark" style={{ textAlign: "center" }}>
                  <h4 style={{ color: "var(--yellow-wheat)" }}>Market Price Prediction</h4>
                  <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", minHeight:"40px" }}>Retrain using recent completed order prices and community intelligence data.</p>
                  <button className="btn-primary mt-2" onClick={() => handleRetrain('Price Model')}>
                    🔄 Retrain Model
                  </button>
                </div>
                
                <div className="glass-card-dark" style={{ textAlign: "center" }}>
                  <h4 style={{ color: "var(--blue-light)" }}>Fraud Detection Engine</h4>
                  <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", minHeight:"40px" }}>Analyze new transaction metadata and flagged reports.</p>
                  <button className="btn-primary mt-2" onClick={() => handleRetrain('Fraud Detection Model')}>
                    🔄 Retrain Model
                  </button>
                </div>

                <div className="glass-card-dark" style={{ textAlign: "center" }}>
                  <h4 style={{ color: "var(--green-light)" }}>Seasonality & Demand</h4>
                  <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", minHeight:"40px" }}>Update optimal planting/selling predictions based on current month & region.</p>
                  <button className="btn-primary mt-2" onClick={() => handleRetrain('Seasonality Model')}>
                    🔄 Retrain Model
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── FINANCIALS TAB ── */}
          {tab === "financials" && (
            <AdminFinancials />
          )}

          {/* ── GROWTH TIPS TAB ── */}
          {tab === "tips" && (
            <AdminTips stats={stats} />
          )}
        </>
      )}

      {/* ── ASSIGN AGENT MODAL ── */}
      {assignModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", backdropFilter:"blur(8px)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:"1rem" }}
          onClick={(e) => { if (e.target === e.currentTarget) setAssignModal(null); }}>
          <div className="glass-card-dark" style={{ maxWidth:480, width:"100%" }}>
            <h3 className="section-title">🚚 Assign Delivery Agent</h3>
            <p style={{ color: "var(--text-muted)", fontSize:"0.85rem", marginBottom:"1rem" }}>
              Order: <strong style={{ color:"var(--yellow-wheat)" }}>#{assignModal.billNumber || assignModal._id?.substring(0,8)}</strong> — {assignModal.crop?.name}
            </p>
            <p style={{ color:"var(--text-muted)", fontSize:"0.82rem", marginBottom:"1.5rem" }}>
              📍 Deliver to: {assignModal.deliveryAddress?.substring(0,60) || "No address"}
            </p>

            {agents.length === 0 ? (
              <p style={{ color:"var(--text-muted)" }}>No delivery agents registered yet.</p>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:"0.75rem" }}>
                {agents.map(a => {
                  const dist = getDistance(assignModal.deliveryLatitude, assignModal.deliveryLongitude, a.latitude, a.longitude);
                  const isNear = dist < 10;
                  return { ...a, dist, isNear };
                }).sort((a, b) => a.dist - b.dist).map(a => (
                  <div key={a._id} className="delivery-option" onClick={() => assignAgent(assignModal._id, a._id)}
                    style={{ 
                      display:"flex", justifyContent:"space-between", alignItems:"center",
                      border: a.isNear ? "1px solid var(--green-light)" : "1px solid rgba(255,255,255,0.1)",
                      background: a.isNear ? "rgba(34, 197, 94, 0.05)" : "transparent",
                      padding: "0.5rem", borderRadius: "8px", cursor: "pointer"
                    }}>
                    <div>
                      <h4 style={{ color: a.isNear ? "var(--green-light)" : "var(--cream)" }}>
                        {a.name} {a.isNear && "📍 (Best Match)"}
                      </h4>
                      <p>{a.phone || "No phone"} • {a.location?.substring(0,25) || "No location"}</p>
                      {a.dist !== Infinity ? (
                        <p style={{ color:"var(--yellow-wheat)", fontSize:"0.75rem", marginTop:"0.2rem" }}>
                          🛣️ ~{a.dist.toFixed(1)} km away from delivery location
                        </p>
                      ) : (
                        <p style={{ color:"var(--text-muted)", fontSize:"0.75rem", marginTop:"0.2rem" }}>
                          📍 Unknown exact distance
                        </p>
                      )}
                    </div>
                    <button className="btn-primary" style={{ width:"auto", padding:"0.5rem 1rem", fontSize:"0.82rem" }}>Assign</button>
                  </div>
                ))}
              </div>
            )}

            <button className="btn-secondary mt-2" style={{ width:"100%" }} onClick={() => setAssignModal(null)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

