import express from "express";
import Order from "../models/Order.js";
import User from "../models/User.js";
import Crop from "../models/Crop.js";
import Delivery from "../models/Delivery.js";
import Farmer from "../models/Farmer.js";
import Agent from "../models/Agent.js";
import Notification from "../models/Notification.js";
import GlobalConfig from "../models/GlobalConfig.js";

const router = express.Router();

// ─── USERS ───
router.get("/users", async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete("/users/:id", async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    await Farmer.deleteMany({ user: req.params.id });
    res.json({ message: "User deleted" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put("/users/:id/role", async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { role: req.body.role }, { new: true }).select("-password");
    res.json(user);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── SECURITY & RULES & POLICY ENFORCEMENT ───
router.put("/users/:id/strike", async (req, res) => {
  try {
    const { reason, adminId } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    
    user.strikes += 1;
    
    // Penalize scores based on role
    if (user.role === "agent") {
      user.deliveryScore = Math.max(0, user.deliveryScore - 15);
    } else {
      user.trustScore = Math.max(0, user.trustScore - 15);
    }

    // Auto-suspend on 3 strikes
    if (user.strikes >= 3) {
      user.accountStatus = "suspended";
    }
    await user.save();

    // Log this somewhere or notify user
    const io = req.app?.get?.("io");
    if (io) io.emit("user_struck", { userId: user._id, strikes: user.strikes, reason });

    res.json(user);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put("/users/:id/status", async (req, res) => {
  try {
    const { status, reason } = req.body; // status: "active", "suspended", "banned"
    const user = await User.findByIdAndUpdate(req.params.id, { accountStatus: status }, { new: true }).select("-password");
    res.json(user);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put("/users/:id/deduct-points", async (req, res) => {
  try {
    const { amount, reason } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    
    user.rewardPoints = Math.max(0, (user.rewardPoints || 0) - (amount || 20));
    await user.save();
    
    res.json({ message: `Deducted points for reason: ${reason}`, user });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put("/users/:id/deduct-wallet", async (req, res) => {
  try {
    const { amount, reason } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    
    // For farmers, we deduct from pendingSettlement
    // For agents, we deduct from walletBalance
    if (user.role === "farmer") {
      user.pendingSettlement = Math.max(0, (user.pendingSettlement || 0) - (amount || 500));
    } else {
      user.walletBalance = Math.max(0, (user.walletBalance || 0) - (amount || 500));
    }
    await user.save();
    
    res.json({ message: `Deducted wallet funds for reason: ${reason}`, user });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── USER VERIFICATION ───
router.put("/users/:id/verify", async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isVerified: true, verificationStatus: "verified" }, { new: true }).select("-password");
    if (user.role === "farmer") {
      await Farmer.findOneAndUpdate({ user: req.params.id }, { verified: true, aadhaarVerified: true });
    }
    const io = req.app.get("io");
    if (io) io.emit("user_verified", { userId: req.params.id });
    res.json(user);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put("/users/:id/reject", async (req, res) => {
  try {
    const { reason } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, { isVerified: false, verificationStatus: "rejected" }, { new: true }).select("-password");
    if (user.role === "farmer") {
      await Farmer.findOneAndUpdate({ user: req.params.id }, { verified: false });
    }
    res.json({ user, reason: reason || "Verification rejected" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── ORDERS ───
router.get("/orders", async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("crop").populate("customer").populate("farmer").populate("agent")
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── DELIVERIES ───
router.get("/deliveries", async (req, res) => {
  try {
    const deliveries = await Delivery.find().populate("order").populate("agent").sort({ createdAt: -1 });
    res.json(deliveries);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Assign delivery agent to order
router.post("/delivery/assign", async (req, res) => {
  try {
    const { orderId, agentId, pickupLocation, deliveryLocation, vehicleType } = req.body;

    // Update the order
    const order = await Order.findByIdAndUpdate(orderId, {
      agent: agentId,
      status: "assigned",
      $push: { timeline: { status: "assigned", note: "Delivery agent assigned by admin" } }
    }, { new: true }).populate("crop").populate("customer").populate("farmer");

    // Create delivery record
    const delivery = await Delivery.create({
      order: orderId,
      agent: agentId,
      pickupLocation: pickupLocation || order?.farmer?.location || "",
      deliveryLocation: deliveryLocation || order?.deliveryAddress || "",
      vehicleType: vehicleType || "bike",
      estimatedTime: "30-45 mins",
      trackingCode: "TRK-" + Date.now().toString(36).toUpperCase()
    });

    const io = req.app.get("io");
    if (io) {
      io.emit("delivery_assigned", delivery);
      io.emit("order_updated", order);
    }

    res.json({ order, delivery });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── PLATFORM STATS ───
router.get("/stats", async (req, res) => {
  try {
    const [users, orders, crops, deliveries] = await Promise.all([
      User.countDocuments(),
      Order.find(),
      Crop.countDocuments(),
      Delivery.countDocuments()
    ]);

    const farmers = await User.countDocuments({ role: "farmer" });
    const customers = await User.countDocuments({ role: "customer" });
    const agents = await User.countDocuments({ role: "agent" });
    const verifiedFarmers = await User.countDocuments({ role: "farmer", isVerified: true });
    const pendingFarmers = await User.countDocuments({ role: "farmer", isVerified: false });

    const totalRevenue = orders.reduce((a, o) => a + (o.totalAmount || 0), 0);
    const totalDeliveryCharges = orders.reduce((a, o) => a + (o.deliveryCharges || 0), 0);
    const totalPlatformFees = orders.reduce((a, o) => a + (o.platformFee || 0), 0);
    const pendingOrders = orders.filter(o => o.status === "pending").length;
    const deliveredOrders = orders.filter(o => o.status === "delivered").length;
    const cancelledOrders = orders.filter(o => o.status === "cancelled").length;

    // Revenue by category
    const revenueByCategory = {};
    for (const order of orders) {
      if (order.crop) {
        const crop = await Crop.findById(order.crop);
        if (crop) {
          const cat = crop.category || "other";
          revenueByCategory[cat] = (revenueByCategory[cat] || 0) + (order.totalAmount || 0);
        }
      }
    }

    res.json({
      totalUsers: users, farmers, customers, agents,
      verifiedFarmers, pendingFarmers,
      totalOrders: orders.length, pendingOrders, deliveredOrders, cancelledOrders,
      totalCrops: crops, totalDeliveries: deliveries,
      totalRevenue, totalDeliveryCharges, totalPlatformFees,
      platformProfit: totalPlatformFees + totalDeliveryCharges,
      revenueByCategory
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── AVAILABLE AGENTS ───
router.get("/agents", async (req, res) => {
  try {
    const agents = await User.find({ role: "agent" }).select("-password");
    res.json(agents);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── PENDING USERS (Farmers & Agents with verification photos) ───
router.get("/pending-users", async (req, res) => {
  try {
    const pendingUsers = await User.find({ role: { $in: ["farmer", "agent"] }, isVerified: false }).select("-password").sort({ createdAt: -1 });
    const result = [];
    for (const user of pendingUsers) {
      if (user.role === "farmer") {
        const farmerProfile = await Farmer.findOne({ user: user._id });
        result.push({
          user,
          farmerProfile: farmerProfile || {},
          photos: {
            farmerPhoto: farmerProfile?.farmerPhoto || "",
            farmPhoto: farmerProfile?.farmPhoto || "",
            productPhoto: farmerProfile?.productPhoto || "",
            aadhaarPhoto: user.aadhaarImage || ""
          }
        });
      } else if (user.role === "agent") {
        const agentProfile = await Agent.findOne({ user: user._id });
        result.push({
          user,
          agentProfile: agentProfile || {},
          photos: {
            avatar: user.avatar || "",
            aadhaarPhoto: user.aadhaarImage || ""
          }
        });
      }
    }
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
// ─── ADMIN FINANCIAL LEDGER ───
router.get("/financials", async (req, res) => {
  try {
    const farmers = await User.find({ role: "farmer", pendingSettlement: { $gt: 0 } }).select("name email phone pendingSettlement upiId bankAccountNumber");
    const agentsOwed = await User.find({ role: "agent", walletBalance: { $gt: 0 } }).select("name email phone walletBalance upiId bankAccountNumber");
    const agentsHoldingCash = await User.find({ role: "agent", cashInHand: { $gt: 0 } }).select("name email phone cashInHand upiId bankAccountNumber");
    
    // Total accumulated platform revenue
    const orders = await Order.find({ adminRevenue: { $gt: 0 } });
    const totalPlatformRevenue = orders.reduce((sum, o) => sum + (o.adminRevenue || 0), 0);

    const totalOwedToFarmers = farmers.reduce((sum, f) => sum + (f.pendingSettlement || 0), 0);
    const totalAgentPayOwed = agentsOwed.reduce((sum, a) => sum + (a.walletBalance || 0), 0);
    const totalCashWithAgents = agentsHoldingCash.reduce((sum, a) => sum + (a.cashInHand || 0), 0);

    res.json({
      totalPlatformRevenue,
      totalOwedToFarmers,
      totalAgentPayOwed,
      totalCashWithAgents,
      farmers,
      agentsOwed,
      agentsHoldingCash
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post("/settle/farmer/:id", async (req, res) => {
  try {
    const farmer = await User.findById(req.params.id);
    if (!farmer) return res.status(404).json({ error: "Farmer not found" });
    
    // Clear farmer balance
    farmer.pendingSettlement = 0;
    await farmer.save();
    res.json({ message: "Farmer settled successfully", farmer });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post("/settle/agent-collect/:id", async (req, res) => {
  try {
    const agent = await User.findById(req.params.id);
    if (!agent) return res.status(404).json({ error: "Agent not found" });
    
    // Admin collected COD cash from agent
    agent.cashInHand = 0;
    await agent.save();
    res.json({ message: "Cash collected from agent", agent });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post("/settle/agent-pay/:id", async (req, res) => {
  try {
    const agent = await User.findById(req.params.id);
    if (!agent) return res.status(404).json({ error: "Agent not found" });
    
    // Admin paid the agent their weekly delivery fees
    agent.walletBalance = 0;
    await agent.save();
    res.json({ message: "Agent weekly pay settled", agent });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── FESTIVAL MODE ───
router.post("/festival", async (req, res) => {
  try {
    const { isFestivalActive, discountPercentage, festivalMessage } = req.body;
    let config = await GlobalConfig.findOne();
    if (!config) {
      config = new GlobalConfig();
    }
    config.isFestivalActive = isFestivalActive !== undefined ? isFestivalActive : !config.isFestivalActive;
    if (discountPercentage) config.discountPercentage = discountPercentage;
    if (festivalMessage) config.festivalMessage = festivalMessage;
    
    await config.save();

    if (config.isFestivalActive) {
      // Bulk notify all farmers
      const farmers = await User.find({ role: "farmer" });
      const notifications = farmers.map(f => ({
        user: f._id,
        title: "🎉 Festival Mode Activated!",
        message: config.festivalMessage + " Please ensure you are ready with enough stock to handle the increased demand.",
        type: "system",
        priority: "high"
      }));
      if (notifications.length > 0) {
        await Notification.insertMany(notifications);
      }
      
      const io = req.app.get("io");
      if (io) io.emit("festival_activated", config);
    }

    res.json(config);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── ADMIN FINE SYSTEM ───
router.post("/users/:id/fine", async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: "Invalid amount" });
    
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    
    // Deduct from wallet balance
    user.walletBalance = (user.walletBalance || 0) - amount;
    
    // Add strike
    user.strikes = (user.strikes || 0) + 1;
    
    // Penalize score if farmer or agent
    if (user.role === "farmer") {
      user.trustScore = Math.max(0, (user.trustScore || 85) - 5);
    } else if (user.role === "agent") {
      user.deliveryScore = Math.max(0, (user.deliveryScore || 100) - 10);
    }
    
    await user.save();
    
    const io = req.app.get("io");
    if (io) {
      const Notification = (await import("../models/Notification.js")).default;
      const notif = await Notification.create({
        user: user._id,
        title: "⚠️ Policy Violation Fine",
        message: `Admin has deducted ₹${amount} from your wallet due to a policy violation. Please adhere to the guidelines.`,
        type: "system",
        priority: "high"
      });
      io.emit("notification", notif);
    }

    res.json({ message: "Fine applied successfully", user });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;