import mongoose from "mongoose";

const GroupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ["customer_buy", "farmer_sell"], required: true },
  crop: { type: mongoose.Schema.Types.ObjectId, ref: "Crop", required: true },
  targetQuantity: { type: Number, required: true },
  currentQuantity: { type: Number, default: 0 },
  status: { type: String, enum: ["open", "closed", "completed"], default: "open" },
  members: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    quantity: { type: Number, required: true },
    joinedAt: { type: Date, default: Date.now }
  }],
  discountPercent: { type: Number, default: 0 },
  poolId: { type: String },
  region: { type: String },
  tiers: [{ qty: Number, discount: Number }]
}, { timestamps: true });

export default mongoose.model("Group", GroupSchema);
