import express from "express";
import BoxSubscription from "../models/BoxSubscription.js";
import User from "../models/User.js";

const router = express.Router();

// Create new box subscription
router.post("/subscribe", async (req, res) => {
  try {
    const { customerId, boxType, price, frequency, deliveryAddress } = req.body;
    
    // Calculate next delivery date (e.g. next Monday)
    const nextDeliveryDate = new Date();
    nextDeliveryDate.setDate(nextDeliveryDate.getDate() + (1 + 7 - nextDeliveryDate.getDay()) % 7);
    if (nextDeliveryDate.getTime() === new Date().getTime()) {
      nextDeliveryDate.setDate(nextDeliveryDate.getDate() + 7);
    }

    const subscription = await BoxSubscription.create({
      customer: customerId,
      boxType,
      price,
      frequency,
      deliveryAddress,
      nextDeliveryDate
    });

    res.json(subscription);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user's box subscriptions
router.get("/user/:id", async (req, res) => {
  try {
    const subscriptions = await BoxSubscription.find({ customer: req.params.id }).sort({ createdAt: -1 });
    res.json(subscriptions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Pause / Resume subscription
router.put("/toggle/:id", async (req, res) => {
  try {
    const subscription = await BoxSubscription.findById(req.params.id);
    if (!subscription) return res.status(404).json({ error: "Subscription not found" });

    subscription.status = subscription.status === "active" ? "paused" : "active";
    await subscription.save();
    
    res.json(subscription);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
