import express from "express";
import Subscription from "../models/Subscription.js";

const router = express.Router();

// Create a subscription
router.post("/", async (req, res) => {
  try {
    const { customer, crop, quantity, frequency, deliveryAddress, deliveryType } = req.body;
    
    // Calculate next delivery date (tomorrow)
    const nextDeliveryDate = new Date();
    nextDeliveryDate.setDate(nextDeliveryDate.getDate() + 1);
    nextDeliveryDate.setHours(8, 0, 0, 0); // Default to 8 AM

    const sub = new Subscription({
      customer,
      crop,
      quantity,
      frequency,
      deliveryAddress,
      deliveryType,
      nextDeliveryDate
    });

    await sub.save();
    res.json(sub);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get user subscriptions
router.get("/customer/:id", async (req, res) => {
  try {
    const subs = await Subscription.find({ customer: req.params.id })
      .populate("crop")
      .sort({ createdAt: -1 });
    res.json(subs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Cancel a subscription
router.put("/:id/cancel", async (req, res) => {
  try {
    const sub = await Subscription.findByIdAndUpdate(req.params.id, { status: "cancelled" }, { new: true });
    res.json(sub);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
