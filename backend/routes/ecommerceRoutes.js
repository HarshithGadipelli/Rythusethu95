import express from "express";
import Cart from "../models/Cart.js";
import Review from "../models/Review.js";
import User from "../models/User.js";

const router = express.Router();

// --- CART ---
router.get("/cart/:userId", async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.params.userId }).populate("items.crop");
    if (!cart) {
      cart = await Cart.create({ user: req.params.userId, items: [], totalAmount: 0 });
    }
    res.json(cart);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/cart/:userId/add", async (req, res) => {
  try {
    const { cropId, quantity, price } = req.body;
    let cart = await Cart.findOne({ user: req.params.userId });
    if (!cart) cart = new Cart({ user: req.params.userId, items: [] });

    const existingItem = cart.items.find(item => item.crop.toString() === cropId);
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.items.push({ crop: cropId, quantity, priceAtAdd: price });
    }

    cart.totalAmount = cart.items.reduce((total, item) => total + (item.quantity * item.priceAtAdd), 0);
    await cart.save();
    
    res.json(await Cart.findById(cart._id).populate("items.crop"));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- WISHLIST ---
router.post("/wishlist/:userId/toggle", async (req, res) => {
  try {
    const { cropId } = req.body;
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Initialize wishlist if undefined
    if (!user.wishlist) user.wishlist = [];

    const index = user.wishlist.indexOf(cropId);
    if (index === -1) user.wishlist.push(cropId);
    else user.wishlist.splice(index, 1);

    await user.save();
    res.json(user.wishlist);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- REVIEWS ---
router.post("/reviews/add", async (req, res) => {
  try {
    const { userId, cropId, farmerId, rating, comment } = req.body;
    const review = await Review.create({ user: userId, crop: cropId, farmer: farmerId, rating, comment });
    
    // Recalculate farmer trust score based on new review
    const Farmer = (await import("../models/Farmer.js")).default;
    const farmerDoc = await Farmer.findOne({ user: farmerId });
    if (farmerDoc) {
      const allReviews = await Review.find({ farmer: farmerId });
      const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
      farmerDoc.trustScore = Math.min(100, Math.max(0, farmerDoc.trustScore + (avgRating >= 4 ? 2 : -2)));
      await farmerDoc.save();
    }

    res.json(review);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
