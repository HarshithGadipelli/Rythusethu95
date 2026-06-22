import { BASE_URL } from '../../api/api';
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, Star, Package, CheckCircle, Clock, MapPin } from "lucide-react";
import API from "../../api/api";
import LiveMapModal from "../../components/LiveMapModal";
import AuthenticityCertificate from "../../components/AuthenticityCertificate";
import { useAuth } from "../../context/AuthContext";

export default function CustomerOrders({ orders, fetchOrders }) {
  const { user } = useAuth();
  const [reviewModal, setReviewModal] = useState(null);
  const [rating, setRating] = useState(5);
  const [agentRating, setAgentRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");
  const [trackingOrder, setTrackingOrder] = useState(null);
  const [certificateOrder, setCertificateOrder] = useState(null);
  const [cancelModal, setCancelModal] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [subscriptions, setSubscriptions] = useState([]);

  useEffect(() => {
    fetchSubscriptions();
  }, [user]);

  const fetchSubscriptions = async () => {
    if (!user) return;
    try {
      const res = await API.get(`/boxes/user/${user._id}`);
      setSubscriptions(res.data || []);
    } catch (e) {
      console.error("Failed to fetch subscriptions", e);
    }
  };

  const toggleSubscription = async (id) => {
    try {
      await API.put(`/boxes/toggle/${id}`);
      fetchSubscriptions();
    } catch (e) {
      console.error(e);
    }
  };

  const submitReview = async () => {
    if (!reviewModal) return;
    setSubmitting(true);
    try {
      await API.post("/shop/reviews/add", {
        userId: user._id,
        cropId: reviewModal.crop._id,
        farmerId: typeof reviewModal.farmer === 'object' ? reviewModal.farmer._id : reviewModal.farmer,
        orderId: reviewModal._id,
        rating,
        comment
      });

      if (reviewModal.agent) {
        await API.post(`/delivery/rate-agent/${reviewModal._id}`, { rating: agentRating });
      }

      setMsg("Review submitted successfully! Thank you.");
      setTimeout(() => {
        setReviewModal(null);
        setMsg("");
        fetchOrders();
      }, 1500);
    } catch (err) {
      setMsg(err.response?.data?.message || "Failed to submit review");
    }
    setSubmitting(false);
  };

  const handleCancelOrder = async () => {
    if (!cancelModal) return;
    setCancelling(true);
    try {
      await API.put(`/orders/${cancelModal._id}/cancel`, { userId: user._id });
      setMsg("Order cancelled successfully.");
      setTimeout(() => {
        setCancelModal(null);
        setMsg("");
        fetchOrders();
      }, 1500);
    } catch (err) {
      setMsg(err.response?.data?.error || "Failed to cancel order");
    }
    setCancelling(false);
  };

  return (
    <div className="customer-orders" style={{ paddingTop: "1rem" }}>
      <h2 style={{ color: "var(--text-dark)", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <Package size={24} color="var(--green-mid)" /> My Orders
      </h2>

      {orders.length === 0 ? (
        <div style={{ padding: "3rem", textAlign: "center", background: "white", borderRadius: "var(--radius-lg)" }}>
          <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>📦</div>
          <h3 style={{ color: "var(--text-mid)" }}>No orders yet!</h3>
          <p style={{ color: "var(--text-muted)" }}>Start exploring the marketplace to buy fresh crops.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "1rem" }}>
          {orders.map(o => (
            <div key={o._id} style={{ 
              background: "white", padding: "1.5rem", borderRadius: "var(--radius-md)", 
              border: "1px solid #e2e8f0", display: "flex", flexWrap: "wrap", gap: "1.5rem", justifyContent: "space-between", alignItems: "center" 
            }}>
              <div style={{ display: "flex", gap: "1.5rem", alignItems: "center" }}>
                <div style={{ width: 80, height: 80, borderRadius: "12px", background: "var(--green-pale)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem" }}>
                  {o.crop?.image ? <img src={`${BASE_URL}${o.crop.image}`} style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:"12px"}} alt=""/> : "🌿"}
                </div>
                <div>
                  <h3 style={{ margin: "0 0 0.25rem", color: "var(--text-dark)", fontSize: "1.2rem" }}>{o.cropName || o.crop?.name}</h3>
                  <p style={{ margin: "0 0 0.5rem", color: "var(--text-muted)", fontSize: "0.9rem" }}>
                    {o.quantity} {o.unit || "kg"} • ₹{o.totalAmount}
                  </p>
                    <div style={{ width: "100%", marginTop: "1rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative", marginBottom: "0.5rem" }}>
                        <div style={{ position: "absolute", top: "10px", left: "10%", right: "10%", height: "2px", background: "#e2e8f0", zIndex: 0 }}></div>
                        
                        {/* Progress Line fill */}
                        {o.status !== "cancelled" && (
                          <div style={{ 
                            position: "absolute", top: "10px", left: "10%", 
                            width: o.status === "pending" ? "0%" 
                                 : o.status === "assigned" ? "25%" 
                                 : o.status === "picked_up" ? "50%" 
                                 : o.status === "in_transit" ? "75%" 
                                 : o.status === "delivered" ? "80%" : "0%",
                            height: "2px", background: "var(--green-mid)", zIndex: 0, transition: "width 0.5s ease" 
                          }}></div>
                        )}

                        {[
                          { key: "pending", label: "Pending" },
                          { key: "assigned", label: "Assigned" },
                          { key: "picked_up", label: "Under Pickup" },
                          { key: "in_transit", label: "In Transit" },
                          { key: "delivered", label: "Delivered" }
                        ].map((step, idx, arr) => {
                          const statusOrder = ["pending", "assigned", "picked_up", "in_transit", "delivered"];
                          const currentIdx = statusOrder.indexOf(o.status);
                          const isCompleted = currentIdx >= idx && o.status !== "cancelled";
                          const isCurrent = currentIdx === idx && o.status !== "cancelled";
                          
                          return (
                            <div key={step.key} style={{ display: "flex", flexDirection: "column", alignItems: "center", zIndex: 1, flex: 1 }}>
                              <div style={{ 
                                width: "20px", height: "20px", borderRadius: "50%", 
                                background: isCompleted ? "var(--green-mid)" : "#f1f5f9",
                                border: `2px solid ${isCompleted ? "var(--green-mid)" : "#cbd5e1"}`,
                                display: "flex", alignItems: "center", justifyContent: "center"
                              }}>
                                {isCompleted && <CheckCircle size={12} color="white" />}
                              </div>
                              <span style={{ 
                                fontSize: "0.75rem", marginTop: "0.4rem", 
                                color: isCurrent ? "var(--green-deep)" : isCompleted ? "var(--green-mid)" : "var(--text-muted)",
                                fontWeight: isCurrent ? 600 : 400, textAlign: "center"
                              }}>
                                {step.label}
                                {isCurrent && step.key === "in_transit" && <div style={{ fontSize: "0.7rem", color: "#d97706" }}>About to Deliver</div>}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {o.status === "cancelled" && (
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#dc2626", marginTop: "0.5rem", fontSize: "0.9rem", fontWeight: 600 }}>
                          <span className="badge" style={{ background: "#fee2e2", color: "#dc2626", margin: 0 }}>Cancelled</span> Order was cancelled.
                        </div>
                      )}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "1rem" }}>
                      <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                        <Clock size={12} /> {new Date(o.createdAt).toLocaleDateString()}
                      </span>
                    
                    {/* Payment Status Badge */}
                    <span className="badge" style={{ 
                      background: o.paymentStatus === "paid" ? "#dcfce7" : "#f1f5f9", 
                      color: o.paymentStatus === "paid" ? "#16a34a" : "#64748b",
                      border: `1px solid ${o.paymentStatus === "paid" ? "#bbf7d0" : "#e2e8f0"}`,
                      marginLeft: "0.5rem"
                    }}>
                      💳 {o.paymentStatus === "paid" ? "Paid" : "Cash on Delivery"}
                    </span>

                    {o.isPreBooking && o.crop?.expectedHarvestDate && (
                      <span className="badge" style={{ background: "#e0e7ff", color: "#4338ca", marginLeft: "0.5rem" }}>
                        📅 Expected: {new Date(o.crop.expectedHarvestDate).toLocaleDateString()}
                      </span>
                    )}

                    {o.crop && o.crop.lifecycleStage && (
                      <span className="badge" style={{ background: "#fef3c7", color: "#d97706", marginLeft: "0.5rem", textTransform: "capitalize" }}>
                        🌱 Stage: {o.crop.lifecycleStage.replace("_", " ")}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", alignItems: "flex-end" }}>
                {(o.status === "in_transit" || o.status === "assigned" || o.status === "picked_up") && (
                  <button onClick={() => setTrackingOrder(o)} className="btn-primary" style={{ padding: "0.6rem 1rem", fontSize: "0.9rem", display: "flex", gap: "0.5rem", alignItems: "center", background: "#2563eb" }}>
                    <MapPin size={16} /> Track Live
                  </button>
                )}

                {["pending", "assigned", "accepted"].includes(o.status) && (
                  <button onClick={() => setCancelModal(o)} className="btn-secondary" style={{ padding: "0.6rem 1rem", fontSize: "0.9rem", display: "flex", gap: "0.5rem", alignItems: "center", background: "#fee2e2", color: "#dc2626", border: "1px solid #fca5a5" }}>
                    ❌ Cancel Order
                  </button>
                )}
                
                {o.crop && (
                  <button onClick={() => setCertificateOrder(o)} className="btn-secondary" style={{ padding: "0.6rem 1rem", fontSize: "0.9rem", display: "flex", gap: "0.5rem", alignItems: "center", background: "rgba(34, 197, 94, 0.1)", color: "var(--green-deep)", border: "1px solid var(--green-pale)" }}>
                    📜 View Certificate
                  </button>
                )}
                
                {o.status === "delivered" && !o.reviewGiven && (
                  <button onClick={() => { setReviewModal(o); setRating(5); setAgentRating(5); setComment(""); setMsg(""); }} className="btn-secondary" style={{ padding: "0.6rem 1rem", fontSize: "0.9rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <Star size={16} /> Leave Review
                  </button>
                )}
                {o.reviewGiven && (
                  <span style={{ color: "var(--green-mid)", fontSize: "0.9rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.3rem" }}>
                    <Star size={16} fill="var(--green-mid)" /> Reviewed
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {subscriptions.length > 0 && (
        <div style={{ marginTop: "3rem" }}>
          <h3 style={{ color: "var(--text-dark)", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Package size={20} color="#8b5cf6" /> Manage Box Subscriptions
          </h3>
          <div style={{ display: "grid", gap: "1rem" }}>
            {subscriptions.map(s => (
              <div key={s._id} style={{ 
                background: "white", padding: "1.5rem", borderRadius: "var(--radius-md)", 
                border: "1px solid #e2e8f0", display: "flex", flexWrap: "wrap", gap: "1.5rem", justifyContent: "space-between", alignItems: "center" 
              }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: "1.1rem" }}>{s.boxType}</h4>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", margin: "0.2rem 0" }}>₹{s.price} / {s.frequency}</p>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: "0.2rem 0" }}>Next Delivery: {new Date(s.nextDeliveryDate).toLocaleDateString()}</p>
                </div>
                <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                  <span className={`badge ${s.status === "active" ? "badge-green" : "badge-yellow"}`}>
                    {s.status}
                  </span>
                  <button className="btn-secondary" onClick={() => toggleSubscription(s._id)}>
                    {s.status === "active" ? "Pause Subscription" : "Resume Subscription"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Review Modal */}
      <AnimatePresence>
        {reviewModal && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} style={{ background: "white", padding: "2rem", borderRadius: "var(--radius-lg)", width: "100%", maxWidth: "450px" }}>
              <h3 style={{ marginTop: 0, color: "var(--text-dark)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Star color="var(--yellow-wheat)" fill="var(--yellow-wheat)" /> Rate your order
              </h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
                How was the {reviewModal.cropName} from farmer? Your review helps calculate their Trust Score!
              </p>

              <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", justifyContent: "center" }}>
                {[1, 2, 3, 4, 5].map(star => (
                  <Star 
                    key={star} 
                    size={32} 
                    color={star <= rating ? "var(--yellow-wheat)" : "#cbd5e1"} 
                    fill={star <= rating ? "var(--yellow-wheat)" : "transparent"} 
                    style={{ cursor: "pointer", transition: "all 0.2s" }}
                    onClick={() => setRating(star)}
                  />
                ))}
              </div>

              {reviewModal.agent && (
                <>
                  <h3 style={{ marginTop: "1rem", color: "var(--text-dark)", display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "1.1rem" }}>
                    🚚 Rate Delivery Agent
                  </h3>
                  <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", justifyContent: "center" }}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <Star 
                        key={"agent"+star} 
                        size={28} 
                        color={star <= agentRating ? "var(--green-mid)" : "#cbd5e1"} 
                        fill={star <= agentRating ? "var(--green-mid)" : "transparent"} 
                        style={{ cursor: "pointer", transition: "all 0.2s" }}
                        onClick={() => setAgentRating(star)}
                      />
                    ))}
                  </div>
                </>
              )}

              <textarea 
                className="rs-input" 
                rows="4" 
                placeholder="Write your feedback..." 
                value={comment} 
                onChange={e => setComment(e.target.value)}
                style={{ marginBottom: "1rem" }}
              />

              {msg && <p style={{ color: msg.includes("success") ? "var(--green-mid)" : "red", fontSize: "0.9rem", marginBottom: "1rem", textAlign: "center" }}>{msg}</p>}

              <div style={{ display: "flex", gap: "1rem" }}>
                <button className="btn-secondary" onClick={() => setReviewModal(null)} style={{ flex: 1 }}>Cancel</button>
                <button className="btn-primary" onClick={submitReview} disabled={submitting} style={{ flex: 1 }}>
                  {submitting ? "Submitting..." : "Submit Review"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Cancel Order Modal */}
      <AnimatePresence>
        {cancelModal && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} style={{ background: "white", padding: "2rem", borderRadius: "var(--radius-lg)", width: "100%", maxWidth: "450px" }}>
              <h3 style={{ marginTop: 0, color: "#dc2626", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                ❌ Cancel Order
              </h3>
              
              {(() => {
                const isLate = (new Date() - new Date(cancelModal.createdAt)) / 60000 > 2;
                return (
                  <>
                    <p style={{ color: "var(--text-mid)", fontSize: "0.95rem", marginBottom: "1rem" }}>
                      Are you sure you want to cancel your order for <strong>{cancelModal.cropName || cancelModal.crop?.name}</strong>?
                    </p>
                    
                    {isLate ? (
                      <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", padding: "1rem", borderRadius: "8px", marginBottom: "1.5rem" }}>
                        <strong style={{ color: "#dc2626" }}>⚠️ Penalty Warning</strong>
                        <p style={{ margin: "0.5rem 0 0", color: "#991b1b", fontSize: "0.85rem" }}>
                          Since more than 2 minutes have passed since placing this order, a <strong>5% cancellation fee</strong> will be deducted from your refund/wallet to compensate the farmer and system overhead.
                        </p>
                      </div>
                    ) : (
                      <div style={{ background: "#dcfce7", border: "1px solid #86efac", padding: "1rem", borderRadius: "8px", marginBottom: "1.5rem" }}>
                        <strong style={{ color: "#16a34a" }}>✅ Free Cancellation</strong>
                        <p style={{ margin: "0.5rem 0 0", color: "#166534", fontSize: "0.85rem" }}>
                          You are cancelling within the 2-minute grace period. No fees will be charged.
                        </p>
                      </div>
                    )}
                  </>
                );
              })()}

              {msg && <p style={{ color: msg.includes("success") ? "var(--green-mid)" : "red", fontSize: "0.9rem", marginBottom: "1rem", textAlign: "center" }}>{msg}</p>}

              <div style={{ display: "flex", gap: "1rem" }}>
                <button className="btn-secondary" onClick={() => setCancelModal(null)} style={{ flex: 1 }}>Keep Order</button>
                <button className="btn-primary" onClick={handleCancelOrder} disabled={cancelling} style={{ flex: 1, background: "#dc2626", borderColor: "#dc2626" }}>
                  {cancelling ? "Cancelling..." : "Yes, Cancel"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {trackingOrder && (
        <LiveMapModal order={trackingOrder} onClose={() => setTrackingOrder(null)} />
      )}

      {certificateOrder && (
        <AuthenticityCertificate order={certificateOrder} onClose={() => setCertificateOrder(null)} />
      )}
    </div>
  );
}

