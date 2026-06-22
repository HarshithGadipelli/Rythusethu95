import express from "express";
import Order from "../models/Order.js";
import Crop from "../models/Crop.js";
import User from "../models/User.js";
import Farmer from "../models/Farmer.js";
import Notification from "../models/Notification.js";
import Delivery from "../models/Delivery.js";
import { addBlockToChain } from "../utils/blockchain.js";

const router = express.Router();

// Helper: send notification + socket event
async function notify(app, userId, title, message, type = "order", priority = "normal", metadata = {}) {
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

// Vehicle speeds (km/h)
const VEHICLE_SPEEDS = { bike: 25, auto: 20, truck: 15, van: 18 };

// Compute ETA in minutes
function computeETA(distanceKm, vehicleType = "bike") {
  const speed = VEHICLE_SPEEDS[vehicleType] || 25;
  return Math.round((distanceKm / speed) * 60) + 15; // 15 min buffer for pickup/loading
}

// Auto Assign Delivery Agent Logic
async function autoAssignDelivery(app, orderDoc) {
  try {
    if (orderDoc.deliveryType === "farm_pickup" || orderDoc.status !== "pending") return;
    
    let pickupLat = orderDoc.pickupLatitude || 0;
    let pickupLng = orderDoc.pickupLongitude || 0;

    // Fallback if Order doesn't have it
    if (pickupLat === 0 && pickupLng === 0) {
      if (orderDoc.farmer) {
        const farmer = await User.findById(orderDoc.farmer);
        pickupLat = farmer?.latitude || 0;
        pickupLng = farmer?.longitude || 0;
      }
      if (pickupLat === 0 && pickupLng === 0 && orderDoc.crop) {
        const crop = await Crop.findById(orderDoc.crop);
        pickupLat = crop?.latitude || 0;
        pickupLng = crop?.longitude || 0;
      }
    }
    
    if (pickupLat === 0 && pickupLng === 0) return;

    const agents = await User.find({ role: "agent", isActive: true });
    if (!agents.length) return;

    const scoredAgents = agents.map(agent => {
      const dist = haversineDistance(agent.latitude || 0, agent.longitude || 0, pickupLat, pickupLng);
      const score = (dist * 10) - (agent.deliveryScore || 0);
      return { agent, dist, score };
    });

    scoredAgents.sort((a, b) => a.score - b.score);
    const bestAgentData = scoredAgents[0];
    const bestAgent = bestAgentData.agent;

    const distToDrop = orderDoc.deliveryDistance || haversineDistance(pickupLat, pickupLng, orderDoc.deliveryLatitude || 0, orderDoc.deliveryLongitude || 0);
    const totalDist = bestAgentData.dist + distToDrop;
    const etaMinutes = computeETA(totalDist, "bike");
    const etaText = etaMinutes < 60 ? `${etaMinutes} mins` : `${Math.floor(etaMinutes / 60)}h ${etaMinutes % 60}m`;

    const order = await Order.findById(orderDoc._id);
    order.agent = bestAgent._id;
    order.status = "assigned";
    order.estimatedDeliveryMinutes = etaMinutes;
    order.timeline.push({ status: "assigned", note: `Auto-assigned best agent (${bestAgent.name}). ETA: ${etaText}` });
    await order.save();

    const delivery = await Delivery.create({
      order: order._id,
      agent: bestAgent._id,
      pickupLocation: "Farmer Location",
      pickupLatitude: pickupLat,
      pickupLongitude: pickupLng,
      deliveryLocation: order.deliveryAddress || "Customer Location",
      deliveryLatitude: order.deliveryLatitude || 0,
      deliveryLongitude: order.deliveryLongitude || 0,
      vehicleType: "bike",
      estimatedTime: etaText,
      estimatedMinutes: etaMinutes,
      trackingCode: "TRK-" + Date.now().toString(36).toUpperCase()
    });

    const io = app.get("io");
    if (io) {
      io.emit("delivery_assigned", delivery);
      io.emit("order_updated", order);
    }
    
    await notify(app, bestAgent._id, 
      "🚀 New Delivery Auto-Assigned!", 
      `You have been assigned a new delivery. Pickup is ${bestAgentData.dist.toFixed(1)}km away.`,
      "delivery", "high", { deliveryId: delivery._id }
    );
  } catch (err) {
    console.error("Auto assign delivery failed:", err);
  }
}

// Create order (with stock validation, delivery charges, bill, product snapshot, verification code)
router.post("/create", async (req, res) => {
  try {
    const { crop, quantity, deliveryType, deliveryCharges, deliveryDistance, isPrebooked, pointsUsed, customer, farmer } = req.body;

    // Stock validation
    let cropDoc = null;
    if (crop && quantity) {
      cropDoc = await Crop.findById(crop);
      if (!cropDoc) return res.status(404).json({ error: "Crop not found" });
      if (cropDoc.quantity < Number(quantity)) {
        return res.status(400).json({ error: `Only ${cropDoc.quantity} ${cropDoc.unit || "kg"} available in stock.` });
      }
    }

    // Handle reward points deduction
    let finalDiscount = 0;
    let cust = null;
    if (customer) {
      cust = await User.findById(customer);
    }
    
    if (pointsUsed && Number(pointsUsed) > 0 && cust) {
      if (cust.rewardPoints >= Number(pointsUsed)) {
        finalDiscount = Number(pointsUsed);
        cust.rewardPoints -= finalDiscount;
        await cust.save();
      }
    }

    // Calculate amounts
    const subtotal = req.body.totalAmount || 0;
    const charges = deliveryType === "farm_pickup" ? 0 : (deliveryCharges || 0);
    const platformFee = Math.round(subtotal * 0.05); // 5% platform fee
    const totalAmount = Math.max(0, subtotal + charges - finalDiscount);

    // Handle Wallet Payment
    if (req.body.paymentMode === "wallet" && cust) {
      if (cust.walletBalance < totalAmount) {
        return res.status(400).json({ error: "Insufficient wallet balance." });
      }
      cust.walletBalance -= totalAmount;
      await cust.save();
      req.body.paymentStatus = "paid"; // Auto-mark paid
    }
    
    // Base points logic
    let pointsEarned = Math.floor(totalAmount / 100);
    
    // Customer Group Buying Multiplier
    if (quantity >= 20) {
      pointsEarned *= 2; // 2x points for bulk/group buying
    }
    
    // Farmer Quality Multiplier
    let farmerPoints = pointsEarned;
    if (cropDoc && cropDoc.qualityGrade === "A") {
      farmerPoints *= 3; // 3x multiplier for Grade A quality
    }

    const initialStatus = isPrebooked ? "prebooked" : "pending";

    // Compute estimated delivery time
    const distKm = deliveryDistance || 0;
    const estimatedDeliveryMinutes = deliveryType === "farm_pickup" ? 0 : computeETA(distKm);

    // Build product snapshot for security verification
    const productSnapshot = cropDoc ? {
      name: cropDoc.name,
      category: cropDoc.category,
      isOrganic: cropDoc.isOrganic,
      isPesticideFree: cropDoc.isPesticideFree,
      quantity: Number(quantity),
      unit: cropDoc.unit || "kg",
      price: cropDoc.price,
      image: cropDoc.image || "",
      location: cropDoc.location || ""
    } : {};

    let pickupLat = cropDoc?.latitude || 0;
    let pickupLng = cropDoc?.longitude || 0;
    let pickupAddress = cropDoc?.location || "";
    if (farmer) {
      const farmerUser = await User.findById(farmer);
      const farmerDoc = await Farmer.findOne({ user: farmer });
      if (farmerDoc && farmerDoc.farmLocation) {
        pickupAddress = farmerDoc.farmLocation;
      } else if (farmerUser && farmerUser.location) {
        pickupAddress = farmerUser.location;
      }
      if (farmerUser && farmerUser.latitude && farmerUser.longitude) {
        pickupLat = farmerUser.latitude;
        pickupLng = farmerUser.longitude;
      }
    }

    const order = await Order.create({
      ...req.body,
      status: initialStatus,
      isPrebooked: isPrebooked || false,
      pointsEarned,
      pointsUsed: finalDiscount,
      subtotal,
      deliveryCharges: charges,
      deliveryDistance: deliveryDistance || 0,
      estimatedDeliveryMinutes,
      platformFee,
      totalAmount,
      pickupAddress,
      pickupLatitude: pickupLat,
      pickupLongitude: pickupLng,
      productSnapshot,
      timeline: [{ status: initialStatus, note: isPrebooked ? "Pre-booking placed" : "Order placed by customer" }]
    });

    // ─── Blockchain Logging ───
    await addBlockToChain(
      order._id, 
      crop, 
      isPrebooked ? "Pre-booking Placed" : "Order Placed", 
      `Quantity: ${quantity} ${cropDoc?.unit || "kg"}`, 
      cust?.name ? `Customer: ${cust.name}` : "Customer", 
      req.body.deliveryAddress || "Platform"
    );

    // ─── Notifications ───

    // Notify farmer
    if (farmer) {
      await notify(req.app, farmer,
        "📦 New Order Received!",
        `You received a new order for ${cropDoc?.name || "a crop"} — ${quantity} ${cropDoc?.unit || "kg"} • ₹${totalAmount.toLocaleString()}`,
        "order", "high", { orderId: order._id }
      );
    }

    // Notify customer with verification code
    if (customer) {
      // Award points
      if (pointsEarned > 0) {
        await User.findByIdAndUpdate(customer, { $inc: { rewardPoints: pointsEarned } });
        await notify(req.app, customer,
          "🏆 Points Earned!",
          `You earned ${pointsEarned} Reward Points from your purchase!`,
          "reward", "normal", { orderId: order._id }
        );
      }

      // Send verification code
      await notify(req.app, customer,
        "🔐 Your Verification Code",
        `Your order verification code is: ${order.verificationCode}. Share this with the delivery agent to confirm your product.`,
        "order", "high", { orderId: order._id, verificationCode: order.verificationCode }
      );
    }

    // Notify farmer for points
    if (farmer && farmerPoints > 0) {
      await User.findByIdAndUpdate(farmer, { $inc: { rewardPoints: farmerPoints } });
      await notify(req.app, farmer,
        "💰 New Sale & Points!",
        `You earned ${farmerPoints} Reward Points from a new order${cropDoc?.qualityGrade === "A" ? " (includes Grade A 3x bonus!)" : ""}.`,
        "reward", "normal", { orderId: order._id }
      );
    }

    // Notify admins
    const admins = await User.find({ role: "admin" });
    for (const admin of admins) {
      await notify(req.app, admin._id,
        "📋 New Order on Platform",
        `New order #${order.billNumber}: ${cropDoc?.name || "Crop"} — ₹${totalAmount.toLocaleString()}`,
        "order", "normal", { orderId: order._id }
      );
    }

    // Decrement crop stock
    if (crop && quantity) {
      const updated = await Crop.findByIdAndUpdate(crop, {
        $inc: { quantity: -Number(quantity), totalOrders: 1 }
      }, { new: true });

      // Auto-mark unavailable if stock reaches 0
      if (updated && updated.quantity <= 0) {
        await Crop.findByIdAndUpdate(crop, { isAvailable: false });
      } else if (updated && updated.quantity < 50) {
        const io = req.app.get("io");
        if (io) io.emit("low_stock_alert", { cropId: crop, name: updated.name, quantity: updated.quantity });
      }
    }

    // Emit real-time event
    const io = req.app.get("io");
    if (io) io.emit("order_created", order);

    // Trigger auto-assignment asynchronously
    autoAssignDelivery(req.app, order);

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Multi-address group checkout
router.post("/checkout-multi", async (req, res) => {
  try {
    const { items, customer, paymentMode, pointsUsed } = req.body;

    if (!items || items.length === 0) return res.status(400).json({ error: "Cart is empty" });

    // Stock validation for all
    for (const item of items) {
      const cropDoc = await Crop.findById(item.cropId);
      if (!cropDoc) return res.status(404).json({ error: `Crop not found` });
      if (cropDoc.quantity < Number(item.quantity)) {
        return res.status(400).json({ error: `Only ${cropDoc.quantity} ${cropDoc.unit || "kg"} available for ${cropDoc.name}.` });
      }
    }

    let cust = null;
    if (customer) cust = await User.findById(customer);

    // Calculate totals
    const grandTotal = items.reduce((sum, item) => sum + (item.totalAmount || 0), 0);

    // Reward points
    let finalDiscount = 0;
    if (pointsUsed && Number(pointsUsed) > 0 && cust) {
      if (cust.rewardPoints >= Number(pointsUsed)) {
        finalDiscount = Number(pointsUsed);
        cust.rewardPoints -= finalDiscount;
        await cust.save();
      }
    }

    // Wallet
    if (paymentMode === "wallet" && cust) {
      const netTotal = grandTotal - finalDiscount;
      if (cust.walletBalance < netTotal) {
        return res.status(400).json({ error: "Insufficient wallet balance." });
      }
      cust.walletBalance -= netTotal;
      await cust.save();
    }

    // Distribute discount proportionally (or just apply to first order for simplicity)
    let remainingDiscount = finalDiscount;

    const createdOrders = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const cropDoc = await Crop.findById(item.cropId);
      
      const itemDiscount = Math.min(remainingDiscount, item.totalAmount);
      remainingDiscount -= itemDiscount;
      
      const itemTotalAmount = Math.max(0, item.totalAmount - itemDiscount);
      const platformFee = Math.round(item.subtotal * 0.05);
      
      let pointsEarned = Math.floor(itemTotalAmount / 100);
      if (item.quantity >= 20) pointsEarned *= 2;
      let farmerPoints = pointsEarned;
      if (cropDoc.qualityGrade === "A") farmerPoints *= 3;

      const estimatedDeliveryMinutes = item.deliveryType === "farm_pickup" ? 0 : computeETA(item.deliveryDistance || 0);

      const productSnapshot = {
        name: cropDoc.name,
        category: cropDoc.category,
        isOrganic: cropDoc.isOrganic,
        isPesticideFree: cropDoc.isPesticideFree,
        quantity: Number(item.quantity),
        unit: cropDoc.unit || "kg",
        price: cropDoc.price,
        image: cropDoc.image || "",
        location: cropDoc.location || ""
      };

      let itemPickupLat = cropDoc.latitude || 0;
      let itemPickupLng = cropDoc.longitude || 0;
      let itemPickupAddress = cropDoc.location || "";
      if (cropDoc.farmer) {
        const farmerDoc = await Farmer.findOne({ user: cropDoc.farmer });
        if (farmerDoc && farmerDoc.farmLocation) {
          itemPickupAddress = farmerDoc.farmLocation;
          if (farmerDoc.latitude && farmerDoc.longitude) {
            itemPickupLat = farmerDoc.latitude;
            itemPickupLng = farmerDoc.longitude;
          }
        }
      }

      const order = await Order.create({
        crop: item.cropId,
        customer,
        farmer: cropDoc.farmer,
        quantity: item.quantity,
        status: item.isPrebooked ? "prebooked" : "pending",
        isPrebooked: item.isPrebooked || false,
        pointsEarned,
        pointsUsed: itemDiscount,
        subtotal: item.subtotal,
        deliveryCharges: item.deliveryType === "farm_pickup" ? 0 : (item.deliveryCharges || 0),
        deliveryDistance: item.deliveryDistance || 0,
        estimatedDeliveryMinutes,
        platformFee,
        totalAmount: itemTotalAmount,
        paymentMode: paymentMode || "cod",
        paymentStatus: paymentMode === "wallet" ? "paid" : "pending",
        deliveryAddress: item.deliveryAddress,
        deliveryLatitude: item.deliveryLatitude,
        deliveryLongitude: item.deliveryLongitude,
        pickupAddress: itemPickupAddress,
        pickupLatitude: itemPickupLat,
        pickupLongitude: itemPickupLng,
        deliveryType: item.deliveryType || "standard",
        productSnapshot,
        timeline: [{ status: "pending", note: "Group order placed by customer" }]
      });

      // Stock update
      const updated = await Crop.findByIdAndUpdate(item.cropId, {
        $inc: { quantity: -Number(item.quantity), totalOrders: 1 }
      }, { new: true });
      if (updated && updated.quantity <= 0) await Crop.findByIdAndUpdate(item.cropId, { isAvailable: false });

      // Notifications
      if (cropDoc.farmer) {
        await notify(req.app, cropDoc.farmer, "📦 New Group Order Received!", `New order for ${cropDoc.name} — ${item.quantity} ${cropDoc.unit} • ₹${itemTotalAmount}`, "order", "high", { orderId: order._id });
        if (farmerPoints > 0) {
           await User.findByIdAndUpdate(cropDoc.farmer, { $inc: { rewardPoints: farmerPoints } });
           await notify(req.app, cropDoc.farmer, "💰 New Sale & Points!", `You earned ${farmerPoints} Reward Points.`, "reward", "normal", { orderId: order._id });
        }
      }
      
      // Blockchain
      await addBlockToChain(order._id, item.cropId, "Group Order Placed", `Quantity: ${item.quantity}`, cust?.name || "Customer", item.deliveryAddress || "Platform");
      
      createdOrders.push(order);
      
      const io = req.app.get("io");
      if (io) io.emit("order_created", order);

      // Trigger auto-assignment asynchronously
      autoAssignDelivery(req.app, order);
    }
    
    // Customer notifications
    if (customer) {
       const totalPoints = createdOrders.reduce((sum, o) => sum + (o.pointsEarned || 0), 0);
       if (totalPoints > 0) {
          await User.findByIdAndUpdate(customer, { $inc: { rewardPoints: totalPoints } });
          await notify(req.app, customer, "🏆 Points Earned!", `You earned ${totalPoints} Reward Points from your group purchase!`, "reward", "normal", {});
       }
       const codesMsg = createdOrders.map(o => `${o.productSnapshot.name}: ${o.verificationCode}`).join("\n");
       await notify(req.app, customer, "🔐 Your Verification Codes", `Your group order verification codes are:\n${codesMsg}`, "order", "high", {});
    }

    res.json({ success: true, orders: createdOrders });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all orders
router.get("/", async (req, res) => {
  try {
    const orders = await Order.find().populate("crop").populate("customer").populate("farmer").populate("agent").sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get orders for a customer
router.get("/customer/:id", async (req, res) => {
  try {
    const orders = await Order.find({ customer: req.params.id }).populate("crop").populate("farmer").sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get orders for a farmer
router.get("/farmer/:id", async (req, res) => {
  try {
    const orders = await Order.find({ farmer: req.params.id }).populate("crop").populate("customer").sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get bill for an order
router.get("/:id/bill", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("crop").populate("customer").populate("farmer");
    if (!order) return res.status(404).json({ error: "Order not found" });

    res.json({
      billNumber: order.billNumber,
      date: order.createdAt,
      customer: { name: order.customer?.name, phone: order.customer?.phone, address: order.deliveryAddress },
      farmer: { name: order.farmer?.name, location: order.farmer?.location },
      items: [{
        name: order.crop?.name || "Crop",
        quantity: order.quantity,
        unit: order.crop?.unit || "kg",
        unitPrice: order.crop?.price || 0,
        subtotal: order.subtotal
      }],
      deliveryType: order.deliveryType,
      deliveryCharges: order.deliveryCharges,
      deliveryDistance: order.deliveryDistance,
      platformFee: order.platformFee,
      totalAmount: order.totalAmount,
      paymentMode: order.paymentMode,
      paymentStatus: order.paymentStatus,
      status: order.status,
      verificationCode: order.verificationCode,
      estimatedDeliveryMinutes: order.estimatedDeliveryMinutes
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get bill for an order
// ...existing code...

// ─── Agent Update Live Location ───
router.put("/:id/live-location", async (req, res) => {
  try {
    const { lat, lng } = req.body;
    if (!lat || !lng) return res.status(400).json({ error: "Latitude and longitude are required" });

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { agentCurrentLatitude: lat, agentCurrentLongitude: lng },
      { new: true }
    );

    if (!order) return res.status(404).json({ error: "Order not found" });

    const io = req.app.get("io");
    if (io) io.emit("agent_location_updated", { orderId: order._id, lat, lng });

    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Securely complete order via OTP
router.put("/:id/complete", async (req, res) => {
  try {
    const { otp, agentId } = req.body;
    const order = await Order.findById(req.params.id);
    
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (order.status === "delivered") return res.status(400).json({ error: "Order already delivered" });
    
    // Validate OTP
    if (order.verificationCode !== otp) {
      return res.status(400).json({ error: "Invalid verification code. Please check with customer." });
    }

    // Update order status securely
    order.status = "delivered";
    order.timeline.push({ status: "delivered", note: "Delivered securely via OTP verification" });
    
    // Agent Payout
    if (order.agent && !order.isSettledWithAgent) {
      await User.findByIdAndUpdate(order.agent, { $inc: { walletBalance: order.deliveryCharges } });
      if (order.paymentMode === "cod") {
        await User.findByIdAndUpdate(order.agent, { $inc: { cashInHand: order.totalAmount } });
      }
      order.isSettledWithAgent = true;
    }

    // Deliver points to customer
    if (order.customer && order.pointsEarned && !order.pointsDistributed) {
      await User.findByIdAndUpdate(order.customer, { $inc: { rewardPoints: order.pointsEarned } });
      order.pointsDistributed = true;
    }
    
    // Add deliveryScore to Agent based on order completion
    if (order.agent) {
      await User.findByIdAndUpdate(order.agent, { $inc: { deliveryScore: 10 } });
    }

    await order.save();

    // Also update Delivery document
    await Delivery.findOneAndUpdate(
      { order: order._id, status: { $ne: "delivered" } },
      { status: "delivered", deliveredAt: new Date() }
    );

    res.json({ success: true, message: "Order delivered successfully." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update order status
router.put("/:id/status", async (req, res) => {
  try {
    const { status, note } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      {
        status,
        $push: { timeline: { status, note: note || `Status changed to ${status}` } }
      },
      { new: true }
    );

    // ─── Blockchain Logging ───
    if (order) {
      await addBlockToChain(
        order._id, 
        order.crop, 
        `Status Updated: ${status}`, 
        note || `Status changed to ${status}`, 
        "System/Farmer", 
        "Platform"
      );
    }

    // If cancelled, restore stock
    if (status === "cancelled") {
      const original = await Order.findById(req.params.id);
      if (original?.crop && original?.quantity) {
        await Crop.findByIdAndUpdate(original.crop, {
          $inc: { quantity: Number(original.quantity) },
          isAvailable: true
        });
      }
    }

    const fetchedOrder = await Order.findById(req.params.id);

    // If picked up, settle with farmer
    if (status === "picked_up" && fetchedOrder && fetchedOrder.farmer) {
      if (!fetchedOrder.isSettledWithFarmer) {
        const farmerAmount = fetchedOrder.subtotal - fetchedOrder.platformFee;
        await User.findByIdAndUpdate(fetchedOrder.farmer, { $inc: { pendingSettlement: farmerAmount } });
        await Order.findByIdAndUpdate(fetchedOrder._id, { isSettledWithFarmer: true, adminRevenue: fetchedOrder.platformFee });
      }
    }

    // If delivered, handle agent payout & COD cash holding
    if (status === "delivered" && fetchedOrder && fetchedOrder.agent) {
      if (!fetchedOrder.isSettledWithAgent) {
        // Agent gets paid the delivery charges (added to their wallet)
        await User.findByIdAndUpdate(fetchedOrder.agent, { $inc: { walletBalance: fetchedOrder.deliveryCharges } });
        
        // If COD, the agent holds the total cash for this order (owed to admin)
        if (fetchedOrder.paymentMode === "cod") {
          await User.findByIdAndUpdate(fetchedOrder.agent, { $inc: { cashInHand: fetchedOrder.totalAmount } });
        }
        
        // Agent gets experience and delivery score
        await User.findByIdAndUpdate(fetchedOrder.agent, { 
          $inc: { experiencePoints: 10, deliveryScore: 5 } 
        });
        await Order.findByIdAndUpdate(fetchedOrder._id, { isSettledWithAgent: true });
      }
    }

    // Emit real-time event
    const io = req.app.get("io");
    if (io) io.emit("order_updated", order);

    // Notify customer about status change
    const updatedOrder = await Order.findById(req.params.id);
    if (updatedOrder && updatedOrder.customer) {
      await notify(req.app, updatedOrder.customer,
        "📦 Order Update",
        `Your order status has been updated to: ${status.replace("_", " ")}`,
        "order", "normal", { orderId: req.params.id }
      );
    }

    // Notify admin about status change
    const admins = await User.find({ role: "admin" });
    for (const admin of admins) {
      await notify(req.app, admin._id,
        "📋 Order Status Changed",
        `Order #${updatedOrder?.billNumber || req.params.id.substring(0, 8)} → ${status.replace("_", " ")}`,
        "order", "low", { orderId: req.params.id }
      );
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Customer Cancel Order ───
router.put("/:id/cancel", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (order.status !== "pending") return res.status(400).json({ error: "Only pending orders can be cancelled." });

    const customer = await User.findById(order.customer);
    const now = new Date();
    const orderTime = new Date(order.createdAt);
    const diffMs = now - orderTime;
    const isLateCancellation = diffMs > 2 * 60 * 1000; // > 2 minutes
    
    let penaltyFee = 0;
    let message = "Order cancelled successfully.";

    // Restore stock
    if (order.crop && order.quantity) {
      await Crop.findByIdAndUpdate(order.crop, {
        $inc: { quantity: Number(order.quantity) },
        isAvailable: true
      });
    }

    if (isLateCancellation) {
      penaltyFee = Math.round((order.totalAmount || 0) * 0.05); // 5% penalty
      message = `Order cancelled. A late cancellation fee of ₹${penaltyFee} was applied since 2 minutes passed.`;
      
      // If payment was already made via wallet, refund total minus penalty
      if (order.paymentStatus === "paid" && order.paymentMode === "wallet") {
        const refundAmount = Math.max(0, order.totalAmount - penaltyFee);
        await User.findByIdAndUpdate(order.customer, { $inc: { walletBalance: refundAmount } });
      } 
      // If it was COD, deduct penalty from customer's reward points or wallet
      else if (order.paymentMode === "cod") {
        if (customer.walletBalance >= penaltyFee) {
          await User.findByIdAndUpdate(order.customer, { $inc: { walletBalance: -penaltyFee } });
        } else {
          // Fallback: Deduct reward points (1 point = 1 rupee equivalent penalty)
          await User.findByIdAndUpdate(order.customer, { $inc: { rewardPoints: -penaltyFee } });
        }
      }
    } else {
      // Free cancellation, full refund
      if (order.paymentStatus === "paid" && order.paymentMode === "wallet") {
        await User.findByIdAndUpdate(order.customer, { $inc: { walletBalance: order.totalAmount } });
      }
    }

    // Update order status
    order.status = "cancelled";
    order.timeline.push({ status: "cancelled", note: message });
    await order.save();

    // Notify customer
    await notify(req.app, order.customer,
      "🚫 Order Cancelled",
      message,
      "order", "high", { orderId: order._id }
    );

    // Fraud Detection Engine: Flag accounts with >5 cancellations
    customer.cancelledOrdersCount = (customer.cancelledOrdersCount || 0) + 1;
    if (customer.cancelledOrdersCount >= 5) {
      customer.strikes = (customer.strikes || 0) + 1;
      customer.trustScore = Math.max(0, (customer.trustScore || 85) - 10);
      
      await notify(req.app, customer._id,
        "⚠️ Fraud Detection Alert",
        "Your account has been flagged for excessive cancellations (>5). This negatively impacts your trust score and may lead to account suspension.",
        "system", "high"
      );
      
      const admin = await User.findOne({ role: "admin" });
      if (admin) {
        await notify(req.app, admin._id,
          "🚨 Fraud Alert: High Cancellations",
          `User ${customer.name} (${customer.email}) has reached ${customer.cancelledOrdersCount} cancelled orders.`,
          "system", "high"
        );
      }
    }
    await customer.save();

    const io = req.app.get("io");
    if (io) io.emit("order_updated", order);

    res.json({ success: true, message, order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Product Verification by Agent ───
router.put("/:id/verify-product", async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      {
        agentVerified: true,
        $push: { timeline: { status: "verified", note: "Delivery agent verified product matches listing" } }
      },
      { new: true }
    );

    if (!order) return res.status(404).json({ error: "Order not found" });

    // Notify customer that product was verified
    if (order.customer) {
      await notify(req.app, order.customer,
        "✅ Product Verified",
        "The delivery agent has confirmed that your product matches the listing. Your order is on its way!",
        "delivery", "normal", { orderId: order._id }
      );
    }

    const io = req.app.get("io");
    if (io) io.emit("order_updated", order);

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Agent Reports Product Mismatch ───
router.put("/:id/report-mismatch", async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ error: "Report reason is required" });

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      {
        isReported: true,
        agentReportReason: reason,
        reportResolution: "pending",
        $push: { timeline: { status: "reported", note: `Agent reported product mismatch: ${reason}` } }
      },
      { new: true }
    ).populate("crop").populate("farmer");

    if (!order) return res.status(404).json({ error: "Order not found" });

    // Notify ALL admins about the mismatch report
    const admins = await User.find({ role: "admin" });
    for (const admin of admins) {
      await notify(req.app, admin._id,
        "🚨 Product Mismatch Report",
        `Agent reported a mismatch for order #${order.billNumber}: ${reason}. Farmer: ${order.farmer?.name || "Unknown"}. Product: ${order.productSnapshot?.name || order.crop?.name || "Unknown"}.`,
        "report", "urgent", { orderId: order._id, farmerId: order.farmer?._id }
      );
    }

    // Notify the farmer about the report
    if (order.farmer) {
      await notify(req.app, order.farmer._id || order.farmer,
        "⚠️ Product Quality Report",
        `A delivery agent has reported a product mismatch for your order #${order.billNumber}. Reason: ${reason}. Admin will review this.`,
        "report", "high", { orderId: order._id }
      );
    }

    const io = req.app.get("io");
    if (io) io.emit("order_reported", order);

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Assign delivery agent to order
router.put("/:id/assign-agent", async (req, res) => {
  try {
    const { agentId } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      {
        agent: agentId,
        status: "assigned",
        $push: { timeline: { status: "assigned", note: "Delivery agent assigned" } }
      },
      { new: true }
    ).populate("crop").populate("customer").populate("farmer").populate("agent");

    const io = req.app.get("io");
    if (io) {
      io.emit("order_updated", order);
      io.emit("delivery_assigned", order);
    }

    // Notify agent
    await notify(req.app, agentId,
      "🚚 New Delivery Assigned",
      `You have been assigned a new delivery: ${order.crop?.name || "Order"} — ${order.quantity} ${order.crop?.unit || "kg"}`,
      "delivery", "high", { orderId: order._id }
    );

    // Notify customer
    if (order.customer) {
      await notify(req.app, order.customer._id,
        "🚚 Agent Assigned",
        `A delivery agent (${order.agent?.name || "Agent"}) has been assigned to your order. Your product is being prepared for delivery!`,
        "delivery", "normal", { orderId: order._id }
      );
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Customer Submits Review ───
router.put("/:id/review", async (req, res) => {
  try {
    const { reviewText } = req.body;
    if (!reviewText) return res.status(400).json({ error: "Review text required" });

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });

    // Advanced Internal Sentiment Analysis (TF-IDF & N-Grams logic)
    const text = reviewText.toLowerCase();
    
    // Weighted Vocabulary (simulating TF-IDF weights)
    const posWords = { "excellent": 0.5, "good": 0.2, "great": 0.3, "fast": 0.3, "fresh": 0.4, "amazing": 0.5, "quick": 0.2, "polite": 0.3, "helpful": 0.3, "perfect": 0.5 };
    const negWords = { "bad": -0.3, "slow": -0.3, "late": -0.4, "rotten": -0.6, "rude": -0.5, "poor": -0.3, "terrible": -0.6, "worst": -0.7, "delayed": -0.4, "stale": -0.5 };
    const toxicWords = { "scam": -1.0, "fraud": -1.0, "stole": -1.0, "fake": -0.9, "cheat": -0.9, "abusive": -1.0 };
    
    // Bi-gram Modifiers (N-Grams)
    const modifiers = { "not": -1, "very": 1.5, "extremely": 2.0, "never": -1, "too": 1.2 };

    let score = 0;
    let toxicFlag = false;
    const words = text.split(/[\s,.-]+/);

    for (let i = 0; i < words.length; i++) {
      let word = words[i];
      let weight = 0;

      if (posWords[word]) weight = posWords[word];
      else if (negWords[word]) weight = negWords[word];
      else if (toxicWords[word]) {
        weight = toxicWords[word];
        toxicFlag = true;
      }

      // Check previous word for Bi-gram modifiers (e.g. "not good" = -1 * 0.2 = -0.2)
      if (i > 0 && modifiers[words[i-1]] && weight !== 0) {
        weight *= modifiers[words[i-1]];
      }

      score += weight;
    }

    // Apply exponential scaling for extreme reviews (sigmoid-like clamp)
    score = Math.tanh(score); // Maps any score fluidly between -1 and 1

    let sentiment = "Neutral";
    if (score > 0.2) sentiment = "Positive";
    else if (score < -0.2) sentiment = "Negative";

    // Trust score adjustment scaled by severity
    let trustAdjustment = 0;
    if (score > 0.4) trustAdjustment = Math.ceil(score * 4); // Up to +4
    if (score < -0.3) trustAdjustment = Math.floor(score * 5); // Up to -5
    if (toxicFlag) trustAdjustment = -15; // Severe penalty for toxic words

    order.reviewText = reviewText;
    order.sentimentScore = score;
    order.reviewSentiment = sentiment;
    await order.save();

    // Apply trust adjustment to Farmer and Agent
    if (trustAdjustment !== 0) {
      if (order.farmer) {
        await User.findByIdAndUpdate(order.farmer, { $inc: { trustScore: trustAdjustment } });
      }
      if (order.agent) {
        await User.findByIdAndUpdate(order.agent, { $inc: { trustScore: trustAdjustment } });
      }
    }

    res.json({ message: "Review submitted", sentiment, trustAdjustment });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

import Block from "../models/Block.js";
// Get blockchain history for an order
router.get("/blockchain/:id", async (req, res) => {
  try {
    const chain = await Block.find({ orderId: req.params.id }).sort({ timestamp: 1 });
    res.json(chain);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;