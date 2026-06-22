import React, { useState, useEffect } from "react";
import API from "../../api/api";
import { useAuth } from "../../context/AuthContext";
import { MapPin, Users, Calendar, Banknote } from "lucide-react";

export default function FarmerTours() {
  const { user } = useAuth();
  const [settings, setSettings] = useState({
    farmTourEnabled: false,
    farmTourPrice: 0,
    farmTourDetails: ""
  });
  const [isVerified, setIsVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  useEffect(() => {
    // Fetch current farmer settings
    const fetchFarmer = async () => {
      try {
        const res = await API.get(`/farmer/${user._id}`);
        if (res.data) {
          setSettings({
            farmTourEnabled: res.data.farmTourEnabled || false,
            farmTourPrice: res.data.farmTourPrice || 0,
            farmTourDetails: res.data.farmTourDetails || ""
          });
          setIsVerified(res.data.farmTourVerified || false);
        }
      } catch (err) {
        console.error("Failed to load farmer settings", err);
      }
    };
    if (user?._id) fetchFarmer();
  }, [user]);

  const handleSave = async () => {
    setLoading(true);
    setMsg({ type: "", text: "" });
    try {
      await API.put(`/tours/settings/${user._id}`, settings);
      setMsg({ type: "success", text: "Farm Tour settings updated successfully!" });
    } catch (err) {
      setMsg({ type: "error", text: "Failed to update settings" });
    }
    setLoading(false);
  };

  return (
    <div className="glass-card" style={{ padding: "2rem" }}>
      <h2 className="section-title">🚜 Offline Farm Tours</h2>
      <p style={{ color: "var(--text-muted)", marginBottom: "2rem" }}>
        Allow customers to book a visit to your farm! Build trust and earn extra income by showing them your organic practices.
      </p>

      {msg.text && <div className={`alert alert-${msg.type} mb-3`}>{msg.text}</div>}

      <div style={{ background: "rgba(34, 197, 94, 0.05)", padding: "1.5rem", borderRadius: "12px", border: "1px solid rgba(34, 197, 94, 0.2)", marginBottom: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h3 style={{ margin: 0, color: "var(--green-deep)" }}>Verification Status</h3>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
              Your farm must be verified by admin before tours go live to customers.
            </p>
          </div>
          {isVerified ? (
            <span className="badge" style={{ background: "var(--green-mid)", color: "white", padding: "0.5rem 1rem", fontSize: "1rem" }}>✅ Verified</span>
          ) : (
            <span className="badge" style={{ background: "var(--yellow-wheat)", color: "black", padding: "0.5rem 1rem", fontSize: "1rem" }}>⏳ Pending Admin Review</span>
          )}
        </div>
      </div>

      <div className="form-group mb-3">
        <label className="field-label" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <input 
            type="checkbox" 
            checked={settings.farmTourEnabled} 
            onChange={(e) => setSettings({ ...settings, farmTourEnabled: e.target.checked })}
            style={{ width: "20px", height: "20px" }}
          />
          Enable Farm Tours
        </label>
        <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginLeft: "2rem" }}>Turn this on to accept tour bookings. Customers will only see this option if your farm is Verified.</p>
      </div>

      <div className="form-group mb-3">
        <label className="field-label">Price per Person (₹)</label>
        <input 
          type="number" 
          className="rs-input" 
          value={settings.farmTourPrice}
          onChange={(e) => setSettings({ ...settings, farmTourPrice: Number(e.target.value) })}
        />
      </div>

      <div className="form-group mb-3">
        <label className="field-label">Tour Details & Schedule</label>
        <textarea 
          className="rs-input" 
          rows="4"
          placeholder="E.g. Tours available on weekends. We will show you our greenhouse and organic composting process. Kids under 5 are free."
          value={settings.farmTourDetails}
          onChange={(e) => setSettings({ ...settings, farmTourDetails: e.target.value })}
        ></textarea>
      </div>

      <button className="btn-primary" onClick={handleSave} disabled={loading}>
        {loading ? "Saving..." : "Save Tour Settings"}
      </button>
    </div>
  );
}
