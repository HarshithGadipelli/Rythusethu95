import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import API from "../../api/api";
import { useAuth } from "../../context/AuthContext";
import { MapPin, ArrowLeft, Calendar, Users, Tractor, CheckCircle2 } from "lucide-react";

export default function CustomerOfflineTours() {
  const { user } = useAuth();
  const [farmers, setFarmers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bookingModal, setBookingModal] = useState(null);
  const [msg, setMsg] = useState({ type: "", text: "" });

  const [bookDate, setBookDate] = useState("");
  const [bookTime, setBookTime] = useState("10:00");
  const [bookPeople, setBookPeople] = useState(1);

  useEffect(() => {
    fetchTours();
  }, []);

  const fetchTours = async () => {
    try {
      const res = await API.get("/tours/available");
      setFarmers(res.data);
    } catch (e) {
      console.error("Failed to load farm tours", e);
    } finally {
      setLoading(false);
    }
  };

  const handleBook = async () => {
    if (!bookDate || !bookTime) {
      setMsg({ type: "error", text: "Please select a date and time." });
      return;
    }
    try {
      setMsg({ type: "", text: "Booking your tour..." });
      await API.post("/tours/book", {
        farmer: bookingModal.user._id,
        customer: user._id,
        date: bookDate,
        time: bookTime,
        numberOfPeople: bookPeople,
        totalPrice: bookingModal.farmTourPrice * bookPeople
      });
      setMsg({ type: "success", text: "Farm Tour booked successfully! The farmer will contact you." });
      setBookingModal(null);
    } catch (e) {
      setMsg({ type: "error", text: "Failed to book farm tour." });
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
            <Tractor color="var(--primary)" /> Offline Farm Tours
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", margin: 0 }}>
            Visit verified organic farms in person! Learn about sustainable farming and harvest your own food.
          </p>
        </div>
      </div>

      {msg.text && !bookingModal && <div className={`alert alert-${msg.type} mb-3`}>{msg.text}</div>}

      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem" }}>
          <div className="loader" style={{ margin: "0 auto" }}></div>
          <p style={{ marginTop: "1rem", color: "var(--text-muted)" }}>Loading available farms...</p>
        </div>
      ) : farmers.length === 0 ? (
        <div className="glass-card" style={{ textAlign: "center", padding: "4rem 2rem" }}>
          <Tractor size={48} color="var(--text-muted)" style={{ marginBottom: "1rem", opacity: 0.5 }} />
          <h3 style={{ color: "var(--text-dark)", marginBottom: "0.5rem" }}>No Farms Available for Tours Right Now</h3>
          <p style={{ color: "var(--text-muted)" }}>Check back later to see new verified farms open for visitors!</p>
        </div>
      ) : (
        <div className="grid-3">
          {farmers.map((f) => (
            <div key={f._id} className="glass-card" style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <div style={{ position: "relative", width: "100%", height: "180px", background: "linear-gradient(135deg, var(--green-deep), var(--green-mid))", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: "4rem" }}>🏡</span>
                <div style={{ position: "absolute", top: "10px", right: "10px", background: "white", color: "var(--green-deep)", padding: "4px 8px", borderRadius: "4px", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "4px", fontWeight: "bold" }}>
                  <CheckCircle2 size={14} /> Admin Verified
                </div>
              </div>
              
              <div style={{ padding: "1.5rem", flex: 1, display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                  <h3 style={{ margin: 0, fontSize: "1.2rem", color: "var(--text-dark)" }}>{f.user?.name}'s Farm</h3>
                  <span style={{ fontWeight: "bold", color: "var(--primary)", fontSize: "1.1rem" }}>₹{f.farmTourPrice}/person</span>
                </div>
                
                <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.3rem", marginBottom: "1rem" }}>
                  <MapPin size={14} /> {f.farmLocation || f.user?.location || "Unknown Location"}
                </div>

                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", flex: 1, fontStyle: "italic", marginBottom: "1.5rem" }}>
                  "{f.farmTourDetails || "Join us for a wonderful tour around our organic farm."}"
                </p>
                
                <button className="btn-primary" style={{ width: "100%" }} onClick={() => {
                  if (!user) { setMsg({ type: "error", text: "Please login to book a tour." }); return; }
                  setBookingModal(f);
                }}>
                  📅 Book Tour
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Booking Modal */}
      {bookingModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "1rem" }}>
          <div className="glass-card" style={{ width: "100%", maxWidth: "500px", padding: "2rem" }}>
            <h3 className="section-title">Book Tour: {bookingModal.user?.name}'s Farm</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
              Price: <strong>₹{bookingModal.farmTourPrice}</strong> per person
            </p>

            {msg.text && <div className={`alert alert-${msg.type} mb-3`}>{msg.text}</div>}

            <div className="form-group mb-3">
              <label className="field-label"><Calendar size={14} style={{ display: "inline", marginRight: "5px" }}/> Date</label>
              <input type="date" className="rs-input" value={bookDate} onChange={e => setBookDate(e.target.value)} min={new Date().toISOString().split("T")[0]} />
            </div>

            <div className="grid-2 mb-3">
              <div className="form-group">
                <label className="field-label">Time</label>
                <input type="time" className="rs-input" value={bookTime} onChange={e => setBookTime(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="field-label"><Users size={14} style={{ display: "inline", marginRight: "5px" }}/> Guests</label>
                <input type="number" className="rs-input" value={bookPeople} min="1" max="20" onChange={e => setBookPeople(Number(e.target.value))} />
              </div>
            </div>

            <div style={{ background: "rgba(34, 197, 94, 0.1)", padding: "1rem", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <span style={{ fontWeight: 600 }}>Total Amount:</span>
              <span style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--green-deep)" }}>₹{bookingModal.farmTourPrice * bookPeople}</span>
            </div>

            <div style={{ display: "flex", gap: "1rem" }}>
              <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setBookingModal(null)}>Cancel</button>
              <button className="btn-primary" style={{ flex: 1 }} onClick={handleBook}>Confirm Booking</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
