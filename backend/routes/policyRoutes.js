import express from "express";
import Policy from "../models/Policy.js";
import User from "../models/User.js";

const router = express.Router();

// Get active policies for a role
router.get("/:role", async (req, res) => {
  try {
    const policies = await Policy.find({
      isActive: true,
      role: { $in: [req.params.role, "all"] }
    });
    res.json(policies);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Create or update a policy
router.post("/admin", async (req, res) => {
  try {
    const policy = await Policy.create(req.body);
    // Force users to re-accept if it's a major update
    if (req.body.forceReaccept) {
      await User.updateMany({ role: req.body.role }, { acceptedTerms: false });
    }
    res.json(policy);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// User accepts terms
router.put("/accept/:userId", async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.userId, { acceptedTerms: true }, { new: true });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
