import mongoose from "mongoose";

const policySchema = new mongoose.Schema({
  role: { type: String, enum: ["farmer", "customer", "agent", "all"], required: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  version: { type: Number, default: 1 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model("Policy", policySchema);
