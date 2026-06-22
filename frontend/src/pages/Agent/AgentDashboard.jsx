import { BASE_URL } from '../../api/api';
import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useLang } from "../../context/LangContext";
import { useVoiceInput } from "../../utils/useVoiceInput";
import AutoSuggestInput from "../../components/AutoSuggestInput";
import API from "../../api/api";
import { io } from "socket.io-client";
import AgentLiveMap from "../../components/AgentLiveMap";
import AgentFinancialLedger from "./AgentFinancialLedger";
const STATUS_STEPS = ["assigned","picked_up","in_transit","delivered"];
const STATUS_ICONS = { assigned:"📋", picked_up:"📦", in_transit:"🚚", delivered:"✅", failed:"❌" };
const STATUS_LABELS = { assigned:"Assigned", picked_up:"Picked Up", in_transit:"In Transit", delivered:"Delivered", failed:"Failed" };

function haversineDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const SmartETA = ({ agentLat, agentLng, destLat, destLng, orderSizeKg }) => {
  const [etaData, setEtaData] = useState(null);

  useEffect(() => {
    if (!agentLat || !destLat) return;
    API.post("/ml/predict-eta", { agentLat, agentLng, destLat, destLng, orderSizeKg })
      .then(res => setEtaData(res.data))
      .catch(err => console.error("ETA error", err));
  }, [agentLat, agentLng, destLat, destLng, orderSizeKg]);

  if (!etaData) return null;

  return (
    <div style={{ marginTop: "0.5rem", padding: "0.5rem", background: "rgba(255,255,255,0.05)", borderRadius: "8px", fontSize: "0.75rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ color: "var(--text-dark)" }}>⏱️ <strong>{etaData.estimatedTimeMins} mins</strong> ({etaData.distanceKm} km)</span>
        {etaData.riskLevel !== "Low" && (
          <span style={{ color: etaData.riskLevel === "High" ? "#ef4444" : "#f59e0b", fontWeight: 600 }}>
            ⚠️ {etaData.riskLevel} Risk
          </span>
        )}
      </div>
      {etaData.riskReason && <div style={{ color: "var(--text-muted)", marginTop: "0.2rem" }}>{etaData.riskReason}</div>}
    </div>
  );
};

const AgentTips = () => {
  const tips = [
    "📦 Handle organic produce carefully—avoid crushing soft fruits.",
    "⛽ Plan your routes to minimize fuel consumption and delivery time.",
    "📸 Always take clear photos for AI verification to maintain a high Trust Score.",
    "❄️ Use insulated bags for dairy or highly perishable crops.",
    "🛡️ Keep your app location tracking on so customers and admins can monitor ETA accurately.",
    "🛵 Perform weekly maintenance checks on your vehicle to avoid sudden breakdowns during transit."
  ];
  return (
    <div className="glass-card mt-3">
      <h3 className="section-title">💡 Smart Delivery Tips</h3>
      <p style={{ color:"var(--text-muted)", fontSize:"0.85rem", marginBottom:"1rem" }}>Boost your delivery score and efficiency with these daily tips:</p>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
        {tips.map((t, i) => (
          <div key={i} style={{ background: "rgba(34, 197, 94, 0.05)", padding: "1rem", borderRadius: "8px", border: "1px solid rgba(34, 197, 94, 0.1)" }}>
            {t}
          </div>
        ))}
      </div>
    </div>
  );
};

export default function AgentDashboard() {
  const { user } = useAuth();
  const { t, lang } = useLang();

  const [tab, setTab] = useState("my");
  const [deliveries, setDeliveries] = useState([]);
  const [available, setAvailable] = useState([]);
  const [earnings, setEarnings] = useState({ totalDeliveries:0, totalEarnings:0, todayDeliveries:0, perDeliveryAvg:0 });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [filter, setFilter] = useState("all");
  const [msg, setMsg] = useState({ type:"", text:"" });
  const [search, setSearch] = useState("");
  const [routeData, setRouteData] = useState(null);
  const [optimizing, setOptimizing] = useState(false);
  const [agentPos, setAgentPos] = useState(null);
  const [radiusFilter, setRadiusFilter] = useState("");
  const { listening, activeField, interim, startListening } = useVoiceInput(lang || "en");

  useEffect(() => { 
    loadAll();
    const socket = io(BASE_URL);
    socket.on("delivery_assigned", () => loadAll());
    socket.on("delivery_updated", () => loadAll());
    socket.on("order_created", () => fetchAvailable());

    let watchId;
    if (navigator.geolocation && user) {
      // Get initial position first to populate immediately
      navigator.geolocation.getCurrentPosition((pos) => setAgentPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }));
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setAgentPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          socket.emit("agent_location_update", {
            agentId: user._id,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            timestamp: Date.now()
          });
        },
        (err) => console.log("Location watch error:", err),
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
      );
    }

    return () => {
      socket.disconnect();
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [user]);

  const loadAll = () => {
    fetchDeliveries();
    fetchAvailable();
    fetchEarnings();
  };

  const fetchDeliveries = async () => {
    setLoading(true);
    try {
      const res = await API.get(`/delivery/agent/${user?._id}`);
      setDeliveries(res.data);
    } catch {} finally { setLoading(false); }
  };

  const fetchAvailable = async () => {
    try {
      const q = agentPos ? `?lat=${agentPos.lat}&lng=${agentPos.lng}` : "";
      const res = await API.get(`/delivery/available${q}`);
      setAvailable(res.data);
    } catch {}
  };

  useEffect(() => {
    if (tab === "available") fetchAvailable();
  }, [agentPos?.lat, agentPos?.lng, tab]);

  const fetchEarnings = async () => {
    try {
      const res = await API.get(`/delivery/earnings/${user?._id}`);
      setEarnings(res.data);
    } catch {}
  };

  const updateAgentLocation = async (orderId) => {
    if (!agentPos) {
      setMsg({ type: "error", text: "Location not available. Please wait for GPS to connect." });
      return;
    }
    try {
      setUpdating(orderId);
      await API.put(`/orders/${orderId}/live-location`, { lat: agentPos.lat, lng: agentPos.lng });
      setMsg({ type: "success", text: "📍 Location updated successfully on the server." });
    } catch (e) {
      setMsg({ type: "error", text: "Failed to update live location." });
    } finally {
      setUpdating(null);
      setTimeout(() => setMsg({ type:"", text:"" }), 3000);
    }
  };

  const generateOtp = async (d) => {
    setUpdating(d._id);
    try {
      await API.post(`/delivery/${d._id}/generate-otp`);
      setMsg({ type:"success", text:"🔑 OTP generated and sent to customer!" });
    } catch (err) {
      setMsg({ type:"error", text: err.response?.data?.error || "Failed to generate OTP." });
    } finally {
      setUpdating(null);
      setTimeout(() => setMsg({ type:"", text:"" }), 3000);
    }
  };

  const updateStatus = async (d, status) => {
    setUpdating(d._id);
    try {
      if (status === "delivered") {
        const otp = prompt("Enter the 6-digit OTP sent to the customer:");
        if (!otp) {
          setUpdating(null);
          return;
        }
        await API.post(`/delivery/${d._id}/verify-otp`, { otp });
      }
      await API.put(`/delivery/${d._id}/status`, { status });
      setMsg({ type:"success", text:`✅ Status updated to "${STATUS_LABELS[status]}"` });
      loadAll();
    } catch (err) {
      setMsg({ type:"error", text: err.response?.data?.error || "Failed to update status." });
    } finally {
      setUpdating(null);
      setTimeout(() => setMsg({ type:"", text:"" }), 3000);
    }
  };

  const verifyProduct = async (orderId) => {
    try {
      await API.put(`/orders/${orderId}/verify-product`);
      setMsg({ type:"success", text:"✅ Product verified successfully." });
      loadAll();
    } catch (e) { setMsg({ type:"error", text:"Failed to verify product." }); }
  };

  const reportMismatch = async (orderId) => {
    const reason = prompt("Enter reason for product mismatch:");
    if (!reason) return;
    try {
      await API.put(`/orders/${orderId}/report-mismatch`, { reason });
      setMsg({ type:"error", text:"🚨 Mismatch reported. Admin notified." });
      loadAll();
    } catch (e) { setMsg({ type:"error", text:"Failed to report mismatch." }); }
  };

  const uploadPhoto = async (deliveryId, type, file) => {
    setUpdating(deliveryId);
    try {
      const formData = new FormData();
      formData.append("photo", file);
      formData.append("type", type);
      await API.put(`/delivery/${deliveryId}/photo`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setMsg({ type:"success", text:`📸 ${type === "pickup" ? "Pickup" : "Delivery"} photo uploaded successfully!` });
      loadAll();
    } catch (err) {
      setMsg({ type:"error", text:"Failed to upload photo." });
    } finally {
      setUpdating(null);
      setTimeout(() => setMsg({ type:"", text:"" }), 3000);
    }
  };

  const runAIVerification = async (deliveryId) => {
    setUpdating(deliveryId);
    setMsg({ type:"info", text:"🤖 Running AI Vision Verification... Please wait." });
    try {
      const res = await API.post(`/ai/verify-delivery`, { deliveryId });
      if (res.data.result === "match") {
        setMsg({ type:"success", text:"✅ AI Verification Passed! Products match perfectly." });
      } else {
        setMsg({ type:"error", text:`🚨 AI Fraud Alert: ${res.data.notes}` });
      }
      loadAll();
    } catch (err) {
      setMsg({ type:"error", text: err.response?.data?.error || "AI Verification failed." });
    } finally {
      setUpdating(null);
      setTimeout(() => setMsg({ type:"", text:"" }), 6000);
    }
  };

  const runPickupVerification = async (deliveryData) => {
    setUpdating(deliveryData._id);
    setMsg({ type:"info", text:"🤖 Verifying Pickup Photo vs Marketplace Image..." });
    try {
      const orderId = deliveryData.order?._id || deliveryData.order;
      const res = await API.post(`/ai/verify-pickup`, { orderId, pickupPhotoUrl: deliveryData.pickupPhoto });
      if (res.data.result === "match") {
        setMsg({ type:"success", text:"✅ AI Verification Passed! Farm pickup matches marketplace product." });
      } else {
        setMsg({ type:"error", text:`🚨 AI Fraud Alert: ${res.data.notes}` });
      }
      loadAll();
    } catch (err) {
      setMsg({ type:"error", text: err.response?.data?.error || "Verification failed." });
    } finally {
      setUpdating(null);
      setTimeout(() => setMsg({ type:"", text:"" }), 6000);
    }
  };

  const handleOptimizeRoute = async () => {
    if (!agentPos) {
      setMsg({ type: "error", text: "Wait for GPS location before optimizing." });
      return;
    }
    const pending = deliveries.filter(d => d.status === "assigned" || d.status === "in_transit" || d.status === "picked_up");
    if (pending.length === 0) {
      setMsg({ type: "error", text: "No pending deliveries to optimize." });
      return;
    }
    
    setOptimizing(true);
    try {
      const payload = {
        agentLocation: { lat: agentPos.lat, lng: agentPos.lng },
        deliveries: pending.map(d => ({
          _id: d._id,
          pickupLocation: { lat: d.pickupLatitude || 0, lng: d.pickupLongitude || 0, address: d.pickupLocation },
          deliveryLocation: { lat: d.deliveryLatitude || 0, lng: d.deliveryLongitude || 0, address: d.deliveryLocation },
          status: d.status
        }))
      };
      const res = await API.post("/ml/route-optimize", payload);
      setRouteData(res.data);
      setMsg({ type: "success", text: "📍 Route Optimized Successfully!" });
    } catch (e) {
      setMsg({ type: "error", text: "Failed to optimize route." });
    } finally {
      setOptimizing(false);
    }
  };

  const acceptOrder = async (orderId) => {
    setUpdating(orderId);
    try {
      await API.post(`/delivery/accept/${orderId}`, { agentId: user?._id });
      setMsg({ type:"success", text:"✅ Delivery accepted! Check your deliveries tab." });
      loadAll();
      setTab("my");
    } catch (err) {
      setMsg({ type:"error", text: err.response?.data?.error || "Failed to accept." });
    } finally {
      setUpdating(null);
      setTimeout(() => setMsg({ type:"", text:"" }), 3000);
    }
  };

  const nextStatus = (current) => {
    const idx = STATUS_STEPS.indexOf(current);
    return idx < STATUS_STEPS.length - 1 ? STATUS_STEPS[idx + 1] : null;
  };

  const optimizeRoute = async () => {
    if (!agentPos) {
      setMsg({ type: "error", text: "Waiting for GPS location..." });
      return;
    }
    const activeDeliveries = deliveries.filter(d => ["assigned", "picked_up", "in_transit"].includes(d.status));
    if (activeDeliveries.length < 2) {
      setMsg({ type: "info", text: "Need at least 2 active deliveries to optimize." });
      return;
    }

    setOptimizing(true);
    setMsg({ type: "info", text: "🗺️ Calculating optimal route using AI..." });
    try {
      const res = await API.post("/ml/route-optimize", { 
        agentLat: agentPos.lat, 
        agentLng: agentPos.lng, 
        orders: activeDeliveries 
      });
      setRouteData(res.data);
      setMsg({ type: "success", text: `✅ Route optimized! Shortest path calculated.` });
    } catch (err) {
      setMsg({ type: "error", text: "Failed to optimize route." });
    } finally {
      setOptimizing(false);
    }
  };

  const lowerSearch = search.toLowerCase();
  const filteredDeliveries = deliveries.filter(d => 
    d.trackingCode?.toLowerCase().includes(lowerSearch) || 
    d.order?.crop?.name?.toLowerCase().includes(lowerSearch) ||
    d.deliveryLocation?.toLowerCase().includes(lowerSearch)
  );

  let filteredAvailable = available.filter(o => 
    o.crop?.name?.toLowerCase().includes(lowerSearch) ||
    o.deliveryAddress?.toLowerCase().includes(lowerSearch) ||
    o.customer?.name?.toLowerCase().includes(lowerSearch)
  );

  if (radiusFilter && agentPos) {
    const maxDist = Number(radiusFilter);
    filteredAvailable = filteredAvailable.filter(o => {
      const cLat = o.farmer?.latitude || o.crop?.latitude;
      const cLng = o.farmer?.longitude || o.crop?.longitude;
      const dist = haversineDistance(agentPos.lat, agentPos.lng, cLat, cLng);
      return dist !== null && dist <= maxDist;
    });
  }

  const filtered = filter === "all"
    ? filteredDeliveries
    : filteredDeliveries.filter(d => d.status === filter);

  const counts = STATUS_STEPS.reduce((acc, s) => {
    acc[s] = filteredDeliveries.filter(d => d.status === s).length;
    return acc;
  }, {});

  return (
    <div className="page-wrapper">
      <div className="flex-between mb-3" style={{ flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 className="page-title" style={{ textAlign:"left", fontSize:"1.8rem" }}>
            🚚 {t("welcome")}, {user?.name?.split(" ")[0] || "Agent"}
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize:"0.85rem" }}>Manage deliveries & accept new orders</p>
        </div>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ minWidth: 250 }}>
            <AutoSuggestInput
               value={search}
               onChange={setSearch}
               placeholder="🔍 Search deliveries, crops..."
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

      {/* Earnings & Trust Row */}
      <div className="grid-5 mb-3" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem" }}>
        <div className="earnings-card">
          <div className="earnings-value">₹{earnings.totalEarnings?.toLocaleString() || 0}</div>
          <div className="earnings-label">Total Earnings</div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">📦</span>
          <div className="stat-value">{earnings.totalDeliveries || 0}</div>
          <div className="stat-label">Completed</div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">📅</span>
          <div className="stat-value">{earnings.todayDeliveries || 0}</div>
          <div className="stat-label">Today</div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">💰</span>
          <div className="stat-value">₹{earnings.perDeliveryAvg || 0}</div>
          <div className="stat-label">Avg/Delivery</div>
        </div>
        <div className="stat-card" style={{ background: "rgba(22, 163, 74, 0.05)", border: "1px solid var(--green-mid)" }}>
          <span className="stat-icon">🛡️</span>
          <div className="stat-value" style={{ color: "var(--green-mid)" }}>{earnings.trustScore?.score || 100}</div>
          <div className="stat-label">Trust Score ({earnings.trustScore?.rating || 5.0} ⭐)</div>
        </div>
      </div>

      {msg.text && <div className={`alert alert-${msg.type} mb-2`}>{msg.text}</div>}

      {/* Tabs */}
      <div className="tab-bar mb-3">
        {[
          { k:"my", l:"📦 My Deliveries" },
          { k:"available", l:"🚚 Available Orders" },
          { k:"earnings", l:"💰 Earnings" },
          { k:"tips", l:"💡 Smart Tips" }
        ].map(tb => (
          <button key={tb.k} className={`tab-btn ${tab===tb.k?"active":""}`} onClick={() => setTab(tb.k)}>
            {tb.l}
          </button>
        ))}
      </div>

      {tab === "my" && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem" }}>
          <button className="btn-primary" onClick={optimizeRoute} disabled={optimizing || deliveries.filter(d=>["assigned", "picked_up", "in_transit"].includes(d.status)).length < 2} style={{ width:"100%", background: "linear-gradient(135deg, #eab308, #ca8a04)", border: "none" }}>
            {optimizing ? `🔄 Optimizing...` : `🗺️ Smart Route Optimize`}
          </button>
        </div>
      )}

      {routeData && tab === "my" && (
        <div className="glass-card mb-3" style={{ background:"var(--green-pale)", border:"1px solid var(--green-mid)" }}>
            <h3 style={{ color:"var(--green-deep)", marginBottom:"0.5rem" }}>{t("routeGenerated")}</h3>
            <p style={{ color:"var(--green-mid)", fontSize:"0.9rem", marginBottom:"1rem" }}>
              {t("totalDistance")}: {parseFloat(routeData.totalDistance).toFixed(2)} km
            </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "center" }}>
            {routeData.optimizedRoute.map((stop, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <div style={{ background: "var(--gradient-btn)", color: "white", padding: "0.5rem 1rem", borderRadius: "8px", fontSize: "0.85rem", fontWeight: 600 }}>
                  {i+1}. {stop.action} at {stop.location}
                </div>
                {i < routeData.optimizedRoute.length - 1 && <span style={{ color: "var(--text-muted)" }}>➡️</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── MY DELIVERIES ── */}
      {tab === "my" && (
        <>
          {/* Filter tabs */}
          <div className="tab-bar mb-3" style={{ background:"transparent", padding:0 }}>
            {[{ k:"all", l:"📦 All" }, ...STATUS_STEPS.map(s => ({ k:s, l:`${STATUS_ICONS[s]} ${STATUS_LABELS[s]} (${counts[s]||0})` }))].map(tb => (
              <button key={tb.k} className={`tab-btn ${filter===tb.k?"active":""}`} onClick={() => setFilter(tb.k)} style={{ flex:"none", padding:"0.5rem 0.85rem", fontSize:"0.78rem" }}>
                {tb.l}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="loader-wrapper"><div className="loader"></div><p className="loader-text">{t("loading")}</p></div>
          ) : filtered.length === 0 ? (
            <div className="glass-card text-center" style={{ padding:"3rem" }}>
              <p style={{ fontSize:"3rem" }}>📭</p>
              <p style={{ color: "var(--text-muted)", marginTop:"1rem" }}>No deliveries in this category. Check "Available" tab for new orders!</p>
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:"1.25rem" }}>
              {filtered.map(d => {
                const next = nextStatus(d.status);
                const stepIdx = STATUS_STEPS.indexOf(d.status);
                const order = d.order;

                return (
                  <div className="glass-card" key={d._id} style={{ padding:"1.5rem" }}>
                    <div className="flex-between mb-2">
                      <div>
                        <h3 style={{ color: "var(--text-dark)", fontWeight:700 }}>
                          {d.trackingCode || `#${d._id.substring(0,8).toUpperCase()}`}
                        </h3>
                        {order?.crop && <p style={{ color:"var(--yellow-wheat)", fontSize:"0.88rem" }}>🌾 {order.crop.name} — {order.quantity} {order.crop.unit||"kg"}</p>}
                        <p style={{ color:"var(--text-muted)", fontSize:"0.78rem", marginTop:"0.2rem" }}>
                          {new Date(d.createdAt).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" })}
                        </p>
                      </div>
                      <span className={`badge ${d.status==="delivered"?"badge-green":d.status==="in_transit"?"badge-blue":d.status==="failed"?"badge-red":"badge-yellow"}`}>
                        {STATUS_ICONS[d.status]} {STATUS_LABELS[d.status]}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="delivery-progress mb-2">
                      {STATUS_STEPS.map((s, i) => (
                        <div key={s} style={{ display:"flex", alignItems:"center", flex:1 }}>
                          <div style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
                            <div className={`dp-circle ${i < stepIdx ? "done" : i === stepIdx ? "active" : ""}`}>
                              {STATUS_ICONS[s]}
                            </div>
                            <span className="dp-label" style={{ fontSize:"0.6rem", marginTop:"0.3rem" }}>{STATUS_LABELS[s]}</span>
                          </div>
                          {i < STATUS_STEPS.length - 1 && (
                            <div className={`dp-line ${i < stepIdx ? "done" : ""}`} style={{ flex:1, height:2, margin:"0 4px", marginBottom:"1.2rem" }}></div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Info grid */}
                    <div className="grid-2" style={{ gap:"0.75rem", marginBottom:"1rem" }}>
                      {d.pickupLocation && (
                        <div style={{ background:"rgba(255,255,255,0.05)", borderRadius:"var(--radius-sm)", padding:"0.75rem" }}>
                          <p style={{ fontSize:"0.72rem", color: "var(--text-muted)", marginBottom:"0.2rem" }}>📤 PICKUP FROM</p>
                          <p style={{ fontSize:"0.85rem", color: "var(--text-dark)" }}>{d.pickupLocation.substring(0,50)}</p>
                        </div>
                      )}
                      {d.deliveryLocation && (
                        <div style={{ background:"rgba(255,255,255,0.05)", borderRadius:"var(--radius-sm)", padding:"0.75rem" }}>
                          <p style={{ fontSize:"0.72rem", color: "var(--text-muted)", marginBottom:"0.2rem" }}>📍 DELIVER TO</p>
                          <p style={{ fontSize:"0.85rem", color: "var(--text-dark)" }}>{d.deliveryLocation.substring(0,50)}</p>
                        </div>
                      )}
                      {order?.customer && (
                        <div style={{ background:"rgba(255,255,255,0.05)", borderRadius:"var(--radius-sm)", padding:"0.75rem" }}>
                          <p style={{ fontSize:"0.72rem", color: "var(--text-muted)", marginBottom:"0.2rem" }}>👤 CUSTOMER</p>
                          <p style={{ fontSize:"0.85rem", color: "var(--text-dark)" }}>{order.customer.name} {order.customer.phone ? `• ${order.customer.phone}` : ""}</p>
                        </div>
                      )}
                      {order?.totalAmount && (
                        <div style={{ background:"rgba(255,255,255,0.05)", borderRadius:"var(--radius-sm)", padding:"0.75rem" }}>
                          <p style={{ fontSize:"0.72rem", color: "var(--text-muted)", marginBottom:"0.2rem" }}>💰 ORDER VALUE</p>
                          <p style={{ fontSize:"0.85rem", color:"var(--yellow-wheat)", fontWeight:700 }}>₹{order.totalAmount.toLocaleString()}</p>
                        </div>
                      )}
                    </div>

                    {d.status === "in_transit" && agentPos && d.deliveryLatitude && (
                      <SmartETA 
                        agentLat={agentPos.lat} agentLng={agentPos.lng} 
                        destLat={d.deliveryLatitude} destLng={d.deliveryLongitude}
                        orderSizeKg={order?.quantity || 10}
                      />
                    )}

                    {(d.status === "assigned" || d.status === "picked_up" || d.status === "in_transit") && (
                      <div style={{ marginBottom: "1rem" }}>
                        <AgentLiveMap agentPos={agentPos} deliveryData={d} />
                        <button 
                          className="btn-secondary mt-2" 
                          style={{ width: "100%", fontSize: "0.85rem" }}
                          disabled={updating === d._id || !agentPos}
                          onClick={() => updateAgentLocation(order?._id)}
                        >
                          {updating === d._id ? "Updating..." : "📍 Update Current Location"}
                        </button>
                      </div>
                    )}

                    {/* Actions */}
                    {d.status !== "delivered" && d.status !== "failed" && next && (
                      <div style={{ display: "flex", gap: "0.5rem", width: "100%" }}>
                        {d.status === "in_transit" && (
                          <button 
                            className="btn-secondary" 
                            style={{ flex: 1 }}
                            disabled={updating === d._id} 
                            onClick={() => generateOtp(d)}
                          >
                            🔑 Gen OTP
                          </button>
                        )}
                        <button
                          className="btn-primary"
                          style={{ flex: 2 }}
                          disabled={updating === d._id}
                          onClick={() => updateStatus(d, next)}
                        >
                          {updating === d._id ? t("loading") : `${STATUS_ICONS[next]} Mark as ${STATUS_LABELS[next]}`}
                        </button>
                      </div>
                    )}

                    {/* AI Photo Verification Layer */}
                    <div className="mt-2" style={{ background:"rgba(255,255,255,0.05)", padding:"1rem", borderRadius:"var(--radius-sm)", border:"1px solid rgba(255,255,255,0.1)" }}>
                      <h4 style={{ color: "var(--text-dark)", marginBottom:"0.5rem", fontSize:"0.9rem", display:"flex", alignItems:"center", gap:"0.3rem" }}>
                        🤖 AI Visual Verification
                      </h4>
                      
                      <div className="grid-2" style={{ gap:"0.5rem", marginBottom: (d.pickupPhoto && d.deliveryPhoto) ? "1rem" : "0" }}>
                        {/* Pickup Photo */}
                        <div>
                          {!d.pickupPhoto && d.status === "assigned" ? (
                            <label className="btn-secondary" style={{ display:"block", textAlign:"center", padding:"0.5rem", cursor:"pointer", fontSize:"0.8rem" }}>
                              📸 Capture Pickup
                              <input type="file" accept="image/*" capture="environment" hidden onChange={(e) => {
                                if (e.target.files[0]) uploadPhoto(d._id, "pickup", e.target.files[0]);
                              }} />
                            </label>
                          ) : d.pickupPhoto ? (
                            <>
                              <div style={{ color:"var(--green-light)", fontSize:"0.8rem", textAlign:"center", padding:"0.5rem", background:"rgba(34,197,94,0.1)", borderRadius:"4px" }}>✅ Pickup Captured</div>
                              {d.status === "assigned" && (
                                <button 
                                  className="btn-warn w-100" 
                                  style={{ marginTop: "0.5rem", padding: "0.4rem", fontSize: "0.75rem" }}
                                  onClick={() => runPickupVerification(d)}
                                  disabled={updating === d._id}
                                >
                                  🔍 Verify vs Marketplace
                                </button>
                              )}
                            </>
                          ) : (
                            <div style={{ color:"var(--text-muted)", fontSize:"0.8rem", textAlign:"center", padding:"0.5rem" }}>Pickup Pending</div>
                          )}
                        </div>

                        {/* Delivery Photo */}
                        <div>
                          {!d.deliveryPhoto && (d.status === "picked_up" || d.status === "in_transit") ? (
                            <label className="btn-secondary" style={{ display:"block", textAlign:"center", padding:"0.5rem", cursor:"pointer", fontSize:"0.8rem" }}>
                              📸 Capture Delivery
                              <input type="file" accept="image/*" capture="environment" hidden onChange={(e) => {
                                if (e.target.files[0]) uploadPhoto(d._id, "delivery", e.target.files[0]);
                              }} />
                            </label>
                          ) : d.deliveryPhoto ? (
                            <div style={{ color:"var(--green-light)", fontSize:"0.8rem", textAlign:"center", padding:"0.5rem", background:"rgba(34,197,94,0.1)", borderRadius:"4px" }}>✅ Delivery Captured</div>
                          ) : (
                            <div style={{ color:"var(--text-muted)", fontSize:"0.8rem", textAlign:"center", padding:"0.5rem" }}>Delivery Pending</div>
                          )}
                        </div>
                      </div>

                      {/* AI Verification Action */}
                      {d.pickupPhoto && d.deliveryPhoto && d.aiVerificationResult === "pending" && (
                        <button 
                          className="btn-primary w-100" 
                          style={{ background: "linear-gradient(135deg, #8b5cf6, #6d28d9)", border:"none" }}
                          onClick={() => runAIVerification(d._id)}
                          disabled={updating === d._id}
                        >
                          {updating === d._id ? "Verifying..." : "🔍 Run AI Authenticity Check"}
                        </button>
                      )}

                      {/* AI Verification Results */}
                      {d.aiVerificationResult === "match" && (
                        <div style={{ color:"#22c55e", fontSize:"0.85rem", marginTop:"0.5rem", display:"flex", alignItems:"center", gap:"0.3rem" }}>
                          <span style={{ fontSize:"1.2rem" }}>✅</span> AI Verified Match: Authentic Crop
                        </div>
                      )}
                      
                      {d.aiVerificationResult === "mismatch" && (
                        <div style={{ color:"#ef4444", fontSize:"0.85rem", marginTop:"0.5rem" }}>
                          <div style={{ display:"flex", alignItems:"center", gap:"0.3rem", fontWeight:700 }}>
                            <span style={{ fontSize:"1.2rem" }}>🚨</span> AI Fraud Alert: Product Mismatch
                          </div>
                          <p style={{ marginTop:"0.2rem", color:"var(--text-muted)" }}>{d.aiVerificationNotes}</p>
                        </div>
                      )}
                    </div>

                    {d.status === "delivered" && (
                      <div className="alert alert-success" style={{ marginTop:0 }}>
                        ✅ Delivery completed successfully!
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── AVAILABLE ORDERS ── */}
      {tab === "available" && (
        <div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem", gap: "1rem", alignItems: "center" }}>
            <span style={{ fontSize: "0.85rem", color: "var(--green-deep)", fontWeight: 600 }}>📍 Radius Filter:</span>
            <select className="rs-select" style={{ width: "auto", padding: "0.4rem 1rem", fontSize: "0.85rem" }} value={radiusFilter} onChange={(e) => setRadiusFilter(e.target.value)}>
              <option value="">Any Distance</option>
              <option value="5">Within 5 km</option>
              <option value="10">Within 10 km</option>
              <option value="25">Within 25 km</option>
              <option value="50">Within 50 km</option>
            </select>
          </div>
          {filteredAvailable.length === 0 ? (
            <div className="glass-card text-center" style={{ padding:"3rem" }}>
              <p style={{ fontSize:"3rem" }}>🔍</p>
              <p style={{ color: "var(--text-muted)", marginTop:"1rem" }}>No orders available for delivery right now. Check back soon!</p>
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:"1rem" }}>
              {filteredAvailable.map(o => (
                <div className="glass-card" key={o._id} style={{ padding:"1.5rem" }}>
                  <div className="flex-between mb-2">
                    <div>
                      <h3 style={{ color: "var(--text-dark)", fontWeight:700 }}>🌾 {o.crop?.name || "Order"}</h3>
                      <p style={{ color: "var(--text-muted)", fontSize:"0.85rem" }}>
                        {o.quantity} {o.crop?.unit||"kg"} • ₹{(o.totalAmount||0).toLocaleString()}
                      </p>
                    </div>
                    <span className="badge badge-yellow">⏳ Needs Delivery</span>
                  </div>

                  <div className="grid-2" style={{ gap:"0.75rem", marginBottom:"1rem" }}>
                    <div style={{ background:"rgba(255,255,255,0.05)", borderRadius:"var(--radius-sm)", padding:"0.75rem" }}>
                      <p style={{ fontSize:"0.72rem", color: "var(--text-muted)", marginBottom:"0.2rem" }}>📤 PICKUP</p>
                      <p style={{ fontSize:"0.85rem", color: "var(--text-dark)" }}>{o.farmer?.location?.substring(0,40) || o.crop?.location?.substring(0,40) || "Farm"}</p>
                    </div>
                    <div style={{ background:"rgba(255,255,255,0.05)", borderRadius:"var(--radius-sm)", padding:"0.75rem" }}>
                      <p style={{ fontSize:"0.72rem", color: "var(--text-muted)", marginBottom:"0.2rem" }}>📍 DELIVER TO</p>
                      <p style={{ fontSize:"0.85rem", color: "var(--text-dark)" }}>{o.deliveryAddress?.substring(0,40) || "Customer"}</p>
                    </div>
                    <div style={{ background:"rgba(255,255,255,0.05)", borderRadius:"var(--radius-sm)", padding:"0.75rem" }}>
                      <p style={{ fontSize:"0.72rem", color: "var(--text-muted)", marginBottom:"0.2rem" }}>👤 CUSTOMER</p>
                      <p style={{ fontSize:"0.85rem", color: "var(--text-dark)" }}>{o.customer?.name || "—"}</p>
                    </div>
                    <div style={{ background:"rgba(255,255,255,0.05)", borderRadius:"var(--radius-sm)", padding:"0.75rem" }}>
                      <p style={{ fontSize:"0.72rem", color: "var(--text-muted)", marginBottom:"0.2rem" }}>💰 DELIVERY FEE</p>
                      <p style={{ fontSize:"0.85rem", color:"var(--yellow-wheat)", fontWeight:700 }}>₹{o.deliveryCharges || 30}</p>
                    </div>
                  </div>

                  <button className="btn-primary" onClick={() => acceptOrder(o._id)} disabled={updating === o._id}>
                    {updating === o._id ? "Accepting..." : "✅ Accept This Delivery"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "earnings" && (
        <AgentFinancialLedger deliveries={deliveries} />
      )}

      {/* ── POLICIES TAB ── */}
      {tab === "policies" && (
        <div className="glass-card">
          <h3 className="section-title">📜 Delivery Agent Policies & Guidelines</h3>
          <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem" }}>
            Please adhere to the following rules to ensure a secure and trustworthy marketplace. Violations may result in account suspension.
          </p>
          <div className="grid-2">
            <div style={{ background: "rgba(37, 99, 235, 0.05)", padding: "1.25rem", borderRadius: "12px", border: "1px solid rgba(37, 99, 235, 0.2)" }}>
              <h4 style={{ color: "#2563eb", marginBottom: "0.5rem" }}>🚚 Timely Delivery</h4>
              <p style={{ fontSize: "0.85rem", color: "var(--text-mid)" }}>Only accept orders you can deliver within the stipulated timeframe. Consistent delays will lower your assignment priority.</p>
            </div>
            <div style={{ background: "rgba(22, 163, 74, 0.05)", padding: "1.25rem", borderRadius: "12px", border: "1px solid rgba(22, 163, 74, 0.2)" }}>
              <h4 style={{ color: "var(--green-deep)", marginBottom: "0.5rem" }}>✅ Verification is Mandatory</h4>
              <p style={{ fontSize: "0.85rem", color: "var(--text-mid)" }}>You must verify the product quality and quantity against the order details at pickup. Use the "Verify Match" or "Report Mismatch" buttons.</p>
            </div>
            <div style={{ background: "rgba(225, 29, 72, 0.05)", padding: "1.25rem", borderRadius: "12px", border: "1px solid rgba(225, 29, 72, 0.2)" }}>
              <h4 style={{ color: "#e11d48", marginBottom: "0.5rem" }}>🚨 Misuse of Information</h4>
              <p style={{ fontSize: "0.85rem", color: "var(--text-mid)" }}>Customer and Farmer details (phone, address) are strictly for delivery purposes. Misuse will lead to immediate termination.</p>
            </div>
            <div style={{ background: "rgba(217, 119, 6, 0.05)", padding: "1.25rem", borderRadius: "12px", border: "1px solid rgba(217, 119, 6, 0.2)" }}>
              <h4 style={{ color: "#d97706", marginBottom: "0.5rem" }}>📍 Location Tracking</h4>
              <p style={{ fontSize: "0.85rem", color: "var(--text-mid)" }}>You must allow GPS tracking while on duty. This provides transparency to the customer and ensures your safety.</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

