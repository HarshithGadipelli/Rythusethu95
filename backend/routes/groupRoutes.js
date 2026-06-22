import express from "express";
import Group from "../models/Group.js";
import Crop from "../models/Crop.js";

const router = express.Router();

// Get active groups for a specific crop
router.get("/crop/:cropId", async (req, res) => {
  try {
    const cropId = req.params.cropId;
    let query = { status: "open" };
    if (cropId !== "all") query.crop = cropId;
    
    const groups = await Group.find(query)
      .populate("members.user", "name role")
      .populate("crop", "name price unit");
    res.json(groups);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new group
router.post("/create", async (req, res) => {
  try {
    const { name, type, cropId, targetQuantity, userId, quantity, poolId, region } = req.body;
    
    // Auto calculate discount for customer buy groups based on target size
    let discountPercent = 0;
    let tiers = [];
    if (type === "customer_buy") {
      tiers = [
        { qty: Math.floor(targetQuantity * 0.25), discount: 5 },
        { qty: Math.floor(targetQuantity * 0.5), discount: 10 },
        { qty: targetQuantity, discount: 15 }
      ];
      if (targetQuantity >= 100) discountPercent = 15;
      else if (targetQuantity >= 50) discountPercent = 10;
      else if (targetQuantity >= 20) discountPercent = 5;
    }

    const group = new Group({
      name,
      type,
      crop: cropId,
      targetQuantity,
      currentQuantity: quantity,
      members: [{ user: userId, quantity }],
      discountPercent,
      poolId,
      region,
      tiers
    });

    await group.save();
    res.json(group);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Join an existing group
router.post("/join/:groupId", async (req, res) => {
  try {
    const { userId, quantity } = req.body;
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ error: "Group not found" });
    if (group.status !== "open") return res.status(400).json({ error: "Group is closed" });

    // Check if user is already a member
    const existingMember = group.members.find(m => m.user.toString() === userId);
    if (existingMember) {
      existingMember.quantity += quantity;
    } else {
      group.members.push({ user: userId, quantity });
    }

    group.currentQuantity += quantity;

    if (group.currentQuantity >= group.targetQuantity) {
      group.status = "completed"; // Reached the target
    }

    await group.save();
    res.json(group);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Join an existing group by its ID passed in the body
router.post("/join-by-id", async (req, res) => {
  try {
    const { poolId, userId, quantity } = req.body;
    const group = await Group.findOne({ poolId: poolId });
    if (!group) return res.status(404).json({ error: "Group not found" });
    if (group.status !== "open") return res.status(400).json({ error: "Group is closed" });

    const existingMember = group.members.find(m => m.user.toString() === userId);
    if (existingMember) {
      existingMember.quantity += quantity;
    } else {
      group.members.push({ user: userId, quantity });
    }

    group.currentQuantity += quantity;
    if (group.currentQuantity >= group.targetQuantity) {
      group.status = "completed"; 
    }

    await group.save();
    res.json(group);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
