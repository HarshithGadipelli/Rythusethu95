import express from "express";
import Order from "../models/Order.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";

const router = express.Router();

// Helper: send notification
async function notify(app, userId, title, message, type = "report", priority = "normal", metadata = {}) {
  const notif = await Notification.create({ user: userId, title, message, type, priority, metadata });
  const io = app.get("io");
  if (io) io.emit("notification", notif);
  return notif;
}

// Get all reported orders
router.get("/", async (req, res) => {
  try {
    const reportedOrders = await Order.find({ isReported: true })
      .populate("crop")
      .populate("customer")
      .populate("farmer")
      .populate("agent")
      .sort({ updatedAt: -1 });
    res.json(reportedOrders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin penalizes farmer based on report
router.put("/:orderId/penalize", async (req, res) => {
  try {
    const { penaltyPoints, adminId, notes } = req.body;
    const order = await Order.findById(req.params.orderId).populate("farmer").populate("agent");
    
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (!order.isReported) return res.status(400).json({ error: "Order is not reported" });

    order.reportResolution = "penalized";
    order.reportResolvedBy = adminId;
    order.timeline.push({ status: "penalized", note: `Admin penalized farmer: ${notes || "Mismatch confirmed"}` });
    await order.save();

    // Deduct reward points and trust score from farmer
    if (order.farmer) {
      const deduction = penaltyPoints || 50;
      await User.findByIdAndUpdate(order.farmer._id, {
        $inc: { rewardPoints: -deduction }
      });
      // Assuming farmer trust score logic is in farmer model or handled elsewhere, but we do reward points here
      
      await notify(req.app, order.farmer._id,
        "🚨 Penalty Applied",
        `Admin has confirmed a product mismatch on order #${order.billNumber}. ${deduction} points have been deducted. Note: ${notes}`,
        "report", "urgent", { orderId: order._id }
      );
    }

    // Reward agent for accurate reporting
    if (order.agent) {
      await User.findByIdAndUpdate(order.agent._id, { $inc: { rewardPoints: 10 } });
      await notify(req.app, order.agent._id,
        "✅ Report Confirmed",
        `Your mismatch report on order #${order.billNumber} was confirmed. You earned 10 reward points for your vigilance.`,
        "reward", "normal", { orderId: order._id }
      );
    }

    res.json({ message: "Farmer penalized and report resolved", order });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin dismisses report
router.put("/:orderId/dismiss", async (req, res) => {
  try {
    const { adminId, notes } = req.body;
    const order = await Order.findById(req.params.orderId);

    if (!order) return res.status(404).json({ error: "Order not found" });
    if (!order.isReported) return res.status(400).json({ error: "Order is not reported" });

    order.reportResolution = "dismissed";
    order.reportResolvedBy = adminId;
    order.timeline.push({ status: "dismissed", note: `Admin dismissed the report: ${notes || "No mismatch found"}` });
    await order.save();

    res.json({ message: "Report dismissed", order });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
