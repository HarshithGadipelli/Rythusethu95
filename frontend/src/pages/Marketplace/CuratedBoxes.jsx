import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import API from "../../api/api";
import { useAuth } from "../../context/AuthContext";
import { Package, ArrowLeft, CheckCircle, Leaf, Truck, Star } from "lucide-react";

export default function CuratedBoxes() {
  const { user } = useAuth();
  const [boxes, setBoxes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [subscribingTo, setSubscribingTo] = useState(null);
  
  // Custom Box State
  const [customBoxItems, setCustomBoxItems] = useState([]);
  const [availableCrops, setAvailableCrops] = useState([]);
  const [customFrequency, setCustomFrequency] = useState("weekly");
  const [showCustomBuilder, setShowCustomBuilder] = useState(false);

  // Hardcoded for MVP display purposes since backend route 'boxRoutes.js' implies subscription model
  const boxPlans = [
    {
      id: "box-veg-weekly",
      name: "Weekly Fresh Veggie Box",
      price: 499,
      frequency: "weekly",
      description: "A seasonal assortment of 5-7kg fresh organic vegetables directly from local farmers.",
      tags: ["Organic", "Farm Fresh"],
      popular: true
    },
    {
      id: "box-fruit-monthly",
      name: "Monthly Exotic Fruit Basket",
      price: 1499,
      frequency: "monthly",
      description: "Premium selection of seasonal and exotic fruits delivered fresh to your door every month.",
      tags: ["Premium", "Pesticide Free"],
      popular: false
    },
    {
      id: "box-staples-monthly",
      name: "Farmer's Staples Monthly",
      price: 999,
      frequency: "monthly",
      description: "Your monthly supply of grains, pulses, and spices straight from the mill.",
      tags: ["Bulk Savings", "Direct Trade"],
      popular: false
    }
  ];

  useEffect(() => {
    // In a real implementation, we would fetch from API.get("/boxes")
    const fetchCrops = async () => {
      try {
        const res = await API.get("/crops");
        // Get unique crops by name
        const unique = [];
        const seen = new Set();
        for (const c of res.data) {
          if (!seen.has(c.name) && c.quantity > 0 && c.isLive !== false) {
            seen.add(c.name);
            unique.push(c);
          }
        }
        setAvailableCrops(unique);
      } catch (e) {
        console.error("Failed to fetch crops for box builder");
      } finally {
        setLoading(false);
      }
    };
    fetchCrops();
  }, []);

  const toggleCustomItem = (crop) => {
    const exists = customBoxItems.find(i => i._id === crop._id);
    if (exists) {
      setCustomBoxItems(customBoxItems.filter(i => i._id !== crop._id));
    } else {
      if (customBoxItems.length >= 10) {
        setMsg({ type: "error", text: "You can select up to 10 items for a custom box." });
        return;
      }
      setCustomBoxItems([...customBoxItems, { ...crop, qty: 1 }]);
    }
  };

  const updateCustomItemQty = (id, change) => {
    setCustomBoxItems(customBoxItems.map(i => {
      if (i._id === id) {
        const newQty = Math.max(1, Math.min(10, i.qty + change));
        return { ...i, qty: newQty };
      }
      return i;
    }));
  };

  const customBoxTotal = customBoxItems.reduce((acc, item) => acc + (item.price * item.qty), 0);
  const customBoxDiscount = customBoxTotal > 1000 ? 0.1 : (customBoxTotal > 500 ? 0.05 : 0);
  const customBoxFinalPrice = customBoxTotal * (1 - customBoxDiscount);

  const handleSubscribe = async (plan) => {
    setSubscribingTo(plan.id);
    setMsg({ type: "", text: "" });
    try {
      // Typically calls API.post("/boxes/subscribe") but we simulate it for now 
      // if backend route isn't fully scaffolded for creation.
      setTimeout(() => {
        setMsg({ type: "success", text: `Successfully subscribed to ${plan.name}! Pay ₹${plan.price} on your first delivery (COD).` });
        setSubscribingTo(null);
      }, 1500);
    } catch (e) {
      setMsg({ type: "error", text: "Subscription failed. Please try again." });
      setSubscribingTo(null);
    }
  };

  return (
    <div className="container" style={{ padding: "2rem 1rem", minHeight: "80vh" }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: "2rem", gap: "1rem" }}>
        <Link to="/marketplace" className="btn-secondary" style={{ padding: "0.5rem", borderRadius: "50%" }}>
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="section-title" style={{ margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Package color="var(--primary)" /> Curated Farm Boxes
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", margin: 0 }}>
            Subscribe to fresh, organic produce delivered to your door on autopilot.
          </p>
        </div>
      </div>

      {msg.text && (
        <div style={{ padding: "1rem", borderRadius: "8px", marginBottom: "1.5rem", background: msg.type === "error" ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.1)", color: msg.type === "error" ? "var(--red-deep)" : "var(--green-deep)", border: `1px solid ${msg.type === "error" ? "rgba(239,68,68,0.3)" : "rgba(34,197,94,0.3)"}` }}>
          {msg.text}
        </div>
      )}

      <div className="grid-3" style={{ alignItems: "stretch" }}>
        {boxPlans.map(plan => (
          <div key={plan.id} className="glass-card" style={{ position: "relative", display: "flex", flexDirection: "column", border: plan.popular ? "2px solid var(--primary)" : "" }}>
            {plan.popular && (
              <div style={{ position: "absolute", top: "-12px", left: "50%", transform: "translateX(-50%)", background: "var(--primary)", color: "white", padding: "4px 12px", borderRadius: "12px", fontSize: "0.75rem", fontWeight: "bold", display: "flex", alignItems: "center", gap: "4px" }}>
                <Star size={12} fill="white" /> Most Popular
              </div>
            )}
            
            <div style={{ marginBottom: "1rem", textAlign: "center", marginTop: plan.popular ? "1rem" : "0" }}>
              <h3 style={{ fontSize: "1.3rem", color: "var(--text-dark)", marginBottom: "0.5rem" }}>{plan.name}</h3>
              <div style={{ fontSize: "2rem", fontWeight: "bold", color: "var(--primary)" }}>
                ₹{plan.price} <span style={{ fontSize: "1rem", color: "var(--text-muted)", fontWeight: "normal" }}>/{plan.frequency}</span>
              </div>
            </div>

            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", textAlign: "center", marginBottom: "1.5rem" }}>
              {plan.description}
            </p>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", justifyContent: "center", marginBottom: "1.5rem" }}>
              {plan.tags.map(tag => (
                <span key={tag} style={{ background: "var(--green-pale)", color: "var(--green-deep)", padding: "4px 10px", borderRadius: "12px", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "4px" }}>
                  <Leaf size={12} /> {tag}
                </span>
              ))}
            </div>

            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 2rem 0", flex: 1 }}>
              <li style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", fontSize: "0.9rem", color: "var(--text-dark)" }}>
                <CheckCircle size={16} color="var(--primary)" /> Directly from Farmers
              </li>
              <li style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", fontSize: "0.9rem", color: "var(--text-dark)" }}>
                <CheckCircle size={16} color="var(--primary)" /> Zero Preservatives
              </li>
              <li style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", fontSize: "0.9rem", color: "var(--text-dark)" }}>
                <Truck size={16} color="var(--primary)" /> Free Doorstep Delivery
              </li>
              <li style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", fontSize: "0.9rem", color: "var(--text-dark)" }}>
                <CheckCircle size={16} color="var(--primary)" /> Cancel Anytime
              </li>
            </ul>

            <button 
              className={plan.popular ? "btn-primary" : "btn-secondary"} 
              style={{ width: "100%", padding: "0.8rem", fontSize: "1rem", opacity: subscribingTo === plan.id ? 0.7 : 1 }}
              onClick={() => handleSubscribe(plan)}
              disabled={subscribingTo === plan.id}
            >
              {subscribingTo === plan.id ? "Processing..." : `Subscribe ${plan.frequency === "weekly" ? "Weekly" : "Monthly"}`}
            </button>
          </div>
        ))}
      </div>

      <div style={{ marginTop: "4rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h2 className="section-title" style={{ margin: 0 }}>🛠️ Build Your Own Box</h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", margin: 0 }}>Handpick your favorite organic items for a recurring delivery.</p>
          </div>
          <button className="btn-secondary" onClick={() => setShowCustomBuilder(!showCustomBuilder)}>
            {showCustomBuilder ? "Hide Builder" : "Start Building"}
          </button>
        </div>

        {showCustomBuilder && (
          <div className="glass-card" style={{ padding: "2rem" }}>
            {loading ? (
              <div className="loader" style={{ margin: "2rem auto" }}></div>
            ) : (
              <div className="grid-2">
                <div>
                  <h3 style={{ fontSize: "1.1rem", marginBottom: "1rem", color: "var(--green-deep)" }}>1. Select Fresh Produce</h3>
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", maxHeight: "400px", overflowY: "auto", paddingRight: "0.5rem" }} className="custom-scroll">
                    {availableCrops.map(c => {
                      const isSelected = customBoxItems.some(i => i._id === c._id);
                      return (
                        <div 
                          key={c._id} 
                          onClick={() => toggleCustomItem(c)}
                          style={{ 
                            background: isSelected ? "var(--green-mid)" : "white", 
                            color: isSelected ? "white" : "var(--text-dark)",
                            border: `1px solid ${isSelected ? "var(--green-mid)" : "#e2e8f0"}`,
                            padding: "0.5rem 1rem", borderRadius: "100px", cursor: "pointer",
                            fontSize: "0.85rem", transition: "all 0.2s",
                            display: "flex", alignItems: "center", gap: "0.5rem"
                          }}
                        >
                          {c.name} (₹{c.price}/{c.unit})
                          {isSelected && <CheckCircle size={14} color="white" />}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div style={{ background: "rgba(34, 197, 94, 0.05)", padding: "1.5rem", borderRadius: "12px", border: "1px dashed rgba(34, 197, 94, 0.3)" }}>
                  <h3 style={{ fontSize: "1.1rem", marginBottom: "1rem", color: "var(--text-dark)" }}>2. Customize Your Box</h3>
                  
                  {customBoxItems.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "2rem 0", color: "var(--text-muted)" }}>
                      <Package size={40} style={{ opacity: 0.3, marginBottom: "0.5rem" }} />
                      <p>Select items from the left to start building.</p>
                    </div>
                  ) : (
                    <>
                      <div style={{ maxHeight: "250px", overflowY: "auto", marginBottom: "1rem" }} className="custom-scroll">
                        {customBoxItems.map(item => (
                          <div key={item._id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                            <div>
                              <div style={{ fontWeight: 600 }}>{item.name}</div>
                              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>₹{item.price}/{item.unit}</div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                              <button style={{ background: "#f1f5f9", border: "none", width: 24, height: 24, borderRadius: "4px", cursor: "pointer" }} onClick={() => updateCustomItemQty(item._id, -1)}>-</button>
                              <span style={{ fontSize: "0.9rem", width: "20px", textAlign: "center" }}>{item.qty}</span>
                              <button style={{ background: "#f1f5f9", border: "none", width: 24, height: 24, borderRadius: "4px", cursor: "pointer" }} onClick={() => updateCustomItemQty(item._id, 1)}>+</button>
                            </div>
                            <div style={{ fontWeight: 600, width: "60px", textAlign: "right" }}>
                              ₹{item.price * item.qty}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="form-group mb-3">
                        <label className="field-label" style={{ fontSize: "0.85rem" }}>Delivery Frequency</label>
                        <select className="rs-select" value={customFrequency} onChange={e => setCustomFrequency(e.target.value)}>
                          <option value="weekly">Weekly Delivery</option>
                          <option value="biweekly">Bi-weekly (Every 14 days)</option>
                          <option value="monthly">Monthly Delivery</option>
                        </select>
                      </div>

                      <div style={{ background: "white", padding: "1rem", borderRadius: "8px", marginBottom: "1rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.3rem", fontSize: "0.9rem", color: "var(--text-muted)" }}>
                          <span>Subtotal:</span>
                          <span>₹{customBoxTotal}</span>
                        </div>
                        {customBoxDiscount > 0 && (
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.3rem", fontSize: "0.9rem", color: "var(--green-mid)" }}>
                            <span>Bundle Discount ({(customBoxDiscount * 100).toFixed(0)}%):</span>
                            <span>-₹{Math.round(customBoxTotal * customBoxDiscount)}</span>
                          </div>
                        )}
                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.5rem", paddingTop: "0.5rem", borderTop: "1px dashed #e2e8f0", fontWeight: "bold", fontSize: "1.2rem", color: "var(--primary)" }}>
                          <span>Total per Box:</span>
                          <span>₹{Math.round(customBoxFinalPrice)}</span>
                        </div>
                      </div>

                      <button 
                        className="btn-primary" 
                        style={{ width: "100%" }}
                        onClick={() => handleSubscribe({ id: "custom", name: "Custom Build Box", price: Math.round(customBoxFinalPrice), frequency: customFrequency })}
                        disabled={subscribingTo === "custom"}
                      >
                        {subscribingTo === "custom" ? "Processing..." : `Subscribe ${customFrequency.charAt(0).toUpperCase() + customFrequency.slice(1)}`}
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
