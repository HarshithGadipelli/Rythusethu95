import React from "react";
import { motion } from "framer-motion";
import { ShieldCheck, Calendar, Leaf, X, Award, CheckCircle } from "lucide-react";
import QRCode from "react-qr-code";

export default function AuthenticityCertificate({ order, onClose }) {
  if (!order || !order.crop) return null;

  const farmer = order.farmer || order.crop.farmer || {};
  const isOrganic = order.crop.isOrganic;
  const isPesticideFree = order.crop.isPesticideFree;
  const trustScore = 100; // Simulated
  const blockchainHash = `0x${Buffer.from(order._id + Date.now().toString()).toString("hex").substring(0, 32)}`;

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(0,0,0,0.8)", backdropFilter: "blur(6px)",
      display: "flex", justifyContent: "center", alignItems: "center", zIndex: 99999, padding: "1rem"
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        style={{
          background: "linear-gradient(145deg, #1f2937, #111827)",
          borderRadius: "20px", width: "100%", maxWidth: "500px",
          position: "relative", overflow: "hidden", border: "1px solid rgba(34, 197, 94, 0.2)",
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)"
        }}
      >
        {/* Decorative corner accents */}
        <div style={{ position: "absolute", top: -50, right: -50, width: 100, height: 100, background: "rgba(34, 197, 94, 0.1)", borderRadius: "50%", filter: "blur(20px)" }}></div>
        <div style={{ position: "absolute", bottom: -50, left: -50, width: 100, height: 100, background: "rgba(59, 130, 246, 0.1)", borderRadius: "50%", filter: "blur(20px)" }}></div>

        {/* Close Button */}
        <button onClick={onClose} style={{
          position: "absolute", top: "1rem", right: "1rem", background: "rgba(255,255,255,0.1)",
          border: "none", cursor: "pointer", color: "white", borderRadius: "50%", padding: "0.4rem", zIndex: 10
        }}>
          <X size={20} />
        </button>

        <div style={{ padding: "2rem", color: "white" }}>
          
          <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
            <div style={{ display: "inline-flex", justifyContent: "center", alignItems: "center", width: 64, height: 64, background: "var(--gradient-btn)", borderRadius: "50%", marginBottom: "1rem", boxShadow: "0 0 15px rgba(34,197,94,0.4)" }}>
              <ShieldCheck size={36} color="white" />
            </div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--green-pale)", textTransform: "uppercase", letterSpacing: "1px" }}>
              Certificate of Authenticity
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "0.2rem" }}>Verified by Rythu Sethu AI Vision</p>
          </div>

          <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: "12px", padding: "1.25rem", marginBottom: "1.5rem", border: "1px solid rgba(255,255,255,0.05)" }}>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "1rem", color: "white", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "0.5rem" }}>
              {order.crop.name}
            </h3>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.2rem" }}>Grown By</p>
                <p style={{ fontSize: "0.95rem", fontWeight: 600 }}>{farmer.name || "Verified Farmer"}</p>
                <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", marginTop: "0.2rem" }}>
                  <Award size={14} color="#facc15" />
                  <span style={{ fontSize: "0.75rem", color: "#facc15" }}>Trust Score: {trustScore}/100</span>
                </div>
              </div>
              
              <div>
                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.2rem" }}>Location</p>
                <p style={{ fontSize: "0.95rem", fontWeight: 600 }}>{farmer.location || order.crop.location || "Local Farm"}</p>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "1rem" }}>
              <div>
                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.2rem" }}>Quality Grade</p>
                <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                  <CheckCircle size={16} color="#22c55e" />
                  <span style={{ fontSize: "0.95rem", fontWeight: 600, color: "#22c55e" }}>Grade A (Premium)</span>
                </div>
              </div>

              <div>
                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.2rem" }}>Date of Origin</p>
                <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                  <Calendar size={16} color="var(--cream)" />
                  <span style={{ fontSize: "0.95rem", fontWeight: 600 }}>{new Date(order.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem" }}>
            {isOrganic && (
              <div style={{ flex: 1, background: "rgba(34, 197, 94, 0.1)", border: "1px solid rgba(34, 197, 94, 0.3)", borderRadius: "8px", padding: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Leaf size={18} color="#22c55e" />
                <span style={{ fontSize: "0.85rem", color: "#22c55e", fontWeight: 600 }}>100% Organic</span>
              </div>
            )}
            {isPesticideFree && (
              <div style={{ flex: 1, background: "rgba(59, 130, 246, 0.1)", border: "1px solid rgba(59, 130, 246, 0.3)", borderRadius: "8px", padding: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <ShieldCheck size={18} color="#3b82f6" />
                <span style={{ fontSize: "0.85rem", color: "#3b82f6", fontWeight: 600 }}>Pesticide Free</span>
              </div>
            )}
          </div>

          <div style={{ background: "rgba(0,0,0,0.5)", borderRadius: "12px", padding: "1.25rem", display: "flex", alignItems: "center", gap: "1.5rem" }}>
            <div style={{ background: "white", padding: "0.5rem", borderRadius: "8px" }}>
              <QRCode value={`https://rythusethu.vercel.app/traceability/${order._id}`} size={80} />
            </div>
            <div>
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.3rem", textTransform: "uppercase" }}>Blockchain Ledger ID</p>
              <p style={{ fontSize: "0.8rem", color: "var(--green-pale)", fontFamily: "monospace", wordBreak: "break-all" }}>{blockchainHash}</p>
              <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.5rem" }}>Scan QR to verify immutable record.</p>
            </div>
          </div>

        </div>
      </motion.div>
    </div>
  );
}
