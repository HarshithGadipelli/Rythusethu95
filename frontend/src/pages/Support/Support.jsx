import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import API from "../../api/api";

export default function Support() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ subject: "", description: "", priority: "normal" });
  const [replyText, setReplyText] = useState({});

  useEffect(() => {
    fetchTickets();
  }, [user]);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await API.get(`/tickets/user/${user._id}`);
      setTickets(res.data);
    } catch (e) {
      setMsg({ type: "error", text: "Failed to load tickets." });
    } finally {
      setLoading(false);
    }
  };

  const createTicket = async (e) => {
    e.preventDefault();
    try {
      await API.post("/tickets/create", { ...form, creator: user._id, role: user.role });
      setMsg({ type: "success", text: "Ticket created successfully!" });
      setForm({ subject: "", description: "", priority: "normal" });
      setShowNew(false);
      fetchTickets();
    } catch (error) {
      setMsg({ type: "error", text: "Failed to create ticket." });
    }
  };

  const replyTicket = async (id) => {
    if (!replyText[id]) return;
    try {
      await API.post(`/tickets/${id}/reply`, {
        sender: user._id,
        senderName: user.name,
        message: replyText[id]
      });
      setReplyText({ ...replyText, [id]: "" });
      fetchTickets();
    } catch (e) {
      setMsg({ type: "error", text: "Failed to send reply." });
    }
  };

  return (
    <div className="page-wrapper" style={{ maxWidth: 800 }}>
      <div className="flex-between mb-3">
        <div>
          <h1 className="page-title" style={{ textAlign: "left", fontSize: "1.8rem" }}>🎧 Support Center</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>We're here to help you.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowNew(!showNew)}>
          {showNew ? "Cancel" : "+ New Ticket"}
        </button>
      </div>

      {msg.text && <div className={`alert alert-${msg.type} mb-3`}>{msg.text}</div>}

      {showNew && (
        <form className="glass-card mb-3" onSubmit={createTicket}>
          <h3 className="section-title mb-2">Create New Ticket</h3>
          <div className="form-group">
            <label className="field-label">Subject</label>
            <input className="rs-input" required value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} placeholder="What do you need help with?" />
          </div>
          <div className="form-group">
            <label className="field-label">Priority</label>
            <select className="rs-select" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div className="form-group">
            <label className="field-label">Description</label>
            <textarea className="rs-input" required value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Describe your issue in detail..." rows="4"></textarea>
          </div>
          <button type="submit" className="btn-primary">Submit Ticket</button>
        </form>
      )}

      {loading ? (
        <div className="loader-wrapper"><div className="loader"></div></div>
      ) : tickets.length === 0 ? (
        <div className="glass-card text-center" style={{ padding: "3rem" }}>
          <p style={{ fontSize: "3rem" }}>🎫</p>
          <p style={{ color: "var(--text-muted)", marginTop: "1rem" }}>You have no support tickets.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {tickets.map(t => (
            <div className="glass-card" key={t._id}>
              <div className="flex-between mb-2">
                <h4 style={{ color: "var(--text-dark)" }}>{t.subject}</h4>
                <span className={`badge ${t.status === "resolved" ? "badge-green" : t.status === "closed" ? "badge-red" : "badge-yellow"}`}>
                  {t.status.toUpperCase()}
                </span>
              </div>
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "1rem" }}>{t.description}</p>

              <div style={{ background: "rgba(0,0,0,0.1)", padding: "1rem", borderRadius: "8px", marginBottom: "1rem" }}>
                {t.responses.length === 0 ? (
                  <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", textAlign: "center" }}>No replies yet. An admin will respond shortly.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    {t.responses.map((r, i) => (
                      <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: r.sender === user._id ? "flex-end" : "flex-start" }}>
                        <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "0.2rem" }}>{r.senderName}</span>
                        <div style={{ background: r.sender === user._id ? "var(--green-mid)" : "rgba(255,255,255,0.05)", color: r.sender === user._id ? "white" : "var(--cream)", padding: "0.5rem 0.75rem", borderRadius: "8px", fontSize: "0.85rem", maxWidth: "85%" }}>
                          {r.message}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {t.status !== "resolved" && t.status !== "closed" && (
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <input className="rs-input" value={replyText[t._id] || ""} onChange={e => setReplyText({ ...replyText, [t._id]: e.target.value })} placeholder="Type your reply..." style={{ flex: 1 }} />
                  <button className="btn-primary" style={{ width: "auto" }} onClick={() => replyTicket(t._id)}>Reply</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
