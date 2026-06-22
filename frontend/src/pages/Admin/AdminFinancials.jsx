import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { DollarSign, Wallet, ArrowDownCircle, ArrowUpCircle, CheckCircle, AlertCircle } from "lucide-react";
import API from "../../api/api";

export default function AdminFinancials() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchFinancials = async () => {
    try {
      setLoading(true);
      const res = await API.get("/admin/financials");
      setStats(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinancials();
  }, []);

  const handleSettle = async (type, id) => {
    if (!window.confirm("Confirm settlement? This will clear the balance.")) return;
    try {
      setActionLoading(true);
      if (type === "farmer") {
        await API.post(`/admin/settle/farmer/${id}`);
      } else if (type === "agent-collect") {
        await API.post(`/admin/settle/agent-collect/${id}`);
      } else if (type === "agent-pay") {
        await API.post(`/admin/settle/agent-pay/${id}`);
      }
      await fetchFinancials();
    } catch (e) {
      alert("Settlement failed: " + e.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || !stats) {
    return <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>Loading Financial Ledger...</div>;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ padding: "1rem 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h2 style={{ color: "var(--text-dark)", margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Wallet color="var(--green-primary)" /> Financial Ledger
        </h2>
        <button className="btn-secondary" onClick={fetchFinancials} disabled={actionLoading}>
          Refresh Ledger
        </button>
      </div>

      <div className="grid-4 mb-2">
        <div className="glass-card" style={{ padding: "1.5rem", borderTop: "4px solid #10b981" }}>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", margin: "0 0 0.5rem" }}>Platform Revenue (5% Fee)</p>
          <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#10b981", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            ₹{stats.totalPlatformRevenue.toLocaleString()}
          </div>
        </div>
        <div className="glass-card" style={{ padding: "1.5rem", borderTop: "4px solid #ef4444" }}>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", margin: "0 0 0.5rem" }}>Owed to Farmers</p>
          <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#ef4444" }}>
            ₹{stats.totalOwedToFarmers.toLocaleString()}
          </div>
        </div>
        <div className="glass-card" style={{ padding: "1.5rem", borderTop: "4px solid #f59e0b" }}>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", margin: "0 0 0.5rem" }}>Owed to Agents (Pay)</p>
          <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#f59e0b" }}>
            ₹{stats.totalAgentPayOwed.toLocaleString()}
          </div>
        </div>
        <div className="glass-card" style={{ padding: "1.5rem", borderTop: "4px solid #3b82f6" }}>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", margin: "0 0 0.5rem" }}>Cash held by Agents</p>
          <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#3b82f6" }}>
            ₹{stats.totalCashWithAgents.toLocaleString()}
          </div>
        </div>
      </div>

      <div className="grid-2">
        {/* Farmers Owed */}
        <div className="glass-card">
          <h3 style={{ margin: "0 0 1rem", color: "var(--text-dark)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <ArrowDownCircle color="#ef4444" size={20} /> Pending Farmer Settlements
          </h3>
          {stats.farmers.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>No pending settlements.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {stats.farmers.map(f => (
                <div key={f._id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem", background: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                  <div>
                    <div style={{ fontWeight: 600, color: "var(--text-dark)" }}>{f.name}</div>
                    <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>{f.phone}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--green-primary)", marginTop: "4px" }}>
                      {f.upiId ? `UPI: ${f.upiId}` : f.bankAccountNumber ? `Bank: ${f.bankAccountNumber}` : "No Payment Info"}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    <div style={{ fontWeight: "bold", color: "#ef4444", fontSize: "1.1rem" }}>₹{f.pendingSettlement.toLocaleString()}</div>
                    <button onClick={() => handleSettle("farmer", f._id)} disabled={actionLoading} className="btn-primary" style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem", background: "#ef4444", border: "none" }}>
                      Clear & Pay
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Agents Cash to Collect */}
        <div className="glass-card">
          <h3 style={{ margin: "0 0 1rem", color: "var(--text-dark)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <ArrowUpCircle color="#3b82f6" size={20} /> COD Cash to Collect from Agents
          </h3>
          {stats.agentsHoldingCash.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>No cash pending collection.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {stats.agentsHoldingCash.map(a => (
                <div key={a._id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem", background: "#f0f9ff", borderRadius: "12px", border: "1px solid #bae6fd" }}>
                  <div>
                    <div style={{ fontWeight: 600, color: "var(--text-dark)" }}>{a.name}</div>
                    <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>{a.phone}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--blue-light)", marginTop: "4px" }}>
                      {a.upiId ? `UPI: ${a.upiId}` : a.bankAccountNumber ? `Bank: ${a.bankAccountNumber}` : "No Payment Info"}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    <div style={{ fontWeight: "bold", color: "#3b82f6", fontSize: "1.1rem" }}>₹{a.cashInHand.toLocaleString()}</div>
                    <button onClick={() => handleSettle("agent-collect", a._id)} disabled={actionLoading} className="btn-primary" style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem", background: "#3b82f6", border: "none" }}>
                      Mark Collected
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Agents Pay Owed */}
        <div className="glass-card" style={{ gridColumn: "1 / -1" }}>
          <h3 style={{ margin: "0 0 1rem", color: "var(--text-dark)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <DollarSign color="#f59e0b" size={20} /> Agent Weekly Delivery Payouts
          </h3>
          {stats.agentsOwed.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>No delivery payments pending.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {stats.agentsOwed.map(a => (
                <div key={a._id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem", background: "#fffbeb", borderRadius: "12px", border: "1px solid #fde68a" }}>
                  <div>
                    <div style={{ fontWeight: 600, color: "var(--text-dark)" }}>{a.name}</div>
                    <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>{a.phone}</div>
                    <div style={{ fontSize: "0.75rem", color: "#f59e0b", marginTop: "4px" }}>
                      {a.upiId ? `UPI: ${a.upiId}` : a.bankAccountNumber ? `Bank: ${a.bankAccountNumber}` : "No Payment Info"}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    <div style={{ fontWeight: "bold", color: "#f59e0b", fontSize: "1.1rem" }}>₹{a.walletBalance.toLocaleString()}</div>
                    <button onClick={() => handleSettle("agent-pay", a._id)} disabled={actionLoading} className="btn-primary" style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem", background: "#f59e0b", border: "none" }}>
                      Process Pay
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
