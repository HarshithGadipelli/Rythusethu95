import express from "express";
import Delivery from "../models/Delivery.js";
import Order from "../models/Order.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import multer from "multer";
import path from "path";

// Setup multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "public/uploads/"),
  filename: (req, file, cb) => cb(null, `delivery_${Date.now()}${path.extname(file.originalname)}`)
});
const upload = multer({ storage });

const router = express.Router();

// Helper: send notification + socket event
async function notify(app, userId, title, message, type = "delivery", priority = "normal", metadata = {}) {
  const notif = await Notification.create({ user: userId, title, message, type, priority, metadata });
  const io = app.get("io");
  if (io) io.emit("notification", notif);
  return notif;
}

// Haversine distance (km)
function haversineDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Vehicle speeds (km/h) for ETA calculation
const VEHICLE_SPEEDS = { bike: 25, auto: 20, truck: 15, van: 18 };

// Compute ETA in minutes
function computeETA(distanceKm, vehicleType = "bike") {
  const speed = VEHICLE_SPEEDS[vehicleType] || 25;
  return Math.round((distanceKm / speed) * 60) + 15; // 15 min buffer
}

// Get all deliveries
router.get("/", async (req, res) => {
  try {
    const deliveries = await Delivery.find()
      .populate({ path: "order", populate: [{ path: "crop" }, { path: "customer" }, { path: "farmer" }] })
      .populate("agent")
      .sort({ createdAt: -1 });
    res.json(deliveries);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get deliveries for a specific agent
router.get("/agent/:agentId", async (req, res) => {
  try {
    const deliveries = await Delivery.find({ agent: req.params.agentId })
      .populate({ path: "order", populate: [{ path: "crop" }, { path: "customer" }, { path: "farmer" }] })
      .sort({ createdAt: -1 });
    res.json(deliveries);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get available orders needing delivery (unassigned, confirmed orders with delivery type)
router.get("/available", async (req, res) => {
  try {
    const { lat, lng } = req.query;
    let orders = await Order.find({
      status: { $in: ["confirmed", "processing"] },
      agent: { $exists: false },
      deliveryType: { $ne: "farm_pickup" }
    }).populate("crop").populate("customer").populate("farmer");

    if (lat && lng) {
      const agentLat = parseFloat(lat);
      const agentLng = parseFloat(lng);
      orders = orders.map(o => {
        const pickupLat = o.farmer?.latitude || o.crop?.latitude || 0;
        const pickupLng = o.farmer?.longitude || o.crop?.longitude || 0;
        const dist = haversineDistance(agentLat, agentLng, pickupLat, pickupLng);
        return { ...o.toObject(), distanceToPickup: dist };
      }).sort((a, b) => a.distanceToPickup - b.distanceToPickup);
    } else {
      orders.sort((a, b) => b.createdAt - a.createdAt);
    }

    res.json(orders);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Agent accepts a delivery
router.post("/accept/:orderId", async (req, res) => {
  try {
    const { agentId, vehicleType } = req.body;
    const order = await Order.findById(req.params.orderId).populate("crop").populate("farmer").populate("customer");
    
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (order.agent) return res.status(400).json({ error: "This order already has an assigned agent" });

    // Calculate ETA based on distance & vehicle
    const pickupLat = order.farmer?.latitude || order.crop?.latitude;
    const pickupLng = order.farmer?.longitude || order.crop?.longitude;
    const deliveryLat = order.deliveryLatitude;
    const deliveryLng = order.deliveryLongitude;
    const distance = haversineDistance(pickupLat, pickupLng, deliveryLat, deliveryLng);
    const vehicle = vehicleType || "bike";
    const etaMinutes = computeETA(distance, vehicle);
    const etaText = etaMinutes < 60 ? `${etaMinutes} mins` : `${Math.floor(etaMinutes / 60)}h ${etaMinutes % 60}m`;

    // Update order
    order.agent = agentId;
    order.status = "assigned";
    order.estimatedDeliveryMinutes = etaMinutes;
    order.timeline.push({ status: "assigned", note: `Delivery agent accepted. ETA: ${etaText}` });
    await order.save();

    // Create delivery record
    const delivery = await Delivery.create({
      order: order._id,
      agent: agentId,
      pickupLocation: order.farmer?.location || order.crop?.location || "",
      pickupLatitude: pickupLat,
      pickupLongitude: pickupLng,
      deliveryLocation: order.deliveryAddress || "",
      deliveryLatitude: deliveryLat,
      deliveryLongitude: deliveryLng,
      vehicleType: vehicle,
      estimatedTime: etaText,
      estimatedMinutes: etaMinutes,
      trackingCode: "TRK-" + Date.now().toString(36).toUpperCase()
    });

    const io = req.app.get("io");
    if (io) {
      io.emit("delivery_assigned", delivery);
      io.emit("order_updated", order);
    }

    // ─── Notifications ───

    // Notify customer
    if (order.customer) {
      await notify(req.app, order.customer._id || order.customer,
        "🚚 Delivery Agent Assigned!",
        `Your order for ${order.crop?.name || "product"} is being prepared for delivery! Estimated arrival: ${etaText}. Tracking: ${delivery.trackingCode}`,
        "delivery", "high", { orderId: order._id, trackingCode: delivery.trackingCode }
      );
    }

    // Notify farmer
    if (order.farmer) {
      await notify(req.app, order.farmer._id || order.farmer,
        "📤 Agent Coming for Pickup",
        `A delivery agent is on the way to pick up ${order.crop?.name || "your product"} for order #${order.billNumber}. Please keep it ready!`,
        "delivery", "high", { orderId: order._id }
      );
    }

    // Notify admins
    const admins = await User.find({ role: "admin" });
    for (const admin of admins) {
      await notify(req.app, admin._id,
        "🚚 Delivery Accepted",
        `Agent accepted order #${order.billNumber}. ETA: ${etaText}`,
        "delivery", "low", { orderId: order._id }
      );
    }

    res.json({ order, delivery });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Assign delivery (by admin)
router.post("/assign", async (req, res) => {
  try {
    const delivery = await Delivery.create(req.body);
    const io = req.app.get("io");
    if (io) io.emit("delivery_assigned", delivery);
    res.json(delivery);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Auto-Assign Best Agent Algorithmic Route
router.post("/auto-assign/:orderId", async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId).populate("crop").populate("farmer");
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (order.agent) return res.status(400).json({ error: "Already assigned" });

    // 1. Fetch all active agents
    const agents = await User.find({ role: "agent", isActive: true });
    if (agents.length === 0) return res.status(400).json({ error: "No delivery agents available right now." });

    const pickupLat = order.farmer?.latitude || order.crop?.latitude || 0;
    const pickupLng = order.farmer?.longitude || order.crop?.longitude || 0;

    // 2. Score agents
    // We balance Proximity (distance) and Delivery Score. 
    // Lower combined score is better. Distance in km * 10 - Delivery Score.
    const scoredAgents = agents.map(agent => {
      const dist = haversineDistance(agent.latitude, agent.longitude, pickupLat, pickupLng);
      // Give preference to agents with high delivery score, but heavily penalize distance
      const score = (dist * 10) - (agent.deliveryScore || 0);
      return { agent, dist, score };
    });

    // Sort by best score (lowest score value first)
    scoredAgents.sort((a, b) => a.score - b.score);
    const bestAgentData = scoredAgents[0];
    const bestAgent = bestAgentData.agent;

    // Calculate ETA based on agent's distance to pickup + pickup to drop
    const distToDrop = order.deliveryDistance || haversineDistance(pickupLat, pickupLng, order.deliveryLatitude, order.deliveryLongitude);
    const totalDist = bestAgentData.dist + distToDrop;
    const etaMinutes = computeETA(totalDist, "bike");
    const etaText = etaMinutes < 60 ? `${etaMinutes} mins` : `${Math.floor(etaMinutes / 60)}h ${etaMinutes % 60}m`;

    // 3. Assign
    order.agent = bestAgent._id;
    order.status = "assigned";
    order.estimatedDeliveryMinutes = etaMinutes;
    order.timeline.push({ status: "assigned", note: `Auto-assigned best agent (${bestAgent.name}). ETA: ${etaText}` });
    await order.save();

    const delivery = await Delivery.create({
      order: order._id,
      agent: bestAgent._id,
      pickupLocation: order.farmer?.location || order.crop?.location || "",
      pickupLatitude: pickupLat,
      pickupLongitude: pickupLng,
      deliveryLocation: order.deliveryAddress || "",
      deliveryLatitude: order.deliveryLatitude,
      deliveryLongitude: order.deliveryLongitude,
      vehicleType: "bike",
      estimatedTime: etaText,
      estimatedMinutes: etaMinutes,
      trackingCode: "TRK-" + Date.now().toString(36).toUpperCase()
    });

    const io = req.app.get("io");
    if (io) {
      io.emit("delivery_assigned", delivery);
      io.emit("order_updated", order);
    }

    // Notify agent
    await notify(req.app, bestAgent._id, "🔔 New Delivery Assigned", `You were auto-assigned a delivery for ${order.crop?.name}. ETA to complete: ${etaText}`, "delivery", "high", { orderId: order._id });

    // Notify customer
    if (order.customer) {
      await notify(req.app, order.customer, "🚚 Best Agent Assigned!", `Your order was assigned to ${bestAgent.name}. Estimated arrival: ${etaText}.`, "delivery", "high", { orderId: order._id });
    }

    res.json({ success: true, agent: bestAgent, delivery });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Generate Delivery OTP
router.post("/:id/generate-otp", async (req, res) => {
  try {
    const { id } = req.params;
    const delivery = await Delivery.findById(id).populate("order");
    if (!delivery || !delivery.order) return res.status(404).json({ error: "Delivery/Order not found" });

    const orderId = delivery.order._id || delivery.order;
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    await Order.findByIdAndUpdate(orderId, { verificationCode: otp });

    // In a real app, send this OTP via SMS. For now, we'll send an app notification.
    if (delivery.order.customer) {
      await notify(req.app, delivery.order.customer._id || delivery.order.customer,
        "🔑 Delivery OTP",
        `Your delivery agent is arriving soon! Share this OTP to receive your order: ${otp}`,
        "delivery", "high", { orderId }
      );
    }

    res.json({ success: true, message: "OTP sent to customer." });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Verify Delivery OTP
router.post("/:id/verify-otp", async (req, res) => {
  try {
    const { id } = req.params;
    const { otp } = req.body;
    
    const delivery = await Delivery.findById(id).populate("order");
    if (!delivery || !delivery.order) return res.status(404).json({ error: "Delivery/Order not found" });

    const order = await Order.findById(delivery.order._id || delivery.order);
    if (!order || order.verificationCode !== otp) {
      return res.status(400).json({ error: "Invalid OTP. Please ask the customer again." });
    }

    // OTP verified, allow status change to delivered
    res.json({ success: true, message: "OTP verified successfully!" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Update delivery status
router.put("/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const updates = { status };
    if (status === "delivered") updates.deliveredAt = new Date();

    const delivery = await Delivery.findByIdAndUpdate(id, updates, { new: true })
      .populate({ path: "order", populate: [{ path: "crop" }, { path: "customer" }, { path: "farmer" }] });

    // Also update the order status
    if (delivery?.order) {
      const orderStatusMap = {
        "picked_up": "picked_up",
        "in_transit": "in_transit",
        "delivered": "delivered",
        "failed": "cancelled"
      };
      if (orderStatusMap[status]) {
        let orderUpdates = {
          status: orderStatusMap[status],
          $push: { timeline: { status: orderStatusMap[status], note: `Delivery ${status.replace("_", " ")}` } }
        };
        // Auto-clear COD payment upon delivery
        if (status === "delivered" && delivery.order.paymentMode === "cod") {
          orderUpdates.paymentStatus = "paid";
          orderUpdates.$push.timeline = { status: "delivered", note: "Delivery completed and COD payment collected." };
        }
        await Order.findByIdAndUpdate(delivery.order._id || delivery.order, orderUpdates);
      }
    }

    const io = req.app.get("io");
    if (io) io.emit("delivery_updated", delivery);

    // ─── Status-specific Notifications ───
    const order = delivery.order;

    if (status === "picked_up" && order?.customer) {
      await notify(req.app, order.customer._id || order.customer,
        "📦 Order Picked Up!",
        `Your ${order.crop?.name || "order"} has been picked up from the farm and is being prepared for delivery!`,
        "delivery", "normal", { orderId: order._id }
      );
    }

    if (status === "in_transit" && order?.customer) {
      await notify(req.app, order.customer._id || order.customer,
        "🚚 On the Way!",
        `Your ${order.crop?.name || "order"} is on its way to you! Estimated arrival: ${delivery.estimatedTime || "Soon"}`,
        "delivery", "high", { orderId: order._id }
      );
    }

    if (status === "delivered") {
      // Notify customer
      if (order?.customer) {
        await notify(req.app, order.customer._id || order.customer,
          "✅ Order Delivered!",
          `Your ${order.crop?.name || "order"} has been delivered successfully! Enjoy your fresh produce. 🌾`,
          "delivery", "high", { orderId: order._id }
        );
      }
      // Notify farmer
      if (order?.farmer) {
        await notify(req.app, order.farmer._id || order.farmer,
          "✅ Delivery Complete",
          `Order #${order.billNumber || ""} for ${order.crop?.name || "your product"} has been delivered to the customer.`,
          "delivery", "normal", { orderId: order._id }
        );
      }
      // Notify admins
      const admins = await User.find({ role: "admin" });
      for (const admin of admins) {
        await notify(req.app, admin._id,
          "✅ Delivery Completed",
          `Order #${order?.billNumber || ""} delivered successfully.`,
          "delivery", "low", { orderId: order?._id }
        );
      }
      // Award agent XP
      if (delivery.agent) {
        await User.findByIdAndUpdate(delivery.agent, { $inc: { experiencePoints: 10 } });
      }
    }

    if (status === "failed") {
      if (order?.customer) {
        await notify(req.app, order.customer._id || order.customer,
          "❌ Delivery Issue",
          `Unfortunately there was an issue with your delivery. Our team will contact you shortly.`,
          "delivery", "urgent", { orderId: order._id }
        );
      }
      // Notify admins
      const admins = await User.find({ role: "admin" });
      for (const admin of admins) {
        await notify(req.app, admin._id,
          "❌ Delivery Failed",
          `Delivery for order #${order?.billNumber || ""} has failed. Requires attention.`,
          "delivery", "high", { orderId: order?._id }
        );
      }
    }

    res.json(delivery);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Upload pickup or delivery photo
router.put("/:id/photo", upload.single("photo"), async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.body; // "pickup" or "delivery"
    if (!req.file) return res.status(400).json({ error: "No image file provided." });

    const photoUrl = `/uploads/${req.file.filename}`;
    const updates = type === "pickup" ? { pickupPhoto: photoUrl } : { deliveryPhoto: photoUrl };

    const delivery = await Delivery.findByIdAndUpdate(id, updates, { new: true });
    if (!delivery) return res.status(404).json({ error: "Delivery not found" });

    res.json({ success: true, message: "Photo uploaded successfully", delivery });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Agent earnings
router.get("/earnings/:agentId", async (req, res) => {
  try {
    const deliveries = await Delivery.find({ agent: req.params.agentId, status: "delivered" }).populate("order");
    const totalDeliveries = deliveries.length;
    const totalEarnings = deliveries.reduce((sum, d) => sum + (d.order?.deliveryCharges || 30), 0);
    const todayDeliveries = deliveries.filter(d => {
      const today = new Date();
      const deliveredDate = new Date(d.deliveredAt || d.updatedAt);
      return deliveredDate.toDateString() === today.toDateString();
    }).length;

    const agent = await Agent.findOne({ user: req.params.agentId });
    const trustScore = agent ? agent.trustScore : { score: 100, rating: 5.0, totalRatings: 0 };

    res.json({ totalDeliveries, totalEarnings, todayDeliveries, perDeliveryAvg: totalDeliveries ? Math.round(totalEarnings / totalDeliveries) : 0, trustScore });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Rate Delivery Agent
import Agent from "../models/Agent.js";
router.post("/rate-agent/:orderId", async (req, res) => {
  try {
    const { rating } = req.body;
    const order = await Order.findById(req.params.orderId);
    if (!order || !order.agent) return res.status(404).json({ error: "Order or Agent not found" });

    const agent = await Agent.findOne({ user: order.agent });
    if (!agent) return res.status(404).json({ error: "Agent details not found" });

    // Update trust score logic
    const currentRating = agent.trustScore.rating;
    const totalRatings = agent.trustScore.totalRatings;
    
    agent.trustScore.rating = ((currentRating * totalRatings) + rating) / (totalRatings + 1);
    agent.trustScore.totalRatings += 1;
    
    // Scale score out of 100 based on rating (5 stars = 100)
    agent.trustScore.score = Math.round((agent.trustScore.rating / 5) * 100);

    await agent.save();

    res.json({ message: "Agent rated successfully", trustScore: agent.trustScore });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


export default router;