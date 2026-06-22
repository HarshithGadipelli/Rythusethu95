import mongoose from "mongoose";
import crypto from "crypto";

const blockSchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
  cropId: { type: mongoose.Schema.Types.ObjectId, ref: "Crop", required: true },
  action: { type: String, required: true }, // E.g., "Planted", "Harvested", "Ordered", "Dispatched", "Delivered"
  details: { type: String }, // Extra data
  actor: { type: String }, // "Farmer: Ramesh", "Agent: Suresh", "System"
  location: { type: String },
  timestamp: { type: Date, default: Date.now },
  previousHash: { type: String, required: true },
  hash: { type: String, required: true }
});

// Pre-save hook to calculate hash
blockSchema.pre("validate", function(next) {
  if (!this.hash) {
    const dataString = `${this.orderId}${this.cropId}${this.action}${this.details}${this.actor}${this.location}${this.timestamp}${this.previousHash}`;
    this.hash = crypto.createHash("sha256").update(dataString).digest("hex");
  }
  next();
});

export default mongoose.model("Block", blockSchema);
