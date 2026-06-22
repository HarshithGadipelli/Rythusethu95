import express from "express";
import FarmTourBooking from "../models/FarmTourBooking.js";
import Farmer from "../models/Farmer.js";

const router = express.Router();

// Get all farmers with farm tours enabled and verified
router.get("/available", async (req, res) => {
  try {
    const farmers = await Farmer.find({ farmTourEnabled: true, farmTourVerified: true })
      .populate("user", "name phone");
    res.json(farmers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all farmers pending farm tour verification
router.get("/pending", async (req, res) => {
  try {
    const farmers = await Farmer.find({ farmTourEnabled: true, farmTourVerified: false })
      .populate("user", "name phone email");
    res.json(farmers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a booking
router.post("/book", async (req, res) => {
  try {
    const booking = await FarmTourBooking.create(req.body);
    res.status(201).json(booking);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update farmer tour settings
router.put("/settings/:farmerId", async (req, res) => {
  try {
    const { farmTourEnabled, farmTourPrice, farmTourDetails } = req.body;
    // Note: farmerId is the User ID in this context typically, but Farmer model uses `user: farmerId`
    const farmer = await Farmer.findOneAndUpdate(
      { user: req.params.farmerId },
      { farmTourEnabled, farmTourPrice, farmTourDetails },
      { new: true, upsert: true }
    );
    res.json(farmer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin verify farm tour
router.put("/verify/:id", async (req, res) => {
  try {
    const farmer = await Farmer.findByIdAndUpdate(req.params.id, { farmTourVerified: req.body.verified }, { new: true });
    res.json(farmer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
