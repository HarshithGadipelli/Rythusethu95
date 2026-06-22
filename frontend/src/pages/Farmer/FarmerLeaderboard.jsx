import React, { useState, useEffect } from "react";
import API from "../../api/api";
import { Trophy, Medal, Star, TrendingUp } from "lucide-react";

export default function FarmerLeaderboard() {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get("/farmer/leaderboard")
      .then(res => {
        setLeaders(res.data);
        setLoading(false);
      })
      .catch(err => setLoading(false));
  }, []);

  if (loading) return <p style={{ color: "var(--text-muted)" }}>Loading Leaderboard...</p>;

  return (
    <div className="glass-card mt-3">
      <h3 className="section-title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <Trophy size={24} color="#d97706" /> Farmer Trust Leaderboard
      </h3>
      <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "1.5rem" }}>
        Compete with other farmers by maintaining high quality, timely deliveries, and fair prices to earn the Platinum Trust Badge!
      </p>

      {leaders.length === 0 ? (
        <p>No data available yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {leaders.map((farmer, index) => {
            const isTop3 = index < 3;
            const bgGradient = index === 0 ? "linear-gradient(135deg, rgba(217,119,6,0.1), rgba(251,191,36,0.1))" :
                               index === 1 ? "linear-gradient(135deg, rgba(156,163,175,0.1), rgba(209,213,219,0.1))" :
                               index === 2 ? "linear-gradient(135deg, rgba(180,83,9,0.1), rgba(217,119,6,0.1))" : "var(--bg-glass)";
            const borderColor = index === 0 ? "#fbbf24" : index === 1 ? "#9ca3af" : index === 2 ? "#d97706" : "rgba(255,255,255,0.1)";

            return (
              <div key={farmer._id} style={{
                padding: "1rem",
                background: bgGradient,
                border: `1px solid ${borderColor}`,
                borderRadius: "12px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <div style={{
                    width: "40px", height: "40px", borderRadius: "50%",
                    background: isTop3 ? borderColor : "rgba(255,255,255,0.1)",
                    display: "flex", justifyContent: "center", alignItems: "center",
                    color: isTop3 ? "#fff" : "var(--text-muted)", fontWeight: "bold", fontSize: "1.2rem"
                  }}>
                    {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${index + 1}`}
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: "1.1rem", color: "var(--text-dark)" }}>{farmer.user?.name || "Anonymous Farmer"}</h4>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{farmer.user?.location || farmer.farmLocation || "Unknown Location"}</span>
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "1.2rem", fontWeight: "bold", color: "var(--green-primary)", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                    {farmer.trustScore} <Star size={16} color="var(--green-primary)" />
                  </div>
                  <span style={{
                    fontSize: "0.75rem",
                    background: "rgba(34,197,94,0.1)",
                    color: "var(--green-primary)",
                    padding: "2px 8px",
                    borderRadius: "100px",
                    fontWeight: 600
                  }}>
                    {farmer.trustGrade || "New"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
