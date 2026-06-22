import express from "express";
import Auction from "../models/Auction.js";
import Crop from "../models/Crop.js";

const router = express.Router();

// Get all active auctions
router.get("/", async (req, res) => {
  try {
    const auctions = await Auction.find({ status: "active" })
      .populate("crop")
      .populate("farmer", "name location")
      .populate("highestBidder", "name")
      .sort({ endTime: 1 }); // Sort by ending soonest
    res.json(auctions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get farmer's auctions
router.get("/farmer/:id", async (req, res) => {
  try {
    const auctions = await Auction.find({ farmer: req.params.id })
      .populate("crop")
      .populate("highestBidder", "name")
      .sort({ createdAt: -1 });
    res.json(auctions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create an auction
router.post("/create", async (req, res) => {
  try {
    const { cropId, farmerId, quantity, startingBid, durationHours } = req.body;
    
    const crop = await Crop.findById(cropId);
    if (!crop) return res.status(404).json({ error: "Crop not found" });

    // Deduct quantity from crop available for normal sale
    if (crop.quantity < quantity) {
      return res.status(400).json({ error: `Not enough stock. Only ${crop.quantity} available.` });
    }
    
    crop.quantity -= quantity;
    if (crop.quantity <= 0) crop.isAvailable = false;
    await crop.save();

    const endTime = new Date(Date.now() + (durationHours * 60 * 60 * 1000));

    const auction = await Auction.create({
      crop: cropId,
      farmer: farmerId,
      quantity,
      startingBid,
      currentHighestBid: startingBid,
      endTime
    });

    const io = req.app.get("io");
    if (io) io.emit("new_auction", auction);

    res.json(auction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Place a bid
router.post("/bid/:id", async (req, res) => {
  try {
    const { bidderId, bidAmount } = req.body;
    
    const auction = await Auction.findById(req.params.id);
    if (!auction) return res.status(404).json({ error: "Auction not found" });
    if (auction.status !== "active") return res.status(400).json({ error: "Auction is not active" });
    if (new Date() > auction.endTime) return res.status(400).json({ error: "Auction has ended" });
    
    if (bidAmount <= auction.currentHighestBid) {
      return res.status(400).json({ error: `Bid must be higher than ₹${auction.currentHighestBid}` });
    }

    auction.currentHighestBid = bidAmount;
    auction.highestBidder = bidderId;
    auction.bids.push({ bidder: bidderId, amount: bidAmount });
    
    await auction.save();

    const populatedAuction = await Auction.findById(auction._id).populate("highestBidder", "name");

    const io = req.app.get("io");
    if (io) io.emit("auction_update", populatedAuction);

    res.json(populatedAuction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper: Close auction
router.put("/close/:id", async (req, res) => {
  try {
    const auction = await Auction.findByIdAndUpdate(req.params.id, { status: "closed" }, { new: true });
    
    // In a real app, you would create an Order for the highest bidder here
    
    const io = req.app.get("io");
    if (io) io.emit("auction_update", auction);

    res.json(auction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
