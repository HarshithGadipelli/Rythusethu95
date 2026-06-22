import mongoose from "mongoose";

const cropRequestSchema = new mongoose.Schema({
  cropName: { type: String, required: true },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  status: { type: String, default: "pending", enum: ["pending", "notified", "fulfilled"] }
}, { timestamps: true });

export default mongoose.model("CropRequest", cropRequestSchema);
