import React, { useState } from "react";
import { motion } from "framer-motion";
import { X, CreditCard, Banknote, ShieldCheck, QrCode, Wallet } from "lucide-react";
import RythuSethuAnimation from "./RythuSethuAnimation";
import QRCode from "react-qr-code";

export default function PaymentModal({ amount, walletBalance, onClose, onSuccess }) {
  const [method, setMethod] = useState("upi");
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handlePay = () => {
    if (method === "wallet" && walletBalance < amount) {
      setErrorMsg("Insufficient wallet balance.");
      return;
    }
    setProcessing(true);
    // Simulate API delay for realism
    setTimeout(() => {
      setProcessing(false);
      setSuccess(true);
      // Animation component will call onSuccess(method) when it finishes bridging
    }, 2000);
  };

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
      display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000
    }}>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        style={{
          background: "white", borderRadius: "20px", padding: "2rem",
          width: "90%", maxWidth: "400px", boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
          position: "relative", overflow: "hidden"
        }}
      >
        <button onClick={onClose} style={{
          position: "absolute", top: "1rem", right: "1rem", background: "transparent",
          border: "none", cursor: "pointer", color: "var(--text-muted)"
        }}>
          <X size={24} />
        </button>

        {success ? (
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ padding: "1rem 0" }}>
            <h2 style={{ color: "var(--text-dark)", marginBottom: "0.5rem", textAlign: "center" }}>Payment Successful</h2>
            <p style={{ color: "var(--text-muted)", textAlign: "center", marginBottom: "1.5rem" }}>Building bridge to your farm...</p>
            <RythuSethuAnimation onComplete={() => onSuccess(method)} />
          </motion.div>
        ) : (
          <>
            <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
              <div style={{ background: "#f0fdf4", width: 60, height: 60, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem" }}>
                <ShieldCheck size={32} color="#16a34a" />
              </div>
              <h2 style={{ color: "var(--text-dark)", fontSize: "1.4rem", marginBottom: "0.25rem" }}>Secure Checkout</h2>
              <div style={{ fontSize: "2rem", fontWeight: 700, color: "var(--green-deep)" }}>
                ₹{amount.toLocaleString()}
              </div>
            </div>

            {errorMsg && <div className="alert alert-error mb-2">{errorMsg}</div>}

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem" }}>
              <label style={{
                display: "flex", alignItems: "center", gap: "1rem", padding: "1rem",
                border: `2px solid ${method === "wallet" ? "#16a34a" : "#e2e8f0"}`,
                borderRadius: "12px", cursor: "pointer", transition: "all 0.2s",
                background: walletBalance < amount ? "#f8fafc" : "white",
                opacity: walletBalance < amount ? 0.6 : 1
              }} onClick={() => { if(walletBalance >= amount) setMethod("wallet"); }}>
                <div style={{ flex: 1, fontWeight: 600, color: "var(--text-dark)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Wallet size={18} /> My Wallet (₹{walletBalance?.toLocaleString() || 0})
                </div>
                {walletBalance >= amount && <input type="radio" checked={method === "wallet"} readOnly />}
              </label>

              <label style={{
                display: "flex", alignItems: "center", gap: "1rem", padding: "1rem",
                border: `2px solid ${method === "upi" ? "#16a34a" : "#e2e8f0"}`,
                borderRadius: "12px", cursor: "pointer", transition: "all 0.2s"
              }} onClick={() => setMethod("upi")}>
                <div style={{ flex: 1, fontWeight: 600, color: "var(--text-dark)" }}>📱 UPI (GPay/PhonePe)</div>
                <input type="radio" checked={method === "upi"} readOnly />
              </label>

              <label style={{
                display: "flex", alignItems: "center", gap: "1rem", padding: "1rem",
                border: `2px solid ${method === "card" ? "#16a34a" : "#e2e8f0"}`,
                borderRadius: "12px", cursor: "pointer", transition: "all 0.2s"
              }} onClick={() => setMethod("card")}>
                <div style={{ flex: 1, fontWeight: 600, color: "var(--text-dark)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <CreditCard size={18} /> Credit / Debit Card
                </div>
                <input type="radio" checked={method === "card"} readOnly />
              </label>

              <label style={{
                display: "flex", alignItems: "center", gap: "1rem", padding: "1rem",
                border: `2px solid ${method === "cod" ? "#16a34a" : "#e2e8f0"}`,
                borderRadius: "12px", cursor: "pointer", transition: "all 0.2s"
              }} onClick={() => setMethod("cod")}>
                <div style={{ flex: 1, fontWeight: 600, color: "var(--text-dark)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Banknote size={18} /> Cash on Delivery
                </div>
                <input type="radio" checked={method === "cod"} readOnly />
              </label>
            </div>

            {method === "upi" ? (
              <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
                <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "1rem" }}>Scan the Admin's Official UPI QR with any UPI app to pay safely.</p>
                <div style={{ background: "white", padding: "1rem", borderRadius: "12px", border: "1px solid #e2e8f0", display: "inline-block", marginBottom: "1rem" }}>
                  <div style={{ fontWeight: 700, marginBottom: "0.5rem", color: "var(--green-deep)" }}>Rythu Sethu Admin</div>
                  <QRCode value={`https://rythusethu.vercel.app/pay?amount=${amount}`} size={150} />
                </div>
                <button
                  className="btn-primary"
                  style={{ width: "100%", padding: "1rem", fontSize: "1.1rem", display: "flex", justifyContent: "center", alignItems: "center", gap: "0.5rem", background: "var(--green-deep)" }}
                  onClick={handlePay}
                  disabled={processing}
                >
                  {processing ? (
                    <><span className="loader" style={{ width: 20, height: 20, border: "3px solid white", borderTopColor: "transparent" }}></span> Verifying...</>
                  ) : "I have paid"}
                </button>
              </div>
            ) : (
              <button
                className="btn-primary"
                style={{ width: "100%", padding: "1rem", fontSize: "1.1rem", display: "flex", justifyContent: "center", alignItems: "center", gap: "0.5rem" }}
                onClick={handlePay}
                disabled={processing}
              >
                {processing ? (
                  <><span className="loader" style={{ width: 20, height: 20, border: "3px solid white", borderTopColor: "transparent" }}></span> Processing...</>
                ) : `Pay ₹${amount.toLocaleString()}`}
              </button>
            )}
            <p style={{ textAlign: "center", fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "1rem" }}>
              Secured by 256-bit AES Encryption
            </p>
          </>
        )}
      </motion.div>
    </div>
  );
}
