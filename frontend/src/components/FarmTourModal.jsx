import React, { useState } from "react";
import { motion } from "framer-motion";
import { X, CalendarDays, MapPin } from "lucide-react";
import API, { BASE_URL } from "../api/api";
import { useAuth } from "../context/AuthContext";

export default function FarmTourModal({ crop, onClose }) {
  const { user } = useAuth();
  const [booking, setBooking] = useState(false);
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const url = crop?.farmTourUrl || "";
  let embedUrl = url;
  let isLocalVideo = false;

  if (url.includes("youtube.com/watch")) {
    const id = new URL(url).searchParams.get("v");
    if (id) embedUrl = `https://www.youtube.com/embed/${id}?autoplay=1`;
  } else if (url.includes("youtu.be/")) {
    const id = url.split("youtu.be/")[1]?.split("?")[0];
    if (id) embedUrl = `https://www.youtube.com/embed/${id}?autoplay=1`;
  } else if (url.startsWith("/uploads/")) {
    isLocalVideo = true;
    embedUrl = `${BASE_URL}${url}`;
  }

  const handleBookVisit = async () => {
    if (!date) { alert("Please select a date"); return; }
    setLoading(true);
    try {
      await API.post(`/farmer/visit/${crop.farmer._id}`, {
        customerId: user?._id,
        customerName: user?.name,
        requestedDate: date,
        notes: notes
      });
      alert("Physical visit request sent to the farmer!");
      setBooking(false);
    } catch (e) {
      alert("Failed to send request.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(0,0,0,0.8)", backdropFilter: "blur(5px)",
      display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        style={{
          background: "var(--bg-light)", borderRadius: "16px", overflow: "hidden",
          width: "90%", maxWidth: "800px", position: "relative",
          boxShadow: "0 20px 40px rgba(0,0,0,0.5)", display: "flex", flexDirection: "column"
        }}
      >
        <div style={{ background: "black", aspectRatio: "16/9", position: "relative" }}>
          <button onClick={onClose} style={{
            position: "absolute", top: "10px", right: "10px", background: "rgba(0,0,0,0.5)",
            border: "none", cursor: "pointer", color: "white", borderRadius: "50%", padding: "5px", zIndex: 2
          }}>
            <X size={24} />
          </button>
          
          {isLocalVideo ? (
            <video 
              src={embedUrl} 
              controls 
              autoPlay 
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            ></video>
          ) : (
            <iframe 
              src={embedUrl} 
              title="Virtual Farm Tour" 
              frameBorder="0" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
              allowFullScreen
              style={{ width: "100%", height: "100%" }}
            ></iframe>
          )}
        </div>

        <div style={{ padding: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h2 style={{ margin: "0 0 0.5rem", color: "var(--text-dark)" }}>{crop?.farmer?.name}'s Farm</h2>
              <p style={{ margin: 0, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <MapPin size={16} /> {crop?.farmer?.location || "Location not specified"}
              </p>
            </div>
            {!booking && (
              <button className="btn-primary" onClick={() => setBooking(true)} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <CalendarDays size={18} /> Book Physical Visit
              </button>
            )}
          </div>

          {booking && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ marginTop: "1.5rem", background: "#f8fafc", padding: "1.5rem", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
              <h3 style={{ margin: "0 0 1rem", fontSize: "1.1rem" }}>Schedule a Visit</h3>
              <div className="grid-2">
                <div className="form-group">
                  <label className="field-label">Preferred Date</label>
                  <input type="date" className="rs-input" value={date} onChange={e => setDate(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="field-label">Notes for Farmer</label>
                  <input type="text" className="rs-input" placeholder="e.g. Bringing 2 people, arriving at 10 AM" value={notes} onChange={e => setNotes(e.target.value)} />
                </div>
              </div>
              <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
                <button className="btn-primary" onClick={handleBookVisit} disabled={loading}>
                  {loading ? "Sending..." : "Send Request"}
                </button>
                <button className="btn-secondary" onClick={() => setBooking(false)}>Cancel</button>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
