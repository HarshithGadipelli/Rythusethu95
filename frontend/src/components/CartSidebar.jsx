import React, { useState } from "react";
import { useCart } from "../context/CartContext";
import { X, Trash2, ShoppingCart, Plus, Minus, CreditCard } from "lucide-react";
import { useLang } from "../context/LangContext";
import API from "../api/api";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function CartSidebar() {
  const { cart, isCartOpen, setIsCartOpen, removeFromCart, updateQuantity, getCartTotal, clearCart } = useCart();
  const { t } = useLang();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState("");

  if (!isCartOpen) return null;

  const handleCheckout = async () => {
    if (!user) {
      navigate("/login");
      setIsCartOpen(false);
      return;
    }
    
    if (cart.length === 0) return;
    
    setCheckingOut(true);
    setError("");

    // Helper to calculate simple distance if coordinates exist
    const calcDist = (lat1, lon1, lat2, lon2) => {
      if (!lat1 || !lon1 || !lat2 || !lon2) return 5; // Default 5km if no location
      const R = 6371;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    try {
      const orderItems = cart.map(item => {
        const subtotal = item.crop.price * item.quantity;
        
        // Calculate Distance
        const distKm = calcDist(user.latitude, user.longitude, item.crop.latitude, item.crop.longitude);
        
        // Dynamic Delivery Fee: Base ₹20 + ₹5/km + ₹2/kg
        // Cap the distance at 50km for reasonable pricing, minimum 3km
        const effectiveDist = Math.max(3, Math.min(50, distKm));
        const deliveryCharges = Math.round(20 + (effectiveDist * 5) + (item.quantity * 2));

        return {
          cropId: item.crop._id,
          quantity: item.quantity,
          isPrebooked: item.isPrebooked,
          deliveryType: "standard",
          deliveryCharges: deliveryCharges,
          subtotal: subtotal,
          totalAmount: subtotal + deliveryCharges,
          deliveryAddress: user?.address || "Default Address",
          deliveryDistance: effectiveDist,
        };
      });

      const res = await API.post("/orders/checkout-multi", { 
        items: orderItems,
        customer: user._id,
        paymentMode: "cod"
      });
      
      clearCart();
      setIsCartOpen(false);
      navigate("/marketplace?tab=orders");
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "Checkout failed");
    } finally {
      setCheckingOut(false);
    }
  };

  return (
    <>
      <div 
        style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.5)", zIndex: 999998,
          backdropFilter: "blur(2px)"
        }}
        onClick={() => setIsCartOpen(false)}
      />
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: "100%", maxWidth: "400px",
        background: "white", zIndex: 999999, boxShadow: "-5px 0 25px rgba(0,0,0,0.1)",
        display: "flex", flexDirection: "column",
        transform: isCartOpen ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.3s ease-in-out"
      }}>
        {/* Header */}
        <div style={{ padding: "1.5rem", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--green-main)", color: "white" }}>
          <h2 style={{ display: "flex", alignItems: "center", gap: "0.5rem", margin: 0, fontSize: "1.25rem" }}>
            <ShoppingCart size={24} /> Your Cart
          </h2>
          <button onClick={() => setIsCartOpen(false)} style={{ background: "none", border: "none", color: "white", cursor: "pointer" }}>
            <X size={24} />
          </button>
        </div>

        {/* Cart Items */}
        <div style={{ flex: 1, overflowY: "auto", padding: "1rem" }}>
          {cart.length === 0 ? (
            <div style={{ textAlign: "center", color: "#888", marginTop: "3rem" }}>
              <ShoppingCart size={48} style={{ opacity: 0.2, margin: "0 auto 1rem" }} />
              <p>Your cart is empty.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {cart.map((item, idx) => (
                <div key={idx} style={{ display: "flex", gap: "1rem", padding: "1rem", borderRadius: "16px", background: "white", boxShadow: "0 4px 15px rgba(0,0,0,0.04)", border: "1px solid rgba(22,163,74,0.1)", position: "relative" }}>
                  <div style={{ width: "70px", height: "70px", borderRadius: "12px", overflow: "hidden", background: "#f1f5f9", flexShrink: 0, border: "1px solid rgba(0,0,0,0.05)" }}>
                    {item.crop.image ? (
                      <img src={item.crop.image} alt={item.crop.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.8rem" }}>🌾</div>
                    )}
                  </div>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                    <div style={{ fontWeight: "700", color: "var(--text-dark)", fontSize: "1.1rem", marginBottom: "0.2rem" }}>{item.crop.name}</div>
                    <div style={{ color: "var(--green-mid)", fontSize: "0.95rem", fontWeight: "600" }}>₹{item.crop.price} <span style={{color: "var(--text-muted)", fontSize:"0.8rem", fontWeight:"400"}}>/ {item.crop.unit || "kg"}</span></div>
                    {item.isPrebooked && (
                      <span style={{ display: "inline-block", background: "#fef08a", color: "#854d0e", fontSize: "0.7rem", padding: "3px 8px", borderRadius: "6px", marginTop: "6px", fontWeight: "bold", width: "fit-content" }}>Pre-booked</span>
                    )}
                    
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.75rem" }}>
                      <div style={{ display: "flex", alignItems: "center", border: "1px solid rgba(22,163,74,0.3)", borderRadius: "8px", overflow: "hidden", background: "rgba(22,163,74,0.05)" }}>
                        <button onClick={() => updateQuantity(item.crop._id, item.isPrebooked, item.quantity - 1)} style={{ padding: "6px 10px", background: "transparent", border: "none", cursor: "pointer", color: "var(--green-deep)", display: "flex", alignItems: "center" }}><Minus size={14}/></button>
                        <span style={{ padding: "0 8px", fontSize: "0.95rem", fontWeight: "700", color: "var(--green-deep)", minWidth: "24px", textAlign: "center" }}>{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.crop._id, item.isPrebooked, item.quantity + 1)} style={{ padding: "6px 10px", background: "transparent", border: "none", cursor: "pointer", color: "var(--green-deep)", display: "flex", alignItems: "center" }}><Plus size={14}/></button>
                      </div>
                      <button 
                        onClick={() => removeFromCart(item.crop._id, item.isPrebooked)}
                        style={{ marginLeft: "auto", background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "none", padding: "6px", borderRadius: "8px", cursor: "pointer", display: "flex" }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <div style={{ fontWeight: "bold", color: "var(--green-deep)" }}>
                    ₹{item.crop.price * item.quantity}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {cart.length > 0 && (
          <div style={{ padding: "1.5rem", background: "white", borderTop: "1px solid rgba(0,0,0,0.05)", boxShadow: "0 -10px 20px rgba(0,0,0,0.03)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", color: "var(--text-muted)", fontSize: "0.95rem" }}>
              <span>Items Total:</span>
              <span style={{ fontWeight: "600", color: "var(--text-dark)" }}>₹{getCartTotal()}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem", color: "var(--text-muted)", fontSize: "0.95rem" }}>
              <span>Est. Delivery:</span>
              <span style={{ fontWeight: "600", color: "var(--text-dark)" }}>Calculated at Checkout</span>
            </div>
            
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1.5rem", fontSize: "1.25rem", fontWeight: "800", color: "var(--green-deep)" }}>
              <span>Total:</span>
              <span>₹{getCartTotal()} <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: "400" }}>+ Del</span></span>
            </div>

            {error && <div style={{ color: "#ef4444", fontSize: "0.85rem", marginBottom: "1rem", textAlign: "center", background: "rgba(239,68,68,0.1)", padding: "8px", borderRadius: "8px" }}>{error}</div>}

            <button 
              onClick={handleCheckout}
              disabled={checkingOut}
              className="btn-primary"
              style={{ width: "100%", padding: "1rem", display: "flex", justifyContent: "center", alignItems: "center", gap: "0.5rem", fontSize: "1.1rem", borderRadius: "12px", boxShadow: "0 8px 20px rgba(22,163,74,0.3)" }}
            >
              {checkingOut ? "Processing..." : (
                <>
                  <CreditCard size={20} /> Checkout Securely
                </>
              )}
            </button>
            <p style={{ textAlign: "center", fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "1rem" }}>
              Payments are secured by Rythu Sethu Escrow.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
