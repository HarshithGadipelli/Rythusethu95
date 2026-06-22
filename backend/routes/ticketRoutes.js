import express from "express";
import Ticket from "../models/Ticket.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";

const router = express.Router();

async function notify(app, userId, title, message, type = "system") {
  const notif = await Notification.create({ user: userId, title, message, type });
  const io = app.get("io");
  if (io) io.emit("notification", notif);
}

// User creates a ticket
router.post("/create", async (req, res) => {
  try {
    const ticket = await Ticket.create(req.body);
    
    // Notify admins
    const admins = await User.find({ role: "admin" });
    for (const admin of admins) {
      await notify(req.app, admin._id, "🎟️ New Support Ticket", `New ticket created by ${req.body.role}: ${ticket.subject}`);
    }

    res.json(ticket);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get tickets for a specific user
router.get("/user/:userId", async (req, res) => {
  try {
    const tickets = await Ticket.find({ creator: req.params.userId }).sort({ updatedAt: -1 });
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Get all tickets
router.get("/admin", async (req, res) => {
  try {
    const tickets = await Ticket.find().populate("creator", "name email role").sort({ updatedAt: -1 });
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reply to a ticket
router.post("/:id/reply", async (req, res) => {
  try {
    const { sender, senderName, message } = req.body;
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ error: "Ticket not found" });

    ticket.responses.push({ sender, senderName, message });
    ticket.status = "in-progress";
    await ticket.save();

    // If admin replies, notify user
    const senderUser = await User.findById(sender);
    if (senderUser && senderUser.role === "admin") {
      await notify(req.app, ticket.creator, "📬 Ticket Update", `Admin replied to your ticket: ${ticket.subject}`);
    }

    res.json(ticket);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Resolve a ticket
router.put("/:id/resolve", async (req, res) => {
  try {
    const { adminId } = req.body;
    const ticket = await Ticket.findByIdAndUpdate(req.params.id, {
      status: "resolved",
      resolvedBy: adminId
    }, { new: true });

    await notify(req.app, ticket.creator, "✅ Ticket Resolved", `Your support ticket has been resolved: ${ticket.subject}`);
    
    res.json(ticket);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
