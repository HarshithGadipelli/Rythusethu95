import React, { useState, useEffect } from "react";
import { Wallet, TrendingUp, Package, Clock, MapPin, CheckCircle, Navigation } from "lucide-react";
import { useLang } from "../../context/LangContext";

export default function AgentFinancialLedger({ deliveries = [], earnings = {} }) {
  const { t } = useLang();
  const [ledgerData, setLedgerData] = useState([]);
  const [summary, setSummary] = useState({ totalEarnings: 0, pendingEarnings: 0, deliveredCount: 0 });
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    if (!deliveries || deliveries.length === 0) return;

    let te = 0, pe = 0, count = 0;
    
    const transactions = deliveries.map(d => {
      const isDelivered = d.status === "delivered";
      // Delivery agents earn the delivery charge set on the order, defaulting to 30 rupees
      const fee = d.order?.deliveryCharges || 30;
      
      if (isDelivered) {
        te += fee;
        count += 1;
      } else if (d.status !== "failed" && d.status !== "cancelled") {
        pe += fee;
      }

      return {
        id: d._id,
        trackingCode: d.trackingCode || `#${d._id.substring(0,8).toUpperCase()}`,
        date: new Date(d.updatedAt || d.createdAt),
        crop: d.order?.crop?.name || "Order",
        customer: d.order?.customer?.name || "Customer",
        amount: fee,
        status: d.status,
        distance: d.distanceKm || null
      };
    }).sort((a, b) => b.date - a.date);

    setLedgerData(transactions);
    setSummary({ totalEarnings: te, pendingEarnings: pe, deliveredCount: count });
  }, [deliveries]);

  const filteredLedger = ledgerData.filter(tx => {
    if (filter === "all") return true;
    if (filter === "settled") return tx.status === "delivered";
    if (filter === "pending") return tx.status !== "delivered" && tx.status !== "failed";
    return true;
  });

  return (
    <div className="glass-card" style={{ padding: "1.5rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.5rem" }}>
        <Wallet size={28} color="var(--blue-mid)" />
        <h2 style={{ margin: 0, color: "var(--text-dark)" }}>Agent Financial Ledger</h2>
      </div>

      <p style={{ color: "var(--text-muted)", marginBottom: "2rem" }}>
        Track your delivery earnings, completed trips, and pending payouts.
      </p>

      {/* SUMMARY CARDS */}
      <div className="grid-4" style={{ marginBottom: "2rem" }}>
        <div style={{ background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)", padding: "1.2rem", borderRadius: "12px", color: "white", boxShadow: "0 4px 15px rgba(59, 130, 246, 0.2)" }}>
          <p style={{ fontSize: "0.85rem", opacity: 0.9, marginBottom: "0.3rem", display: "flex", alignItems: "center", gap: "0.4rem" }}><TrendingUp size={16}/> Total Settled Earnings</p>
          <h3 style={{ fontSize: "1.8rem", margin: 0 }}>₹{summary.totalEarnings.toLocaleString(undefined, {maximumFractionDigits: 0})}</h3>
        </div>

        <div style={{ background: "white", padding: "1.2rem", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 2px 10px rgba(0,0,0,0.02)" }}>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.3rem", display: "flex", alignItems: "center", gap: "0.4rem" }}><Clock size={16}/> In Transit / Pending</p>
          <h3 style={{ fontSize: "1.8rem", margin: 0, color: "var(--yellow-wheat)" }}>₹{summary.pendingEarnings.toLocaleString(undefined, {maximumFractionDigits: 0})}</h3>
        </div>

        <div style={{ background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", padding: "1.2rem", borderRadius: "12px", color: "white", boxShadow: "0 4px 15px rgba(16, 185, 129, 0.2)" }}>
          <p style={{ fontSize: "0.85rem", opacity: 0.9, marginBottom: "0.3rem", display: "flex", alignItems: "center", gap: "0.4rem" }}><Package size={16}/> Successful Deliveries</p>
          <h3 style={{ fontSize: "1.8rem", margin: 0 }}>{summary.deliveredCount}</h3>
        </div>

        <div style={{ background: "white", padding: "1.2rem", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 2px 10px rgba(0,0,0,0.02)" }}>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.3rem", display: "flex", alignItems: "center", gap: "0.4rem" }}><CheckCircle size={16}/> Avg Pay per Trip</p>
          <h3 style={{ fontSize: "1.8rem", margin: 0, color: "var(--green-deep)" }}>
            ₹{summary.deliveredCount > 0 ? Math.round(summary.totalEarnings / summary.deliveredCount) : 0}
          </h3>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h3 style={{ fontSize: "1.2rem", color: "var(--text-dark)" }}>Delivery History</h3>
        <select className="rs-select" style={{ width: "auto" }} value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="all">All Trips</option>
          <option value="settled">Settled (Delivered)</option>
          <option value="pending">Pending (Active)</option>
        </select>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table className="rs-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Tracking Code</th>
              <th>Order Details</th>
              <th>Distance</th>
              <th>Trip Earnings</th>
              <th>Payout Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredLedger.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>No delivery transactions found.</td></tr>
            ) : (
              filteredLedger.map((tx) => (
                <tr key={tx.id}>
                  <td>
                    <span style={{ fontSize: "0.85rem", color: "var(--text-mid)" }}>{tx.date.toLocaleDateString()}</span><br/>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{tx.date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </td>
                  <td>
                    <span style={{ fontFamily: "monospace", color: "var(--primary)", background: "var(--green-pale)", padding: "0.2rem 0.4rem", borderRadius: "4px" }}>
                      {tx.trackingCode}
                    </span>
                  </td>
                  <td>
                    <strong>{tx.crop}</strong><br/>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{tx.customer}</span>
                  </td>
                  <td>
                    {tx.distance ? (
                      <span style={{ fontSize: "0.85rem" }}><Navigation size={12} /> {parseFloat(tx.distance).toFixed(1)} km</span>
                    ) : (
                      <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>—</span>
                    )}
                  </td>
                  <td style={{ color: "var(--green-deep)", fontWeight: "bold" }}>₹{tx.amount.toLocaleString(undefined, {maximumFractionDigits: 2})}</td>
                  <td>
                    {tx.status === "delivered" ? (
                      <span className="badge" style={{ background: "#dcfce7", color: "#15803d" }}>Settled to Wallet</span>
                    ) : tx.status === "failed" ? (
                      <span className="badge" style={{ background: "#fee2e2", color: "#dc2626" }}>Failed/Cancelled</span>
                    ) : (
                      <span className="badge" style={{ background: "#fef9c3", color: "#a16207" }}>Pending Completion</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
