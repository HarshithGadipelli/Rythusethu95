import express from "express";
import Crop from "../models/Crop.js";
import Farmer from "../models/Farmer.js";
import { calculateTrustScore, getCachedTrustScore } from "../services/trustScoreService.js";
import { getTrustLeaderboard } from "../controllers/farmerController.js";

const router = express.Router();

router.get("/leaderboard", getTrustLeaderboard);

// Get farmer's crops
router.get("/my-crops/:id", async (req, res) => {
  try {
    const crops = await Crop.find({ farmer: req.params.id });
    res.json(crops);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get farmer's trust score (full calculation with breakdown)
router.get("/trust-score/:farmerId", async (req, res) => {
  try {
    const result = await calculateTrustScore(req.params.farmerId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get cached trust score (fast, for listings)
router.get("/trust-score-cached/:farmerId", async (req, res) => {
  try {
    const result = await getCachedTrustScore(req.params.farmerId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Batch: get trust scores for multiple farmers
router.post("/trust-scores-batch", async (req, res) => {
  try {
    const { farmerIds } = req.body;
    if (!farmerIds || !Array.isArray(farmerIds)) {
      return res.status(400).json({ error: "farmerIds array required" });
    }

    // Use cached scores for performance
    const farmers = await Farmer.find({ user: { $in: farmerIds } });
    const scoreMap = {};
    
    const GRADES = [
      { min: 90, grade: "Platinum", emoji: "🏆", label: "Exceptional" },
      { min: 75, grade: "Gold",     emoji: "🥇", label: "Highly Trusted" },
      { min: 60, grade: "Silver",   emoji: "🥈", label: "Trusted" },
      { min: 40, grade: "Bronze",   emoji: "🥉", label: "Building Trust" },
      { min: 0,  grade: "New",      emoji: "🌱", label: "Getting Started" },
    ];

    for (const f of farmers) {
      const score = f.trustScore || 0;
      const gradeInfo = GRADES.find(g => score >= g.min) || GRADES[GRADES.length - 1];
      scoreMap[f.user.toString()] = {
        score,
        grade: gradeInfo.grade,
        emoji: gradeInfo.emoji,
        label: gradeInfo.label
      };
    }

    // Fill in missing farmers with default
    for (const id of farmerIds) {
      if (!scoreMap[id]) {
        scoreMap[id] = { score: 0, grade: "New", emoji: "🌱", label: "Getting Started" };
      }
    }

    res.json(scoreMap);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Book a physical farm visit with Escrow Payment
router.post("/visit/:farmerId", async (req, res) => {
  try {
    const { customerId, customerName, requestedDate, notes, amount } = req.body;
    
    const Notification = (await import("../models/Notification.js")).default;
    const User = (await import("../models/User.js")).default;

    const tourPrice = Number(amount) || 0;
    let farmerEscrow = 0;

    if (tourPrice > 0 && customerId) {
      const customer = await User.findById(customerId);
      const farmerUser = await User.findById(req.params.farmerId);
      const admins = await User.find({ role: "admin" });
      const admin = admins.length > 0 ? admins[0] : null;

      if (!customer || !farmerUser) {
        return res.status(404).json({ error: "User not found" });
      }

      if (customer.walletBalance < tourPrice) {
        return res.status(400).json({ error: "Insufficient wallet balance to book the tour." });
      }

      // 15% to admin, 85% to farmer escrow
      const adminFee = Math.round(tourPrice * 0.15);
      farmerEscrow = tourPrice - adminFee;

      // Deduct from customer
      customer.walletBalance -= tourPrice;
      await customer.save();

      // Add to admin wallet
      if (admin) {
        admin.walletBalance = (admin.walletBalance || 0) + adminFee;
        await admin.save();
      }

      // Add to farmer escrow
      farmerUser.escrowBalance = (farmerUser.escrowBalance || 0) + farmerEscrow;
      await farmerUser.save();
    }
    
    const notif = await Notification.create({
      user: req.params.farmerId,
      title: "🗓️ Farm Visit Booked & Escrow Paid",
      message: `Customer ${customerName || "A customer"} booked a physical visit on ${requestedDate || "soon"}. ₹${farmerEscrow} has been securely held in your Escrow account until the visit. Notes: ${notes || "None"}`,
      type: "system",
      priority: "high",
      metadata: { customerId, requestedDate, notes, amount: tourPrice }
    });

    const io = req.app.get("io");
    if (io) io.emit("notification", notif);

    res.json({ message: "Visit booked and payment securely held in escrow!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;