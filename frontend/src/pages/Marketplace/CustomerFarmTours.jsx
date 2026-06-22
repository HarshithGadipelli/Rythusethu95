import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import API from "../../api/api";
import { useAuth } from "../../context/AuthContext";
import { Play, ArrowLeft, ShieldCheck, MapPin } from "lucide-react";

export default function CustomerFarmTours() {
  const { user } = useAuth();
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTours();
  }, []);

  const fetchTours = async () => {
    try {
      const res = await API.get("/crops");
      // Filter crops that have a farm tour video URL
      const withTours = res.data.filter(c => c.farmTourVideo && c.isLive !== false);
      setCrops(withTours);
    } catch (e) {
      console.error("Failed to load farm tours", e);
    } finally {
      setLoading(false);
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
            <Play color="var(--primary)" /> Virtual Farm Tours
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", margin: 0 }}>
            Experience 100% Transparency. See exactly where and how your food is grown.
          </p>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem" }}>
          <div className="loader" style={{ margin: "0 auto" }}></div>
          <p style={{ marginTop: "1rem", color: "var(--text-muted)" }}>Loading farm tours...</p>
        </div>
      ) : crops.length === 0 ? (
        <div className="glass-card" style={{ textAlign: "center", padding: "4rem 2rem" }}>
          <Play size={48} color="var(--text-muted)" style={{ marginBottom: "1rem", opacity: 0.5 }} />
          <h3 style={{ color: "var(--text-dark)", marginBottom: "0.5rem" }}>No Farm Tours Available Right Now</h3>
          <p style={{ color: "var(--text-muted)" }}>Farmers haven't uploaded any virtual tours for their currently live crops. Check back later!</p>
        </div>
      ) : (
        <div className="grid-3">
          {crops.map((c) => (
            <div key={c._id} className="glass-card" style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <div style={{ position: "relative", width: "100%", height: "200px", backgroundColor: "#000" }}>
                <video 
                  src={`http://localhost:5000${c.farmTourVideo}`} 
                  controls 
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  poster={c.image ? `http://localhost:5000${c.image}` : null}
                />
                {c.isOrganic && (
                  <div style={{ position: "absolute", top: "10px", right: "10px", background: "var(--green-deep)", color: "white", padding: "4px 8px", borderRadius: "4px", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "4px", fontWeight: "bold" }}>
                    <ShieldCheck size={14} /> Organic Verified
                  </div>
                )}
              </div>
              
              <div style={{ padding: "1.5rem", flex: 1, display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                  <h3 style={{ margin: 0, fontSize: "1.2rem", color: "var(--text-dark)" }}>{c.name}</h3>
                  <span style={{ fontWeight: "bold", color: "var(--primary)", fontSize: "1.1rem" }}>₹{c.price}/{c.unit}</span>
                </div>
                
                <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.3rem", marginBottom: "1rem" }}>
                  <MapPin size={14} /> {c.farmer?.location || "Unknown Farm Location"}
                </div>
                
                <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: "0.85rem" }}>
                    <span style={{ color: "var(--text-muted)" }}>Farmer:</span> <strong>{c.farmer?.name || "Verified Farmer"}</strong>
                  </div>
                  <Link to={`/marketplace?crop=${c._id}`} className="btn-primary" style={{ padding: "0.4rem 1rem", fontSize: "0.85rem" }}>
                    Buy Now
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
