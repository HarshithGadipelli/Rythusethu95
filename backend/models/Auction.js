import mongoose from "mongoose";

const auctionSchema = new mongoose.Schema({
  crop: { type: mongoose.Schema.Types.ObjectId, ref: "Crop", required: true },
  farmer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  quantity: { type: Number, required: true },
  startingBid: { type: Number, required: true },
  currentHighestBid: { type: Number, default: function() { return this.startingBid; } },
  highestBidder: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  endTime: { type: Date, required: true },
  status: { type: String, enum: ["active", "closed", "cancelled"], default: "active" },
  bids: [{
    bidder: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    amount: { type: Number, required: true },
    timestamp: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

export default mongoose.model("Auction", auctionSchema);
