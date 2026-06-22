import React, { useState, useEffect } from "react";
import { Wallet, TrendingUp, TrendingDown, Clock, CreditCard, Banknote, Calendar, BarChart3, Receipt, IndianRupee } from "lucide-react";
import { motion } from "framer-motion";
import API from "../../api/api";
import { useAuth } from "../../context/AuthContext";

export default function FarmerFinancialLedger({ orders = [] }) {
  const { user } = useAuth();
  const [ledgerData, setLedgerData] = useState([]);
  const [summary, setSummary] = useState({ totalSales: 0, platformFees: 0, netEarnings: 0, pendingCOD: 0, settledOnline: 0 });
  const [filter, setFilter] = useState("all");

  const PLATFORM_FEE_PERCENT = 2; // 2%

  useEffect(() => {
    // Generate ledger from orders
    if (!orders || orders.length === 0) return;

    let ts = 0, pf = 0, ne = 0, pc = 0, so = 0;
    
    const transactions = orders.map(order => {
      const isDelivered = order.status === "delivered";
      const isPaid = order.paymentStatus === "paid";
      const isCOD = order.paymentMode === "cod";
      
      const saleAmount = order.totalAmount || 0;
      const fee = saleAmount * (PLATFORM_FEE_PERCENT / 100);
      const net = saleAmount - fee;
      
      // Accumulate totals based on delivered/paid status
      if (isDelivered || isPaid) {
        ts += saleAmount;
        pf += fee;
        ne += net;
        
        if (isCOD && !isPaid) {
          pc += net;
        } else if (isPaid) {
          so += net;
        }
      }

      return {
        id: order._id,
        date: new Date(order.createdAt),
        crop: order.crop?.name || "Crop",
        customer: order.customer?.name || "Customer",
        amount: saleAmount,
        fee,
        net,
        paymentMode: order.paymentMode || "online",
        status: order.status,
        paymentStatus: order.paymentStatus
      };
    }).sort((a, b) => b.date - a.date);

    setLedgerData(transactions);
    setSummary({ totalSales: ts, platformFees: pf, netEarnings: ne, pendingCOD: pc, settledOnline: so });
  }, [orders]);

  const filteredLedger = ledgerData.filter(tx => {
    if (filter === "all") return true;
    if (filter === "settled") return tx.paymentStatus === "paid";
    if (filter === "pending") return tx.paymentStatus === "pending" || tx.paymentStatus === "cod_pending";
    return true;
  });

  return (
    <div className="glass-card" style={{ padding: "1.5rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.5rem" }}>
        <Wallet size={28} color="var(--green-mid)" />
        <h2 style={{ margin: 0, color: "var(--text-dark)" }}>Financial Ledger</h2>
      </div>

      <p style={{ color: "var(--text-muted)", marginBottom: "2rem" }}>
        Track your sales, platform fees, and net earnings. Monitor COD collections vs Online settlements.
      </p>

      {/* SUMMARY CARDS */}
      <div className="grid-4" style={{ marginBottom: "2rem" }}>
        <div style={{ background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", padding: "1.2rem", borderRadius: "12px", color: "white", boxShadow: "0 4px 15px rgba(16, 185, 129, 0.2)" }}>
          <p style={{ fontSize: "0.85rem", opacity: 0.9, marginBottom: "0.3rem", display: "flex", alignItems: "center", gap: "0.4rem" }}><TrendingUp size={16}/> Gross Sales</p>
          <h3 style={{ fontSize: "1.8rem", margin: 0 }}>₹{summary.totalSales.toLocaleString(undefined, {maximumFractionDigits: 0})}</h3>
        </div>

        <div style={{ background: "white", padding: "1.2rem", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 2px 10px rgba(0,0,0,0.02)" }}>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.3rem", display: "flex", alignItems: "center", gap: "0.4rem" }}><Receipt size={16}/> Platform Fees (-2%)</p>
          <h3 style={{ fontSize: "1.8rem", margin: 0, color: "var(--red-deep)" }}>-₹{summary.platformFees.toLocaleString(undefined, {maximumFractionDigits: 0})}</h3>
        </div>

        <div style={{ background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)", padding: "1.2rem", borderRadius: "12px", color: "white", boxShadow: "0 4px 15px rgba(59, 130, 246, 0.2)" }}>
          <p style={{ fontSize: "0.85rem", opacity: 0.9, marginBottom: "0.3rem", display: "flex", alignItems: "center", gap: "0.4rem" }}><CreditCard size={16}/> Online Settled</p>
          <h3 style={{ fontSize: "1.8rem", margin: 0 }}>₹{summary.settledOnline.toLocaleString(undefined, {maximumFractionDigits: 0})}</h3>
        </div>

        <div style={{ background: "white", padding: "1.2rem", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 2px 10px rgba(0,0,0,0.02)" }}>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.3rem", display: "flex", alignItems: "center", gap: "0.4rem" }}><Banknote size={16}/> Pending COD</p>
          <h3 style={{ fontSize: "1.8rem", margin: 0, color: "var(--yellow-wheat)" }}>₹{summary.pendingCOD.toLocaleString(undefined, {maximumFractionDigits: 0})}</h3>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h3 style={{ fontSize: "1.2rem", color: "var(--text-dark)" }}>Transaction History</h3>
        <select className="rs-select" style={{ width: "auto" }} value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="all">All Transactions</option>
          <option value="settled">Settled</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table className="rs-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Order Ref</th>
              <th>Crop & Customer</th>
              <th>Payment Mode</th>
              <th>Gross Amount</th>
              <th>Platform Fee</th>
              <th>Net Earnings</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredLedger.length === 0 ? (
              <tr><td colSpan="8" style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>No transactions found.</td></tr>
            ) : (
              filteredLedger.map((tx) => (
                <tr key={tx.id}>
                  <td>
                    <span style={{ fontSize: "0.85rem", color: "var(--text-mid)" }}>{tx.date.toLocaleDateString()}</span>
                  </td>
                  <td>
                    <span style={{ fontFamily: "monospace", color: "var(--primary)", background: "var(--green-pale)", padding: "0.2rem 0.4rem", borderRadius: "4px" }}>
                      #{tx.id.substring(0,6).toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <strong>{tx.crop}</strong><br/>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{tx.customer}</span>
                  </td>
                  <td>
                    {tx.paymentMode === "cod" ? (
                      <span className="badge" style={{ background: "#fef3c7", color: "#d97706" }}><Banknote size={12}/> COD</span>
                    ) : (
                      <span className="badge" style={{ background: "#e0e7ff", color: "#4338ca" }}><CreditCard size={12}/> Online</span>
                    )}
                  </td>
                  <td>₹{tx.amount.toLocaleString(undefined, {maximumFractionDigits: 2})}</td>
                  <td style={{ color: "var(--red-deep)" }}>-₹{tx.fee.toLocaleString(undefined, {maximumFractionDigits: 2})}</td>
                  <td style={{ color: "var(--green-deep)", fontWeight: "bold" }}>₹{tx.net.toLocaleString(undefined, {maximumFractionDigits: 2})}</td>
                  <td>
                    {tx.paymentStatus === "paid" ? (
                      <span className="badge" style={{ background: "#dcfce7", color: "#15803d" }}>Settled</span>
                    ) : (
                      <span className="badge" style={{ background: "#f1f5f9", color: "#64748b" }}>Pending</span>
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
